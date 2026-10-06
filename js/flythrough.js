/**
 * flythrough.js — the one-shot "punch-in" flythrough fired by the intro.
 *
 * Pure math, no THREE import and no DOM access, so it is unit-testable in plain
 * node (lab/flythrough.test.mjs) and js/scene.js stays the only place that
 * touches the camera. This is the single source of truth for the flythrough's
 * shape and its depth range — scene.js hardcodes none of these numbers.
 *
 * Model: a bounded one-shot envelope paired with a camera dolly. `fireFlythrough`
 * restarts the clock; `stepFlythrough` advances it and returns the envelope
 * (0..1), the camera depth `z`, and whether the shot just finished. The envelope
 * is ALWAYS clamped to [0, 1] and `z` always stays within [minZ, startZ], so the
 * camera can never run away however often the shot is re-fired (a mid-flight
 * re-fire restarts cleanly, it never accumulates).
 *
 * Contract (used by scene.js, never reimplemented there):
 *   fireFlythrough(f)      restart the shot (t = 0)
 *   stepFlythrough(f, dt)  advance by dtMs; returns { e, z, done }
 *   FLYTHROUGH.*           the shared gains (ms / world units)
 */

/** Shared flythrough gains. `duration` is ms; `minZ`/`startZ` are world units. */
export const FLYTHROUGH = Object.freeze({
  /** One-shot length in ms — long enough to read as a push-in, short enough to feel snappy. */
  duration: 1600,
  /** Fraction of the one-shot spent pushing in (the "attack"); the rest eases back. */
  attack: 0.22,
  /** Closest the camera dollies in (world units). */
  minZ: 0.35,
  /** Camera rest distance the shot starts from and returns to (world units). */
  startZ: 6,
});

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Fresh, idle flythrough state. `t < 0` means no shot is in flight. */
export function createFlythrough() {
  return { t: -1 };
}

/** Restart the flythrough from the top. */
export function fireFlythrough(f) {
  f.t = 0;
}

/**
 * Advance the flythrough by `dtMs` and return { e, z, done }. While idle it
 * reports the rest pose (e 0, z startZ) and never advances. A non-positive dt
 * advances nothing. The shot retires itself (t back to -1) the moment it
 * completes, reporting `done` exactly once.
 */
export function stepFlythrough(f, dtMs) {
  if (f.t < 0) return { e: 0, z: FLYTHROUGH.startZ, done: false };

  f.t += dtMs > 0 ? dtMs : 0;
  const p = f.t / FLYTHROUGH.duration;
  if (p >= 1) {
    f.t = -1;
    return { e: 0, z: FLYTHROUGH.startZ, done: true };
  }

  const a = FLYTHROUGH.attack;
  const shaped = p < a ? p / a : Math.pow(1 - (p - a) / (1 - a), 2);
  const e = clamp01(shaped);
  const z = FLYTHROUGH.startZ - (FLYTHROUGH.startZ - FLYTHROUGH.minZ) * e;
  return { e, z, done: false };
}
