/**
 * menu.test.mjs — behaviour check for js/ui/menu.js (no test runner needed;
 * plain node). Stubs the minimum DOM the overlay touches, drives the real
 * module, and asserts the open/close/active-sync/navigate behaviour.
 *
 * Run: node lab/menu.test.mjs
 */
import assert from "node:assert/strict";

/* ---------------- minimal DOM stub ---------------- */
class El {
  constructor(id, cls = "") {
    this.id = id;
    this.className = cls;
    this.tagName = "DIV";
    this.hidden = false;
    this.disabled = false;
    this.isContentEditable = false;
    this._attrs = new Map();
    this._listeners = new Map();
    this.style = { setProperty() {}, removeProperty() {} };
    this._html = "";
    this.children = [];
    this.parent = null;
    this._text = "";
  }
  set innerHTML(html) {
    this._html = html;
    // crude parse: one <li><button ...> per rendered row
    const n = (html.match(/<li>/g) || []).length;
    this.children = Array.from({ length: n }, (_, i) => {
      const btn = new El("", "chapter-menu__link");
      btn.tagName = "BUTTON";
      btn.setAttribute("data-goto", ["identity-file", "hall-of-fame", "skill-arsenal", "mission-log", "case-files", "open-channel"][i]);
      btn.focus = () => { globalThis.document.activeElement = btn; };
      btn.closest = () => btn;
      return btn;
    });
  }
  get innerHTML() { return this._html; }
  querySelector(sel) {
    if (sel.includes("data-active")) {
      return this.children.find((c) => c.getAttribute("data-active") === "true") ?? null;
    }
    return this.children[0] ?? null;
  }
  querySelectorAll(sel) {
    if (sel.includes("chapter-menu__link")) return this.children;
    if (sel.includes("button") || sel.includes("[tabindex")) return this.children;
    if (sel.includes("data-menu-close")) return this._closeEls ?? [];
    return [];
  }
  addEventListener(t, fn) {
    if (!this._listeners.has(t)) this._listeners.set(t, []);
    this._listeners.get(t).push(fn);
  }
  dispatch(t, e) { (this._listeners.get(t) || []).forEach((fn) => fn(e)); }
  setAttribute(k, v) { this._attrs.set(k, String(v)); }
  removeAttribute(k) { this._attrs.delete(k); }
  getAttribute(k) { return this._attrs.has(k) ? this._attrs.get(k) : null; }
  focus() { globalThis.document.activeElement = this; }
  set textContent(v) { this._text = String(v); }
  get textContent() { return this._text; }
  contains() { return true; }
}

const scrim = new El("", "chapter-menu__scrim");
const root = new El("chapter-menu");
root.hidden = true; // markup ships with the [hidden] attribute
root._closeEls = [scrim];
const list = new El("chapter-menu-list");
const trigger = new El("menu-btn");
const closeBtn = new El("chapter-menu-close");

const body = new El("body");
body.classList = {
  _s: new Set(),
  add: (c) => body.classList._s.add(c),
  remove: (c) => body.classList._s.delete(c),
  contains: (c) => body.classList._s.has(c),
};

const nodes = {
  "chapter-menu": root,
  "chapter-menu-list": list,
  "menu-btn": trigger,
  "chapter-menu-close": closeBtn,
};

globalThis.document = {
  activeElement: body,
  body,
  getElementById: (id) => nodes[id] ?? null,
  contains: () => true,
  addEventListener(t, fn, capture) {
    if (t === "keydown") globalThis.__keydown = { fn, capture };
  },
  getElementById2: null,
};
globalThis.HTMLElement = El;
globalThis.history = { replaceState() {} };
globalThis.window = { matchMedia: () => ({ matches: false }) };

/* ---------------- run ---------------- */
const { initMenu } = await import("../js/ui/menu.js");

const navCalls = [];
const sections = { goTo: (id) => navCalls.push(id), active: "hero" };
const handle = initMenu({ sections, getActive: () => sections.active });

assert.equal(typeof handle.open, "function", "exposes open");
assert.equal(typeof handle.close, "function", "exposes close");
assert.equal(typeof handle.setActive, "function", "exposes setActive");

// 1. rendered 6 rows from the registry
assert.equal(list.children.length, 6, "6 chapter rows rendered");

// 2. closed by default
assert.equal(handle.isOpen(), false, "starts closed");
assert.equal(root.hidden, true, "root hidden at start");

// 3. open via the trigger → visible, locked, aria-expanded
trigger.dispatch("click", {});
assert.equal(handle.isOpen(), true, "open() after trigger click");
assert.equal(root.hidden, false, "root visible when open");
assert.equal(body.classList.contains("is-locked"), true, "body locked when open");
assert.equal(trigger.getAttribute("aria-expanded"), "true", "aria-expanded true");

// 4. setActive mirrors the resolver (only one active, with aria-current)
handle.setActive("mission-log");
const activeRows = list.children.filter((b) => b.getAttribute("data-active") === "true");
assert.equal(activeRows.length, 1, "exactly one active row");
assert.equal(activeRows[0].getAttribute("data-goto"), "mission-log", "correct row active");
assert.equal(activeRows[0].getAttribute("aria-current"), "true", "aria-current on active row");

// 5. item click → close + navigate through sections.goTo
const caseBtn = list.children.find((b) => b.getAttribute("data-goto") === "case-files");
list.dispatch("click", { target: { closest: () => caseBtn } });
assert.deepEqual(navCalls, ["case-files"], "click navigates via sections.goTo");
assert.equal(handle.isOpen(), false, "click closes the overlay");
assert.equal(body.classList.contains("is-locked"), false, "body unlocked after close");
assert.equal(trigger.getAttribute("aria-expanded"), "false", "aria-expanded false after close");

// 6. key M toggles open/close
globalThis.document.activeElement = body;
globalThis.__keydown.fn({ key: "m", target: body, preventDefault() {}, metaKey: false, ctrlKey: false, altKey: false });
assert.equal(handle.isOpen(), true, "M opens");
globalThis.__keydown.fn({ key: "M", target: body, preventDefault() {}, metaKey: false, ctrlKey: false, altKey: false });
assert.equal(handle.isOpen(), false, "M closes again");

// 7. M is ignored while typing
handle.open();
const typing = { key: "m", target: { tagName: "INPUT", isContentEditable: false }, preventDefault() {}, metaKey: false, ctrlKey: false, altKey: false };
globalThis.__keydown.fn(typing);
assert.equal(handle.isOpen(), true, "M ignored while typing (stays open)");

// 8. Esc closes
let stopped = false;
globalThis.__keydown.fn({ key: "Escape", target: body, preventDefault() {}, stopPropagation() { stopped = true; } });
assert.equal(handle.isOpen(), false, "Esc closes");
assert.equal(stopped, true, "Esc stops propagation (beats the modal handler)");

// 9. backdrop close element wired
handle.open();
scrim.dispatch("click", {});
assert.equal(handle.isOpen(), false, "backdrop click closes");

// 10. absent markup → inert handle
for (const k of Object.keys(nodes)) delete nodes[k];
const inert = initMenu({});
assert.equal(typeof inert.open, "function", "no-op handle exposes open");
inert.open();
assert.equal(inert.isOpen(), false, "inert handle never opens");

console.log("PASS — menu.js: 10 checks");
