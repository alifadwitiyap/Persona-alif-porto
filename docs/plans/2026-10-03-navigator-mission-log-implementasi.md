# Implementasi: Navigator Overlay "MISSION LOG"

**Tanggal:** 2026-10-03
**Repo:** `D:/project/porto-website-persona5-alif`
**Dasar:** `docs/plans/2026-10-03-diskusi-3-model-p3r-ke-p5.md` (diskusi 3 model, 18:44)
**Status kode:** v2 sudah jalan (6 section, resolver+hysteresis, `sectionMoods`+preset aspect, 4 motion Three.js, sticky portrait morph). Menu overlay **sudah diimplementasi** (2026-10-03).

## Status: SELESAI (2026-10-03)

Dieksekusi paralel 5 lane (disjoint by write-scope). Verifikasi: `lab/verify.py` → **0 console error**, tanpa overflow; `lab/probe_navigator.py` → **34/34 PASS** (open MENU/START/M, Esc, focus trap, arrow nav, `goTo`+hash, resolver mirror, reduced-motion, scrim close).

- Task 01–05 ✅ · Task 06 (portrait mask-reveal) **belum** (opsional, ditunda) · Task 07 ✅
- Vocabular final: `START · IDENTITY FILE · SKILL ARSENAL · MISSION LOG · CASE FILES · OPEN CHANNEL`
- Catatan: MISSION LOG dipindah ke section **experience**; projects jadi **CASE FILES**.

## Keputusan Alif (2026-10-03, mengunci open-issues plan diskusi)

1. **Bahasa menu:** istilah **Inggris**.
2. **Media:** **murni CSS + JS-animated** — **tanpa video**.
3. **SFX:** **tidak ada** (tidak ada AudioContext, tidak ada aset audio).
4. **Label menu:** set **MISSION LOG** (pilihan set-3-model).
5. **Cara buka:** tombol **MENU** di topbar + tombol **START** di hero + keyboard (**M** buka, **Esc** tutup).

### Vocabular final (menggantikan label `section__index` yang ada)

| Section | `menu.label` | `menu.index` | HUD |
|---|---|---|---|
| `hero` | START | 00 | Start |
| `profile` | IDENTITY FILE | 01 | Identity File |
| `skills` | SKILL ARSENAL | 02 | Skill Arsenal |
| `experience` | MISSION LOG | 03 | Mission Log |
| `projects` | CASE FILES | 04 | Case Files |
| `contact` | OPEN CHANNEL | 05 | Open Channel |

> ⚠️ **Bentrok yang diselesaikan:** HTML sekarang menaruh `05 / MISSION LOG` di section **projects**. Sesuai keputusan, **MISSION LOG pindah ke `experience`** dan `projects` jadi **CASE FILES**. Ini wajib diubah di `index.html` supaya konsisten dengan menu.

## Goal

Menambah **satu controller overlay navigator** (full CSS/JS-animated) di atas arsitektur v2 yang sudah ada — **bukan rebuild, bukan 6 halaman terpisah**. Scroll tetap sumber kebenaran; menu hanya cermin dari `active` section, dan klik menu = transisi lalu scroll ke section.

## Non-goals

- Tidak menambah video, audio/SFX, framework, bundler, atau dependency baru.
- Tidak mengubah struktur 6 `<section>` semantik atau stack (static HTML + CSS native + vanilla JS ES modules + Three.js r169 lokal).
- Tidak menambah halaman HTML terpisah; tidak scroll-jacking.
- Tidak menyentuh `js/scene.js` selain memanggil `setActive` yang sudah ada.
- Tidak meniru aset/font/logo/istilah in-universe Persona 5 (tetap "Signal Archive" vocabulary orisinal).

## Constraints

- Overlay harus **jalan tanpa WebGL** dan tanpa JS-berat: navigasi inti = anchor `#id` + `scrollIntoView` native.
- `prefers-reduced-motion: reduce` → overlay tetap berfungsi, animasi berat diganti fade/warna singkat (pola sama seperti `css/animations.css` sekarang).
- Satu state machine saja: `browsing → menu-open → transitioning → browsing` (state `detail-open` sudah ada lewat modal proyek, jangan digabung).
- Tidak memakai `window` custom event global; ikuti pola callback `initSections({ onChange })` yang sudah ada.
- Keyboard: Arrow **hanya** saat overlay fokus; `aria-current` pada item aktif; focus ring kontras; `Esc` menutup (masuk ke Escape stack yang sudah ada di `ui.js`).
- Mobile (`max-width: 900px`) sekarang `.nav { display: none }` → tombol **MENU** wajib tetap terlihat dan jadi navigasi utama mobile.
- Tanpa horizontal overflow; kontras teks tinggi.

---

## Arsitektur

```
index.html                 → + <button MENU> di topbar, + <button START> di hero,
                             + markup <div id="navigator"> (overlay, role=dialog)
css/components.css         → gaya navigator (panel miring, watermark, HUD, item)
css/animations.css         → transisi buka/tutup + comic-impact aktif
js/data/section-moods.js   → + field `menu: { index, label, hud }` (kontrak data)
js/navigator.js (BARU)     → controller: open/close, focus trap, keyboard, state,
                             hash + scrollIntoView, sinkron ke resolver
js/main.js                 → + initNavigator({ sections, getActive }) di init()
js/sections.js             → + expose `goTo(id)` + callback active ke navigator
```

Aliran data (satu arah, sesuai keputusan 3 model — **resolver menentukan menu, bukan sebaliknya**):

```
scroll → sections.js resolver (ratio+hysteresis) → active id
                                                 ├→ scene.setActive(id)
                                                 └→ navigator.setActive(id)   (sorot item)
klik item menu → navigator → sections.goTo(id) → scrollIntoView + hash → resolver mengonfirmasi
```

---

## Tasks

### Task 01: Perluas kontrak data `sectionMoods` dengan `menu`

**Files:**
- Modify: `js/data/section-moods.js` (header doc + tiap entri)
- Modify: `index.html` (`section__index` + `data-name` di 6 section)

**Step 1** — Di header doc `section-moods.js`, tambahkan field ke shape:
```js
 *     menu: {                            // navigator overlay label
 *       index: string,                   // 2-digit display, e.g. '01'
 *       label: string,                   // menu label (UPPERCASE, English)
 *       hud: string,                     // short name shown in the HUD
 *     },
```

**Step 2** — Tambahkan `menu` ke tiap entri sesuai tabel vocabular di atas, contoh:
```js
  experience: {
    accent: BRAND_ACCENT,
    menu: { index: "03", label: "MISSION LOG", hud: "Mission Log" },
    scene: { focus: 2.6, camX: -0.5, camY: 0.15, layout: "timelineRail", motion: "rise" },
    presets: { /* tidak berubah */ },
  },
```

**Step 3** — Di `index.html`, samakan `section__index` & `data-name` dengan tabel:
- `hero` → `00 / START`, `data-name="Start"`
- `profile` → `01 / IDENTITY FILE`, `data-name="Identity File"`
- `skills` → `02 / SKILL ARSENAL`, `data-name="Skill Arsenal"`
- `experience` → `03 / MISSION LOG`, `data-name="Mission Log"`
- `projects` → `04 / CASE FILES`, `data-name="Case Files"`
- `contact` → `05 / OPEN CHANNEL`, `data-name="Open Channel"`

**Verify:** `search_files "MISSION LOG"` hanya cocok di section `experience`; keenam entri `sectionMoods` punya `menu`; tidak ada duplikasi index.

---

### Task 02: Markup navigator overlay + tombol pemicu

**Files:**
- Modify: `index.html`

**Step 1** — Tambah tombol MENU di topbar (setelah `.nav`, ikut tersembunyi bersama nav? **tidak** — ini pengganti nav di mobile):
```html
<button class="menu-btn" id="menu-btn" type="button"
        aria-haspopup="dialog" aria-controls="navigator" aria-expanded="false">
  <span class="menu-btn__bars" aria-hidden="true"></span>
  <span class="menu-btn__label">Menu</span>
</button>
```

**Step 2** — Tambah tombol START di `.hero__actions` (paling depan):
```html
<button class="btn btn--primary" id="start-btn" type="button" aria-haspopup="dialog" aria-controls="navigator">
  Start
</button>
```

**Step 3** — Tambah overlay sebelum `</body>` (setelah `#modal`). Markup **statis** (tidak di-render JS) supaya jalan tanpa JS:
```html
<div class="navigator" id="navigator" role="dialog" aria-modal="true"
     aria-labelledby="navigator-title" hidden>
  <div class="navigator__scrim" data-nav-close></div>
  <div class="navigator__panel">
    <header class="navigator__head">
      <span class="navigator__kicker">4<span class="brand__heart">♥</span>LIFE // ARCHIVE</span>
      <h2 class="navigator__title" id="navigator-title">Select Section</h2>
      <button class="navigator__close" id="navigator-close" type="button" aria-label="Close menu">ESC ✕</button>
    </header>

    <ol class="navigator__list" id="navigator-list" role="list"></ol>

    <footer class="navigator__hud" aria-hidden="true">
      ↑↓ SELECT · ENTER OPEN · ESC CLOSE
    </footer>
  </div>
</div>
```

> Item `<li>` **di-render JS** dari `sectionMoods` (Task 04). Tanpa JS, overlay tetap `hidden` dan tombol `#menu-btn`/`#start-btn` tetap jadi anchor fallback? → **Tidak**: karena itu, di Task 02 step 4 tambahkan `<noscript>` fallback.

**Step 4** — Tambah fallback no-JS tepat setelah tombol MENU:
```html
<noscript>
  <nav class="nav nav--fallback" aria-label="Sections">
    <a href="#profile">Identity File</a>
    <a href="#skills">Skill Arsenal</a>
    <a href="#experience">Mission Log</a>
    <a href="#projects">Case Files</a>
    <a href="#contact">Open Channel</a>
  </nav>
</noscript>
```

**Verify:** `#navigator` ada & `hidden`; `#menu-btn` & `#start-btn` ada; tanpa JS halaman masih bisa navigasi lewat `<noscript>`.

---

### Task 03: CSS navigator (bahasa visual P5 orisinal)

**Files:**
- Modify: `css/components.css` (append bagian `/* ---- Navigator ---- */`)
- Modify: `css/responsive.css` (breakpoint mobile)

**Step 1** — Gaya overlay + panel (pakai token yang sudah ada: `--ink`, `--accent`, `--shadow-hard`, `--clip-panel-alt`, `--font-display`, `--font-ui`). Contoh inti:
```css
.navigator { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; }
.navigator[hidden] { display: none; }
.navigator__scrim { position: absolute; inset: 0; background: rgba(7,7,9,.86); }
.navigator__panel {
  position: relative; width: min(920px, 92vw);
  padding: var(--sp-7) var(--gutter);
  background: var(--ink-2);
  clip-path: var(--clip-panel-alt);
  box-shadow: var(--shadow-hard);
  transform: skewX(-3deg);
}
```

**Step 2** — Item menu besar bertingkat (rotation/offset/scale per-index dari `data-index`), watermark angka `aria-hidden`:
```css
.navigator__item {
  display: flex; align-items: baseline; gap: var(--sp-4);
  font-family: var(--font-display); font-size: var(--step-3);
  color: var(--paper-dim); text-transform: uppercase;
  transform: skewX(-6deg);
  transition: color var(--t-fast), transform var(--t-med) var(--ease-out);
}
.navigator__item[data-active="true"] { color: var(--paper); }
.navigator__item[data-active="true"] .navigator__num { color: var(--accent); }
.navigator__num { font-family: var(--font-mono); font-size: var(--step-1); color: var(--muted); }
```

**Step 3** — Mobile: panel penuh, item satu kolom, target sentuh besar; `#menu-btn` **selalu tampil** (jangan ikut `.nav { display:none }`):
```css
@media (max-width: 900px) {
  .navigator__panel { width: 100%; height: 100%; clip-path: none; transform: none; }
  .navigator__item { font-size: var(--step-2); padding: var(--sp-3) 0; min-height: 56px; }
}
```

**Verify:** overlay tampil benar di 375×667, 768×1024, 1440×900; tidak ada horizontal overflow; `#menu-btn` terlihat di mobile.

---

### Task 04: Controller `js/navigator.js`

**Files:**
- Create: `js/navigator.js`
- Modify: `js/sections.js` (expose `goTo` + teruskan active ke navigator)
- Modify: `js/main.js` (init + wiring)

**Step 1** — `sections.js`: tambah `goTo(id)` di objek return (jangan ubah logika resolver):
```js
    goTo(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", `#${id}`);
    },
```
(`prefersReduced` = helper kecil baca `matchMedia`.)

**Step 2** — `js/navigator.js` — bangun item dari `sectionMoods` (import `sectionMoods` dari `./data/section-moods.js`), urut `menu.index`:
```js
export function initNavigator({ sections, getActive }) {
  const root = document.getElementById("navigator");
  const list = document.getElementById("navigator-list");
  if (!root || !list) return { open(){}, close(){}, setActive(){} };

  // render items
  const order = ["hero","profile","skills","experience","projects","contact"];
  list.innerHTML = order.map((id) => {
    const m = sectionMoods[id]?.menu ?? { index: "", label: id, hud: id };
    return `<li><button class="navigator__item" type="button" data-goto="${id}" data-index="${m.index}">
      <span class="navigator__num" aria-hidden="true">${m.index}</span>
      <span class="navigator__label">${m.label}</span>
    </button></li>`;
  }).join("");
  // ... open/close/setActive (lihat langkah berikut)
}
```

**Step 3** — State machine + buka/tutup + focus trap + Esc stack:
```js
  let state = "browsing";        // 'browsing' | 'menu-open' | 'transitioning'
  let lastFocus = null;
  const focusables = () => [...root.querySelectorAll("button, a[href]")];

  function open() {
    if (state !== "browsing") return;
    state = "menu-open";
    lastFocus = document.activeElement;
    root.hidden = false;
    document.body.classList.add("is-locked");
    menuBtn?.setAttribute("aria-expanded", "true");
    setActive(getActive());
    (root.querySelector('[data-active="true"]') || focusables()[0])?.focus();
  }
  function close() {
    if (state !== "menu-open") return;
    state = "browsing";
    root.hidden = true;
    document.body.classList.remove("is-locked");
    menuBtn?.setAttribute("aria-expanded", "false");
    lastFocus?.focus?.();
  }
```
- **Focus trap:** pada `keydown` Tab di dalam overlay, wrap antara elemen pertama & terakhir `focusables()`.
- **Esc:** panggil `close()` **sebelum** handler `ui.js`; jaga urutan dengan cek `if (state === "menu-open") { e.stopPropagation(); close(); }`.
- **Keyboard:** ArrowUp/Down pindah fokus antar `.navigator__item`; Enter/Space → `goTo`. `M` global (bukan saat `is-locked`/mengetik di input) → `open()`.

**Step 4** — Klik item → `goTo` + `transitioning` (blokir input kedua selama transisi, sesuai mitigasi 3 model):
```js
  function go(id) {
    if (state === "transitioning") return;
    state = "transitioning";
    close();                       // tutup dulu, biar scroll terlihat
    sections.goTo(id);
    const done = () => { state = "browsing"; };
    // pakai scrollend bila ada, fallback timeout
    ("onscrollend" in window) ? window.addEventListener("scrollend", done, { once:true })
                              : setTimeout(done, 700);
  }
```

**Step 5** — `setActive(id)` (dipanggil dari `initSections.onChange`): set `data-active="true"` pada item yang cocok + `aria-current="true"`, sisanya `false`.

**Step 6** — `js/main.js`: setelah `initSections` dibuat, simpan handle-nya, lalu:
```js
  const sectionsCtl = initSections({
    onChange: (id) => { world?.setActive(id); if (id === "experience") syncTimelineNode(world); },
  });
  const nav = initNavigator({ sections: sectionsCtl, getActive: () => sectionsCtl.active });
  // di dalam onChange, tambahkan: nav.setActive(id);
```

**Verify:** buka via MENU/START/`M`; Esc menutup; Tab terkurung; klik item scroll ke section & tutup; `aria-expanded`/`aria-current` benar; tanpa console error.

---

### Task 05: Animasi buka/tutup + comic-impact state aktif (CSS)

**Files:**
- Modify: `css/animations.css` (append)

**Step 1** — Transisi buka/tutup (clip-path/opacity, ≤ 600ms) memakai pola `[data-swipe]` yang ada:
```css
.navigator[hidden] { display: none; }
.navigator { animation: nav-in var(--t-slow) var(--ease-snap) both; }
@keyframes nav-in {
  from { opacity: 0; clip-path: inset(0 0 100% 0); }
  to   { opacity: 1; clip-path: inset(0 0 0 0); }
}
```

**Step 2** — Comic-impact pada item aktif (outline offset + flash + speed-line), **tanpa** animasi loop berat:
```css
.navigator__item[data-active="true"] {
  outline: 3px solid var(--ink); outline-offset: 3px;
  text-shadow: 4px 4px 0 #000, 7px 7px 0 var(--accent);
}
.navigator__item[data-active="true"]::before { /* speed-line kiri */
  content: ""; position: absolute; left: -1.2em; top: 50%; width: 1em; height: 6px;
  background: var(--accent); transform: skewX(-20deg);
}
```

**Step 3** — Reduced-motion: matikan `nav-in` & comic flash, ganti warna/outline saja:
```css
@media (prefers-reduced-motion: reduce) {
  .navigator { animation: none; }
  .navigator__item { transition: color var(--t-fast); }
  .navigator__item[data-active="true"]::before { display: none; }
}
```

**Verify:** overlay masuk halus di desktop; reduced-motion → langsung tampil tanpa gerak; tidak ada animasi yang berjalan terus saat overlay tertutup.

---

### Task 06: Sticky portrait mask-reveal (START → IDENTITY)

**Files:**
- Modify: `css/components.css` (`.portrait__deco` / mask layer)
- Modify: `js/main.js` (`initPortraitMorph` — tambah lapisan mask geometris)

**Step 1** — Di `index.html` `.portrait__deco` sudah ada (`aria-hidden`). Tambah lapisan geometris orisinal via CSS (sobekan kertas/frame diagonal/redaction bar) yang `clip-path`-nya tersibak mengikuti `--morph` yang sudah dihitung `initPortraitMorph()`:
```css
.portrait__deco {
  background: repeating-linear-gradient(-45deg, transparent 0 14px, var(--accent) 14px 16px);
  clip-path: inset(0 0 calc((1 - var(--morph, 0)) * 100%) 0);
  transition: clip-path 120ms linear;
}
```
> Tetap dekoratif, `pointer-events: none`, dan tidak mengubah foto/alt.

**Step 2** — Hormati reduced-motion & mobile: bila `--morph` tidak dihitung (lihat `initPortraitMorph` early-return), mask tampil statis penuh.

**Verify:** saat scroll hero→profile mask tersibak; reduced-motion & mobile → statis, konten utuh; foto tidak tertutup teks.

---

### Task 07: Verifikasi akhir + dokumentasi

**Files:**
- Run: `lab/verify.py`
- Modify: `README.md` (tambah baris plan baru + bagian Navigator)

**Step 1** — Jalankan harness:
```bash
cd D:/project/porto-website-persona5-alif
python -m http.server 8077 &
python lab/verify.py http://127.0.0.1:8077/index.html
```
Expected: **0 console error**, tanpa horizontal overflow, screenshot desktop+mobile tersimpan.

**Step 2** — Matriks manual:
- Buka navigator: MENU, START, `M`. Tutup: Esc, klik scrim, tombol close.
- Keyboard: Tab terkurung; ArrowUp/Down pindah; Enter membuka section.
- Klik item → scroll halus + hash `#id` berubah + HUD/nav `aria-current` sinkron.
- Scroll manual → item menu yang tersorot mengikuti resolver (bukan sebaliknya).
- 375×667 / 768×1024 / 1440×900: tanpa overflow, `#menu-btn` terlihat di mobile.
- `prefers-reduced-motion: reduce`: overlay langsung tampil, scroll instan, mask statis.
- Tanpa WebGL / JS off: konten + `<noscript>` nav tetap jalan.

**Step 3** — Update `README.md`: tambah baris plan ini di daftar `docs/plans/` + seksi singkat "Navigator (MISSION LOG)" (tombol buka, keyboard, reduced-motion).

**Verify:** README menyebut plan baru; `search_files "navigator"` menemukan markup+CSS+JS konsisten.

---

## Verification (ringkas)

| Area | Cara | Expected |
|---|---|---|
| Console | `lab/verify.py` | 0 error, 0 404 |
| Overflow | harness + manual | tidak ada horizontal scroll |
| A11y | keyboard manual | focus trap, `aria-current`, `aria-expanded`, Esc |
| Reduced-motion | media emulation | tanpa gerak berat, konten utuh |
| Mobile | 375/768 | menu-btn tampil, panel penuh, target ≥56px |
| No-JS | disable JS | konten + `<noscript>` nav jalan |
| Konsistensi vocab | `search_files` | MISSION LOG hanya di `experience` |

## Risks

| Risiko | Mitigasi |
|---|---|
| Dua model navigasi bertabrakan (menu vs scroll) | Resolver tetap sumber kebenaran; klik menu = `goTo` → `scrollIntoView`; menu hanya **mencerminkan** `active` |
| Input kedua saat transisi | State machine `transitioning` memblokir `go()` berulang |
| `Esc` dobel (navigator vs modal proyek) | Escape stack: navigator `stopPropagation` saat `menu-open`; modal tetap prioritas saat `detail-open` |
| Overlay menutupi konten saat JS gagal | Overlay default `hidden` + `<noscript>` nav |
| Bentrok label MISSION LOG (projects→experience) | Task 01 samakan `section__index`+`data-name`+`menu` sekaligus |
| Motion berlebih | Reduced-motion mematikan animasi overlay & mask |

## Cross-check

- Vocabular & index menu: Task 01 (satu sumber: `sectionMoods.menu`).
- Resolver = sumber kebenaran: Task 04 (aliran satu arah).
- Tanpa video/SFX: Non-goals + tidak ada task audio/video.
- Full CSS/JS-animated: Task 03 + Task 05.
- Mobile tidak diblokir: Task 03 step 3.
- Legal: tidak menyebut/ memakai aset Persona 5; istilah "Signal Archive"/"Mission Log" orisinal.

## Open issues

- Posisi final tombol MENU di topbar (kanan `.nav` vs menggantikan `.nav` di desktop) — default: tetap tampil di semua breakpoint sebagai pintu masuk overlay.
- Apakah `.nav` desktop dipertahankan berdampingan dengan MENU, atau digantikan penuh oleh MENU — menunggu preferensi Alif saat implementasi.
