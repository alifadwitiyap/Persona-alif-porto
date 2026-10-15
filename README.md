# Portofolio Alif Adwitiya Pratama

Personal portfolio site. Single page, WebGL scene, Persona-5 inspired look —
all original work, no licensed assets.

Brand: 4 LIFE — *"Built 4 Life[♥] — From real life needs to real life solutions."*

## Run locally

The page loads ES modules, so it needs a static server (opening index.html
via file:// won't work):

```bash
python -m http.server 8080
```

Then open http://localhost:8080

## Content

All the copy on the site — hero, about, experience, projects, contact —
lives in one file: [content.json](content.json). Edit the values there and
reload; no HTML or JS changes needed.

## Stack

Plain HTML, CSS and vanilla JS with Three.js (vendored locally).
No build step, no framework.
