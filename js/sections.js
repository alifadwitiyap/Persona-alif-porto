/**
 * sections.js — active-section tracking + scroll reveal + HUD + timeline nodes.
 * Uses IntersectionObserver; never hijacks scroll.
 *
 * Active-section resolution is deterministic:
 *   1. highest intersectionRatio wins;
 *   2. ratios within RATIO_EPSILON are a tie -> break by scroll direction
 *      (the section whose centre lies in the direction of travel wins);
 *   3. still ambiguous -> the section whose centre is closest to the viewport centre;
 *   4. hysteresis: the incumbent is kept until a challenger beats it by HYSTERESIS
 *      or the incumbent has fully left the viewport.
 */

import { sectionMoods } from "./data/section-moods.js";

const SECTIONS = [
  "hero",
  "identity-file",
  "hall-of-fame",
  "skill-arsenal",
  "mission-log",
  "case-files",
  "open-channel",
];

// Old section ids -> new ids, so a deep-link/bookmark from the previous
// vocabulary still lands on the right section (hash migration, no history churn).
const LEGACY_HASH = {
  profile: "identity-file",
  skills: "skill-arsenal",
  experience: "mission-log",
  projects: "case-files",
  contact: "open-channel",
};

// Two coverages closer than this are considered a tie.
const RATIO_EPSILON = 0.02;
// Margin a challenger must beat the incumbent by before it steals the active slot.
const HYSTERESIS = 0.06;
// Detection band = the middle 10% of the viewport (matches the -45% rootMargin).
const BAND_FRACTION = 0.10;

/** Honour the OS motion preference for programmatic scrolling. */
const prefersReduced = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initSections({ onChange } = {}) {
  const els = SECTIONS.map((id) => document.getElementById(id)).filter(Boolean);
  const hudFill = document.getElementById("hud-fill");
  const hudName = document.getElementById("hud-name");

  let active = "hero";
  let previous = null;

  // ---- geometry / scroll-direction helpers (direction is tracked internally) ----
  let direction = "down"; // 'down' | 'up'
  const centreOf = (el) => {
    const rect = el.getBoundingClientRect();
    return rect.top + rect.height / 2;
  };
  const fullyLeftViewport = (el) => {
    if (!el) return true;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return rect.bottom <= 0 || rect.top >= vh;
  };

  /**
   * Coverage of the viewport's centre band by a section, normalised to 0..1.
   *
   * We deliberately do NOT use IntersectionObserver's `intersectionRatio`:
   * that value is intersectionArea / sectionArea, so a tall section can never
   * score high (measured: a 1962px section against a 90px band maxes out at
   * 0.046). Comparing those raw ratios made the hysteresis margin (0.06) larger
   * than any achievable value, so sections only switched once the previous one
   * had fully scrolled off — a one-section lag. Dividing by the BAND height
   * instead of the section height makes every section comparable on 0..1.
   */
  const coverageOf = (el) => {
    if (!el) return 0;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const bandTop = vh * (0.5 - BAND_FRACTION / 2);
    const bandBottom = vh * (0.5 + BAND_FRACTION / 2);
    const bandHeight = bandBottom - bandTop;
    const rect = el.getBoundingClientRect();
    const overlap = Math.min(rect.bottom, bandBottom) - Math.max(rect.top, bandTop);
    return bandHeight > 0 ? Math.max(0, Math.min(1, overlap / bandHeight)) : 0;
  };

  // Latest known coverage per section, kept across observer callbacks.
  const coverages = new Map(els.map((el) => [el.id, 0]));
  const refreshCoverages = () => {
    els.forEach((el) => coverages.set(el.id, coverageOf(el)));
  };
  refreshCoverages();

  const setActive = (id) => {
    if (!id || id === active) return;
    previous = active;
    active = id;
    document.documentElement.dataset.section = id;
    const el = document.getElementById(id);
    const mood = sectionMoods[id];
    if (hudName) hudName.textContent = mood?.menu?.hud || el?.dataset.name || id;
    onChange?.(id);
  };

  /**
   * Deterministic pick from the currently visible candidates.
   * @param {Element[]} candidates sections with coverage > 0
   * @returns {Element|null}
   */
  const selectBest = (candidates) => {
    if (!candidates.length) return null;

    const ranked = candidates
      .map((el) => ({ el, cov: coverages.get(el.id) || 0 }))
      .sort((a, b) => b.cov - a.cov);

    const topCoverage = ranked[0].cov;
    const tied = ranked.filter((c) => topCoverage - c.cov <= RATIO_EPSILON);
    if (tied.length === 1) return tied[0].el;

    const vc = (window.innerHeight || document.documentElement.clientHeight) / 2;
    const withCentre = tied.map((c) => ({ ...c, centre: centreOf(c.el) }));

    // Tie-break 1: the section whose centre is in the direction of travel wins.
    if (direction === "down") {
      withCentre.sort((a, b) => b.centre - a.centre);
    } else if (direction === "up") {
      withCentre.sort((a, b) => a.centre - b.centre);
    }

    // Tie-break 2: if direction did not separate the leaders, take the section
    // whose centre is closest to the viewport centre.
    const lead = withCentre[0];
    const stillTied = withCentre.filter((c) => Math.abs(c.centre - lead.centre) < 1e-6);
    if (stillTied.length > 1) {
      stillTied.sort((a, b) => Math.abs(a.centre - vc) - Math.abs(b.centre - vc));
      return stillTied[0].el;
    }
    return lead.el;
  };

  // Active section = the one crossing the viewport middle.
  const io = new IntersectionObserver(
    () => {
      refreshCoverages();

      const candidates = els.filter((el) => (coverages.get(el.id) || 0) > 0);
      const best = selectBest(candidates);

      if (best) {
        const activeEl = document.getElementById(active);
        const bestCov = coverages.get(best.id) || 0;
        const activeCov = activeEl ? coverages.get(active) || 0 : 0;
        const challengerWins =
          best.id === active ||
          fullyLeftViewport(activeEl) ||
          bestCov >= activeCov + HYSTERESIS;

        if (challengerWins) {
          setActive(best.id);
          best.classList.add("is-active");
        }
      }

      els.forEach((el) => {
        if ((coverages.get(el.id) || 0) <= 0) el.classList.remove("is-active");
      });
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.15, 0.4, 0.75, 1] }
  );
  els.forEach((el) => io.observe(el));

  // Reveal on enter (plain reveals + swipe titles)
  const rio = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          rio.unobserve(e.target);
        }
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
  );
  document
    .querySelectorAll(".reveal, .reveal--stagger, [data-swipe]")
    .forEach((el) => rio.observe(el));

  // Experience timeline: light each node as it crosses the middle of the screen.
  const tio = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        e.target.classList.toggle("is-active", e.isIntersecting);
      });
    },
    { rootMargin: "-42% 0px -42% 0px", threshold: 0 }
  );
  document.querySelectorAll(".tl-item").forEach((el) => tio.observe(el));

  // HUD progress + active nav state (+ internal scroll-direction tracking)
  const navLinks = [...document.querySelectorAll(".nav a")];
  let raf = 0;
  let lastY = window.scrollY;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const y = window.scrollY;
      if (y > lastY) direction = "down";
      else if (y < lastY) direction = "up";
      lastY = y;

      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (hudFill) hudFill.style.right = `${(1 - p) * 100}%`;
      navLinks.forEach((a) =>
        a.setAttribute("aria-current", a.getAttribute("href") === `#${active}` ? "true" : "false")
      );
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  setActive("hero");

  // Hash migration: an old deep-link (#profile, #skills, ...) maps to the new
  // section id so bookmarks keep working. Runs once, no history entry added.
  const hash = (location.hash || "").slice(1);
  if (hash && LEGACY_HASH[hash]) {
    const target = document.getElementById(LEGACY_HASH[hash]);
    if (target) {
      history.replaceState(null, "", `#${LEGACY_HASH[hash]}`);
      requestAnimationFrame(() =>
        target.scrollIntoView({ behavior: "auto", block: "start" })
      );
    }
  }

  return {
    get active() {
      return active;
    },
    get previous() {
      return previous;
    },
    sections: SECTIONS,
    /**
     * Programmatic navigation (also available to the chapter select).
     * Scrolls the target section into view and mirrors the hash. The active
     * section itself is NOT set here: the resolver above stays the single
     * source of truth and confirms the change on the next intersection tick.
     * @param {string} id section id (one of SECTIONS)
     */
    goTo(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({
        behavior: prefersReduced() ? "auto" : "smooth",
        block: "start",
      });
      history.replaceState(null, "", `#${id}`);
    },
  };
}
