"""Focused probe for js/ui/story-rail.js — the transition overlay is REMOVED,
only the story rail remains.

The full-screen "space-shift" transition overlay (host #chapter-wipe, class
.space-shift) was removed: section-to-section motion is now the 3D camera
space-shift in js/scene.js, with no overlay painted over the page. What is left
for this probe is the narrative microcopy layer.

Reuses lab/verify.py's CDP helpers. Verifies:
  T1 boot: NO transition overlay (#chapter-wipe absent, .space-shift absent);
          rail exists; act/beat elements exist; rail seeded from data-section;
          all 6 mood beats have an ACT tag stamped
  T2 section change: a portfolio:sectionchange event updates the rail act+beat
          (hall-of-fame -> PROVE)
  T3 open-channel settles the rail on CONTINUE
  T4 rapid changes: never stuck, rail settles on the FINAL section
  T5 reduced motion: rail still updates (state, no motion)
  T6 zero console errors

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


def fire(sock, sid, index):
    """Publish the single source-of-truth section-change event by hand."""
    ev(sock, "window.dispatchEvent(new CustomEvent('portfolio:sectionchange', "
             f"{{detail:{{id:'{sid}', index:{index}}}}}))")


def act(sock):
    return ev(sock, "document.querySelector('.story-rail__act')?.textContent")


def beat(sock):
    return ev(sock, "document.querySelector('.story-rail__beat')?.textContent")


def main():
    sock = launch()
    ts = str(int(time.time()))
    desktop(sock)

    # ---- T1: boot state (overlay gone, rail seeded) ----
    print("=== T1: boot (transition overlay removed; rail seeded) ===")
    nav(sock, f"{URL}?t1={ts}")
    check("T1 #chapter-wipe is absent",
          ev(sock, "document.getElementById('chapter-wipe') === null"),
          ev(sock, "!!document.getElementById('chapter-wipe')"))
    check("T1 .space-shift is absent",
          ev(sock, "document.querySelector('.space-shift') === null"),
          ev(sock, "!!document.querySelector('.space-shift')"))
    check("T1 rail exists", ev(sock, "!!document.querySelector('.story-rail')"))
    check("T1 rail act element exists",
          ev(sock, "!!document.querySelector('.story-rail__act')"))
    check("T1 rail beat element exists",
          ev(sock, "!!document.querySelector('.story-rail__beat')"))
    check("T1 rail seeded act from data-section (SIGNAL)",
          act(sock) == "SIGNAL", act(sock))
    check("T1 rail seeded beat non-empty",
          bool(beat(sock)), beat(sock))
    check("T1 all 6 mood sections have data-act stamped",
          ev(sock, "document.querySelectorAll('[data-story-beat][data-act]').length") == 6,
          ev(sock, "document.querySelectorAll('[data-story-beat][data-act]').length"))

    # ---- T2/T3: an event drives the rail ----
    print("=== T2: section change (hall-of-fame) ===")
    fire(sock, "hall-of-fame", 2)
    time.sleep(0.2)
    check("T2 rail act=PROVE", act(sock) == "PROVE", act(sock))
    check("T2 rail beat updated (Signals become evidence.)",
          beat(sock) == "Signals become evidence.", beat(sock))

    print("=== T3: open-channel ===")
    fire(sock, "open-channel", 6)
    time.sleep(0.2)
    check("T3 rail settles on CONTINUE", act(sock) == "CONTINUE", act(sock))

    # ---- T4: rapid changes never stick, settle on the last ----
    print("=== T4: rapid changes ===")
    for sid, idx in (("identity-file", 1), ("skill-arsenal", 3),
                     ("mission-log", 4), ("case-files", 5), ("open-channel", 6)):
        fire(sock, sid, idx)
    time.sleep(0.4)
    check("T4 rail settled on FINAL section (CONTINUE)",
          act(sock) == "CONTINUE", act(sock))
    check("T4 rail not stuck / beat non-empty", bool(beat(sock)), beat(sock))

    # ---- T5: reduced motion still updates the rail (state, no motion) ----
    print("=== T5: reduced motion ===")
    v.send(sock, "Emulation.setEmulatedMedia",
           {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
    nav(sock, f"{URL}?t5={ts}")
    fire(sock, "hall-of-fame", 2)
    time.sleep(0.3)
    check("T5 rail still updates under reduced motion (PROVE)",
          act(sock) == "PROVE", act(sock))
    check("T5 no transition overlay under reduced motion",
          ev(sock, "document.getElementById('chapter-wipe') === null && "
                   "document.querySelector('.space-shift') === null"),
          ev(sock, "!!document.querySelector('.space-shift')"))
    v.send(sock, "Emulation.setEmulatedMedia", {"features": []})

    # ---- T6: console clean ----
    print("=== T6: console ===")
    msgs = v.drain(sock, 0.6)
    errs = [m for m in msgs if "error" in str(m).lower()]
    check("T6 no console errors", len(errs) == 0, errs[:3])

    print(f"\n=== PROBE RESULT: {len(FAILS)} failure(s) ===")
    for f in FAILS:
        print("  FAILED:", f)
    v.cleanup()
    sys.exit(1 if FAILS else 0)


if __name__ == "__main__":
    main()
