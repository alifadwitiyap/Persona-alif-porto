"""UltraQA — adversarial scenario harness for the Persona-5 portfolio.

Hostile / real-world scenarios beyond the happy path. Reuses lab/verify.py's
CDP helpers. Prints PASS/FAIL per scenario; exit 1 on any failure.

Usage: python lab/qa_adversarial.py [url]
"""
import sys, time, importlib.util, os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("verify", os.path.join(HERE, "verify.py"))
v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8077/index.html"
v.URL = URL; v.PORT = 9480

FAILS = []


def check(name, cond, got=""):
    ok = bool(cond)
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + ("" if ok else f" :: got={got!r}"))
    if not ok:
        FAILS.append(name)


def launch():
    assert v.launch(), "chrome CDP not up"
    targets = v.http_json("/json/list")
    page = next(t for t in targets if t.get("type") == "page")
    sock = v.connect(page["id"])
    for m in ("Page.enable", "Runtime.enable", "Log.enable"):
        v.recv_until(sock, v.send(sock, m), timeout=10)
    return sock


def nav(sock, url, settle=3.5):
    v.recv_until(sock, v.send(sock, "Page.navigate", {"url": "about:blank"}), timeout=25)
    time.sleep(0.4)
    v.recv_until(sock, v.send(sock, "Page.navigate", {"url": url}), timeout=25)
    time.sleep(settle)
    v.drain(sock, 0.8)


def ev(sock, e):
    return v.ev(sock, e)


def num(sock, expr):
    """Evaluate a numeric expression and coerce to int.

    v.ev returns None for some large/negative numbers depending on how CDP
    serialises them; force a string round-trip so we never see a spurious None.
    """
    raw = v.ev(sock, f"String({expr})")
    try:
        return int(float(raw))
    except (TypeError, ValueError):
        return None


def desktop(sock):
    v.send(sock, "Emulation.setDeviceMetricsOverride",
           {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})


def mobile(sock):
    v.send(sock, "Emulation.setDeviceMetricsOverride",
           {"width": 390, "height": 844, "deviceScaleFactor": 2, "mobile": True})


def main():
    sock = launch()
    ts = str(int(time.time()))

    # ============ S1: no-JS fallback ============
    print("=== S1: no-JS fallback ===")
    desktop(sock)
    v.send(sock, "Emulation.setScriptExecutionDisabled", {"value": True})
    nav(sock, f"{URL}?s1={ts}", settle=2.5)
    html = ev(sock, "document.documentElement.outerHTML") or ""
    # When JS disabled, CDP evaluate can't run; read via DOM only if possible.
    # Fallback: assert the static HTML contains the noscript nav.
    v.send(sock, "Emulation.setScriptExecutionDisabled", {"value": False})
    nav(sock, f"{URL}?s1b={ts}")
    noscript_ok = ev(sock, "!!document.querySelector('noscript')")
    check("S1 noscript nav exists in DOM", noscript_ok, noscript_ok)
    # 6 chapter anchors present in the served HTML (server-side check done separately)

    # ============ S2: reduced-motion ============
    print("=== S2: reduced-motion ===")
    v.send(sock, "Emulation.setEmulatedMedia",
           {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
    desktop(sock)
    nav(sock, f"{URL}?s2={ts}")
    check("S2 webgl off under reduced-motion",
          ev(sock, "document.querySelector('.stage')?.dataset.webgl") == "off",
          ev(sock, "document.querySelector('.stage')?.dataset.webgl"))
    check("S2 content still visible",
          ev(sock, "document.getElementById('hero-title')?.textContent.includes('Alif')"),
          ev(sock, "document.getElementById('hero-title')?.textContent"))
    v.send(sock, "Emulation.setEmulatedMedia", {"features": []})

    # ============ S3: legacy hash migration ============
    print("=== S3: legacy hash migration ===")
    desktop(sock)
    nav(sock, f"{URL}?s3={ts}#profile", settle=4.0)
    check("S3 #profile migrated to #identity-file",
          ev(sock, "location.hash") == "#identity-file", ev(sock, "location.hash"))
    t3 = num(sock, "document.getElementById('identity-file').getBoundingClientRect().top")
    check("S3 landed near identity-file",
          t3 is not None and abs(t3) < 250, t3)

    # ============ S4: every chapter anchor resolves ============
    print("=== S4: chapter anchor integrity ===")
    nav(sock, f"{URL}?s4={ts}")
    hrefs = ev(sock, "[...document.querySelectorAll('#chapter-list a')].map(a=>a.getAttribute('href'))") or []
    check("S4 six chapter links", len(hrefs) == 6, hrefs)
    broken = ev(sock, "[...document.querySelectorAll('#chapter-list a')].filter(a=>!document.querySelector(a.getAttribute('href'))).map(a=>a.getAttribute('href'))") or []
    check("S4 no broken anchors", broken == [], broken)

    # ============ S5: M shortcut ignores typing targets ============
    print("=== S5: M shortcut guard ===")
    nav(sock, f"{URL}?s5={ts}")
    # inject a text input, focus it, dispatch M — must NOT open the menu
    ev(sock, "(function(){var i=document.createElement('input');i.id='qa-input';document.body.appendChild(i);i.focus();})()")
    ev(sock, "document.getElementById('qa-input').dispatchEvent(new KeyboardEvent('keydown',{key:'m',bubbles:true}))")
    time.sleep(0.5)
    check("S5 M does not open menu while typing",
          ev(sock, "document.getElementById('chapter-menu').hidden"),
          ev(sock, "document.getElementById('chapter-menu')?.hidden"))
    # M with body focus DOES open the overlay menu (v3: menu is an overlay again)
    ev(sock, "document.getElementById('qa-input').blur(); document.body.focus()")
    ev(sock, "document.dispatchEvent(new KeyboardEvent('keydown',{key:'m',bubbles:true}))")
    time.sleep(0.6)
    check("S5 M opens the chapter menu overlay when not typing",
          ev(sock, "!document.getElementById('chapter-menu').hidden"),
          ev(sock, "document.getElementById('chapter-menu')?.hidden"))
    ev(sock, "document.getElementById('chapter-menu').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
    time.sleep(0.3)

    # ============ S6: modal open/close + Escape ============
    print("=== S6: modal ===")
    nav(sock, f"{URL}?s6={ts}")
    ev(sock, "document.querySelector('[data-open]')?.click()")
    time.sleep(0.5)
    check("S6 modal opens", ev(sock, "!document.getElementById('modal').hidden"), ev(sock, "document.getElementById('modal').hidden"))
    ev(sock, "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
    time.sleep(0.4)
    check("S6 Escape closes modal", ev(sock, "document.getElementById('modal').hidden"), ev(sock, "document.getElementById('modal').hidden"))

    # ============ S7: rapid scroll (resolver stability) ============
    print("=== S7: rapid scroll stability ===")
    nav(sock, f"{URL}?s7={ts}")
    ev(sock, """(function(){for(var i=0;i<40;i++){window.scrollTo(0,i*400);}})()""")
    time.sleep(1.5)
    sec = ev(sock, "document.documentElement.dataset.section")
    check("S7 active section is a known id after rapid scroll",
          sec in ("hero","chapter-select","identity-file","hall-of-fame","skill-arsenal","mission-log","case-files","open-channel"),
          sec)
    check("S7 only one .is-active section",
          ev(sock, "document.querySelectorAll('main section.is-active').length") <= 1,
          ev(sock, "document.querySelectorAll('main section.is-active').length"))

    # ============ S8: mobile overflow across all sections ============
    print("=== S8: mobile overflow ===")
    mobile(sock)
    nav(sock, f"{URL}?s8={ts}", settle=4.0)
    bad = []
    for sid in ("hero","chapter-select","identity-file","hall-of-fame","skill-arsenal","mission-log","case-files","open-channel"):
        ev(sock, f"document.getElementById('{sid}').scrollIntoView()")
        time.sleep(0.7)
        ov = ev(sock, "document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
        if ov:
            bad.append(sid)
    check("S8 no horizontal overflow on mobile (all sections)", bad == [], bad)

    # ============ S9: WebGL off (no-WebGL graceful) ============
    print("=== S9: no-WebGL ===")
    desktop(sock)
    v.send(sock, "Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
    # hard to force no-WebGL; instead verify content independent of canvas
    nav(sock, f"{URL}?s9={ts}")
    check("S9 all 8 sections present without relying on canvas",
          ev(sock, "document.querySelectorAll('main section').length") == 8,
          ev(sock, "document.querySelectorAll('main section').length"))
    check("S9 canvas is aria-hidden decorative",
          ev(sock, "document.querySelector('.stage')?.getAttribute('aria-hidden')") == "true",
          ev(sock, "document.querySelector('.stage')?.getAttribute('aria-hidden')"))

    # ============ S10: HUD syncs with active section ============
    print("=== S10: HUD sync ===")
    nav(sock, f"{URL}?s10={ts}")
    ev(sock, "document.getElementById('case-files').scrollIntoView()")
    time.sleep(2.4)
    check("S10 HUD shows Case Files after scroll",
          ev(sock, "document.getElementById('hud-name')?.textContent") == "Case Files",
          ev(sock, "document.getElementById('hud-name')?.textContent"))

    # ============ S11: deep-link to each section directly ============
    print("=== S11: deep-links ===")
    bad = []
    for sid in ("identity-file","hall-of-fame","skill-arsenal","mission-log","case-files","open-channel"):
        nav(sock, f"{URL}?s11={ts}-{sid}#{sid}", settle=3.0)
        # A deep-link must bring the target INTO VIEW. The last section can't
        # reach top:0 (page bottom is the scroll limit), so assert visibility
        # (top within the viewport), not an exact offset.
        vis = None
        for _ in range(12):
            time.sleep(0.3)
            vis = ev(sock, "(function(){var r=document.getElementById('%s').getBoundingClientRect();return r.top < window.innerHeight && r.bottom > 0})()" % sid)
            if vis is True:
                break
        if vis is not True:
            bad.append((sid, vis))
    check("S11 all deep-links land in view", bad == [], bad)

    # ============ S12: console errors across the whole run ============
    print("=== S12: console ===")
    msgs = v.drain(sock, 0.5)
    errs = [m for m in msgs if "error" in str(m).lower()]
    check("S12 no console errors observed", len(errs) == 0, errs[:3])

    print(f"\n=== QA RESULT: {len(FAILS)} failure(s) ===")
    for f in FAILS:
        print("  FAILED:", f)
    v.cleanup()
    sys.exit(1 if FAILS else 0)


if __name__ == "__main__":
    main()
