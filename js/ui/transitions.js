/**
 * transitions.js — the cinematic layer between chapters.
 *
 * Two small, independent surfaces, both driven ONLY by the single
 * `portfolio:sectionchange` event published by js/sections.js:
 *
 *   1. CUT-PAPER WIPE  (#chapter-wipe)
 *      A decorative diagonal panel that sweeps once per *committed* chapter
 *      change. It is a layer, never a gate: the new chapter is already in the
 *      DOM underneath, scroll and pointer input are never blocked (the layer
 *      is `pointer-events: none` in CSS), and the sweep is skipped entirely
 *      during the opening screen, in a hidden tab, or under reduced motion.
 *
 *   2. STORY RAIL  (.story-rail + .section__story[data-act])
 *      The narrative microcopy (act + beat) for the active chapter, mirrored
 *      from the same `story` block of the mood registry. The copy itself lives
 *      in the HTML (`[data-story-beat]`), so it reads with JS disabled; this
 *      module only stamps the ACT tag and fills the fixed rail.
 *
 * Contract (docs/plans/2026-10-04-overlay-progress-intro-cinematic.md §2f/§3,
 * css/overlays.css):
 *   - Scroll stays the single source of truth. This module only renders the
 *     consequence of the resolver's decision; it never decides the active
 *     section, never writes `aria-current`, and never touches scroll.
 *   - CSS owns the look (keyframes `wipe-pass` / `wipe-label`, the torn-paper
 *     clip-path). JS only toggles `.is-running`, sets the label text, and
 *     writes the advisory custom properties named by the contract.
 *   - Queue depth is 1: a change that lands mid-sweep REPLACES the pending
 *     target, so we settle on the last chapter and never stack sweeps.
 */

import { getSectionMood } from "../data/section-moods.js";

/** True when the OS asks for reduced motion (never throws). */
const prefersReduced = () => {
  try {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  } catch {
    return false;
  }
};

/**
 * Safety clear for `.is-running` if `animationend` never fires — a tab
 * backgrounded mid-sweep, an animation disabled by an extension, or the layer
 * detached. Comfortably longer than the CSS `--t-slow` (600ms) sweep, so it
 * only ever fires when the real event is genuinely lost. Without it the panel
 * could stay stuck over the page.
 */
const WIPE_SAFETY_MS = 900;

/* ============================================================
   1. Cut-paper wipe
   ============================================================ */

/**
 * Drive the cut-paper wipe from the section-change event.
 *
 * @returns {{ run:Function, dispose:Function }} shape-compatible handle; inert
 *          when #chapter-wipe is absent.
 */
export function initTransitions() {
  const layer = document.getElementById("chapter-wipe");
  const labelEl = document.getElementById("chapter-wipe-label");
  const panel = layer?.querySelector(".chapter-wipe__panel") || null;

  const noop = () => {};
  // No markup → inert handle so main.js never has to null-check.
  if (!layer) return { run: noop, dispose: noop };

  let previousId = null; // last chapter SEEN (the first event is boot)
  let previousStep = 0; // its progress step, for sweep direction
  let running = false;
  let pending = null; // newest un-played detail (queue = 1)
  let safety = 0;
  let controller = null; // aborts the live `animationend` listener

  // Seed from the DOM: sections.js publishes its initial "hero" state DURING
  // initSections(), which main.js runs BEFORE initTransitions() — so that boot
  // event is already gone by the time we subscribe. Reading `data-section`
  // (written by the resolver) here means the first *real* change is a genuine
  // change, not a missed boot that would be swallowed as one.
  const seedId = document.documentElement.getAttribute("data-section");
  if (seedId) {
    previousId = seedId;
    previousStep = Number.isFinite(getSectionMood(seedId)?.progress?.step)
      ? getSectionMood(seedId).progress.step
      : 0;
  }

  /** Tear down the live sweep and return the layer to its resting state. */
  function clearRunning() {
    clearTimeout(safety);
    safety = 0;
    controller?.abort();
    controller = null;
    running = false;
    layer.classList.remove("is-running");
  }

  /** Play the pending sweep (if any). One at a time. */
  function run() {
    const detail = pending;
    pending = null;
    if (!detail) return;

    // Decorative only: never animate during the opening screen, in a hidden
    // tab, or under reduced motion. The chapter state is already current — we
    // simply do not paint a sweep for it.
    if (
      prefersReduced() ||
      document.hidden ||
      document.getElementById("intro")
    ) {
      return;
    }

    const mood = detail.mood || getSectionMood(detail.id);

    // Advisory hooks named by the design contract. The current keyframes are
    // fixed (so the sweep is deterministic), but these let the CSS lane read
    // the incoming accent and travel direction without another module.
    layer.style.setProperty("--transition-accent", mood?.accent || "");
    layer.style.setProperty("--transition-direction", detail.direction < 0 ? "-1" : "1");

    // The wipe "in" label is the INCOMING chapter's transitionIn (see the
    // story block in section-moods.js). Falls back to the menu label.
    if (labelEl) {
      labelEl.textContent =
        mood?.story?.transitionIn || mood?.menu?.label || "";
    }

    running = true;

    // Restart from a clean state so a repeat sweep re-triggers the animation.
    layer.classList.remove("is-running");
    void layer.offsetWidth; // force reflow
    layer.classList.add("is-running");

    // Prefer the real end of the animation; fall back to the timer so the layer
    // can never stay stuck over the page.
    const done = () => {
      if (!running) return;
      clearRunning();
      if (pending) run(); // settle toward the most recent chapter
    };
    controller = typeof AbortController === "function" ? new AbortController() : null;
    const opts = controller ? { once: true, signal: controller.signal } : { once: true };
    (panel || layer).addEventListener("animationend", done, opts);
    safety = setTimeout(done, WIPE_SAFETY_MS);
  }

  /** One event, every surface. Boot, no-op and mid-sweep are all handled here. */
  const onSectionChange = (e) => {
    const detail = e.detail;
    if (!detail || !detail.id) return;

    const step = Number.isFinite(detail.index) ? detail.index : 0;

    // First resolved chapter: record it, do not sweep the page on boot.
    if (previousId === null) {
      previousId = detail.id;
      previousStep = step;
      return;
    }

    // Same chapter (hysteresis re-publish): nothing to do.
    if (detail.id === previousId) return;

    const direction = step >= previousStep ? 1 : -1;
    previousId = detail.id;
    previousStep = step;

    pending = { ...detail, direction };
    if (!running) run();
  };

  window.addEventListener("portfolio:sectionchange", onSectionChange);

  return {
    run,
    dispose() {
      window.removeEventListener("portfolio:sectionchange", onSectionChange);
      clearRunning();
      pending = null;
      previousId = null;
    },
  };
}

/* ============================================================
   2. Story rail
   ============================================================ */

/**
 * Mirror the active chapter's narrative microcopy into the story rail and tag
 * each section's beat with its ACT.
 *
 * @returns {{ setStory:Function, dispose:Function }} handle; the rail element
 *          is created if the HTML did not provide one.
 */
export function initStoryRail() {
  // The rail is optional chrome — build it when the HTML did not supply one.
  let rail = document.querySelector(".story-rail");
  let actEl = null;
  let beatEl = null;
  let created = false;

  if (!rail) {
    rail = document.createElement("div");
    rail.className = "story-rail";
    rail.setAttribute("aria-hidden", "true"); // purely decorative
    actEl = document.createElement("span");
    actEl.className = "story-rail__act";
    beatEl = document.createElement("span");
    beatEl.className = "story-rail__beat";
    rail.append(actEl, beatEl);
    document.body.appendChild(rail);
    created = true;
  } else {
    actEl = rail.querySelector(".story-rail__act");
    beatEl = rail.querySelector(".story-rail__beat");
  }

  // Stamp each section's story beat with its ACT tag once at boot. The CSS
  // prints it through `[data-act]::before`; the beat sentence itself already
  // lives in the HTML, so this stays readable with JS off.
  document.querySelectorAll("[data-story-beat]").forEach((el) => {
    const section = el.closest("section[id]");
    const mood = section ? getSectionMood(section.id) : null;
    if (mood?.story?.act) el.setAttribute("data-act", mood.story.act);
  });

  /** Write one chapter's act + beat into the fixed rail. */
  function setStory(id) {
    const story = getSectionMood(id)?.story;
    if (!story) return;
    if (actEl && actEl.textContent !== (story.act || "")) {
      actEl.textContent = story.act || "";
    }
    if (beatEl && beatEl.textContent !== (story.beat || "")) {
      beatEl.textContent = story.beat || "";
    }
  }

  // Seed from the current section. sections.js does not publish on boot (it
  // starts already on "hero"), so read the state the resolver seeded instead.
  const seed = document.documentElement.getAttribute("data-section") || "hero";
  setStory(seed);

  const onSectionChange = (e) => {
    const id = e.detail?.id;
    if (id) setStory(id);
  };
  window.addEventListener("portfolio:sectionchange", onSectionChange);

  return {
    setStory,
    dispose() {
      window.removeEventListener("portfolio:sectionchange", onSectionChange);
      if (created) rail?.remove();
    },
  };
}
