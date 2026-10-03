# Diskusi 3 Model — porto-website-persona5-alif
## Topik: tiru *rasa* porto-persona3 (P3R pause menu), tapi bertema **Persona 5**

Tanggal: 2026-10-03. Model: **Kimi K3**, **Claude Sonnet**, **GPT-6 Sol** — paralel, brief identik.
Metode: Comet (Perplexity) 3 sesi paralel, masing-masing menerima 9 chunk konteks <800 char lalu 1 pertanyaan.

Status bukti: **jawaban model = klaim**, belum diverifikasi. Angka/klaim di bawah belum diuji di repo.

---

## 1. KONVERGENSI KUAT (ketiga model sepakat)

### a. Ini bukan rebuild — ini lapisan baru di atas yang sudah ada
Ketiganya menolak "bangun ulang". `sectionMoods`, resolver+hysteresis, sticky portrait morph,
dan 4 scene Three.js sudah jadi infrastruktur yang tepat. Menu baru = **controller/overlay**,
bukan pengganti konten.

### b. Scroll tetap sumber kebenaran (Sol paling tegas)
Bahaya terbesar: dua model navigasi bertabrakan (menu bilang PROJECTS, scroll masih di EXPERIENCE).
Solusi ketiga model: **resolver section → menentukan menu aktif**, bukan sebaliknya.
Klik menu = transisi lalu `scrollIntoView()`, hash `#projects` tetap diperbarui.

### c. JANGAN tiru: video fullscreen per-halaman
Ini jawaban **unanimous** untuk pertanyaan "apa yang jangan ditiru".
Alasan: berat (ukuran, bandwidth, decode, baterai, GPU), apalagi digabung BokehPass + Three.js +
sticky portrait + mask transition. Juga risiko aksesibilitas (teks di atas video kontras rendah).
→ Ganti dengan **atmosphere layer CSS-first**: gradient/solid, halftone/grain statis, SVG orisinal.
Video = enhancement desktop terbatas (hero saja) kalau memang perlu.

### d. Jangan blokir mobile (Kimi paling keras)
Repo referensi memblokir mobile ("view on a computer"). Ketiganya menolak pola ini.
Mobile = satu kolom, rotasi dikurangi, target sentuh besar, konten lengkap, WebGL tetap off.

### e. Loader wajib punya batas waktu + fallback
Loader ambisius menahan konten padahal HTML sudah siap. Konten harus tetap muncul
kalau aset dekoratif gagal.

### f. SFX hanya setelah gesture user, ada toggle persist
Autoplay audio dilarang. `AudioContext` harus dimulai dari gesture.

### g. Legal: acuan = prinsip abstrak, bukan template
Ketiganya menolak Rodin/Skip Std (milik Atlus). Yang dilarang bukan cuma font:
logo, glyph, nama UI, istilah in-universe, musik, screenshot, dan **reproduksi layout 1:1**.
Sol menambah: menulis "fan-made"/"inspired by" **tidak** menyelesaikan masalah merek dagang.
→ Pakai font legal yang sudah ada (Anton/Archivo Black/Bebas Neue/Oswald) + copy orisinal.

---

## 2. USULAN STRUKTUR (pemetaan 6 section → menu pause)

Konvergensi kuat; label berbeda tapi fungsinya sama:

| # | Section (tetap HTML) | Sol (GPT-6) | Claude | Kimi | Peran |
|---|---|---|---|---|---|
| 00 | hero | START / OPEN FILE | BEGIN / HOME | (menu entry) | Lobby: nama, tagline, CTA buka navigator |
| 01 | profile | IDENTITY FILE | THE PERSON | (case file) | Dossier identitas |
| 02 | skills | SKILL ARSENAL | THE TOOLKIT | (loadout) | Peta kemampuan (constellation) |
| 03 | experience | MISSION LOG | THE ROUTE | (field log) | Timeline = route map |
| 04 | projects | SELECT WORK | CASE FILES | (social link) | Direktori proyek → detail case |
| 05 | contact | OPEN CHANNEL | MAKE CONTACT | (uplink) | CTA bersih, dekorasi minimal |

**Keputusan kunci (ketiganya):** tetap **single-page** dengan overlay menu — BUKAN 6 halaman HTML
terpisah. Section tetap `<section>` semantik; "halaman detail" = state tampilan yang fokus ke section.
Alasan: SEO, scroll native, mobile, deep-link, reduced-motion, dan fallback tanpa WebGL semua terjaga.

**Perilaku menu:** opsi besar bertingkat (rotation/offset/scale/z-index dari `sectionMoods`),
watermark angka `aria-hidden`, HUD `↑↓ SELECT · ENTER OPEN · ESC CLOSE`, profil kanan atas.

---

## 3. EMPAT IDE INTERAKSI KHAS P5 (di luar referensi)

| Ide | Sumber | Inti |
|---|---|---|
| **Comic-impact state** | ketiganya | Opsi aktif dapat "impact frame": outline offset hitam, flash putih, speed-line, judul muncul per-potongan kata. Reduced-motion → ganti warna/outline saja |
| **Sticky portrait mask-reveal** | Sol + Kimi | Portrait yang sudah morph diberi lapisan geometris orisinal (sobekan kertas, frame diagonal, redaction bar) yang tersibak saat START → IDENTITY |
| **Skill constellation = evidence board** | Sol + Kimi | Node = kategori skill, garis = keterkaitan; pilih label HTML → node pulse. Info tetap daftar HTML |
| **Project route selector "brief → process → outcome"** | Sol | Tiap proyek jadi jalur diagonal PROBLEM → BUILD → RESULT; pilih kartu → warp burst → detail. Istilah netral, bukan terminologi game |
| *(Kimi tambahan)* **Tagline ransom headline** | Kimi | Pecah "Built 4 Life[♥]" jadi potongan font/ukuran/rotasi berbeda, disusun ulang mengikuti `--morph` |

---

## 4. RISIKO & MITIGASI (konvergensi)

| Risiko | Mitigasi (kesepakatan) |
|---|---|
| **State tabrakan** (menu/scroll/transisi/detail) | Satu state machine: `loading → browsing → menu-open → transitioning → detail-open`. Selama `transitioning`, input kedua diblokir |
| **Performa** (video+Bokeh+3D+mask) | Atmosphere CSS-first; video opsional desktop; 1 layer halftone statis dipakai bersama; jangan gabung backdrop-filter + BokehPass + clip-path + video di frame yang sama; hentikan render saat tab hidden; loader berbatas waktu |
| **Legal** | `do-not-use list` didokumentasikan; bentuk/copy/SFX orisinal; jangan sebut situs sebagai "Persona 5" — sebut "comic-noir / high-contrast game-interface energy" |
| **A11y + mobile** | `<button>`/`<a href="#...">` semantik sebagai target; rotasi hanya di wrapper dekoratif; urutan DOM tetap linear; focus ring kontras; `aria-current`; Arrow key **hanya** saat overlay fokus; reduced-motion → fade singkat |

---

## 5. URUTAN PENGERJAAN (digabung, termurah → termahal)

1. **Design system + kontrak data** — perluas `sectionMoods`: nomor, label menu, HUD label, palette,
   texture, preset mobile/reduced-motion; tetapkan copy orisinal + inventaris lisensi. *(murah, fondasi)*
2. **Struktur semantik menu/detail** — trigger, overlay navigator, anchor/hash, header identitas,
   watermark, HUD, panel detail proyek — sebagai HTML yang jalan **tanpa** WebGL. *(∥ dengan #3)*
3. **Bahasa visual CSS** — menu miring, offset banner, jagged panel, halftone, sticker, focus state,
   layout mobile 1 kolom. *(∥ dengan #2, setelah token disepakati)*
4. **Satukan state + navigasi** — overlay ↔ resolver/hysteresis, hash, focus management, keyboard,
   Escape stack, mood. *Konsistensi state dulu, animasi belakangan.*
5. **Motion berlapis** — comic impact, panel wipe, portrait reveal, fallback reduced-motion.
   *(∥ sebagian dengan #6)*
6. **Reframe Three.js yang ada** — bungkus timeline/constellation/warp/orbit dengan narasi
   MISSION LOG / SKILL ARSENAL / SELECT WORK; highlight ikut section aktif.
7. **Audio opsional + hardening** — SFX orisinal setelah gesture, toggle persist, uji tanpa
   audio/WebGL, mobile low-end, keyboard, reduced-motion, gagal-loading, audit legal.

---

## 6. YANG PALING JANGAN DITIRU (rekap)

1. **Video fullscreen per-halaman** (unanimous) → pakai atmosphere CSS-first.
2. **Blokir mobile** (Kimi, Sol) → mobile harus tetap berfungsi penuh.
3. **Reproduksi layout 1:1 + font Atlus** (Claude) → bangun bahasa bentuk sendiri.

---

## 7. Belum diputuskan (butuh keputusan Alif)

- Nama menu final: pakai istilah bahasa Inggris (Sol/Claude) atau Indonesia?
- Video hero: pakai (dengan aset orisinal) atau murni CSS?
- SFX: ada atau tidak? (butuh aset audio orisinal)
- Label menu: "CASE FILES" vs "SELECT WORK" vs "MISSION LOG" — pilih satu set yang konsisten.
