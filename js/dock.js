/**
 * dock.js — pure screen/NDC/world maths for the docked UI.
 *
 * Pure functions only: no THREE import, no DOM access, no globals. That keeps
 * the geometry unit-testable in plain node (lab/dock.test.mjs) and lets the
 * scene layer stay the only place that touches the renderer. Every mapping is
 * clamped, and every division is guarded, so a degenerate viewport, camera or
 * rect can never produce NaN or an out-of-bounds anchor.
 *
 * Contract (frozen — do not reimplement elsewhere):
 *   rectToNdc(rect, viewport)      DOM rect -> NDC centre in [-1, 1]
 *   ndcToWorld(ndc, cam, bounds)   NDC -> world xy at the camera z-plane
 *   pickDockZone(aspect)           fixed dock anchor for a viewport aspect
 *   isRectVisible(rect, viewport)  is the rect centre inside the viewport?
 */

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Map a DOM rect's centre to normalised device coordinates.
 * NDC is [-1, 1] with y up, so screen y is flipped. Result is clamped, and a
 * non-positive viewport (divide-by-zero guard) collapses to the origin.
 *
 * @param {{left:number,top:number,width:number,height:number}} rect
 * @param {{vw:number,vh:number}} viewport
 * @returns {{nx:number,ny:number}}
 */
export function rectToNdc(rect, viewport) {
  const vw = viewport ? viewport.vw : 0;
  const vh = viewport ? viewport.vh : 0;
  if (!(vw > 0) || !(vh > 0)) return { nx: 0, ny: 0 };

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const nx = clamp((cx / vw) * 2 - 1, -1, 1);
  const ny = clamp(1 - (cy / vh) * 2, -1, 1);
  return { nx, ny };
}

/**
 * Project an NDC point onto the camera's z-plane as world x/y, then clamp to
 * the scene bounds. A non-positive distance (camera at or behind the plane)
 * is unsafe to project, so it collapses to the origin.
 *
 * @param {{nx:number,ny:number}} ndc
 * @param {{fovDeg:number,aspect:number,dist:number}} cam
 * @param {{xMax:number,yMax:number}} bounds
 * @returns {{x:number,y:number}}
 */
export function ndcToWorld(ndc, cam, bounds) {
  const xMax = bounds.xMax;
  const yMax = bounds.yMax;
  if (!(cam.dist > 0)) return { x: clamp(0, -xMax, xMax), y: clamp(0, -yMax, yMax) };

  const halfH = Math.tan((cam.fovDeg * Math.PI) / 360) * cam.dist;
  const halfW = halfH * cam.aspect;

  const x = clamp(ndc.nx * halfW, -xMax, xMax);
  const y = clamp(ndc.ny * halfH, -yMax, yMax);
  return { x, y };
}

/** Fixed dock anchors per viewport aspect. Small, bounded NDC-ish values. */
const DOCK_ZONES = Object.freeze({
  portrait: Object.freeze({ x: 0, y: 0.55 }),
  standard: Object.freeze({ x: 0.55, y: 0 }),
  wide: Object.freeze({ x: 0.9, y: 0 }),
});

/**
 * Pick the dock anchor for a viewport aspect. Portrait docks high, standard
 * docks right, wide docks far right. An unknown aspect falls back to standard.
 *
 * @param {"portrait"|"standard"|"wide"} aspect
 * @returns {{x:number,y:number}}
 */
export function pickDockZone(aspect) {
  return DOCK_ZONES[aspect] || DOCK_ZONES.standard;
}

/**
 * True when the rect's centre lies inside the viewport rectangle.
 *
 * @param {{left:number,top:number,width:number,height:number}} rect
 * @param {{vw:number,vh:number}} viewport
 * @returns {boolean}
 */
export function isRectVisible(rect, viewport) {
  const vw = viewport ? viewport.vw : 0;
  const vh = viewport ? viewport.vh : 0;
  if (!(vw > 0) || !(vh > 0)) return false;

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return cx >= 0 && cx <= vw && cy >= 0 && cy <= vh;
}
