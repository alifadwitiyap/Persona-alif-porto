/**
 * camera-shift.test.mjs — behaviour check for js/camera-shift.js (plain node,
 * no test runner). Drives the real module and asserts the bounded one-shot
 * envelope that js/scene.js fires on every section change.
 *
 * Run: node lab/camera-shift.test.mjs
 */
import assert from "node:assert/strict";
import { createShift, fireShift, stepShift, SPACE_SHIFT } from "../js/camera-shift.js";

/* 1. idle: no shift in flight -> envelope is 0 and step() is inert */
const s = createShift();
assert.equal(stepShift(s, 16), 0, "idle step is 0");
assert.equal(stepShift(s, 16), 0, "idle step stays 0");

/* 2. fire: direction follows the camera delta, magnitude is bounded */
fireShift(s, 1.2, 0);
assert.equal(s.t, 0, "fire restarts the envelope");
assert.equal(s.dx, 1, "direction x normalised");
assert.equal(s.dy, 0, "direction y normalised");
assert.ok(s.mag > 0 && s.mag <= 1, `magnitude in (0,1] (got ${s.mag})`);

/* 3. envelope rises then returns to 0 within one one-shot, always bounded */
let peak = 0;
let active = 0;
let settledAt = -1;
for (let i = 0; i < 400; i++) {
  const e = stepShift(s, 16);
  assert.ok(e >= 0 && e <= 1, `envelope bounded at step ${i} (got ${e})`);
  if (e > 0) {
    active++;
    peak = Math.max(peak, e);
  } else if (settledAt < 0) {
    settledAt = i;
  }
}
assert.ok(peak > 0.3, `envelope reaches a real peak (got ${peak})`);
assert.ok(settledAt > 0, "envelope settles back to 0");
assert.equal(stepShift(s, 16), 0, "stays idle after settling");

/* 4. zero travel -> gentle upward fallback direction, floor magnitude */
fireShift(s, 0, 0);
assert.equal(s.dx, 0, "fallback direction x");
assert.equal(s.dy, 1, "fallback direction y (upward lead)");
assert.ok(Math.abs(s.mag - SPACE_SHIFT.base) < 1e-9, "fallback uses base magnitude");

/* 5. a full-travel delta reaches magnitude 1 */
fireShift(s, SPACE_SHIFT.travel, 0);
assert.ok(Math.abs(s.mag - 1) < 1e-9, `full travel maps to magnitude 1 (got ${s.mag})`);

/* 6. rapid re-fire restarts cleanly (no runaway, direction updates) */
fireShift(s, 1, 0);
stepShift(s, 16);
stepShift(s, 16);
fireShift(s, -1, 0);
assert.equal(s.t, 0, "re-fire restarts t");
assert.equal(s.dx, -1, "re-fire updates direction");
const e = stepShift(s, 16);
assert.ok(e >= 0 && e <= 1, "re-fired envelope bounded");

console.log("PASS — camera-shift.js: 6 checks");
