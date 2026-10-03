"""Focused check: does the resolver mirror scroll into the menu correctly?

Isolates the two failing assertions from probe_navigator.py. Tests BOTH
scroll methods (offsetTop vs scrollIntoView) so a test artifact is
distinguishable from a real resolver bug.
"""
import sys, time, importlib.util, os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("verify", os.path.join(HERE, "verify.py"))
v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)

URL = "http://127.0.0.1:8079/index.html"
v.URL = URL; v.PORT = 9414
assert v.launch(), "chrome CDP not up"
targets = v.http_json("/json/list")
page = next(t for t in targets if t.get("type") == "page")
sock = v.connect(page["id"])
for m in ("Page.enable", "Runtime.enable", "Log.enable"):
    v.recv_until(sock, v.send(sock, m), timeout=10)
v.recv_until(sock, v.send(sock, "Page.navigate", {"url": "about:blank"}), timeout=25)
time.sleep(0.5)
v.send(sock, "Emulation.setDeviceMetricsOverride",
       {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
time.sleep(0.5)
v.recv_until(sock, v.send(sock, "Page.navigate", {"url": URL + "?t=" + str(int(time.time()))}), timeout=25)
time.sleep(3.5)
v.drain(sock, 1.0)

def ev(e): return v.ev(sock, e)

print("offsetTop vs document position:")
print("  skills.offsetTop      =", ev("document.getElementById('skills').offsetTop"))
print("  skills doc top (rect+scrollY) =", ev("Math.round(document.getElementById('skills').getBoundingClientRect().top + window.scrollY)"))
print("  shell offsetTop       =", ev("document.querySelector('.shell').offsetTop"))
print("  scrollY at start      =", ev("window.scrollY"))

print("\n--- method A: window.scrollTo(top: offsetTop) ---")
ev("window.scrollTo({top: document.getElementById('skills').offsetTop, behavior:'auto'})")
time.sleep(1.2)
print("  scrollY               =", ev("window.scrollY"))
print("  skills rect.top       =", ev("Math.round(document.getElementById('skills').getBoundingClientRect().top)"))
print("  dataset.section       =", ev("document.documentElement.dataset.section"))
print("  menu skills data-active =", ev("document.querySelector('#navigator-list [data-goto=\"skills\"]').getAttribute('data-active')"))

print("\n--- method B: scrollIntoView(skills) ---")
ev("document.getElementById('skills').scrollIntoView({block:'start'})")
time.sleep(1.2)
print("  scrollY               =", ev("window.scrollY"))
print("  skills rect.top       =", ev("Math.round(document.getElementById('skills').getBoundingClientRect().top)"))
print("  dataset.section       =", ev("document.documentElement.dataset.section"))
print("  menu skills data-active =", ev("document.querySelector('#navigator-list [data-goto=\"skills\"]').getAttribute('data-active')"))

print("\n--- method C: scrollIntoView(experience) ---")
ev("document.getElementById('experience').scrollIntoView({block:'start'})")
time.sleep(1.2)
print("  dataset.section       =", ev("document.documentElement.dataset.section"))
print("  menu experience data-active =", ev("document.querySelector('#navigator-list [data-goto=\"experience\"]').getAttribute('data-active')"))

v.cleanup()
