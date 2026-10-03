"""Capture v3 screenshots: topbar+progress, menu overlay, intro, wipe, all-out."""
import sys, time, importlib.util, os
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("verify", os.path.join(HERE, "verify.py"))
v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)
URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8077/index.html"
v.URL = URL; v.PORT = 9495
assert v.launch()
targets = v.http_json("/json/list")
page = next(t for t in targets if t.get("type") == "page")
sock = v.connect(page["id"])
for m in ("Page.enable", "Runtime.enable"):
    v.recv_until(sock, v.send(sock, m), timeout=10)
def ev(e): return v.ev(sock, e)
def nav(u, s=3.6):
    v.recv_until(sock, v.send(sock, "Page.navigate", {"url": "about:blank"}), timeout=25)
    time.sleep(0.4); v.recv_until(sock, v.send(sock, "Page.navigate", {"url": u}), timeout=25)
    time.sleep(s); v.drain(sock, 0.6)
v.send(sock, "Emulation.setDeviceMetricsOverride", {"width":1440,"height":900,"deviceScaleFactor":1,"mobile":False})
ts = str(int(time.time()))

# intro (fresh session)
nav(f"{URL}?s={ts}", 0.9)
v.shot(sock, "v3-intro.png")
time.sleep(4.0)

# topbar + progress at a later chapter
ev("document.getElementById('case-files').scrollIntoView()")
time.sleep(2.2)
v.shot(sock, "v3-topbar-progress.png")

# menu overlay
ev("document.getElementById('menu-btn').click()")
time.sleep(0.8)
v.shot(sock, "v3-menu-overlay.png")
ev("document.getElementById('chapter-menu').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
time.sleep(0.4)

# identity + hall-of-fame
ev("document.getElementById('identity-file').scrollIntoView()")
time.sleep(1.4); v.shot(sock, "v3-identity-file.png")
ev("document.getElementById('hall-of-fame').scrollIntoView()")
time.sleep(1.4); v.shot(sock, "v3-hall-of-fame.png")
ev("document.getElementById('open-channel').scrollIntoView()")
time.sleep(1.4); v.shot(sock, "v3-open-channel.png")

print("shots done")
v.cleanup()
