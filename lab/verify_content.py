"""Verify the rewritten content renders in the real page (Lane C).

Drives http://127.0.0.1:8077/index.html in headless Chrome and asserts:
  - profile: 4 about paragraphs, includes ODP + agentic AI + awards copy
  - experience: 3 items, no Fresh Graduate Academy, one "See more on LinkedIn"
  - projects: 3 cards (NDETCStemmer featured + unword + WA-Bulk), 3 removed gone
  - hall of fame: "Graduate" cap (no 'Cum Laude' in the stamp), GPA 3.90,
    Bangkit Distinction + Top 53 rows, a 'Cum Laude' Competitive Record row
    (7 rows), 2 publications
  - open-channel: new CTA copy, LinkedIn/GitHub/Email links, no START THE HEIST
  - identity file: no "Open to work"
  - no console errors

Usage: python lab/verify_content.py [url]
"""
import base64, json, os, socket, struct, subprocess, sys, time, urllib.request

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8077/index.html"
PORT = 9473
PROFILE = os.path.join(os.environ.get("TEMP", "C:/Windows/Temp"), "p5probe-content")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
HOST = "127.0.0.1"
FAILS = []


def check(name, got, want):
    ok = got == want
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}: {got!r}" + ("" if ok else f" (want {want!r})"))
    if not ok:
        FAILS.append(name)


def check_true(name, got):
    ok = bool(got)
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}: {got!r}")
    if not ok:
        FAILS.append(name)


def http_json(path):
    return json.loads(urllib.request.urlopen(f"http://{HOST}:{PORT}{path}", timeout=10).read())


def launch():
    subprocess.Popen(
        [CHROME, f"--remote-debugging-port={PORT}", f"--user-data-dir={PROFILE}",
         "--headless=new", "--no-first-run", "--no-default-browser-check",
         "--disable-gpu-sandbox", "--use-gl=angle", "--use-angle=swiftshader",
         "--enable-unsafe-swiftshader", "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    for _ in range(80):
        time.sleep(0.5)
        try:
            http_json("/json/version"); return True
        except Exception:
            continue
    return False


_id = [0]


def send(sock, method, params=None):
    _id[0] += 1
    data = json.dumps({"id": _id[0], "method": method, "params": params or {}}).encode()
    frame = bytearray([0x81]); ln = len(data)
    if ln < 126: frame.append(0x80 | ln)
    else: frame.extend([0x80 | 126] + list(struct.pack(">H", ln)))
    mask = os.urandom(4); frame.extend(mask)
    frame.extend(bytes(b ^ mask[i % 4] for i, b in enumerate(data)))
    sock.sendall(bytes(frame)); return _id[0]


def recv(sock, want_id, timeout=25):
    sock.settimeout(timeout); buf = b""; end = time.time() + timeout
    while time.time() < end:
        try: chunk = sock.recv(65536)
        except Exception: break
        if not chunk: break
        buf += chunk
        while len(buf) >= 2:
            ln = buf[1] & 0x7F; off = 2
            if ln == 126:
                if len(buf) < 4: break
                ln = struct.unpack(">H", buf[2:4])[0]; off = 4
            elif ln == 127:
                if len(buf) < 10: break
                ln = struct.unpack(">Q", buf[2:10])[0]; off = 10
            if len(buf) < off + ln: break
            payload = buf[off:off + ln]; buf = buf[off + ln:]
            try: o = json.loads(payload.decode("utf-8", "replace"))
            except Exception: continue
            if o.get("id") == want_id: return o
    return None


def ev(sock, expr):
    r = recv(sock, send(sock, "Runtime.evaluate",
                       {"expression": expr, "returnByValue": True, "awaitPromise": True}))
    try: return r["result"]["result"].get("value")
    except Exception: return None


def cleanup():
    try:
        ps = ("Get-CimInstance Win32_Process -Filter \"name='chrome.exe'\" | "
              f"Where-Object {{ $_.CommandLine -match '{os.path.basename(PROFILE)}' }} | "
              "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }")
        subprocess.run(["powershell", "-NoProfile", "-Command", ps], timeout=25,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass


def main():
    if not launch():
        print("FAIL: chrome did not expose CDP"); return 2
    page = next(t for t in http_json("/json/list") if t.get("type") == "page")
    sock = socket.create_connection((HOST, PORT), timeout=20)
    key = base64.b64encode(os.urandom(16)).decode()
    sock.sendall((f"GET /devtools/page/{page['id']} HTTP/1.1\r\nHost: {HOST}:{PORT}\r\n"
                  "Upgrade: websocket\r\nConnection: Upgrade\r\n"
                  f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n").encode())
    assert "101" in sock.recv(4096).decode("utf-8", "replace")
    for m in ("Page.enable", "Runtime.enable"):
        recv(sock, send(sock, m), 10)
    recv(sock, send(sock, "Page.addScriptToEvaluateOnNewDocument", {"source":
         "window.__errs=[];"
         "addEventListener('error',e=>window.__errs.push(String(e.message||e.error)));"
         "addEventListener('unhandledrejection',e=>window.__errs.push('rejection: '+String(e.reason)));"
         }), 10)
    send(sock, "Emulation.setDeviceMetricsOverride",
         {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
    recv(sock, send(sock, "Page.navigate", {"url": URL}), 25)
    time.sleep(3)

    print("=== PROFILE / IDENTITY FILE ===")
    check("about paragraphs", ev(sock, "document.querySelectorAll('#about-copy p').length"), 4)
    about = ev(sock, "document.getElementById('about-copy').textContent") or ""
    check_true("about mentions ODP", "Officer Development Program" in about)
    check_true("about mentions agentic AI", "agentic" in about.lower())
    check_true("about mentions cum laude", "cum laude" in about.lower())
    check_true("about mentions Bangkit distinction", "bangkit" in about.lower())
    check_true("no 'Open to work' on page",
               "open to work" not in (ev(sock, "document.body.innerText") or "").lower())

    print("=== EXPERIENCE / MISSION LOG ===")
    check("timeline items", ev(sock, "document.querySelectorAll('#timeline .tl-item').length"), 3)
    exp = ev(sock, "document.getElementById('timeline').textContent") or ""
    check_true("no Fresh Graduate Academy", "Fresh Graduate Academy" not in exp)
    check_true("no per-card see-more", ev(sock, "document.querySelectorAll('#timeline .tl-item__more').length") == 0)
    check("single section see-more link",
          ev(sock, "document.querySelectorAll('#mission-log-more a').length"), 1)
    check_true("see-more points to LinkedIn",
               "linkedin.com/in/alifadwitiyap" in (ev(sock, "document.querySelector('#mission-log-more a')?.href") or ""))

    print("=== PROJECTS / CASE FILES ===")
    check("spotlight featured title", ev(sock, "document.querySelector('.spotlight h3')?.textContent.trim()"), "NDETCStemmer")
    check("grid cards", ev(sock, "document.querySelectorAll('#projects-grid .card').length"), 2)
    proj = ev(sock, "document.getElementById('projects-grid').textContent") or ""
    check_true("has unword", "unword" in proj)
    check_true("has WA-Bulk", "WA-Bulk" in proj)
    for gone in ("IBM-DATA-SCIENCE-CAPSTONE", "C22-PS168", "online-store"):
        check_true(f"removed {gone}", gone not in proj)

    print("=== HALL OF FAME ===")
    hof = ev(sock, "document.getElementById('hall-of-fame').textContent") or ""
    check("academic stamp label is Graduate",
          ev(sock, "document.querySelector('.hof-academic__stamp-label')?.textContent.trim()"),
          "Graduate")
    check_true("academic stamp omits cum laude",
               "cum laude" not in (ev(sock, "document.querySelector('.hof-academic__stamp')?.textContent") or "").lower())
    check_true("competitive record has cum laude row",
               "cum laude" in (ev(sock, "document.getElementById('hof-awards')?.textContent") or "").lower())
    check_true("GPA 3.90 present", "3.90" in hof)
    check_true("Bangkit Distinction row", "Distinction" in hof and "Bangkit" in hof)
    check_true("Top 53 row", "Top 53" in hof)
    check("competitive record rows", ev(sock, "document.querySelectorAll('#hof-awards .hof-item').length"), 7)
    check("publications rows", ev(sock, "document.querySelectorAll('#hof-publications .hof-item').length"), 2)

    print("=== OPEN CHANNEL CTA ===")
    cta = ev(sock, "document.querySelector('.contact__big')?.textContent") or ""
    check_true("new CTA copy", "EVERY PROBLEM HIDES A TREASURE" in cta and "Let's uncover yours" in cta)
    check_true("CTA trimmed (no 'real solution')", "real solution" not in cta)
    links = ev(sock, "[...document.querySelectorAll('.contact__links a')].map(a=>a.textContent.trim())") or []
    check("contact links", links, ["LinkedIn", "GitHub", "Email"])
    check_true("no START THE HEIST",
               "START THE HEIST" not in (ev(sock, "document.body.innerText") or ""))
    check_true("email mailto present",
               "mailto:alifadwitiyap@gmail.com" in (ev(sock, "document.querySelector('.contact__links a[href^=\"mailto\"]')?.href") or ""))

    print("=== CONSOLE ===")
    check("no-page-errors", ev(sock, "window.__errs || []"), [])

    print("\n=== DONE === FAILS:", FAILS or "none")
    return 1 if FAILS else 0


if __name__ == "__main__":
    try:
        code = main()
    finally:
        cleanup()
    sys.exit(code)
