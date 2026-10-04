/**
 * projects.js — the ONLY source of project data (Decision D4).
 * Scope: the pinned repositories Alif keeps on GitHub (verified via the GitHub
 * REST API `pinnedItems`/repo metadata).
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
