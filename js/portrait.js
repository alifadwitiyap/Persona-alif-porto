/**
 * portrait.js — layered portrait with a single-cutout fallback.
 * Decision D2/Risiko B: the DEFAULT is one whole cutout. Splitting head/torso
 * is an optional enhancement that only activates when every layer asset is
 * present; otherwise we fall back silently to the single cutout.
 *
 * Assets are declared in assets/images/manifest.json. We read that manifest
 * instead of probing filenames, so a not-yet-existing cutout never 404s.
 */
const BASE = "./assets/images/";
const MANIFEST = BASE + "manifest.json";

/* ---- Sticky-portrait layout guard -------------------------------------
   The hero portrait is only pinned (see css/layout.css) when it is safe:
   a wide viewport, a tall enough viewport, and native position:sticky.
   Otherwise the track carries `is-sticky-fallback` and the portrait stays
   in normal flow. Recalculated on resize AND orientationchange. */
const STICKY_FALLBACK_CLASS = "is-sticky-fallback";
const STICKY_MEDIA = "(min-width: 901px)";
const MIN_STICKY_VIEWPORT_HEIGHT = 560;
const LAYOUT_DEBOUNCE_MS = 150;

export function initPortraitLayout() {
  const track = document.getElementById("portrait-track");
  if (!track) return { dispose() {} };

  const supportsSticky =
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("position", "sticky");

  let rafId = 0;
  let timerId = 0;

  const apply = () => {
    const wideEnough = window.matchMedia(STICKY_MEDIA).matches;
    const tallEnough = window.innerHeight >= MIN_STICKY_VIEWPORT_HEIGHT;
    const useFallback = !supportsSticky || !wideEnough || !tallEnough;
    track.classList.toggle(STICKY_FALLBACK_CLASS, useFallback);
  };

  // Coalesce bursts of events into one rAF, then debounce ~150ms before
  // measuring layout (innerHeight/matchMedia reads are cheap but frequent).
  const schedule = () => {
    if (rafId) cancelAnimationFrame(rafId);
    if (timerId) clearTimeout(timerId);
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      timerId = setTimeout(() => {
        timerId = 0;
        apply();
      }, LAYOUT_DEBOUNCE_MS);
    });
  };

  apply();
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });

  return {
    dispose() {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      if (rafId) cancelAnimationFrame(rafId);
      if (timerId) clearTimeout(timerId);
      rafId = 0;
      timerId = 0;
      track.classList.remove(STICKY_FALLBACK_CLASS);
    },
  };
}

async function loadManifest() {
  try {
    const res = await fetch(MANIFEST, { cache: "no-cache" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function initPortrait({ parallax = true } = {}) {
  const root = document.getElementById("portrait");
  const img = document.getElementById("portrait-img");
  const placeholder = document.getElementById("portrait-placeholder");
  if (!root || !img) return { mode: "none" };

  const manifest = await loadManifest();
  const p = manifest?.portrait || {};
  if (!p.single) {
    // No asset declared yet: keep the styled placeholder, do not fake a face
    // and do not request a missing file.
    return { mode: "placeholder" };
  }

  const single = BASE + p.single;
  const canSplit = p.torso && p.head;

  if (canSplit) {
    buildSplit(root, { torso: BASE + p.torso, head: BASE + p.head });
    if (placeholder) placeholder.hidden = true;
    return attachParallax(root, { parallax, mode: "split" });
  }

  img.src = single;
  img.hidden = false;
  if (placeholder) placeholder.hidden = true;
  return attachParallax(root, { parallax, mode: "single" });
}

function buildSplit(root, { torso, head }) {
  const frame = root.querySelector(".portrait__frame");
  if (!frame) return;
  frame.innerHTML = `
    <div class="portrait__layer" data-layer="torso"><img src="${torso}" alt="" /></div>
    <div class="portrait__layer" data-layer="head"><img src="${head}" alt="" /></div>`;
}

function attachParallax(root, { parallax, mode }) {
  if (!parallax || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return { mode };
  }
  const head = root.querySelector('[data-layer="head"]');
  const torso = root.querySelector('[data-layer="torso"]');
  const deco = root.querySelector(".portrait__deco");
  // Bounded motion only (Risiko B): tiny offsets, no Z, no rotation runaway.
  const onMove = (e) => {
    const r = root.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    if (head) head.style.transform = `translate(${nx * 8}px, ${ny * 6}px)`;
    if (torso) torso.style.transform = `translate(${nx * 4}px, ${ny * 3}px)`;
    if (deco) deco.style.transform = `translate(${nx * -12}px, ${ny * -10}px)`;
  };
  const reset = () => {
    if (head) head.style.transform = "";
    if (torso) torso.style.transform = "";
    if (deco) deco.style.transform = "";
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  root.addEventListener("pointerleave", reset);
  return { mode, dispose: () => window.removeEventListener("pointermove", onMove) };
}
