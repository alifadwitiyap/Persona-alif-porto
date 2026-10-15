/**
 * profile.js — identity + copy.
 *
 * Content lives in `content.json` (key `profile`); this module is only the
 * typed read. Edit the JSON, not this file.
 *
 * Content is grounded in the LinkedIn profile (latest copy); no invented
 * claims or numbers. No phone number or private contact is stored here.
 */
import { loadContent } from "./content.js";

const content = await loadContent();

/** @type {object} identity + narrative copy + skill groups */
export const profile = content?.profile || {};

/** @type {{title:string,description:string}} document meta */
export const SITE = content?.site || {};
