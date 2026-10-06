/**
 * skill-links.test.mjs — contract check for js/data/skill-links.js
 * (interface contract §1, docs/plans/hermes-local/2026-10-07-cycle2-contract.md).
 *
 * Plain node, no test runner. The HONESTY RULE is the point of this file: every
 * skill label must be a real string in profile.js skills[].items, every project
 * id must exist in projects.js, and every link must trace to the contract's
 * verified mapping table. No invented links.
 *
 * Run: node lab/skill-links.test.mjs
 */
import assert from "node:assert/strict";

const {
  skillLinks,
  projectSkills,
  projectsForSkill,
  skillsForProject,
  skillNodeIndex,
} = await import("../js/data/skill-links.js");
const { projects } = await import("../js/data/projects.js");
const { profile } = await import("../js/data/profile.js");

/* ---------------- known sets, derived from the real sources ------------- */
const KNOWN_PROJECT_IDS = projects.map((p) => p.id);
const KNOWN_PROJECT_ID_SET = new Set(KNOWN_PROJECT_IDS);
const KNOWN_SKILL_SET = new Set(profile.skills.flatMap((g) => g.items));

// The task's explicit known sets — asserted directly so an id/label that only
// exists by accident cannot slip through.
assert.deepEqual(
  [...KNOWN_PROJECT_ID_SET].sort(),
  ["ndetcstemmer", "unword", "wa-bulk"],
  "projects.js exposes exactly the three known project ids",
);

/* ---------------- 1. the frozen verified mapping table ------------------ */
// From the contract §1 honesty table (verified lang/topics -> profile skills).
const EXPECTED_SKILL_LINKS = {
  Python: ["ndetcstemmer", "wa-bulk"],
  "Machine Learning": ["ndetcstemmer"],
  "RPA Automation": ["wa-bulk"],
};

assert.deepEqual(
  skillLinks,
  EXPECTED_SKILL_LINKS,
  "skillLinks matches the contract's verified mapping table exactly",
);

/* ---------------- 2. no invented skill label ---------------------------- */
for (const label of Object.keys(skillLinks)) {
  assert.ok(
    KNOWN_SKILL_SET.has(label),
    `skill label "${label}" is a real profile.js skills[].items string`,
  );
}

/* ---------------- 3. no invented project id ----------------------------- */
for (const [label, ids] of Object.entries(skillLinks)) {
  assert.ok(Array.isArray(ids), `skillLinks["${label}"] is an array`);
  for (const id of ids) {
    assert.ok(
      KNOWN_PROJECT_ID_SET.has(id),
      `project id "${id}" (linked to "${label}") exists in projects.js`,
    );
  }
}

/* ---------------- 4. unword links to nothing ---------------------------- */
for (const [label, ids] of Object.entries(skillLinks)) {
  assert.ok(
    !ids.includes("unword"),
    `unword is not linked to "${label}" (contract: unword -> none)`,
  );
}
assert.deepEqual(projectsForSkill("CSS"), [], "no skill links to unword");

/* ---------------- 5. projectSkills is the exact inversion --------------- */
// Recompute the inversion from skillLinks and require equality.
const derived = {};
for (const [label, ids] of Object.entries(skillLinks)) {
  for (const id of ids) {
    (derived[id] ??= []).push(label);
  }
}
assert.deepEqual(
  projectSkills,
  derived,
  "projectSkills is the correct inversion of skillLinks",
);
assert.deepEqual(
  projectSkills,
  {
    ndetcstemmer: ["Python", "Machine Learning"],
    "wa-bulk": ["Python", "RPA Automation"],
  },
  "projectSkills holds the verified per-project skill labels",
);
// Every label it reports is real.
for (const labels of Object.values(projectSkills)) {
  for (const label of labels) {
    assert.ok(KNOWN_SKILL_SET.has(label), `inverted label "${label}" is real`);
  }
}

/* ---------------- 6. projectsForSkill: known + unknown -> [] ------------ */
assert.deepEqual(projectsForSkill("Python"), ["ndetcstemmer", "wa-bulk"]);
assert.deepEqual(projectsForSkill("Machine Learning"), ["ndetcstemmer"]);
assert.deepEqual(projectsForSkill("RPA Automation"), ["wa-bulk"]);
for (const unknown of ["CSS", "Kotlin", "nope", "", null, undefined]) {
  const got = projectsForSkill(unknown);
  assert.ok(Array.isArray(got), `projectsForSkill(${String(unknown)}) is an array`);
  assert.deepEqual(got, [], `projectsForSkill(${String(unknown)}) -> []`);
}

/* ---------------- 7. skillsForProject: known + unknown -> [] ------------ */
assert.deepEqual(skillsForProject("ndetcstemmer"), ["Python", "Machine Learning"]);
assert.deepEqual(skillsForProject("wa-bulk"), ["Python", "RPA Automation"]);
assert.deepEqual(skillsForProject("unword"), [], "unword -> no skills");
for (const unknown of ["nope", "", null, undefined]) {
  const got = skillsForProject(unknown);
  assert.ok(Array.isArray(got), `skillsForProject(${String(unknown)}) is an array`);
  assert.deepEqual(got, [], `skillsForProject(${String(unknown)}) -> []`);
}

/* ---------------- 8. every known project resolves, never null ----------- */
for (const id of KNOWN_PROJECT_IDS) {
  const got = skillsForProject(id);
  assert.ok(Array.isArray(got), `skillsForProject("${id}") is never null`);
}

/* ---------------- 9. skillNodeIndex: collision-free, bounded ------------- */
// Regression for the bug the reviewer found: a string hash put "Machine
// Learning" and "RPA Automation" on the SAME node at 8 nodes. The ordinal
// assignment must keep the linked skills distinct for every plausible count.
const LINKED = Object.keys(skillLinks).sort();
for (let n = LINKED.length; n <= 14; n++) {
  const idx = LINKED.map((s) => skillNodeIndex(s, n));
  idx.forEach((i) => assert.ok(i >= 0 && i < n, `index ${i} in range for n=${n}`));
  assert.equal(
    new Set(idx).size,
    LINKED.length,
    `linked skills get DISTINCT nodes at n=${n} (got ${idx})`,
  );
}
// Unknown / degenerate inputs.
for (const bad of ["CSS", "nope", "", null, undefined]) {
  assert.equal(skillNodeIndex(bad, 8), -1, `skillNodeIndex(${String(bad)}) -> -1`);
}
assert.equal(skillNodeIndex("Python", 0), -1, "nodeCount 0 -> -1");
assert.equal(skillNodeIndex("Python", -3), -1, "negative nodeCount -> -1");
// Deterministic: same input, same output.
assert.equal(skillNodeIndex("Python", 7), skillNodeIndex("Python", 7), "deterministic");

console.log(
  "PASS — skill-links: verified mapping only, correct inversion, [] on unknown, collision-free node index",
);
