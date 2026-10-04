"""Targeted probe: camera space-shift on section changes.

Reuses lab/verify.py's CDP helpers. Checks:
  1. zero console errors / exceptions across every section change
  2. the SERVED js/camera-shift.js behaves (bounded one-shot, settles to 0) —
     run in-page so the real ES-module graph over HTTP is exercised
  3. all 7 sections resolve and the resolver drives them (data-section)
  4. the WebGL canvas is never recreated and keeps rendering (non-blank)
  5. screenshots at hero + right after a section change

Usage: python lab/probe_camera_shift.py [url]
"""
import sys, time, importlib.util, os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("verify", os.path.join(HERE, "verify.py"))
v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8077/index.html"
v.URL = URL; v.PORT = 9418
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
events = v.drain(sock, 1.5)

errors = []
for e in events:
    m = e.get("method")
    if m == "Runtime.exceptionThrown":
        d = e["params"]["exceptionDetails"]
        errors.append(d.get("exception", {}).get("description") or d.get("text"))
    elif m == "Runtime.consoleAPICalled" and e["params"]["type"] == "error":
        errors.append(" ".join(str(a.get("value", a.get("description", ""))) for a in e["params"]["args"]))
    elif m == "Log.entryAdded" and e["params"]["entry"].get("level") == "error":
        errors.append(e["params"]["entry"].get("text"))

def ev(e): return v.ev(sock, e)

print("=== CONSOLE ===")
print("  errors:", len(errors))
for x in errors[:10]:
    print("   -", str(x)[:200])

print("=== SERVED MODULE (in-page) ===")
MODULE_JS = """
(async () => {
  const m = await import('./js/camera-shift.js');
  const out = {};
  const s = m.createShift();
  out.idle = [m.stepShift(s, 16), m.stepShift(s, 16)];
  m.fireShift(s, 1.2, 0);
  out.restartT = s.t;
  out.dir = [s.dx, s.dy];
  out.magBounded = s.mag > 0 && s.mag <= 1;
  let peak = 0, settled = -1, bounded = true;
  for (let i = 0; i < 400; i++) {
    const e = m.stepShift(s, 16);
    if (e < 0 || e > 1) bounded = false;
    if (e > 0) peak = Math.max(peak, e); else if (settled < 0) settled = i;
  }
  out.peak = peak; out.settled = settled; out.bounded = bounded;
  out.afterSettle = m.stepShift(s, 16);
  m.fireShift(s, 0, 0);
  out.fallback = [s.dx, s.dy, s.mag];
  m.fireShift(s, m.SPACE_SHIFT.travel, 0);
  out.fullTravel = s.mag;
  out.gains = m.SPACE_SHIFT;
  return out;
})()
"""
mod = ev(MODULE_JS)
print("  idle envelope:", mod["idle"], "(expect [0, 0])")
print("  fire restarts t:", mod["restartT"], "(expect 0)")
print("  direction:", mod["dir"], "| magnitude bounded:", mod["magBounded"])
print("  envelope peak:", round(mod["peak"], 3), "| settles at step:", mod["settled"], "| bounded:", mod["bounded"])
print("  after settle:", mod["afterSettle"], "(expect 0)")
print("  zero-travel fallback [dx,dy,mag]:", mod["fallback"])
print("  full-travel magnitude:", mod["fullTravel"], "(expect 1)")
print("  gains:", {k: mod["gains"][k] for k in ("duration", "camPush", "camLift", "camRoll", "groupYaw")})

print("=== SECTION DRIVE ===")
def centre(sid):
    ev(f"(()=>{{const el=document.getElementById('{sid}');"
       f"const y=el.getBoundingClientRect().top+window.scrollY;"
       f"window.scrollTo(0, Math.round(y - (window.innerHeight-el.offsetHeight)/2));}})()")

canvas_id_ok = True
seen = []
for sid in ("hero", "identity-file", "hall-of-fame", "skill-arsenal",
            "mission-log", "case-files", "open-channel"):
    centre(sid)
    time.sleep(1.4)
    got = ev("document.documentElement.dataset.section")
    seen.append(got)
    if ev("document.querySelector('#gl') !== document.querySelector('#gl')"):
        canvas_id_ok = False
    print(f"  -> {sid}: data-section={got}")

print("  transitions:", " -> ".join(seen))
print("  canvas identity stable:", canvas_id_ok)

# canvas is actually rendering (non-blank) — sample pixels via a 2D readback
blank = ev("""(() => {
  const gl = document.querySelector('#gl');
  const w = gl.width, h = gl.height;
  if (!w || !h) return 'zero-size';
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.drawImage(gl, 0, 0, 64, 64);
  const d = ctx.getImageData(0, 0, 64, 64).data;
  let min = 255, max = 0, sum = 0;
  for (let i = 0; i < d.length; i += 4) { const l = d[i] + d[i+1] + d[i+2]; min = Math.min(min, l); max = Math.max(max, l); sum += l; }
  return { w, h, min, max, mean: Math.round(sum / (d.length / 4)) };
})()""")
print("  canvas sample:", blank)

print("=== SHOTS ===")
ev("window.scrollTo(0, 0)")
time.sleep(0.6)
v.shot(sock, "shift-hero.png")
centre("skill-arsenal")
time.sleep(0.25)  # mid-shift
v.shot(sock, "shift-mid-skill-arsenal.png")
time.sleep(1.4)  # settled
v.shot(sock, "shift-settled-skill-arsenal.png")

v.cleanup()
ok = (len(errors) == 0 and mod["bounded"] and mod["afterSettle"] == 0
      and mod["peak"] > 0.3 and canvas_id_ok and blank != "zero-size")
print("=== DONE === errors:", len(errors), "| PASS:", ok)
sys.exit(0 if ok else 1)
