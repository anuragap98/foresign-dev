// Saved state moved from the old "agent-panel:" keys to "foresign:".
// Carry it over once so nobody loses their settings. Imported before any
// store, because persisted stores read storage as soon as they load.
const OLD = 'agent-panel:'
const NEW = 'foresign:'

try {
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(OLD)) continue
    const next = NEW + key.slice(OLD.length)
    if (localStorage.getItem(next) === null) localStorage.setItem(next, localStorage.getItem(key)!)
    localStorage.removeItem(key)
  }
} catch {
  // Storage can be unavailable (private mode, blocked site data).
}
