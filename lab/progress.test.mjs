/**
 * progress.test.mjs — behaviour check for js/ui/progress.js (no test runner
 * needed; plain node). Stubs the minimum DOM the component touches, drives the
 * real module, and asserts the rendered state.
 *
 * Run: node lab/progress.test.mjs
 */
import assert from "node:assert/strict";

/* ---------------- minimal DOM stub ---------------- */
class El {
  constructor(id, cls = "") {
    this.id = id;
    this.className = cls;
    this._attrs = new Map();
    this.style = {
      _v: new Map(),
      setProperty(k, v) { this._v.set(k, v); },
      getPropertyValue(k) { return this._v.get(k) ?? ""; },
      set transform(v) { this._t = v; },
      get transform() { return this._t; },
    };
    this._html = "";
    this.children = [];
  }
  set innerHTML(html) {
    this._html = html;
    // crude parse: one <i ...> per tick, mirroring the component's output
    const n = (html.match(/<i\b/g) || []).length;
    this.children = Array.from({ length: n }, () => new El("", "chapter-progress__tick"));
  }
  get innerHTML() { return this._html; }
  querySelectorAll(sel) {
    return sel === ".chapter-progress__tick" ? this.children : [];
  }
  setAttribute(k, v) { this._attrs.set(k, String(v)); }
  removeAttribute(k) { this._attrs.delete(k); }
  getAttribute(k) { return this._attrs.has(k) ? this._attrs.get(k) : null; }
  set textContent(v) { this._text = String(v); }
  get textContent() { return this._text ?? ""; }
}

const nodes = {
  "chapter-progress": new El("chapter-progress"),
  "chapter-progress-label": new El("chapter-progress-label"),
  "chapter-progress-fill": new El("chapter-progress-fill"),
  "chapter-progress-ticks": new El("chapter-progress-ticks"),
};
globalThis.document = { getElementById: (id) => nodes[id] ?? null };

const listeners = new Map();
globalThis.window = {
  addEventListener: (t, fn) => listeners.set(t, fn),
  dispatchEvent: (e) => listeners.get(e.type)?.(e),
};
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init?.detail; } };

/* ---------------- run ---------------- */
const { initProgress } = await import("../js/ui/progress.js");
const handle = initProgress();
assert.equal(typeof handle.update, "function", "returns { update }");

const { PROGRESS_TOTAL } = await import("../js/data/section-moods.js");
const ticks = nodes["chapter-progress-ticks"].children;

// 1. one tick per reading step
assert.equal(ticks.length, PROGRESS_TOTAL, `ticks == PROGRESS_TOTAL (${PROGRESS_TOTAL})`);

// 2. seed state = hero (step 0)
assert.equal(nodes["chapter-progress-label"].textContent, "CHAPTER 00 / 06", "seed label");
assert.equal(nodes["chapter-progress-fill"].style.transform, "scaleX(0)", "seed fill");
assert.equal(nodes["chapter-progress"].style.getPropertyValue("--progress"), "0", "seed --progress");

// 3. chapter change via the real event (open-channel = step 6, last)
window.dispatchEvent(new CustomEvent("portfolio:sectionchange", {
  detail: { id: "open-channel", index: 6, total: PROGRESS_TOTAL, progress: 1 },
}));
assert.equal(nodes["chapter-progress-label"].textContent, "CHAPTER 06 / 06", "last-chapter label");
assert.equal(nodes["chapter-progress-fill"].style.transform, "scaleX(1)", "last-chapter fill");
assert.equal(ticks.filter((t) => t.getAttribute("data-on") === "true").length, 7, "all 7 ticks lit");

// 4. mid chapter (skill-arsenal = step 3 → 4 ticks lit)
window.dispatchEvent(new CustomEvent("portfolio:sectionchange", {
  detail: { id: "skill-arsenal", index: 3, total: PROGRESS_TOTAL, progress: 3 / 6 },
}));
assert.equal(nodes["chapter-progress-label"].textContent, "CHAPTER 03 / 06", "mid label");
assert.equal(ticks.filter((t) => t.getAttribute("data-on") === "true").length, 4, "4 ticks lit at step 3");
assert.equal(ticks[4].getAttribute("data-on"), null, "tick 4 (index 4) is off");

// 5. clamping / bad input must not throw or overshoot
handle.update({ index: 99, total: PROGRESS_TOTAL, progress: 5 });
assert.equal(nodes["chapter-progress-label"].textContent, "CHAPTER 06 / 06", "index clamps to last");
assert.equal(nodes["chapter-progress-fill"].style.transform, "scaleX(1)", "progress clamps to 1");
handle.update();
assert.equal(nodes["chapter-progress-label"].textContent, "CHAPTER 00 / 06", "defaults to start");

// 6. absent markup -> inert handle, no throw
for (const k of Object.keys(nodes)) delete nodes[k];
const inert = initProgress();
assert.equal(typeof inert.update, "function", "no-op handle still exposes update");
inert.update({ index: 3 });

console.log("PASS — progress.js: 6 checks");
