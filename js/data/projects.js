/**
 * projects.js — the ONLY source of project data (Decision D4).
 *
 * Content lives in `content.json` (key `projects`); this module is only the
 * typed read + the derived helpers ui.js expects. Edit the JSON, not this file.
 *
 * Scope: the pinned repositories Alif keeps on GitHub (verified via the GitHub
 * REST API `pinnedItems`/repo metadata). Descriptions were copied from each
 * repo's own GitHub description/README (verified 2026-10-03) — never guessed.
 *
 * Field notes (see content.json for the live values):
 *   `fork`     (optional boolean) — render a FORK badge when true.
 *   `caseFile` (optional object)  — evidence-first case-study block:
 *                 { problem, role, approach, why, proof: [{label,url}], outcome }
 *               Only verified facts; leave `outcome` "" when no public
 *               evidence exists (the renderer omits the row — never a
 *               placeholder); omit `proof` entries you cannot link to.
 */
import { loadContent } from "./content.js";

const content = await loadContent();

/** @type {object[]} every project card, in display order */
export const projects = Array.isArray(content?.projects) ? content.projects : [];

/** The project flagged `featured` (falls back to the first entry). */
export const featuredProject = projects.find((p) => p.featured) || projects[0] || null;

/** Card count — used by the UI's return payload and any future stat. */
export const repoCount = projects.length;
