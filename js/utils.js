window.MEILP = window.MEILP || {};

/**
 * Shared utility helpers. Keep these small, pure, and platform-agnostic.
 */

/**
 * Returns the first element matching a selector within a scope.
 */
function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

/**
 * Returns all elements matching a selector within a scope as an array.
 */
function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

/**
 * Escapes a value for safe HTML interpolation.
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Fetches and parses JSON, returning fallback on load or parse failure.
 */
async function fetchJson(path, fallback) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Unable to load ${path}`);
    }
    return await response.json();
  } catch {
    return fallback;
  }
}

window.MEILP.qs = qs;
window.MEILP.qsa = qsa;
window.MEILP.escapeHtml = escapeHtml;
window.MEILP.fetchJson = fetchJson;
