"""Fan-in probe for the v3 features: overlay menu, progress bar, intro, wipe,
all-out close. Reuses lab/verify.py CDP helpers.

Usage: python lab/probe_v3.py [url]
"""
import sys, time, importlib.util, os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("verify", os.path.join(HERE, "verify.py"))
v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8077/index.html"
v.URL = URL; v.PORT = 9491
FAILS = []


def check(name, cond, got=""):
    ok = bool(cond)
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + ("" if ok else f" :: got={got!r}"))
    if not ok:
        FAILS.append(name)


assert v.launch(), "chrome CDP not up"
targets = v.http_json("/json/list")
page = next(t for t in targets if t.get("type") == "page")
sock = v.connect(page["id"])
for m in ("Page.enable", "Runtime.enable", "Log.enable"):
    v.recv_until(sock, v.send(sock, m), timeout=10)


def nav(u, settle=3.6):
    v.recv_until(sock, v.send(sock, "Page.navigate", {"url": "about:blank"}), timeout=25)
    time.sleep(0.4)
    v.recv_until(sock, v.send(sock, "Page.navigate", {"url": u}), timeout=25)
    time.sleep(settle); v.drain(sock, 0.8)


def ev(e):
    return v.ev(sock, e)


def num(expr):
    raw = v.ev(sock, f"String({expr})")
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


v.send(sock, "Emulation.setDeviceMetricsOverride",
       {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
ts = str(int(time.time()))

# ============ INTRO ============
print("=== INTRO ===")
nav(f"{URL}?p1={ts}", settle=1.2)
intro_present = ev("!!document.getElementById('intro')")
check("intro element exists on first load", intro_present, intro_present)
# wait for auto-completion (maxMs 3200 + margin)
time.sleep(4.0)
done = ev("(function(){var i=document.getElementById('intro');return !i || i.hidden || i.classList.contains('is-done')})()")
check("intro auto-completes within timeout", done, done)
seen = ev("String(sessionStorage.getItem('4life:intro:v1'))")
check("intro sets sessionStorage flag", seen == "1", seen)

# second load should skip fast
nav(f"{URL}?p1b={ts}", settle=1.2)
time.sleep(0.8)
skipped = ev("(function(){var i=document.getElementById('intro');return !i || i.hidden || i.classList.contains('is-done')})()")
check("intro skipped on second load (session flag)", skipped, skipped)

# ============ PROGRESS BAR ============
print("=== PROGRESS BAR ===")
nav(f"{URL}?p2={ts}")
check("progress element present", ev("!!document.getElementById('chapter-progress')"), None)
ticks = ev("document.querySelectorAll('#chapter-progress-ticks .chapter-progress__tick').length")
check("progress has 7 ticks", ticks == 7, ticks)
label0 = ev("document.getElementById('chapter-progress-label')?.textContent")
check("label starts at CHAPTER 00 / 06", label0 == "CHAPTER 00 / 06", label0)
ev("window.scrollTo({top: document.documentElement.scrollHeight, behavior:'auto'})")
# poll until the resolver settles on the last chapter (the page bottom, smooth
# scroll and hysteresis all need a few ticks; a fixed sleep is flaky)
labelN = None
for _ in range(20):
    time.sleep(0.3)
    labelN = ev("document.getElementById('chapter-progress-label')?.textContent")
    if labelN == "CHAPTER 06 / 06":
        break
check("label updates to CHAPTER 06 / 06", labelN == "CHAPTER 06 / 06", labelN)
fill = ev("document.getElementById('chapter-progress-fill').style.transform")
check("progress fill driven by scaleX", fill is not None and "scaleX(1)" in fill, fill)

# ============ OVERLAY MENU ============
print("=== OVERLAY MENU ===")
nav(f"{URL}?p3={ts}")
check("menu hidden initially", ev("document.getElementById('chapter-menu').hidden"), None)
items = ev("document.querySelectorAll('#chapter-menu-list .chapter-menu__link').length")
check("menu renders 6 items", items == 6, items)
ev("document.getElementById('menu-btn').click()")
time.sleep(0.5)
check("menu opens on button click", ev("!document.getElementById('chapter-menu').hidden"), None)
check("aria-expanded true", ev("document.getElementById('menu-btn').getAttribute('aria-expanded')") == "true", None)
check("body locked while menu open", ev("document.body.classList.contains('is-locked')"), None)
# Escape closes
ev("document.getElementById('chapter-menu').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
time.sleep(0.4)
check("Escape closes menu", ev("document.getElementById('chapter-menu').hidden"), None)
# M opens
ev("document.body.focus()")
ev("document.dispatchEvent(new KeyboardEvent('keydown',{key:'m',bubbles:true}))")
time.sleep(0.5)
check("M key opens menu", ev("!document.getElementById('chapter-menu').hidden"), None)
# click an item -> navigates + closes
ev("document.querySelector('#chapter-menu-list [data-goto=\"case-files\"]').click()")
for _ in range(12):
    time.sleep(0.3)
    if ev("document.documentElement.dataset.section") == "case-files":
        break
check("menu item navigates to case-files", ev("document.documentElement.dataset.section") == "case-files",
      ev("document.documentElement.dataset.section"))
check("menu closed after navigation", ev("document.getElementById('chapter-menu').hidden"), None)

# ============ STORY BEATS ============
print("=== STORY BEATS ===")
nav(f"{URL}?p4={ts}")
beats = ev("[...document.querySelectorAll('[data-story-beat]')].map(e=>e.textContent.trim()).filter(Boolean).length")
check("story beats filled (>=7)", beats is not None and beats >= 7, beats)

# ============ ALL-OUT CLOSE ============
print("=== ALL-OUT CLOSE ===")
nav(f"{URL}?p5={ts}")
check("all-out present", ev("!!document.getElementById('allout')"), None)
check("all-out hidden until revealed", ev("document.getElementById('allout').hidden"), None)

# ============ REDUCED MOTION (no wipe) ============
print("=== REDUCED MOTION ===")
v.send(sock, "Emulation.setEmulatedMedia",
       {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
nav(f"{URL}?p6={ts}")
ev("document.getElementById('case-files').scrollIntoView()")
time.sleep(0.4)
playing = ev("document.getElementById('chapter-wipe')?.classList.contains('is-playing')")
check("wipe does NOT play under reduced-motion", playing is False, playing)
v.send(sock, "Emulation.setEmulatedMedia", {"features": []})

# ============ CONSOLE ============
print("=== CONSOLE ===")
msgs = v.drain(sock, 0.5)
errs = [m for m in msgs if "error" in str(m).lower()]
check("no console errors", len(errs) == 0, errs[:3])

print(f"\n=== V3 PROBE: {len(FAILS)} failure(s) ===")
for f in FAILS:
    print("  FAILED:", f)
v.cleanup()
sys.exit(1 if FAILS else 0)
