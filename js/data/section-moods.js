/**
 * section-moods.js — SINGLE data contract for every section surface.
 *
 * The registry itself now lives in `content.json` under `sections` (one key
 * per section id, in document order). This module keeps ONLY the behaviour:
 * the clamps, the aspect mapping, and the resolver that turns (id, viewport)
 * into camera numbers. Edit the JSON, not this file.
 *
 * Shape of each `sections[<id>]` entry (field names are part of the contract —
 * do not rename):
 *   title            string                  // big section heading
 *   index            string                  // small kicker, e.g. "01 / IDENTITY FILE"
 *   name             string                  // data-name / a11y section name
 *   accent           '#rrggbb'               // brand accent used by DOM + WebGL
 *   progress         { step, label }         // progress bar + menu step
 *   story            { act, beat }           // narrative microcopy
 *   menu             { index, label, hud }   // chapter menu overlay + HUD label
 *   scene            { focus, camX, camY, layout, motion }
 *   presets?         { portrait?, standard?, wide? → { focus?, camX?, camY? } }
 *
 * Keys starting with "_" (e.g. "_comment") are documentation and are ignored.
 *
 * Preset rules: a preset key overrides ONLY `scene.focus / scene.camX /
 * scene.camY`; any key a preset omits falls back to the base `scene` value.
 * `layout`, `motion` and `menu` are never overridden by a preset.
 *
 * Clamp rules: `camX` is clamped to [-1.2, 1.2] and `focus` to [0.5, 5]
 * (see MOOD_LIMITS). `camY` is clamped to [-1.2, 1.2] for the same reason.
 */
import { loadContent } from "./content.js";

/** Hard limits applied to every resolved mood value. */
export const MOOD_LIMITS = Object.freeze({
  camX: Object.freeze([-1.2, 1.2]),
  camY: Object.freeze([-1.2, 1.2]),
  focus: Object.freeze([0.5, 5]),
});

const BRAND_ACCENT = "#e51e2b";

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

const content = await loadContent();

const rawSections = content?.sections || {};

/**
 * The documented table, normalised from content.json. Kept as an OBJECT MAP
 * (not an array) because js/scene.js derives its section list via
 * `Object.keys(sectionMoods)`. Order comes from the key order in the JSON.
 */
export const sectionMoods = Object.fromEntries(
  Object.entries(rawSections)
    .filter(([id]) => !id.startsWith("_"))
    .map(([id, m], i) => [
      id,
      {
        order: i,
        title: m.title,
        index: m.index,
        name: m.name,
        accent: m.accent || BRAND_ACCENT,
        progress: m.progress || { step: i, label: id },
        story: m.story || {},
        menu: m.menu || { index: String(i).padStart(2, "0"), label: id, hud: id },
        scene: m.scene || {},
        presets: m.presets || {},
      },
    ])
);

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
