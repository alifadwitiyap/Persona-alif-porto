/**
 * story-rail.js — the narrative microcopy layer.
 *
 * This module used to own two surfaces; the overlay "space-shift" transition was
 * removed (user request 2026-10-04: the full-screen sweep felt distracting).
 * What remains is the STORY RAIL only:
 *
 *   STORY RAIL  (.story-rail + .section__story[data-act])
 *      The narrative microcopy (act + beat) for the active chapter, mirrored
 *      from the `story` block of the mood registry. The copy itself lives in
 *      the HTML (`[data-story-beat]`), so it reads with JS disabled; this
 *      module only stamps the ACT tag and fills the fixed rail.
 *
 * Section-to-section MOTION is now entirely the 3D camera space-shift in
 * js/scene.js (shaped by js/camera-shift.js) — a smooth move through space, with
 * no overlay painted over the page.
 *
 * Contract:
 *   - Scroll stays the single source of truth. This module only renders the
 *     consequence of the resolver's decision; it never decides the active
 *     section, never writes `aria-current`, and never touches scroll.
 *   - Driven ONLY by the single `portfolio:sectionchange` event published by
 *     js/sections.js.
 */

import { getSectionMood } from "../data/section-moods.js";

/**
 * Mirror the active chapter's narrative microcopy into the story rail and tag
 * each section's beat with its ACT.
 *
 * @returns {{ setStory:Function, dispose:Function }} handle; the rail element
 *          is created if the HTML did not provide one.
 */
export function initStoryRail() {
  // The rail is optional chrome — build it when the HTML did not supply one.
  let rail = document.querySelector(".story-rail");
  let actEl = null;
  let beatEl = null;
  let created = false;

  if (!rail) {
    rail = document.createElement("div");
    rail.className = "story-rail";
    rail.setAttribute("aria-hidden", "true"); // purely decorative
    actEl = document.createElement("span");
    actEl.className = "story-rail__act";
    beatEl = document.createElement("span");
    beatEl.className = "story-rail__beat";
    rail.append(actEl, beatEl);
    document.body.appendChild(rail);
    created = true;
  } else {
    actEl = rail.querySelector(".story-rail__act");
    beatEl = rail.querySelector(".story-rail__beat");
  }

  // Stamp each section's story beat with its ACT tag once at boot. The CSS
  // prints it through `[data-act]::before`; the beat sentence itself already
  // lives in the HTML, so this stays readable with JS off.
  document.querySelectorAll("[data-story-beat]").forEach((el) => {
    const section = el.closest("section[id]");
    const mood = section ? getSectionMood(section.id) : null;
    if (mood?.story?.act) el.setAttribute("data-act", mood.story.act);
  });

  /** Write one chapter's act + beat into the fixed rail. */
  function setStory(id) {
    const story = getSectionMood(id)?.story;
    if (!story) return;
    if (actEl && actEl.textContent !== (story.act || "")) {
      actEl.textContent = story.act || "";
    }
    if (beatEl && beatEl.textContent !== (story.beat || "")) {
      beatEl.textContent = story.beat || "";
    }
  }

  // Seed from the current section. sections.js does not publish on boot (it
  // starts already on "hero"), so read the state the resolver seeded instead.
  const seed = document.documentElement.getAttribute("data-section") || "hero";
  setStory(seed);

  const onSectionChange = (e) => {
    const id = e.detail?.id;
    if (id) setStory(id);
  };
  window.addEventListener("portfolio:sectionchange", onSectionChange);

  return {
    setStory,
    dispose() {
      window.removeEventListener("portfolio:sectionchange", onSectionChange);
      if (created) rail?.remove();
    },
  };
}
