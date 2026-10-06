/**
 * main.js — entry point.
 * Order matters: content renders first, enhancement second. If WebGL or any
 * module import fails, the page still reads and works.
 */
import { initUI } from "./ui.js";
import { initSections } from "./sections.js";
import { initMenu } from "./ui/menu.js";
import { initProgress } from "./ui/progress.js";
import { initIntro } from "./intro.js";
import { initStoryRail } from "./ui/story-rail.js";
import { initPortrait, initPortraitLayout } from "./portrait.js";
import { createPerfTier } from "./performance.js";

async function init() {
  // 1. Content + interaction (never depends on WebGL)
  initUI();

  // 2. Portrait (manifest-driven, falls back to a styled placeholder)
  try {
    await initPortrait({ parallax: true });
  } catch (err) {
    console.warn("[portrait] skipped:", err);
  }

  // 2b. Sticky-portrait layout guard: keeps the hero portrait pinned only when
  // it is safe (wide + tall viewport, native position:sticky); otherwise the
  // track gets `is-sticky-fallback` and the portrait stays in normal flow.
  // Held so the reduced-motion change handler can tear its listeners down.
  const portraitLayout = initPortraitLayout();

  // 3. Sticky portrait morph on scroll (independent of WebGL)
  const morph = initPortraitMorph();

  // 4. Adaptive tier (measures real frame time)
  const { tier, sample, isReduced } = createPerfTier({
    onDowngrade: (t) => {
      if (t.name === "low" && world) world.setBokehEnabled(false);
    },
  });

  // 5. Sections + scene wiring
  let world = null;
  let menu = null; // overlay menu
  const sectionsCtl = initSections({
    onChange: (id) => {
      world?.setActive(id);
      // The resolver is the single source of truth — mirror it into the
      // overlay menu (highlight only).
      menu?.setActive(id);
      // When the mission-log section is active, sync the 3D node to the
      // timeline card nearest the viewport middle.
      if (id === "mission-log") syncTimelineNode(world);
    },
  });

  // 5b. Overlay chapter menu (opened by the MENU button / key M). Renders its
  // own list from the registry and calls sections.goTo(); the resolver still
  // owns the active section.
  menu = initMenu({
    sections: sectionsCtl,
    getActive: () => sectionsCtl.active,
  });

  // 5d. Progress bar (topbar) + story beats — driven by the single
  // `portfolio:sectionchange` event, never by raw scroll. The section-to-section
  // motion is the 3D camera space-shift in scene.js (js/camera-shift.js); there
  // is no overlay transition layer.
  const progress = initProgress();
  progress?.update({
    id: sectionsCtl.active,
    index: 0,
    total: 7,
    progress: 0,
  });
  initStoryRail();

  // 5e. Opening screen — an enhancement that never blocks beyond its timeout.
  // It overlays the page and removes itself; content underneath is already live.
  initIntro({ maxMs: 1800 });

  // 6. WebGL stage — decorative, guarded, disposable
  const canvas = document.getElementById("gl");
  const stage = document.querySelector(".stage");
  const canRunWebGL =
    canvas &&
    !isReduced &&
    window.matchMedia("(min-width: 640px)").matches &&
    hasWebGL();

  if (!canRunWebGL) {
    stage?.setAttribute("data-webgl", "off");
    return;
  }

  try {
    const { createScene } = await import("./scene.js");
    world = createScene(canvas, { tier, reduced: isReduced });
    stage?.setAttribute("data-webgl", "on");

    // Feed frame times to the tier sampler during the warm-up window.
    const origRAF = window.requestAnimationFrame.bind(window);
    let prev = performance.now();
    let warm = 0;
    const probe = (now) => {
      sample(now - prev);
      prev = now;
      if (warm++ < 120) origRAF(probe);
    };
    origRAF(probe);

    world.start();

    // Project Docking: hover/focus on a project card aims the 3D dock frame at
    // it. Keyboard focus is wired identically (focusin/focusout) so the effect
    // is not mouse-only. dockToRect is a no-op under reduced motion.
    initDocking(world);

    // Skill Signal: hovering/focusing a skill chip lights its linked
    // constellation node. Keyboard focus is wired the same as hover.
    initSkillSignal(world);

    // Track the experience card in view → light the matching 3D node.
    const tio = new IntersectionObserver(
      () => syncTimelineNode(world),
      { rootMargin: "-42% 0px -42% 0px", threshold: 0 }
    );
    document.querySelectorAll(".tl-item").forEach((el) => tio.observe(el));

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) world.stop();
      else world.start();
    });

    let rt = 0;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => world.resize(), 150);
    });

    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", (e) => {
      if (e.matches) {
        world.dispose();
        world = null;
        stage?.setAttribute("data-webgl", "off");
        morph?.reset();
        portraitLayout.dispose();
      }
    });
  } catch (err) {
    console.warn("[scene] WebGL disabled:", err);
    stage?.setAttribute("data-webgl", "off");
  }
}

/**
 * Project Docking — aim the 3D dock frame at the hovered/focused project card.
 * Keyboard focus (focusin) is wired the same as pointer hover, so the effect is
 * available without a mouse. Mouse-only affordances (mouseenter) are paired with
 * focusin; both release on the matching out-event.
 */
function initDocking(world) {
  if (!world?.dockToRect) return;
  const cards = document.querySelectorAll("[data-project], .spotlight");
  cards.forEach((el) => {
    // Hover and focus are tracked SEPARATELY: releasing on the mouse-out event
    // must not drop a dock that keyboard focus still holds (and vice-versa).
    let hovered = false;
    let focused = false;
    const sync = () => {
      if (hovered || focused) world.dockToRect(el.getBoundingClientRect());
      else world.dockRelease();
    };
    el.addEventListener("mouseenter", () => { hovered = true; sync(); }, { passive: true });
    el.addEventListener("mouseleave", () => { hovered = false; sync(); }, { passive: true });
    el.addEventListener("focusin", () => { focused = true; sync(); });
    el.addEventListener("focusout", (e) => {
      // focusout bubbles when focus moves between two children INSIDE the same
      // card — that is not a release, so ignore it unless focus truly left.
      if (el.contains(e.relatedTarget)) return;
      focused = false;
      sync();
    });
  });
}

/**
 * Skill Signal — light the constellation node linked to the hovered/focused
 * skill chip. Hover and focus are separate (a mouse-out must not clear a
 * highlight that keyboard focus still holds). focusout ignores intra-chip moves.
 */
function initSkillSignal(world) {
  if (!world?.setSkillHighlight) return;
  document.querySelectorAll("[data-skill]").forEach((el) => {
    const skill = el.getAttribute("data-skill");
    let hovered = false;
    let focused = false;
    const sync = () => world.setSkillHighlight(hovered || focused ? skill : null);
    el.addEventListener("mouseenter", () => { hovered = true; sync(); }, { passive: true });
    el.addEventListener("mouseleave", () => { hovered = false; sync(); }, { passive: true });
    el.addEventListener("focusin", () => { focused = true; sync(); });
    el.addEventListener("focusout", (e) => {
      if (el.contains(e.relatedTarget)) return;
      focused = false;
      sync();
    });
  });
}

/**
 * Light the 3D timeline node matching the experience card at screen middle.
 */
function syncTimelineNode(world) {
  if (!world?.setTimelineIndex) return;
  const items = [...document.querySelectorAll(".tl-item")];
  const mid = window.innerHeight / 2;
  let best = 0, bestD = Infinity;
  items.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const d = Math.abs(r.top + r.height / 2 - mid);
    if (d < bestD) { bestD = d; best = i; }
  });
  world.setTimelineIndex(best);
}

/**
 * Sticky portrait morph.
 * The portrait is pinned (CSS sticky) and, as the hero scrolls out, it
 * scales, drifts and skews while a badge fades in — the "photo follows you
 * then transforms into the next page" effect. Pure rAF on scroll; no
 * scroll-jacking, and it is skipped entirely under reduced-motion or on
 * small screens (where the CSS is not sticky anyway).
 */
function initPortraitMorph() {
  const track = document.getElementById("portrait-track");
  const portrait = document.getElementById("portrait");
  if (!track || !portrait) return null;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktop = window.matchMedia("(min-width: 901px)").matches;
  if (reduced || !desktop) {
    portrait.style.setProperty("--morph", "0");
    return { reset() { portrait.style.setProperty("--morph", "0"); } };
  }

  // Ensure the badge element exists (added here so HTML stays clean).
  let badge = portrait.querySelector(".portrait__badge");
  if (!badge) {
    badge = document.createElement("div");
    badge.className = "portrait__badge";
    badge.setAttribute("aria-hidden", "true");
    badge.textContent = "4 LIFE";
    portrait.appendChild(badge);
  }

  let raf = 0;
  const update = () => {
    raf = 0;
    const r = track.getBoundingClientRect();
    // progress: 0 while the hero is fully in view, 1 once the track has
    // scrolled up by ~70% of the viewport.
    const travelled = Math.max(0, -r.top);
    const span = Math.max(1, window.innerHeight * 0.7);
    const p = Math.min(1, travelled / span);

    portrait.style.setProperty("--morph", p.toFixed(3));
    // scale up a little, drift left, and skew — bounded so it never feels sick.
    portrait.style.transform =
      `translate3d(${-p * 4}%, ${-p * 6}%, 0) scale(${1 + p * 0.12}) ` +
      `rotate(${p * 1.6}deg) skewX(${p * -3}deg)`;
    portrait.style.opacity = String(1 - Math.max(0, p - 0.82) * 3.2);
  };

  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();

  return {
    reset() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      portrait.style.transform = "";
      portrait.style.opacity = "";
      portrait.style.setProperty("--morph", "0");
    },
  };
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
