/**
 * chapter-select.js — the in-page chapter navigator (a real section, not an
 * overlay).
 *
 * Architecture (see docs/plans/2026-10-03-chapter-select-hall-of-fame.md §2a):
 *   scroll → sections.js resolver → active id
 *                                 ├→ scene.setActive(id)
 *                                 └→ chapterSelect.setActive(id)   (highlight only)
 *   chapter link click → native anchor → browser scroll → resolver confirms
 *
 * There is no open/close state, no focus trap, no body scroll-lock, no
 * backdrop and no Escape handler: the list is always in the document, the
 * items are ordinary `<a href="#id">` anchors (so they work with JS disabled,
 * are deep-linkable, and land in browser history), and the resolver remains
 * the single source of truth for which chapter is active.
 *
 * This module only: renders the items from the one registry (CHAPTER_TARGETS)
 * and mirrors the active section into the list.
 *
 * The "M" shortcut lives in js/ui/menu.js — it toggles the chapter OVERLAY,
 * not this in-page section (see docs/plans/2026-10-04-overlay-progress-intro-cinematic.md §2b).
 */

import { CHAPTER_TARGETS } from "./data/section-moods.js";

export function initChapterSelect({ getActive } = {}) {
  const list = document.getElementById("chapter-list");
  const section = document.getElementById("chapter-select");

  // Nothing to drive → inert, shape-compatible handle so main.js never has to
  // null-check the result.
  const noop = () => {};
  if (!list || !section) {
    return { setActive: noop };
  }

  /* ---------- render anchors from the single data contract ---------- */
  list.innerHTML = CHAPTER_TARGETS.map(
    ({ id, menu }) =>
      `<li><a class="chapter-select__link" href="#${id}" data-goto="${id}">` +
      `<span class="chapter-select__num" aria-hidden="true">${menu.index}</span>` +
      `<span class="chapter-select__label">${menu.label}</span>` +
      `<span class="chapter-select__hud">${menu.hud}</span>` +
      `</a></li>`
  ).join("");

  const links = [...list.querySelectorAll(".chapter-select__link")];

  /* ---------- active-item sync (called by the resolver) ---------- */
  function setActive(id) {
    links.forEach((a) => {
      const on = a.getAttribute("data-goto") === id;
      a.setAttribute("data-active", on ? "true" : "false");
      if (on) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }

  // Seed the highlight from the resolver's current section.
  if (typeof getActive === "function") setActive(getActive());

  return { setActive };
}
