import { pickAspectPreset } from "./data/section-moods.js";

/**
 * performance.js — adaptive visual tier.
 * Decision D5: tiers are chosen by measured frame time, not a hardcoded DPR.
 * Never assumes a device class from user-agent.
 *
 * Aspect note: the tier now also carries the viewport aspect preset
 * ("portrait" | "standard" | "wide") so budget decisions can follow the frame
 * shape. Portrait viewports are the tightest (copy stacks over the 3D), so they
 * cap DPR a step lower than an otherwise identical landscape viewport.
 */
export function createPerfTier({ onDowngrade } = {}) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(hover: none)").matches;
  const small = window.matchMedia("(max-width: 900px)").matches;

  const vw = window.innerWidth || 0;
  const vh = window.innerHeight || 0;
  const aspect = pickAspectPreset(vw, vh);

  const tier = {
    name: "high",
    layers: 5,
    shards: 14,
    particles: 90,
    dpr: Math.min(window.devicePixelRatio || 1, 1.75),
    bokeh: !reduced,
    parallax: !reduced,
    aspect,
  };

  // Conservative starting point for touch / small screens (candidate tier).
  if (reduced || coarse || small) {
    tier.name = "low";
    tier.layers = 3;
    tier.shards = 6;
    tier.particles = 0;
    tier.dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    tier.bokeh = false;
  }

  // A portrait frame has far less lateral room for the 3D cluster to hide in,
  // so it budgets one notch tighter than the same device held landscape.
  if (aspect === "portrait" && tier.name === "high") {
    tier.dpr = Math.min(tier.dpr, 1.5);
  }

  let samples = [];
  let settled = false;

  function sample(dtMs) {
    if (settled) return;
    samples.push(dtMs);
    if (samples.length < 45) return; // ~0.75s warm-up at 60fps
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    samples = [];
    if (avg > 22 && tier.name === "high") {
      // ~<45fps: drop post-processing first, then geometry.
      tier.bokeh = false;
      tier.name = "mid";
      onDowngrade?.(tier);
    } else if (avg > 30 && tier.name === "mid") {
      tier.shards = 4;
      tier.particles = 0;
      tier.dpr = Math.min(tier.dpr, 1);
      tier.name = "low";
      onDowngrade?.(tier);
    } else {
      settled = true;
    }
  }

  return { tier, sample, isReduced: reduced };
}
