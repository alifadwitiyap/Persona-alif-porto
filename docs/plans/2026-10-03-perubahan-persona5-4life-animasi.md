# Rencana Perubahan: Persona-5 look, brand 4 LIFE, animasi 3D & foto sticky

**Tanggal:** 2026-10-03
**Repo:** `D:/project/alif-3d-portfolio`
**Dasar:** v1 sudah jalan (6 section, Three.js r169, tanpa build).
**Catatan:** Comet tidak bisa dipakai (akun Perplexity kehabisan kredit — query balas
"You need more credits to continue"). Rencana ini disusun langsung oleh Hermes.

## Goal

Perkuat identitas visual ala Persona 5 (orisinal), ganti brand ke **4 LIFE**, tambah
animasi 3D, jadikan foto utama **sticky + bertransformasi** saat scroll, masukkan
pengalaman kerja sebagai elemen 3D, dan sisakan hanya repo yang di-pin di GitHub.

## Scope

- Tipografi legal bergaya P5 (self-host woff2) + elemen grafis P5-orisinal.
- Brand `ALIF . DEV` → `4 LIFE` (top bar + favicon + judul).
- Foto hero sticky; bertransformasi masuk ke section berikutnya.
- Section `#experience` baru: timeline 3D dari data pengalaman nyata.
- Section `#projects`: hanya 2 repo pinned.
- Section `#github` (Repository Intel) dihapus, diganti `#experience`.
- Animasi 3D baru: skill constellation, timeline node, warp transisi, tilt potret.

## Non-goals

- Tidak memakai aset/font/logo/karakter/musik/layout resmi Persona 5.
- Tidak menambah build step, framework, atau backend.
- Tidak mengubah stack (static HTML + CSS native + vanilla JS + Three.js lokal).

## Constraints

- Tanpa build step; ES module + import map lewat static server.
- Semua konten inti tetap di HTML semantik; WebGL murni dekoratif (`aria-hidden`).
- `prefers-reduced-motion: reduce` → matikan animasi berat, konten tetap lengkap.
- Mobile & reduced-motion: WebGL tidak dimuat.
- Kontras teks tinggi, body ≥16px, tanpa horizontal overflow.
- Data pengalaman & repo harus faktual (dari LinkedIn & GitHub), tanpa mengarang angka.

## Decisions

1. **Font (SIL OFL, self-host, legal):**
   - Display/heading: **Anton** (condensed heavy) — gantikan "Arial Black".
   - Label/badge/UI: **Bebas Neue** (condensed caps).
   - Aksen tebal: **Archivo Black** (untuk judul section besar).
   - Sub-judul/eyebrow: **Oswald** 500/700.
   - Body tetap system sans (keterbacaan).
   - Rasa P5 dari **perlakuan**: `skewX(-8deg)` + italic + uppercase + hard shadow,
     bukan dari font berlisensi.
2. **Elemen P5-orisinal** (CSS/SVG, dibuat sendiri): halftone dot, diagonal speed
   lines, panel jagged `clip-path`, sticker/badge miring dengan hard shadow,
   "cut-paper" torn edge, swipe-in heading.
3. **Foto sticky + morph:** potret jadi `position: sticky` di dalam hero; saat scroll
   ia bergerak/berubah (scale + translate + skew + cross-fade ke panel) memakai
   progress scroll (rAF), bukan scroll-jack.
4. **Pengalaman = 3D timeline:** tiap pengalaman jadi node 3D yang menyala saat
   section `#experience` aktif. Data: Bank Mandiri (Assistant Manager + ODP),
   Telkom Indonesia (Data Scientist Intern), Digital Talent Scholarship (AWS).
5. **Projects = pinned saja:** `NDETCStemmer` (Python, 13★) + `unword` (CSS).
   `js/data/projects.js` jadi 2 entri; flag `featured` tetap di NDETCStemmer.
6. **Ganti Repository Intel → Experience.** Repo count kecil (2) tidak layak section
   sendiri; digabung ke Projects. Pilihan lain (skill constellation / kontak) ditolak
   karena pengalaman lebih bernilai untuk recruiter.
7. **Section final:** hero, profile, skills, experience, projects, contact.

## Tasks

### Task 01: Self-host font legal
Files: assets/fonts/*.woff2, css/fonts.css, index.html
Depends: none
Verify: Network tab memuat woff2 lokal (bukan fonts.googleapis.com); heading memakai Anton/Bebas.

### Task 02: Token & elemen grafis P5-orisinal
Files: css/variables.css, css/components.css
Depends: Task 01
Verify: Ada halftone, speed-lines, sticker badge, panel jagged; ganti font token ke Anton/Bebas/Oswald.

### Task 03: Brand 4 LIFE
Files: index.html, css/layout.css
Depends: none
Verify: Top bar + favicon + `<title>` menampilkan "4 LIFE", bukan "ALIF . DEV".

### Task 04: Foto sticky + transformasi scroll
Files: index.html, css/components.css, css/layout.css, js/main.js
Depends: Task 02
Verify: Scroll dari hero → potret tetap terlihat lalu membesar/bergeser & cross-fade; reduced-motion = statis.

### Task 05: Section Experience (timeline 3D) + hapus GitHub Intel
Files: index.html, js/data/experience.js (baru), js/ui.js, css/components.css
Depends: Task 03
Verify: Section `#experience` ada dengan 3 entri nyata; `#github` hilang; nav update.

### Task 06: Projects = 2 repo pinned
Files: js/data/projects.js, js/ui.js
Depends: none
Verify: Hanya NDETCStemmer + unword; spotlight tetap NDETCStemmer 13★.

### Task 07: Animasi 3D baru (constellation, timeline node, warp, tilt)
Files: js/scene.js, js/main.js, css/animations.css
Depends: Task 04, Task 05
Verify: ≥4 animasi 3D baru jalan di desktop; 0 console error; mobile tetap off.

### Task 08: Animasi section Profile
Files: css/components.css, css/animations.css, js/sections.js
Depends: Task 02
Verify: Panel profil punya gerak halus saat aktif/scroll; teks tetap terbaca.

### Task 09: Verifikasi akhir & a11y
Files: lab/verify.py
Depends: semua
Verify: 0 console error; tanpa overflow; reduced-motion aman; keyboard jalan; screenshot desktop+mobile.

## Verification

- `python lab/verify.py http://127.0.0.1:8077/index.html` → 0 error, tanpa overflow.
- Manual: foto mengikuti scroll & berubah saat masuk section 2.
- Manual: reduced-motion → konten lengkap, animasi berat mati.
- Data pengalaman & repo dicek ke sumber (LinkedIn, GitHub pinned).

## Risks

- **Foto sticky bisa menutupi konten** → batasi tinggi, `pointer-events:none` saat dekoratif, uji 320–1440px.
- **Transformasi scroll bisa memicu motion sickness** → dibatasi & dimatikan saat reduced-motion.
- **Font self-host menambah berat** → hanya subset latin, woff2, 93 KB total.
- **Animasi 3D berlebih menurunkan FPS** → tetap lewat adaptive tier + cap DPR.
- **Klaim legal** → semua grafis/font orisinal; hanya prinsip desain tingkat tinggi.

## Cross-check

- Brand 4 LIFE: top bar, favicon, title, footer.
- Foto sticky: perilaku diminta user (mengikuti scroll lalu berubah).
- Pengalaman: 3 entri nyata dari LinkedIn.
- Projects: hanya 2 repo pinned dari GitHub GraphQL.
- Repository Intel: dihapus, diganti Experience.

## Open issues

- Foto split kepala/badan tetap opsional (default satu cutout).
- Bahasa situs: default Inggris (menunggu keputusan).
- Apakah `unword` perlu deskripsi lebih panjang (deskripsi repo pendek).
