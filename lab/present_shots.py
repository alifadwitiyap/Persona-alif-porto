"""Capture presentation screenshots: hero + navigator overlay (desktop & mobile)."""
import sys, time, importlib.util, os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("verify", os.path.join(HERE, "verify.py"))
v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)

URL = "http://127.0.0.1:8079/index.html"
v.URL = URL; v.PORT = 9470
assert v.launch(), "chrome CDP not up"
targets = v.http_json("/json/list")
page = next(t for t in targets if t.get("type") == "page")
sock = v.connect(page["id"])
for m in ("Page.enable", "Runtime.enable"):
    v.recv_until(sock, v.send(sock, m), timeout=10)
v.recv_until(sock, v.send(sock, "Page.navigate", {"url": "about:blank"}), timeout=25)
time.sleep(0.5)

def ev(e): return v.ev(sock, e)

# ---- desktop ----
v.send(sock, "Emulation.setDeviceMetricsOverride",
       {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
v.recv_until(sock, v.send(sock, "Page.navigate", {"url": URL + "?s=" + str(int(time.time()))}), timeout=25)
time.sleep(3.5)
v.drain(sock, 0.8)
v.shot(sock, "present-hero-desktop.png")
ev("document.getElementById('menu-btn').click()")
time.sleep(1.0)
v.shot(sock, "present-nav-desktop.png")
# highlight a mid item to show active styling variety
ev("document.getElementById('navigator').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))")
time.sleep(0.3)
ev("document.getElementById('navigator').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))")
time.sleep(0.6)
v.shot(sock, "present-nav-desktop-active.png")

# ---- mobile ----
v.send(sock, "Emulation.setDeviceMetricsOverride",
       {"width": 390, "height": 844, "deviceScaleFactor": 2, "mobile": True})
time.sleep(0.5)
v.recv_until(sock, v.send(sock, "Page.navigate", {"url": URL + "?m=" + str(int(time.time()))}), timeout=25)
time.sleep(3.5)
v.drain(sock, 0.8)
v.shot(sock, "present-hero-mobile.png")
ev("document.getElementById('menu-btn').click()")
time.sleep(1.0)
v.shot(sock, "present-nav-mobile.png")

print("shots done")
v.cleanup()
