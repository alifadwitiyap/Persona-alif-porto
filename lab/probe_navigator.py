"""Navigator overlay probe — reuses lab/verify.py's CDP helpers."""
import sys, time, importlib.util, os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("verify", os.path.join(HERE, "verify.py"))
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)

URL = "http://127.0.0.1:8079/index.html"
v.URL = URL
PORT = 9413
v.PORT = PORT

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
v.recv_until(sock, v.send(sock, "Page.navigate", {"url": URL + "?probe=" + str(int(time.time()))}), timeout=25)
time.sleep(3.5)
v.drain(sock, 1.0)

def ev(expr):
    return v.ev(sock, expr)

def check(name, expr, want=True):
    got = ev(expr)
    ok = (got == want) if isinstance(want, bool) else (str(want) in str(got))
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}: {got}")
    return ok

results = []
print("=== RENDER ===")
results.append(check("items rendered = 6", "document.querySelectorAll('#navigator-list .navigator__item').length", 6))
results.append(check("labels", "[...document.querySelectorAll('#navigator-list .navigator__label')].map(e=>e.textContent).join('|')",
                     "START|IDENTITY FILE|SKILL ARSENAL|MISSION LOG|CASE FILES|OPEN CHANNEL"))
results.append(check("indices", "[...document.querySelectorAll('#navigator-list .navigator__num')].map(e=>e.textContent).join(',')",
                     "00,01,02,03,04,05"))
results.append(check("overlay hidden initially", "document.getElementById('navigator').hidden", True))
results.append(check("menu-btn aria-expanded=false", "document.getElementById('menu-btn').getAttribute('aria-expanded')", "false"))

print("=== OPEN via MENU button ===")
ev("document.getElementById('menu-btn').click()")
time.sleep(0.4)
results.append(check("overlay open", "document.getElementById('navigator').hidden", False))
results.append(check("body locked", "document.body.classList.contains('is-locked')", True))
results.append(check("aria-expanded=true", "document.getElementById('menu-btn').getAttribute('aria-expanded')", "true"))
results.append(check("focus on active item (hero)", "document.activeElement?.getAttribute('data-goto')", "hero"))
results.append(check("hero item data-active", "document.querySelector('#navigator-list [data-goto=\"hero\"]').getAttribute('data-active')", "true"))
results.append(check("hero aria-current", "document.querySelector('#navigator-list [data-goto=\"hero\"]').getAttribute('aria-current')", "true"))
v.shot(sock, "navigator-desktop.png")
# CSS sanity: overlay is a fixed full-viewport layer, panel is visible
results.append(check("overlay is fixed & full-viewport",
                     "(function(){var s=getComputedStyle(document.getElementById('navigator'));return s.position==='fixed' && s.zIndex==='60';})()",
                     True))
results.append(check("panel visible",
                     "(function(){var p=document.querySelector('.navigator__panel');var r=p.getBoundingClientRect();var s=getComputedStyle(p);return r.width>300 && s.display!=='none' && s.visibility!=='hidden';})()",
                     True))
results.append(check("panel computed bg",
                     "getComputedStyle(document.querySelector('.navigator__panel')).backgroundColor", "rgb(15, 15, 20)"))
results.append(check("no horizontal overflow with menu open",
                     "document.documentElement.scrollWidth > document.documentElement.clientWidth + 1", False))

print("=== ARROW navigation ===")
ev("document.querySelector('#navigator-list [data-goto=\"hero\"]').focus()")
ev("document.getElementById('navigator').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))")
time.sleep(0.2)
results.append(check("ArrowDown -> profile", "document.activeElement?.getAttribute('data-goto')", "profile"))
ev("document.getElementById('navigator').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}))")
time.sleep(0.2)
results.append(check("ArrowUp -> hero", "document.activeElement?.getAttribute('data-goto')", "hero"))
ev("document.getElementById('navigator').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}))")
time.sleep(0.2)
results.append(check("ArrowUp wraps to last (contact)", "document.activeElement?.getAttribute('data-goto')", "contact"))

print("=== ESC close ===")
ev("document.getElementById('navigator').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
time.sleep(0.3)
results.append(check("overlay closed", "document.getElementById('navigator').hidden", True))
results.append(check("body unlocked", "document.body.classList.contains('is-locked')", False))

print("=== OPEN via START + M ===")
ev("document.getElementById('start-btn').focus(); document.getElementById('start-btn').click()")
time.sleep(0.3)
results.append(check("START opens", "document.getElementById('navigator').hidden", False))
ev("document.getElementById('navigator').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
time.sleep(0.3)
results.append(check("focus restored to start-btn", "document.activeElement?.id", "start-btn"))
ev("document.dispatchEvent(new KeyboardEvent('keydown',{key:'m',bubbles:true}))")
time.sleep(0.3)
results.append(check("M opens", "document.getElementById('navigator').hidden", False))

print("=== CLICK item -> goTo ===")
ev("document.querySelector('#navigator-list [data-goto=\"projects\"]').click()")
# wait for the smooth scroll to settle (resolver flips when it crosses the middle)
for _ in range(12):
    time.sleep(0.3)
    if ev("document.documentElement.dataset.section") == "projects" and \
       ev("Math.abs(document.getElementById('projects').getBoundingClientRect().top) < 120"):
        break
results.append(check("overlay closed after go", "document.getElementById('navigator').hidden", True))
results.append(check("hash is #projects", "location.hash", "#projects"))
results.append(check("scrolled to projects", "Math.abs(document.getElementById('projects').getBoundingClientRect().top) < 120", True))
results.append(check("resolver active=projects", "document.documentElement.dataset.section", "projects"))
results.append(check("menu item projects data-active", "document.querySelector('#navigator-list [data-goto=\"projects\"]').getAttribute('data-active')", "true"))

print("=== scrim close ===")
# Let the go() transition settle first (state -> browsing) so open() is not
# guarded out; headless scrollend can be late, the controller's 900ms
# fallback is what returns it to browsing.
for _ in range(10):
    time.sleep(0.25)
    if not ev("document.body.classList.contains('is-locked')"):
        break
time.sleep(1.0)
ev("document.getElementById('menu-btn').click()")
time.sleep(0.4)
results.append(check("menu reopens after go", "document.getElementById('navigator').hidden", False))
ev("document.querySelector('.navigator__scrim').click()")
time.sleep(0.3)
results.append(check("scrim closes", "document.getElementById('navigator').hidden", True))

print("=== scroll mirrors menu (one-way) ===")
ev("window.scrollTo({top: document.getElementById('skills').offsetTop, behavior:'auto'})")
time.sleep(1.0)
results.append(check("resolver active=skills", "document.documentElement.dataset.section", "skills"))
results.append(check("menu item skills data-active", "document.querySelector('#navigator-list [data-goto=\"skills\"]').getAttribute('data-active')", "true"))
results.append(check("no other item active", "document.querySelectorAll('#navigator-list [data-active=\"true\"]').length", 1))

print("=== reduced-motion goTo ===")
v.send(sock, "Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
time.sleep(0.3)
ev("document.getElementById('menu-btn').click()")
time.sleep(0.2)
ev("document.querySelector('#navigator-list [data-goto=\"contact\"]').click()")
time.sleep(0.6)
results.append(check("reduced: active=contact", "document.documentElement.dataset.section", "contact"))

print(f"\n=== {sum(results)}/{len(results)} passed ===")
v.cleanup()
sys.exit(0 if all(results) else 1)
