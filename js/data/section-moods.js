/**
 * section-moods.js — data contract for the per-section 3D "mood".
 *
 * DATA ONLY. This module holds no THREE.js imports and no DOM access, so any
 * lane (scene, UI, CSS-driven accents, tests) can consume the same numbers.
 *
 * Shape (field names are part of the contract — do not rename):
 *
 *   sectionMoods[<sectionId>] = {
 *     accent: '#rrggbb',                 // brand accent used by DOM + WebGL
 *     menu: {                            // navigator overlay label
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
 * Documented table. One entry per section id, in document order:
 * hero, profile, skills, experience, projects, contact.
 */
export const sectionMoods = {
  hero: {
    accent: BRAND_ACCENT,
    menu: { index: "00", label: "START", hud: "Start" },
    scene: { focus: 0.9, camX: 0.0, camY: 0.2, layout: "archiveCore", motion: "orbit" },
    presets: {
      // Portrait stacks copy on top of the frame: keep the core centred and
      // pull the focal plane back so it clears the headline.
      portrait: { focus: 1.05, camX: 0.0, camY: 0.5 },
      wide: { focus: 0.9, camX: 0.0, camY: 0.2 },
    },
  },
  profile: {
    accent: BRAND_ACCENT,
    menu: { index: "01", label: "IDENTITY FILE", hud: "Identity File" },
    scene: { focus: 1.5, camX: -0.7, camY: 0.1, layout: "portraitFrame", motion: "orbit" },
    presets: {
      portrait: { focus: 1.7, camX: -0.25, camY: 0.35 },
      wide: { focus: 1.4, camX: -0.9, camY: 0.1 },
    },
  },
  skills: {
    accent: BRAND_ACCENT,
    menu: { index: "02", label: "SKILL ARSENAL", hud: "Skill Arsenal" },
    scene: { focus: 2.0, camX: 0.6, camY: -0.1, layout: "constellation", motion: "pulse" },
    presets: {
      portrait: { focus: 2.2, camX: 0.3, camY: 0.15 },
      wide: { focus: 1.9, camX: 0.75, camY: -0.1 },
    },
  },
  experience: {
    accent: BRAND_ACCENT,
    menu: { index: "03", label: "MISSION LOG", hud: "Mission Log" },
    scene: { focus: 2.6, camX: -0.5, camY: 0.15, layout: "timelineRail", motion: "rise" },
    presets: {
      portrait: { focus: 2.8, camX: -0.2, camY: 0.3 },
      wide: { focus: 2.5, camX: -0.65, camY: 0.15 },
    },
  },
  projects: {
    accent: BRAND_ACCENT,
    menu: { index: "04", label: "CASE FILES", hud: "Case Files" },
    scene: { focus: 3.1, camX: 0.5, camY: 0.0, layout: "shardField", motion: "parallax" },
    presets: {
      portrait: { focus: 3.3, camX: 0.25, camY: 0.1 },
      wide: { focus: 3.0, camX: 0.6, camY: 0.0 },
    },
  },
  contact: {
    accent: BRAND_ACCENT,
    menu: { index: "05", label: "OPEN CHANNEL", hud: "Open Channel" },
    scene: { focus: 3.6, camX: 0.0, camY: 0.2, layout: "archiveCore", motion: "settle" },
    presets: {
      portrait: { focus: 3.8, camX: 0.15, camY: 0.4 },
      wide: { focus: 3.5, camX: 0.0, camY: 0.2 },
    },
  },
};

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
