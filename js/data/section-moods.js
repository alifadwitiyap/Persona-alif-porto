/**
 * section-moods.js — SINGLE data contract for every section surface.
 *
 * DATA ONLY. This module holds no THREE.js imports and no DOM access, so any
 * lane (scene, UI, CSS-driven accents, tests) can consume the same numbers.
 *
 * Shape (field names are part of the contract — do not rename):
 *
 *   sectionMoods[<sectionId>] = {
 *     order: number,                     // display order (source of truth)
 *     accent: '#rrggbb',                 // brand accent used by DOM + WebGL
 *     progress: {                        // progress bar + menu step (v3)
 *       step: number,                    // 0-based index in the reading journey
 *       label: string,                   // short chapter label, e.g. 'IDENTITY FILE'
 *     },
 *     story: {                           // narrative microcopy (v3)
 *       act: string,                     // one word: SIGNAL / IDENTIFY / PROVE ...
 *       beat: string,                    // one short line shown as a kicker
 *     },
 *     menu: {                            // chapter menu overlay + HUD label
 *       index: string,                   // 2-digit display, e.g. '01'
 *       label: string,                   // menu label (UPPERCASE, English)
 *       hud: string,                     // short name shown in the HUD
 *     },
 *     scene: {                           // base camera/focus values
 *       focus: number,                   // BokehPass focus distance
 *       camX:  number,                   // lateral camera offset (parallax, not a Z dolly)
 *       camY:  number,                   // vertical camera offset
 *       layout: string,                  // which 3D cluster is featured
 *       motion: string,                  // how that cluster animates
 *     },
 *     presets?: {                        // optional per-aspect-ratio overrides
 *       portrait?: { focus?, camX?, camY? },
 *       standard?: { focus?, camX?, camY? },
 *       wide?:     { focus?, camX?, camY? },
 *     },
 *   }
 *
 * Preset rules: a preset key overrides ONLY `scene.focus / scene.camX /
 * scene.camY`; any key a preset omits falls back to the base `scene` value.
 * `layout`, `motion` and `menu` are never overridden by a preset.
 *
 * Clamp rules: `camX` is clamped to [-1.2, 1.2] and `focus` to [0.5, 5]
 * (see MOOD_LIMITS). `camY` is clamped to [-1.2, 1.2] for the same reason.
 *
 * NOTE (deliberate deviation from the chapter-select plan): this stays an
 * OBJECT MAP, not an array, because js/scene.js derives its section list via
 * `Object.keys(sectionMoods)`. Keeping the map shape means scene.js needs no
 * list refactor. Order is carried explicitly in `order` AND by insertion order.
 */

/** Hard limits applied to every resolved mood value. */
export const MOOD_LIMITS = Object.freeze({
  camX: Object.freeze([-1.2, 1.2]),
  camY: Object.freeze([-1.2, 1.2]),
  focus: Object.freeze([0.5, 5]),
});

const BRAND_ACCENT = "#e51e2b";

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

/**
 * POSES — named spatial compositions for the 3D cluster (interface contract §3).
 *
 * DATA ONLY, additive to the mood contract. Each pose is a frozen record of
 * numeric slots; consumers (scene lane) read `sectionMoods[id].pose` to pick
 * one and lerp between them. Every leaf is a finite number so a consumer can
 * interpolate without a type check.
 *
 * Slots (all leaves numeric):
 *   core          { x, y, z, rx, ry, rz, scale, opacity }
 *   orbitRing     { x, y, z, rx, ry, rz, scale, opacity }
 *   orbits        { spread, scale, opacity }
 *   shards        { spread, scale, opacity }
 *   constellation { x, y, z, scale, opacity }
 *   timeline      { x, y, z, scale, opacity }
 *   accentMix     number in [0, 1]
 *
 * `standard` reproduces today's NEUTRAL layout verbatim, so an unknown or
 * missing pose id falls back safely to the current composition.
 */
export const POSES = Object.freeze({
  standard: Object.freeze({
    core: Object.freeze({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1, opacity: 1 }),
    orbitRing: Object.freeze({ x: 2.6, y: 0.4, z: 0.6, rx: 0, ry: 0, rz: 0, scale: 1, opacity: 0.5 }),
    orbits: Object.freeze({ spread: 1, scale: 1, opacity: 0.38 }),
    shards: Object.freeze({ spread: 1, scale: 1, opacity: 0.15 }),
    constellation: Object.freeze({ x: 0, y: 0, z: 0, scale: 1, opacity: 1 }),
    timeline: Object.freeze({ x: 0, y: 0, z: 0, scale: 1, opacity: 1 }),
    accentMix: 0.5,
  }),
  seal: Object.freeze({
    core: Object.freeze({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1.25, opacity: 1 }),
    orbitRing: Object.freeze({ x: 1.6, y: 0.25, z: 0.35, rx: 0, ry: 0, rz: 0, scale: 0.7, opacity: 0.42 }),
    orbits: Object.freeze({ spread: 0.6, scale: 0.8, opacity: 0.3 }),
    shards: Object.freeze({ spread: 0.5, scale: 0.8, opacity: 0.1 }),
    constellation: Object.freeze({ x: 0, y: 0, z: 0, scale: 0.7, opacity: 0.9 }),
    timeline: Object.freeze({ x: 0, y: 0, z: 0, scale: 0.7, opacity: 0.9 }),
    accentMix: 0.72,
  }),
  openFrame: Object.freeze({
    core: Object.freeze({ x: 0, y: 0.1, z: -0.3, rx: 0, ry: 0.15, rz: 0, scale: 1.05, opacity: 1 }),
    orbitRing: Object.freeze({ x: 3.1, y: 0.5, z: 0.9, rx: 0, ry: 0, rz: 0, scale: 1.15, opacity: 0.55 }),
    orbits: Object.freeze({ spread: 1.25, scale: 1.1, opacity: 0.42 }),
    shards: Object.freeze({ spread: 1.15, scale: 1.05, opacity: 0.18 }),
    constellation: Object.freeze({ x: -0.2, y: 0.1, z: 0, scale: 1.1, opacity: 1 }),
    timeline: Object.freeze({ x: -0.2, y: 0.1, z: 0, scale: 1.1, opacity: 1 }),
    accentMix: 0.44,
  }),
  podium: Object.freeze({
    core: Object.freeze({ x: 0, y: 0.25, z: 0, rx: 0, ry: 0, rz: 0, scale: 1.15, opacity: 1 }),
    orbitRing: Object.freeze({ x: 2.9, y: 0.9, z: 0.7, rx: 0, ry: 0, rz: 0, scale: 1.6, opacity: 0.6 }),
    orbits: Object.freeze({ spread: 1.1, scale: 1.2, opacity: 0.45 }),
    shards: Object.freeze({ spread: 1.4, scale: 1.3, opacity: 0.2 }),
    constellation: Object.freeze({ x: 0, y: 0.3, z: 0, scale: 1.2, opacity: 1 }),
    timeline: Object.freeze({ x: 0, y: 0.3, z: 0, scale: 1.2, opacity: 1 }),
    accentMix: 0.58,
  }),
  constellationWide: Object.freeze({
    core: Object.freeze({ x: 0, y: -0.05, z: 0, rx: 0, ry: 0, rz: 0, scale: 0.95, opacity: 1 }),
    orbitRing: Object.freeze({ x: 2.4, y: 0.35, z: 0.5, rx: 0, ry: 0, rz: 0, scale: 1.05, opacity: 0.48 }),
    orbits: Object.freeze({ spread: 1.85, scale: 1.25, opacity: 0.5 }),
    shards: Object.freeze({ spread: 1.6, scale: 1.1, opacity: 0.22 }),
    constellation: Object.freeze({ x: 0, y: 0, z: 0, scale: 1.5, opacity: 1 }),
    timeline: Object.freeze({ x: 0, y: 0, z: 0, scale: 0.9, opacity: 0.95 }),
    accentMix: 0.36,
  }),
  railDiagonal: Object.freeze({
    core: Object.freeze({ x: -0.15, y: 0.05, z: 0, rx: 0, ry: -0.2, rz: 0, scale: 1, opacity: 1 }),
    orbitRing: Object.freeze({ x: 2.6, y: 0.4, z: 0.6, rx: 0.35, ry: 0, rz: 0.6, scale: 1, opacity: 0.45 }),
    orbits: Object.freeze({ spread: 1.1, scale: 1, opacity: 0.34 }),
    shards: Object.freeze({ spread: 1.3, scale: 0.95, opacity: 0.16 }),
    constellation: Object.freeze({ x: 0.2, y: -0.1, z: 0, scale: 0.95, opacity: 0.9 }),
    timeline: Object.freeze({ x: -0.4, y: 0.15, z: 0.2, rx: 0, ry: 0.45, rz: 0.35, scale: 1.35, opacity: 1 }),
    accentMix: 0.62,
  }),
  archiveRack: Object.freeze({
    core: Object.freeze({ x: 0, y: 0, z: -0.4, rx: 0, ry: 0, rz: 0, scale: 0.9, opacity: 1 }),
    orbitRing: Object.freeze({ x: 3.4, y: 0.2, z: 1.1, rx: 0, ry: 0, rz: 0, scale: 1.3, opacity: 0.4 }),
    orbits: Object.freeze({ spread: 1.5, scale: 1.15, opacity: 0.36 }),
    shards: Object.freeze({ spread: 2, scale: 1.4, opacity: 0.24 }),
    constellation: Object.freeze({ x: 0, y: 0, z: -0.3, scale: 1.15, opacity: 0.95 }),
    timeline: Object.freeze({ x: 0, y: 0, z: -0.3, scale: 1.15, opacity: 0.95 }),
    accentMix: 0.28,
  }),
  portal: Object.freeze({
    core: Object.freeze({ x: 0, y: 0, z: 0.3, rx: 0, ry: 0, rz: 0, scale: 1.1, opacity: 1 }),
    orbitRing: Object.freeze({ x: 1.9, y: 0.3, z: 0.4, rx: 0, ry: 0, rz: 0, scale: 0.85, opacity: 0.52 }),
    orbits: Object.freeze({ spread: 0.75, scale: 0.9, opacity: 0.4 }),
    shards: Object.freeze({ spread: 0.35, scale: 0.75, opacity: 0.3 }),
    constellation: Object.freeze({ x: 0, y: 0, z: 0.2, scale: 0.85, opacity: 1 }),
    timeline: Object.freeze({ x: 0, y: 0, z: 0.2, scale: 0.85, opacity: 1 }),
    accentMix: 0.8,
  }),
});

/**
 * Documented table. One entry per section id, in document order:
 * hero, identity-file, hall-of-fame, skill-arsenal, mission-log, case-files,
 * open-channel.
 */
export const sectionMoods = {
  hero: {
    order: 0,
    pose: "seal",
    accent: BRAND_ACCENT,
    progress: { step: 0, label: "START" },
    story: {
      act: "SIGNAL",
      beat: "A signal enters the system.",
    },
    menu: { index: "00", label: "START", hud: "Start" },
    scene: { focus: 0.9, camX: 0.0, camY: 0.2, layout: "archiveCore", motion: "orbit" },
    presets: {
      // Portrait stacks copy on top of the frame: keep the core centred and
      // pull the focal plane back so it clears the headline.
      portrait: { focus: 1.05, camX: 0.0, camY: 0.5 },
      wide: { focus: 0.9, camX: 0.0, camY: 0.2 },
    },
  },
  "identity-file": {
    order: 1,
    pose: "openFrame",
    accent: BRAND_ACCENT,
    progress: { step: 1, label: "IDENTITY FILE" },
    story: {
      act: "IDENTIFY",
      beat: "The person behind the model.",
    },
    menu: { index: "01", label: "IDENTITY FILE", hud: "Identity File" },
    scene: { focus: 1.5, camX: -0.7, camY: 0.1, layout: "portraitFrame", motion: "orbit" },
    presets: {
      portrait: { focus: 1.7, camX: -0.25, camY: 0.35 },
      wide: { focus: 1.4, camX: -0.9, camY: 0.1 },
    },
  },
  "hall-of-fame": {
    order: 2,
    pose: "podium",
    accent: BRAND_ACCENT,
    progress: { step: 2, label: "HALL OF FAME" },
    story: {
      act: "PROVE",
      beat: "Signals become evidence.",
    },
    menu: { index: "02", label: "HALL OF FAME", hud: "Hall of Fame" },
    scene: { focus: 1.75, camX: 0.5, camY: 0.05, layout: "shardField", motion: "rise" },
    presets: {
      portrait: { focus: 1.95, camX: 0.25, camY: 0.3 },
      wide: { focus: 1.65, camX: 0.6, camY: 0.05 },
    },
  },
  "skill-arsenal": {
    order: 3,
    pose: "constellationWide",
    accent: BRAND_ACCENT,
    progress: { step: 3, label: "SKILL ARSENAL" },
    story: {
      act: "ARM",
      beat: "Tools are only useful in motion.",
    },
    menu: { index: "03", label: "SKILL ARSENAL", hud: "Skill Arsenal" },
    scene: { focus: 2.0, camX: 0.6, camY: -0.1, layout: "constellation", motion: "pulse" },
    presets: {
      portrait: { focus: 2.2, camX: 0.3, camY: 0.15 },
      wide: { focus: 1.9, camX: 0.75, camY: -0.1 },
    },
  },
  "mission-log": {
    order: 4,
    pose: "railDiagonal",
    accent: BRAND_ACCENT,
    progress: { step: 4, label: "MISSION LOG" },
    story: {
      act: "MOVE",
      beat: "Every role leaves a trace.",
    },
    menu: { index: "04", label: "MISSION LOG", hud: "Mission Log" },
    scene: { focus: 2.6, camX: -0.5, camY: 0.15, layout: "timelineRail", motion: "rise" },
    presets: {
      portrait: { focus: 2.8, camX: -0.2, camY: 0.3 },
      wide: { focus: 2.5, camX: -0.65, camY: 0.15 },
    },
  },
  "case-files": {
    order: 5,
    pose: "archiveRack",
    accent: BRAND_ACCENT,
    progress: { step: 5, label: "CASE FILES" },
    story: {
      act: "DEPLOY",
      beat: "Evidence, not decoration.",
    },
    menu: { index: "05", label: "CASE FILES", hud: "Case Files" },
    scene: { focus: 3.1, camX: 0.5, camY: 0.0, layout: "shardField", motion: "parallax" },
    presets: {
      portrait: { focus: 3.3, camX: 0.25, camY: 0.1 },
      wide: { focus: 3.0, camX: 0.6, camY: 0.0 },
    },
  },
  "open-channel": {
    order: 6,
    pose: "portal",
    accent: BRAND_ACCENT,
    progress: { step: 6, label: "OPEN CHANNEL" },
    story: {
      act: "CONTINUE",
      beat: "The next signal needs a receiver.",
    },
    menu: { index: "06", label: "OPEN CHANNEL", hud: "Open Channel" },
    scene: { focus: 3.6, camX: 0.0, camY: 0.2, layout: "archiveCore", motion: "settle" },
    presets: {
      portrait: { focus: 3.8, camX: 0.15, camY: 0.4 },
      wide: { focus: 3.5, camX: 0.0, camY: 0.2 },
    },
  },
};

/**
 * The 6 content destinations shown in the chapter menu overlay (everything
 * except the hero). Derived from the registry — never a second hand-kept list.
 *
 * Each entry is the mood plus its `id`, so consumers (js/ui/menu.js) can
 * build `data-goto="<id>"` items without a second lookup. The registry keys stay
 * the single source of truth for ids and order.
 */
export const CHAPTER_TARGETS = Object.entries(sectionMoods)
  .map(([id, mood]) => ({ ...mood, id }))
  .filter((entry) => entry.menu.index !== "00")
  .sort((a, b) => a.order - b.order);

/** Section ids in document order (registry order). */
export const SECTION_IDS = Object.keys(sectionMoods);

/** Total number of progress steps (the reading journey length). */
export const PROGRESS_TOTAL = SECTION_IDS.length;

/** Look up one mood by section id. */
export function getSectionMood(id) {
  return sectionMoods[id] || null;
}

/** Resolve the 0..1 progress of a section id (0 when unknown). */
export function progressOf(id) {
  const mood = sectionMoods[id];
  if (!mood) return 0;
  const last = PROGRESS_TOTAL - 1;
  return last > 0 ? mood.progress.step / last : 0;
}

/**
 * Map a viewport to one of the three aspect presets.
 *
 *   height > width            -> "portrait"
 *   width / height >= 1.9     -> "wide"
 *   otherwise                 -> "standard"
 *
 * @param {number} width  viewport width in CSS pixels
 * @param {number} height viewport height in CSS pixels
 * @returns {"portrait"|"standard"|"wide"}
 */
export function pickAspectPreset(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || h <= 0 || w <= 0) {
    return "standard";
  }
  if (h > w) return "portrait";
  if (w / h >= 1.9) return "wide";
  return "standard";
}

/**
 * Resolve one section's effective scene values for a given aspect preset,
 * applying preset overrides, base fallbacks and the MOOD_LIMITS clamps.
 *
 * @param {string} id      a key of `sectionMoods`
 * @param {string} aspect  "portrait" | "standard" | "wide"
 * @returns {{focus:number,camX:number,camY:number,layout:string,motion:string,accent:string}|null}
 */
export function resolveSectionScene(id, aspect) {
  const mood = sectionMoods[id];
  if (!mood) return null;
  const base = mood.scene || {};
  const preset = (mood.presets && mood.presets[aspect]) || {};
  return {
    focus: clamp(preset.focus ?? base.focus ?? 1, MOOD_LIMITS.focus[0], MOOD_LIMITS.focus[1]),
    camX: clamp(preset.camX ?? base.camX ?? 0, MOOD_LIMITS.camX[0], MOOD_LIMITS.camX[1]),
    camY: clamp(preset.camY ?? base.camY ?? 0, MOOD_LIMITS.camY[0], MOOD_LIMITS.camY[1]),
    layout: base.layout,
    motion: base.motion,
    accent: mood.accent || BRAND_ACCENT,
  };
}
