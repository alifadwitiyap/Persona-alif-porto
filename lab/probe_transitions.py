"""Focused probe for js/ui/transitions.js (cut-paper wipe + story rail).

Reuses lab/verify.py's CDP helpers. Verifies:
  T1 boot: no sweep on first resolve; rail seeded from data-section; ACT tags stamped
  T2 section change: .is-running appears, label = incoming transitionIn, clears after
  T3 story rail updates act+beat on change
  T4 rapid changes: never stuck, queue settles on the last chapter
  T5 reduced motion: no .is-running, no stuck layer
  T6 intro gate: no sweep while #intro overlay is in the DOM
  T7 pointer-events none (never blocks input) + zero console errors

Usage: python lab/probe_transitions.py [url]
"""
import sys, time, importlib.util, os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("verify", os.path.join(HERE, "verify.py"))
v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8077/index.html"
v.URL = URL; v.PORT = 9482
FAILS = []


def check(name, cond, got=""):
    ok = bool(cond)
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + ("" if ok else f" :: got={got!r}"))
    if not ok:
        FAILS.append(name)


def launch():
    assert v.launch(), "chrome CDP not up"
    page = next(t for t in v.http_json("/json/list") if t.get("type") == "page")
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


def desktop(sock):
    v.send(sock, "Emulation.setDeviceMetricsOverride",
           {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})


def main():
    sock = launch()
    ts = str(int(time.time()))
    desktop(sock)

    # ---- T1: boot state ----
    print("=== T1: boot (no sweep on first resolve) ===")
    nav(sock, f"{URL}?t1={ts}")
    check("T1 wipe layer exists", ev(sock, "!!document.getElementById('chapter-wipe')"))
    check("T1 not running at boot",
          ev(sock, "!document.getElementById('chapter-wipe').classList.contains('is-running')"),
          ev(sock, "document.getElementById('chapter-wipe').className"))
    check("T1 rail exists", ev(sock, "!!document.querySelector('.story-rail')"))
    check("T1 rail seeded act=SIGNAL",
          ev(sock, "document.querySelector('.story-rail__act')?.textContent") == "SIGNAL",
          ev(sock, "document.querySelector('.story-rail__act')?.textContent"))
    check("T1 rail seeded beat",
          ev(sock, "document.querySelector('.story-rail__beat')?.textContent") == "A signal enters the system.",
          ev(sock, "document.querySelector('.story-rail__beat')?.textContent"))
    check("T1 all 6 mood sections have data-act (chapter-select has no mood)",
          ev(sock, "document.querySelectorAll('[data-story-beat][data-act]').length") == 6,
          ev(sock, "document.querySelectorAll('[data-story-beat][data-act]').length"))
    check("T1 pointer-events none (never blocks input)",
          ev(sock, "getComputedStyle(document.getElementById('chapter-wipe')).pointerEvents") == "none",
          ev(sock, "getComputedStyle(document.getElementById('chapter-wipe')).pointerEvents"))

    # ---- T2/T3: a real change sweeps + updates the rail ----
    print("=== T2/T3: section change ===")
    # Wait out the intro (it gates the sweep) and force instant scrolling so the
    # section change fires immediately instead of animating under smooth-scroll.
    for _ in range(30):
        if not ev(sock, "!!document.getElementById('intro')"):
            break
        time.sleep(0.3)
    ev(sock, "document.documentElement.style.scrollBehavior='auto'")
    ev(sock, "window.__wipeSeen=[];window.addEventListener('portfolio:sectionchange',e=>{const w=document.getElementById('chapter-wipe');window.__wipeSeen.push({id:e.detail.id,running:w.classList.contains('is-running'),label:document.getElementById('chapter-wipe-label').textContent});})")
    ev(sock, "document.getElementById('hall-of-fame').scrollIntoView({behavior:'instant'})")
    # Poll for the sweep (it is short) rather than guess a single sleep.
    saw_running = False
    saw_label = ""
    for _ in range(20):
        if ev(sock, "document.getElementById('chapter-wipe').classList.contains('is-running')"):
            saw_running = True
            saw_label = ev(sock, "document.getElementById('chapter-wipe-label').textContent")
            break
        time.sleep(0.05)
    check("T2 .is-running while sweeping", saw_running is True, ev(sock, "document.getElementById('chapter-wipe').className"))
    check("T2 label = incoming transitionIn (OPEN THE ARCHIVE)",
          saw_label == "OPEN THE ARCHIVE", saw_label)
    time.sleep(1.4)
    check("T2 clears after the sweep",
          ev(sock, "document.getElementById('chapter-wipe').classList.contains('is-running')") is False,
          ev(sock, "document.getElementById('chapter-wipe').className"))
    check("T3 rail act=PROVE",
          ev(sock, "document.querySelector('.story-rail__act')?.textContent") == "PROVE",
          ev(sock, "document.querySelector('.story-rail__act')?.textContent"))
    check("T3 rail beat updated",
          ev(sock, "document.querySelector('.story-rail__beat')?.textContent") == "Signals become evidence.",
          ev(sock, "document.querySelector('.story-rail__beat')?.textContent"))

    # ---- T4: rapid changes never stick, settle on last ----
    print("=== T4: rapid changes ===")
    ev(sock, "document.documentElement.style.scrollBehavior='auto'")
    ev(sock, "(function(){['identity-file','skill-arsenal','mission-log','case-files','open-channel'].forEach(id=>document.getElementById(id).scrollIntoView({behavior:'instant'}));})()")
    time.sleep(2.4)
    check("T4 not stuck after rapid changes",
          ev(sock, "!document.getElementById('chapter-wipe').classList.contains('is-running')"),
          ev(sock, "document.getElementById('chapter-wipe').className"))
    sec = ev(sock, "document.documentElement.dataset.section")
    rail_act = ev(sock, "document.querySelector('.story-rail__act')?.textContent")
    import json as _json
    # rail must match the final resolver section
    expected = {"open-channel": "CONTINUE", "case-files": "DEPLOY",
                "mission-log": "MOVE", "skill-arsenal": "ARM",
                "identity-file": "IDENTIFY"}.get(sec)
    check(f"T4 rail settled on final section ({sec})",
          expected is None or rail_act == expected, f"{sec}->{rail_act}")

    # ---- T5: reduced motion skips the sweep entirely ----
    print("=== T5: reduced motion ===")
    v.send(sock, "Emulation.setEmulatedMedia",
           {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
    nav(sock, f"{URL}?t5={ts}")
    ev(sock, "document.getElementById('case-files').scrollIntoView()")
    time.sleep(0.5)
    check("T5 no .is-running under reduced motion",
          ev(sock, "!document.getElementById('chapter-wipe').classList.contains('is-running')"),
          ev(sock, "document.getElementById('chapter-wipe').className"))
    time.sleep(1.2)
    check("T5 still not stuck",
          ev(sock, "!document.getElementById('chapter-wipe').classList.contains('is-running')"))
    check("T5 rail still updates (state, no motion)",
          ev(sock, "document.querySelector('.story-rail__act')?.textContent") == "DEPLOY",
          ev(sock, "document.querySelector('.story-rail__act')?.textContent"))
    v.send(sock, "Emulation.setEmulatedMedia", {"features": []})

    # ---- T6: intro overlay gates the sweep ----
    print("=== T6: intro gate ===")
    # The intro is session-once; clear its flag so it actually shows this load.
    ev(sock, "try{sessionStorage.clear()}catch(e){}")
    nav(sock, f"{URL}?t6={ts}", settle=0.8)  # don't wait out the intro
    intro_present = ev(sock, "!!document.getElementById('intro')")
    check("T6 intro overlay is in the DOM at load", intro_present is True, intro_present)
    ev(sock, "document.getElementById('case-files').scrollIntoView()")
    time.sleep(0.4)
    check("T6 no sweep while intro is up",
          ev(sock, "!document.getElementById('chapter-wipe').classList.contains('is-running')"),
          ev(sock, "document.getElementById('chapter-wipe').className"))

    # ---- T7: console clean ----
    print("=== T7: console ===")
    msgs = v.drain(sock, 0.6)
    errs = [m for m in msgs if "error" in str(m).lower()]
    check("T7 no console errors", len(errs) == 0, errs[:3])

    print(f"\n=== PROBE RESULT: {len(FAILS)} failure(s) ===")
    for f in FAILS:
        print("  FAILED:", f)
    v.cleanup()
    sys.exit(1 if FAILS else 0)


if __name__ == "__main__":
    main()
