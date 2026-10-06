/**
 * pose.js — pure pose registry + interpolation for the 3D scene.
 *
 * A "pose" is a plain data description of the scene's spatial state. It is a
 * pure value object: no DOM, no three.js, no side effects. Consumers (the
 * renderer / camera rig) read it; this module only resolves and blends poses.
 *
 * Shape (all groups required, all leaves numeric):
 *   core          { x, y, z, rx, ry, rz, scale, opacity }
 *   orbitRing     { x, y, z, rx, ry, rz, scale, opacity }
 *   orbits        { spread, scale, opacity }
 *   shards        { spread, scale, opacity }
 *   constellation { x, y, z, scale, opacity }
 *   timeline      { x, y, z, scale, opacity }
 *   accentMix     number
 */

export const POSE_IDS = Object.freeze([
  "seal",
  "openFrame",
  "podium",
  "constellationWide",
  "railDiagonal",
  "archiveRack",
  "portal",
]);

export const DEFAULT_POSE = "standard";

// Group -> ordered leaf keys. Single source of truth for both isPose() and
// lerpPose(), so the two can never drift apart.
const GROUPS = Object.freeze({
  core: ["x", "y", "z", "rx", "ry", "rz", "scale", "opacity"],
  orbitRing: ["x", "y", "z", "rx", "ry", "rz", "scale", "opacity"],
  orbits: ["spread", "scale", "opacity"],
  shards: ["spread", "scale", "opacity"],
  constellation: ["x", "y", "z", "scale", "opacity"],
  timeline: ["x", "y", "z", "scale", "opacity"],
});

const GROUP_NAMES = Object.keys(GROUPS);

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

/**
 * resolvePose(mood, poses) -> pose object. Never null when a fallback exists.
 * Order: exact id -> DEFAULT_POSE -> seal -> null.
 */
export function resolvePose(mood, poses) {
  if (!poses || typeof poses !== "object") return null;

  const id = mood && typeof mood === "object" ? mood.pose : undefined;
  if (id != null && isPose(poses[id])) return poses[id];

  if (isPose(poses[DEFAULT_POSE])) return poses[DEFAULT_POSE];
  if (isPose(poses.seal)) return poses.seal;
  return null;
}

/**
 * lerpPose(a, b, k) -> a NEW pose interpolated leaf-by-leaf. k is clamped to
 * [0,1]. Inputs are never mutated.
 */
export function lerpPose(a, b, k) {
  const t = k < 0 ? 0 : k > 1 ? 1 : k;
  const out = {};
  for (const name of GROUP_NAMES) {
    const group = {};
    for (const leaf of GROUPS[name]) {
      group[leaf] = a[name][leaf] + (b[name][leaf] - a[name][leaf]) * t;
    }
    out[name] = group;
  }
  out.accentMix = a.accentMix + (b.accentMix - a.accentMix) * t;
  return out;
}

/**
 * isPose(pose) -> true only when pose has every required group present and
 * every leaf is a finite number.
 */
export function isPose(pose) {
  if (!pose || typeof pose !== "object") return false;
  for (const name of GROUP_NAMES) {
    const group = pose[name];
    if (!group || typeof group !== "object") return false;
    for (const leaf of GROUPS[name]) {
      if (!isNum(group[leaf])) return false;
    }
  }
  return isNum(pose.accentMix);
}
