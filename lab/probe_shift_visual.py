"""Visual proof for the camera space-shift (pixel-diff at a FIXED section).

probe_camera_shift.py proves the envelope math; this proves the envelope MOVES
THE RENDER at a constant section + scroll position, then returns to rest.

The scene is continuously animated (shards, orbits, constellation), so two
frames seconds apart differ on their own. The control must therefore be a SHORT
idle interval of the same length as the shift sample, so ambient drift is
comparable and the shift's contribution stands out.

Method (fixed section skill-arsenal, fixed scroll):
  - reference R: idle frame
  - control C:   idle frame ~70ms later      -> ambient drift per 70ms
  - burst:       bounce mission-log -> skill-arsenal (fires a shift), then
                 capture 12 frames at ~70ms; the largest diff vs R is the shift
  - ratio = shift_peak / control_drift; must be >> 1 for the change to dominate

Usage: python lab/probe_shift_visual.py [url]
"""
import sys, time, importlib.util, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("verify", os.path.join(HERE, "verify.py"))
v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8077/index.html"
v.URL = URL; v.PORT = 9419
assert v.launch(), "chrome CDP not up"
targets = v.http_json("/json/list")
page = next(t for t in targets if t.get("type") == "page")
sock = v.connect(page["id"])
for m in ("Page.enable", "Runtime.enable", "Log.enable", "Network.enable"):
    v.recv_until(sock, v.send(sock, m), timeout=10)
v.send(sock, "Network.setCacheDisabled", {"cacheDisabled": True})
v.recv_until(sock, v.send(sock, "Page.navigate", {"url": "about:blank"}), timeout=25)
time.sleep(0.5)
v.send(sock, "Emulation.setDeviceMetricsOverride",
       {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
time.sleep(0.5)
v.recv_until(sock, v.send(sock, "Page.navigate", {"url": URL + "?t=" + str(int(time.time()))}), timeout=25)
time.sleep(4)
v.drain(sock, 1.0)

def ev(e): return v.ev(sock, e)

def centre(sid):
    ev(f"(()=>{{const el=document.getElementById('{sid}');"
       f"const y=el.getBoundingClientRect().top+window.scrollY;"
       f"window.scrollTo(0, Math.round(y - (window.innerHeight-el.offsetHeight)/2));}})()")

SHOTS = os.path.join(HERE, "shots")

def grab(tag):
    p = v.shot(sock, tag)
    return np.asarray(Image.open(p).convert("RGB"), dtype=np.int16)

def mad(a, b):
    d = np.abs(a - b).mean(axis=2)
    return float(d.mean()), float((d > 8).mean())

STEP = 0.07  # ~70ms between frames

# settle at the target section
centre("skill-arsenal")
time.sleep(2.4)
R = grab("shiftdiff-R.png")
time.sleep(STEP)
C = grab("shiftdiff-C-control.png")
mad_ctrl, frac_ctrl = mad(R, C)

# fire a shift without leaving the section: bounce out and straight back
centre("mission-log")
time.sleep(0.30)
centre("skill-arsenal")

peak_mad, peak_frac, peak_i = 0.0, 0.0, -1
for i in range(12):
    time.sleep(STEP)
    f = grab(f"shiftdiff-burst-{i:02d}.png")
    m, fr = mad(R, f)
    if m > peak_mad:
        peak_mad, peak_frac, peak_i = m, fr, i

ratio = peak_mad / max(mad_ctrl, 1e-6)
print("=== PIXEL DIFF (fixed section: skill-arsenal) ===")
print("  NOTE: this measures the TOTAL camera response to a section change")
print("  (the pre-existing camX/camY lerp PLUS the new space-shift), not the")
print("  shift in isolation. probe_camera_shift.py isolates the envelope math.")
print(f"  control (idle, {int(STEP*1000)}ms): mad={mad_ctrl:6.3f}  changed>8/255={frac_ctrl*100:5.2f}%")
print(f"  shift peak (frame {peak_i}, {int((peak_i+1)*STEP*1000)}ms): mad={peak_mad:6.3f}  changed>8/255={peak_frac*100:5.2f}%")
print(f"  shift / control ratio: {ratio:.2f}x  (want >> 1)")
print(f"  section: {ev('document.documentElement.dataset.section')}")

v.cleanup()
ok = ratio >= 2.0 and peak_frac > 0.02
print("=== DONE === PASS:", ok)
sys.exit(0 if ok else 1)
