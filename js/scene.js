/**
 * scene.js — "Mission Archive" WebGL stage.
 * Contract:
 *  - Decorative only. Never the source of content.
 *  - Depth comes from lateral parallax + focal target, NOT a Z dolly.
 *  - BokehPass blurs the WebGL render only; DOM depth is handled in CSS.
 *  - Fully disposable; on any failure the caller keeps the CSS fallback.
 *
 * New in this revision (user request: "tambah lebih banyak animasi 3D"):
 *  1. Experience timeline nodes — a 3D rail of glowing nodes that light up
 *     as each job crosses the viewport middle.
 *  2. Skill constellation — points that connect with lines in the skills view.
 *  3. Section warp — a fast streak burst on every section change.
 *  4. Portrait orbit — a rotating accent ring that tracks the hero portrait.
 *  5. Hall of Fame beat — a bounded, one-shot "recognition" pulse that fires
 *     when the hall-of-fame section becomes active, then settles back to rest.
 *  6. Camera space-shift — on every section change the camera banks into the
 *     travel direction and the whole group counter-drifts (a bounded one-shot
 *     impulse; the shape/gains live in js/camera-shift.js). Lateral parallax
 *     only — it never becomes a Z dolly.
 */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import {
  sectionMoods,
  pickAspectPreset,
  resolveSectionScene,
} from "./data/section-moods.js";
import { createShift, fireShift, stepShift, SPACE_SHIFT } from "./camera-shift.js";

/**
 * Section ids in document order. js/data/section-moods.js is the single source
 * of truth for every camera/focus number — scene.js hardcodes none of them.
 */
const SECTION_IDS = Object.keys(sectionMoods);

/**
 * Section ids that drive optional 3D features. Named constants (not inline
 * string literals) so a registry rename lands in one place instead of being
 * scattered across the controller. These MUST stay in sync with the ids in
 * js/data/section-moods.js — that file is the single source of truth.
 */
const FEATURE_SECTIONS = {
  skills: "skill-arsenal",
  mission: "mission-log",
  hallOfFame: "hall-of-fame",
};

const RED = 0xe51e2b;
const PAPER = 0xf7f4ea;

/**
 * Per-aspect "safe frame" — offsets applied to the whole 3D group so the core,
 * shards and orbit rings never sit under the main text column or the CTA area:
 *  - portrait: copy stacks over the middle and the CTA anchors the bottom, so
 *    lift the cluster above the CTA and shrink it.
 *  - standard: near-neutral, slight upward bias.
 *  - wide: the copy hugs the left column, so drift the cluster into the right
 *    gutter and let it grow.
 */
const SAFE_FRAMES = {
  portrait: { groupX: 0.0, groupY: 0.9, scale: 0.8 },
  standard: { groupX: 0.0, groupY: 0.15, scale: 1.0 },
  wide: { groupX: 0.95, groupY: 0.1, scale: 1.08 },
};

export function createScene(canvas, { tier, reduced = false } = {}) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070709, 0.05);

  const camera = new THREE.PerspectiveCamera(
    50,
    canvas.clientWidth / canvas.clientHeight || 1,
    0.1,
    200
  );
  camera.position.set(0, 0.2, 6);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(tier.dpr);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.setClearColor(0x070709, 0);

  const group = new THREE.Group();
  scene.add(group);

  const rng = mulberry32(1337);
  const anim = []; // objects with an update(t, dt) hook

  /* ---------- 1. Archive core (hero) ---------- */
  const coreMat = new THREE.MeshBasicMaterial({
    color: RED, wireframe: true, transparent: true, opacity: 0.32,
  });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), coreMat);
  group.add(core);

  const inner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.92, 0),
    new THREE.MeshBasicMaterial({ color: 0x181820, transparent: true, opacity: 0.85 })
  );
  group.add(inner);

  /* ---------- 2. Portrait orbit ring (hero) ---------- */
  const orbitRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.1, 0.02, 8, 96),
    new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.5 })
  );
  orbitRing.rotation.x = 1.15;
  orbitRing.position.set(2.6, 0.4, 0.6);
  group.add(orbitRing);
  anim.push((t) => {
    orbitRing.rotation.z = t * 0.35;
    orbitRing.position.y = 0.4 + Math.sin(t * 0.7) * 0.08;
  });

  /* ---------- 3. Angular shards (all sections) ---------- */
  const shards = [];
  for (let i = 0; i < tier.shards; i++) {
    const geo = new THREE.PlaneGeometry(0.35 + rng() * 0.9, 0.1 + rng() * 0.28);
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: PAPER, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
    );
    const z = -6 + rng() * 12;
    m.position.set((rng() - 0.5) * 12, (rng() - 0.5) * 7, z);
    m.rotation.z = (rng() - 0.5) * Math.PI;
    m.userData = { baseY: m.position.y, spin: (rng() - 0.5) * 0.3, seed: rng() * 6.28 };
    shards.push(m);
    group.add(m);
  }
  anim.push((t, dt) => {
    for (const s of shards) {
      s.position.y = s.userData.baseY + Math.sin(t * 0.5 + s.userData.seed) * 0.18;
      s.rotation.z += s.userData.spin * dt * 0.0003;
    }
  });

  /* ---------- 4. Orbit rings (all sections) ---------- */
  const orbits = [];
  [2.4, 3.2, 4.1].forEach((r, i) => {
    const pts = [];
    for (let a = 0; a <= 64; a++) {
      const th = (a / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(th) * r, Math.sin(th) * r * 0.28, (i - 1) * 1.6));
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.38 })
    );
    orbits.push(line);
    group.add(line);
  });
  anim.push((t) => orbits.forEach((l, i) => (l.rotation.z = t * (0.05 + i * 0.02))));

  /* ---------- 5. Skill constellation ---------- */
  const constellation = new THREE.Group();
  constellation.position.set(0, 0, -1);
  const cNodes = [];
  const cCount = Math.max(6, Math.min(14, tier.shards + 4));
  for (let i = 0; i < cCount; i++) {
    const p = new THREE.Vector3((rng() - 0.5) * 7, (rng() - 0.5) * 4.4, (rng() - 0.5) * 2.4);
    cNodes.push(p);
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      new THREE.MeshBasicMaterial({ color: PAPER, transparent: true, opacity: 0.8 })
    );
    dot.position.copy(p);
    constellation.add(dot);
  }
  // connect nearest neighbours
  const linkPts = [];
  cNodes.forEach((a, i) => {
    cNodes.forEach((b, j) => {
      if (j <= i) return;
      if (a.distanceTo(b) < 3.2) linkPts.push(a.clone(), b.clone());
    });
  });
  if (linkPts.length) {
    const lg = new THREE.BufferGeometry().setFromPoints(linkPts);
    constellation.add(new THREE.LineSegments(
      lg,
      new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.22 })
    ));
  }
  constellation.visible = false;
  group.add(constellation);
  anim.push((t) => {
    if (!constellation.visible) return;
    constellation.rotation.y = t * 0.12;
    constellation.rotation.x = Math.sin(t * 0.2) * 0.08;
  });

  /* ---------- 6. Experience timeline rail (3D nodes) ---------- */
  const timeline3d = new THREE.Group();
  const tlNodes = [];
  const NODE_N = 5;
  for (let i = 0; i < NODE_N; i++) {
    const y = 1.9 - i * 0.95;
    const node = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.16, 0),
      new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.45 })
    );
    node.position.set(-2.9, y, 0.4);
    node.userData = { base: 0.45, lit: 0 };
    tlNodes.push(node);
    timeline3d.add(node);
  }
  // rail line
  const railPts = tlNodes.map((n) => n.position.clone());
  timeline3d.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(railPts),
    new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.3 })
  ));
  timeline3d.visible = false;
  group.add(timeline3d);
  anim.push((t) => {
    if (!timeline3d.visible) return;
    tlNodes.forEach((n, i) => {
      n.rotation.y = t * 0.8 + i;
      n.rotation.x = t * 0.5;
      const target = n.userData.lit;
      n.material.opacity += (target - n.material.opacity) * 0.08;
      const s = 1 + n.userData.lit * 0.7;
      n.scale.setScalar(s);
    });
  });

  /* ---------- 7. Warp streak burst (section change) ---------- */
  const WARP_N = tier.particles > 0 ? 90 : 40;
  const warpGeo = new THREE.BufferGeometry();
  const wpos = new Float32Array(WARP_N * 2 * 3);
  warpGeo.setAttribute("position", new THREE.BufferAttribute(wpos, 3));
  const warp = new THREE.LineSegments(
    warpGeo,
    new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0 })
  );
  warp.frustumCulled = false;
  scene.add(warp);
  let warpT = -1;
  const warpSeeds = Array.from({ length: WARP_N }, () => ({
    a: rng() * Math.PI * 2, r: 2 + rng() * 12, z: (rng() - 0.5) * 6,
  }));
  anim.push((t, dt) => {
    if (warpT < 0) return;
    warpT += dt * 0.0016;
    if (warpT >= 1) { warpT = -1; warp.material.opacity = 0; return; }
    warp.material.opacity = Math.sin(warpT * Math.PI) * 0.5;
    const pos = warpGeo.attributes.position.array;
    for (let i = 0; i < WARP_N; i++) {
      const s = warpSeeds[i];
      const len = 0.6 + warpT * 4.2;
      const cx = Math.cos(s.a) * s.r, cy = Math.sin(s.a) * s.r * 0.55;
      pos[i * 6 + 0] = cx; pos[i * 6 + 1] = cy; pos[i * 6 + 2] = s.z;
      pos[i * 6 + 3] = cx * (1 + len * 0.12); pos[i * 6 + 4] = cy * (1 + len * 0.12); pos[i * 6 + 5] = s.z;
    }
    warpGeo.attributes.position.needsUpdate = true;
  });

  /* ---------- 8. Hall of Fame beat (bounded, one-shot) ---------- */
  // Allocated ONCE and reused on every activation — the beat never creates
  // geometry, materials or a scene on section change. A bounded 0 → 1 → 0
  // envelope expands a short "recognition" ring burst, then the group returns
  // to invisible rest. Ties to the hall-of-fame registry entry.
  const hofBeat = new THREE.Group();
  hofBeat.position.set(0.5, 0.05, -0.6);
  const hofRings = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.012, 6, 72),
      new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0 })
    );
    ring.rotation.x = Math.PI / 2;
    hofRings.push(ring);
    hofBeat.add(ring);
  }
  hofBeat.visible = false;
  group.add(hofBeat);
  let beatT = -1; // < 0 = idle
  anim.push((t, dt) => {
    if (beatT < 0) return;
    beatT += dt * 0.0009; // ~1.1s one-shot
    if (beatT >= 1) {
      beatT = -1;
      hofBeat.visible = false;
      return;
    }
    hofRings.forEach((ring, i) => {
      // Each ring gets a bounded, staggered envelope: expand + fade, never
      // unbounded. `local` is clamped to [0, 1] so the flare cannot run away.
      const local = Math.max(0, Math.min(1, (beatT - i * 0.12) / 0.7));
      ring.scale.setScalar(0.7 + local * 1.1);
      ring.material.opacity = Math.sin(local * Math.PI) * 0.5;
    });
  });

  /* ---------- Particles ---------- */
  let points = null;
  if (tier.particles > 0) {
    const pos = new Float32Array(tier.particles * 3);
    for (let i = 0; i < tier.particles; i++) {
      pos[i * 3] = (rng() - 0.5) * 24;
      pos[i * 3 + 1] = (rng() - 0.5) * 14;
      pos[i * 3 + 2] = -10 + rng() * 18;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    points = new THREE.Points(
      g,
      new THREE.PointsMaterial({ color: PAPER, size: 0.035, transparent: true, opacity: 0.5 })
    );
    group.add(points);
    anim.push((t) => (points.rotation.y = t * 0.01));
  }

  /* ---------- Post-processing ---------- */
  let composer = null;
  let bokeh = null;
  const buildComposer = () => {
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(tier.dpr);
    composer.setSize(canvas.clientWidth, canvas.clientHeight);
    composer.addPass(new RenderPass(scene, camera));
    bokeh = new BokehPass(scene, camera, { focus: 1.0, aperture: 0.0009, maxblur: 0.011 });
    composer.addPass(bokeh);
    composer.addPass(new OutputPass());
  };
  if (tier.bokeh && !reduced) buildComposer();

  /* ---------- State ---------- */
  // `aspect` is the active aspect preset; every mood read goes through it.
  let aspect = pickAspectPreset(canvas.clientWidth, canvas.clientHeight);
  const initial = resolveSectionScene(SECTION_IDS[0], aspect);

  const state = {
    active: SECTION_IDS[0],
    aspect,
    focusTarget: initial.focus,
    focus: initial.focus,
    camXTarget: initial.camX,
    camX: initial.camX,
    camYTarget: initial.camY,
    camY: initial.camY,
    pointerX: 0, pointerY: 0,
    shift: createShift(),
    running: false,
  };

  /**
   * Apply the whole-group safe frame for the current aspect preset. This is the
   * clamp that keeps the core/shards/rings clear of the text column and CTA:
   * the scene is nudged and scaled, never allowed to drift back over the copy.
   */
  function applySafeFrame() {
    const f = SAFE_FRAMES[aspect] || SAFE_FRAMES.standard;
    group.position.x = f.groupX;
    group.position.y = f.groupY;
    group.scale.setScalar(f.scale);
  }

  const onPointer = (e) => {
    state.pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
    state.pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  if (!reduced) window.addEventListener("pointermove", onPointer, { passive: true });

  function setActive(id) {
    const sec = resolveSectionScene(id, aspect);
    if (!sec) return;
    // Camera delta from the section we are leaving — drives the space-shift
    // direction and strength. Read BEFORE the targets are overwritten.
    const dx = sec.camX - state.camXTarget;
    const dy = sec.camY - state.camYTarget;
    state.active = id;
    state.focusTarget = sec.focus;
    state.camXTarget = sec.camX;
    state.camYTarget = sec.camY;
    // feature toggles per section
    constellation.visible = id === FEATURE_SECTIONS.skills;
    timeline3d.visible = id === FEATURE_SECTIONS.mission;
    // Hall of Fame: reuse the pre-allocated beat, never recreate the scene.
    if (id === FEATURE_SECTIONS.hallOfFame) {
      hofBeat.visible = true;
      if (reduced) restHofBeat(); // static pose, no motion
      else beatT = 0; // fire the one-shot recognition beat
    } else {
      beatT = -1;
      hofBeat.visible = false;
    }
    if (!reduced) {
      warpT = 0; // fire the warp burst
      fireShift(state.shift, dx, dy); // bank the camera into the travel direction
    }
  }

  /** Light the 3D timeline node for the Nth visible experience card. */
  function setTimelineIndex(idx) {
    tlNodes.forEach((n, i) => (n.userData.lit = i === idx ? 1 : 0));
  }

  /**
   * Park the Hall of Fame beat at a static, legible rest pose. Used under
   * reduced-motion so the section still reads as "recognition" without any
   * animation loop work (the animated envelope returns early while idle).
   */
  function restHofBeat() {
    hofRings.forEach((ring, i) => {
      ring.scale.setScalar(0.7 + i * 0.55);
      ring.material.opacity = i === 0 ? 0.5 : 0.18;
    });
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (composer) composer.setSize(w, h);

    // Re-pick the aspect preset; when it changes, re-resolve the active
    // section's mood and re-apply the safe frame so the 3D never crosses into
    // the text/CTA area after a rotation or window resize.
    const next = pickAspectPreset(w, h);
    if (next !== aspect) {
      aspect = next;
      state.aspect = next;
      applySafeFrame();
      const sec = resolveSectionScene(state.active, aspect);
      if (sec) {
        state.focusTarget = sec.focus;
        state.camXTarget = sec.camX;
        state.camYTarget = sec.camY;
      }
    }
  }

  /* ---------- Loop ---------- */
  let last = performance.now();
  let t = 0;
  function frame(now) {
    if (!state.running) return;
    const dt = Math.min(64, now - last);
    last = now;
    t += dt * 0.001;

    state.focus += (state.focusTarget - state.focus) * 0.06;
    state.camX += (state.camXTarget - state.camX) * 0.05;
    state.camY += (state.camYTarget - state.camY) * 0.05;

    // Camera space-shift: a bounded one-shot impulse fired on section change.
    // `e` is exactly 0 at rest (and while reduced-motion never fires it), so
    // the camera and group return to their base pose with no residual offset.
    const e = stepShift(state.shift, dt);
    const sx = e * state.shift.dx * state.shift.mag;
    const sy = e * state.shift.dy * state.shift.mag;

    const px = state.pointerX * 0.5;
    const py = state.pointerY * 0.28;
    camera.position.x = state.camX + px + sx * SPACE_SHIFT.camPush;
    camera.position.y = state.camY + py + sy * SPACE_SHIFT.camLift;
    camera.position.z = 6;
    camera.lookAt(px * 0.35, py * 0.35, 0);
    // Bank the camera into the travel direction. Applied AFTER lookAt (as a
    // local-Z roll) so the orientation solve does not overwrite it.
    if (sx) camera.rotateZ(-sx * SPACE_SHIFT.camRoll);

    group.rotation.y = Math.sin(t * 0.12) * 0.12 + px * 0.12 - sx * SPACE_SHIFT.groupYaw;
    group.rotation.x = Math.sin(t * 0.09) * 0.06 - py * 0.08 + sy * SPACE_SHIFT.groupYaw * 0.5;

    core.rotation.y += dt * 0.00022;
    core.rotation.x += dt * 0.00013;

    for (const fn of anim) fn(t, dt);

    if (bokeh) {
      bokeh.uniforms["focus"].value = state.focus;
      bokeh.uniforms["aperture"].value = 0.0009;
    }

    if (composer) composer.render(dt);
    else renderer.render(scene, camera);

    requestAnimationFrame(frame);
  }

  function start() {
    if (state.running) return;
    state.running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
  function stop() { state.running = false; }

  function setBokehEnabled(on) {
    if (on && !composer) buildComposer();
    else if (!on) { composer = null; bokeh = null; }
  }

  function dispose() {
    stop();
    window.removeEventListener("pointermove", onPointer);
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
    composer?.dispose?.();
    renderer.dispose();
  }

  applySafeFrame();
  resize();
  return {
    setActive, setTimelineIndex, resize, start, stop, dispose,
    setBokehEnabled, state, hasBokeh: !!bokeh,
  };
}

/* Deterministic PRNG so the layout is stable between reloads. */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
