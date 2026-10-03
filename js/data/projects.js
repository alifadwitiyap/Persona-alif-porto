/**
 * projects.js — the ONLY source of project data (Decision D4).
 * Scope: ONLY the repositories Alif pinned on GitHub (verified via GraphQL
 * pinnedItems): NDETCStemmer and unword. The old 12-repo dump was removed.
 */
export const projects = [
  {
    id: "ndetcstemmer",
    name: "NDETCStemmer",
    featured: true,
    lang: "Python",
    stars: 13,
    year: "2022\u20132026",
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
];

export const featuredProject = projects.find((p) => p.featured) || projects[0];
export const repoCount = projects.length;
