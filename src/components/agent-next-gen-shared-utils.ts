import type { ChannelType, SortDirection, QuickReplyField, DateRangeFilterValue, DateRange, PhoneValue } from "@nicecxone/lyra-ui";

/* ── Shared, dependency-free helpers ──
   Split out of AgentNextGenPage.tsx (which had grown past Babel's 500KB
   code-generator threshold — see that file's own top-of-file note) so it
   has somewhere to import these from instead of declaring them itself.
   Every function/constant in this file is deliberately "pure" with
   respect to the rest of the app: none of them reference any OTHER
   AgentNextGenPage-specific type, component, or piece of mock data — they
   only take plain values in and return plain values out (or, for a
   handful, reference only each other, e.g. `newCaseNotificationTitle` →
   `channelNoun`, `getAwaitingSeverity` → its own two threshold constants).
   That purity is exactly what makes this file safe to sit at the BASE of
   the dependency graph: `agent-next-gen-outbound-data.ts`,
   `agent-next-gen-customer-info-panel.tsx`, and others all import from
   here, and this file imports from none of them — so there's no risk of
   a circular import no matter how many of those feature files end up
   needing the same small helper (confirmed via a dependency-graph script
   before the split, not just by inspection — see PROJECT_SUMMARY.md's
   "AgentNextGenPage split" entry if this file's own history is ever
   relevant again). */

function initialsFor(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/** Fallback case id for interactions with no real customer/agent/team/skill
 *  record behind them (quick-dialed numbers) — same "CS-" + digits shape as
 *  every other generated case id in this file, just namespaced separately
 *  since those already-real ids come with their own prefix per record type
 *  (customerId/agentId/TEAM-.../SKL-.../ASN-...). */
function generateCaseId(): string {
  return `CS-${Math.floor(1000000 + Math.random() * 9000000)}`;
}

/** This Interaction's own real, distinct identity — same plain-numeric
 *  shape as an earlier reference screenshot ("#707535188548", 12 digits, no
 *  prefix) — distinct from `generateCaseId`'s "CS-" shape (a customer/case-
 *  level id) AND from `generateContactId`'s "CTX-" shape (a specific
 *  Contact's own id) below. Called exactly once per Interaction, at the
 *  moment a customer with no currently-open card gets engaged again (see
 *  `Interaction.interactionId`'s own doc comment, agent-next-gen-
 *  interaction-dashboard.tsx, for the full start/end lifecycle this feeds).
 *  Previously generated per-CHANNEL instead (used for `Thread`'s own,
 *  since-removed `interactionId` field, shown on its `ChannelToggle`
 *  tooltip) — repurposed here now that a real `Interaction` concept with
 *  its own id and lifecycle exists to actually use this name correctly. */
function generateInteractionId(): string {
  return String(Math.floor(100000000000 + Math.random() * 900000000000));
}

/** A specific Contact's own real id — "CTX-YYYYMMDD-NNNNN", matching the
 *  format the handful of hardcoded historical `TRANSCRIPT_SESSIONS`/`_VOICE`/
 *  `_EMAIL` mock Contacts already use for their own `caseId` (now
 *  `Contact.contactId`) — e.g. "CTX-20250722-08841". Called once per Contact
 *  (the synthetic "just launched" one, and each reopen) at the moment it's
 *  created, replacing what used to be a real, shipped bug: every live
 *  Contact's own `caseId` was set to `recordId` (now `Interaction.
 *  customerId`) — the CUSTOMER's id, not a distinct per-Contact one — so the
 *  Session Details panel's own "Contact ID" field and the "# caseId · date"
 *  separator pill both silently showed the Customer ID instead. Distinct
 *  from `generateInteractionId` above (an Interaction's own id) — a single
 *  Interaction can have several Contacts (the initial one, plus one more per
 *  reopen), each needs its own. */
function generateContactId(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const suffix = String(Math.floor(10000 + Math.random() * 90000));
  return `CTX-${yyyy}${mm}${dd}-${suffix}`;
}

/** Renders a tick count (seconds since the channel/interaction started) as
 *  the "MM:SS" format InteractionNavItem's `elapsed` prop expects. */
function formatElapsedTime(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const mm = Math.floor(clamped / 60);
  const ss = clamped % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/** Same idea as `formatElapsedTime` above but "HH:MM:SS", for the home tab's
 *  queue widgets — their wait time can run past an hour (e.g. voicemail),
 *  unlike a just-started interaction's MM:SS elapsed display. */
function formatWaitTime(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const hh = Math.floor(clamped / 3600);
  const mm = Math.floor((clamped % 3600) / 60);
  const ss = clamped % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/** Wait threshold (seconds) past which a just-answered channel's green
 *  "success" tier escalates to amber ("warning") — see `getAwaitingSeverity`
 *  below. Per explicit request: the moment the customer's message lands,
 *  this reads as a plain green "responded" signal, not an alert — only
 *  once it's sat unanswered this long does it actually need attention.
 *  Placeholder value; tune to whatever the real digital-channel SLA calls
 *  for.
 *
 *  TEMPORARY, per explicit request ("update the SLA timing to not display
 *  a warning until after 5 minutes... I will change this back... we are
 *  demoing and i don't want it firing during the demo"): bumped from 30s to
 *  300s (5 min) so the warning tier can't realistically fire mid-demo. The
 *  user has said they'll revert this themselves afterward — leave as-is
 *  unless told otherwise. */
const AWAITING_WARNING_SECONDS = 300;

/** Wait threshold (seconds) past which an awaiting channel escalates from
 *  amber ("warning") to red ("critical") — see `getAwaitingSeverity` below.
 *  Placeholder value; tune to whatever the real digital-channel SLA calls
 *  for.
 *
 *  TEMPORARY: bumped from 60s to 600s (10 min), same demo request as
 *  `AWAITING_WARNING_SECONDS` above — kept at 2× that constant (its
 *  original 30s/60s ratio) so critical still can't fire before warning
 *  does. */
const AWAITING_CRITICAL_SECONDS = 600;

/** Maps a channel's own "how long has it been awaiting a reply" duration
 *  (seconds since `lastCustomerMessageTick`, NOT since the channel opened —
 *  see that field's own doc comment) to the three-tier severity
 *  `InteractionNavItem`/`ChannelRow`/`ChannelTab` (lyra-ui) render, plus the
 *  "nearing/breached SLA" banner (`activeChannelAwaitingSeverity` — that one
 *  only actually renders for "warning"/"critical", treating "success" the
 *  same as no banner at all, see its own call site). Only ever called for a
 *  channel that IS awaiting — there's no separate return value for "not
 *  awaiting at all" here, that's represented by `awaitingSeverity` being
 *  omitted entirely at each call site; a channel that only just started
 *  awaiting is still very much awaiting, it just isn't overdue yet, so it
 *  gets the green "success" tier (a customer got a response promptly, this
 *  channel's own dot/color/etc. saying so) rather than no color or an
 *  immediate amber alert. */
function getAwaitingSeverity(waitSeconds: number): "success" | "warning" | "critical" {
  if (waitSeconds >= AWAITING_CRITICAL_SECONDS) return "critical";
  if (waitSeconds >= AWAITING_WARNING_SECONDS) return "warning";
  return "success";
}

/** "Email"/"SMS"/"Chat"/"Call" — the bare channel-name word shared by both
 *  `newCaseNotificationTitle` ("New {X}") and Escalation's own title
 *  ("Escalation - {X}", see `INITIAL_NOTIFICATIONS` in
 *  agent-next-gen-interaction-dashboard.tsx), so the two can't describe the
 *  same channel with two different words. SMS/WhatsApp/Chat all read as
 *  "Chat" (default branch) here — purely a notification-copy
 *  simplification local to this function, since nothing in this mock data
 *  distinguishes them from a customer's own vantage point; Voice falls
 *  back to "Call" defensively even though no current entry uses it. (Not
 *  to be confused with `ContactHistoryEntry.channelType`, agent-next-gen-
 *  contact-history.tsx — that field must carry the real channel type
 *  losslessly; a similar collapsing helper used to live there too and was
 *  removed after it caused a real, shipped bug — see that field's own doc
 *  comment.) */
function channelNoun(channel: ChannelType): string {
  switch (channel) {
    case "email":
      return "Email";
    case "sms":
      return "SMS";
    case "voice":
      return "Call";
    default:
      return "Chat";
  }
}

/** "New Email"/"New SMS"/"New Chat"/"New Call" — a "new-case" notification's
 *  title, derived from whichever channel it's actually on instead of a
 *  fixed "New Assignment" string regardless of channel, per explicit
 *  request. */
function newCaseNotificationTitle(channel: ChannelType): string {
  return `New ${channelNoun(channel)}`;
}

/* Logged-in agent — matches the "Good morning, John" home screen greeting.
   Used both to populate the Owner Assignee column and to decide whether an
   interaction's kebab menu should offer "Assign To Me" (only when it isn't
   already his). */
const CURRENT_AGENT_NAME = "John Smith";

const [CURRENT_AGENT_FIRST_NAME, CURRENT_AGENT_LAST_NAME] = CURRENT_AGENT_NAME.split(" ");

/* Dashboard page-header subtitle — "August 20, 2026 · 2:41 PM", read fresh
   on every render. History, in order, across several explicit follow-ups:
   originally "Wednesday, July 29, 2026 · 9:41 AM" (date + time); the
   time-of-day portion was dropped ("remove the time from the date subhead
   and just have the date"); it was then briefly replaced with a full
   sentence wrapped around the bare date ("Please review your queue and
   performance below for {Month Day, Year}", then re-worded to "Below is
   your dashboard for {Month Day, Year}"); reverted back to the bare date
   alone per a later explicit follow-up ("go back to the {Month Day, Year}
   for the subhead"); the time-of-day portion was then added back per a
   later explicit request ("add the time back to the date subhead") — the
   same request that also restored the header TITLE's own time-of-day
   greeting (see `formatHeaderGreeting` below), reversing the earlier
   VPN-timezone-unreliability reasoning that had dropped both. Still no
   weekday ("August 20, 2026," not "Thursday, August 20, 2026") — that
   "{Month Day, Year}" format is the one thing every version of this
   subtitle, sentence-wrapped or bare, has kept in common. Was
   `formatHeaderSubtitle` while it briefly held a full sentence; renamed
   back to `formatHeaderDate` once it went back to a date — kept as its own
   shared helper (rather than inlined at each of the 3 call sites) since
   it's identical across all 3 tiers. Ticks live for free: the main
   component's own `clockTick` state already re-renders this whole tree once
   a second for the open-channel elapsed timers, so this just reads
   `new Date()` again on whichever render that produces — no separate
   interval needed here (rolls over at midnight, and updates the visible
   minute, without a page reload). */
function formatHeaderDate(): string {
  const now = new Date();
  const datePart = now.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  const timePart = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

/* Dashboard page-header title — "Good Morning/Afternoon/Evening, {name}",
   read fresh on every render off the agent's local clock, same "ticks live
   for free" reasoning as `formatHeaderDate` above. History: this started as
   a time-of-day greeting ("Good morning, John"), was flattened to a plain
   "Welcome Back, {name}" per an explicit follow-up reasoning that an
   agent's local clock/timezone isn't reliable when connected through a VPN
   whose exit point sits elsewhere — then restored to a time-of-day greeting
   again per a later explicit request ("update the page header on the home
   page to say 'Good {Morning/Evening/Afternoon}, {Name}'"), which
   supersedes that earlier VPN-timezone concern. Boundaries (5am–11:59am
   "Morning", 12pm–4:59pm "Afternoon", otherwise "Evening") are a common
   convention, not something explicitly specified. Takes `name` as a
   parameter rather than hardcoding `CURRENT_AGENT_FIRST_NAME` itself, since
   all 3 call sites already import that constant separately for other uses
   (e.g. the welcome modal's own greeting). */
function formatHeaderGreeting(name: string): string {
  const hour = new Date().getHours();
  const partOfDay = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  return `Good ${partOfDay}, ${name}`;
}

/* Deterministic 12-digit case-ID generator (no Math.random, so the dashboard
   renders the same sample data on every load) */
function makeCaseId(seed: number, i: number): string {
  return String(470000000000 + seed * 111111 + i * 7777);
}

function formatCreateDate(seed: number, i: number): string {
  const month = 1 + ((seed * 5 + i) % 12);
  const day = 1 + ((seed * 3 + i * 5) % 28);
  const year = 24 + ((seed + i) % 3);
  const hour24 = (seed * 2 + i * 3) % 24;
  const minute = (seed * 7 + i * 13) % 60;
  const isPM = hour24 >= 12;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year} ${hour12}:${String(minute).padStart(2, "0")} ${isPM ? "PM" : "AM"}`;
}

/** "% of Team" for a single row — you as a share of the team total. 0 when the team total is 0 (avoids dividing by zero). */
function percentOfTeam(you: number, team: number): number {
  return team > 0 ? Math.round((you / team) * 100) : 0;
}

/** Drops a single channel id's entry out of a `channelStatuses` map, leaving
 *  every other channel's own status untouched — used by `handleStartCall`
 *  when a channel is restarted at the SAME address (so it reuses
 *  `Thread.id`, per that field's own doc comment): without this, a
 *  channel that was previously set to "Closed" and then redialed at the same
 *  number would silently reopen still reading "Closed" under its reused id,
 *  since nothing would otherwise clear the stale entry. Returns `undefined`
 *  (rather than an empty object) when the map is empty afterward, matching
 *  `Interaction.channelStatuses`'s own optional-when-nothing-set
 *  convention. */
function withoutChannelStatus(
  statuses: Record<string, string> | undefined,
  channelId: string
): Record<string, string> | undefined {
  if (!statuses || !(channelId in statuses)) return statuses;
  const { [channelId]: _omit, ...rest } = statuses;
  return Object.keys(rest).length > 0 ? rest : undefined;
}

function nextCustomerSortDirection(current: SortDirection): SortDirection {
  if (current === null) return "asc";
  if (current === "asc") return "desc";
  return null;
}

function nextInteractionSortDirection(current: SortDirection): SortDirection {
  if (current === null) return "asc";
  if (current === "asc") return "desc";
  return null;
}

/** One field's current raw value → its display text — a `Date` (from
 *  `DatePicker`/`TimePicker`) formats per `field.type` ("date" vs "time"
 *  need different `Date` formatting, which is why this needs the field's
 *  own type rather than just stringifying); an unset field falls back to
 *  its own `{key}` token so a still-incomplete preview reads as an
 *  obviously-unfilled blank rather than the literal word "undefined". */
function quickReplyFieldDisplayValue(field: QuickReplyField, raw: string | Date | undefined): string {
  if (raw instanceof Date) {
    return field.type === "time"
      ? raw.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : raw.toLocaleDateString();
  }
  if (typeof raw === "string" && raw.trim()) return raw;
  return `{${field.key}}`;
}

/* Tiny deterministic string hash → stable "random" index. Not
   cryptographic, just needs to turn a customer's `recordId` (or name, as a
   fallback) into the same pseudo-random number every time it's hashed, so
   the same customer always shows the same synthesized address/balance/zip
   across renders and reopening the panel — same intent as a seeded RNG,
   without pulling in a dependency for it. */
function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** A plausible (but invented) US phone number, formatted to match the
 *  Customer Information panel's own existing style ("+1 614 749 1794") —
 *  used only as a fallback when the active interaction has no real voice
 *  channel address to show instead (see `buildCustomerInfoFields`,
 *  agent-next-gen-customer-info-panel.tsx). */
function synthesizePhone(seed: number): string {
  const areaCode = 200 + (seed % 800);
  const exchange = 100 + (Math.floor(seed / 7) % 900);
  const line = 1000 + (Math.floor(seed / 13) % 9000);
  return `+1 ${areaCode} ${exchange} ${line}`;
}

/** Splits a customer's display name into first/last — shared by
 *  `buildCustomerInfoFields` (its synthesized email) and the Detail tab's
 *  "First Name"/"Last Name" fields, so both land on the exact same split
 *  for the same customer instead of two independently-hand-rolled
 *  versions of the same logic drifting apart. A name with no space (or no
 *  name at all) falls back to using the whole/default name as both. */
function splitCustomerName(customerName: string | undefined): { firstName: string; lastName: string } {
  const name = customerName ?? "Customer";
  const [firstName, ...restNameParts] = name.split(" ");
  const lastName = restNameParts.join(" ") || firstName;
  return { firstName, lastName };
}

/** What a record-header tab (`ChannelTab`'s own `address` prop) should show
 *  on its face — AND, just as importantly, what `Thread.value`
 *  itself should be set to — for a channel that was opened WITHOUT a real
 *  captured address: reopening a Contact History row, redialing one, or
 *  opening a row from the Interactions list all build a fresh
 *  `Thread` with no picked address of their own (no stored phone/
 *  email on either data shape), unlike `handleStartCall`'s own New
 *  Outbound/Customer-table path, which always has a real picked/typed
 *  address on hand (`selection.phone`, threaded onto both `value` and
 *  `addressLabel` there). Reuses the exact same `hashSeed`/`synthesizePhone`/
 *  `splitCustomerName` formulas `buildCustomerInfoFields`
 *  (agent-next-gen-customer-info-panel.tsx), `OUTBOUND_CUSTOMERS`, and
 *  `contactHistoryOutboundContact` (agent-next-gen-outbound-data.tsx)
 *  already use for this same customer/contact, so whatever ends up on the
 *  tab always agrees with the Customer Information panel's own
 *  "Phone #"/"Email" fields instead of inventing a second, different-
 *  looking address for the same person — pass the SAME string those two use
 *  as their own seed (a real customer's `customerId`, or the interaction's
 *  own `recordId` when there's no real customer record behind it) as
 *  `seedKey` here for that to hold.
 *
 *  This agreement is NOT just cosmetic: `create-new.tsx`'s
 *  `resolveOutboundDetailField`/`isChannelBlockedForContact` compare a
 *  contact's `openChannelAddresses[type]` (built from each open
 *  `Thread.value` — see `buildOpenChannelTagger`,
 *  AgentNextGenPage.tsx/AgentWorkspace2WithDeskPage.tsx) against that same
 *  contact's OWN `email`/`primaryPhone`/synthesized-`@name` WhatsApp handle
 *  to decide whether every address for a channel is already open and the
 *  channel should disable itself. If this function's output ever drifted
 *  from the contact object's own fields, that comparison would silently
 *  never match — exactly the bug this function's `value`-wiring fixes:
 *  confirmed via screenshot that reopening Omar Farooq (a hand-authored
 *  Contact History row, `contactHistoryOutboundContact`) and then clicking
 *  the header's own Email button opened a SECOND, duplicate email channel
 *  instead of disabling itself, because `handleReopenContactHistoryEntry`
 *  only ever set the new channel's `addressLabel` (display only), never its
 *  `value` — the field `buildOpenChannelTagger` actually reads to populate
 *  `openChannelAddresses` in the first place, so that map stayed empty and
 *  nothing ever looked "already open." The `@name` WhatsApp branch below
 *  deliberately does NOT strip spaces from `customerName` for this same
 *  reason — `resolveOutboundDetailField`'s own WhatsApp formula
 *  (`@${contact.name}`) doesn't either, and this needs to produce that
 *  exact same string, not a similar-looking one, or WhatsApp's own
 *  exhaustion check would silently break the same way Email's just did.
 *
 *  `chat` is the one deliberate exception, per explicit request: a website
 *  chat widget has no phone/email/handle concept anywhere in this app's
 *  data model, real or synthesized, and the visitor on the other end may
 *  not even be identified — showing a fabricated "address" for it would be
 *  actively misleading rather than just a placeholder. `"Chat {time}"`
 *  (this channel's own start time, formatted the same "h:mm AM/PM" way
 *  `TranscriptSessionSeparator`'s own session rows already do) tells the
 *  agent which chat session this tab actually is instead — chat has no
 *  `value`-based exhaustion check to satisfy either, so there's nothing
 *  this loses here. */
function synthesizeChannelAddress(
  type: ChannelType,
  seedKey: string,
  customerName: string | undefined,
  chatStartedAt: Date = new Date()
): string {
  if (type === "chat") {
    return `Chat ${chatStartedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  if (type === "email") {
    const { firstName, lastName } = splitCustomerName(customerName);
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
  }
  if (type === "whatsapp") {
    return `@${customerName ?? "Customer"}`;
  }
  // voice / sms — same synthesized-phone formula as `buildCustomerInfoFields`/
  // `OUTBOUND_CUSTOMERS` for every other channel type that isn't a plain
  // digit string on its own.
  return synthesizePhone(hashSeed(seedKey || customerName || "customer"));
}

/** "MM/DD/YYYY h:mm:ss AM/PM" — zero-padded month/day/seconds/minutes, but
 *  NOT the hour (matches the reference screenshots: "4:39:42 PM" as well as
 *  "12:58:22 PM") — deliberately hand-built rather than
 *  `Date.prototype.toLocaleString`, whose default `"en-US"` format inserts
 *  a comma before the time and never zero-pads month/day
 *  ("7/27/2026, 4:39:42 PM"). */
function formatHistoryTimestamp(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hour24 = date.getHours();
  const ampm = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  const min = String(date.getMinutes()).padStart(2, "0");
  const sec = String(date.getSeconds()).padStart(2, "0");
  return `${mm}/${dd}/${yyyy} ${hour12}:${min}:${sec} ${ampm}`;
}

/** Turns a numeric seed into a run of lowercase hex digits — just enough to
 *  fake a plausible-looking UUID (`synthesizeExternalInteractionId` below);
 *  not cryptographic, and doesn't need to be, since nothing here is a real
 *  identifier. */
function seededHex(seed: number, length: number): string {
  let s = seed || 1;
  let out = "";
  while (out.length < length) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    out += s.toString(16).padStart(8, "0");
  }
  return out.slice(0, length);
}

/** UUID-shaped (8-4-4-4-12), matching the reference screenshot's "External
 *  Interaction ID" field — not a real UUID (no version/variant bits set),
 *  just deterministic filler that reads like one. */
function synthesizeExternalInteractionId(seed: number): string {
  const hex = seededHex(seed, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** A 12-digit numeric string, matching the reference screenshot's "External
 *  Thread ID" field. */
function synthesizeExternalThreadId(seed: number): string {
  return String(100000000000 + (seed % 900000000000));
}

/** "m:ss" — a plausible call length, from ~20 seconds up to ~14 minutes.
 *  Shown on the Conversation tab's call-notes card for `channelType ===
 *  "voice"` entries. */
function synthesizeCallDuration(seed: number): string {
  const totalSeconds = 20 + (seed % 840);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

/** Whether `timestamp` falls inside the selected date-range filter value —
 *  mirrors `DateRangeFilterChip`'s own value vocabulary
 *  (`DateRangeFilterValue`) rather than inventing a parallel one. `"custom"`
 *  with no range picked yet (`customRange` undefined/`from` unset) passes
 *  everything through, same "no filter applied yet" behavior the checklist
 *  facets elsewhere have when their own value array is empty. */
function isWithinCustomerHistoryDateRange(
  timestamp: Date,
  value: DateRangeFilterValue,
  customRange?: DateRange
): boolean {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today0 = startOfDay(now);

  switch (value) {
    case "today":
      return timestamp >= today0;
    case "yesterday": {
      const y0 = new Date(today0);
      y0.setDate(y0.getDate() - 1);
      return timestamp >= y0 && timestamp < today0;
    }
    case "last7": {
      const from = new Date(today0);
      from.setDate(from.getDate() - 7);
      return timestamp >= from;
    }
    case "last30": {
      const from = new Date(today0);
      from.setDate(from.getDate() - 30);
      return timestamp >= from;
    }
    case "last90": {
      const from = new Date(today0);
      from.setDate(from.getDate() - 90);
      return timestamp >= from;
    }
    case "custom": {
      if (!customRange?.from) return true;
      const from = startOfDay(customRange.from);
      const toSource = customRange.to ?? customRange.from;
      const to = new Date(toSource.getFullYear(), toSource.getMonth(), toSource.getDate(), 23, 59, 59, 999);
      return timestamp >= from && timestamp <= to;
    }
    default:
      return true;
  }
}

/** Bare digits (US-style raw phone digits, no formatting/dial code — what
 *  `PhoneInput`'s own `PhoneValue.number` expects) parsed out of one of the
 *  Customer Information panel's own already-formatted display strings
 *  (e.g. "Phone #"'s "+1 614 749 1794"). Strips a leading "1" country-code
 *  digit when present so a 10-digit US number round-trips back into
 *  `PhoneInput` correctly instead of overflowing its mask by one digit.
 *  Falls back to an empty number (still a valid, just-blank `PhoneValue`)
 *  for a synthesized phone that doesn't parse cleanly, rather than showing
 *  something wrong. */
function phoneValueFromDisplay(display: string): PhoneValue {
  const digits = display.replace(/\D/g, "");
  const withoutCountryCode = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return { countryCode: "us", number: withoutCountryCode };
}

/** Reverse of `phoneValueFromDisplay` above — formats a `PhoneValue`'s raw
 *  digits back into this app's own "+1 XXX XXX XXXX" display style (same
 *  format `synthesizePhone` produces), so editing the Customer Overview
 *  tab's "Phone #" field via a real `PhoneInput` can round-trip back into
 *  the plain string `CustomerInfoField.value` this panel's read-only rows
 *  everywhere else expect (see `CustomerRecordDraft.overviewFields`,
 *  agent-next-gen-customer-info-panel.tsx). US-only — always prefixes
 *  "+1" rather than looking up the country's real dial code, same
 *  `countryCode` "us"-always assumption `phoneValueFromDisplay` already
 *  makes for this app's own synthesized data. Formats whatever digits
 *  exist so far (not just once all 10 are typed), grouped 3-3-4, so the
 *  field reads sensibly mid-edit too. */
function phoneDisplayFromValue(value: PhoneValue): string {
  const digits = value.number.replace(/\D/g, "");
  const groups = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean);
  return groups.length ? `+1 ${groups.join(" ")}` : "";
}

/** Which of the three top-level views `AgentNextGenPage` is currently
 *  showing — the Desk dashboard, an active interaction's record, or
 *  Settings. */
type Page = "agent-workspace" | "agent" | "agent-with-desk" | "agent-advanced" | "outbound" | "login";

export {
  initialsFor,
  generateCaseId,
  generateInteractionId,
  generateContactId,
  formatElapsedTime,
  formatWaitTime,
  AWAITING_WARNING_SECONDS,
  AWAITING_CRITICAL_SECONDS,
  getAwaitingSeverity,
  channelNoun,
  newCaseNotificationTitle,
  CURRENT_AGENT_NAME,
  CURRENT_AGENT_FIRST_NAME,
  CURRENT_AGENT_LAST_NAME,
  formatHeaderDate,
  formatHeaderGreeting,
  makeCaseId,
  formatCreateDate,
  percentOfTeam,
  withoutChannelStatus,
  nextCustomerSortDirection,
  nextInteractionSortDirection,
  quickReplyFieldDisplayValue,
  hashSeed,
  synthesizePhone,
  splitCustomerName,
  synthesizeChannelAddress,
  formatHistoryTimestamp,
  seededHex,
  synthesizeExternalInteractionId,
  synthesizeExternalThreadId,
  synthesizeCallDuration,
  isWithinCustomerHistoryDateRange,
  phoneValueFromDisplay,
  phoneDisplayFromValue,
};
export type { Page };
