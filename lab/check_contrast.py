"""check_contrast.py — deterministic WCAG AA contrast gate for the 4 LIFE portfolio.

Reads the design tokens from css/variables.css, resolves var() indirection, and
asserts every text-on-background pair the site actually uses meets WCAG 2.1 AA
(>= 4.5:1 for normal text). Deterministic, offline, no browser.

Exit 0 = all pairs pass. Exit 1 = at least one pair fails (prints the table).

Usage:
    python lab/check_contrast.py            # gate (exit 1 on failure)
    python lab/check_contrast.py --json     # machine-readable
"""
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
VARS = REPO / "css" / "variables.css"

# (fg token, bg token, minimum ratio, human note)
# Pairs below are the ones the stylesheet actually composes. Large display text
# (>= 24px bold) only needs 3:1, but we hold the accent to 4.5 everywhere so the
# same token stays safe on small labels/kickers too.
PAIRS = [
    ("--accent", "--ink",   4.5, "accent text on base ink (kickers, labels, links)"),
    ("--accent", "--ink-2", 4.5, "accent text on card surface (--ink-card sits on ink-2)"),
    ("--accent", "--ink-3", 4.5, "accent text on raised panel"),
    ("--ink",    "--accent", 4.5, "ink text on accent fill (.btn--primary, .modal__close:hover)"),
    ("--paper",  "--ink",   4.5, "body text on base ink"),
    ("--paper-dim", "--ink", 4.5, "secondary body text on base ink"),
    ("--muted",  "--ink",   4.5, "muted text on base ink"),
    ("--amber",  "--ink",   4.5, "focus ring / amber text on base ink"),
]

TOKEN_RE = re.compile(r"(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);")
VAR_RE = re.compile(r"var\(\s*(--[a-zA-Z0-9-]+)\s*\)")


def load_tokens(path: Path) -> dict:
    """Parse :root custom properties; keep only colour-ish values."""
    text = path.read_text(encoding="utf-8")
    # Only the first :root block holds the base palette.
    m = re.search(r":root\s*\{(.*?)\}", text, re.S)
    block = m.group(1) if m else text
    out = {}
    for name, val in TOKEN_RE.findall(block):
        out[name] = val.strip()
    return out


def resolve(name: str, tokens: dict, _depth: int = 0) -> str:
    """Resolve var() indirection down to a literal colour."""
    if _depth > 10:
        raise ValueError(f"var() cycle resolving {name}")
    val = tokens.get(name, "")
    mv = VAR_RE.search(val)
    if mv:
        return resolve(mv.group(1), tokens, _depth + 1)
    return val


def parse_color(css: str):
    css = css.strip().lower()
    m = re.fullmatch(r"#([0-9a-f]{6})", css)
    if m:
        h = m.group(1)
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    m = re.fullmatch(r"#([0-9a-f]{3})", css)
    if m:
        h = m.group(1)
        return tuple(int(c * 2, 16) for c in h)
    raise ValueError(f"unsupported colour literal: {css!r}")


def rel_lum(rgb) -> float:
    def ch(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(fg, bg) -> float:
    lf, lb = rel_lum(fg), rel_lum(bg)
    hi, lo = max(lf, lb), min(lf, lb)
    return (hi + 0.05) / (lo + 0.05)


def main() -> int:
    as_json = "--json" in sys.argv
    tokens = load_tokens(VARS)
    results = []
    failures = 0
    for fg_t, bg_t, minimum, note in PAIRS:
        try:
            fg = parse_color(resolve(fg_t, tokens))
            bg = parse_color(resolve(bg_t, tokens))
        except Exception as e:  # noqa: BLE001 - report, never crash the gate
            results.append({"fg": fg_t, "bg": bg_t, "ratio": None,
                            "min": minimum, "pass": False, "note": f"resolve error: {e}"})
            failures += 1
            continue
        r = ratio(fg, bg)
        ok = r >= minimum
        if not ok:
            failures += 1
        results.append({"fg": fg_t, "bg": bg_t, "ratio": round(r, 2),
                        "min": minimum, "pass": ok, "note": note})

    if as_json:
        print(json.dumps({"failures": failures, "results": results}, indent=2))
    else:
        print("WCAG AA contrast gate — css/variables.css")
        print(f"{'pair':<28}{'ratio':>7}{'min':>6}  {'ok':<4} note")
        for r in results:
            rr = "n/a" if r["ratio"] is None else f"{r['ratio']:.2f}"
            print(f"{r['fg'] + ' on ' + r['bg']:<28}{rr:>7}{r['min']:>6}  "
                  f"{'PASS' if r['pass'] else 'FAIL':<4} {r['note']}")
        print()
        if failures:
            print(f"RESULT: FAIL — {failures} pair(s) below AA.")
        else:
            print("RESULT: PASS — all pairs meet WCAG AA.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
