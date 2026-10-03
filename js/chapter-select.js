/**
 * chapter-select.js — the in-page chapter navigator (a real section, not an
 * overlay).
 *
 * Architecture (see docs/plans/2026-10-03-chapter-select-hall-of-fame.md §2a):
 *   scroll → sections.js resolver → active id
 *                                 ├→ scene.setActive(id)
 *                                 └→ chapterSelect.setActive(id)   (highlight only)
 *   chapter link click → native anchor → browser scroll → resolver confirms
 *   MENU button / key M → scroll to #chapter-select
 *
 * There is no open/close state, no focus trap, no body scroll-lock, no
 * backdrop and no Escape handler: the list is always in the document, the
 * items are ordinary `<a href="#id">` anchors (so they work with JS disabled,
 * are deep-linkable, and land in browser history), and the resolver remains
 * the single source of truth for which chapter is active.
 *
 * This module only: renders the items from the one registry (CHAPTER_TARGETS),
 * mirrors the active section into the list, and wires the "M" shortcut.
 */

import { CHAPTER_TARGETS } from "./data/section-moods.js";

/** Honour the OS motion preference for programmatic scrolling. */
const prefersReduced = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isTypingTarget = (el) =>
  !!el &&
  (el.isContentEditable ||
    /^(input|textarea|select)$/i.test(el.tagName || ""));

export function initChapterSelect({ getActive } = {}) {
  const list = document.getElementById("chapter-list");
  const section = document.getElementById("chapter-select");

  // Nothing to drive → inert, shape-compatible handle so main.js never has to
  // null-check the result.
  const noop = () => {};
  if (!list || !section) {
    return { setActive: noop, scrollToChapters: noop };
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

  /* ---------- programmatic jump to the chapter list ---------- */
  function scrollToChapters() {
    section.scrollIntoView({
      behavior: prefersReduced() ? "auto" : "smooth",
      block: "start",
    });
  }

  /* ---------- keyboard: "M" jumps to chapter select ----------
     Never while typing, and never while another lock (e.g. the project modal)
     owns the body. */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "m" && e.key !== "M") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (isTypingTarget(e.target)) return;
    if (document.body.classList.contains("is-locked")) return;
    e.preventDefault();
    scrollToChapters();
  });

  // Seed the highlight from the resolver's current section.
  if (typeof getActive === "function") setActive(getActive());

  return { setActive, scrollToChapters };
}
