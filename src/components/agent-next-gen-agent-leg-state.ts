// Shared, cross-page "agent leg" (softphone/telephony connection) status —
// per explicit request ("keep the state of the agent leg consistent if the
// user goes from premium to advanced to basic"): "Agent Workspace 2.0
// Premium" (AgentWorkspace2WithDeskPage.tsx), "Agent Workspace 2.0 Advanced"
// (AgentWorkspaceAdvancedPage.tsx), and the plain "agent" page
// (AgentNextGenPage.tsx) are each their own separate top-level route/
// component (App.tsx) — switching between them via the app-picker dropdown
// fully unmounts one and mounts the other, not a re-render of a shared
// component. `AgentProfile` (lyra-ui) has always owned `agentLegStatus`
// itself, as plain internal `useState` defaulting to `"disconnected"` on
// every mount — so a genuinely CONNECTED agent leg on Premium looked
// disconnected again the instant they switched to Advanced, with nothing
// having actually changed about the leg itself.
//
// This module is the fix, same in-memory-cache-backed-by-`localStorage`
// pattern `agent-next-gen-case-database.ts` already established (see that
// file's own doc comment for the full reasoning on why that shape): each
// page seeds `AgentProfile`'s new `initialAgentLegStatus` prop (agent-
// profile.tsx) from `readAgentLegStatus()` at mount, and calls
// `saveAgentLegStatus()` every time `onAgentLegStatusChange` reports a real
// connect/disconnect, so the NEXT page mount (whichever tier the agent
// switches to) picks up right where this one left off.
//
// Deliberately only ever stores the two SETTLED states — `"connecting"` is
// a transient, in-flight animation with no meaning as a starting point for
// a fresh mount (see `AgentProfile`'s own `initialAgentLegStatus` doc
// comment) — so this module's own type is narrower than `AgentProfile`'s
// full `agentLegStatus` union on purpose.
//
// Importantly, seeding a value here is NOT itself a connect/disconnect
// event: `AgentProfile`'s own `isFirstAgentLegRender` mount-skip guard means
// `onAgentLegStatusChange` (and therefore any consumer's own toast) never
// fires just from hydrating this seeded value on mount — per explicit
// request ("the agent leg disconnected toast should only fire after the
// login"), switching tiers must silently carry the status over, never
// re-announce it as if it had just happened again.
const STORAGE_KEY = "agent-next-gen:agent-leg-status:v1";

export type AgentLegSettledStatus = "disconnected" | "connected";

// Hydrated lazily, not at module-eval time — same reasoning as
// `agent-next-gen-case-database.ts`'s own `readCache`: keeps this file safe
// to import anywhere, and `localStorage` is only ever touched once
// something actually calls `readAgentLegStatus`/`saveAgentLegStatus`.
let cache: AgentLegSettledStatus | null = null;

function readCache(): AgentLegSettledStatus {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw === "connected" ? "connected" : "disconnected";
  } catch {
    // Storage disabled (private browsing, some embedded webviews) or
    // unavailable entirely — fall back to the same plain in-memory default
    // every fresh session already starts from, rather than throwing.
    cache = "disconnected";
  }
  return cache;
}

/** Reads the agent leg's last-known settled status — call once at mount to
 *  seed `AgentProfile`'s `initialAgentLegStatus` prop. Defaults to
 *  `"disconnected"`, matching `AgentProfile`'s own pre-existing default for
 *  a brand-new session that's never connected the leg at all. */
export function readAgentLegStatus(): AgentLegSettledStatus {
  return readCache();
}

/** Persists a real, settled connect/disconnect — called from each page's
 *  own `fireAgentLegStatusToast`/`onAgentLegStatusChange` handler, ahead of
 *  (or alongside) actually showing the toast, so the very next page mount —
 *  on this tier or any other — picks up the change. Never called with
 *  `"connecting"`; see this module's own top-of-file doc comment. */
export function saveAgentLegStatus(status: AgentLegSettledStatus) {
  cache = status;
  try {
    localStorage.setItem(STORAGE_KEY, status);
  } catch {
    // Same fallback as `readCache` — the in-memory `cache` above is still
    // correct and keeps serving the rest of this session, it just won't
    // survive an actual page reload.
  }
}
