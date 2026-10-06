/**
 * flythrough.test.mjs — behaviour check for js/flythrough.js (plain node, no
 * test runner). Drives the real pure module and asserts the frozen one-shot
 * "punch-in" flythrough contract used by the intro: dolly toward the model and
 * settle back to the rest distance.
 *
 * Run: node lab/flythrough.test.mjs
 */
import assert from "node:assert/strict";
import {
  FLYTHROUGH,
  createFlythrough,
  fireFlythrough,
  stepFlythrough,
} from "../js/flythrough.js";

/* ---------------- FLYTHROUGH (frozen gains) ---------------- */
assert.ok(Object.isFrozen(FLYTHROUGH), "FLYTHROUGH is frozen");
assert.equal(FLYTHROUGH.duration, 1600, "duration === 1600");
assert.equal(FLYTHROUGH.attack, 0.22, "attack === 0.22");
assert.equal(FLYTHROUGH.minZ, 0.35, "minZ === 0.35");
assert.equal(FLYTHROUGH.startZ, 6, "startZ === 6");

/* 1. idle: step is inert and reports the rest pose */
const f = createFlythrough();
assert.equal(f.t, -1, "fresh state is idle (t === -1)");
let r = stepFlythrough(f, 16);
assert.deepEqual(
  r,
  { e: 0, z: FLYTHROUGH.startZ, done: false },
  "idle step -> { e:0, z:startZ, done:false }"
);
r = stepFlythrough(f, 16);
assert.equal(r.e, 0, "idle stays e 0");
assert.equal(r.z, FLYTHROUGH.startZ, "idle stays at startZ");
assert.equal(r.done, false, "idle is never done");
assert.equal(f.t, -1, "idle stays idle");

/* 2. fire restarts the clock */
fireFlythrough(f);
assert.equal(f.t, 0, "fire -> t === 0");

/* 3. full run (16ms steps): bounded envelope, real peak, dolly to minZ and back */
let peakE = 0;
let minZ = Infinity;
let endZ = null;
let doneCount = 0;
for (let i = 0; i < 1000; i++) {
  const s = stepFlythrough(f, 16);
  assert.ok(s.e >= 0 && s.e <= 1, `e bounded [0,1] at step ${i} (got ${s.e})`);
  assert.ok(
    s.z >= FLYTHROUGH.minZ - 1e-9 && s.z <= FLYTHROUGH.startZ + 1e-9,
    `z within [minZ, startZ] at step ${i} (got ${s.z})`
  );
  peakE = Math.max(peakE, s.e);
  minZ = Math.min(minZ, s.z);
  endZ = s.z;
  if (s.done) {
    doneCount++;
    break;
  }
}
assert.ok(peakE > 0.3, `envelope peaks > 0.3 (got ${peakE})`);
assert.ok(minZ <= FLYTHROUGH.minZ + 0.05, `dolly reaches near minZ (got ${minZ})`);
assert.equal(doneCount, 1, "exactly one step reports done");
assert.ok(
  Math.abs(endZ - FLYTHROUGH.startZ) < 1e-6,
  `z returns to ~startZ at the end (got ${endZ})`
);
assert.equal(f.t, -1, "state is idle once done");

/* 4. after completion: inert forever, no second done */
for (let i = 0; i < 5; i++) {
  const s = stepFlythrough(f, 16);
  assert.equal(s.done, false, "no further done after completion");
  assert.equal(s.e, 0, "post-done step e 0");
  assert.equal(s.z, FLYTHROUGH.startZ, "post-done step at startZ");
}
assert.equal(f.t, -1, "post-done stays idle");

/* 5. re-fire mid-flight restarts cleanly (t === 0, no accumulation) */
fireFlythrough(f);
const freshFirst = stepFlythrough(f, 16).e; // first step of a clean run
stepFlythrough(f, 16); // advance mid-flight
stepFlythrough(f, 16);
fireFlythrough(f); // re-fire while still in flight
assert.equal(f.t, 0, "re-fire mid-flight -> t === 0");
const refireFirst = stepFlythrough(f, 16).e;
assert.ok(
  Math.abs(refireFirst - freshFirst) < 1e-9,
  `re-fire does not accumulate magnitude (${refireFirst} vs ${freshFirst})`
);

/* 6. dtMs <= 0 advances nothing and is safe */
fireFlythrough(f);
stepFlythrough(f, 16);
const tBefore = f.t;
const sZero = stepFlythrough(f, 0);
assert.equal(f.t, tBefore, "dt 0 advances nothing (t unchanged)");
const sNeg = stepFlythrough(f, -50);
assert.equal(f.t, tBefore, "negative dt advances nothing (t unchanged)");
assert.ok(
  sZero.e >= 0 && sZero.e <= 1 && sNeg.e >= 0 && sNeg.e <= 1,
  "dt <= 0 still returns a bounded envelope"
);

console.log("PASS — flythrough.js: 6 behaviours");
