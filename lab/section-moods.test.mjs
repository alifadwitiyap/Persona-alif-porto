/**
 * section-moods.test.mjs — contract check for the POSES table + per-section
 * `pose` field added to js/data/section-moods.js (interface contract §3).
 *
 * Plain node, no test runner. Asserts the frozen pose contract AND guards the
 * existing mood contract against regression (SECTION_IDS order + resolved
 * scene values must be byte-for-byte the same as before the pose addition).
 *
 * Run: node lab/section-moods.test.mjs
 */
import assert from "node:assert/strict";

const {
  POSES,
  sectionMoods,
  SECTION_IDS,
  resolveSectionScene,
} = await import("../js/data/section-moods.js");

/* ---------------- 1. POSES exists with all 8 named poses ---------------- */
const EXPECTED_POSES = [
  "seal",
  "openFrame",
  "podium",
  "constellationWide",
  "railDiagonal",
  "archiveRack",
  "portal",
  "standard",
];
assert.ok(POSES && typeof POSES === "object", "POSES is exported");
assert.equal(Object.keys(POSES).length, EXPECTED_POSES.length, "POSES has 8 keys");
for (const id of EXPECTED_POSES) {
  assert.ok(Object.prototype.hasOwnProperty.call(POSES, id), `POSES.${id} exists`);
}
assert.ok(Object.isFrozen(POSES), "POSES is frozen");

/* ---------------- 2. every pose has all required slots, numeric leaves --- */
// slots -> required leaf keys. `accentMix` is a bare number, handled separately.
const SLOTS = {
  core: ["x", "y", "z", "rx", "ry", "rz", "scale", "opacity"],
  orbitRing: ["x", "y", "z", "rx", "ry", "rz", "scale", "opacity"],
  orbits: ["spread", "scale", "opacity"],
  shards: ["spread", "scale", "opacity"],
  constellation: ["x", "y", "z", "scale", "opacity"],
  timeline: ["x", "y", "z", "scale", "opacity"],
};

for (const id of EXPECTED_POSES) {
  const pose = POSES[id];
  assert.ok(Object.isFrozen(pose), `POSES.${id} is frozen`);
  for (const [slot, leaves] of Object.entries(SLOTS)) {
    assert.ok(pose[slot] && typeof pose[slot] === "object", `${id}.${slot} present`);
    for (const leaf of leaves) {
      assert.equal(
        typeof pose[slot][leaf],
        "number",
        `${id}.${slot}.${leaf} is numeric`,
      );
      assert.ok(Number.isFinite(pose[slot][leaf]), `${id}.${slot}.${leaf} is finite`);
    }
  }
  assert.equal(typeof pose.accentMix, "number", `${id}.accentMix is numeric`);
  assert.ok(pose.accentMix >= 0 && pose.accentMix <= 1, `${id}.accentMix in 0..1`);
}

/* ---------------- 3. standard reproduces today's NEUTRAL layout ---------- */
const STD = POSES.standard;
assert.equal(STD.core.x, 0, "standard core.x = 0");
assert.equal(STD.core.y, 0, "standard core.y = 0");
assert.equal(STD.core.z, 0, "standard core.z = 0");
assert.equal(STD.core.scale, 1, "standard core.scale = 1");
assert.equal(STD.orbitRing.x, 2.6, "standard orbitRing.x = 2.6");
assert.equal(STD.orbitRing.y, 0.4, "standard orbitRing.y = 0.4");
assert.equal(STD.orbitRing.z, 0.6, "standard orbitRing.z = 0.6");
assert.equal(STD.orbitRing.scale, 1, "standard orbitRing.scale = 1");
assert.equal(STD.orbitRing.opacity, 0.5, "standard orbitRing.opacity = 0.5");
assert.equal(STD.orbits.spread, 1, "standard orbits.spread = 1");
assert.equal(STD.orbits.scale, 1, "standard orbits.scale = 1");
assert.equal(STD.orbits.opacity, 0.38, "standard orbits.opacity = 0.38");
assert.equal(STD.shards.spread, 1, "standard shards.spread = 1");
assert.equal(STD.shards.scale, 1, "standard shards.scale = 1");
assert.equal(STD.shards.opacity, 0.15, "standard shards.opacity = 0.15");
assert.equal(STD.constellation.scale, 1, "standard constellation.scale = 1");
assert.equal(STD.timeline.scale, 1, "standard timeline.scale = 1");

/* ---------------- 4. poses are genuinely distinct ------------------------ */
// Fingerprint each pose's numeric leaves; all 8 fingerprints must be unique so
// the compositions cannot collapse onto one another.
const fingerprints = new Set();
for (const id of EXPECTED_POSES) {
  const flat = [];
  for (const [slot, leaves] of Object.entries(SLOTS)) {
    for (const leaf of leaves) flat.push(POSES[id][slot][leaf]);
  }
  flat.push(POSES[id].accentMix);
  fingerprints.add(flat.join(","));
}
assert.equal(fingerprints.size, EXPECTED_POSES.length, "all 8 poses are distinct");

/* ---------------- 5. each sectionMoods entry has a valid pose ------------ */
const EXPECTED_MAP = {
  hero: "seal",
  "identity-file": "openFrame",
  "hall-of-fame": "podium",
  "skill-arsenal": "constellationWide",
  "mission-log": "railDiagonal",
  "case-files": "archiveRack",
  "open-channel": "portal",
};
for (const [sectionId, poseId] of Object.entries(EXPECTED_MAP)) {
  assert.equal(
    sectionMoods[sectionId].pose,
    poseId,
    `${sectionId}.pose === ${poseId}`,
  );
}
for (const [sectionId, mood] of Object.entries(sectionMoods)) {
  assert.ok(
    Object.prototype.hasOwnProperty.call(POSES, mood.pose),
    `${sectionId}.pose "${mood.pose}" is one of the POSES keys`,
  );
}

/* ---------------- 6. regression guard: ids + resolved scene unchanged ---- */
const EXPECTED_SECTION_IDS = [
  "hero",
  "identity-file",
  "hall-of-fame",
  "skill-arsenal",
  "mission-log",
  "case-files",
  "open-channel",
];
assert.deepEqual(SECTION_IDS, EXPECTED_SECTION_IDS, "SECTION_IDS order unchanged");

// Exact values captured from the pre-pose module (baseline).
const BASELINE = {
  hero: { focus: 0.9, camX: 0, camY: 0.2 },
  "case-files": { focus: 3.1, camX: 0.5, camY: 0 },
};
for (const [sectionId, want] of Object.entries(BASELINE)) {
  const got = resolveSectionScene(sectionId, "standard");
  assert.ok(got, `resolveSectionScene("${sectionId}") returns an object`);
  assert.equal(got.focus, want.focus, `${sectionId} focus unchanged`);
  assert.equal(got.camX, want.camX, `${sectionId} camX unchanged`);
  assert.equal(got.camY, want.camY, `${sectionId} camY unchanged`);
}

// The pre-existing fields must still be present and untouched in shape.
for (const sectionId of EXPECTED_SECTION_IDS) {
  const mood = sectionMoods[sectionId];
  for (const field of ["order", "accent", "progress", "story", "menu", "scene"]) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(mood, field),
      `${sectionId} still has "${field}"`,
    );
  }
}

console.log("PASS — section-moods: POSES (8) + per-section pose + regression guard");
