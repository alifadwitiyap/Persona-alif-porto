"""Screenshots for Lane C: menu overlay (desktop + mobile) and content sections."""
import base64, json, os, socket, struct, subprocess, sys, time, urllib.request

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8077/index.html"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
PORT = 9474
PROFILE = os.path.join(os.environ.get("TEMP", "C:/Windows/Temp"), "p5probe-lanec")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
HOST = "127.0.0.1"
os.makedirs(OUT, exist_ok=True)


def http_json(path):
    return json.loads(urllib.request.urlopen(f"http://{HOST}:{PORT}{path}", timeout=10).read())


def launch():
    subprocess.Popen([CHROME, f"--remote-debugging-port={PORT}", f"--user-data-dir={PROFILE}",
        "--headless=new", "--no-first-run", "--no-default-browser-check",
        "--disable-gpu-sandbox", "--use-gl=angle", "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader", "--window-size=1440,900", "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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

def ev(sock, e):
    r = recv(sock, send(sock, "Runtime.evaluate", {"expression": e, "returnByValue": True, "awaitPromise": True}))
    try: return r["result"]["result"].get("value")
    except Exception: return None

def shot(sock, name):
    r = recv(sock, send(sock, "Page.captureScreenshot", {"format": "png"}))
    try:
        data = base64.b64decode(r["result"]["data"])
        open(os.path.join(OUT, name), "wb").write(data)
        print(f"  SHOT {name} ({len(data)}b)")
    except Exception as e:
        print("  shot fail", name, e)

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
        print("FAIL: chrome CDP"); return 2
    page = next(t for t in http_json("/json/list") if t.get("type") == "page")
    sock = socket.create_connection((HOST, PORT), timeout=20)
    key = base64.b64encode(os.urandom(16)).decode()
    sock.sendall((f"GET /devtools/page/{page['id']} HTTP/1.1\r\nHost: {HOST}:{PORT}\r\n"
                  "Upgrade: websocket\r\nConnection: Upgrade\r\n"
                  f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n").encode())
    assert "101" in sock.recv(4096).decode("utf-8", "replace")
    for m in ("Page.enable", "Runtime.enable"):
        recv(sock, send(sock, m), 10)

    # desktop
    send(sock, "Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
    recv(sock, send(sock, "Page.navigate", {"url": URL}), 25)
    time.sleep(3)
    # Dismiss the opening screen so the shot shows the real page, not the intro.
    ev(sock, "document.getElementById('intro')?.remove()")
    time.sleep(0.3)
    ev(sock, "document.getElementById('menu-btn').click()")
    time.sleep(0.8)
    shot(sock, "lanec-menu-desktop.png")
    ev(sock, "document.getElementById('chapter-menu-close').click()")
    time.sleep(0.4)
    for sid in ("identity-file", "hall-of-fame", "mission-log", "open-channel"):
        ev(sock, f"document.getElementById('{sid}').scrollIntoView()")
        time.sleep(2.2)  # let the space-shift transition fully settle
        shot(sock, f"lanec-{sid}.png")

    # mobile overlay
    send(sock, "Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 2, "mobile": True})
    recv(sock, send(sock, "Page.navigate", {"url": URL}), 25)
    time.sleep(3)
    ev(sock, "document.getElementById('menu-btn').click()")
    time.sleep(0.8)
    shot(sock, "lanec-menu-mobile.png")
    print("=== DONE ===")
    return 0

if __name__ == "__main__":
    try:
        code = main()
    finally:
        cleanup()
    sys.exit(code)
