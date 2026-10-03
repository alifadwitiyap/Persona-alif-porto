/**
 * profile.js — single source of truth for identity + copy.
 * Content is grounded in the LinkedIn profile; no invented claims or numbers.
 * No phone number or private contact is stored here.
 */
export const profile = {
  name: "Alif Adwitiya Pratama",
  handle: "alifadwitiyap",
  role: "T-Shaped Data Scientist",
  // Kept short for the hero; the long headline lives in `headline`.
  headline:
    "T-Shaped Data Scientist \u00b7 Assistant Manager at Bank Mandiri \u00b7 " +
    "Distinction Graduate, Bangkit Academy 2022",
  tagline: "Built 4 Life[\u2665] \u2014 From real life needs to real life solutions.",
  location: "Bandung, West Java, Indonesia",
  links: {
    github: "https://github.com/alifadwitiyap",
    linkedin: "https://www.linkedin.com/in/alifadwitiyap/",
    // Email intentionally omitted until a public address is provided.
    email: "",
  },
  about: [
    "Assistant Manager at Bank Mandiri, joining through the Officer Development " +
      "Program. I handle Collection Systems from the business side: gathering " +
      "requirements with users, improving the system, and making sure operations " +
      "run smoothly and reliably.",
    "I graduated with distinction from Telkom University with a T-shaped skill set " +
      "in software engineering and a focus on data science. I also work in " +
      "back-end development and cloud computing, which helps me approach problems " +
      "from more than one angle.",
    "I'm most interested in AI \u2014 especially agentic tools and process " +
      "automation \u2014 and in building solutions that are actually more efficient " +
      "and more intelligent than what came before.",
  ],
  // From the LinkedIn profile's top skills + skills section.
  skills: [
    {
      group: "Core",
      items: ["Machine Learning", "SQL", "Python", "Data Visualization", "Statistics"],
    },
    {
      group: "Data & Cloud",
      items: ["Data Engineering", "Data Warehousing", "BigQuery", "Apache Spark", "GCP", "Microsoft Fabric"],
    },
    {
      group: "Engineering",
      items: ["Back-end Development", "REST API", "Cloud Computing", "Java", "Kotlin"],
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
