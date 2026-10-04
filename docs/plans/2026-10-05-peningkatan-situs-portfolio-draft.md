# Draft: Rencana Peningkatan Situs "4 LIFE" Portfolio

> **STATUS: DRAFT — belum disetujui, belum diimplementasikan.**
> Disusun dari debat dua model AI (Comet/Perplexity): **GPT-6.1 Sol Thinking** (draft A + kritik atas B)
> dan **Claude Sonnet 5.5 Thinking** (draft B + kritik atas A). Hermes hanya menyintesis; isi berasal dari
> kedua model. Klaim teknis **belum diverifikasi** terhadap repo — lihat §Verifikasi.
>
> Tanggal: 2026-10-05 · Repo: `D:/project/porto-website-persona5-alif` · Live: https://alifadwitiyap.github.io/Persona-alif-porto/

---

## Goal

Meningkatkan situs portofolio karier Alif Adwitiya Pratama agar **pengunjung bernilai tinggi (recruiter,
hiring manager, kolaborator) memahami kontribusi dan bukti kerja Alif dalam 30–60 detik** — tanpa
mengorbankan identitas visual "4 LIFE" yang sudah khas.

## Kesimpulan debat (di mana kedua model sepakat)

Kedua model sampai pada tesis yang sama dari sudut berbeda:

> **Portofolio karier kekurangan *bukti yang cepat dipahami*, bukan kekurangan *spectacle*.**
> 3D/WebGL sudah cukup bernilai sebagai framing; menambah efek sebelum Case Files kuat = diminishing
> returns, bahkan menurunkan kredibilitas dan performa.

Kesepakatan konkret (keduanya setuju):

1. **Case Files = prioritas #1.** Ubah dari "galeri proyek" menjadi *evidence-first case study*.
2. **Konten inti jangan bergantung pada JavaScript.** Hero, case files, CTA, navigasi, kontak harus ada di HTML.
3. **3D = progressive enhancement**, bukan syarat navigasi/pemahaman. Jangan di jalur render awal.
4. **Aksesibilitas = P0**, bukan polish (skip link, heading hierarchy, focus-visible, reduced-motion, target sentuh).
5. **Performance budget + CI** sebagai gerbang regresi, bukan angka pajangan.
6. **Jangan tiru grammar visual Persona 5** — ambil energi editorialnya saja (batas legal sudah benar).

---

## Tasks (diurutkan; tiap task punya Files/Depends/Verify)

### Task 1: Case Files evidence-first
**Files:** `index.html`, `js/data/projects.js`, `js/ui.js`, `css/components.css`
**Depends:** none
**Verify:** `python lab/verify_content.py` + inspeksi manual: tiap proyek punya Problem → Role → Approach → Proof → Link.
**Isi:** Untuk NDETCStemmer (spotlight), unword, WA-Bulk — tampilkan: masalah spesifik, peran Alif, pendekatan/stack,
artefak/bukti (repo, README, DOI), outcome. Tambah satu kalimat "Why this matters" non-teknis per proyek
(hanya jika menjelaskan keputusan/dampak yang tidak terlihat dari output — jangan boilerplate).
Tambah disclosure kecil untuk konteks bank: *"Selected descriptions are intentionally generalized to respect confidentiality."*
**Risiko:** klaim dampak/metrik tanpa bukti merusak kepercayaan. Jangan publish placeholder `[username]`/`[Verified stack]`.

### Task 2: Positioning Hero
**Files:** `index.html`, `js/data/profile.js`
**Depends:** none
**Verify:** inspeksi visual + `verify_content.py`.
**Isi:** Headline = value proposition kontribusi (mis. "Collection Systems × Data Analytics × Applied AI" + satu
kalimat nilai), bukan sekadar daftar bidang. Tambah CTA utama "View selected work ↓" → `#case-files`.
GitHub/LinkedIn jadi CTA sekunder.
**Risiko:** jangan jadi slogan abstrak; sebut bidang + jenis masalah + cara kerja.

### Task 3: Proof strip (opsional, hanya jika faktual)
**Files:** `index.html`, `js/data/profile.js` atau `js/data/hall-of-fame.js`
**Depends:** Task 2
**Verify:** setiap angka bisa dilacak ke sumber.
**Isi:** 3–4 fakta ringkas: role sekarang, GPA 3.90/4.00, jumlah publikasi/competitive record, fokus.
**Kritik yang diterima (kedua model):** hindari "vanity strip" — angka tanpa konteks = dekorasi.
Tiap item harus anchor ke section detail. Tampilkan GPA hanya karena memang kuat & relevan.

### Task 4: Rapikan Identity File
**Files:** `js/data/profile.js`, `index.html`
**Depends:** none
**Verify:** `verify_content.py` (4 paragraf) + cek panjang.
**Isi:** Struktur naratif: mandate saat ini → metode kerja → fondasi teknis → arah ke depan.
**Kritik Sonnet:** 4 paragraf berisiko terlalu panjang untuk halaman yang harus dipindai cepat —
batasi 80–120 kata/paragraf, hindari jargon tanpa bukti.

### Task 5: Mission Log impact-first
**Files:** `js/data/experience.js`, `js/ui.js`
**Depends:** none
**Verify:** `verify_content.py` (3 item, 1 link "See more on LinkedIn").
**Isi:** Format per pengalaman: scope → keputusan/masalah → kontribusi → outcome; 2–3 bullet kuat.
**Risiko:** data internal Bank Mandiri/nasabah/metrik collection sensitif → generalisasi + anonimisasi.

### Task 6: Discoverability (OG/SEO)
**Files:** `index.html`, `robots.txt` (baru), `sitemap.xml` (baru), `assets/images/og-cover.jpg` (baru)
**Depends:** Task 1–2 (butuh positioning & cover yang benar dulu)
**Verify:** validasi meta + cek canonical self-referencing.
**Isi:** `og:type/title/description/url/image`, `twitter:card=summary_large_image`, `<link rel="canonical">` self-referencing,
sitemap URL utama, JSON-LD `ProfilePage`/`Person` (hanya data terverifikasi).
**Kritik SOL (diterima):** canonical **wajib self-referencing & konsisten** — canonical salah lebih buruk daripada tidak ada.
`robots.txt` tidak otomatis wajib; jangan taruh `Disallow` untuk menyembunyikan konten (tidak berfungsi).

### Task 7: Performa — keluarkan Three.js dari critical path
**Files:** `js/main.js`, `js/performance.js`, `js/scene.js`
**Depends:** none
**Verify:** Lighthouse mobile baseline + cek Three.js tidak di jalur render awal.
**Isi:** `dynamic import('./scene.js')` setelah konten siap; gate pada `prefers-reduced-motion`/`saveData`/viewport.
**Kritik SOL (diterima):** **jangan** klasifikasi perangkat dari `navigator.deviceMemory`/`hardwareConcurrency`
(rapuh) — ukur **frame time nyata** (sudah ada di `performance.js`); `requestIdleCallback` bukan mekanisme
loading utama (pakai `IntersectionObserver`/interaksi). Jangan jadikan `BokehPass` bagian roadmap inti.

### Task 8: Aksesibilitas
**Files:** `index.html`, `css/*.css`, `js/ui/menu.js`
**Depends:** none
**Verify:** audit keyboard manual + `qa_adversarial.py`.
**Isi:** skip link (fokus pertama, terlihat saat fokus), satu `<h1>`, heading tidak melompati level,
`:focus-visible` kontras ≥3:1, `scroll-margin-top` agar heading tidak tertutup topbar,
`aria-hidden="true"` + `pointer-events:none` pada canvas dekoratif, reduced-motion benar-benar mematikan morph (bukan hanya lambat).
**Kritik SOL (diterima):** **jangan** pasang `min-inline-size:44px` ke SEMUA `<a>` (merusak inline link) —
terapkan ke kontrol UI saja; WCAG minimum 24×24, 44×44 untuk kontrol utama.

### Task 9: CI + kontrak data
**Files:** `.github/workflows/verify.yml` (baru), `js/data/section-moods.js`
**Depends:** Task 1–8 (agar yang diuji sudah stabil)
**Verify:** workflow jalan hijau di PR.
**Isi:** Tahap 1 (wajib): `camera-shift.test.mjs`, `menu.test.mjs`, `progress.test.mjs`, `verify.py`, `verify_content.py`.
Tahap 2 (bertahap, setelah stabil): probe CDP (`verify_menu_overlay.py`, `probe_menu_fit.py`, dll) + Lighthouse.
**Kritik keduanya (diterima):** mulai dari deterministic check saja; probe visual/CDP flaky jangan dijadikan required check dulu.
Validasi kontrak `section-moods` (id unik, urut, preset lengkap) berguna — tapi **jangan over-engineer** untuk 7 section.

### Task 10: Deep-link per Case File
**Files:** `js/sections.js`, `index.html`
**Depends:** Task 1
**Verify:** `#ndetcstemmer` membuka case-files + fokus ke artikel.
**Isi:** Hash detail per proyek; resolver memperluas agar hash detail tetap mengaktifkan `case-files`.
**Risiko:** hash detail vs section resolver bisa konflik — section tetap state chapter, hash project = state detail.

---

## Non-goals

- Menambah section baru sebelum 3 Case Files punya bukti kuat.
- Menambah efek 3D/shader/post-processing baru sebelum fondasi konten & performa beres.
- Scroll-jacking, horizontal hijacking, forced cinematic sequence.
- Autoplay audio, cursor custom, glitch permanen, flash merah agresif.
- Skill bar "Python 95%" (angka tak terverifikasi).
- Render seluruh konten via JS (merusak SEO/fallback).
- i18n dengan redirect otomatis berbasis bahasa browser (pakai `/` + `/id/` + switcher eksplisit, nanti).
- Meniru aset/logo/font/layout Persona 5.

## Constraints

- Tetap static site tanpa build step di GitHub Pages.
- Batas legal originalitas Persona-5 dipertahankan.
- Elemen brand personal (♥ di 4♥LIFE, tagline) tidak dihapus tanpa alasan.
- Base path GitHub Pages project: semua URL absolut harus `https://alifadwitiyap.github.io/Persona-alif-porto/`.

## Decisions

- Prioritas mengikuti urutan Task 1 → 10.
- "Kalau hanya satu pekerjaan minggu ini": **lengkapi Case File NDETCStemmer** (masalah, peran, pendekatan, bukti, outcome) — kedua model sepakat ini paling berdampak.
- 3D dipertahankan sebagai enhancement, bukan dihapus.

## Verification

- `node lab/camera-shift.test.mjs && node lab/menu.test.mjs && node lab/progress.test.mjs`
- `python lab/verify_content.py`, `python lab/verify_menu_overlay.py`, `python lab/probe_menu_fit.py`
- Lighthouse mobile & desktop (baseline + sesudah), simpan lokal.
- Uji keyboard manual: Tab dari address bar ke footer; Esc tutup menu; reduced-motion; JS/WebGL mati.

## Risks

- **Klaim tanpa bukti** (metrik, benchmark, dampak bank) → rusak kepercayaan. Pakai hanya yang terverifikasi & aman.
- **Kerahasiaan**: data internal Bank Mandiri/nasabah/metrik collection sensitif.
- **Probe CDP flaky** di CI → jangan jadikan required check sebelum stabil.
- **Canonical/OG salah** (base path) → lebih buruk daripada tidak ada.

## Cross-check

Kritik dua arah sudah dijalankan (lihat `.comet-plan/debate/`). Ringkasan divergensi:

| Topik | GPT-6.1 Sol | Claude Sonnet 5.5 |
|---|---|---|
| Kecepatan adopsi tech (BokehPass, tiering) | Jangan kunci solusi teknis sebelum kebutuhan terbukti | Setuju, tapi tetap beri angka budget terukur |
| `robots.txt` | Tidak otomatis wajib | Anggap hygiene pra-launch |
| Label menu (Mission Log/Field Notes) | Boleh editorial | **Ganti label eksplisit** (About/Selected Work/Experience/Resume/Contact) — rekruter tidak mau menebak |
| Angka performa | Budget dari baseline, dua jalur | Butuh angka operasional konkret (mis. JS awal ≤170–250 KB gzip, LCP ≤2,5s, CLS <0,1) |
| Lighthouse | Bukan definisi kualitas | Berguna sebagai gate, tapi **bukan** pengganti audit a11y manual |
| Pengukuran | — | Tambah analytics privacy-conscious (kunjungan case file, klik resume/email) |

**Yang paling tidak disetujui keduanya** (konvergen): menjadikan efek 3D/post-processing sebagai bagian
penting dari rencana awal sebelum Case Files, CTA, dan bukti selesai.

## Open issues

- **Audiens utama & satu CTA utama belum ditetapkan** (recruiter? beasiswa? kolaborator?) — Sonnet menandai ini
  sebagai fondasi yang harus dipaku lebih dulu. → **butuh keputusan Alif.**
- Jalur konversi & pengukuran (analytics) belum ditentukan.
- Sumber bukti & hak publikasi (izin, anonimisasi) untuk tiap case file belum diverifikasi.
- Taksonomi bukti (output vs outcome vs recognition vs verification) belum diterapkan.

---

## Verifikasi yang dibutuhkan (sebelum status naik dari draft)

Klaim teknis berikut dari kedua model **belum dicek ke repo** dan harus diverifikasi:

- [x] ~~Path file yang disebut Sonnet (`assets/js/...`, `assets/css/motion.css`)~~ → **TERVERIFIKASI SALAH.** Repo memakai `js/` dan `css/` (tanpa prefix `assets/`). `assets/` hanya berisi `fonts/`, `images/`, `source/`.
- [x] ~~`js/performance.js` benar-benar mengukur frame time~~ → **TERVERIFIKASI BENAR.** Header: *"tiers are chosen by measured frame time, not a hardcoded DPR"* (`js/performance.js:5`). Jadi kritik SOL soal heuristik device sudah terpenuhi oleh kode saat ini.
- [ ] Klaim "section-moods.js sebagai kontrak tunggal" sudah benar di repo. (terlihat benar dari arsitektur)
- [ ] Jumlah competitive record (7) dan publikasi (2) sesuai data aktual.
- [ ] Base path GitHub Pages (lihat §Constraints).
- [ ] Nama section/label menu saat ini vs usulan label eksplisit (About/Selected Work/Experience/Resume/Contact).

## Catatan kejujuran

- **Halusinasi terdeteksi** di kritik Sonnet: menyebut "Nadia" dan "Belitung" (seharusnya Alif / Jakarta).
  Ini menunjukkan model tidak selalu akurat soal identitas → perlakukan seluruh isi sebagai *usulan*, bukan fakta.
- Kedua model **tidak punya akses repo** — hanya ringkasan yang dikirim Hermes. Klaim file/angka bisa keliru.
- Draft ini **belum diimplementasikan**, belum di-review manusia, dan bukan komitmen.
