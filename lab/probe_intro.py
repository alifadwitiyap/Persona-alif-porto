"""Drive js/intro.js in a real headless Chrome over CDP and assert the contract.

Reuses the same minimal CDP client pattern as lab/verify.py (stdlib only).

Scenarios:
  1. hard timeout   — overlay is removed from the DOM within maxMs (+slack)
  2. skip button    — clicking SKIP exits immediately
  3. escape key     — Esc exits immediately
  4. session-once   — a second load in the same session shows no overlay
  5. reduced-motion — overlay never shows at all
  6. no-webgl       — status copy reads "CONTINUING WITHOUT 3D"

Usage: python lab/probe_intro.py
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
import urllib.parse

HOST = "127.0.0.1"
PORT = 9421
BASE = f"http://{HOST}:8079"
HARNESS = f"{BASE}/lab/intro_harness.html"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PROFILE = os.path.join(os.environ.get("TEMP", "C:/Windows/Temp"), "alif-intro-cdp")

_id = [0]
_fail = []


def check(name, ok, detail=""):
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
    if not ok:
        _fail.append(name)


def http_json(path):
    return json.loads(urllib.request.urlopen(f"http://{HOST}:{PORT}{path}", timeout=10).read())


def launch():
    try:
        http_json("/json/version")
        return True
    except Exception:
        pass
    subprocess.Popen(
        [CHROME, f"--remote-debugging-port={PORT}", f"--user-data-dir={PROFILE}",
         "--headless=new", "--no-first-run", "--no-default-browser-check",
         "about:blank"],
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


def new_tab(url):
    req = urllib.request.Request(
        f"http://{HOST}:{PORT}/json/new?{urllib.parse.quote(url, safe='')}",
        method="PUT",
    )
    return json.loads(urllib.request.urlopen(req, timeout=10).read())


def connect(target_id):
    key = base64.b64encode(os.urandom(16)).decode()
    hs = (f"GET /devtools/page/{target_id} HTTP/1.1\r\nHost: {HOST}:{PORT}\r\n"
          f"Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\n"
          "Sec-WebSocket-Version: 13\r\n\r\n")
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


def _frames(buf):
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
        msgs.append(buf[off:off + ln])
        buf = buf[off + ln:]
    return msgs, buf


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
        msgs, buf = _frames(buf)
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


def wait_gone(sock, timeout=1.6):
    """Poll until #intro is detached (it lingers through its exit fade)."""
    end = time.time() + timeout
    while time.time() < end:
        if ev(sock, "!!document.getElementById('intro')") is False:
            return True
        time.sleep(0.08)
    return False


def console_errors(sock, seconds=1.0):
    """Drain Runtime.consoleAPICalled + exceptionThrown for `seconds`."""
    sock.settimeout(0.3)
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
        msgs, buf = _frames(buf)
        for m in msgs:
            try:
                o = json.loads(m.decode("utf-8", "replace"))
            except Exception:
                continue
            meth = o.get("method")
            if meth == "Runtime.exceptionThrown":
                out.append("EXCEPTION " + json.dumps(o.get("params", {}))[:200])
            elif meth == "Runtime.consoleAPICalled" and o.get("params", {}).get("type") == "error":
                out.append("console.error " + json.dumps(o["params"].get("args", []))[:200])
    return out


def load(url, setup=None):
    tab = new_tab(url)
    sock = connect(tab["id"])
    send(sock, "Runtime.enable")
    send(sock, "Page.enable")
    if setup:
        setup(sock)
    time.sleep(0.4)
    return tab, sock


def close(sock):
    try:
        sock.close()
    except Exception:
        pass


def scenario_timeout():
    print("1. hard timeout")
    tab, sock = load(HARNESS)
    t0 = time.time()
    while time.time() - t0 < 6:
        present = ev(sock, "!!document.getElementById('intro')")
        if present is False:
            break
        time.sleep(0.15)
    elapsed = (time.time() - t0) * 1000
    check("overlay removed after hard timeout", present is False, f"after {elapsed:.0f}ms")
    check("timeout fires near maxMs (<= 3200+900ms)", 3200 <= elapsed <= 4100, f"{elapsed:.0f}ms")
    errs = console_errors(sock)
    check("no console errors", not errs, "; ".join(errs)[:200])
    close(sock)
    return tab


def scenario_skip():
    print("2. skip button")
    tab, sock = load(HARNESS)
    check("overlay present on load", ev(sock, "!!document.getElementById('intro')") is True)
    ev(sock, "document.getElementById('intro-skip').click()")
    # pointer-events must release immediately (page is usable under the fade)
    pe = ev(sock, "getComputedStyle(document.getElementById('intro')).pointerEvents")
    check("pointer released immediately on skip", pe == "none", f"pointer-events={pe}")
    check("clicking SKIP removes overlay", wait_gone(sock))
    close(sock)
    return tab


def scenario_escape():
    print("3. escape key")
    tab, sock = load(HARNESS)
    ev(sock, "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
    check("Escape removes overlay", wait_gone(sock))
    close(sock)
    return tab


def scenario_session_once():
    print("4. session-once")
    tab, sock = load(HARNESS)          # fresh tab => fresh sessionStorage
    check("first load: overlay present",
          ev(sock, "!!document.getElementById('intro')") is True)
    ev(sock, "document.getElementById('intro-skip').click()")
    check("first load: overlay skipped", wait_gone(sock))
    # reload the same tab — same sessionStorage
    i = send(sock, "Page.reload", {"ignoreCache": True})
    recv_until(sock, i)
    time.sleep(0.7)
    check("second load same session: no overlay",
          ev(sock, "!!document.getElementById('intro')") is False)
    check("second load: key stored",
          ev(sock, "sessionStorage.getItem('4life:intro:v1')") == "1")
    close(sock)
    return tab


def scenario_reduced():
    print("5. reduced-motion")
    tab, sock = load(HARNESS, setup=lambda s: send(
        s, "Emulation.setEmulatedMedia",
        {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]}))
    # reload so the media query is in force before the module evaluates it
    i = send(sock, "Page.reload", {"ignoreCache": True})
    recv_until(sock, i)
    time.sleep(0.6)
    check("reduced-motion: overlay never shown",
          ev(sock, "!!document.getElementById('intro')") is False)
    close(sock)
    return tab


def scenario_no_webgl():
    print("6. no-webgl status copy")
    tab, sock = load(HARNESS)
    # kill WebGL + clear the session key, then reload so both take effect
    i = send(sock, "Page.addScriptToEvaluateOnNewDocument",
             {"source": "window.WebGLRenderingContext = undefined;"})
    recv_until(sock, i)
    ev(sock, "sessionStorage.clear()")
    i = send(sock, "Page.reload", {"ignoreCache": True})
    recv_until(sock, i)
    time.sleep(0.6)
    status = ev(sock, "document.getElementById('intro-status')?.textContent")
    check("status reads CONTINUING WITHOUT 3D",
          status == "CONTINUING WITHOUT 3D", f"got {status!r}")
    ev(sock, "document.getElementById('intro-skip')?.click()")
    close(sock)
    return tab


def scenario_background():
    print("7. background tab (Page Visibility)")
    tab, sock = load(HARNESS)
    # Make document.hidden controllable, and start the tab "hidden".
    i = send(sock, "Page.addScriptToEvaluateOnNewDocument", {"source": """
        (() => {
          let hidden = true;
          Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
          Object.defineProperty(document, 'visibilityState',
            { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
          window.__setHidden = (v) => {
            hidden = v;
            document.dispatchEvent(new Event('visibilitychange'));
          };
        })();
    """})
    recv_until(sock, i)
    ev(sock, "sessionStorage.clear()")
    i = send(sock, "Page.reload", {"ignoreCache": True})
    recv_until(sock, i)
    time.sleep(0.5)
    check("hidden start: overlay present, no premature exit",
          ev(sock, "!!document.getElementById('intro')") is True)
    # Wait PAST the deadline while "hidden": nothing should have run.
    time.sleep(3.4)
    check("hidden past deadline: overlay still held (timer dropped)",
          ev(sock, "!!document.getElementById('intro')") is True)
    # Return to foreground → absolute deadline already passed → exit at once.
    ev(sock, "window.__setHidden(false)")
    check("return to foreground: exits promptly on expired deadline",
          wait_gone(sock, timeout=1.0))
    close(sock)
    return tab


def main():
    if not launch():
        print("FAIL: chrome did not expose CDP")
        return 1
    # static server
    srv = subprocess.Popen(
        [sys.executable, "-m", "http.server", "8079", "--bind", HOST],
        cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    time.sleep(1.0)
    tabs = []
    try:
        for fn in (scenario_timeout, scenario_skip, scenario_escape,
                   scenario_session_once, scenario_reduced, scenario_no_webgl,
                   scenario_background):
            try:
                tabs.append(fn())
            except Exception as e:
                check(fn.__name__, False, f"crashed: {e}")
    finally:
        srv.terminate()
    print()
    if _fail:
        print(f"RESULT: {len(_fail)} FAILED -> {_fail}")
        return 1
    print("RESULT: all intro scenarios PASS")
    return 0


if __name__ == "__main__":
    import urllib.parse  # noqa: E402
    sys.exit(main())
