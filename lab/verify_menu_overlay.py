"""Real-browser check for js/ui/menu.js (the chapter overlay).

Owns its own headless Chrome (unique debug port + profile). Drives the
lab/menu_harness.html page (real markup + real CSS + real module) and asserts:
  - the overlay renders 6 rows from the registry, closed on load
  - MENU button toggles open (visible, body locked, aria-expanded)
  - key M toggles; M is ignored while typing
  - Esc closes and stops propagation; backdrop closes
  - an item click closes and navigates (hash + scroll), resolver mirrors active
  - no console exceptions

Usage: python lab/verify_menu_overlay.py [url]
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

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8077/lab/menu_harness.html"
PORT = 9471
PROFILE = os.path.join(os.environ.get("TEMP", "C:/Windows/Temp"), "p5probe-menu")
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
    recv(sock, send(sock, "Page.addScriptToEvaluateOnNewDocument", {"source":
         "window.__errs=[];"
         "addEventListener('error',e=>window.__errs.push(String(e.message||e.error)));"
         "addEventListener('unhandledrejection',e=>window.__errs.push('rejection: '+String(e.reason)));"
         }), 10)
    send(sock, "Emulation.setDeviceMetricsOverride",
         {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
    recv(sock, send(sock, "Page.navigate", {"url": URL}), 25)
    time.sleep(3)
    ev(sock, "document.documentElement.style.scrollBehavior='auto'")

    print("=== RENDER (from the one registry) ===")
    check("row-count", ev(sock, "document.querySelectorAll('#chapter-menu-list .chapter-menu__link').length"), 6)
    check("hrefs", ev(sock, "[...document.querySelectorAll('#chapter-menu-list .chapter-menu__link')].map(b=>b.getAttribute('data-goto'))"),
          ["identity-file", "hall-of-fame", "skill-arsenal", "mission-log", "case-files", "open-channel"])
    check("labels", ev(sock, "[...document.querySelectorAll('#chapter-menu-list .chapter-menu__label')].map(e=>e.textContent)"),
          ["IDENTITY FILE", "HALL OF FAME", "SKILL ARSENAL", "MISSION LOG", "CASE FILES", "OPEN CHANNEL"])
    check("closed-on-load", ev(sock, "document.getElementById('chapter-menu').hidden"), True)

    print("=== MENU BUTTON TOGGLES ===")
    ev(sock, "document.getElementById('menu-btn').click()")
    time.sleep(0.4)
    check("open-visible", ev(sock, "!document.getElementById('chapter-menu').hidden"), True)
    check("open-locked", ev(sock, "document.body.classList.contains('is-locked')"), True)
    check("aria-expanded-true", ev(sock, "document.getElementById('menu-btn').getAttribute('aria-expanded')"), "true")
    check("panel-visible-height", ev(sock, "document.querySelector('.chapter-menu__panel').getBoundingClientRect().height > 100"), True)
    ev(sock, "document.getElementById('menu-btn').click()")
    time.sleep(0.4)
    check("closed-again", ev(sock, "document.getElementById('chapter-menu').hidden"), True)
    check("unlocked", ev(sock, "document.body.classList.contains('is-locked')"), False)

    print("=== KEY M TOGGLES / GUARDS ===")
    ev(sock, "document.body.focus()")
    ev(sock, "document.dispatchEvent(new KeyboardEvent('keydown',{key:'m',bubbles:true}))")
    time.sleep(0.3)
    check("M-opens", ev(sock, "!document.getElementById('chapter-menu').hidden"), True)
    # typing guard: inject an input, focus it, press M -> stays open, no nav
    ev(sock, "(function(){var i=document.createElement('input');i.id='qa-in';document.body.appendChild(i);i.focus();})()")
    ev(sock, "document.getElementById('qa-in').dispatchEvent(new KeyboardEvent('keydown',{key:'m',bubbles:true}))")
    time.sleep(0.3)
    check("M-ignored-while-typing", ev(sock, "!document.getElementById('chapter-menu').hidden"), True)
    ev(sock, "document.getElementById('qa-in').remove()")

    print("=== ESC CLOSES ===")
    ev(sock, "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
    time.sleep(0.3)
    check("Esc-closes", ev(sock, "document.getElementById('chapter-menu').hidden"), True)

    print("=== ITEM CLICK NAVIGATES + RESOLVER MIRRORS ===")
    ev(sock, "document.getElementById('menu-btn').click()")
    time.sleep(0.3)
    ev(sock, "document.querySelector('#chapter-menu-list .chapter-menu__link[data-goto=\\\"case-files\\\"]').click()")
    # The real page scrolls smoothly over a long distance; wait for it to settle
    # rather than assuming a fixed short delay.
    settled = False
    for _ in range(20):
        time.sleep(0.4)
        if ev(sock, "document.documentElement.dataset.section") == "case-files":
            settled = True
            break
    time.sleep(0.4)
    check("click-closed", ev(sock, "document.getElementById('chapter-menu').hidden"), True)
    check("click-hash", ev(sock, "location.hash"), "#case-files")
    # After the section gains scroll-margin-top (to clear the fixed topbar), the
    # section's top sits a little BELOW the viewport top — that is correct. The
    # real assertion is that the section is scrolled into view AND its heading is
    # not hidden behind the fixed topbar.
    check("click-scrolled",
          ev(sock, "Math.abs(document.getElementById('case-files').getBoundingClientRect().top) < 120"), True)
    check("click-heading-clear-of-topbar",
          ev(sock, "(()=>{const h=document.querySelector('#case-files h2').getBoundingClientRect();const t=document.querySelector('.topbar').getBoundingClientRect();return h.top>=t.bottom-1;})()"),
          True)
    check("active-mirrored-in-overlay",
          ev(sock, "document.querySelector('#chapter-menu-list .chapter-menu__link[data-active=\\\"true\\\"]')?.getAttribute('data-goto')"),
          "case-files")
    check("single-active-overlay",
          ev(sock, "[...document.querySelectorAll('#chapter-menu-list .chapter-menu__link')].filter(b=>b.getAttribute('data-active')==='true').length"), 1)

    print("=== BACKDROP CLOSES ===")
    ev(sock, "document.getElementById('menu-btn').click()")
    time.sleep(0.3)
    ev(sock, "document.querySelector('.chapter-menu__scrim').click()")
    time.sleep(0.3)
    check("backdrop-closes", ev(sock, "document.getElementById('chapter-menu').hidden"), True)

    print("=== M OPENS THE OVERLAY (no in-page chapter-select handler) ===")
    # Only the overlay menu binds M: pressing M while the overlay is CLOSED
    # must open the OVERLAY (menu.js).
    ev(sock, "window.scrollTo(0, document.body.scrollHeight)")
    time.sleep(0.3)
    ev(sock, "document.body.focus()")
    ev(sock, "document.dispatchEvent(new KeyboardEvent('keydown',{key:'m',bubbles:true}))")
    time.sleep(0.4)
    check("M-opens-overlay-not-scroll",
          ev(sock, "!document.getElementById('chapter-menu').hidden"), True)
    ev(sock, "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
    time.sleep(0.2)

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
