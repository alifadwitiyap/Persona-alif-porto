/**
 * experience.js — real work history (source: LinkedIn profile).
 * Single source of truth for the #mission-log section.
 * No invented numbers; only what the profile states.
 *
 * Field notes:
 *   `more` (optional) — a public profile URL for a "see more" affordance.
 */
export const experience = [
  {
    id: "mandiri",
    org: "PT Bank Mandiri (Persero) Tbk.",
    role: "Assistant Manager — Collection System & Data Analyst",
    period: "Mar 2025 — Present",
    place: "On-site · Jakarta",
    kind: "Full-time",
    accent: "#e51e2b",
    points: [
      "Translate collection-process needs from business users, operations and IT into technical specifications and system improvements.",
      "Lead and support collection system projects: testing, go-live coordination, post-implementation review.",
      "Use data analytics to find performance trends and optimise collection workflows.",
      "Drive automation of repetitive work through RPA for higher efficiency and accuracy.",
      "Lead a 16-member technical team: set priorities, delegate, and keep service quality high.",
    ],
    tags: ["Data Analytics", "RPA", "System Analysis", "Team Lead"],
  },
  {
    id: "mandiri-odp",
    org: "PT Bank Mandiri (Persero) Tbk.",
    role: "Officer Development Program — Risk Management",
    period: "Sep 2024 — Mar 2025",
    place: "On-site · Jakarta",
    kind: "Graduate program",
    accent: "#ff3344",
    points: [
      "Rotational development program across risk management functions.",
      "Built the foundation for the current collection-system and analytics role.",
    ],
    tags: ["Risk Management", "Banking"],
  },
  {
    id: "bangkit",
    org: "Bangkit Academy 2022 — Google, GoTo & Traveloka",
    role: "Machine Learning Path — Distinction Graduate",
    period: "2022",
    place: "Remote",
    kind: "Apprenticeship",
    accent: "#22e0f5",
    points: [
      "Graduated with Distinction, in the top 10% of the cohort.",
      "Built a recommender system selected as one of the TOP 53 projects out of 433.",
    ],
    tags: ["Machine Learning", "Recommender", "Distinction", "TOP 53"],
    more: "https://www.linkedin.com/in/alifadwitiyap/",
  },
  {
    id: "dts-dev",
    org: "Digital Talent Scholarship",
    role: "Fresh Graduate Academy — Cloud Developing Trainee",
    period: "Sep 2022 — Oct 2022",
    place: "Remote",
    kind: "Apprenticeship",
    accent: "#22e0f5",
    points: ["Hands-on AWS cloud-development training."],
    tags: ["AWS", "Cloud"],
  },
];

export const experienceCount = experience.length;
