// A tiny embedded "local database" for full `Interaction` records — the
// piece Contact History was missing. Every OTHER piece of state in this app
// (`interactions`, `dismissedContactHistory`, ...) lives only in React
// state: the moment "Unassign & Dismiss" removes an `Interaction` from
// `interactions`, every `Thread`, every `liveMessages` entry, and every
// per-channel `threadStatuses` value it held went with it — all Contact
// History ever kept was `buildDismissedContactHistoryEntry`'s own lossy,
// single-channel SUMMARY (`ContactHistoryEntry`), not the real underlying
// record. `handleReopenContactHistoryEntry` then had nothing to rebuild
// from except that summary, so it had to fabricate a brand-new `Thread` —
// a fresh synthesized address (a new "tab" for the same channel type
// instead of the one the customer actually messaged on), empty
// `liveMessages` (the whole conversation gone), and a status pulled from
// the summary's own single `statusLabel` rather than the real per-channel
// `threadStatuses` map it was actually last left at (wrong the moment an
// interaction had more than one open channel, or the primary channel
// picked by `buildDismissedContactHistoryEntry` wasn't the one the agent
// cared about).
//
// This module is the fix: every dismissed `Interaction` is written here,
// byte-for-byte, BEFORE it's removed from `interactions` — keyed by
// `customerId` (`ContactHistoryEntry.caseId`), the one identity that's
// stable across the whole life of a case (see that field's own doc
// comment in agent-next-gen-contact-history.tsx). `handleReopenContactHistoryEntry`
// reads it back out by that same key and restores the exact record it
// saved, rather than reconstructing a guess — the same Thread ids/
// addresses, the same liveMessages, the same threadStatuses. A real
// backend would just be a database row per case; this is the closest a
// browser-only prototype gets to one: an in-memory cache (so nothing ever
// waits on I/O mid-render) backed by `localStorage` (so it's a genuine
// local *database* — writes actually persist across a reload, not just
// for the rest of this in-memory session).
//
// Deliberately narrow: this only ever stores/restores whatever a real
// `Interaction` already looked like at save time. It does NOT hydrate
// `interactions` state on page load (that would resurrect every past case
// straight into the left nav on every refresh, a much bigger behavior
// change nobody asked for) — it only answers "what did case X last look
// like," on demand, for Contact History's own Re-open flow to use.
import type { Interaction } from "@/components/agent-next-gen-interaction-dashboard";

const STORAGE_KEY = "agent-next-gen:case-database:v1";

// Hydrated lazily (not at module-eval time) so this file stays safe to
// import from anywhere, including any future non-browser context (tests,
// SSR) — `localStorage` is only ever touched once something actually calls
// `saveCaseRecord`/`getCaseRecord`, not just from importing this module.
let cache: Record<string, Interaction> | null = null;

function readCache(): Record<string, Interaction> {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as Record<string, Interaction>) : {};
  } catch {
    // Corrupt JSON, storage disabled (private browsing, some embedded
    // webviews), or `localStorage` unavailable entirely — fall back to a
    // plain in-memory cache for the rest of this session rather than
    // throwing and breaking every dismiss/reopen in the app.
    cache = {};
  }
  return cache;
}

function writeCache(next: Record<string, Interaction>) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Same fallback as above — the in-memory `cache` above is still
    // correct and keeps serving `getCaseRecord` for the rest of this
    // session, it just won't survive an actual page reload.
  }
}

/** Writes (or overwrites) this case's full record — called every time an
 *  `Interaction` changes AND every time one is about to be dismissed (see
 *  the `useEffect`/`handleDismissInteraction` call sites in each page
 *  component), so whatever's stored here is always this case's true
 *  latest state, not just a snapshot frozen at the one moment it happened
 *  to be dismissed. Keyed by `interaction.customerId` — see this file's
 *  own top-of-file comment for why that's the right identity to persist
 *  under (matches `ContactHistoryEntry.caseId`, stable across every
 *  reopen/redismiss cycle, unlike `Interaction.id`, which for a
 *  quick-dialed/history-only case can be a synthetic key that doesn't
 *  necessarily agree with the id a LATER reopen recomputes). */
export function saveCaseRecord(interaction: Interaction): void {
  const next = { ...readCache(), [interaction.customerId]: interaction };
  writeCache(next);
}

/** Reads a case's full record back out by `caseId`
 *  (`ContactHistoryEntry.caseId` / `Interaction.customerId`) —
 *  `undefined` when this case was never saved here (a hand-authored
 *  `CONTACT_HISTORY`/`EXTENDED_CONTACT_HISTORY` fixture row that never
 *  existed as a real, live `Interaction` in this session — `handleReopenContactHistoryEntry`
 *  falls back to its own prior synthesized-`Thread` behavior in that
 *  case, same as before this module existed). */
export function getCaseRecord(caseId: string): Interaction | undefined {
  return readCache()[caseId];
}
