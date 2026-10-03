/**
 * intro.js — the skippable Persona-5 opening screen.
 *
 * Contract (docs/plans/2026-10-04-overlay-progress-intro-cinematic.md §2d):
 *   initIntro({ maxMs }) -> { skip(), dispose(), isDone() }
 *
 * Rules this module obeys:
 *   1. ENHANCEMENT, never a gate. Content is already rendered before it runs
 *      (main.js calls initUI() first) and the overlay REMOVES ITSELF from the
 *      DOM on exit — so the hero is always reachable, even if the intro dies.
 *   2. HARD TIMEOUT, on an ABSOLUTE clock. The cap is `deadline = start + maxMs`
 *      measured with Date.now(), not a chain of relative timers. Background
 *      tabs throttle timers, so the pending timeout is dropped while hidden and
 *      the deadline is re-checked on `visibilitychange` back to the foreground
 *      — a throttled tab can never leave the overlay hanging.
 *   3. SKIPPABLE: the SKIP button, the Escape key, and Tab is trapped on the
 *      skip button while the overlay owns the screen.
 *   4. ONCE PER SESSION (sessionStorage). Reduced-motion users never see it —
 *      the entire point is motion — so it is dropped immediately.
 *   5. HONEST status copy. It mirrors the real 3D state that main.js publishes
 *      on `.stage[data-webgl]` ("on" -> READY, "off" -> CONTINUING WITHOUT 3D);
 *      it never fakes a "ready" the page cannot back up.
 *
 * DOM contract (authored in index.html; the CSS lane owns its appearance):
 *   #intro          overlay root (role=dialog, aria-modal=true)
 *   #intro-fill     progress bar
 *   #intro-status   status text
 *   #intro-skip     the skip button
 *
 * The fill is driven PER FRAME by this module (inline `transform: scaleX()` on
 * #intro-fill plus a `--intro-progress` custom property on the root). CSS must
 * therefore NOT add a transition/animation to #intro-fill — it would fight the
 * per-frame update. CSS owns positioning/typography only.
 *
 * Companion HTML note: for a flash-free load, `.intro` should carry the
 * `hidden` attribute in index.html (this module removes it when it shows the
 * overlay). Without it, a returning visitor can see a one-frame flash of the
 * overlay before this module runs.
 */

const DEFAULT_MAX_MS = 3200;
const STORAGE_KEY = "4life:intro:v1";
// Fallback removal delay; keep >= the CSS exit transition on `.intro.is-done`.
const FADE_MS = 480;

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

/** Cheap one-off WebGL probe so the status copy can be honest before the
 *  async scene import resolves (main.js computes its own copy separately). */
const hasWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl"))
    );
  } catch {
    return false;
  }
};

/** sessionStorage that degrades to "not seen" in private mode. */
const storageGet = (key) => {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};
const storageSet = (key) => {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    /* private mode / storage disabled — showing each visit is acceptable */
  }
};

/**
 * Boot the opening screen.
 *
 * @param {object} [options]
 * @param {number} [options.maxMs=3200]      hard cap in ms (absolute deadline)
 * @param {boolean} [options.sessionOnce=true] show only once per session
 * @param {string} [options.storageKey]      override the sessionStorage key
 * @returns {{skip:Function, dispose:Function, isDone:()=>boolean}} inert if no markup
 */
export function initIntro(options = {}) {
  const {
    maxMs = DEFAULT_MAX_MS,
    sessionOnce = true,
    storageKey = STORAGE_KEY,
  } = options || {};

  const root = document.getElementById("intro");
  const fill = document.getElementById("intro-fill");
  const statusEl = document.getElementById("intro-status");
  const skipBtn = document.getElementById("intro-skip");

  const noop = () => {};
  // No markup → inert, shape-compatible handle (main.js never null-checks).
  if (!root) return { skip: noop, dispose: noop, isDone: () => true };

  const cap = Number.isFinite(maxMs) && maxMs > 0 ? maxMs : DEFAULT_MAX_MS;
  const reduced = prefersReduced();
  const webglOk = hasWebGL();

  const stage = document.querySelector(".stage");
  const stageState = () => (stage && stage.getAttribute("data-webgl")) || "pending";

  let done = false;
  let startedAt = 0;
  let deadline = 0;
  let rafId = 0;
  let exitTimer = 0;
  let removeTimer = 0;
  let observer = null;

  /* ------------------------------------------------------------------ *
   * Exit — single-shot, and guaranteed to release the pointer even if the
   * fade never completes (belt: inline style, braces: fallback timer).
   * ------------------------------------------------------------------ */
  function remove() {
    clearTimeout(removeTimer);
    removeTimer = 0;
    if (root.isConnected) root.remove();
  }

  function exit() {
    if (done) return;
    done = true;

    if (rafId) cancelAnimationFrame(rafId);
    clearTimeout(exitTimer);
    rafId = exitTimer = 0;
    document.removeEventListener("visibilitychange", onVisibility);
    document.removeEventListener("keydown", onKeydown);
    if (observer) observer.disconnect();

    // Release the pointer immediately: even if the fade is interrupted, clicks
    // must reach the page underneath (the hero is always available).
    root.style.pointerEvents = "none";
    root.setAttribute("aria-hidden", "true");
    root.removeAttribute("role");
    root.removeAttribute("aria-modal");

    // Complete the bar, then hand focus back to the document if we owned it.
    if (fill) fill.style.transform = "scaleX(1)";
    root.style.setProperty("--intro-progress", "1");
    if (root.contains(document.activeElement) && document.activeElement.blur) {
      document.activeElement.blur();
    }

    root.classList.add("is-done");
    root.addEventListener("transitionend", remove, { once: true });
    removeTimer = setTimeout(remove, FADE_MS + 150);
  }

  /* ------------------------------------------------------------------ *
   * Honest status copy — reflects the real 3D state, never fakes it.
   * ------------------------------------------------------------------ */
  function setStatus(text) {
    if (statusEl && statusEl.textContent !== text) statusEl.textContent = text;
  }

  function syncStatus() {
    const state = stageState();
    if (state === "on") setStatus("READY");
    else if (state === "off" || !webglOk) setStatus("CONTINUING WITHOUT 3D");
    else setStatus("PREPARING EXPERIENCE");
  }

  /* ------------------------------------------------------------------ *
   * Per-frame fill. rAF self-corrects from Date.now(), so a stalled or
   * throttled frame never desyncs the bar from the deadline.
   * ------------------------------------------------------------------ */
  function paint() {
    if (!fill) return;
    const p =
      cap > 0 ? Math.min(1, Math.max(0, (Date.now() - startedAt) / cap)) : 1;
    fill.style.transform = `scaleX(${p.toFixed(4)})`;
    root.style.setProperty("--intro-progress", p.toFixed(4));
  }

  function frame() {
    rafId = 0;
    if (done) return;
    paint();
    if (Date.now() < deadline) rafId = requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ *
   * Hard deadline + Page Visibility.
   * ------------------------------------------------------------------ */
  function armDeadline() {
    clearTimeout(exitTimer);
    exitTimer = setTimeout(exit, Math.max(0, deadline - Date.now()));
  }

  function onVisibility() {
    if (done) return;
    if (document.hidden) {
      // Background tabs throttle timers; drop the pending hard-timeout and let
      // the ABSOLUTE deadline be re-checked the moment we return.
      clearTimeout(exitTimer);
      return;
    }
    if (Date.now() >= deadline) {
      exit();
      return;
    }
    armDeadline();
    // Restart the loop deterministically: cancel any handle left over from the
    // backgrounded tab (its frame may never have fired) so exactly one loop runs.
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ *
   * Keyboard: Escape skips; Tab stays trapped on the SKIP button.
   * ------------------------------------------------------------------ */
  function onKeydown(e) {
    if (done) return;
    if (e.key === "Escape") {
      e.preventDefault();
      exit();
    } else if (e.key === "Tab" && skipBtn) {
      e.preventDefault();
      skipBtn.focus();
    }
  }

  /* ------------------------------------------------------------------ *
   * Show.
   * ------------------------------------------------------------------ */
  function show() {
    root.removeAttribute("hidden");
    root.setAttribute("aria-modal", "true");
    if (fill) fill.style.transform = "scaleX(0)";
    root.style.setProperty("--intro-progress", "0");

    // Watch the stage so READY / CONTINUING WITHOUT 3D reflect what main.js
    // actually resolved (the scene import resolves asynchronously).
    if (stage && typeof MutationObserver === "function") {
      observer = new MutationObserver(syncStatus);
      observer.observe(stage, {
        attributes: true,
        attributeFilter: ["data-webgl"],
      });
    }
    syncStatus();

    if (skipBtn) {
      try {
        skipBtn.focus({ preventScroll: true });
      } catch {
        skipBtn.focus();
      }
      skipBtn.addEventListener("click", exit);
    }
    document.addEventListener("keydown", onKeydown);
    document.addEventListener("visibilitychange", onVisibility);

    startedAt = Date.now();
    deadline = startedAt + cap;
    paint();

    // Opened in a background tab: don't start a rAF loop that cannot fire or
    // arm a timer the browser will throttle. visibilitychange resumes us.
    if (document.hidden) return;
    armDeadline();
    rafId = requestAnimationFrame(frame);
  }

  const handle = {
    skip: exit,
    dispose: exit,
    isDone: () => done,
  };

  /* ------------------------------------------------------------------ *
   * Decide once: session-once, then reduced-motion, then play.
   * ------------------------------------------------------------------ */
  if (sessionOnce && storageGet(storageKey)) {
    done = true;
    remove();
    return handle;
  }
  if (reduced) {
    done = true;
    remove();
    return handle;
  }

  storageSet(storageKey);
  show();
  return handle;
}
