/**
 * ui.js — renders content from the single data sources into the DOM.
 * Works with JS on or off: the HTML holds the shell, these fill it in.
 */
import { profile, SITE } from "./data/profile.js";
import { projects, featuredProject, repoCount } from "./data/projects.js";
import { experience } from "./data/experience.js";
import { hallOfFame } from "./data/hall-of-fame.js";
import { loadContent } from "./data/content.js";

/** The whole master content file — used for the chrome this module renders. */
const content = await loadContent();

const $ = (sel, root = document) => root.querySelector(sel);

/* ---------- Output escaping ----------
   Every value below comes from content.json, which is editable copy — not a
   trusted build input. Interpolating it raw into an innerHTML template is an
   XSS sink (verified: `<img src=x onerror=...>` in a project field executed).
   So each value goes through esc() on its way into text/attribute position.
   Markup we build ourselves (tags, class names, BEM prefixes) is literal in
   the template and never escaped — only data is. */

/** Escape a value for an HTML text node or a double-quoted attribute. */
const esc = (v) =>
  String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/** True when a data-sourced URL has no scheme or a scheme we allow.
 *  Rejects `javascript:`, `data:`, `vbscript:` and friends. */
const isSafeUrl = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return false;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(s);
  return !scheme || /^(?:https|mailto|tel)$/i.test(scheme[1]);
};

/** Escape a value for an href/src attribute; an unsafe URL collapses to "#". */
const attrUrl = (v) => (isSafeUrl(v) ? esc(String(v).trim()) : "#");

/**
 * `contact.big_text` is the ONE field allowed to carry a line break as
 * markup (`…TREASURE.<br />Let's uncover yours`) — escaping it whole would
 * print a literal "<br />". So the text is escaped first, then only <br>
 * variants are re-admitted; every other tag (or an onerror=… smuggled in)
 * stays inert text.
 */
const richText = (v) => esc(v).replace(/&lt;(\/?br\s*\/?)&gt;/gi, "<$1>");

/* ---------- Profile ---------- */
export function renderProfile() {
  const slot = $("#about-copy");
  if (!slot) return;
  const about = Array.isArray(profile.about) ? profile.about : [];
  if (!about.length) return; // keep the HTML fallback copy
  slot.innerHTML = about.map((p) => `<p>${esc(p)}</p>`).join("");
}

/* ---------- Skills ---------- */
export function renderSkills() {
  const slot = $("#skills-groups");
  if (!slot) return;
  const groups = Array.isArray(profile.skills) ? profile.skills : [];
  if (!groups.length) return;
  slot.innerHTML = groups
    .map(
      (g) => `
      <div class="skills__group">
        <h3>${esc(g.group)}</h3>
        <div class="tags">${g.items.map((i) => `<span class="tag">${esc(i)}</span>`).join("")}</div>
      </div>`
    )
    .join("");
}

/* ---------- Experience (timeline) ----------
   Rows are rendered from the data file; the "See more on LinkedIn" link is a
   SINGLE affordance at the end of the section (into #mission-log-more), not one
   per card, so the timeline stays clean and the link is easy to find. */
export function renderExperience() {
  const slot = $("#timeline");
  if (!slot) return;
  const rows = Array.isArray(experience) ? experience : [];
  if (!rows.length) return;
  slot.innerHTML = rows
    .map(
      (e) => `
      <li class="tl-item" data-exp="${esc(e.id)}" style="--node:${esc(e.accent)}">
        <div class="tl-item__head">
          <h3 class="tl-item__role">${esc(e.role)}</h3>
          <span class="tl-item__period">${esc(e.period)}</span>
        </div>
        <div class="tl-item__org">${esc(e.org)}</div>
        <div class="tl-item__meta">${esc(e.kind)} · ${esc(e.place)}</div>
        <ul class="tl-item__points">
          ${e.points.map((p) => `<li>${esc(p)}</li>`).join("")}
        </ul>
        <div class="tags">${e.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      </li>`
    )
    .join("");

  const moreSlot = $("#mission-log-more");
  if (moreSlot) {
    const url = profile.links?.linkedin;
    const label = content.experience_more_label || "See more on LinkedIn";
    moreSlot.innerHTML = url
      ? `<a class="btn btn--primary" href="${attrUrl(url)}" rel="noopener" target="_blank">${esc(label)}</a>`
      : "";
  }
}

/* ---------- Hall of Fame (achievements dossier) ---------- */
export function renderHallOfFame() {
  const deck = $(".hof__deck");
  if (deck && hallOfFame.deck) deck.textContent = hallOfFame.deck;

  const academicSlot = $("#hof-academic");
  if (academicSlot && hallOfFame.academic) {
    const a = hallOfFame.academic;
    academicSlot.innerHTML = `
      <article class="hof-academic">
        <div class="hof-academic__stamp">
          <span class="hof-academic__stamp-label">${esc(a.label)}</span>
          <span class="hof-academic__gpa"><b>${esc(a.gpa)}</b><small>/ ${esc(a.scale)} GPA</small></span>
        </div>
        <div class="hof-academic__body">
          <h3 class="hof-academic__degree">${esc(a.degree)}</h3>
          <p class="hof-academic__school">${esc(a.school)} · ${esc(a.period)}</p>
          <p class="hof-academic__thesis"><span class="hof-academic__kicker">Thesis</span> ${esc(a.thesis)}</p>
        </div>
      </article>`;
  }

  const awardsSlot = $("#hof-awards");
  if (awardsSlot) {
    awardsSlot.innerHTML = (hallOfFame.awards || [])
      .map(
        (w) => `
      <li class="hof-item">
        <span class="hof-item__rank">${esc(w.rank)}</span>
        <span class="hof-item__title">${esc(w.title)}</span>
        <span class="hof-item__org">${esc(w.organizer)}</span>
        <span class="hof-item__year">${esc(w.year)}</span>
      </li>`
      )
      .join("");
  }

  const pubsSlot = $("#hof-publications");
  if (pubsSlot) {
    pubsSlot.innerHTML = (hallOfFame.publications || [])
      .map((p) => {
        const inner = `
          <span class="hof-item__badge">${esc(p.badge)}</span>
          <span class="hof-item__title">${esc(p.title)}</span>
          <span class="hof-item__org">${esc(p.venue)}</span>
          <span class="hof-item__year">${esc(p.year)}</span>`;
        return p.url
          ? `<li class="hof-item hof-item--link"><a href="${attrUrl(p.url)}" rel="noopener" target="_blank">${inner}</a></li>`
          : `<li class="hof-item">${inner}</li>`;
      })
      .join("");
  }
}

/* ---------- Projects ---------- */

/**
 * Render an evidence-first case-study block from a project's optional
 * `caseFile` object. `prefix` is the BEM block name ("spotlight" or "card") so
 * the same structure works in both surfaces with their own CSS hooks.
 *
 * Rules (frozen contract):
 *   - Only verified facts come from the data file.
 *   - `outcome` empty/absent  → the Outcome row is omitted entirely (never a
 *     placeholder or TODO printed to the user).
 *   - `proof` empty/absent    → the proof list is omitted.
 * Returns "" when there is no `caseFile`, so callers can interpolate blindly.
 */
function renderCaseBlock(cf, prefix) {
  if (!cf) return "";
  const rows = [
    ["Problem", cf.problem],
    ["Role", cf.role],
    ["Approach", cf.approach],
    ["Outcome", cf.outcome],
  ]
    .filter(([, value]) => value) // drop empty/absent rows (e.g. no Outcome)
    .map(
      ([label, value]) => `
        <div class="${prefix}__case-row">
          <span class="${prefix}__case-label">${label}</span>
          <span class="${prefix}__case-value">${esc(value)}</span>
        </div>`
    )
    .join("");

  const proof =
    Array.isArray(cf.proof) && cf.proof.length
      ? `<ul class="${prefix}__proof">${cf.proof
          .filter((l) => l && l.url)
          .map(
            (l) =>
              `<li><a href="${attrUrl(l.url)}" rel="noopener" target="_blank">${esc(l.label || l.url)} ↗</a></li>`
          )
          .join("")}</ul>`
      : "";

  const why = cf.why ? `<p class="${prefix}__why">${esc(cf.why)}</p>` : "";

  if (!rows && !proof && !why) return "";
  return `
    <div class="${prefix}__case">
      ${rows}
      ${proof}
      ${why}
    </div>`;
}

export function renderSpotlight() {
  const slot = $("#spotlight-slot");
  if (!slot || !featuredProject) return;
  const f = featuredProject;
  slot.innerHTML = `
    <div class="spotlight">
      <div>
        <div class="spotlight__metric">${esc(f.stars)}<small>★ GITHUB STARS</small></div>
        <div class="tags" style="margin-top:var(--sp-4)">
          ${(f.topics || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}
        </div>
      </div>
      <div>
        <h3 style="margin-bottom:var(--sp-3)">${esc(f.name)}</h3>
        <p class="card__desc">${esc(f.desc)}</p>
        ${renderCaseBlock(f.caseFile, "spotlight")}
        <a class="btn btn--primary" href="${attrUrl(f.url)}" rel="noopener" target="_blank">Open Repository</a>
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
      <article class="card${p.fork ? " card--fork" : ""}" data-project="${esc(p.id)}">
        ${
          p.fork
            ? `<span class="card__fork" title="Fork of a team/org repository">FORK</span>`
            : ""
        }
        <div class="card__top">
          <h3 class="card__title">${esc(p.name)}</h3>
          <span class="card__lang">${esc(p.lang)}</span>
        </div>
        <p class="card__desc">${esc(p.desc)}</p>
        ${renderCaseBlock(p.caseFile, "card")}
        <div class="card__meta">
          <span>★ ${esc(p.stars)}</span>
          <span>${esc(p.year)}</span>
        </div>
        <button class="btn" style="margin-top:var(--sp-4)" data-open="${esc(p.id)}">Details</button>
      </article>`
    )
    .join("");
}

export function projectById(id) {
  return projects.find((p) => p.id === id);
}

/* ---------- Chrome: hero, section headers, contact, footer ----------
   The HTML keeps its own copy of every string so the page still reads with
   JS off (and while content.json is in flight). These functions re-stamp that
   copy from content.json — the one editable source. */

/** Stamp the document title + meta description from `site`. */
function renderSiteMeta() {
  if (SITE.title) document.title = SITE.title;
  if (SITE.description) {
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", SITE.description);
  }
}

/** Hero kicker, name, role, tagline, portrait tag and CTAs. */
function renderHero() {
  const h = content.hero;
  if (!h) return;
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el && value != null) el.textContent = value;
  };
  setText("hero-kicker", h.kicker);
  setText("hero-name-1", h.name_line1);
  setText("hero-name-2", h.name_line2);
  setText("hero-role", h.role);
  setText("hero-tagline", h.tagline);
  setText("portrait-tag", h.portrait_tag);

  const cta = document.getElementById("hero-cta");
  if (cta) {
    if (h.cta_label) cta.textContent = h.cta_label;
    // setAttribute does not parse HTML, so there is no markup injection here —
    // but a `javascript:` value would still run on click, so the URL is vetted.
    if (h.cta_href) cta.setAttribute("href", attrUrl(h.cta_href));
  }
  const gh = document.getElementById("hero-gh");
  if (gh && profile.links?.github) gh.setAttribute("href", attrUrl(profile.links.github));
  const li = document.getElementById("hero-li");
  if (li && profile.links?.linkedin) li.setAttribute("href", attrUrl(profile.links.linkedin));
}

/**
 * Section headers — kicker, narrative beat, big title and the a11y
 * `data-name` the HUD and overlay menu read. Values come from the `sections`
 * key of content.json, keyed by section id.
 */
/**
 * Section headers: kicker (01 / ...), narrative beat, and the section's
 * accessible name. The visible Anton heading is gone by design — the small
 * mono kicker plus the story beat are the only on-screen markers — so the
 * section NAME now lives on `aria-label` (screen readers) instead of an h2.
 * It still comes from content.json `sections.<id>.title`, so editing the JSON
 * changes what assistive tech announces.
 */
function renderSectionHeaders() {
  document.querySelectorAll("main section[id]").forEach((sec) => {
    const meta = content.sections?.[sec.id];
    if (!meta) return;
    if (meta.name) sec.dataset.name = meta.name;
    if (meta.index) {
      const idx = sec.querySelector(".section__index");
      if (idx) idx.textContent = meta.index;
    }
    if (meta.story?.beat) {
      const beat = sec.querySelector("[data-story-beat]");
      if (beat) beat.textContent = meta.story.beat;
    }
    if (meta.title) sec.setAttribute("aria-label", meta.title);
  });
}

/** Quick-facts column + focus tags from `profile`. */
function renderQuickFacts() {
  const slot = document.getElementById("profile-facts");
  if (slot && Array.isArray(profile.quick_facts)) {
    slot.innerHTML = profile.quick_facts
      .map((f) => `<li class="identity-card__fact"><b>${esc(f.value)}</b><span>${esc(f.label)}</span></li>`)
      .join("");
  }
  const tagSlot = document.getElementById("profile-tags");
  if (tagSlot && Array.isArray(profile.focus_tags)) {
    tagSlot.innerHTML = profile.focus_tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("");
  }
}

/** Case-files footnote + confidentiality line. */
function renderCaseNotes() {
  const note = document.getElementById("case-note");
  if (note && content.case_files_note) {
    const url = profile.links?.github || "#";
    note.innerHTML =
      `${esc(content.case_files_note)} ` +
      `<a class="accent" href="${attrUrl(url)}" rel="noopener" target="_blank">GitHub</a>.`;
  }
  const disc = document.getElementById("case-disclosure");
  if (disc && content.case_files_disclosure) disc.textContent = content.case_files_disclosure;
}

/** Contact block + footer tagline. */
function renderContact() {
  const c = content.contact;
  if (c) {
    const big = document.getElementById("contact-big");
    if (big && c.big_text) big.innerHTML = richText(c.big_text);

    const slot = document.getElementById("contact-links");
    if (slot && Array.isArray(c.links)) {
      slot.innerHTML = c.links
        .map(
          (l) =>
            `<a class="btn${l.primary ? " btn--primary" : ""}" href="${attrUrl(l.url)}" ` +
            `rel="noopener" target="_blank">${esc(l.label)}</a>`
        )
        .join("");
    }
  }
  const foot = document.getElementById("footer-tagline");
  if (foot && content.footer?.tagline) foot.textContent = content.footer.tagline;
}

/* ---------- Modal (project dossier) ----------
   A real dialog: focus moves in on open, Tab/Shift+Tab cycle inside it, Esc
   closes, and focus returns to the trigger on close. The Escape key stays
   shared with the chapter overlay — its own capture-phase handler runs first
   and stops propagation while it owns the page, so the overlay wins and the
   dossier only reacts when nothing else wants the key. */
let lastFocus = null;

const modalRoot = () => $("#modal");

/** True while the dossier dialog is the page's active dialog. */
function isModalOpen() {
  const m = modalRoot();
  return !!m && !m.hidden;
}

/**
 * Tab-cycle candidates inside the dialog, in DOM order. Re-read on every Tab
 * because the body is re-rendered per project.
 */
function modalFocusables() {
  const root = modalRoot();
  if (!root) return [];
  return [...root.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])")].filter(
    (el) => !el.disabled && el.getClientRects().length > 0
  );
}

export function openModal(id) {
  const p = projectById(id);
  const modal = modalRoot();
  const body = $("#modal-body");
  if (!p || !modal || !body) return;
  lastFocus = document.activeElement;

  // Evidence-first block — the SAME renderer the cards and spotlight use, so
  // the escaping lives in one place (it already takes a BEM prefix).
  const caseBlock = renderCaseBlock(p.caseFile, "card");

  body.innerHTML = `
    <h3 id="modal-title">${esc(p.name)}</h3>
    <div class="tags" style="margin-bottom:var(--sp-4)">
      ${p.fork ? `<span class="tag tag--fork">FORK</span>` : ""}
      <span class="tag">${esc(p.lang)}</span>
      <span class="tag">★ ${esc(p.stars)}</span>
      <span class="tag">${esc(p.year)}</span>
    </div>
    <p>${esc(p.desc)}</p>
    ${caseBlock}
    <div class="tags" style="margin:var(--sp-4) 0">
      ${(p.topics || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}
    </div>
    <a class="btn btn--primary" href="${attrUrl(p.url)}" rel="noopener" target="_blank">Open on GitHub</a>`;
  modal.hidden = false;
  document.body.classList.add("is-locked");
  $("#modal-close")?.focus();
}

export function closeModal() {
  const modal = modalRoot();
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove("is-locked");
  if (lastFocus instanceof HTMLElement && document.contains(lastFocus)) lastFocus.focus();
}

export function initUI() {
  renderSiteMeta();
  renderHero();
  renderSectionHeaders();
  renderProfile();
  renderQuickFacts();
  renderSkills();
  renderHallOfFame();
  renderExperience();
  renderCaseNotes();
  renderSpotlight();
  renderProjects();
  renderContact();

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
    if (e.key === "Escape") {
      // Esc is shared with the chapter overlay; its own capture-phase handler
      // runs first and stops propagation while it owns the page, so reaching
      // here means no other dialog wants the key.
      if (isModalOpen()) closeModal();
      return;
    }

    if (e.key !== "Tab" || !isModalOpen()) return;

    // Focus trap: Tab cycles inside the dossier dialog, exactly like the
    // chapter overlay does ("Tab" only gets intercepted at the EDGES, so
    // ordinary tabbing still walks every focusable inside). A focus sitting
    // OUTSIDE (page scrolled, script moved it) is pulled back in.
    const f = modalFocusables();
    if (!f.length) {
      e.preventDefault();
      return;
    }
    const first = f[0];
    const last = f[f.length - 1];
    const active = document.activeElement;

    if (!modalRoot().contains(active)) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  });

  return { repoCount };
}
