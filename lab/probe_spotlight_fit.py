"""Regression probe: the featured spotlight title must never be clipped.

BUG (2026-10-06): .spotlight h3 was set to --step-4 (up to 108.8px) while the
title "NDETCStemmer" is a single long word in a narrow grid column. With no wrap
rule the word overflowed its box and the card's clip-path sliced it ("NDETCSTEM").

Asserts, at several widths, that the rendered title is NOT horizontally clipped:
  scrollWidth <= clientWidth + 1  AND  the text right edge stays inside the card.

Exit 0 = title fits everywhere. Exit 1 = clipped (bug present).

Usage: python lab/probe_spotlight_fit.py [url]
"""
import sys, time, importlib.util, os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("verify", os.path.join(HERE, "verify.py"))
v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8077/index.html"
v.URL = URL; v.PORT = 9521
FAILS = []


def check(name, cond, got=""):
    ok = bool(cond)
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + ("" if ok else f" :: got={got!r}"))
    if not ok:
        FAILS.append(name)


def main():
    assert v.launch(), "chrome CDP not up"
    page = next(t for t in v.http_json("/json/list") if t.get("type") == "page")
    sock = v.connect(page["id"])
    for m in ("Page.enable", "Runtime.enable", "Network.enable"):
        v.recv_until(sock, v.send(sock, m), timeout=10)
    v.send(sock, "Network.setCacheDisabled", {"cacheDisabled": True})

    for w in (1440, 1024, 768, 390, 360):
        v.send(sock, "Emulation.setDeviceMetricsOverride",
               {"width": w, "height": 900, "deviceScaleFactor": 1, "mobile": w < 700})
        v.send(sock, "Page.navigate", {"url": URL})
        time.sleep(2.5); v.drain(sock, 0.4)
        raw = v.ev(sock, """(() => {
          const h = document.querySelector('.spotlight h3');
          const card = document.querySelector('.spotlight');
          if (!h || !card) return 'MISSING';
          const r = h.getBoundingClientRect(), cr = card.getBoundingClientRect();
          return JSON.stringify({
            text: h.textContent.trim(),
            scrollW: h.scrollWidth, clientW: h.clientWidth,
            h3_right: Math.round(r.right), card_right: Math.round(cr.right),
            page_ox: document.documentElement.scrollWidth - document.documentElement.clientWidth
          });
        })()""")
        if raw == "MISSING":
            check(f"{w}px spotlight title present", False, raw)
            continue
        import json
        d = json.loads(raw)
        print(f"--- {w}px :: {d['text']} scrollW={d['scrollW']} clientW={d['clientW']} "
              f"h3_right={d['h3_right']} card_right={d['card_right']}")
        check(f"{w}px title not clipped (scrollW<=clientW+1)",
              d["scrollW"] <= d["clientW"] + 1,
              f"scrollW={d['scrollW']} clientW={d['clientW']}")
        check(f"{w}px title inside card (h3_right<=card_right+1)",
              d["h3_right"] <= d["card_right"] + 1,
              f"h3_right={d['h3_right']} card_right={d['card_right']}")
        check(f"{w}px no page overflow-x", d["page_ox"] <= 0, d["page_ox"])

    print(f"\n=== RESULT: {len(FAILS)} failure(s) ===")
    for f in FAILS:
        print("  FAILED:", f)
    v.cleanup()
    sys.exit(1 if FAILS else 0)


if __name__ == "__main__":
    main()
