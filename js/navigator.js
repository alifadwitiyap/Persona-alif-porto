/**
 * navigator.js — overlay navigator controller ("MISSION LOG" menu).
 *
 * One state machine, three states:
 *   browsing → menu-open → transitioning → browsing
 *
 * The section resolver in sections.js stays the single source of truth:
 *   scroll → resolver → active id
 *                      ├→ scene.setActive(id)
 *                      └→ navigator.setActive(id)   (highlight only)
 *   menu item click → navigator → sections.goTo(id) → scrollIntoView + hash
 *                                                 → resolver confirms on next tick
 *
 * The overlay markup is static in index.html (works without JS: it ships
 * `hidden`). This module only renders the items, drives open/close, the focus
 * trap, the keyboard map and the one-way sync from the resolver.
 */

import { sectionMoods } from "./data/section-moods.js";

/** Document order — the single ordering source for the overlay. */
const ORDER = ["hero", "profile", "skills", "experience", "projects", "contact"];

/** Fallback so the menu still lists every section if a mood entry is missing. */
const fallbackMenu = (id) => ({ index: "", label: id.toUpperCase(), hud: id });

const isTypingTarget = (el) =>
  !!el &&
  (el.isContentEditable ||
    /^(input|textarea|select)$/i.test(el.tagName || ""));

export function initNavigator({ sections, getActive } = {}) {
  const root = document.getElementById("navigator");
  const list = document.getElementById("navigator-list");
  const menuBtn = document.getElementById("menu-btn");
  const startBtn = document.getElementById("start-btn");
  const closeBtn = document.getElementById("navigator-close");

  // Nothing to drive → return an inert, shape-compatible handle so main.js
  // never has to null-check the result.
  const noop = () => {};
  if (!root || !list || !sections || typeof sections.goTo !== "function") {
    return { open: noop, close: noop, setActive: noop, get state() { return "browsing"; } };
  }

  /* ---------- render items from the data contract ---------- */
  list.innerHTML = ORDER.map((id) => {
    const m = sectionMoods[id]?.menu ?? fallbackMenu(id);
    return (
      `<li><button class="navigator__item" type="button" data-goto="${id}"` +
      ` data-index="${m.index}">` +
      `<span class="navigator__num" aria-hidden="true">${m.index}</span>` +
      `<span class="navigator__label">${m.label}</span>` +
      `</button></li>`
    );
  }).join("");

  const items = [...list.querySelectorAll(".navigator__item")];

  /* ---------- state ---------- */
  let state = "browsing"; // 'browsing' | 'menu-open' | 'transitioning'
  let lastFocus = null;

  const focusables = () => [...root.querySelectorAll("button, a[href]")];

  /** Hide the overlay + release the body lock (no focus restore). */
  const hide = () => {
    root.hidden = true;
    document.body.classList.remove("is-locked");
    menuBtn?.setAttribute("aria-expanded", "false");
  };

  /* ---------- active-item sync (called by the resolver) ---------- */
  function setActive(id) {
    if (!id) return;
    items.forEach((btn) => {
      const on = btn.getAttribute("data-goto") === id;
      btn.setAttribute("data-active", on ? "true" : "false");
      if (on) btn.setAttribute("aria-current", "true");
      else btn.removeAttribute("aria-current");
    });
  }

  /* ---------- open / close ---------- */
  function open() {
    if (state !== "browsing") return;
    state = "menu-open";
    lastFocus = document.activeElement;
    root.hidden = false;
    document.body.classList.add("is-locked");
    menuBtn?.setAttribute("aria-expanded", "true");
    if (typeof getActive === "function") setActive(getActive());
    (root.querySelector('[data-active="true"]') || focusables()[0])?.focus();
  }

  function close() {
    if (state !== "menu-open") return;
    state = "browsing";
    hide();
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  }

  /* ---------- navigate ---------- */
  function go(id) {
    // Only navigable from an open menu, and never twice mid-transition.
    if (state !== "menu-open") return;
    state = "transitioning";
    hide(); // hide without restoring focus: we are about to scroll away
    sections.goTo(id);

    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener("scrollend", done);
      state = "browsing";
    };
    if ("onscrollend" in window) {
      window.addEventListener("scrollend", done, { once: true });
      // Safety net: scrollend never fires if we were already at the target.
      setTimeout(done, 900);
    } else {
      setTimeout(done, 700);
    }
  }

  /* ---------- event wiring ---------- */
  menuBtn?.addEventListener("click", open);
  startBtn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  root.querySelector("[data-nav-close]")?.addEventListener("click", close);

  // Item activation (click / native Enter+Space on the button).
  list.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-goto]");
    if (btn) go(btn.getAttribute("data-goto"));
  });

  // Keyboard inside the overlay: focus trap + arrow navigation.
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== "Tab" && e.key !== "ArrowUp" && e.key !== "ArrowDown") return;

    const f = focusables();
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];

    if (e.key === "Tab") {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      return;
    }

    // ArrowUp / ArrowDown move focus between menu items (wrap around).
    e.preventDefault();
    const idx = items.indexOf(document.activeElement);
    const dir = e.key === "ArrowDown" ? 1 : -1;
    const next = idx < 0 ? 0 : (idx + dir + items.length) % items.length;
    items[next]?.focus();
  });

  // Global "M" shortcut. Never while typing, and never while another lock
  // (e.g. the project modal) owns the body.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "m" && e.key !== "M") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (isTypingTarget(e.target)) return;
    if (document.body.classList.contains("is-locked")) return;
    e.preventDefault();
    open();
  });

  return {
    open,
    close,
    setActive,
    get state() {
      return state;
    },
  };
}
