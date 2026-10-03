"""Capture the new sections: chapter-select + hall-of-fame (+ hero)."""
import sys, time, importlib.util, os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("verify", os.path.join(HERE, "verify.py"))
v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8079/index.html"
v.URL = URL; v.PORT = 9471
assert v.launch(), "chrome CDP not up"
targets = v.http_json("/json/list")
page = next(t for t in targets if t.get("type") == "page")
sock = v.connect(page["id"])
for m in ("Page.enable", "Runtime.enable"):
    v.recv_until(sock, v.send(sock, m), timeout=10)
v.recv_until(sock, v.send(sock, "Page.navigate", {"url": "about:blank"}), timeout=25)
time.sleep(0.5)

def ev(e): return v.ev(sock, e)

v.send(sock, "Emulation.setDeviceMetricsOverride",
       {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
v.recv_until(sock, v.send(sock, "Page.navigate", {"url": URL + "?s=" + str(int(time.time()))}), timeout=25)
time.sleep(3.5); v.drain(sock, 0.8)
v.shot(sock, "new-hero.png")

for sec in ("chapter-select", "hall-of-fame", "identity-file", "case-files"):
    ev(f"document.getElementById('{sec}').scrollIntoView({{behavior:'auto',block:'start'}})")
    time.sleep(1.4)
    v.shot(sock, f"new-{sec}.png")

# mobile
v.send(sock, "Emulation.setDeviceMetricsOverride",
       {"width": 390, "height": 844, "deviceScaleFactor": 2, "mobile": True})
time.sleep(0.5)
v.recv_until(sock, v.send(sock, "Page.navigate", {"url": URL + "?m=" + str(int(time.time()))}), timeout=25)
time.sleep(3.5); v.drain(sock, 0.8)
for sec in ("chapter-select", "hall-of-fame"):
    ev(f"document.getElementById('{sec}').scrollIntoView({{behavior:'auto',block:'start'}})")
    time.sleep(1.4)
    v.shot(sock, f"new-{sec}-mobile.png")

print("shots done")
v.cleanup()
