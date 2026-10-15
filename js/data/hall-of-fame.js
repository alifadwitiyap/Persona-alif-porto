/**
 * hall-of-fame.js — achievements dossier (academic, awards, publications).
 *
 * Content lives in `content.json` (key `hallOfFame`); this module is only the
 * typed read. Edit the JSON, not this file.
 *
 * Single source of truth for the #hall-of-fame section ONLY. This is domain
 * content, not a navigation registry: section order / menu / HUD labels live
 * in the `sections` block of content.json. Keep the two apart.
 *
 * Every claim was verified against a primary source before shipping:
 *   - Awards + academic: Alif's own certificate / LinkedIn records.
 *   - Publications: DOIs resolved on IEEE Xplore and Garuda (Jurnal RESTI).
 * No invented numbers. `url` is left empty only where no stable public link
 * exists, so a renderer can fall back to plain text.
 *
 * Field names are part of the contract — do not rename:
 *   academic     { label, degree, school, period, gpa, scale, thesis }
 *                  `label` is rendered as the stamp/cap (like an award rank).
 *   awards[]     { rank, title, organizer, year }
 *   publications[]{ title, venue, badge, year, url }
 */
import { loadContent } from "./content.js";

const content = await loadContent();

/** @type {object} the dossier */
export const hallOfFame = content?.hallOfFame || {};

/** Award row count. */
export const awardCount = hallOfFame.awards?.length || 0;

/** Publication row count. */
export const publicationCount = hallOfFame.publications?.length || 0;
