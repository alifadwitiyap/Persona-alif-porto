"""Headless Chrome verification for alif-3d-portfolio.

Boots Chrome with CDP, loads the static server, captures:
  - console errors / page exceptions
  - module + WebGL load state
  - DOM content checks (sections, tagline, projects, links)
  - screenshots (desktop + mobile + reduced-motion)

Usage: python lab/verify.py [url] [port]
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
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 9411
HOST = "127.0.0.1"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PROFILE = os.path.join(os.environ.get("TEMP", "C:/Windows/Temp"), "alif3d-cdp")


def http_json(path):
    return json.loads(urllib.request.urlopen(f"http://{HOST}:{PORT}{path}", timeout=10).read())


def launch():
    # Reuse an already-running CDP endpoint if one is present (avoids profile
    # lock contention and slow cold starts on repeat runs).
    try:
        http_json("/json/version")
        print(f"  reusing existing CDP on {PORT}")
        return True
    except Exception:
        pass
    if os.path.exists(f"{PROFILE}/DevToolsActivePort"):
        pass
    subprocess.Popen(
        [
            CHROME,
            f"--remote-debugging-port={PORT}",
            f"--user-data-dir={PROFILE}",
            "--headless=new",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-gpu-sandbox",
            "--use-gl=angle",
            "--use-angle=swiftshader",  # software GL so WebGL works headless
            "--enable-unsafe-swiftshader",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
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


def connect(target_id):
    path = f"/devtools/page/{target_id}"
    key = base64.b64encode(os.urandom(16)).decode()
    hs = (
        f"GET {path} HTTP/1.1\r\nHost: {HOST}:{PORT}\r\nUpgrade: websocket\r\n"
        f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\n"
        "Sec-WebSocket-Version: 13\r\n\r\n"
    )
    s = socket.create_connection((HOST, PORT), timeout=20)
    s.sendall(hs.encode())
    resp = s.recv(4096).decode("utf-8", "replace")
    assert "101" in resp, f"WS fail: {resp[:160]}"
    return s


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


def _read_frames(sock, buf):
    msgs = []
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
        msgs.append(payload)
    return msgs, buf


def drain(sock, seconds=2.0):
    """Collect all pending events for a while (console + exceptions)."""
    sock.settimeout(0.4)
    buf = b""
    out = []
    end = time.time() + seconds
    while time.time() < end:
        try:
            chunk = sock.recv(65536)
        except Exception:
            continue
        if not chunk:
            break
        buf += chunk
        msgs, buf = _read_frames(sock, buf)
        for m in msgs:
            try:
                out.append(json.loads(m.decode("utf-8", "replace")))
            except Exception:
                pass
    return out


def recv_until(sock, want_id, timeout=25):
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
        msgs, buf = _read_frames(sock, buf)
        for m in msgs:
            try:
                o = json.loads(m.decode("utf-8", "replace"))
            except Exception:
                continue
            if o.get("id") == want_id:
                return o
    return None


def ev(sock, expr):
    i = send(sock, "Runtime.evaluate",
             {"expression": expr, "returnByValue": True, "awaitPromise": True})
    r = recv_until(sock, i)
    try:
        return r["result"]["result"].get("value")
    except Exception:
        return None


def shot(sock, name):
    i = send(sock, "Page.captureScreenshot", {"format": "png"})
    r = recv_until(sock, i, timeout=25)
    if r and "result" in r:
        p = os.path.join(OUT, name)
        open(p, "wb").write(base64.b64decode(r["result"]["data"]))
        print(f"  SHOT {name} ({os.path.getsize(p)}b)")
        return p
    print("  SHOT FAIL", name)
    return None


def main():
    if not launch():
        print("FAIL: chrome did not expose CDP")
        return 2

    targets = http_json("/json/list")
    page = next((t for t in targets if t.get("type") == "page"), None)
    if not page:
        print("FAIL: no page target")
        return 2
    sock = connect(page["id"])

    # Enable domains we listen to
    for m in ("Page.enable", "Runtime.enable", "Log.enable"):
        recv_until(sock, send(sock, m), timeout=10)

    i = send(sock, "Page.navigate", {"url": URL})
    recv_until(sock, i, timeout=25)
    time.sleep(4)  # let modules + WebGL init

    # Force a real desktop viewport (headless default is ~800px and would
    # trigger the mobile breakpoint, making screenshots unrepresentative).
    send(sock, "Emulation.setDeviceMetricsOverride",
         {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
    time.sleep(0.6)
    send(sock, "Page.navigate", {"url": URL})
    time.sleep(4)
    events = drain(sock, 1.5)

    errors, warnings = [], []
    for e in events:
        m = e.get("method")
        if m == "Runtime.exceptionThrown":
            d = e["params"]["exceptionDetails"]
            errors.append(d.get("exception", {}).get("description") or d.get("text"))
        elif m == "Runtime.consoleAPICalled":
            t = e["params"]["type"]
            txt = " ".join(str(a.get("value", a.get("description", ""))) for a in e["params"]["args"])
            if t == "error":
                errors.append(txt)
            elif t == "warning":
                warnings.append(txt)
        elif m == "Log.entryAdded":
            lv = e["params"]["entry"].get("level")
            if lv == "error":
                errors.append(e["params"]["entry"].get("text"))

    print("=== CONSOLE ===")
    print("  errors:", len(errors))
    for x in errors[:10]:
        print("   -", str(x)[:200])
    print("  warnings:", len(warnings))
    for x in warnings[:6]:
        print("   -", str(x)[:160])

    print("=== DOM ===")
    checks = {
        "title": "document.title",
        "brand": "document.querySelector('.brand')?.textContent.replace(/\\s+/g,' ').trim()",
        "sections": "document.querySelectorAll('main section').length",
        "section_ids": "[...document.querySelectorAll('main section')].map(s=>s.id).join(',')",
        "h1": "document.querySelector('h1')?.textContent.replace(/\\s+/g,' ').trim()",
        "tagline_hero": "document.querySelector('.hero__tagline')?.textContent.trim()",
        "tagline_footer": "document.querySelector('.footer .tagline')?.textContent.trim()",
        "project_cards": "document.querySelectorAll('#projects-grid .card').length",
        "spotlight": "document.querySelector('.spotlight h3')?.textContent.trim()",
        "timeline_items": "document.querySelectorAll('#timeline .tl-item').length",
        "experience_orgs": "[...document.querySelectorAll('.tl-item__org')].map(e=>e.textContent.trim()).join(' | ')",
        "skills_groups": "document.querySelectorAll('#skills-groups .skills__group').length",
        "about_paras": "document.querySelectorAll('#about-copy p').length",
        "font_display": "getComputedStyle(document.querySelector('.hero__name')).fontFamily",
        "font_loaded_anton": "document.fonts.check('16px Anton')",
        "font_loaded_bebas": "document.fonts.check('16px \\'Bebas Neue\\'')",
        "linkedin_ok": "[...document.querySelectorAll('a')].some(a=>a.href.includes('linkedin.com/in/alifadwitiyap'))",
        "github_ok": "[...document.querySelectorAll('a')].some(a=>a.href.includes('github.com/alifadwitiyap'))",
        "webgl_state": "document.querySelector('.stage')?.dataset.webgl",
        "overflow_x": "document.documentElement.scrollWidth > document.documentElement.clientWidth + 1",
        "scroll_h": "document.documentElement.scrollHeight",
    }
    for k, expr in checks.items():
        print(f"  {k}: {ev(sock, expr)}")

    # scroll through sections
    shot(sock, "desktop-hero.png")
    for sid in ("identity-file", "hall-of-fame", "skill-arsenal", "mission-log", "case-files", "open-channel"):
        ev(sock, f"document.getElementById('{sid}').scrollIntoView()")
        time.sleep(0.9)
        shot(sock, f"desktop-{sid}.png")
    print("  active_section_after_scroll:", ev(sock, "document.documentElement.dataset.section"))

    # portrait morph: scroll a bit into the hero track and read --morph
    ev(sock, "window.scrollTo(0, 0)")
    time.sleep(0.3)
    ev(sock, "window.scrollTo(0, Math.round(window.innerHeight*0.55))")
    time.sleep(0.5)
    print("  portrait_morph_at_55vh:", ev(sock, "document.getElementById('portrait')?.style.getPropertyValue('--morph')"))
    print("  portrait_sticky:", ev(sock, "getComputedStyle(document.querySelector('.portrait')).position"))
    ev(sock, "window.scrollTo(0, 0)")
    time.sleep(0.4)

    # modal test
    ev(sock, "document.querySelector('[data-open]')?.click()")
    time.sleep(0.6)
    print("  modal_open:", ev(sock, "!document.getElementById('modal').hidden"))
    shot(sock, "desktop-modal.png")
    ev(sock, "document.getElementById('modal-close')?.click()")
    time.sleep(0.3)
    print("  modal_closed:", ev(sock, "document.getElementById('modal').hidden"))

    # mobile
    send(sock, "Emulation.setDeviceMetricsOverride",
         {"width": 390, "height": 844, "deviceScaleFactor": 2, "mobile": True})
    time.sleep(0.6)
    send(sock, "Page.navigate", {"url": URL})
    time.sleep(3.5)
    print("=== MOBILE ===")
    print("  overflow_x:", ev(sock, "document.documentElement.scrollWidth > document.documentElement.clientWidth + 1"))
    print("  webgl_state:", ev(sock, "document.querySelector('.stage')?.dataset.webgl"))
    print("  sections:", ev(sock, "document.querySelectorAll('main section').length"))
    shot(sock, "mobile-hero.png")
    ev(sock, "document.getElementById('case-files').scrollIntoView()")
    time.sleep(1.0)
    shot(sock, "mobile-projects.png")

    # reduced motion (desktop viewport so the shot is representative)
    send(sock, "Emulation.setEmulatedMedia",
         {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
    send(sock, "Emulation.setDeviceMetricsOverride",
         {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
    time.sleep(0.4)
    send(sock, "Page.navigate", {"url": URL})
    time.sleep(3)
    print("=== REDUCED MOTION ===")
    print("  reduced:", ev(sock, "matchMedia('(prefers-reduced-motion: reduce)').matches"))
    print("  webgl_state:", ev(sock, "document.querySelector('.stage')?.dataset.webgl"))
    print("  tagline_visible:", ev(sock, "!!document.querySelector('.hero__tagline')?.textContent.trim()"))
    shot(sock, "reduced-motion-hero.png")

    print("=== DONE ===")
    return 0


def cleanup():
    """Kill only the Chrome we launched (match this run's profile)."""
    try:
        import subprocess as sp
        ps = (
            "Get-CimInstance Win32_Process -Filter \"name='chrome.exe'\" | "
            f"Where-Object {{ $_.CommandLine -match '{os.path.basename(PROFILE)}' }} | "
            "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
        )
        sp.run(["powershell", "-NoProfile", "-Command", ps], timeout=25,
               stdout=sp.DEVNULL, stderr=sp.DEVNULL)
    except Exception:
        pass


if __name__ == "__main__":
    try:
        code = main()
    finally:
        cleanup()
    sys.exit(code)
