/**
 * pose.test.mjs — behaviour check for js/pose.js (no test runner needed; plain
 * node). Drives the real pure module and asserts the frozen contract.
 *
 * Run: node lab/pose.test.mjs
 */
import assert from "node:assert/strict";

const { POSE_IDS, DEFAULT_POSE, resolvePose, lerpPose, isPose } = await import(
  "../js/pose.js"
);

let checks = 0;
const ok = (fn, msg) => { fn(); checks++; };

/* ---------------- fixtures ---------------- */

// A complete, valid pose. `n` shifts every numeric leaf so midpoints are
// unambiguous and never accidentally equal to an input.
function makePose(n = 0) {
  const core = { x: 1 + n, y: 2 + n, z: 3 + n, rx: 4 + n, ry: 5 + n, rz: 6 + n, scale: 7 + n, opacity: 8 + n };
  const orbitRing = { x: 9 + n, y: 10 + n, z: 11 + n, rx: 12 + n, ry: 13 + n, rz: 14 + n, scale: 15 + n, opacity: 16 + n };
  return {
    core,
    orbitRing,
    orbits: { spread: 17 + n, scale: 18 + n, opacity: 19 + n },
    shards: { spread: 20 + n, scale: 21 + n, opacity: 22 + n },
    constellation: { x: 23 + n, y: 24 + n, z: 25 + n, scale: 26 + n, opacity: 27 + n },
    timeline: { x: 28 + n, y: 29 + n, z: 30 + n, scale: 31 + n, opacity: 32 + n },
    accentMix: 33 + n,
  };
}

const POSES = Object.freeze({
  standard: Object.freeze(makePose(0)),
  seal: Object.freeze(makePose(100)),
  podium: Object.freeze(makePose(200)),
});

/* ---------------- POSE_IDS / DEFAULT_POSE ---------------- */

ok(() => assert.ok(Object.isFrozen(POSE_IDS), "POSE_IDS is frozen"), "POSE_IDS frozen");
ok(
  () => assert.deepEqual([...POSE_IDS], ["seal", "openFrame", "podium", "constellationWide", "railDiagonal", "archiveRack", "portal"]),
  "POSE_IDS exact contents + order"
);
ok(() => assert.equal(DEFAULT_POSE, "standard"), "DEFAULT_POSE === 'standard'");

/* ---------------- resolvePose ---------------- */

ok(
  () => assert.equal(resolvePose({ pose: "podium" }, POSES), POSES.podium),
  "known id -> that pose"
);
ok(
  () => assert.equal(resolvePose({ pose: "openFrame" }, POSES), POSES.standard),
  "unknown id -> DEFAULT_POSE"
);
ok(
  () => assert.equal(resolvePose(null, POSES), POSES.standard),
  "null mood -> DEFAULT_POSE"
);
ok(
  () => assert.equal(resolvePose(undefined, POSES), POSES.standard),
  "undefined mood -> DEFAULT_POSE"
);
ok(
  () => assert.equal(resolvePose({}, POSES), POSES.standard),
  "missing mood.pose -> DEFAULT_POSE"
);
ok(
  () => assert.equal(resolvePose({ pose: "podium" }, {}), null),
  "no fallbacks present -> null"
);
ok(
  () => assert.equal(resolvePose({ pose: "nope" }, { seal: POSES.seal }), POSES.seal),
  "no DEFAULT_POSE -> falls back to seal"
);
ok(
  () => assert.equal(resolvePose({ pose: "podium" }, { standard: POSES.standard, podium: { core: {} } }), POSES.standard),
  "invalid target pose -> DEFAULT_POSE"
);

/* ---------------- lerpPose ---------------- */

const a = makePose(0);
const b = makePose(10);

const at0 = lerpPose(a, b, 0);
ok(() => assert.notEqual(at0, a), "k=0 returns a NEW object (not a)");
ok(() => assert.deepEqual(at0, a), "k=0 -> a-values");
ok(() => assert.notEqual(at0.core, a.core), "k=0 -> nested objects are copies");

const at1 = lerpPose(a, b, 1);
ok(() => assert.deepEqual(at1, b), "k=1 -> b-values");

const mid = lerpPose(a, b, 0.5);
ok(() => assert.equal(mid.core.x, 1 + 5), "k=0.5 midpoint core.x");
ok(() => assert.equal(mid.orbitRing.opacity, 16 + 5), "k=0.5 midpoint orbitRing.opacity");
ok(() => assert.equal(mid.orbits.spread, 17 + 5), "k=0.5 midpoint orbits.spread");
ok(() => assert.equal(mid.shards.scale, 21 + 5), "k=0.5 midpoint shards.scale");
ok(() => assert.equal(mid.constellation.z, 25 + 5), "k=0.5 midpoint constellation.z");
ok(() => assert.equal(mid.timeline.y, 29 + 5), "k=0.5 midpoint timeline.y");
ok(() => assert.equal(mid.accentMix, 33 + 5), "k=0.5 midpoint accentMix");

const clampLow = lerpPose(a, b, -1);
ok(() => assert.deepEqual(clampLow, a), "k clamped -1 -> a");
const clampHigh = lerpPose(a, b, 2);
ok(() => assert.deepEqual(clampHigh, b), "k clamped 2 -> b");

// no mutation of inputs
const aSnapshot = JSON.stringify(a);
const bSnapshot = JSON.stringify(b);
lerpPose(a, b, 0.5);
lerpPose(a, b, -1);
lerpPose(a, b, 2);
ok(() => assert.equal(JSON.stringify(a), aSnapshot), "lerpPose does not mutate a");
ok(() => assert.equal(JSON.stringify(b), bSnapshot), "lerpPose does not mutate b");

/* ---------------- isPose ---------------- */

ok(() => assert.equal(isPose(makePose(0)), true), "isPose true for valid pose");
ok(() => assert.equal(isPose(null), false), "isPose false for null");
ok(() => assert.equal(isPose(42), false), "isPose false for non-object");
ok(
  () => {
    const p = makePose(0);
    delete p.core.rx;
    assert.equal(isPose(p), false);
  },
  "isPose false for missing slot"
);
ok(
  () => {
    const p = makePose(0);
    p.core.x = NaN;
    assert.equal(isPose(p), false);
  },
  "isPose false for NaN leaf"
);
ok(
  () => {
    const p = makePose(0);
    p.accentMix = "0.5";
    assert.equal(isPose(p), false);
  },
  "isPose false for non-number accentMix"
);
ok(
  () => {
    const p = makePose(0);
    delete p.orbits;
    assert.equal(isPose(p), false);
  },
  "isPose false for missing group"
);

console.log(`PASS — pose.js: ${checks} checks`);
