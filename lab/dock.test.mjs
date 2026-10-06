/**
 * dock.test.mjs — behaviour check for js/dock.js (plain node, no test runner).
 * Drives the real module and asserts the frozen dock interface: screen<->NDC
 * mapping, NDC->world projection with bounds clamping, the per-aspect dock
 * anchors, and the viewport-visibility predicate.
 *
 * Run: node lab/dock.test.mjs
 */
import assert from "node:assert/strict";
import {
  rectToNdc,
  ndcToWorld,
  pickDockZone,
  isRectVisible,
} from "../js/dock.js";

const near = (a, b, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ~= ${b}`);

/* 1. rectToNdc — the viewport centre maps to NDC (0, 0) */
{
  const vp = { vw: 1000, vh: 800 };
  const centre = { left: 400, top: 300, width: 200, height: 200 };
  const n = rectToNdc(centre, vp);
  near(n.nx, 0);
  near(n.ny, 0);
}

/* 2. rectToNdc — zero-size rects pinned to each viewport corner map to +/-1 */
{
  const vp = { vw: 1000, vh: 800 };
  const tl = rectToNdc({ left: 0, top: 0, width: 0, height: 0 }, vp);
  near(tl.nx, -1);
  near(tl.ny, 1);

  const tr = rectToNdc({ left: 1000, top: 0, width: 0, height: 0 }, vp);
  near(tr.nx, 1);
  near(tr.ny, 1);

  const br = rectToNdc({ left: 1000, top: 800, width: 0, height: 0 }, vp);
  near(br.nx, 1);
  near(br.ny, -1);

  const bl = rectToNdc({ left: 0, top: 800, width: 0, height: 0 }, vp);
  near(bl.nx, -1);
  near(bl.ny, -1);
}

/* 3. rectToNdc — off-screen rects clamp to [-1, 1] on every axis */
{
  const vp = { vw: 1000, vh: 800 };
  const farLeftUp = rectToNdc(
    { left: -5000, top: -5000, width: 0, height: 0 },
    vp,
  );
  near(farLeftUp.nx, -1);
  near(farLeftUp.ny, 1);

  const farRightDown = rectToNdc(
    { left: 9999, top: 9999, width: 0, height: 0 },
    vp,
  );
  near(farRightDown.nx, 1);
  near(farRightDown.ny, -1);
}

/* 4. rectToNdc — divide-by-zero guard: vw/vh <= 0 yields (0, 0) */
{
  near(rectToNdc({ left: 10, top: 10, width: 5, height: 5 }, { vw: 0, vh: 0 }).nx, 0);
  near(rectToNdc({ left: 10, top: 10, width: 5, height: 5 }, { vw: 0, vh: 0 }).ny, 0);
  const neg = rectToNdc({ left: 1, top: 1, width: 1, height: 1 }, { vw: -10, vh: -10 });
  near(neg.nx, 0);
  near(neg.ny, 0);
}

/* 5. ndcToWorld — the NDC origin projects to the world origin */
{
  const cam = { fovDeg: 50, aspect: 16 / 9, dist: 6 };
  const bounds = { xMax: 10, yMax: 10 };
  const p = ndcToWorld({ nx: 0, ny: 0 }, cam, bounds);
  near(p.x, 0);
  near(p.y, 0);
}

/* 6. ndcToWorld — extreme NDC clamps to the world bounds */
{
  const cam = { fovDeg: 50, aspect: 16 / 9, dist: 6 };
  const bounds = { xMax: 2, yMax: 1.5 };
  const p = ndcToWorld({ nx: 5, ny: -5 }, cam, bounds);
  near(p.x, 2);
  near(p.y, -1.5);
  const q = ndcToWorld({ nx: -5, ny: 5 }, cam, bounds);
  near(q.x, -2);
  near(q.y, 1.5);
}

/* 7. ndcToWorld — dist <= 0 is guarded (finite, no NaN, collapses to origin) */
{
  const bounds = { xMax: 3, yMax: 3 };
  for (const dist of [0, -4]) {
    const p = ndcToWorld({ nx: 0.8, ny: 0.8 }, { fovDeg: 50, aspect: 1, dist }, bounds);
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `finite for dist=${dist}`);
    near(p.x, 0);
    near(p.y, 0);
  }
}

/* 8. pickDockZone — the three aspects are distinct, small, and bounded */
{
  const portrait = pickDockZone("portrait");
  const standard = pickDockZone("standard");
  const wide = pickDockZone("wide");

  const key = (a) => `${a.x},${a.y}`;
  assert.ok(key(portrait) !== key(standard), "portrait differs from standard");
  assert.ok(key(standard) !== key(wide), "standard differs from wide");
  assert.ok(key(portrait) !== key(wide), "portrait differs from wide");

  for (const a of [portrait, standard, wide]) {
    assert.ok(Math.abs(a.x) <= 1 && Math.abs(a.y) <= 1, "anchor stays in [-1,1]");
  }

  /* portrait sits high, the right-side anchors sit progressively further right */
  assert.ok(portrait.y > standard.y, "portrait anchor is higher");
  assert.ok(wide.x > standard.x, "wide anchor is further right than standard");
}

/* 9. pickDockZone — unknown aspect falls back to the standard anchor */
{
  const standard = pickDockZone("standard");
  assert.deepEqual(pickDockZone("square"), standard, "unknown -> standard");
  assert.deepEqual(pickDockZone(undefined), standard, "undefined -> standard");
}

/* 10. isRectVisible — centre inside the viewport is visible, outside is not */
{
  const vp = { vw: 1000, vh: 800 };
  assert.equal(
    isRectVisible({ left: 400, top: 300, width: 200, height: 200 }, vp),
    true,
    "centre inside -> visible",
  );
  assert.equal(
    isRectVisible({ left: 1200, top: 300, width: 100, height: 100 }, vp),
    false,
    "centre past right edge -> hidden",
  );
  assert.equal(
    isRectVisible({ left: -200, top: -200, width: 100, height: 100 }, vp),
    false,
    "centre above/left -> hidden",
  );
}

console.log("PASS — dock.js: 10 checks");
