Goal

Menyelesaikan enhancement terarah untuk v2 MVP alif-3d-portfolio, bukan redesign atau rebuild. Fokusnya adalah memperkuat konsistensi visual 4♥LIFE / Signal Archive, menstabilkan perpindahan section, memoles empat motion Three.js yang sudah ada, serta memastikan sticky portrait dan scene tetap responsif, legal, dan aksesibel.

Arah visual tetap high-contrast, kinetic, urban-comic dengan prinsip graphic-editorial orisinal: headline tebal-condong, panel potong diagonal, sticker label, paper-cut, halftone, dan UI wipe. Tidak ada penggunaan atau peniruan aset, font, karakter, logo, musik, istilah, layout, maupun screen composition resmi Persona 5.

Scope

Menyempurnakan sistem section aktif di js/sections.js agar tidak flicker atau menyisakan state basi ketika scroll cepat.

Menjadikan sectionMoods sebagai kontrak data terdokumentasi untuk CSS/UI dan Three.js.

Menambah preset mood scene berbasis aspect ratio: portrait, standard, dan wide.

Memoles empat motion yang sudah ada, bukan menambah motion baru:

Career Signal Path pada Experience.

Skill Constellation pada Skills.

Warp Burst pada perubahan section.

Portrait Orbit pada Hero/Profile.

Memperkuat sticky portrait/morph terhadap viewport pendek, resize, dan orientationchange.

Memvalidasi quality adaptation, reduced motion, keyboard/touch, legal boundary, dan regresi lintas viewport.

Status sudah selesai

Lima font sudah self-hosted di assets/fonts/*.woff2, dengan deklarasi di css/fonts.css.

Brand 4♥LIFE sudah diterapkan pada top bar dan favicon.

Enam section aktual sudah tersedia: hero, profile, skills, experience, projects, contact.

Experience sudah memakai konsep Career Signal Path: timeline HTML adalah sumber konten; node Three.js hanya visualisasi.

Hero portrait sudah sticky dan memiliki morph melalui css/layout.css, initPortraitMorph() di js/main.js, serta custom property --morph.

Projects sudah memakai data statis dari tepat dua pinned repository.

Tidak ada Repository Intel atau Live GitHub GraphQL; keduanya tetap di luar scope.

Non-goals

Tidak membangun ulang struktur HTML, CSS architecture, font system, brand, favicon, scene Three.js, atau portrait morph.

Tidak menambah section, pinned repository, sumber data dinamis, GraphQL, API polling, atau rate-limit handling.

Tidak menambah framework, bundler, CDN, GSAP, atau tween library.

Tidak mengubah behavior kamera menjadi dolly Z.

Tidak menambah animasi Three.js kelima atau mengubah enhancement ini menjadi redesign visual besar.

Tidak mengganti timeline HTML Experience dengan canvas/Three.js.

Constraints

Stack tetap static HTML, CSS native, vanilla JavaScript ES modules, dan Three.js r169 lokal.

Font yang sudah lokal tetap dipakai; audit hanya memeriksa hierarchy, fallback, lisensi, dan request asset, bukan mengganti font tanpa masalah terverifikasi. Font open-source seperti Inter tersedia di bawah SIL Open Font License; penggunaan dan redistribusi font perlu tetap mengikuti lisensi yang disertakan.
fontsquirrel
+2

initSections({ onChange }) yang sudah ada di v2 adalah satu-satunya jalur koordinasi antar-section; jangan memakai window custom event global.

Hanya ada satu active section dengan state minimum: { id, previousId, direction, progress }.

UI memakai class/data attribute transien untuk wipe dan reveal; tidak memelihara lifecycle permanen entering → active → leaving untuk semua section.

Perubahan scene memakai target transform yang sudah dialokasikan dan interpolasi berbasis deltaTime.

Jumlah final shard/partikel, cap DPR, dan status BokehPass tidak dikunci dalam plan; semuanya dikalibrasi melalui profiling perangkat target.

prefers-reduced-motion harus berlaku di CSS dan JavaScript.

Decorative UI bersifat aria-hidden; portrait memiliki alt bermakna.

Decisions
Resolver section

js/sections.js hanya memilih satu section aktif. Pilihan dibuat secara deterministik:

Ambil kandidat dari IntersectionObserver.

Pilih intersection ratio tertinggi.

Jika ratio berdekatan, gunakan arah scroll sebagai tie-break.

Jika masih ambigu, pilih section yang pusatnya paling dekat ke pusat viewport.

Terapkan hysteresis agar active ID tidak berubah bolak-balik di batas antar-section.

Saat ID berubah, panggil callback eksplisit yang sudah ada:

js
initSections({
  onChange({ id, previousId, direction, progress }) {
    ui.setActive({ id, previousId, direction });
    scene.setActive(id, direction, { progress });
  }
});

progress dapat diperbarui untuk portrait morph atau emphasis lokal, tetapi perpindahan mood/warp hanya dipicu ketika id berubah.

Kontrak sectionMoods

Buat/rapikan js/data/section-moods.js sebagai sumber data tunggal. UI mengambil accent dan motif dari tabel ini; scene mengambil layout dan motion mode. Kontrak minimal:

js
export const sectionMoods = {
  profile: {
    accent: "#ffb000",
    ui: { motif: "paper-cut", titleOffset: "left" },
    scene: {
      layout: "portraitOrbit",
      motion: "orbit",
      presets: {
        portrait: {},
        standard: {},
        wide: {}
      }
    }
  }
};

Dokumentasikan arti setiap field di header file atau README singkat: accent, ui.motif, ui.titleOffset, scene.layout, scene.motion, serta scene.presets. Angka Three.js tidak boleh tersebar sebagai magic number dalam scene.js.

Preset responsif scene

Setiap mood yang memakai scene memiliki override:

portrait: framing sempit/tinggi, shard spread lebih terkendali, core tidak menutup copy.

standard: baseline desktop/tablet normal.

wide: offset lateral lebih longgar dan framing komposisi desktop lebar.

Pemilihan preset dilakukan dari aspect ratio viewport. Hasil target tetap di-clamp terhadap focal area dan batas visual scene agar core, shard, serta ring tidak masuk ke area CTA atau text utama. Quality adaptation hanya mengurangi density/efek setelah profiling, tanpa mengubah storytelling motion.

Sticky portrait

Portrait tetap DOM/sticky sebagai fokus identitas.

--morph dihitung dari bounds container portrait lalu di-clamp 0–1; jangan bergantung pada nilai scrollY absolut.

Audit parent sticky untuk memastikan tinggi scroll cukup dan tidak tertahan ancestor overflow.

Pada resize dan orientationchange, jadwalkan recalculation dengan requestAnimationFrame atau debounce agar bounds, --morph, aspect preset, dan portrait framing diperbarui setelah layout stabil.

Jika sticky tidak didukung atau viewport terlalu pendek, fallback ke portrait position: relative dengan state morph aman.

alt menjelaskan subjek/konteks profesional, bukan “portrait” atau “image”.

Empat motion
Motion	Peran	Trigger
Career Signal Path	Node/line 3D memberi emphasis pada item timeline HTML aktif; HTML tetap source of truth	Experience aktif; scroll/focus item timeline
Skill Constellation	Cluster shard/node menegaskan grup skill aktif	Skills aktif; progress atau focus grup
Warp Burst	Core/shard/ring membuat jembatan singkat sebelum scene settle ke mood baru	Hanya ketika active section berubah
Portrait Orbit	Ring/shard membentuk frame bergerak ringan di belakang portrait sticky	Hero → Profile dan Profile → Skills
Tasks
Task 01: Audit baseline enhancement v2

Files: index.html, css/*.css, js/main.js, js/sections.js, js/ui.js, js/scene.js, js/performance.js, js/portrait.js, js/data/*.js, assets/fonts/*, assets/icons/*
Depends: Tidak ada.
Verify: Baseline kondisi selesai dicatat tanpa rebuild: lima font lokal, 4♥LIFE, enam section, sticky --morph, Career Signal Path, dua pinned repo, empat motion, console error, status BokehPass, dan perilaku pada viewport target.

Task 02: Dokumentasikan dan pusatkan kontrak sectionMoods

Files: js/data/section-moods.js, js/main.js, js/ui.js, js/scene.js, css/variables.css, README.md bila ada
Depends: Task 01.
Verify: Keenam section memiliki satu entri mood; arti field UI/scene terdokumentasi; accent, motif, layout, dan motion dibaca dari tabel tunggal tanpa mapping warna atau mode yang duplikat.

Task 03: Kuatkan resolver active section dan tie-break

Files: js/sections.js, js/main.js, js/ui.js, js/scene.js
Depends: Task 02.
Verify: initSections({ onChange }) tetap dipakai tanpa global event; resolver memakai ratio tertinggi, arah scroll, kedekatan pusat viewport, dan hysteresis; hanya satu active ID/previousId; scroll cepat tidak memicu flicker atau state lama.

Task 04: Perbarui preset Three.js per aspect ratio

Files: js/data/section-moods.js, js/scene.js, js/performance.js, js/main.js
Depends: Task 02, Task 03.
Verify: Motion memakai preset portrait, standard, dan wide; target core/ring/shard di-clamp terhadap focal area; perubahan resize memilih preset baru tanpa membuat material/geometry baru; density dan BokehPass masih berupa hasil kalibrasi, bukan angka asumsi.

Task 05: Hardening sticky portrait dan orientation change

Files: css/layout.css, css/responsive.css, js/main.js, js/portrait.js, index.html
Depends: Task 03, Task 04.
Verify: --morph berasal dari container bounds dan ter-clamp; parent sticky aman; resize/orientationchange menghitung ulang setelah layout stabil; fallback relative bekerja pada viewport pendek/non-sticky; alt potret bermakna.

Task 06: Poles transisi UI dan Warp Burst

Files: js/ui.js, js/sections.js, js/scene.js, css/animations.css, css/components.css
Depends: Task 02, Task 03.
Verify: UI memakai class transien dengan transform/opacity; wipe merespons direction secara halus; Warp Burst hanya sekali ketika ID berubah; token transition membatalkan callback lama; keyboard, touch, dan pointer tidak terblokir.

Task 07: Poles Career Signal Path, Skill Constellation, dan Portrait Orbit

Files: js/scene.js, js/sections.js, js/ui.js, js/portrait.js, js/data/section-moods.js, index.html
Depends: Task 04, Task 05, Task 06.
Verify: Timeline HTML tetap sumber konten Experience; focus/scroll hanya mengubah emphasis visual node; Skill Constellation mengikuti grup aktif; Portrait Orbit tidak menyebabkan overlap/jump pada sticky portrait.

Task 08: Verifikasi akhir performance, a11y, legal, dan regresi

Files: index.html, css/*.css, js/*.js, js/data/*.js, assets/**/*
Depends: Task 07.
Verify: Profiling dilakukan pada perangkat target sebelum menetapkan konfigurasi quality; CSS/JS keduanya menghormati reduced motion; keyboard/focus/kontras/alt/touch lulus; Projects tetap dua pinned repo statis; tidak ada GraphQL, Repository Intel, asset tak berlisensi, atau elemen franchise.

Verification

Uji scroll lambat, scroll cepat, arah naik/turun, anchor jump, dan batas antar-section: active ID tidak flicker dan scene hanya menyelesaikan target terakhir.

Uji 375×667, 768×1024, 1440×900, layar wide, dan mobile landscape: target scene tidak menutupi heading, copy, maupun CTA.

Uji resize serta orientationchange: sticky portrait tidak meloncat, --morph valid, dan preset mood diperbarui setelah layout stabil.

Uji Experience dengan keyboard: timeline HTML dapat dibaca dan difokuskan tanpa canvas; node 3D hanya menambah orientasi visual.

Uji Projects: tepat dua card/repo statis tetap ditampilkan dan dapat diakses via mouse, touch, serta keyboard.

Uji prefers-reduced-motion: reduce: tanpa warp burst, orbit kontinu, pulse/partikel agresif, atau UI wipe cepat; hierarchy content tetap jelas.

Audit Network dan console: tidak ada 404, error, CDN/font request tak diinginkan, atau object allocation yang mudah dihindari di animation loop.

Risks
Risiko	Mitigasi
Section aktif flicker pada perbatasan viewport	Ratio tertinggi, tie-break arah scroll, kedekatan pusat viewport, dan hysteresis
Scene tidak cocok pada portrait/wide display	Preset aspect ratio, clamp focal area, recalc pada resize dan orientation
BokehPass/motion menurunkan responsivitas	Profiling perangkat nyata; quality adaptation bertahap; final density tidak diasumsikan di plan
Sticky portrait gagal karena ancestor CSS/viewport pendek	Audit overflow dan tinggi container; fallback relative; uji mobile landscape/orientation
UI dan 3D drift secara visual	sectionMoods menjadi kontrak data tunggal dan terdokumentasi
Motion mengganggu pengguna sensitif	Satu sumber prefers-reduced-motion dibaca CSS dan JS; lompat ke final state
Enhancement melebar menjadi redesign	Delapan task dibatasi pada sistem v2 yang ada; tidak ada section, API, repo, atau motion baru
Risiko kemiripan IP	Gunakan vocabulary/geometry/microcopy “Signal Archive” orisinal dan audit asset akhir
Cross-check

Sudah selesai dan dipertahankan: font self-hosted, 4♥LIFE top bar/favicon, enam section, Career Signal Path, sticky portrait morph, dua pinned repo.

Tie-break sections.js: Task 03.

Kontrak sectionMoods: Task 02.

Preset 3D responsif per aspect ratio: Task 04.

Orientationchange dan fallback sticky portrait: Task 05.

Empat motion saja, tanpa motion baru: Task 06–07.

Tanpa GraphQL/Repository Intel: Scope, Non-goals, Task 08.

Verifikasi akhir: Task 08 dan bagian Verification.

Open issues

Nama, lisensi, ukuran file, dan peran final dari lima font lokal perlu dikonfirmasi sebelum menentukan aset font yang layak dipreload.

Ambang hysteresis resolver section dan aturan capability tier perlu dikalibrasi dari hasil profiling perangkat target.

Copy alt portrait final perlu disesuaikan dengan nama serta identitas profesional pemilik portfolio.