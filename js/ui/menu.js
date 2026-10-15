/**
 * menu.js — the chapter OVERLAY (a modal dialog).
 *
 * Architecture (see docs/plans/2026-10-04-overlay-progress-intro-cinematic.md §2a/§2b):
 *   scroll → sections.js resolver → active id
 *                                 ├→ scene.setActive(id)
 *                                 └→ chapterMenu.setActive(id)     (overlay list, highlight)
 *   MENU button / key M / Esc / backdrop → open/close the overlay
 *   overlay item click → close → sectionsCtl.goTo(id) → resolver confirms
 *
 * Scroll stays the single source of truth: opening the menu is navigation
 * *intent*, never an active-state write. This module only renders the items
 * from the one registry (CHAPTER_TARGETS), mirrors the resolver's active
 * section into the list, and owns the overlay's open/close/focus behaviour.
 *
 * Accessibility: role="dialog" + aria-modal (markup), focus trap while open,
 * Esc to close, body scroll-lock, and focus returned to the trigger on close.
 * Items are <button>s driven by the section controller's goTo() — a native
 * anchor would fight the body scroll-lock (the browser cannot scroll a locked
 * body), so the overlay closes first and only then delegates the jump.
 */

import { CHAPTER_TARGETS } from "../data/section-moods.js";

/** Honour the OS motion preference for programmatic scrolling. */
const prefersReduced = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** True when the key event originated in a text-entry control. */
const isTypingTarget = (el) =>
  !!el &&
  (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName || ""));

export function initMenu({ sections, getActive, goTo } = {}) {
  const root = document.getElementById("chapter-menu");
  const list = document.getElementById("chapter-menu-list");
  const trigger = document.getElementById("menu-btn");
  const closeBtn = document.getElementById("chapter-menu-close");

  // Nothing to drive → inert, shape-compatible handle so main.js never has to
  // null-check the result.
  const noop = () => {};
  if (!root || !list) {
    return { open: noop, close: noop, setActive: noop, isOpen: () => false };
  }

  /* ---------- render items from the single data contract ---------- */
  list.innerHTML = CHAPTER_TARGETS.map(
    ({ id, menu }) =>
      `<li><button class="chapter-menu__link" type="button" data-goto="${id}">` +
      `<span class="chapter-menu__num" aria-hidden="true">${menu.index}</span>` +
      `<span class="chapter-menu__label">${menu.label}</span>` +
      `<span class="chapter-menu__hud">${menu.hud}</span>` +
      `</button></li>`
  ).join("");

  const items = [...list.querySelectorAll(".chapter-menu__link")];

  let open = false;
  let lastFocus = null;

  /* ---------- focus helpers ---------- */
  const focusables = () =>
    [...root.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])")]
      .filter((el) => !el.disabled);

  /* ---------- active-item sync (called by the resolver) ---------- */
  function setActive(id) {
    items.forEach((b) => {
      const on = b.getAttribute("data-goto") === id;
      b.setAttribute("data-active", on ? "true" : "false");
      if (on) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    });
  }

  /* ---------- open / close ---------- */
  function openMenu() {
    if (open) return;
    open = true;
    lastFocus = document.activeElement;
    root.hidden = false;
    document.body.classList.add("is-locked");
    trigger?.setAttribute("aria-expanded", "true");
    setActive(typeof getActive === "function" ? getActive() : null);
    (list.querySelector('[data-active="true"]') || focusables()[0])?.focus();
  }

  function closeMenu() {
    if (!open) return;
    open = false;
    root.hidden = true;
    document.body.classList.remove("is-locked");
    trigger?.setAttribute("aria-expanded", "false");
    if (lastFocus instanceof HTMLElement && document.contains(lastFocus)) {
      lastFocus.focus();
    }
  }

  function toggle() {
    if (open) closeMenu();
    else openMenu();
  }

  /* ---------- navigate (intent → close → resolver confirms) ---------- */
  function go(id) {
    if (!id) return;
    closeMenu();
    // Prefer the section controller's goTo (it mirrors the hash and lets the
    // resolver confirm the active section); fall back to a local scroll.
    const navigate =
      (typeof sections?.goTo === "function" && sections.goTo.bind(sections)) ||
      (typeof goTo === "function" && goTo) ||
      null;
    if (navigate) {
      navigate(id);
      return;
    }
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({
      behavior: prefersReduced() ? "auto" : "smooth",
      block: "start",
    });
    history.replaceState(null, "", `#${id}`);
  }

  /* ---------- pointer wiring ---------- */
  trigger?.addEventListener("click", toggle);
  closeBtn?.addEventListener("click", closeMenu);
  root
    .querySelectorAll("[data-menu-close]")
    .forEach((el) => el.addEventListener("click", closeMenu));
  list.addEventListener("click", (e) => {
    const btn = e.target.closest(".chapter-menu__link");
    if (btn) go(btn.getAttribute("data-goto"));
  });

  /* ---------- keyboard: M toggles, Esc closes, arrows move, Tab is trapped.
     Registered in the capture phase so Esc reaches the overlay before the
     project modal's document-level handler (ui.js) can act on it. ---------- */
  document.addEventListener(
    "keydown",
    (e) => {
      if (
        (e.key === "m" || e.key === "M") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !isTypingTarget(e.target)
      ) {
        if (open) {
          e.preventDefault();
          closeMenu();
        } else if (!document.body.classList.contains("is-locked")) {
          // Never steal "M" while another lock (e.g. the project modal) owns
          // the body.
          e.preventDefault();
          openMenu();
        }
        return;
      }

      if (!open) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
        return;
      }

      if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!items.length) return;
        const i = items.indexOf(document.activeElement);
        const next =
          i < 0
            ? 0
            : (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        e.preventDefault();
        items[next].focus();
      }
    },
    true
  );

  // Seed the highlight from the resolver's current section.
  if (typeof getActive === "function") setActive(getActive());

  return { open: openMenu, close: closeMenu, setActive, isOpen: () => open };
}
