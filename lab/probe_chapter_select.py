"""Self-contained probe: the in-page chapter-select navigator (Task 05/06).

Owns its own headless Chrome (unique debug port + profile) so it never races a
stale CDP endpoint from another run. Asserts:
  - the anchor list is rendered from the one registry (CHAPTER_TARGETS)
  - the old overlay (#navigator) is gone; START is an anchor and MENU is the
    v3 overlay trigger (button with aria-controls=chapter-menu)
  - the resolver's active section mirrors into the list (scroll stays truth)
  - a native anchor click scrolls + sets the hash
  - the "M" shortcut opens the overlay (v3), Esc closes it
  - no console exceptions

Usage: python lab/probe_chapter_select.py [url]
"""
import base64
import json
import os
import socket
import struct
import subprocess
import sys
import time
import urllib.request

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8077/index.html"
PORT = 9461
PROFILE = os.path.join(os.environ.get("TEMP", "C:/Windows/Temp"), "p5probe-chapter")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
HOST = "127.0.0.1"
FAILS = []


def check(name, got, want):
    ok = got == want
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}: {got!r}" + ("" if ok else f" (want {want!r})"))
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
            http_json("/json/version")
            return True
        except Exception:
            continue
    return False


_id = [0]


def send(sock, method, params=None):
    _id[0] += 1
    data = json.dumps({"id": _id[0], "method": method, "params": params or {}}).encode()
    frame = bytearray([0x81])
    ln = len(data)
    if ln < 126:
        frame.append(0x80 | ln)
    else:
        frame.extend([0x80 | 126] + list(struct.pack(">H", ln)))
    mask = os.urandom(4)
    frame.extend(mask)
    frame.extend(bytes(b ^ mask[i % 4] for i, b in enumerate(data)))
    sock.sendall(bytes(frame))
    return _id[0]


def recv(sock, want_id, timeout=25):
    sock.settimeout(timeout)
    buf = b""
    end = time.time() + timeout
    while time.time() < end:
        try:
            chunk = sock.recv(65536)
        except Exception:
            break
        if not chunk:
            break
        buf += chunk
        while len(buf) >= 2:
            ln = buf[1] & 0x7F
            off = 2
            if ln == 126:
                if len(buf) < 4:
                    break
                ln = struct.unpack(">H", buf[2:4])[0]
                off = 4
            elif ln == 127:
                if len(buf) < 10:
                    break
                ln = struct.unpack(">Q", buf[2:10])[0]
                off = 10
            if len(buf) < off + ln:
                break
            payload = buf[off:off + ln]
            buf = buf[off + ln:]
            try:
                o = json.loads(payload.decode("utf-8", "replace"))
            except Exception:
                continue
            if o.get("id") == want_id:
                return o
    return None


def ev(sock, expr):
    r = recv(sock, send(sock, "Runtime.evaluate",
                       {"expression": expr, "returnByValue": True, "awaitPromise": True}))
    try:
        return r["result"]["result"].get("value")
    except Exception:
        return None


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
        print("FAIL: chrome did not expose CDP")
        return 2
    page = next(t for t in http_json("/json/list") if t.get("type") == "page")
    sock = socket.create_connection((HOST, PORT), timeout=20)
    key = base64.b64encode(os.urandom(16)).decode()
    sock.sendall((f"GET /devtools/page/{page['id']} HTTP/1.1\r\nHost: {HOST}:{PORT}\r\n"
                  "Upgrade: websocket\r\nConnection: Upgrade\r\n"
                  f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n").encode())
    assert "101" in sock.recv(4096).decode("utf-8", "replace")

    for m in ("Page.enable", "Runtime.enable"):
        recv(sock, send(sock, m), 10)
    # Collect any uncaught error / rejection on the page itself, from the very
    # first script, so a module-level failure cannot slip past.
    recv(sock, send(sock, "Page.addScriptToEvaluateOnNewDocument", {"source":
         "window.__errs=[];"
         "addEventListener('error',e=>window.__errs.push(String(e.message||e.error)));"
         "addEventListener('unhandledrejection',e=>window.__errs.push('rejection: '+String(e.reason)));"
         }), 10)
    send(sock, "Emulation.setDeviceMetricsOverride",
         {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
    recv(sock, send(sock, "Page.navigate", {"url": URL}), 25)
    time.sleep(5)
    ev(sock, "document.documentElement.style.scrollBehavior='auto'")  # deterministic scrolls

    print("=== CHAPTER SELECT DOM ===")
    check("chapter-section-present", ev(sock, "!!document.getElementById('chapter-select')"), True)
    check("navigator-element-gone", ev(sock, "!!document.getElementById('navigator')"), False)
    check("navigator-list-gone", ev(sock, "!!document.getElementById('navigator-list')"), False)
    check("link-count", ev(sock, "document.querySelectorAll('#chapter-list .chapter-select__link').length"), 6)
    check("hrefs", ev(sock, "[...document.querySelectorAll('#chapter-list .chapter-select__link')].map(a=>a.getAttribute('href'))"),
          ["#identity-file", "#hall-of-fame", "#skill-arsenal", "#mission-log", "#case-files", "#open-channel"])
    check("labels", ev(sock, "[...document.querySelectorAll('#chapter-list .chapter-select__label')].map(e=>e.textContent)"),
          ["IDENTITY FILE", "HALL OF FAME", "SKILL ARSENAL", "MISSION LOG", "CASE FILES", "OPEN CHANNEL"])
    check("indices", ev(sock, "[...document.querySelectorAll('#chapter-list .chapter-select__num')].map(e=>e.textContent)"),
          ["01", "02", "03", "04", "05", "06"])
    check("hero-not-in-list", ev(sock, "[...document.querySelectorAll('#chapter-list .chapter-select__link')].some(a=>a.getAttribute('href')==='#hero')"), False)

    print("=== MENU / START (v3: MENU is an overlay trigger, START is an anchor) ===")
    check("menu-btn-tag", ev(sock, "document.getElementById('menu-btn')?.tagName"), "BUTTON")
    check("menu-btn-controls", ev(sock, "document.getElementById('menu-btn')?.getAttribute('aria-controls')"), "chapter-menu")
    check("menu-btn-collapsed", ev(sock, "document.getElementById('menu-btn')?.getAttribute('aria-expanded')"), "false")
    check("start-btn-href", ev(sock, "document.getElementById('start-btn')?.getAttribute('href')"), "#chapter-select")

    print("=== ACTIVE SYNC (scroll stays source of truth) ===")
    ev(sock, "document.getElementById('mission-log').scrollIntoView({behavior:'auto',block:'center'})")
    time.sleep(2.5)
    check("active-section", ev(sock, "document.documentElement.dataset.section"), "mission-log")
    check("active-link-data-active",
          ev(sock, "document.querySelector('#chapter-list .chapter-select__link[data-active=\"true\"]')?.getAttribute('href')"), "#mission-log")
    check("active-link-aria-current",
          ev(sock, "document.querySelector('#chapter-list .chapter-select__link[aria-current=\"true\"]')?.getAttribute('href')"), "#mission-log")
    check("single-active", ev(sock, "document.querySelectorAll('#chapter-list .chapter-select__link[data-active=\"true\"]').length"), 1)

    print("=== ANCHOR CLICK SCROLLS ===")
    ev(sock, "window.scrollTo(0,0)")
    time.sleep(1.0)
    ev(sock, "document.querySelector('#chapter-list .chapter-select__link[href=\"#case-files\"]').click()")
    time.sleep(2.5)
    check("click-active-section", ev(sock, "document.documentElement.dataset.section"), "case-files")
    check("click-hash", ev(sock, "location.hash"), "#case-files")

    print("=== 'M' SHORTCUT OPENS THE OVERLAY (v3) ===")
    ev(sock, "window.scrollTo(0, document.body.scrollHeight)")
    time.sleep(1.2)
    ev(sock, "document.body.focus()")
    ev(sock, "document.dispatchEvent(new KeyboardEvent('keydown',{key:'m',bubbles:true}))")
    time.sleep(0.5)
    check("m-opens-overlay", ev(sock, "!document.getElementById('chapter-menu').hidden"), True)
    ev(sock, "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
    time.sleep(0.3)
    check("esc-closes-overlay", ev(sock, "document.getElementById('chapter-menu').hidden"), True)

    print("=== CONSOLE ===")
    check("no-page-errors", ev(sock, "window.__errs || []"), [])

    print("=== DONE ===", "FAILS:", FAILS or "none")
    return 1 if FAILS else 0


if __name__ == "__main__":
    try:
        code = main()
    finally:
        cleanup()
    sys.exit(code)
