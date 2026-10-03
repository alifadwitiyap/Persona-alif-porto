"""Ad-hoc computed-style check for the six v3 overlay surfaces.

Reuses lab/verify.py's CDP helpers. Forces each overlay's JS-driven state
manually (main.js's module graph is mid-flight, so runtime wiring is not
assumed) and asserts the CSS actually lands.

Usage: python lab/check_overlays_css.py [url]
"""
import sys, time, importlib.util, os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("verify", os.path.join(HERE, "verify.py"))
v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8077/index.html"
v.URL = URL; v.PORT = 9481

FAILS = []
def check(name, cond, got=""):
    ok = bool(cond)
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + ("" if ok else f" :: got={got!r}"))
    if not ok: FAILS.append(name)

def ev(sock, e): return v.ev(sock, e)

def main():
    assert v.launch(), "chrome CDP not up"
    page = next(t for t in v.http_json("/json/list") if t.get("type") == "page")
    sock = v.connect(page["id"])
    for m in ("Page.enable", "Runtime.enable", "Log.enable"):
        v.recv_until(sock, v.send(sock, m), timeout=10)
    v.send(sock, "Emulation.setDeviceMetricsOverride",
           {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
    v.recv_until(sock, v.send(sock, "Page.navigate", {"url": URL}), timeout=25)
    time.sleep(2.5); v.drain(sock, 0.5)

    # stylesheet actually loaded
    check("overlays.css linked",
          ev(sock, "[...document.styleSheets].some(s=>(s.href||'').includes('overlays.css'))"),
          ev(sock, "[...document.styleSheets].map(s=>s.href)"))

    # 1. progress bar
    check("progress track has a background",
          ev(sock, "getComputedStyle(document.querySelector('.chapter-progress__track')).backgroundColor") != "rgba(0, 0, 0, 0)",
          ev(sock, "getComputedStyle(document.querySelector('.chapter-progress__track')).backgroundColor"))
    check("progress fill uses scaleX transform",
          "matrix" in (ev(sock, "getComputedStyle(document.querySelector('.chapter-progress__fill')).transform") or ""),
          ev(sock, "getComputedStyle(document.querySelector('.chapter-progress__fill')).transform"))
    check("progress ticks rendered by JS OR container present",
          ev(sock, "!!document.getElementById('chapter-progress-ticks')"),
          ev(sock, "!!document.getElementById('chapter-progress-ticks')"))

    # 2. chapter menu overlay (force open)
    ev(sock, "document.getElementById('chapter-menu').removeAttribute('hidden')")
    time.sleep(0.4)
    check("menu overlay visible when [hidden] removed",
          ev(sock, "getComputedStyle(document.getElementById('chapter-menu')).display") == "grid",
          ev(sock, "getComputedStyle(document.getElementById('chapter-menu')).display"))
    check("menu panel has a border",
          ev(sock, "getComputedStyle(document.querySelector('.chapter-menu__panel')).borderTopWidth") not in ("0px", ""),
          ev(sock, "getComputedStyle(document.querySelector('.chapter-menu__panel')).borderTopWidth"))
    check("menu scrim present",
          ev(sock, "!!document.querySelector('.chapter-menu__scrim')"), True)

    # 3. cut-paper wipe
    ev(sock, "document.getElementById('chapter-wipe').classList.add('is-running')")
    time.sleep(0.1)
    check("wipe visible while running",
          ev(sock, "getComputedStyle(document.getElementById('chapter-wipe')).visibility") == "visible",
          ev(sock, "getComputedStyle(document.getElementById('chapter-wipe')).visibility"))
    check("wipe is pointer-events:none",
          ev(sock, "getComputedStyle(document.getElementById('chapter-wipe')).pointerEvents") == "none",
          ev(sock, "getComputedStyle(document.getElementById('chapter-wipe')).pointerEvents"))

    # 4. intro screen. intro.js removes the node once seen this session, so
    # re-inject the markup if it is already gone before probing the CSS.
    ev(sock, """(function(){
      if (document.getElementById('intro')) return;
      var d = document.createElement('div');
      d.className='intro'; d.id='intro';
      d.innerHTML = '<div class="intro__inner"><div class="intro__bar"><span class="intro__bar-fill" id="intro-fill"></span></div></div>';
      document.body.appendChild(d);
    })()""")
    ev(sock, "document.getElementById('intro').removeAttribute('hidden')")
    time.sleep(0.2)
    check("intro visible when [hidden] removed",
          ev(sock, "getComputedStyle(document.getElementById('intro')).display") == "grid",
          ev(sock, "getComputedStyle(document.getElementById('intro')).display"))
    check("intro fill has NO transform transition (per-frame JS driven)",
          "transform" not in (ev(sock, "getComputedStyle(document.getElementById('intro-fill')).transitionProperty") or ""),
          ev(sock, "getComputedStyle(document.getElementById('intro-fill')).transitionProperty"))
    ev(sock, "document.getElementById('intro').setAttribute('hidden','')")

    # 5. all-out close (force show)
    ev(sock, "document.getElementById('allout').removeAttribute('hidden')")
    time.sleep(0.2)
    check("allout visible when [hidden] removed",
          ev(sock, "getComputedStyle(document.getElementById('allout')).display") != "none",
          ev(sock, "getComputedStyle(document.getElementById('allout')).display"))
    check("allout has accent border",
          ev(sock, "getComputedStyle(document.getElementById('allout')).borderTopWidth") not in ("0px", ""),
          ev(sock, "getComputedStyle(document.getElementById('allout')).borderTopWidth"))

    # 6. story beats
    check("story beat styled with a left border",
          ev(sock, "getComputedStyle(document.querySelector('.section__story')).borderLeftWidth") not in ("0px", ""),
          ev(sock, "getComputedStyle(document.querySelector('.section__story')).borderLeftWidth"))

    # no console errors introduced by CSS (JS lane may still 404)
    msgs = v.drain(sock, 0.5)
    css_errs = [m for m in msgs if "overlays.css" in str(m)]
    check("no errors mentioning overlays.css", css_errs == [], css_errs[:3])

    print(f"\n=== RESULT: {len(FAILS)} failure(s) ===")
    for f in FAILS: print("  FAILED:", f)
    v.cleanup()
    sys.exit(1 if FAILS else 0)

if __name__ == "__main__":
    main()
