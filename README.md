# alif-3d-portfolio

Interactive single-page 3D portfolio for **Alif Adwitiya Pratama**.
Brand: **4 LIFE**. Look: high-contrast, slanted, kinetic (Persona-5 flavour),
executed **originally** — no Persona 5 assets, fonts, logos, or layouts.

Tagline: `Built 4 Life[♥] — From real life needs to real life solutions.`

## Status

**Implemented (v2).** Runs with zero console errors and no horizontal overflow.

- v1 plan (2-model Comet: Sonnet + GPT-6 Sol): [`docs/plans/2026-10-03-website-portofolio-3d-interaktif-bertema.md`](docs/plans/2026-10-03-website-portofolio-3d-interaktif-bertema.md)
- v2 change plan (Persona-5 / 4 LIFE / animations): [`docs/plans/2026-10-03-perubahan-persona5-4life-animasi.md`](docs/plans/2026-10-03-perubahan-persona5-4life-animasi.md)
- Navigator overlay plan ("MISSION LOG" menu): [`docs/plans/2026-10-03-navigator-mission-log-implementasi.md`](docs/plans/2026-10-03-navigator-mission-log-implementasi.md)
- Verification harness: `lab/verify.py` (headless Chrome, self-cleaning)
- Navigator probe: `lab/probe_navigator.py` (open/close, focus trap, keyboard, `goTo`, resolver mirror)
- Portrait pipeline: `lab/make_portrait.py` (rembg matting → 4/5 framed cutout)

## Stack

Static HTML + CSS native + vanilla JS ES modules + Three.js r169 (local).
**No build step, no framework.** Fonts are self-hosted (SIL OFL).

## Run it

```bash
cd D:/project/alif-3d-portfolio
python -m http.server 8077
# open http://localhost:8077
```

> ES module + import map require a static server. **Do not** open `index.html`
> via `file://` — the module imports will fail.

## Sections

`hero` → `profile` → `skills` → `experience` → `projects` → `contact`

## What's inside

| File | Role |
|---|---|
| `index.html` | Semantic shell, import map, 6 sections |
| `css/fonts.css` | Self-hosted @font-face (Anton, Archivo Black, Bebas Neue, Oswald) |
| `css/variables.css` | Design tokens (red/black/white, angular shapes, P5 shadows) |
| `css/base.css` | Reset, typography, P5 texture helpers, depth classes |
| `css/layout.css` | Stage, top bar, section rhythm, HUD, sticky portrait track |
| `css/components.css` | Hero, portrait morph, timeline, statcard, cards, modal |
| `css/animations.css` | Reveal, P5 swipe titles, speed-lines |
| `css/responsive.css` | Breakpoints |
| `js/main.js` | Entry: content → portrait morph → WebGL |
| `js/ui.js` | Renders profile, skills, experience, projects |
| `js/sections.js` | Active section, reveal, timeline node lighting, `goTo(id)` |
| `js/navigator.js` | "MISSION LOG" overlay: open/close, focus trap, keyboard, `goTo` + resolver mirror |
| `js/scene.js` | Three.js: core, shards, orbits, constellation, timeline rail, warp, BokehPass |
| `js/performance.js` | Adaptive tier from measured frame time |
| `js/portrait.js` | Manifest-driven portrait (single cutout + optional split) |
| `js/data/profile.js` | Identity + copy (from LinkedIn) |
| `js/data/experience.js` | Work history (single source of truth) |
| `js/data/projects.js` | Pinned repos only (NDETCStemmer, unword) |

## Features

- **Sticky transforming portrait** — the hero photo stays pinned as you scroll,
  then scales/skews/drifts and reveals a "4 LIFE" sticker as you enter page 2.
- **Persona-5 typography** — Anton/Archivo Black display, Bebas Neue UI, with the
  slant from CSS (`skewX`) and hard red drop-shadows, not a licensed font.
- **P5 graphic elements** — halftone, diagonal speed-lines, jagged panels,
  sticker badges (all CSS/SVG, original).
- **3D experience timeline** — real jobs from LinkedIn; each card lights a 3D node.
- **Depth of field** — `BokehPass` blurs the WebGL layer; CSS `.depth-*` classes
  give the DOM a matching depth language (core text always stays sharp).
- **New 3D animations** — timeline nodes, skill constellation, section warp burst,
  portrait orbit ring; lateral parallax only, no Z-dolly.
- **Navigator overlay ("MISSION LOG")** — full CSS/JS menu opened with the
  topbar **MENU** button, the hero **START** button, or the **M** key. `Esc`
  closes; `Tab` is trapped; `↑↓` move between items; `Enter` opens a section.
  Scroll stays the source of truth: the panel only mirrors the active section
  (from `sections.js`), and picking an item calls `sections.goTo(id)` →
  `scrollIntoView` + hash. Labels live in `sectionMoods.menu`, so menu, HUD and
  section index share one source. Reduced-motion opens instantly and scrolls
  without animation; without JS the `<noscript>` nav still works.
- **Adaptive performance** — conservative on touch/small screens, downgrades
  post-processing from real frame times.
- **Graceful degradation** — no WebGL, no JS, or reduced-motion all still show
  the complete content.

## Known follow-ups

1. Site language: English / Indonesian / bilingual.
2. Public email (currently omitted on purpose).
3. Optional head/torso split portrait.

## Note on the photo

`assets/source/profile-linkedin.jpg` is a studio headshot on a dark, vignetted
backdrop. The vignette glow behind the head is brighter than the shadowed suit,
so thresholding cannot separate them — the pipeline uses learned matting
(`rembg`, bria-rmbg). Regenerate with `python lab/make_portrait.py`.
