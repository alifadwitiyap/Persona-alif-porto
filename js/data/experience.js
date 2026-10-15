/**
 * experience.js — real work history (source: LinkedIn profile).
 *
 * Content lives in `content.json` (key `experience`); this module is only the
 * typed read. Edit the JSON, not this file.
 *
 * Single source of truth for the #mission-log section. No invented numbers;
 * only what the profile states.
 */
import { loadContent } from "./content.js";

const content = await loadContent();

/** @type {object[]} timeline rows, newest first */
export const experience = Array.isArray(content?.experience) ? content.experience : [];

/** Row count. */
export const experienceCount = experience.length;
