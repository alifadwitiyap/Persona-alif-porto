/**
 * skill-links.js — DATA ONLY. The only source of skill ↔ project links.
 *
 * Frozen interface: docs/plans/hermes-local/2026-10-07-cycle2-contract.md §1.
 * No imports, no THREE, no DOM — plain ESM, testable in node
 * (lab/skill-links.test.mjs).
 *
 * HONESTY RULE (hard): every link below traces to the project's own verified
 * `lang` or `topics` field in js/data/projects.js, and every skill label is an
 * exact string from js/data/profile.js skills[].items (case-sensitive). No
 * invented capability. `unword` (CSS · web, tool) matches no skill in the list
 * and is deliberately left unlinked.
 *
 * Verified mapping (contract §1 table):
 *   ndetcstemmer  Python · indonesian-language, nlp-library, nlp-stemming
 *                 -> Python, Machine Learning
 *   wa-bulk       Python · streamlit, openwa, sqlite
 *                 -> Python, RPA Automation
 *   unword        CSS · web, tool
 *                 -> (none)
 */

/** skill label -> array of project ids that USE that skill. */
export const skillLinks = {
  Python: ["ndetcstemmer", "wa-bulk"],
  "Machine Learning": ["ndetcstemmer"],
  "RPA Automation": ["wa-bulk"],
};

/** Project id -> array of skill labels it demonstrates. Derived from skillLinks. */
export const projectSkills = (() => {
  const out = {};
  for (const [skill, ids] of Object.entries(skillLinks)) {
    for (const id of ids) {
      (out[id] ??= []).push(skill);
    }
  }
  return out;
})();

/**
 * Project ids for a skill label. Never null.
 * @param {string} skill
 * @returns {string[]} [] when the skill is unknown
 */
export function projectsForSkill(skill) {
  return skillLinks[skill] ? [...skillLinks[skill]] : [];
}

/**
 * Skill labels for a project id. Never null.
 * @param {string} projectId
 * @returns {string[]} [] when the project is unknown
 */
export function skillsForProject(projectId) {
  return projectSkills[projectId] ? [...projectSkills[projectId]] : [];
}
