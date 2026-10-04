/**
 * profile.js — single source of truth for identity + copy.
 * Content is grounded in the LinkedIn profile (latest copy); no invented
 * claims or numbers. No phone number or private contact is stored here.
 */
export const profile = {
  name: "Alif Adwitiya Pratama",
  handle: "alifadwitiyap",
  role: "Assistant Manager — Collection System & Data Analyst",
  // Kept short for the hero; the long headline lives in `headline`.
  headline:
    "Assistant Manager at Bank Mandiri \u00b7 Collection System & Data Analyst \u00b7 " +
    "AI & Data",
  tagline: "Built 4 Life[\u2665] \u2014 From real life needs to real life solutions.",
  location: "Jakarta, ID",
  links: {
    github: "https://github.com/alifadwitiyap",
    linkedin: "https://www.linkedin.com/in/alifadwitiyap/",
    email: "alifadwitiyap@gmail.com",
  },
  // Latest LinkedIn "About" copy, including the awards paragraph (user request
  // 2026-10-04: keep the cum laude / Bangkit / competitions paragraph IN the
  // Identity File too). The Hall of Fame keeps the itemised receipts; this is
  // the narrative version.
  about: [
    "Assistant Manager at Bank Mandiri, joining through the Officer Development " +
      "Program (ODP). I help collection operations become more reliable, " +
      "efficient, and data-informed by connecting business needs, systems " +
      "delivery, analytics, and process automation.",
    "I work at the intersection of business operations, data analytics, IT " +
      "support, and system improvement. My role involves collaborating with " +
      "users and IT teams to understand operational needs, translate them into " +
      "system requirements, improve process reliability, and support " +
      "data-driven decision-making in collection operations.",
    "Along the way, I graduated cum laude in Informatics from Telkom University " +
      "with a GPA of 3.90/4.00 and was a Google Bangkit Academy 2022 " +
      "Distinction Graduate (top 10% of graduates). I was 1st Winner in the " +
      "Data Analysis Competition IFest UNPAD 2022 and the Data Competition " +
      "ISFEST UMN 2021, and a finalist in Statistics In Action 2021, published " +
      "an open-source Python package (NDETCStemmer) on PyPI and contributed to " +
      "a Bangkit capstone recommender system selected among the top 53 of 433 " +
      "projects.",
    "I'm particularly interested in AI, especially agentic tools for process " +
      "automation, and I enjoy exploring ways to build more efficient and " +
      "intelligent solutions.",
  ],
  // From the LinkedIn profile's top skills + skills section.
  skills: [
    {
      group: "Core",
      items: ["Machine Learning", "SQL", "Python", "Data Visualization", "Statistics"],
    },
    {
      group: "Data & Cloud",
      items: ["Data Engineering", "Data Warehousing", "BigQuery", "Apache Spark", "GCP", "Microsoft Fabric", "Talend"],
    },
    {
      group: "Engineering",
      items: ["Back-end Development", "REST API", "Cloud Computing", "Java", "Kotlin"],
    },
    {
      group: "Applied AI",
      items: ["Agentic AI"],
    },
    {
      group: "Domain",
      items: ["Banking", "Risk Management", "RPA Automation", "System Analysis"],
    },
  ],
};

export const SITE = {
  title: "4 LIFE \u2014 Alif Adwitiya Pratama",
  description:
    "Portfolio of Alif Adwitiya Pratama. Built 4 Life \u2014 from real life needs to real life solutions.",
};
