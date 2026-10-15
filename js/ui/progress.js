/**
 * progress.js — Persona-5 chapter progress bar.
 *
 * A read indicator, not a control. It never decides the active chapter:
 * it only *renders* the state published by js/sections.js on the
 * `portfolio:sectionchange` event (id, index, total, progress, mood).
 *
 * Responsibilities (see docs/plans/2026-10-04-overlay-progress-intro-cinematic.md §2c):
 *   1. Build the tick rail once — one tick per reading-journey step.
 *   2. On every chapter change, fill to the active chapter's step (stepped,
 *      not raw scroll pixels) and light the ticks up to and including it.
 *   3. Update the `CHAPTER NN / MM` label.
 *
 * Contract:
 *   initProgress() -> { update(detail) }
 *     - `#chapter-progress`       container; receives the `--progress` var
 *     - `#chapter-progress-label` "CHAPTER NN / MM" text (aria-live polite)
 *     - `#chapter-progress-fill`  bar; scaled via transform: scaleX()
 *     - `#chapter-progress-ticks` tick rail; each tick gets data-on="true"
 *
 * Degrades to a no-op handle when the markup is absent (e.g. older HTML),
 * so main.js never has to null-check the result.
 */
import { PROGRESS_TOTAL } from "../data/section-moods.js";

const clamp01 = (n) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
const pad2 = (n) => String(Math.max(0, Math.trunc(n))).padStart(2, "0");

export function initProgress() {
  const container = document.getElementById("chapter-progress");
  const labelEl = document.getElementById("chapter-progress-label");
  const fillEl = document.getElementById("chapter-progress-fill");
  const ticksEl = document.getElementById("chapter-progress-ticks");

  const noop = () => {};
  if (!container || !ticksEl) {
    return { update: noop };
  }

  /* ---------- build the tick rail from the one data contract ---------- */
  const stepCount = PROGRESS_TOTAL > 0 ? PROGRESS_TOTAL : 1;
  const lastStep = stepCount - 1;

  ticksEl.innerHTML = Array.from(
    { length: stepCount },
    () => `<i class="chapter-progress__tick" aria-hidden="true"></i>`
  ).join("");
  const ticks = [...ticksEl.querySelectorAll(".chapter-progress__tick")];

  /**
   * Render one chapter state. Called ONLY on chapter change (never per frame),
   * which keeps the container's aria-live="polite" announcement meaningful.
   *
   * @param {{index?:number, total?:number, progress?:number}} [detail]
   *   event detail from `portfolio:sectionchange` (defaults to the start).
   */
  function update({ index = 0, total = stepCount, progress = 0 } = {}) {
    const mm = total > 0 ? total - 1 : lastStep;
    const nn = Math.min(Math.max(0, index), mm);
    const p = clamp01(progress);

    // 1. label — "CHAPTER NN / MM" (MM = last step index, not the count)
    if (labelEl) labelEl.textContent = `CHAPTER ${pad2(nn)} / ${pad2(mm)}`;

    // 2. fill — stepped to the active chapter (CSS drives the easing)
    if (fillEl) fillEl.style.transform = `scaleX(${p})`;
    // The HTML contract names the 0..1 var `--progress`; the plan also refers
    // to `--active-progress`. Publish both so either CSS spelling works.
    container.style.setProperty("--progress", String(p));
    container.style.setProperty("--active-progress", String(p));
    container.style.setProperty("--progress-steps", String(stepCount));

    // 3. ticks — lit up to and including the active step
    ticks.forEach((tick, i) => {
      if (i <= nn) tick.setAttribute("data-on", "true");
      else tick.removeAttribute("data-on");
    });
  }

  /* ---------- subscribe to the resolver's single source of truth ---------- */
  window.addEventListener("portfolio:sectionchange", (e) => {
    if (e.detail) update(e.detail);
  });

  // Seed the start state (hero, step 0) so the bar is never empty on load.
  update();

  return { update };
}
