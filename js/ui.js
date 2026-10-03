/**
 * ui.js — renders content from the single data sources into the DOM.
 * Works with JS on or off: the HTML holds the shell, these fill it in.
 */
import { profile } from "./data/profile.js";
import { projects, featuredProject, repoCount } from "./data/projects.js";
import { experience } from "./data/experience.js";

const $ = (sel, root = document) => root.querySelector(sel);

/* ---------- Profile ---------- */
export function renderProfile() {
  const slot = $("#about-copy");
  if (!slot) return;
  slot.innerHTML = profile.about.map((p) => `<p>${p}</p>`).join("");
}

/* ---------- Skills ---------- */
export function renderSkills() {
  const slot = $("#skills-groups");
  if (!slot) return;
  slot.innerHTML = profile.skills
    .map(
      (g) => `
      <div class="skills__group">
        <h3>${g.group}</h3>
        <div class="tags">${g.items.map((i) => `<span class="tag">${i}</span>`).join("")}</div>
      </div>`
    )
    .join("");
}

/* ---------- Experience (timeline) ---------- */
export function renderExperience() {
  const slot = $("#timeline");
  if (!slot) return;
  slot.innerHTML = experience
    .map(
      (e) => `
      <li class="tl-item" data-exp="${e.id}" style="--node:${e.accent}">
        <div class="tl-item__head">
          <h3 class="tl-item__role">${e.role}</h3>
          <span class="tl-item__period">${e.period}</span>
        </div>
        <div class="tl-item__org">${e.org}</div>
        <div class="tl-item__meta">${e.kind} · ${e.place}</div>
        <ul class="tl-item__points">
          ${e.points.map((p) => `<li>${p}</li>`).join("")}
        </ul>
        <div class="tags">${e.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
      </li>`
    )
    .join("");
}

/* ---------- Projects ---------- */
export function renderSpotlight() {
  const slot = $("#spotlight-slot");
  if (!slot || !featuredProject) return;
  const f = featuredProject;
  slot.innerHTML = `
    <div class="spotlight">
      <div>
        <div class="spotlight__metric">${f.stars}<small>★ GITHUB STARS</small></div>
        <div class="tags" style="margin-top:var(--sp-4)">
          ${f.topics.map((t) => `<span class="tag">${t}</span>`).join("")}
        </div>
      </div>
      <div>
        <h3 style="margin-bottom:var(--sp-3)">${f.name}</h3>
        <p class="card__desc">${f.desc}</p>
        <a class="btn btn--primary" href="${f.url}" rel="noopener" target="_blank">Open Repository</a>
      </div>
    </div>`;
}

export function renderProjects() {
  const grid = $("#projects-grid");
  if (!grid) return;
  const rest = projects.filter((p) => !p.featured);
  grid.innerHTML = rest
    .map(
      (p) => `
      <article class="card" data-project="${p.id}">
        <div class="card__top">
          <h3 class="card__title">${p.name}</h3>
          <span class="card__lang">${p.lang}</span>
        </div>
        <p class="card__desc">${p.desc}</p>
        <div class="card__meta">
          <span>★ ${p.stars}</span>
          <span>${p.year}</span>
        </div>
        <button class="btn" style="margin-top:var(--sp-4)" data-open="${p.id}">Details</button>
      </article>`
    )
    .join("");
}

export function projectById(id) {
  return projects.find((p) => p.id === id);
}

/* ---------- Modal ---------- */
let lastFocus = null;

export function openModal(id) {
  const p = projectById(id);
  const modal = $("#modal");
  const body = $("#modal-body");
  if (!p || !modal || !body) return;
  lastFocus = document.activeElement;
  body.innerHTML = `
    <h3 id="modal-title">${p.name}</h3>
    <div class="tags" style="margin-bottom:var(--sp-4)">
      <span class="tag">${p.lang}</span>
      <span class="tag">★ ${p.stars}</span>
      <span class="tag">${p.year}</span>
    </div>
    <p>${p.desc}</p>
    <div class="tags" style="margin:var(--sp-4) 0">
      ${p.topics.map((t) => `<span class="tag">${t}</span>`).join("")}
    </div>
    <a class="btn btn--primary" href="${p.url}" rel="noopener" target="_blank">Open on GitHub</a>`;
  modal.hidden = false;
  document.body.classList.add("is-locked");
  $("#modal-close")?.focus();
}

export function closeModal() {
  const modal = $("#modal");
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove("is-locked");
  if (lastFocus instanceof HTMLElement) lastFocus.focus();
}

export function initUI() {
  renderProfile();
  renderSkills();
  renderExperience();
  renderSpotlight();
  renderProjects();

  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  // Event delegation for project details + modal close
  document.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-open]");
    if (openBtn) {
      openModal(openBtn.getAttribute("data-open"));
      return;
    }
    if (e.target.closest("#modal-close") || e.target.id === "modal") closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  return { repoCount };
}
