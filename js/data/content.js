/**
 * content.js — the one door to content.json.
 *
 * EVERY content module under js/data/ awaits this, so the whole page shares a
 * single load of `content.json` (cached). Edit that one file to change any
 * text, link, project, experience row, or section label on the site.
 *
 * The URL is resolved against THIS module (not the document), so the site
 * works from any base path — project Pages (`/Persona-alif-porto/`), a custom
 * domain, or a local static server.
 *
 * Two loaders, one contract:
 *   - browser: fetch() over HTTP(S) — the deployed case.
 *   - Node:    readFileSync() — so `node lab/*.test.mjs` (menu.test.mjs,
 *              progress.test.mjs) can import the data modules. Node's fetch
 *              rejects file:// URLs, which used to leave the registry empty
 *              and fail both suites.
 *
 * Failure policy: a missing/broken content.json is logged loudly and yields
 * an EMPTY object (never a silent half-page). The HTML shell keeps its own
 * copy of the chrome as a no-JS fallback, so the page still reads.
 */

const CONTENT_URL = new URL("../../content.json", import.meta.url);

/**
 * True when this module was loaded from disk (Node unit tests) rather than
 * over HTTP (the browser). `import.meta.url` is the one signal the lab tests
 * cannot fake: Node resolves it to a `file:` URL, the browser to http(s).
 * Sniffing `window`/`document`/`fetch` all failed here — the tests stub
 * `globalThis.window` AND `globalThis.document`, and Node ships `fetch` that
 * rejects file:// URLs.
 */
const isNode = CONTENT_URL.protocol === "file:";

/**
 * Load the master content file, whichever runtime we are in.
 * @returns {Promise<object>|object} parsed content.json — `{}` when it cannot load.
 */
function readContent() {
  if (isNode) {
    // Node has no HTTP here: read the file straight off disk. The dynamic
    // import never executes in a browser (isNode is false there), so the
    // browser bundle stays clean — this project has no build step.
    return import("node:fs")
      .then(({ readFileSync }) => JSON.parse(readFileSync(CONTENT_URL, "utf8")))
      .catch((err) => {
        console.error(
          "[content] Tidak bisa membaca content.json dari disk (Node):",
          err.message || err
        );
        return {};
      });
  }

  return fetch(CONTENT_URL, { cache: "no-cache" })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return res.json();
    })
    .catch((err) => {
      console.error(
        "[content] Gagal memuat content.json —" +
          " pastikan file ada di root project dan halaman disajikan lewat HTTP" +
          " (bukan file://). Detail:",
        err
      );
      return {};
    });
}

/** One shared promise: parallel imports must not trigger parallel loads. */
let inflight = null;

/**
 * Load (once) and cache the master content file.
 * @returns {Promise<object>} parsed content.json — `{}` when it cannot load.
 */
export function loadContent() {
  if (inflight) return inflight;
  inflight = Promise.resolve()
    .then(readContent)
    .then((json) => {
      if (!json || typeof json !== "object" || Array.isArray(json)) {
        console.error("[content] content.json bukan object — diperlakukan sebagai kosong.");
        return {};
      }
      return json;
    });
  return inflight;
}

/** Read a slice of the content file (no separate load of its own). */
export function slice(key) {
  return loadContent().then((json) => json?.[key]);
}
