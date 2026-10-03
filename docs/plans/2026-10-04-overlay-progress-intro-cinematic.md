# Plan Pengembangan v3: Overlay Menu, Progress Bar, Intro & Cinematic Layer

**Tanggal:** 2026-10-04
**Repo:** `github.com/alifadwitiyap/Persona-alif-porto` (lokal `D:/project/porto-website-persona5-alif`)
**Dasar:** diskusi 2 model Comet — **Claude Sonnet 5.5** + **GPT-6.1 Sol** (4 turn, brief padat)
**Status bukti:** jawaban model = **klaim**, belum diuji di repo.

---

## 1. KEPUTUSAN ALIF (mengunci brief)

| # | Permintaan |
|---|---|
| 1 | Menu jadi **OVERLAY lagi** (dibuka tombol MENU/klik/keyboard) — tapi scroll tetap sumber kebenaran |
| 2 | Kasih **hint** bahwa tombol **M** bisa dipencet |
| 3 | Tambah **efek 3D bergerak saat scroll** + animasi Persona-5 |
| 4 | **Opening/loading screen** bergaya Persona-5 (animasi 3D) sebelum hero |
| 5 | Tambah **story kecil** yang mengalir antar section |
| 6 | **Cum laude (IPK 3.90) + Distinction Bangkit (Top 53/433) → pindah ke Hall of Fame** |
| 7 | **Hapus topbar nav teks** → ganti **progress bar** bertema Persona-5 (loading bar bertahap) |
| 8 | Identity file → **teks LinkedIn terbaru** (3 paragraf) |
| 9 | CTA akhir → **"EVERY PROBLEM HIDES A TREASURE..."** |
| 10 | Transisi **"mask reveal"/cut-paper** antar section (panel diagonal, topeng abstrak CSS/SVG orisinal) |
| 11 | Moment penutup **"All-Out Portfolio"** → "CASE CLOSED. BUT THE NEXT ONE STARTS WITH YOU." |

---

## 2. KONVERGENSI 2 MODEL (kesepakatan kuat)

### a. Scroll tetap SATU-SATUNYA sumber kebenaran
Keduanya tegas: `js/sections.js` (IntersectionObserver + hysteresis) tetap **satu-satunya resolver** section aktif. Overlay menu, progress bar, HUD, story, dan scene **hanya merespons** event dari resolver — **jangan** ada ScrollTrigger/observer/listener kedua yang ikut memutuskan active state.
- Klik menu = **intent navigasi** (hash/scroll), **bukan** penetapan active permanen.
- Saat smooth-scroll, item menu boleh tampil "pending target", tapi `aria-current`, HUD, progress, dan scene tetap ikut resolver.

### b. Overlay menu yang bisa dilewati
Tombol MENU (`aria-controls`/`aria-expanded`), backdrop, Esc, klik item, key **M** → buka/tutup. **Focus trap** saat terbuka, kembalikan fokus saat tutup. Item di-render dari `sectionMoods` (satu sumber).

### c. Progress bar = indikator baca, bukan slider
Topbar jadi: **brand + progress + tombol MENU + hint `M`**. Progress **bertahap per-chapter** (8 segmen), dihitung dari **index chapter aktif** (`--active-progress`), bukan piksel scroll mentah. `aria-live="polite"` **hanya** saat chapter berubah (bukan tiap frame). Bentuk asimetris via `clip-path` + fallback persegi.

### d. Opening/loading screen: enhancement, bukan blocker
- Tampil sekali (`sessionStorage`), tombol **SKIP**, status teks aktual (`PREPARING / READY / CONTINUING WITHOUT 3D`).
- **Batas waktu keras** → auto-exit, hero selalu tersedia.
- **Reduced-motion / no-JS / no-WebGL** → dilewati atau statis singkat.
- Pakai **Page Visibility API** (timer di-throttle saat tab background — jangan sampai state aneh).

### e. Scene 3D: satu render loop
`scene.js` tetap **satu-satunya** pemilik renderer + render loop. Tambah `setSceneMood()`, `setScrollProgress()` (interpolasi), `quality tier`. **Jangan** buat objek/geometry baru saat scroll. `localProgress` (0→1 per section) hanya mengatur **besaran** gerak, bukan identitas chapter.

### f. Transisi cut-paper: lapisan, bukan syarat
Panel diagonal merah/hitam menyapu **singkat** saat section berubah, konten baru sudah tersedia di bawahnya. **Jangan** blokir scroll/pointer lebih lama dari animasinya. Topeng **abstrak CSS/SVG orisinal** (bentuk oblique/irregular) — **bukan** topeng/aset Persona 5.

### g. Risiko yang disorot keduanya
1. **Jank** — render/objek baru saat scroll → mitigasi: reuse scene, interpolasi.
2. **Progress "berbohong"** saat smooth-scroll → update visual saja, state ikut resolver.
3. **Loader menggantung** → batas waktu + Page Visibility.
4. **Copy terlalu "roleplay"** → kalimat pendek, netral, orientasi kerja; hindari istilah/karakter resmi Persona 5.
5. **Reduced-motion** → semua efek bisa dimatikan, konten tetap lengkap.

---

## 3. STORY ARC (konvergensi kedua model)

| Section | Act | Beat (microcopy) |
|---|---|---|
| hero | SIGNAL | "A signal enters the system." |
| chapter-select | CHOOSE | "Pick a route. The record is open." |
| identity-file | IDENTIFY | "The person behind the model." |
| hall-of-fame | PROVE | "Signals become evidence." |
| skill-arsenal | ARM | "Tools are only useful in motion." |
| mission-log | MOVE | "Every role leaves a trace." |
| case-files | DEPLOY | "Evidence, not decoration." |
| open-channel | CONTINUE | "The next signal needs a receiver." |

> Story = **microcopy system** (kicker/HUD/transition), **bukan** narasi fiksi yang menutupi kredibilitas. Heading semantik tetap ("Case Files", dll).

---

## 4. KONTRAK DATA `section-moods.js` v3 (perluasan)

```js
{
  id: 'hall-of-fame',
  progress: { step: 2, label: 'HALL OF FAME' },   // untuk progress bar + menu
  story: {
    act: 'PROVE',
    beat: 'Signals become evidence.',
    transitionIn: 'OPEN THE ARCHIVE',
    transitionOut: 'CASE STATUS: RESOLVED',
  },
  menu: { index: '02', label: 'HALL OF FAME', hud: 'RECOGNITION ARCHIVE' },
  scene: {
    preset: 'proof-lock',                          // mapping ke layout 3D existing
    energy: 0.72,
    scroll: { rotationX: 0.08, rotationY: 0.26, parallaxY: 0.14 },
  },
}
```
> **Catatan:** `preset` harus dipetakan ke layout Three.js yang **sudah ada** (`archiveCore/portraitFrame/constellation/timelineRail/shardField`) — jangan rename tanpa update `scene.js`.

---

## 5. FILE YANG BERUBAH (konvergensi)

| File | Perubahan |
|---|---|
| `index.html` | Hapus nav teks topbar → progress + MENU + hint `M`; markup overlay menu; markup intro; transition overlay; story rail; kartu cum laude + Bangkit di Hall of Fame; CTA akhir baru |
| `js/data/section-moods.js` | Tambah `progress`, `story`, `scene.preset/energy/scroll` per section |
| `js/sections.js` | Tetap resolver tunggal; publish event `portfolio:sectionchange` (id, index, total, progress, localProgress, mood) |
| `js/ui/menu.js` (baru) | Overlay open/close, focus trap, key M, sync active dari resolver |
| `js/ui/progress.js` (baru) | Render progress bar dari event resolver |
| `js/intro.js` (baru) | State machine intro: timeout, skip, sessionStorage, reduced-motion/no-WebGL |
| `js/ui/transitions.js` (baru) | Overlay diagonal/cut-paper saat section change (bila motion diizinkan) |
| `js/ui/story-rail.js` (baru) | Microcopy naratif dari event resolver |
| `js/scene.js` | `setSceneMood()`, `setScrollProgress()`, quality tier; satu render loop |
| `js/main.js` | Wiring: resolver → UI → scene → intro (urutan pasti) |
| `css/*` | topbar/progress, menu-overlay, intro, transitions, mask, reduced-motion |

---

## 6. TASK BREAKDOWN (urutan)

### Fase 1 — Fondasi state & kontrak
1. `section-moods.js`: tambah `progress` + `story` per section.
2. `sections.js`: publish `portfolio:sectionchange` (id, index, total, progress, localProgress, mood).

### Fase 2 — Navigasi
3. Hapus nav teks topbar; tambah progress bar + tombol MENU + hint `M`.
4. `js/ui/progress.js` render dari event.
5. `js/ui/menu.js` overlay + focus trap + key M.

### Fase 3 — Cinematic
6. `js/intro.js` opening screen (timeout + skip + fallback).
7. `js/ui/transitions.js` mask reveal / cut-paper (SVG abstrak orisinal).
8. `js/scene.js` scroll-reactive mood (satu loop, interpolasi).
9. `js/ui/story-rail.js` microcopy.

### Fase 4 — Konten
10. Hall of Fame: kartu cum laude (3.90) + Bangkit (Top 53/433); hapus dari identity-file/hero.
11. Identity file: teks LinkedIn terbaru (3 paragraf).
12. CTA akhir: "EVERY PROBLEM HIDES A TREASURE..." + moment "All-Out Portfolio".

### Fase 5 — QA
13. Verifikasi: no-JS, no-WebGL, reduced-motion, keyboard, timeout intro, mobile, deep-link.

---

## 7. VERIFIKASI

- `lab/verify.py` → 0 console error, tanpa overflow.
- Intro: selalu keluar ≤ batas waktu; skip bekerja; reduced-motion/no-WebGL dilewati.
- Menu overlay: buka/tutup (MENU, M, Esc, backdrop), focus trap, `aria-expanded`.
- Progress: ikut chapter aktif (bukan piksel), `aria-live` hanya saat berubah.
- Transisi: tidak memblokir scroll; tidak ada flash; topeng orisinal.
- Reduced-motion: tanpa animasi berat, konten lengkap.
- Konten: cum laude/Bangkit muncul di Hall of Fame, tidak dobel di identity-file.

---

## 8. CATATAN JUJUR — BUG TOOLING COMET (sesuai instruksi Alif: catat, jangan solve semua)

Diskusi ini **tersendat 5 fix** pada subsistem guard/transport Comet sebelum berhasil. Semua fix **sudah diterapkan + regression test hijau** di skill `comet-ai-chat`:

| # | Bug | Fix | Test |
|---|---|---|---|
| 1 | `_clear_editor` pakai `execCommand` → no-op di editor **Lexical** → turn 2+ append | Ganti ke KeyboardEvent Ctrl+A/Backspace + **verifikasi** editor kosong | `test_prompt_transport.py` (2 test baru) |
| 2 | `HTML_DEBUG` flag false-positive saat prosa menyebut `<html>` | Regex jadi `^\s*<tag` (hanya baris **diawali** tag) | `test_output_firewall.py` |
| 3 | `LOGIN_WALL` flag "log in" di tengah kalimat ("non-modal... show()") | Regex `log in` jadi standalone + `please (sign in\|log in)` | `test_output_firewall.py` |
| 4 | `HTML_DEBUG` flag jawaban valid berisi **contoh kode HTML** | Heuristik proporsi: tag harus **mayoritas** baris | `test_output_firewall.py` |
| 5 | **Arsitektural**: label prose-prone (`HTML_DEBUG`/`LOGIN_WALL`) mem-flag jawaban panjang | Gate panjang di `attempt_guard` (error transport asli selalu pendek) | `test_attempt_guard.py` |

**Sisa yang BELUM diperbaiki** (butuh keputusan arsitektural, di luar scope proyek ini):
- **`read_latest_answer` salah pilih blok di turn ≥3** → memicu `FINAL_INVALID` walau jawaban valid ada di halaman. **Solusi sementara yang dipakai:** brief dipadatkan jadi **4 turn** (dari 9) → kedua model selesai penuh. Ini workaround, **bukan** fix.
- **`model drift`** berulang (`GPT-5.6 Terra` terbaca aktif di sesi Sonnet) — preferensi model Perplexity per-akun; lock sudah ada tapi belum sempurna.

> Rekomendasi: bug reader (`read_latest_answer`) sebaiknya ditangani sebagai task tersendiri di repo `comet-ai-chat`, bukan di sesi proyek ini.

---

## 9. OPEN QUESTIONS

1. Progress bar: 8 segmen (termasuk chapter-select & hero) atau 6 chapter konten saja?
2. Intro screen: tampil tiap kunjungan atau sekali per sesi (`sessionStorage`)?
3. "All-Out Portfolio" dipicu saat **semua proyek dilihat** atau saat **klik CTA**?
4. Story copy: bahasa Inggris (konsisten dgn UI) atau Indonesia?
