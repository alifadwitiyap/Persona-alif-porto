# Analisa UI/UX — 4 LIFE Portfolio

Tanggal: 2026-10-05 · Repo: `D:/project/porto-website-persona5-alif`
Metode: `ui-ux-pro-max` (domain `ux`, `typography`, `color`, `landing`, `threejs`)
+ inspeksi kode + screenshot headless Chrome (desktop 1280, mobile, reduced-motion).
**Setiap temuan di bawah diverifikasi terhadap kode/screenshot — bukan opini model.**
Koreksi vision-model yang salah dicatat di §4.

---

## Ringkasan

Identitas visualnya kuat dan konsisten (merah/hitam/putih, Persona-flavoured, orisinal).
Masalahnya bukan estetika — **masalah hierarki informasi**: beberapa sinyal yang salah
dibuat paling menonjol, dan role/kontribusi profesional tidak muncul di 5 detik pertama.
Aksesibilitas sudah di atas rata-rata (kontras AA lolos, skip-link, focus-visible,
reduced-motion, heading benar) — tidak ada temuan kritis di sana.

Prioritas: **2 high, 4 medium, 2 low.**

---

## HIGH

### H1. Hero tidak menyebut role/spesialisasi
**Bukti:** `index.html:97` kicker = `Portfolio // Archive Access` (tematik, bukan jabatan).
Tagline "Built 4 Life — From real life needs to real life solutions" = slogan, bukan value-prop.
**Dampak:** Perekrut harus *menyimpulkan* profesi dari tema visual. Ini temuan terbesar
dan konsisten dengan kritik Comet sebelumnya.
**Saran:** tambah satu baris role di bawah nama, mis.
`Collection Systems · Data & Analytics · Applied AI` (grounded di `js/data/profile.js`,
bukan klaim baru). Kicker tematik boleh tetap, tapi turunkan prioritasnya.

### H2. Spotlight project: hierarki terbalik — "13 ★" mendominasi nama proyek
**Bukti:** `js/ui.js:183` render `${f.stars}` sebagai `.spotlight__metric`;
`css/components.css` → `.spotlight__metric { font-size: var(--step-4) }` (sampai 6.8rem).
Nama proyek (`h3`) jauh lebih kecil.
**Dampak:** Elemen visual terbesar di section Projects adalah metrik terlemah (13 bintang),
bukan bukti kerja. Menurunkan kredibilitas.
**Saran:** jadikan **nama proyek + hasil** sebagai elemen terbesar; pindahkan
stars ke badge kecil. Atau ganti angka besar dengan outcome nyata (mis. "PyPI package",
"top 53/433") — tapi hanya jika faktual.

---

## MEDIUM

### M1. Tiga sinyal navigasi bersaing di topbar
**Bukti:** `MENU` button + `CHAPTER 00 / 06` progress (`#chapter-progress`) + HUD `START`
(`.hud`, `index.html:237`) semua hadir. Di mobile, `CHAPTER` duduk dekat tombol `MENU`.
**Dampak:** Pengguna baru bertanya "harus klik apa?" (aturan UX: satu pola navigasi utama).
**Saran:** desktop: progress = indikator baca (biarkan). Mobile: sembunyikan `CHAPTER`
dari topbar (masuk ke dalam menu) supaya hanya MENU yang jadi kontrol — HUD sudah
`display:none` di ≤620px, jadi tinggal progress.

### M2. Story-beat tampil dua kali
**Bukti:** `.section__story[data-story-beat]` dirender in-flow (`index.html:201`) **dan**
di-mirror ke rail fixed `.story-rail__beat` (`js/ui/story-rail.js:61+`, `css/overlays.css:467`).
Teksnya identik (dari `section-moods.js`).
**Dampak:** Duplikasi teks di layar — noise, bukan informasi.
**Saran:** pilih satu. Rail fixed sudah memberi rasa "HUD"; pertahankan rail, atau
sembunyikan `.section__story` di desktop (`>900px`) agar tak dobel.

### M3. Empat paragraf "About" terlalu panjang untuk dipindai
**Bukti:** `js/data/profile.js` `about` = 4 paragraf, ~1.456 char.
**Dampak:** Halaman harus dipindai cepat (aturan: body 16px, line-height 1.5, blok pendek).
**Saran:** batasi 80–120 kata/paragraf, atau pecah jadi 1 paragraf ringkas + bullet.

### M4. Mission Log: 3D dominan, timeline teks tenggelam
**Bukti:** `index.html:188` `<ol class="timeline">` ada (konten teks nyata), tapi
canvas WebGL + constellation berjalan di belakang dengan wireframe merah terang.
**Dampak:** Di screenshot, node 3D mengambil fokus; teks pengalaman (yang justru
bukti karier) kurang menonjol. Bukan berarti 3D salah — tapi proporsinya perlu dijaga.
**Saran:** pertahankan 3D sebagai *enhancement* (sudah begitu di mobile), tapi di
desktop turunkan opasitas wireframe di belakang blok teks, atau beri panel solid
di belakang `.tl-item` agar teks selalu menang.

---

## LOW

### L1. Tombol CTA hero menumpuk 3 baris di mobile
**Bukti:** screenshot mobile-hero: `VIEW SELECTED WORK` + `GITHUB` + `LINKEDIN`
semuanya full-width (`css/responsive.css` `.btn { width: 100% }` di ≤620px).
**Saran:** CTA utama full-width; GitHub+LinkedIn jadi satu baris 2 kolom (`.contact__links`
sudah pakai pola `width:auto`).

### L2. `og:image` sudah beres (catatan)
`assets/images/og-cover.jpg` 1200×630 kini ada (dulu 404). Tidak ada aksi lanjutan.

---

## 4. Koreksi vision-model (JANGAN diterapkan)

Vision LLM melaporkan dua "masalah kontras" yang **salah** — sudah diukur:

| Klaim vision | Realita (terukur) | Aksi |
|---|---|---|
| "Tombol CTA merah pakai teks gelap, gagal kontras → ganti putih" | ink `#070709` di accent `#f93541` = **5.38:1 (PASS)**. Putih di accent = **3.74:1 (GAGAL)** | **Jangan** ubah ke putih |
| "Label PROBLEM/ROLE/APPROACH merah redup gagal WCAG AA" | `.card__case-label` pakai `var(--accent)` = **5.38:1 (PASS)** | **Tidak ada masalah** |

Juga: klaim "CHAPTER 03 vs 04 tidak konsisten" **tidak terkonfirmasi** — `section-moods.js`
`progress.step` MISSION LOG = 4 → label `CHAPTER 04 / 06`, sama dengan section index `04`.
Kemungkinan artefak screenshot saat mid-scroll. Tidak dilaporkan sebagai temuan.

> Catatan: query `--design-system` otomatis merutekan ke pola "Enterprise Gateway"
> (navy/green korporat) — **tidak cocok** untuk portofolio kreatif ini. Aku tidak
> memakainya; rekomendasi di atas dari domain `ux`/`typography`/`landing` yang spesifik,
> bukan dari hasil design-system yang salah rute itu.

---

## Yang sudah baik (pertahankan)

- Kontras AA lolos untuk seluruh token (gate `lab/check_contrast.py`, 8/8 PASS).
- Skip-link, focus-visible jelas, focus-trap di menu, `<noscript>` nav, heading hierarki benar.
- `prefers-reduced-motion` mematikan WebGL + morph (bukan sekadar memperlambat).
- CTA utama jelas & dominan (`.btn--primary`), GitHub/LinkedIn sekunder — sesuai pola hero-centric.
- Case Files sudah evidence-first (Problem/Role/Approach) — sesuai arah plan.

---

## Usul urutan perbaikan

1. **H1** role line di hero — dampak terbesar, perubahan kecil.
2. **H2** spotlight hierarchy — tukar bintang ↔ nama proyek.
3. **M2** story-beat duplikasi — 1 baris CSS.
4. **M1** mobile topbar — sembunyikan CHAPTER.
5. **M3/M4/L1** — editorial, perlu keputusanmu.

H1–M2 bersifat teknis dan bisa dikerjakan tanpa keputusan identitas.
M3 (trim About) dan H1 (pemilihan role) sebaiknya kamu putuskan nadanya.
