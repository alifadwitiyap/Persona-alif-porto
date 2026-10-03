PLAN FINAL — alif-3d-portfolio
Goal

Membangun portfolio statis 3D untuk Alif Adwitiya Pratama dengan identitas visual “Mission Archive / LIFE//COMBAT INTERFACE”: profesional, sinematik, cepat, dan tetap mudah dibaca.

Tagline wajib pada hero dan footer:

Built 4 Life[♥] — From real life needs to real life solutions.

Arah kreatif mengambil energi desain high-contrast, editorial, diagonal, kinetic UI ala JRPG modern yang sering diasosiasikan dengan Persona-5, tetapi seluruh eksekusi harus orisinal: tanpa memakai logo, karakter, font, musik, screenshot, nama elemen, aset, atau layout yang meniru Persona 5 secara langsung.

Scope

Portfolio satu halaman statis dengan section:

Hero / archive access

Profile / personnel file

Skills / loadout

Projects / mission log

GitHub / repository intel

Contact / uplink

Three.js lokal r169 untuk visual hero dan transisi antar-section.

HTML semantik untuk seluruh konten inti.

CSS native untuk layout, panel, typography, UI motion, dan pseudo-DOF DOM.

Vanilla JavaScript ES modules untuk data, render project cards, interaksi, tier performa, dan scene.

Import map serta vendor lokal:

three.module.js

EffectComposer.js

RenderPass.js

BokehPass.js

OutputPass.js

Data GitHub statis:

alifadwitiyap

12 repository

NDETCStemmer

Python

13 bintang

LinkedIn: alifadwitiyap

Foto profil sumber 2048 × 2048 dengan latar abu-abu gelap seragam.

Non-goals

Tidak memakai React, Vue, Svelte, TypeScript, Vite, Webpack, npm build, bundler, atau framework CSS.

Tidak ada backend, database, autentikasi, CMS, form submission server-side, atau GitHub API runtime.

Tidak membuat permainan, combat system, leaderboard, atau interaksi game penuh.

Tidak membuat seluruh situs bergantung pada WebGL.

Tidak menggunakan aset resmi Persona 5 atau aset pihak ketiga yang tidak memiliki izin.

Tidak memaksa efek post-processing pada perangkat yang tidak mampu menjalankannya.

Tidak menggunakan dolly camera sumbu Z sebagai animasi kedalaman utama.

Constraints

Stack wajib: static HTML + CSS native + vanilla JS ES modules + Three.js lokal.

Tidak ada build step.

Three.js inti sudah ada di vendor/three.module.js dan harus tetap r169.

Addon EffectComposer, RenderPass, BokehPass, dan OutputPass wajib di-vendor dari rilis r169 yang sama.

ES module dan import map hanya diuji/dijalankan melalui static server:

bash
python -m http.server 8000

Jangan membuka index.html lewat file://.

Semua konten penting harus dapat diakses tanpa canvas dan tanpa JavaScript scene.

Data proyek hanya boleh memiliki satu sumber kebenaran: js/data/projects.js.

Desktop menggunakan kandidat 5 layer; mobile menggunakan kandidat 3 layer, lalu kualitas diturunkan berdasarkan frame time aktual.

Motion wajib menghormati prefers-reduced-motion.

Decisions
Konsep kreatif legal

Visual memakai palet gelap, putih kontras tinggi, merah/amber sebagai aksen terbatas, panel bersudut, typography editorial, garis diagonal, dan transisi kinetic yang dibuat sendiri. Referensinya adalah mood high-energy tactical interface, bukan reproduksi trade dress Persona 5.

Larangan eksplisit:

Tidak memakai kata, logo, ikon, mask, karakter, musik, screenshot, UI capture, font, atau aset Persona 5.

Tidak menyalin komposisi menu, bentuk badge, atau transisi khas yang dapat dikenali sebagai antarmuka Persona 5.

Font menggunakan pilihan legal/orisinal: system sans-serif + monospace lokal/web-safe.

Struktur layer

Desktop candidate tier — 5 layer:

void: gradient gelap, noise sangat halus, vignette CSS.

structure: grid, diagonal line, coordinate marks, corner brackets.

webgl: archive core, orbit, shard, particle terbatas.

depth: composer + RenderPass + OutputPass; BokehPass hanya jika lolos adaptive performance gate.

hud: text hero, navigation, CTA, status panel, dan seluruh DOM content.

Mobile candidate tier — 3 layer:

CSS background/static structure.

WebGL ringan dengan archive core serta shard sedikit.

DOM HUD dan seluruh content.

Mobile memulai render dengan DPR cap 1.25, tanpa BokehPass, dan dapat turun lagi berdasarkan frame time. Desktop juga tidak memiliki DPR tetap universal; cap pixel ratio, jumlah shard, dan post-processing dikurangi secara adaptif menurut performa aktual.

Risiko A — pseudo-DOF DOM selaras BokehPass

BokehPass hanya memburamkan hasil render WebGL; ia tidak memburamkan kartu HTML yang berada di atas canvas. Karena itu, DOM tidak diperlakukan sebagai objek fisik yang berada dalam ruang Three.js yang sama.

Strategi final:

HUD utama, navigation, CTA, teks, serta kartu aktif selalu tajam untuk aksesibilitas.

Hanya panel dekoratif nonaktif atau elemen background DOM yang diberi pseudo-DOF CSS.

Pseudo-DOF dibuat dari kombinasi:

filter: blur() sangat rendah;

opacity lebih rendah;

transform: scale() kecil;

saturation/contrast lebih redup;

overlay/noise tipis.

Blur pseudo-DOF hanya dipakai saat section tidak aktif dan hanya pada panel pendukung, bukan pada teks yang wajib dibaca.

Nilai blur mengikuti kelas kedalaman yang sama dengan cluster 3D terkait: depth-near, depth-mid, depth-far.

Ketika section menjadi aktif, panel kembali depth-near dan tajam.

BokehPass di canvas memakai focal target yang sesuai section aktif; CSS pseudo-DOF membuat bahasa kedalaman terasa seragam tanpa mengklaim compositing fisik yang sempurna.

Contoh kelas:

css
.depth-far {
  filter: blur(1.4px) saturate(.72);
  opacity: .52;
  transform: scale(.985);
}

.depth-mid {
  filter: blur(.55px) saturate(.88);
  opacity: .78;
}

.depth-near {
  filter: none;
  opacity: 1;
  transform: none;
}

Jika prefers-reduced-motion aktif atau browser/perangkat tidak stabil, pseudo-DOF dinonaktifkan dan hanya memakai perubahan opacity/border contrast.

Risiko B — portrait kepala/badan

Versi utama portrait adalah satu cutout utuh. Pemisahan kepala/badan hanya merupakan enhancement opsional yang boleh diaktifkan setelah asset lolos audit visual.

Strategi split portrait:

Head layer menimpa torso minimal 12–24 px pada zona leher.

Batas potong ditempatkan di area kerah, bahu, atau area gelap; tidak tepat di garis kulit leher.

profile-mask.png dipakai untuk feather/matte transition pada overlap.

Head dan torso memakai mask-image atau alpha mask yang saling overlap, bukan dua rectangle transparan yang bertemu.

Cleanup cutout wajib mengatasi halo rambut: decontaminate matte, defringe, serta pengujian pada latar gelap dan terang.

Gerak dibatasi:

head rotation: maksimal sekitar 
±
2
∘
±2
∘
;

torso rotation: maksimal sekitar 
±
1
∘
±1
∘
;

offset lateral: maksimal 4–8 px pada desktop;

tanpa motion Z agresif.

Jika ada celah leher, halo rambut, mismatch pencahayaan, atau “paper-doll effect”, sistem otomatis memakai profile-cutout-single.webp.

Fallback tunggal tetap dapat diberi depth melalui border scan, holographic highlight, dan parallax panel—bukan pemisahan tubuh yang dipaksakan.

Risiko C — kedalaman tanpa dolly Z dominan

Kamera tidak melakukan zoom in/out atau dolly Z berulang sebagai sumber utama depth. Kedalaman dibuat melalui:

parallax lateral X/Y kecil dari pointer;

gerak antar-layer dengan amplitude berbeda;

shard depan/belakang pada kedalaman scene asli;

perubahan focal target BokehPass yang lambat ketika active section berubah;

perubahan rotation/offset archive core yang terukur;

pseudo-DOF CSS pada panel DOM dekoratif.

Focal target bergeser halus dari cluster hero ke cluster profile/projects berdasarkan section aktif. Kamera mempertahankan jarak Z relatif stabil. Ini mengurangi motion discomfort sekaligus menjaga depth cue yang lebih meyakinkan.

Transisi 3D antar-section

Transisi tidak berpindah halaman. IntersectionObserver menentukan section aktif, lalu scene merespons:

archive core bergeser lateral dan rotasi berubah kecil;

shard mengelompok ulang menuju anchor section;

orbit line mengubah radius/warna aksen;

focal target berpindah pelan pada desktop high tier;

active DOM panel mendapat state depth-near;

panel nonaktif menjadi depth-mid atau depth-far hanya bila tidak memuat teks penting.

Transisi harus singkat, sekitar 350–700 ms untuk UI CSS dan lebih lambat namun subtle untuk respons WebGL. Tidak ada swipe/camera fly-through panjang, flash berlebihan, atau animasi yang menghalangi scrolling.

Tasks
Task 01: Siapkan struktur proyek statis

Files: index.html, css/, js/, js/data/, vendor/, assets/images/, README.md
Depends: Tidak ada
Verify: Struktur folder tersedia, index.html dapat dilayani oleh python -m http.server 8000, dan tidak ada toolchain/build configuration

Task 02: Vendor Three.js r169 dan addon identik

Files: vendor/three.module.js, vendor/addons/postprocessing/EffectComposer.js, vendor/addons/postprocessing/RenderPass.js, vendor/addons/postprocessing/BokehPass.js, vendor/addons/postprocessing/OutputPass.js
Depends: Task 01
Verify: Semua file ada, berasal dari rilis r169 yang sama, dan tidak ada file addon dari versi Three.js berbeda

Task 03: Pasang import map dan smoke test module

Files: index.html, js/main.js, js/scene.js
Depends: Task 02
Verify: Dari http://localhost:8000, DevTools Console tidak menampilkan error Failed to resolve module specifier, MIME type, CORS, atau 404 untuk Three.js dan empat addon

Task 04: Bangun kerangka HTML semantik

Files: index.html, css/base.css, css/layout.css
Depends: Task 01
Verify: Terdapat header, nav, main, enam section utama, footer, anchor navigation, dan seluruh konten inti tetap terbaca saat canvas/JS dimatikan

Task 05: Definisikan data proyek tunggal

Files: js/data/projects.js, js/data/profile.js, js/projects.js
Depends: Task 04
Verify: NDETCStemmer memiliki featured: true, stars: 13, type: 'Python Repository'; tidak ada daftar proyek kedua di HTML atau scene.js

Task 06: Render mission log dan dossier proyek

Files: js/projects.js, js/ui.js, index.html, css/components.css
Depends: Task 05
Verify: Kartu DOM, featured callout, modal/detail dossier, technology tags, bintang, dan URL seluruhnya dihasilkan dari projects.js berdasarkan id yang sama

Task 07: Terapkan sistem visual legal dan responsif

Files: css/variables.css, css/components.css, css/animations.css, css/responsive.css
Depends: Task 04
Verify: UI menggunakan aset dan typography orisinal/legal, tidak memuat logo/font/karakter/aset Persona 5, dan tampil stabil pada desktop, tablet, serta mobile

Task 08: Implementasikan scene archive core dan binding proyek

Files: js/scene.js, js/main.js, js/data/projects.js
Depends: Task 03, Task 05
Verify: Scene memuat archive core, shard, orbit, dan particle terbatas; objek proyek memakai id serta visual dari projects.js; hover/focus card dapat memberi highlight pada objek terkait tanpa data duplikat

Task 09: Implementasikan tier visual adaptif

Files: js/performance.js, js/scene.js, js/main.js, css/responsive.css
Depends: Task 08
Verify: Desktop kandidat memiliki 5 layer, mobile kandidat memiliki 3 layer, mobile mulai dengan DPR cap 1.25, dan frame time warm-up 2–3 detik dapat menurunkan BokehPass, shard count, particle, serta pixel ratio tanpa reload

Task 10: Tambahkan transisi section dan strategi DOF

Files: js/sections.js, js/scene.js, js/ui.js, css/animations.css, css/components.css
Depends: Task 06, Task 08, Task 09
Verify: IntersectionObserver mengubah active section; scene memakai parallax lateral dan focal target tanpa dolly Z berulang; BokehPass hanya bekerja pada WebGL; panel pendukung DOM mendapat kelas depth-near/mid/far tanpa memburamkan teks inti

Task 11: Siapkan portrait berlapis dan fallback cutout tunggal

Files: assets/images/profile-original-2048.jpg, assets/images/profile-cutout-single.webp, assets/images/profile-head.webp, assets/images/profile-torso.webp, assets/images/profile-mask.png, js/portrait.js, css/components.css
Depends: Task 04, Task 07
Verify: Head dan torso overlap pada leher dengan mask/feather; rotasi/offset berada dalam batas; audit pada background terang/gelap tidak menunjukkan halo atau celah; kegagalan audit selalu mengaktifkan profile-cutout-single.webp

Task 12: Lengkapi aksesibilitas, fallback, dan QA rilis

Files: js/accessibility.js, js/main.js, css/animations.css, README.md
Depends: Task 06, Task 09, Task 10, Task 11
Verify: prefers-reduced-motion mengurangi motion dan menonaktifkan Bokeh/pseudo-DOF; keyboard/focus berfungsi; WebGL failure menampilkan hero CSS; README memuat instruksi python -m http.server 8000 dan checklist browser

Verification
Functional

Hero menampilkan tagline persis:

text
Built 4 Life[♥] — From real life needs to real life solutions.

Navigation menuju section yang benar.

GitHub dan LinkedIn mengarah ke alifadwitiyap.

Repository count tampil sebagai 12.

NDETCStemmer tampil sebagai proyek unggulan dengan Python dan ★ 13.

Kartu, modal/detail, featured callout, dan visual 3D membaca proyek dari js/data/projects.js.

Technical

Situs berjalan dari:

bash
python -m http.server 8000

Situs tidak diuji sebagai file://.

Network tab menunjukkan file lokal berikut berhasil dimuat:

vendor/three.module.js

EffectComposer.js

RenderPass.js

BokehPass.js

OutputPass.js

Tidak ada error import map, bare module specifier, MIME, CORS, atau 404.

Addon dan core Three.js terbukti berasal dari r169.

Canvas dapat gagal tanpa memblokir HTML portfolio.

Visual and performance

Desktop full tier: lima layer tersedia bila performa memungkinkan.

Mobile: tiga layer, shard jauh lebih sedikit, BokehPass nonaktif.

Frame time diukur saat warm-up; kualitas turun bertahap bila biaya render konsisten tinggi.

Tidak ada zoom camera Z otomatis berulang.

Active section mendapat respons 3D yang jelas tetapi tidak mengganggu scroll.

Pseudo-DOF tidak pernah membuat tombol, navigation, CTA, atau teks penting sulit dibaca.

Portrait split hanya aktif bila audit visual lolos; fallback satu cutout harus tetap menarik.

Accessibility

Seluruh navigasi dapat dipakai keyboard.

Focus ring jelas.

Kontras teks memenuhi keterbacaan praktis pada latar gelap.

prefers-reduced-motion mematikan parallax agresif, animasi UI, BokehPass, dan pseudo-DOF blur.

Canvas diberi aria-hidden="true"; deskripsi penting berada di DOM.

Risks
Risiko	Dampak	Mitigasi
Import map atau path addon gagal di host	Scene tidak mulai	Uji local HTTP dan deployment; audit Network/Console; gunakan path relatif untuk modul aplikasi dan import map minimal untuk three/three/addons/
Mismatch versi core dan addon	Error runtime atau rendering	Ambil keempat addon dari rilis r169 yang sama dengan three.module.js
BokehPass terlalu mahal	Frame drop, panas, battery drain	Warm-up frame-time gate; matikan Bokeh dulu, lalu kurangi shard dan pixel ratio; gunakan fallback statis bila perlu
Pseudo-DOF DOM merusak keterbacaan	UX buruk dan kontradiksi visual	Terapkan hanya pada panel dekoratif/nonaktif; jangan blur teks inti; gunakan opacity/scale jika blur dimatikan
Split portrait terlihat palsu	Celah leher, halo rambut, paper-doll effect	Overlap 12–24 px, alpha mask, retouch matte, batas transform kecil, dan fallback satu cutout
Kamera motion memicu discomfort	Pengunjung kehilangan fokus	Tidak ada dolly Z loop; gunakan lateral parallax kecil dan focal target pelan; dukung reduced motion
Gaya terlalu dekat dengan Persona 5	Risiko legal/identitas kurang orisinal	Gunakan prinsip mood tingkat tinggi saja; semua graphic, typography, layout, motion, dan asset dibuat orisinal
Visual 3D mengalahkan portfolio	Konten sulit dipahami	DOM adalah sumber konten utama; WebGL bersifat ambience; mobile dan fallback tetap lengkap tanpa efek
Cross-check
Requirement	Keputusan implementasi
Static tanpa build step	HTML, CSS native, vanilla JS ES modules; tidak ada bundler/framework
Three.js lokal r169	vendor/three.module.js dipertahankan sebagai core
Addon r169 identik	EffectComposer, RenderPass, BokehPass, OutputPass di-vendor dari r169 sama
Static server wajib	python -m http.server 8000; tidak menggunakan file://
Import map aman	Alias terbatas untuk three dan three/addons/; dites melalui Console dan Network
Desktop/mobile berbeda	Desktop kandidat 5 layer; mobile kandidat 3 layer dan DPR cap awal 1.25
Adaptif bukan DPR kaku	Frame-time warm-up menentukan downgrade Bokeh/shard/pixel ratio
Tidak terjadi project-data drift	js/data/projects.js adalah satu-satunya sumber proyek dan flag featured
Pseudo-DOF DOM	Hanya panel pendukung/nonaktif; teks inti tetap tajam; dikaitkan dengan state section
Portrait split	Overlap + mask + transform kecil + audit; default/fallback satu cutout
Motion aman	Lateral parallax + focal target; tanpa dolly Z dominan atau zoom loop
Persona-5 legal	Inspirasi abstrak pada energi visual; tanpa aset, font, nama, atau logo asli
Tagline wajib	Ditampilkan persis pada hero dan footer
Open issues

Bio, title profesional utama, daftar skill final, serta proyek selain NDETCStemmer belum diberikan; projects.js harus diisi setelah data tersedia.

URL repository spesifik NDETCStemmer perlu diverifikasi sebelum dipasang sebagai tautan final.

Keputusan final asset portrait split bergantung pada hasil retouch dari foto sumber 2048 × 2048.

Ambang frame-time operasional perlu dikalibrasi pada perangkat target nyata sebelum release; jangan mengasumsikan satu angka cocok untuk semua browser/perangkat.

Pilihan font legal final perlu diputuskan antara system font stack, font lokal berlisensi, atau web font berlisensi yang tetap dapat dilayani tanpa build step.