/**
 * hall-of-fame.js — achievements dossier (academic, awards, publications).
 *
 * Single source of truth for the #hall-of-fame section ONLY. This is domain
 * content, not a navigation registry: section order / menu / HUD labels live in
 * `section-moods.js`. Keep the two apart (see the chapter-select plan, 2c).
 *
 * Every claim below was verified against a primary source before shipping:
 *   - Awards + academic: Alif's own certificate / LinkedIn records (content.md).
 *   - Publications: DOIs resolved on IEEE Xplore and Garuda (Jurnal RESTI).
 * No invented numbers. `url` is left empty only where no stable public link
 * exists, so a renderer can fall back to plain text.
 *
 * Field names are part of the contract — do not rename:
 *   academic     { label, degree, school, period, gpa, scale, thesis }
 *   awards[]     { rank, title, organizer, year }
 *   publications[]{ title, venue, badge, year, url }
 */

export const hallOfFame = {
  // Short editorial line shown under the section title.
  deck: "The receipts are in.",

  academic: {
    label: "Graduate / Cum Laude",
    degree: "Bachelor of Informatics",
    school: "Telkom University",
    period: "2019 \u2014 2023",
    gpa: "3.90",
    scale: "4.00",
    thesis: "Balinese Script Handwriting Recognition Using Faster R-CNN",
  },

  awards: [
    {
      rank: "1st Place",
      title: "Data Analysis Competition",
      organizer: "IFest UNPAD",
      year: "2022",
    },
    {
      rank: "1st Place",
      title: "Data Competition",
      organizer: "ISFEST UMN",
      year: "2021",
    },
    {
      rank: "Finalist",
      title: "Statistics in Action",
      organizer: "Universitas Islam Indonesia",
      year: "2021",
    },
    {
      rank: "Awardee",
      title: "Kaltim Tuntas Scholarship",
      organizer: "East Kalimantan Provincial Government",
      year: "2020",
    },
  ],

  publications: [
    {
      title:
        "Study on the Dynamics of COVID-19 Cases in Achieving Herd Immunity in Indonesia",
      venue: "IEEE ICICyTA 2021",
      badge: "IEEE",
      year: "2021",
      // Verified on IEEE Xplore: co-author, DOI 10.1109/ICICyTA53712.2021.9689122
      url: "https://doi.org/10.1109/ICICyTA53712.2021.9689122",
    },
    {
      title: "Balinese Script Handwriting Recognition Using Faster R-CNN",
      venue: "Jurnal RESTI, Vol 7 No 6",
      badge: "Sinta 2",
      year: "2023",
      // Verified on Garuda: DOI 10.29207/resti.v7i6.5176 (RESTI is Sinta 2 accredited)
      url: "https://doi.org/10.29207/resti.v7i6.5176",
    },
  ],
};

export const awardCount = hallOfFame.awards.length;
export const publicationCount = hallOfFame.publications.length;
