/**
 * projects.js — the ONLY source of project data (Decision D4).
 * Scope: ONLY the repositories Alif pinned on GitHub (verified via the GitHub
 * REST API `pinnedItems`/repo metadata). The old 12-repo dump was removed.
 *
 * Descriptions were copied from each repo's own GitHub description/README
 * (verified 2026-10-03) — never guessed. `fork: true` marks a pinned fork of a
 * team/org repo; the card links to Alif's pin and states his specific role.
 *
 * Field notes:
 *   `fork` (optional boolean) — render a FORK badge when true.
 */
export const projects = [
  {
    id: "ndetcstemmer",
    name: "NDETCStemmer",
    featured: true,
    lang: "Python",
    stars: 13,
    year: "2022",
    topics: ["indonesian-language", "nlp-library", "nlp-stemming"],
    desc:
      "Library implementing a nondeterministic, context-based stemming method " +
      "for ambiguous Indonesian words (words with more than one morphological meaning).",
    url: "https://github.com/alifadwitiyap/NDETCStemmer",
  },
  {
    id: "unword",
    name: "unword",
    featured: false,
    lang: "CSS",
    stars: 0,
    year: "2026",
    topics: ["web", "tool"],
    desc:
      "A tiny web app that breaks a long password or string into vertical " +
      "per-character output.",
    url: "https://github.com/alifadwitiyap/unword",
  },
  {
    id: "online-store-digital-records",
    name: "online-store-digital-records",
    featured: false,
    lang: "JavaScript",
    stars: 1,
    year: "2022",
    topics: ["web", "inventory", "fuzzy-logic"],
    fork: true,
    desc:
      "Online-store inventory system: stock and sales records, progress " +
      "reporting, and AI-assisted restock suggestions (fuzzy score). Team project.",
    url: "https://github.com/alifadwitiyap/online-store-digital-records",
  },
  {
    id: "ibm-data-science-capstone",
    name: "IBM-DATA-SCIENCE-CAPSTONE",
    featured: false,
    lang: "Jupyter Notebook",
    stars: 0,
    year: "2024",
    topics: ["data-science", "machine-learning", "visualization"],
    desc:
      "End-to-end data-science capstone on SpaceX Falcon 9 launches: data " +
      "collection, wrangling, exploratory analysis, visualization, and a model " +
      "predicting first-stage landing success.",
    url: "https://github.com/alifadwitiyap/IBM-DATA-SCIENCE-CAPSTONE",
  },
  {
    id: "c22-ps168-machine-learning",
    name: "C22-PS168-Machine-Learning",
    featured: false,
    lang: "Python",
    stars: 0,
    year: "2022",
    topics: ["bangkit", "machine-learning", "capstone"],
    fork: true,
    desc:
      "Machine-learning workspace for the Bangkit capstone (team " +
      "TheRisingStarTeam). My role: data preprocessing, data pipeline, " +
      "scheduling, and integrating the model into the database.",
    url: "https://github.com/alifadwitiyap/C22-PS168-Machine-Learning",
  },
  {
    id: "wa-bulk",
    name: "WA-Bulk",
    featured: false,
    lang: "Python",
    stars: 0,
    year: "2026",
    topics: ["streamlit", "openwa", "sqlite"],
    desc:
      "Personal WhatsApp bulk sender: scheduled or ad-hoc broadcasts with a " +
      "monitoring dashboard and a responsible-sending guard (rate limits, " +
      "jitter, cooldown). Streamlit + OpenWA + SQLite.",
    url: "https://github.com/alifadwitiyap/WA-Bulk",
  },
];

export const featuredProject = projects.find((p) => p.featured) || projects[0];
export const repoCount = projects.length;
