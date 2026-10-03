# Plan Pengembangan: Chapter Select, Hall of Fame & Konsistensi Section

**Tanggal:** 2026-10-03
**Repo:** `github.com/alifadwitiyap/Persona-alif-porto` (lokal `D:/project/porto-website-persona5-alif`)
**Dasar:** diskusi 3 model Comet — **Claude Sonnet**, **GPT-6 Sol**, **Kimi K3** (paralel, brief identik, 9 chunk <800 char)
**Status bukti:** jawaban model = **klaim**, belum diuji di repo. Angka/klaim di bawah belum diverifikasi kecuali ditandai.

---

## 1. KEPUTUSAN ALIF (mengunci brief)

| # | Keputusan |
|---|---|
| 1 | Menu navigator **BUKAN overlay yang diklik** lagi. Jadi **section "chapter select" besar setelah hero**. Klik item = scroll ke section. Tombol **MENU tetap ada** (lompat cepat). |
| 2 | **Nama section konsisten dengan label menu**: IDENTITY FILE, HALL OF FAME, SKILL ARSENAL, MISSION LOG, CASE FILES, OPEN CHANNEL. |
| 3 | **Section baru "Hall of Fame"** setelah IDENTITY FILE → **7 section**. Isi: award, publikasi, cum laude. |
| 4 | IDENTITY: **hapus internship (Telkom)**. Location → **"Jakarta, ID"**. Tag → **"AI & Data" + "Leadership"**; **hapus "Open to work"**. |
| 5 | Bangkit: entry DTS Fresh Graduate Academy → **"Bangkit Academy"**; tekankan **Distinction** + **TOP 53 project**; tambah ikon "see more" → LinkedIn. |
| 6 | Skills: grup Data **tambah "Talend"**; tambah **"Agentic AI"**. |
| 7 | CASE FILES: update ke **6 pinned repo terbaru**. |
| 8 | Tagline kontak → **"Every problem has a solution. Let's find yours."** |
| 9 | Fokus: **kembangkan plan**, bukan solve bug. Bug → solusi sementara + catat di akhir. |

---

## 2. KONVERGENSI 3 MODEL (kesepakatan kuat)

### a. Arsitektur: overlay → section navigasi statis
Ketiganya sepakat **persis**:
- Buat `<section id="chapter-select">` **tepat setelah `#hero`**, isinya `<nav>` + daftar **anchor asli** (`href="#identity-file"`).
- **Hapus seluruh state overlay**: `isMenuOpen`, focus trap, body scroll-lock, backdrop, `aria-modal`, tombol close, shortcut Escape khusus overlay.
- Tombol **MENU/START jadi `<a href="#chapter-select">`**, bukan `<button>` pembuka modal.
- **Scroll tetap sumber kebenaran** — klik menu hanya intent; `IntersectionObserver` yang menetapkan active section/HUD/preset scene.
- Shortcut **M** → `scrollIntoView(#chapter-select)` (bukan buka modal), hormati reduced-motion, abaikan saat fokus di input/textarea.

**Alasan (unanimous):** anchor native memberi no-JS fallback, deep-link, browser history, SEO, keyboard native — tanpa framework.

### b. Satu registry data, bukan array menu kedua
- `section-moods.js` = **satu-satunya** sumber `menu.index/label/hud`, urutan, HUD, dan preset scene.
- **Jangan** bikin array menu terpisah → mencegah label drift (section vs menu vs HUD).
- `chapter-select` **TIDAK muncul sebagai chapter ketujuh** di daftar (filter).

### c. Hall of Fame = data + renderer terpisah
- Konten award/publikasi di file **baru** `js/data/hall-of-fame.js` — **jangan** campur ke `section-moods.js` (registry navigasi ≠ konten domain).
- Struktur 3 blok: **Academic** (cum laude, IPK 3.90, Kaltim Tuntas) · **Competitions** (4 award) · **Publications** (IEEE, Sinta 2).
- Treatment: "achievement dossier" editorial, bukan trophy shelf. SVG/CSS orisinal.

### d. Three.js: jangan recreate scene
- `chapter-select` **tidak** memicu `setPreset()` / alokasi baru.
- Preset diinterpolasi; `pixelRatio = min(devicePixelRatio, 1.5)`; pause saat tab hidden; render-on-demand bila memungkinkan.
- Reduced-motion → render statis sekali.

### e. Risk yang disorot ketiganya
1. **Label drift** — hard-coded label di HTML/CSS/JS → render semua dari registry.
2. **Klaim award/publikasi tidak akurat** — wajib verifikasi title/venue/tahun/DOI sebelum deploy.
3. **"Sinta 2"** — status indeksasi butuh bukti; jangan tampilkan badge tanpa validasi.
4. **Mobile overflow** — judul paper panjang → `overflow-wrap:anywhere`, 1 kolom.
5. **Legal** — komposisi/SVG/copy orisinal, bukan aset/UI/font Persona 5.

---

## 3. DIVERGENSI (butuh keputusan Alif)

| Isu | Claude | GPT-6 | Rekomendasi |
|---|---|---|---|
| **Rename ID section?** (`profile`→`identity-file`, dst.) | Ya, bersihkan vocabulary | Ya, dengan `route` eksplisit | **Ya** (Alif minta konsisten) — tapi **wajib migrasi semua consumer** (scene.js key, hash lama, CSS `data-section`). Lihat Task 02. |
| **`chapter-select` di registry?** | Masuk registry (`kind:"utility"`) | **Tidak** masuk registry | **Tidak masuk** (lebih sederhana; section ini bukan destination 3D). HUD/CSS state tetap di-handle observer terpisah. |
| **Bentuk registry** | Array + `CHAPTER_TARGETS` derived | Array + `section`/`route`/`navigable` | **Array**, dengan `id, order, menu{index,label,hud}, scene{preset,aspect}` + `CHAPTER_TARGETS` derived. Tambah `kind` bila perlu. |
| **ID baru vs lama** | usul id baru (`identity-file`) | usul id baru + `route` | **Rename**, simpan peta migrasi lama→baru untuk jaga deep-link lama. |

> **Catatan Kimi (berbeda fokus):** Kimi tidak bahas arsitektur — dia **verifikasi metadata repo**. Temuannya masuk §6.

---

## 4. ARSITEKTUR TARGET

```
#hero
#chapter-select        ← BARU: navigator besar (bukan overlay), tepat setelah hero
#identity-file         ← dulu #profile
#hall-of-fame          ← BARU
#skill-arsenal         ← dulu #skills
#mission-log           ← dulu #experience
#case-files            ← dulu #projects
#open-channel          ← dulu #contact
```

**Aliran data (satu arah — scroll tetap sumber kebenaran):**
```
scroll → IntersectionObserver → active section id
                              ├→ HUD (menu.hud)
                              ├→ active link di chapter-select
                              └→ scene.setPreset(scene.preset)
klik chapter link (anchor native) → browser scroll → observer menetapkan active
tombol MENU / key M → scrollIntoView(#chapter-select)
```

---

## 5. KONTRAK DATA `section-moods.js` v2

Ubah dari object-map → **array** (Claude & GPT-6 sepakat), dengan `CHAPTER_TARGETS` derived:

```js
export const sectionMoods = [
  { id: "hero",           order: 0, menu: { index: "00", label: "START",          hud: "Entry Point" },
    scene: { preset: "wide" } },
  { id: "identity-file",  order: 1, menu: { index: "01", label: "IDENTITY FILE",  hud: "Identity File" },
    scene: { preset: "portrait" } },
  { id: "hall-of-fame",   order: 2, menu: { index: "02", label: "HALL OF FAME",   hud: "Hall of Fame" },
    scene: { preset: "standard" } },
  { id: "skill-arsenal",  order: 3, menu: { index: "03", label: "SKILL ARSENAL",  hud: "Skill Arsenal" },
    scene: { preset: "constellation" } },
  { id: "mission-log",    order: 4, menu: { index: "04", label: "MISSION LOG",    hud: "Mission Log" },
    scene: { preset: "timelineRail" } },
  { id: "case-files",     order: 5, menu: { index: "05", label: "CASE FILES",     hud: "Case Files" },
    scene: { preset: "shardField" } },
  { id: "open-channel",   order: 6, menu: { index: "06", label: "OPEN CHANNEL",   hud: "Open Channel" },
    scene: { preset: "archiveCore" } },
];

// chapter select = 6 destination (kecuali hero); chapter-select section sendiri TIDAK di sini
export const CHAPTER_TARGETS = sectionMoods.filter(s => s.id !== "hero");
export const getSectionMood = (id) => sectionMoods.find(s => s.id === id);
```

> **Preset scene harus dipetakan** ke 4 layout Three.js yang sudah ada (`archiveCore`, `portraitFrame`, `constellation`, `timelineRail`, `shardField`) — **jangan** rename tanpa update `scene.js`. Lihat Task 02.

**Peta migrasi ID lama → baru** (untuk deep-link + `scene.js`):
`profile→identity-file`, `skills→skill-arsenal`, `experience→mission-log`, `projects→case-files`, `contact→open-channel`.

---

## 6. UPDATE KONTEN

### 6.1 `js/data/hall-of-fame.js` (BARU)
```js
export const hallOfFame = {
  academic: { label: "Graduate / Cum Laude", gpa: "3.90", scale: "4.00" },
  awards: [
    { title: 'Awardee "Kaltim Tuntas" Scholarship', rank: "Awardee", year: "—" },
    { title: "Data Competition ISFEST UMN", rank: "1st Winner", year: "2021" },
    { title: "Statistics In Action Enthusiastics Competition", rank: "Finalist", year: "2021" },
    { title: "Data Analysis Competition IFest UNPAD", rank: "1st Winner", year: "2022" },
  ],
  publications: [
    { title: "Study on the Dynamics of COVID-19 Cases in Achieving Herd Immunity in Indonesia",
      venue: "IEEE", badge: "IEEE", url: "" /* TODO: DOI */ },
    { title: "Balinese Script Handwriting Recognition Using Faster R-CNN",
      venue: "Sinta 2", badge: "Sinta 2", url: "" /* TODO: URL */ },
  ],
};
```
> ⚠️ **Verifikasi wajib sebelum deploy** (3 model menyorot ini): tahun, venue, DOI/URL, status Sinta. Badge "Sinta 2" jangan tampil tanpa bukti. Isi `year` yang kosong dari sertifikat.

### 6.2 `js/data/profile.js`
- `location`: `"Bandung, West Java, Indonesia"` → **`"Jakarta, ID"`**.
- Tag panel (`index.html`): buang `Bandung, ID`/`Open to work`; jadi **`AI & Data`**, **`Leadership`**.
- `skills`: grup **Data & Cloud** + **`Talend`**; tambah **`Agentic AI`** (grup Core atau grup baru "Applied AI").
- `about`: **hapus frasa internship Telkom** bila ada.

### 6.3 `js/data/experience.js`
- Entry `dts-arch` (`Digital Talent Scholarship — Fresh Graduate Academy`) → **`Bangkit Academy`**.
- Points: tekankan **Distinction** + **TOP 53 project**; tambah field/link **`more: linkedinUrl`** untuk ikon "see more".
- **Hapus** entry `telkom` (internship).

### 6.4 `js/data/projects.js` → 6 pinned repo
| Repo | Lang | ★ | Catatan |
|---|---|---|---|
| NDETCStemmer | Python | 13 | `featured: true` (paling relevan NLP) |
| unword | CSS | 0 | ⚠️ deskripsi belum terverifikasi (Kimi) |
| online-store-digital-records | JavaScript | 1 | "Tugas Besar DIPL" |
| IBM-DATA-SCIENCE-CAPSTONE | Jupyter | 0 | ⚠️ deskripsi belum terverifikasi (Kimi) |
| C22-PS168-Machine-Learning | Python | 0 | ⚠️ **FORK** dari TheRisingStarTeam — beri badge FORK (Kimi) |
| WA-Bulk | Python | 0 | Streamlit + OpenWA + SQLite |

> ⚠️ **Kimi menemukan** `unword` & `IBM-DATA-SCIENCE-CAPSTONE` deskripsi belum terverifikasi, dan `C22-PS168` adalah **fork**. Jangan shipping deskripsi hasil tebakan — salin dari halaman repo, atau beri badge FORK + peran spesifik Alif.

### 6.5 `index.html`
- Tagline kontak → **"Every problem has a solution. Let's find yours."**

---

## 7. TASK BREAKDOWN (urutan pengerjaan)

### Fase 1 — Registry & vocabulary (fondasi, semua bergantung ini)
- **Task 01**: `section-moods.js` → array + `CHAPTER_TARGETS` + `getSectionMood`; tambah `order`.
- **Task 02**: Rename ID DOM section (`profile→identity-file`, dst.) + update **semua consumer**: `scene.js` (layout key), `sections.js` (SECTIONS array), `css/variables.css` (`data-section`), hash lama (migrasi). **Verifikasi**: tidak ada ID lama tersisa; deep-link lama tetap jalan via redirect hash.
- **Task 03**: Render `section__index` + `section__title` + HUD **dari registry** (hapus hard-code).

### Fase 2 — Chapter select section
- **Task 04**: Markup `<section id="chapter-select">` setelah `#hero` (nav + `<ol data-chapter-list>`).
- **Task 05**: `js/chapter-select.js` render anchor dari `CHAPTER_TARGETS`.
- **Task 06**: Hapus overlay: markup `#navigator`, `js/navigator.js`, CSS overlay; ubah tombol MENU/START jadi anchor; key M → scroll ke `#chapter-select`.
- **Task 07**: `sections.js` — observe 7 section; chapter-select di-handle terpisah (HUD netral, tanpa preset).

### Fase 3 — Hall of Fame
- **Task 08**: `js/data/hall-of-fame.js` + renderer; markup `<section id="hall-of-fame">` setelah identity-file.
- **Task 09**: CSS dossier (academic stamp, award log, publication cards) — orisinal, responsive, reduced-motion.
- **Task 10**: `scene.js` preset untuk `hall-of-fame` (reuse objek, jangan recreate).

### Fase 4 — Konten
- **Task 11**: profile.js (Jakarta, tag, Talend, Agentic AI, hapus internship).
- **Task 12**: experience.js (Bangkit Academy, Distinction + TOP 53, ikon see-more→LinkedIn, hapus Telkom).
- **Task 13**: projects.js (6 pin + badge FORK + deskripsi terverifikasi).
- **Task 14**: tagline kontak.

### Fase 5 — Verifikasi
- **Task 15**: `lab/verify.py` (0 error, no overflow) + probe chapter-select + reduced-motion + no-JS + deep-link + mobile.

---

## 8. RISIKO & MITIGASI

| Risiko | Mitigasi |
|---|---|
| **Rename ID merusak scene.js/CSS/hash** | Peta migrasi + update semua consumer sekaligus (Task 02); cari literal ID lama sampai 0 |
| **Label drift** (section vs menu vs HUD) | Semua dari registry; audit string hard-code |
| **Klaim award/publikasi salah** | Verifikasi ke sertifikat/DOI/URL sebelum deploy; jangan tampilkan badge Sinta tanpa bukti |
| **Deskripsi repo mengarang** | Salin dari halaman repo; badge FORK untuk C22-PS168 |
| **Scene recreate saat lewat chapter-select** | chapter-select tidak dispatch preset; scene reuse |
| **Motion berlebih** | Reduced-motion → statis; HUD/CSS state tetap benar |
| **Mobile overflow** (judul paper panjang) | 1 kolom, `overflow-wrap:anywhere`, uji 320/375/768/1440 |
| **Legal** | SVG/copy/komposisi orisinal |

---

## 9. VERIFIKASI

- `python lab/verify.py http://127.0.0.1:8077/index.html` → **0 console error**, tanpa overflow.
- Manual: 7 section + chapter-select; klik chapter → scroll; key M; deep-link `#hall-of-fame`; Back/Forward.
- No-JS: anchor chapter tetap jalan.
- Reduced-motion: tanpa animasi berat, konten lengkap.
- Keyboard: Tab/Enter di chapter list; focus-visible kontras.
- Mobile 320/375/768/1440: tidak ada overflow.
- Konten: setiap award/publikasi dicek ke sumber primer.

---

## 10. CATATAN — SOLUSI SEMENTARA & BUG (sesuai instruksi Alif)

> Alif minta: **jangan solve bug**, cari solusi sementara + catat.

1. **Overlay navigator yang sudah dibangun** (`js/navigator.js`, `#navigator`, CSS overlay) akan **digantikan** — bukan diperbaiki. **Solusi sementara**: biarkan ada sampai Task 06; jangan hapus dulu supaya situs tetap berfungsi selama migrasi bertahap.
2. **Rename ID section** berisiko memutus `scene.js` yang key-nya pakai ID lama. **Solusi sementara**: tambah `scene.preset` di registry yang **memetakan** ke layout lama (`portraitFrame`, `constellation`, `timelineRail`, `shardField`, `archiveCore`) sehingga `scene.js` tidak perlu diubah besar.
3. **`probe_navigator.py`** hardcode port 8079 & menguji overlay yang akan dihapus. **Solusi sementara**: tulis probe baru untuk chapter-select; probe lama diarsipkan.
4. **Deep-link lama** (`#profile`, `#skills`, ...) akan 404 hash. **Solusi sementara**: peta redirect hash lama→baru di `main.js` (tanpa mengubah histori).
5. **Deskripsi `unword` & `IBM-DATA-SCIENCE-CAPSTONE` belum terverifikasi** (Kimi). **Solusi sementara**: pakai deskripsi netral pendek sampai disalin dari halaman repo.
6. **`C22-PS168` adalah fork**. **Solusi sementara**: beri badge FORK, tautkan ke pin Alif, tekankan peran spesifik.
7. **Verifikasi tahun/venue award** belum lengkap. **Solusi sementara**: field `year`/`url` dikosongkan sampai diisi dari sertifikat; jangan tampilkan badge Sinta tanpa bukti.
8. **BUG (pra-ada, ditemukan Task 05/06): heading section `[data-swipe]` tidak pernah muncul.** `.section__title[data-swipe]` memulai dengan `clip-path: inset(0 100% 0 0)` (area terlihat = 0). IntersectionObserver `rio` di `sections.js` memakai `threshold: 0.12`, dan IO menghitung rasio terhadap area yang **sudah di-clip** → `isIntersecting:false, ratio:0` selamanya, jadi `.is-in` tak pernah ditambahkan dan judul tetap `opacity:0`. **Bukti**: pada build HEAD tanpa perubahan pun (`worktree` 5e80e0e) semua `*-title` tetap `is-in:false, opacity:0`; mengukur ulang setelah `clip-path:none` → `ratio:1`, `.is-in` langsung true. **Solusi sementara**: JANGAN set `threshold` pada `[data-swipe]` (pakai `threshold:0`), atau pindahkan clip ke pseudo-element (`::after`) sehingga elemen punya area non-nol, atau mulai dari `clip-path: inset(0 0 0 0)` + `opacity:0` saja. Ini di luar scope Task 05/06 (chapter-select), yang sudah terverifikasi benar (`lab/probe_chapter_select.py`, 22/22).

---

## 11. OPEN QUESTIONS

1. **Badge "Sinta 2"** — tampilkan sekarang atau tunggu URL verifikasi? (Rekomendasi: tunggu.)
2. **Preset scene Hall of Fame** — pakai `standard` (reuse) atau layout baru? (Rekomendasi: reuse, sesuai 3 model.)
3. **Urutan award** — kronologis (2021→2022) atau terbaru dulu? (Rekomendasi: kronologis.)
4. **Deskripsi `unword`** — teks resmi dari halaman repo? (Belum bisa diverifikasi otomatis.)
