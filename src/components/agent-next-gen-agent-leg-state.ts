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
// This module is the fix: each page seeds `AgentProfile`'s new
// `initialAgentLegStatus` prop (agent-profile.tsx) from `readAgentLegStatus()`
// at mount, and calls `saveAgentLegStatus()` every time `onAgentLegStatusChange`
// reports a real connect/disconnect, so the NEXT page mount (whichever tier
// the agent switches to) picks up right where this one left off.
//
// IMPORTANT — deliberately in-memory ONLY, never `localStorage`. An earlier
// version of this module persisted `cache` to `localStorage`, which is what
// caused a real, reported bug: "it's still showing connected on initial log
// in - it should be disconnected." `localStorage` survives an actual browser
// reload/new tab, not just an in-app tier switch — so once the agent leg had
// ever been connected once, EVERY future fresh login (including a totally
// new session) kept reading that stale `"connected"` value back, with no way
// to distinguish "the agent just switched tiers a moment ago" from "this is
// a brand new login that's never touched the leg." A plain in-memory module
// singleton fixes both halves of the original request at once: `App.tsx`'s
// own top-level `App` component never unmounts across a tier switch (Premium
// → Advanced → Basic just swaps which page component it renders — see
// App.tsx's own hash-router), so this still correctly survives every
// in-session switch; but a genuine browser reload creates a fresh JS module
// instance, resetting `cache` back to `"disconnected"` — exactly the "fresh
// login always starts disconnected" behavior needed. See
// `consumeInitialAgentLegAnnouncement` below for the matching "announce once
// per login, not on every tier switch" half of the same fix.
//
// Deliberately only ever stores the two SETTLED states — `"connecting"` is a
// transient, in-flight animation with no meaning as a starting point for a
// fresh mount (see `AgentProfile`'s own `initialAgentLegStatus` doc comment)
// — so this module's own type is narrower than `AgentProfile`'s full
// `agentLegStatus` union on purpose.
//
// Importantly, seeding a value here is NOT itself a connect/disconnect
// event: `AgentProfile`'s own `isFirstAgentLegRender` mount-skip guard means
// `onAgentLegStatusChange` (and therefore any consumer's own toast) never
// fires just from hydrating this seeded value on mount — switching tiers
// must silently carry the status over, never re-announce it as if it had
// just happened again. The actual "announce on login" behavior is handled
// separately, by each page explicitly calling `fireAgentLegStatusToast`
// itself when `consumeInitialAgentLegAnnouncement()` says this mount is a
// fresh login.

export type AgentLegSettledStatus = "disconnected" | "connected";

// Always starts `"disconnected"` — matches `AgentProfile`'s own pre-existing
// default, and (per the fix above) is never seeded from `localStorage`, so
// every genuinely fresh browser session starts here regardless of what any
// earlier session left the leg in.
let cache: AgentLegSettledStatus = "disconnected";

/** Reads the agent leg's current settled status for THIS browser tab's
 *  session — call once at mount to seed `AgentProfile`'s
 *  `initialAgentLegStatus` prop. */
export function readAgentLegStatus(): AgentLegSettledStatus {
  return cache;
}

/** Persists a real, settled connect/disconnect — called from each page's
 *  own `fireAgentLegStatusToast`/`onAgentLegStatusChange` handler, so the
 *  very next page mount (whichever tier the agent switches to, within this
 *  same browser tab) picks up the change. Never called with `"connecting"`;
 *  see this module's own top-of-file doc comment. */
export function saveAgentLegStatus(status: AgentLegSettledStatus) {
  cache = status;
}

// Whether the "you're not connected" toast has already been shown once in
// this browser tab's lifetime. Per explicit request: "I want it to display a
// not connected toast [on login] but if connected, keep it connected when
// going to premium, advanced, basic (and likewise keep it disconnected but
// don't fire the toast again)." Same in-memory-module-singleton reasoning as
// `cache` above — survives every in-session tier switch, resets on a real
// reload. Deliberately consumed only from inside a mount-only `useEffect` in
// each page, never a `useState` lazy initializer — React 18 StrictMode (this
// app runs under it, see main.tsx) double-invokes lazy initializers during
// render as an impurity check, which would silently burn this exactly once
// on a throwaway, discarded render. Effects don't have that problem the same
// way: StrictMode's dev-only effect double-invoke is mount → cleanup →
// mount, so the second call here still correctly sees the flag already
// consumed by the first, and the user only ever sees the toast once either
// way.
let hasAnnouncedInitialStatus = false;

/** Returns `true` the first time this is ever called in this browser tab's
 *  lifetime, and `false` every time after. Call once from a mount-only
 *  `useEffect` in each Agent Workspace page: `true` means this mount is a
 *  fresh login (announce the current status, if it's `"disconnected"`);
 *  `false` means this mount is a tier switch (stay silent — the status
 *  itself still carries over via `readAgentLegStatus`, only the
 *  announcement doesn't repeat). See this file's own top-of-file doc
 *  comment. */
export function consumeInitialAgentLegAnnouncement(): boolean {
  if (hasAnnouncedInitialStatus) return false;
  hasAnnouncedInitialStatus = true;
  return true;
}
