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
 *   `fork`     (optional boolean) — render a FORK badge when true.
 *   `caseFile` (optional object)  — evidence-first case-study block, rendered by
 *               js/ui.js. Shape (see .comet-plan/ulw-wave1-contract.md):
 *                 { problem, role, approach, why, proof: [{label,url}], outcome }
 *               RULES: only verified facts; leave `outcome` "" when no public
 *               evidence exists (the renderer omits the row — never a placeholder);
 *               omit `proof` entries you cannot link to.
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
    caseFile: {
      problem:
        "Indonesian stemming breaks down on ambiguous words — words with more " +
        "than one morphological meaning, where a single deterministic rule " +
        "produces the wrong root.",
      role: "Creator and maintainer of the library and its published package.",
      approach:
        "A nondeterministic, context-based stemming method that keeps the " +
        "candidate readings of an ambiguous word and resolves them from " +
        "context, packaged as a reusable Python library and published on PyPI.",
      why:
        "Reliable text normalisation is the unglamorous foundation of every " +
        "downstream Indonesian NLP task.",
      proof: [
        { label: "Repository", url: "https://github.com/alifadwitiyap/NDETCStemmer" },
      ],
      // No public benchmark/evaluation artifact is recorded yet — omitted
      // rather than invented. Fill in only with a verifiable, public result.
      outcome: "",
    },
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
    caseFile: {
      problem:
        "Long passwords and strings are hard to read back and verify " +
        "character by character in a normal horizontal layout.",
      role: "Creator — concept, implementation, and styling.",
      approach:
        "A minimal, dependency-free web app that reflows any input string into " +
        "vertical per-character output so each character can be checked at a glance.",
      why:
        "A small, sharp utility that solves one real annoyance completely — " +
        "the kind of tool you reach for once and keep.",
      proof: [
        { label: "Repository", url: "https://github.com/alifadwitiyap/unword" },
      ],
      outcome: "",
    },
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
    caseFile: {
      problem:
        "Sending the same message to many contacts by hand is slow and easy to " +
        "get wrong, while naive bulk senders risk flooding recipients.",
      role: "Creator — architecture, sending engine, and guard design.",
      approach:
        "A Streamlit app over an OpenWA + SQLite stack: scheduled or ad-hoc " +
        "broadcasts, a monitoring dashboard, and a responsible-sending guard " +
        "built from rate limits, send jitter, and cooldown windows.",
      why:
        "Automating a repetitive communication task — with guardrails that keep " +
        "it responsible instead of spammy.",
      proof: [
        { label: "Repository", url: "https://github.com/alifadwitiyap/WA-Bulk" },
      ],
      outcome: "",
    },
  },
];

export const featuredProject = projects.find((p) => p.featured) || projects[0];
export const repoCount = projects.length;
