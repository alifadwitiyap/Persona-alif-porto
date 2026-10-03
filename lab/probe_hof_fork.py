"""Targeted probe: Hall of Fame section + project FORK badge (Task 08 / Task 13).

Reuses lab/verify.py's CDP helpers so it shares the same launch/cleanup path.
Asserts:
  - the #hall-of-fame renderer filled all three slots (academic / awards / pubs);
  - academic shows the cum-laude stamp + GPA 3.90 / 4.00;
  - every publication that has a URL renders as a link to it;
  - fork repos carry a real FORK badge element, non-forks do not;
  - the language label is the language only (no inline "FORK ·" hack);
  - the project modal surfaces fork status too;
  - no uncaught exceptions.

Usage: python lab/probe_hof_fork.py [url]
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import verify as V  # noqa: E402  (import-safe: main() is __main__-guarded)

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8077/index.html"

FAILS = []


def check(name, got, want):
    ok = got == want
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}: {got!r}" + ("" if ok else f" (want {want!r})"))
    if not ok:
        FAILS.append(name)


def main():
    if not V.launch():
        print("FAIL: chrome did not expose CDP")
        return 2

    targets = V.http_json("/json/list")
    page = next((t for t in targets if t.get("type") == "page"), None)
    if not page:
        print("FAIL: no page target")
        return 2
    sock = V.connect(page["id"])

    for m in ("Page.enable", "Runtime.enable", "Log.enable", "Network.enable"):
        V.recv_until(sock, V.send(sock, m), timeout=10)

    # A reused CDP browser keeps module scripts in its HTTP cache; bust it so
    # the probe always tests the bytes currently on disk.
    V.recv_until(sock, V.send(sock, "Network.setCacheDisabled", {"cacheDisabled": True}), timeout=10)

    V.send(sock, "Emulation.setDeviceMetricsOverride",
           {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
    V.recv_until(sock, V.send(sock, "Page.navigate", {"url": URL}), timeout=25)
    time.sleep(4)

    print("=== HALL OF FAME RENDER ===")
    check("section-present", V.ev(sock, "!!document.getElementById('hall-of-fame')"), True)
    check("academic-rendered",
          V.ev(sock, "!!document.querySelector('#hof-academic .hof-academic')"), True)
    check("award-count",
          V.ev(sock, "document.querySelectorAll('#hof-awards .hof-item').length"), 4)
    check("publication-count",
          V.ev(sock, "document.querySelectorAll('#hof-publications .hof-item').length"), 2)
    check("gpa",
          V.ev(sock, "document.querySelector('.hof-academic__gpa b')?.textContent.trim()"), "3.90")
    check("gpa-scale",
          V.ev(sock, "document.querySelector('.hof-academic__gpa small')?.textContent.trim()"), "/ 4.00 GPA")
    check("cum-laude-label",
          V.ev(sock, "document.querySelector('.hof-academic__stamp-label')?.textContent.trim()"),
          "Graduate / Cum Laude")
    check("award-ranks",
          V.ev(sock, "[...document.querySelectorAll('#hof-awards .hof-item__rank')].map(e=>e.textContent.trim())"),
          ["1st Place", "1st Place", "Finalist", "Awardee"])
    check("pub-titles-nonempty",
          V.ev(sock, "[...document.querySelectorAll('#hof-publications .hof-item__title')].every(e=>e.textContent.trim().length>0)"),
          True)
    check("pub-links-have-href",
          V.ev(sock, "[...document.querySelectorAll('#hof-publications a')].every(a=>a.getAttribute('href')&&a.getAttribute('href').length>0)"),
          True)

    print("=== PROJECT FORK BADGE ===")
    check("card-count",
          V.ev(sock, "document.querySelectorAll('#projects-grid .card').length"), 5)
    check("fork-badge-count",
          V.ev(sock, "document.querySelectorAll('#projects-grid .card .card__fork').length"), 2)
    check("fork-badge-on-fork-repos",
          V.ev(sock, "[...document.querySelectorAll('#projects-grid .card')].filter(c=>c.querySelector('.card__fork')).map(c=>c.getAttribute('data-project')).sort()"),
          ["c22-ps168-machine-learning", "online-store-digital-records"])
    check("fork-badge-text",
          V.ev(sock, "document.querySelector('#projects-grid .card .card__fork')?.textContent.trim()"), "FORK")
    check("lang-has-no-fork-prefix",
          V.ev(sock, "[...document.querySelectorAll('#projects-grid .card__lang')].every(e=>!/FORK/i.test(e.textContent))"),
          True)

    print("=== MODAL SURFACES FORK ===")
    V.ev(sock, "document.querySelector('#projects-grid .card .card__fork').closest('.card').querySelector('[data-open]').click()")
    time.sleep(0.6)
    check("modal-open", V.ev(sock, "!document.getElementById('modal').hidden"), True)
    check("modal-fork-tag",
          V.ev(sock, "[...document.querySelectorAll('#modal-body .tag')].some(t=>/FORK/i.test(t.textContent))"), True)
    V.ev(sock, "document.getElementById('modal-close')?.click()")
    time.sleep(0.3)

    print("=== CONSOLE ===")
    events = V.drain(sock, 1.0)
    errs = [e for e in events if e.get("method") == "Runtime.exceptionThrown"]
    check("no-exceptions", len(errs), 0)

    print("=== DONE === FAILS:", FAILS or "none")
    return 1 if FAILS else 0


if __name__ == "__main__":
    try:
        code = main()
    finally:
        V.cleanup()
    sys.exit(code)
