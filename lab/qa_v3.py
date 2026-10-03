"""UltraQA — adversarial scenarios for the v3 features (menu, progress, intro,
wipe, all-out). Prints PASS/FAIL; exit 1 on any failure.

Usage: python lab/qa_v3.py [url]
"""
import sys, time, importlib.util, os
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("verify", os.path.join(HERE, "verify.py"))
v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)
URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8077/index.html"
v.URL = URL; v.PORT = 9496
FAILS = []


def check(name, cond, got=""):
    ok = bool(cond)
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + ("" if ok else f" :: got={got!r}"))
    if not ok:
        FAILS.append((name, got))


assert v.launch()
targets = v.http_json("/json/list")
page = next(t for t in targets if t.get("type") == "page")
sock = v.connect(page["id"])
for m in ("Page.enable", "Runtime.enable", "Log.enable"):
    v.recv_until(sock, v.send(sock, m), timeout=10)


def nav(u, s=3.6):
    v.recv_until(sock, v.send(sock, "Page.navigate", {"url": "about:blank"}), timeout=25)
    time.sleep(0.4); v.recv_until(sock, v.send(sock, "Page.navigate", {"url": u}), timeout=25)
    time.sleep(s); v.drain(sock, 0.6)


def ev(e): return v.ev(sock, e)


v.send(sock, "Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
ts = str(int(time.time()))

# ---- Q1: All-Out Portfolio must actually be reachable ----
print("=== Q1: all-out reachable ===")
nav(f"{URL}?q1={ts}")
# scroll to the very end of case-files (all projects seen). scroll-behavior is
# smooth, so poll until the scroll settles before asserting.
ev("window.scrollTo({top: document.getElementById('case-files').offsetTop + document.getElementById('case-files').offsetHeight, behavior:'auto'})")
for _ in range(14):
    time.sleep(0.3)
    if ev("!document.getElementById('allout').hidden"):
        break
revealed = ev("!document.getElementById('allout').hidden")
check("all-out reveals after viewing case-files", revealed, ev("document.getElementById('allout').hidden"))

# ---- Q2: wipe plays on a real section change (non-reduced) ----
print("=== Q2: wipe plays ===")
nav(f"{URL}?q2={ts}")
# install an observer to catch the wipe's class change reliably (the sweep
# restarts via a forced reflow, so a fixed sleep can miss it)
ev("""(function(){
  window.__wipeSeen = false;
  var w = document.getElementById('chapter-wipe');
  if(!w) return;
  new MutationObserver(function(){ if(w.classList.contains('is-running')) window.__wipeSeen = true; })
    .observe(w, {attributes:true, attributeFilter:['class']});
})()""")
ev("document.getElementById('menu-btn').click()")
time.sleep(0.4)
ev("document.querySelector('#chapter-menu-list [data-goto=\"hall-of-fame\"]').click()")
time.sleep(1.2)
played = ev("window.__wipeSeen === true")
check("wipe plays during a section change", played, played)

# ---- Q3: menu focus trap keeps focus inside ----
print("=== Q3: menu focus trap ===")
nav(f"{URL}?q3={ts}")
ev("document.getElementById('menu-btn').click()")
time.sleep(0.5)
inside = ev("document.getElementById('chapter-menu').contains(document.activeElement)")
check("focus lands inside the menu", inside, ev("document.activeElement?.tagName"))
# tab from last focusable should wrap to first
ev("(function(){var p=document.getElementById('chapter-menu');var f=[...p.querySelectorAll('button,a[href]')];if(f.length)f[f.length-1].focus();p.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true}));})()")
time.sleep(0.2)
still_inside = ev("document.getElementById('chapter-menu').contains(document.activeElement)")
check("Tab wraps and stays inside menu", still_inside, ev("document.activeElement?.tagName"))

# ---- Q4: story beats match registry ----
print("=== Q4: story beats ===")
nav(f"{URL}?q4={ts}")
b = ev("(function(){var m={};document.querySelectorAll('section[id]').forEach(function(s){var p=s.querySelector('[data-story-beat]');if(p)m[s.id]=p.textContent.trim();});return JSON.stringify(m);})()")
import json as _j
try:
    beats = _j.loads(b)
except Exception:
    beats = {}
check("identity-file beat present", beats.get("identity-file", "") != "", beats.get("identity-file"))
check("case-files beat present", beats.get("case-files", "") != "", beats.get("case-files"))

# ---- Q5: intro does not block interaction after completion ----
print("=== Q5: intro non-blocking ===")
nav(f"{URL}?q5={ts}", 1.0)
time.sleep(4.2)
blocking = ev("(function(){var i=document.getElementById('intro');if(!i)return false;var s=getComputedStyle(i);return s.pointerEvents!=='none' && !i.hidden && s.display!=='none'})()")
check("intro not blocking after timeout", blocking is False, blocking)

# ---- Q6: progress does NOT update on raw scroll mid-section ----
print("=== Q6: progress stable mid-section ===")
nav(f"{URL}?q6={ts}")
ev("document.getElementById('case-files').scrollIntoView()")
time.sleep(2.2)
l1 = ev("document.getElementById('chapter-progress-label').textContent")
ev("window.scrollBy(0, 120)")
time.sleep(0.6)
l2 = ev("document.getElementById('chapter-progress-label').textContent")
check("progress label unchanged on small scroll", l1 == l2, f"{l1} -> {l2}")

# ---- Q7: console clean ----
print("=== Q7: console ===")
msgs = v.drain(sock, 0.5)
errs = [m for m in msgs if "error" in str(m).lower()]
check("no console errors", len(errs) == 0, errs[:2])

print(f"\n=== QA V3: {len(FAILS)} failure(s) ===")
for f in FAILS:
    print("  FAILED:", f)
v.cleanup()
sys.exit(1 if FAILS else 0)
