/**
 * experience.js — real work history (source: LinkedIn profile).
 * Single source of truth for the #experience section.
 * No invented numbers; only what the profile states.
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
    id: "telkom",
    org: "Telkom Indonesia",
    role: "Data Scientist Intern",
    period: "Sep 2022 — Sep 2023",
    place: "Bandung · Scrum, 2-week sprints",
    kind: "Internship · 1 yr 1 mo",
    accent: "#ffb020",
    points: [
      "Shipped a wide range of data-science work: reverse geocoding, market-basket analysis, model API, recommender systems (content + collaborative), harvest-date prediction, churn prediction, voucher scraping, fraud detection, provincial food-security clustering, and stakeholder dashboards.",
      "Earned an internship extension with a consistently average performance score above 95%.",
    ],
    tags: ["Python", "Machine Learning", "Recommender", "Fraud Detection", "Dashboards"],
  },
  {
    id: "dts-arch",
    org: "Digital Talent Scholarship",
    role: "Fresh Graduate Academy — Cloud Architecting Trainee",
    period: "Mar 2023 — Apr 2023",
    place: "Remote",
    kind: "Apprenticeship",
    accent: "#22e0f5",
    points: [
      "Completed a 170-hour AWS cloud-architecting program with hands-on labs and a final exam.",
      "AWS Academy Graduate — Cloud Architecting & Cloud Foundations.",
    ],
    tags: ["AWS", "Cloud"],
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
