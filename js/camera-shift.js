/**
 * camera-shift.js — the "space-shift" impulse fired on every section change.
 *
 * Pure math, no THREE import and no DOM access, so it is unit-testable in plain
 * node (lab/camera-shift.test.mjs) and js/scene.js stays the only place that
 * touches the camera. This is the single source of truth for the shift's shape
 * and its per-axis gains — scene.js hardcodes none of these numbers.
 *
 * Model: a bounded one-shot envelope. `fireShift` restarts the clock and
 * records a unit direction + magnitude derived from the section-to-section
 * camera delta; `stepShift` advances the clock and returns a 0..1 envelope that
 * rises fast and settles to 0. The envelope is ALWAYS clamped to [0, 1], so the
 * camera can never run away however often sections are crossed (fast scrolling
 * re-fires cleanly, it never accumulates).
 *
 * Contract (used by scene.js, never reimplemented there):
 *   fireShift(s, dx, dy)   restart the shift; direction from the camera delta
 *   stepShift(s, dtMs)     advance by dtMs; returns the envelope 0..1 (0 = idle)
 *   SPACE_SHIFT.*          the shared gains (world units / radians)
 */

/** Shared shift gains. Lateral/vertical are world units; bank/roll radians. */
export const SPACE_SHIFT = Object.freeze({
  /** One-shot length in ms — long enough to read, short enough to feel snappy. */
  duration: 820,
  /** Fraction of the one-shot spent rising (the "knock"); the rest settles. */
  attack: 0.18,
  /** Camera-delta magnitude that maps to a full-strength shift. */
  travel: 1.4,
  /** Floor magnitude so even a tiny delta still nudges the camera. */
  base: 0.35,
  /** Camera lateral push (world units) at envelope 1. */
  camPush: 0.55,
  /** Camera vertical lift (world units) at envelope 1. */
  camLift: 0.3,
  /** Camera roll (radians) at envelope 1 — the "bank" into the new section. */
  camRoll: 0.05,
  /** Whole-group counter-yaw (radians) at envelope 1 — the parallax kick. */
  groupYaw: 0.035,
});

const EPS = 1e-6;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Fresh, idle shift state. `t < 0` means no shift is in flight. */
export function createShift() {
  return { t: -1, dx: 0, dy: 1, mag: 0 };
}

/**
 * Restart the shift from a camera delta. Zero travel falls back to a gentle
 * upward lead so a same-mood section change still reads as motion.
 */
export function fireShift(s, dx = 0, dy = 0) {
  const d = Math.hypot(dx, dy);
  if (d < EPS) {
    s.dx = 0;
    s.dy = 1;
    s.mag = SPACE_SHIFT.base;
  } else {
    s.dx = dx / d;
    s.dy = dy / d;
    const raw = d / SPACE_SHIFT.travel;
    s.mag = raw < SPACE_SHIFT.base ? SPACE_SHIFT.base : raw > 1 ? 1 : raw;
  }
  s.t = 0;
}

/**
 * Advance the shift by `dtMs` and return the envelope (0..1). Returns 0 while
 * idle, and retires the shift the moment the envelope reaches its end, so the
 * caller can gate per-frame work on a non-zero return.
 */
export function stepShift(s, dtMs) {
  if (s.t < 0) return 0;
  s.t += dtMs > 0 ? dtMs : 0;
  const p = s.t / SPACE_SHIFT.duration;
  if (p >= 1) {
    s.t = -1;
    return 0;
  }
  const a = SPACE_SHIFT.attack;
  const shaped = p < a ? p / a : Math.pow(1 - (p - a) / (1 - a), 2);
  return clamp01(shaped);
}
