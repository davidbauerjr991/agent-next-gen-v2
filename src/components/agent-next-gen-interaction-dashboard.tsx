// Left-nav "Interactions" (assignments) list + Desk dashboard (Performance/
// Productivity cards) — see agent-next-gen-shared-utils.ts and sibling
// agent-next-gen-*.ts(x) files for everything AgentNextGenPage.tsx itself no
// longer declares — split out once that file crossed Babel's 500KB
// code-generator threshold.
import { useState } from "react";
import {
  type ChannelType,
  type NavItem,
  Tooltip,
  Popover,
  RadioGroup,
  RadioGroupItem,
  ActionIconButton,
  Separator,
  type AgentNotification,
  type DateRange,
  DateRangePicker,
  Button,
  filterChipVariants,
  DashboardCard,
  Icon,
  DonutChart,
} from "@nicecxone/lyra-ui";
import { type TranscriptMessage } from "@/components/agent-next-gen-transcript";
import {
  newCaseNotificationTitle,
  channelNoun,
  makeCaseId,
  formatCreateDate,
  percentOfTeam,
} from "@/components/agent-next-gen-shared-utils";
import { cn } from "@/lib/utils";
import {
  Home,
  Settings,
  ArrowUpDown,
  ChevronsDownUp,
  ChevronsUpDown,
  type LucideIcon,
  MessageSquare,
  Mail,
  MessageCircle,
  Share2,
  PhoneIncoming,
  Voicemail,
  ClipboardList,
  PhoneOutgoing,
  CheckCircle2,
  CircleDot,
  MinusCircle,
  ChevronDown,
  MoreVertical,
  Gauge,
  Info,
  TrendingUp,
} from "lucide-react";

/* ── Left nav interactions ──
   Live InteractionNavItem cards launched from CreateNew above — see
   lyra-ui's AgentNextGenTemplate.stories.tsx for the reference
   implementation this mirrors. No cards exist until the agent actually
   starts one; starting a second channel with a contact who already has a
   card folds it into that same card *only* when it's the same channel type
   on the same address (restarting its timer) — a different address on the
   same type (e.g. a second SMS thread on a different number) opens as its
   own additional row instead of replacing the first, since it's a genuinely
   separate conversation. "Unassign & Dismiss" (any channel's kebab menu)
   removes just that channel via InteractionNavItem's `onDismissChannel`
   when others are still open, or the whole card via `onDismiss` when it was
   the last one — see `handleDismissChannel`/`handleDismissInteraction`. */

/** A channel open within one live interaction — tracks when it started
 *  (in ticks of the shared clock below) rather than a fixed elapsed string,
 *  so the rendered `InteractionChannel.elapsed` keeps counting up live. */
export interface Thread {
  /** Unique identity for this specific channel, so two channels of the same
   *  `type` (e.g. two SMS threads on different numbers) are tracked as
   *  separate rows instead of one overwriting the other — see
   *  `InteractionChannel.id`'s own doc comment in lyra-ui. Built from
   *  `type` + `value` (`"sms:+14565559981"`) so restarting the *same*
   *  address correctly reuses/refreshes the existing row (see
   *  `handleStartCall`) while a different address never collides with it.
   *  Quick-dialed/redialed channels (no CreateNew contact/address) just use
   *  their `type`, since those flows already fully replace `channels`
   *  rather than merging into it. */
  id: string;
  type: ChannelType;
  startTick: number;
  /** Routing skill label for this channel, shown as its body copy — looked
   *  up from OUTBOUND_CONFIG.skillOptions at start-call time. */
  preview?: string;
  /** The phone number/email address/WhatsApp handle this channel was
   *  started on (from `handleStartCall`'s `selection.phone`) — surfaced
   *  back into CreateNew's `openChannelAddresses` so reopening the outbound
   *  picker for this contact disables only that exact address in "Select
   *  Phone"/"Select Email Address"/"Select WhatsApp Handle", not the whole
   *  field. Undefined for quick-dialed/redialed channels, which don't go
   *  through CreateNew's contact flow. */
  value?: string;
  /** Human-readable version of `value` for display (e.g. "(456) 383-3329"
   *  vs. `value`'s raw "+14563833329") — looked up from
   *  `OUTBOUND_CONFIG.phoneOptions` at start-call time, same pattern as
   *  `preview`/`skillLabel` above. Kept separate from `value` since `value`
   *  has to stay the raw address for the `openChannelAddresses` dedup match
   *  in "Select Phone"/etc. to keep working. Shown on this channel's
   *  `ChannelToggle` (see the `activeInteraction` block below) as "SMS |
   *  (456) 383-3329" — undefined just means the toggle shows icon + type
   *  label with no address (e.g. a redialed voice call, which has no
   *  stored number at all). */
  addressLabel?: string;
  /** Whether the customer has sent a message on this channel that the agent
   *  hasn't replied to yet — drives the row's red/critical chip+clock
   *  styling (green/success otherwise). Always omitted (falsy) at
   *  start-call/quick-dial/redial time: an agent-initiated outbound channel
   *  has nothing pending from the customer the moment it opens, so it
   *  should never render red immediately just because its `type` isn't
   *  voice. There's no live customer-reply event in this demo to flip it
   *  true later — this field exists so that mechanism has somewhere to
   *  plug in without re-introducing the "every non-voice channel is
   *  permanently red" bug this replaced. */
  awaitingResponse?: boolean;
  /** Tick (same counter as `clockTick`/`startTick` below — an incrementing
   *  seconds count, not a wall-clock epoch) at which the customer's most
   *  recent message actually landed — set by `handleSendMessage`'s
   *  simulated reply, the one place in this demo that ever flips
   *  `awaitingResponse` on. Drives the "how long has this channel actually
   *  been awaiting" display (time since the customer last wrote) as
   *  distinct from `startTick`'s "time since this channel was opened" —
   *  those read the same the first time a channel opens, but diverge for
   *  any conversation that's had more than one exchange, which is exactly
   *  the case a real digital-SLA timer needs to measure correctly. Falls
   *  back to `startTick` wherever read (a channel that's never yet had a
   *  customer message has nothing better to measure from). */
  lastCustomerMessageTick?: number;
  /** Total message count for this channel's conversation, shown only on this
   *  channel's `ChannelToggle` tooltip (see the `activeInteraction` block
   *  below), never on the toggle face itself. There's no real message store in
   *  this demo, so `handleStartCall`/`handleQuickDial`/`handleRedial` just
   *  set this directly at channel-creation time: `0` for a freshly started
   *  outbound conversation on any digital channel (the tooltip reads "0
   *  Messages", which is correct — nothing's been exchanged yet), left
   *  `undefined` entirely for voice (no message concept at all, so the
   *  tooltip's message segment is omitted rather than showing "0 Messages"
   *  for a channel type that doesn't have messages). */
  messageCount?: number;
  /** This Thread's own BASE Contact's id — the first/original Contact this
   *  Thread was opened with, generated once (`generateContactId`) at
   *  Thread-creation time and never touched again afterward. A reopen does
   *  NOT overwrite this — each reopen gets its OWN distinct id on its own
   *  `reopenedContacts` entry instead (see that field's own doc comment),
   *  since a reopen is a genuinely separate Contact within the same still-
   *  ongoing Thread, not a continuation of this one. The `ChannelToggle`
   *  tooltip's own "current Contact id" reads whichever is actually most
   *  recent — the last `reopenedContacts` entry's `contactId` if this
   *  Thread has ever been reopened, this field otherwise. Set for every
   *  Thread, including quick-dialed/redialed ones — unlike `value` (a real
   *  captured address), a Contact ID doesn't depend on going through
   *  CreateNew's own contact flow, every Thread genuinely has its own
   *  instance of contact regardless of how it started. Optional only
   *  because a handful of other, non-outbound-originated flows
   *  (`handleOpenAssignmentFromNotification`'s seeded `initialInteraction`)
   *  don't build a `Thread` through any of the handlers that set this. */
  contactId?: string;
  /** REMOVED (was `interactionId?: string`) — a plain synthesized digit
   *  shown on this Thread's `ChannelToggle` tooltip as "#{interactionId}",
   *  genuinely redundant now that `Contact.contactId` exists as the real,
   *  correctly-generated per-contact id: this Thread's own currently-active
   *  Contact already has its own proper id, so the tooltip now reads THAT
   *  instead of maintaining a second, parallel id nobody else in the app
   *  ever agreed with (this field's own id and a Contact's `contactId` were
   *  two independently-generated numbers for what a reader would reasonably
   *  assume was the same thing). See the `ChannelToggle` tooltip's own
   *  render call site for where the active Contact's `contactId` is read
   *  from instead. */
  /**
   * Every time this channel is restarted at the SAME address/handle (same
   * `id`, reused via `handleStartCall`'s "same contact already has an
   * interaction open" merge branch) while its own `channelStatuses` entry
   * currently reads `"Closed"`, one entry gets appended here — per explicit
   * request, reopening a closed channel via "Add Channel" shouldn't just
   * silently resume the same conversation as if nothing happened; it should
   * read as a genuinely NEW Contact, appended below whatever's already
   * there (the old closed Contact's own messages, real mock history or
   * otherwise) rather than replacing it. `InteractionTranscript` (this
   * file, further down) turns each entry here into one more synthetic,
   * empty "Session Details" separator (a `Contact`) — the exact same shape
   * `isFreshLaunch`'s own single synthetic Contact already uses, just one
   * per reopen instead of unconditionally one total — appended AFTER
   * whichever base session list (`TRANSCRIPT_SESSIONS`/`_VOICE`/`_EMAIL`,
   * or the `isFreshLaunch` synthetic one) that channel type would otherwise
   * render. `liveMessages` for this channel's own key is deliberately left
   * UNTOUCHED at the reopen moment (per explicit correction — an earlier
   * pass wiped it here via a `withoutLiveMessages` call, which lost the
   * prior session's real message history entirely instead of preserving
   * it): whatever the agent types next still starts blank under this
   * newest entry (`sessionsToRender`'s own last id — see
   * `InteractionTranscript`'s `lastSessionId`) because `InteractionTranscript`
   * slices the flat array back into per-Contact chunks using each entry's
   * own `messagesBeforeReopen` boundary below, not because the array
   * itself was ever cleared. Kept (not reset) across multiple close→reopen
   * cycles on the same Thread, so each one gets its own distinct Contact
   * rather than the latest reopen silently overwriting a prior one. Text
   * channels (chat/sms/whatsapp) only — see `InteractionTranscript`'s own
   * `isTextChannel` gate for why voice/email don't have an equivalent
   * multi-Contact concept to extend here.
   */
  reopenedContacts?: {
    id: string;
    date: string;
    startTime: string;
    /**
     * Snapshot of `liveMessages[this thread's id]?.length` at the exact
     * moment this reopen happened — per explicit correction, reopening a
     * closed Thread must NOT wipe its prior messages; they stay visible
     * (dimmed) under their original Contact instead of vanishing. This
     * boundary is what lets `InteractionTranscript` slice the one flat
     * `liveMessages` array back into per-Contact chunks: everything before
     * this index belongs to whatever Contact came before this reopen (the
     * base Contact, or an earlier reopen), everything from this index up
     * to the NEXT reopen's own `messagesBeforeReopen` (or the array's end,
     * for the last entry) belongs to this reopen's own Contact.
     */
    messagesBeforeReopen: number;
    /** This reopen's own, distinct Contact id (`generateContactId`) — a
     *  reopen is a genuinely separate Contact within the same still-ongoing
     *  Thread, not a continuation of the base Contact (`contactId` above on
     *  `Thread`) or of whichever reopen preceded it. Fed straight into
     *  `InteractionTranscript`'s synthetic per-reopen `Contact` (in place of
     *  the old, buggy `recordId` reuse) and read by the `ChannelToggle`
     *  tooltip as the "current Contact id" whenever this Thread has ever
     *  been reopened — see `Thread.contactId`'s own doc comment above. */
    contactId: string;
  }[];
}

/** One live interaction in the left nav — an agent/customer/team/skill
 *  contact (or, for a quick-dialed number with no contact record, the
 *  number itself) plus every channel currently open with them. Keyed by
 *  contact id (or `quickdial:<number>`) so starting a second channel with
 *  the same contact adds to this interaction's `channels` instead of
 *  creating a second card. */
export interface Interaction {
  /** Left-nav slot/card key — always the underlying customer/agent/team/
   *  skill record's own id (or `quickdial:<number>`), reused across the
   *  whole relationship so a customer only ever has one active card at a
   *  time. Deliberately NOT this Interaction's own identity — see
   *  `interactionId` below for that. Kept separate on purpose: this id has
   *  to stay stable for the left nav's own dedup/lookup logic
   *  (`interactions.find(i => i.id === ...)` everywhere) regardless of how
   *  many distinct Interactions (journeys) this same customer has had. */
  id: string;
  /** This Interaction's own identity — distinct from `id` above (the left-
   *  nav slot key) AND from `customerId` below (the person/account this
   *  Interaction is with). One customer can have several Interactions over
   *  their whole relationship (a March billing dispute, a June renewal
   *  call, ...); each is its own journey with its own id and its own
   *  start/end. Generated fresh (`generateInteractionId`) only when a
   *  customer with no currently-open card gets engaged again — see
   *  `handleStartCall`/`handleRedial`/`handleQuickDial`/
   *  `handleReopenContactHistoryEntry`/`handleOpenInteractionRow`'s own
   *  `isNewInteraction` branches, all of which now generate a fresh one
   *  there and carry the EXISTING card's own `interactionId` forward
   *  otherwise (adding another Thread, or reopening a closed one, to an
   *  already-open card is still the SAME Interaction/journey, not a new
   *  one). Ends when "Unassign & Dismiss" closes this card out
   *  (`handleDismissInteraction`) — logged onto the resulting
   *  `ContactHistoryEntry.interactionId` so a dismissed Interaction stays
   *  traceable in history, not just discarded. */
  interactionId: string;
  customerName?: string;
  /** This Interaction's own customer/agent/team/skill record id — the
   *  Customer ID shown under the name on this interaction's detail page
   *  header — the contact's real id (`CreateNewOutboundContact.subtitle`,
   *  e.g. a customerId/agentId) when the interaction was started from a
   *  known record, `entry.caseId` when redialed from Contact History, or a
   *  freshly generated case number (`generateCaseId`) for quick-dialed
   *  numbers with no matching record. NOT this Interaction's own identity
   *  (see `interactionId` above) or a specific Contact's own id (see
   *  `Contact.contactId`, agent-next-gen-transcript.tsx) — this is the
   *  PERSON/ACCOUNT the whole journey is with, stable across every
   *  Interaction and every Contact/Thread within it. */
  customerId: string;
  threads: Thread[];
  /** Which open Thread is "current" — shared source of truth between this
   *  interaction's `InteractionNavItem` card (its `currentChannelKey` prop)
   *  and its `ChannelToggle` bar (each toggle's `active`), so clicking either one
   *  updates the other. A `Thread.id` (falls back to the last
   *  thread's own id when unset — see the `?? mostRecentId` reads below —
   *  same default a fresh interaction already had before this field
   *  existed). Kept in sync by `handleStartCall`/`handleQuickDial`/
   *  `handleRedial` (a new/refreshed thread always takes over as current,
   *  mirroring `InteractionNavItem`'s own auto-select-newest rule) and by
   *  `handleChannelSelect` (a row or tab click). */
  currentThreadId?: string;
  /** Set once, at the moment this interaction's card is first created via
   *  an agent-INITIATED outbound launch — the `idx === -1` branch in
   *  `handleStartCall`/`handleQuickDial`/`handleRedial` only — never
   *  touched again afterward. Deliberately NOT set by
   *  `handleOpenAssignmentFromNotification`: a notification (new case/
   *  escalation/agent chat) represents an already-existing, already-routed
   *  conversation with real prior history, not a blank-slate interaction
   *  the agent is originating — e.g. clicking Ethan Zhang's "New SMS"
   *  notification must keep showing his full mock chat body, not the
   *  empty state (this was a real bug: an earlier pass set it there too,
   *  which wrongly blanked out his conversation).
   *
   *  This app has no real backend to load prior message history from, so
   *  a genuinely agent-launched card has none yet, unlike
   *  `initialInteraction` (a page seeded to start already mid-call, which
   *  leaves this `undefined`/falsy on purpose so it keeps showing real
   *  content) or a notification-opened card (also left falsy, for the
   *  reason above). Drives `InteractionTranscript`'s empty "just the
   *  session details, no messages yet" state for a brand-new outbound SMS
   *  interaction, per explicit request. */
  startedFresh?: boolean;
  /**
   * Messages actually sent/received during this session, appended after
   * whatever `InteractionTranscript` otherwise shows (the fixed mock log, or
   * nothing yet for a `startedFresh` interaction) — the one part of this
   * interaction's transcript that's genuinely live rather than static demo
   * data. Populated by `handleSendMessage`: an agent-typed message from
   * `InteractionComposer` is pushed immediately, then a simulated customer
   * reply is pushed a couple seconds later (there's no real backend here to
   * receive an actual customer response from). Kept on `Interaction`
   * itself (not local component state) so it survives switching away to a
   * different interaction and back via the left nav, instead of resetting
   * every time `InteractionTranscript` remounts.
   *
   * Keyed by thread (`Thread.id ?? .type`, same scheme
   * `currentThreadId`/`threadStatuses` already use — see the latter's own
   * doc comment), NOT one flat array for the whole interaction — this used
   * to be a lone `TranscriptMessage[]`, which was a real, confirmed bug:
   * every message sent on ANY channel landed in that one shared array, so
   * switching to a different (or freshly opened) channel on the same card
   * showed every other channel's own conversation too — e.g. opening a
   * Voice channel right after chatting on WhatsApp showed the WhatsApp
   * messages under the Voice tab. Per-thread keys fix that: the render call
   * site resolves only the CURRENT thread's own entry
   * (`liveMessages?.[currentKey] ?? []`) before handing it to
   * `InteractionTranscript`, same as `threadStatuses` already does for
   * status.
   */
  liveMessages?: Record<string, TranscriptMessage[]>;
  /**
   * True when this interaction was reopened from a CLOSED Contact History
   * row (`handleReopenContactHistoryEntry` — see `ContactHistoryEntry.closed`'s
   * own doc comment for what counts as closed). Read-only viewing: the
   * active interaction's detail page shows an inline "You are viewing a
   * closed interaction." banner, renders no `InteractionComposer` (no
   * reply), and every open channel's kebab is hidden (`removable: false` on
   * the `InteractionChannel`s built for it) — no status-changing ("Outcome")
   * or other action available on a conversation that's already over.
   * Reopening a NON-closed row (New/Open/Pending/Escalated/Resolved) leaves
   * this `false`/unset, same as any normally-started interaction — the
   * agent can reply to it like any other open assignment.
   */
  closed?: boolean;
  /**
   * The status ("Open"/"Pending"/"Escalated"/"Resolved"/"Closed") last
   * explicitly assigned via the session-status popover
   * (`TranscriptSessionSeparator`) or the LeftNav `ChannelRow`'s own
   * Outcome button (same underlying value, see `ChannelOutcomeConfig`'s
   * `resolution`) — keyed by `Thread.id`, ONE entry per open
   * channel, not a single interaction-wide value. This used to be a lone
   * `currentStatus?: string` applying to whichever channel happened to be
   * "current" — a real, confirmed bug: closing one channel (say, a chat
   * thread) set that one shared field, which then leaked onto every OTHER
   * channel on the same card the moment the agent switched tabs to it (its
   * own separate voice/email/SMS conversation would suddenly read
   * "Closed" too, and the composer would stay hidden for it), since
   * nothing distinguished which channel a status change actually applied
   * to. Per-channel keys fix that: each channel's own entry is independent,
   * so closing one never touches any sibling channel's own status.
   *
   * Undefined for a channel until the agent actually changes its status,
   * at which point that channel's own current session's hardcoded default
   * status (`Contact.status`) still applies. A channel that's
   * restarted at the same id (e.g. redialing the same number, reusing
   * `Thread.id`) has its entry explicitly cleared first (see
   * `withoutChannelStatus`) rather than silently inheriting whatever it
   * was left at before — a reopened channel should read as freshly open,
   * not still "Closed" under its own reused id.
   *
   * Kept here, on `Interaction` itself, for the same reason
   * `liveMessages`/`closed` are — `InteractionTranscript` isn't remounted
   * per-interaction (no `key` prop at its call site), so a status held only
   * in that component's own local state wouldn't actually travel with a
   * specific interaction: switching to a different interaction and back
   * would either lose it, or (worse, since `TRANSCRIPT_SESSIONS`' session
   * ids are literally shared/static across every chat/SMS/WhatsApp
   * interaction) leak one interaction's status onto a completely different
   * one that happens to render the same session id.
   *
   * Read by `buildDismissedContactHistoryEntry` when "Unassign & Dismiss"
   * logs this interaction to Contact History (falls back to "Resolved" if
   * never explicitly set — see that function's own comment) — per explicit
   * request, the logged row should reflect whatever status was actually
   * last assigned, not always "Resolved". Written back onto a freshly
   * reopened interaction by `handleReopenContactHistoryEntry` (from
   * `entry.statusLabel`), so reopening a dismissed (or hand-authored)
   * Contact History row picks its (single, freshly-built) thread back up
   * in that same status instead of resetting to whatever hardcoded default
   * status `TRANSCRIPT_SESSIONS`/`_VOICE`/`_EMAIL` otherwise assigns it.
   */
  threadStatuses?: Record<string, string>;
}

/* ── Left nav items ──
   Built from whether an interaction is currently active (see
   `activeInteraction` below) rather than a static array, so "Home" (the
   rail item — still routes to the Desk dashboard) stops showing as active —
   and becomes clickable to navigate back — the moment an assignment takes
   over the main content area. "Settings" sits below Home as a plain rail
   item (same convention as lyra-ux-templates' and the
   lyra-ui template story's own `buildNavItems`/`NAV_ITEMS`, both of which
   already end their rail with a Settings item) rather than a standalone
   AppHeader icon — see the `actions` block below, which no longer has one.
   Settings is now a real third view (see `showSettings` state) — clicking
   it opens a blank "Settings" page in the content column and highlights
   this rail item, same on/off-exclusivity as Home vs. an active
   interaction. */

export function buildNavItems(
  hasActiveInteraction: boolean,
  onDeskClick: () => void,
  showSettings: boolean,
  onSettingsClick: () => void
): NavItem[] {
  return [
    {
      icon: <Home className="h-4 w-4" strokeWidth={1.5} />,
      label: "Home",
      active: !hasActiveInteraction && !showSettings,
      onClick: onDeskClick,
    },
    {
      icon: <Settings className="h-4 w-4" strokeWidth={1.5} />,
      label: "Settings",
      active: showSettings,
      onClick: onSettingsClick,
    },
  ];
}

/* ── Assignments sort ──
   "Last Updated" ranks each assignment by its most recently added/touched
   channel (the highest `startTick` among its open channels); "Start Date" by
   its oldest/first one (the lowest). Both are the only time signal a
   `Thread` actually carries in this prototype (see `startTick`'s own
   doc comment) — no separate "last activity" field exists to track finer-
   grained events (a new message, a status change, etc.), so "most recently
   added a channel" is the closest real proxy available for "most recently
   updated." Both orders sort newest-first (descending), the conventional
   default for either reading.

   "Longest Wait" is the third option — the actual response-urgency
   queue: ranks by the OLDEST `lastCustomerMessageTick` among each card's
   awaiting channels (the smallest tick = the longest anyone's been
   waiting), ascending, so the single longest-waiting card sorts first.
   Cards with nothing currently awaiting sort to `Infinity` — they sink to
   the very bottom regardless of how "Last Updated"/"Start Date" would have
   placed them, since this view's whole point is surfacing what needs a
   reply, not everything open. Note this ranks by the CUSTOMER's own last-
   message tick, not `clockTick` — ordering only needs to compare two fixed
   points in time against each other, not against "now", so no live clock
   value has to be threaded into this otherwise-pure sort. */
export type AssignmentSortValue = "lastUpdated" | "startDate" | "awaitingLongest";

export const ASSIGNMENT_SORT_OPTIONS: { value: AssignmentSortValue; label: string }[] = [
  { value: "lastUpdated", label: "Last Updated" },
  { value: "startDate", label: "Start Date" },
  { value: "awaitingLongest", label: "Longest Wait" },
];

export function sortAssignments(interactions: Interaction[], sort: AssignmentSortValue): Interaction[] {
  if (sort === "awaitingLongest") {
    const key = (i: Interaction) => {
      const awaitingTicks = i.threads
        .filter((c) => c.awaitingResponse)
        .map((c) => c.lastCustomerMessageTick ?? c.startTick);
      return awaitingTicks.length > 0 ? Math.min(...awaitingTicks) : Infinity;
    };
    // Ascending, not descending like the other two — the OLDEST tick (the
    // longest wait) needs to sort first here.
    return [...interactions].sort((a, b) => key(a) - key(b));
  }
  const key = (i: Interaction) => {
    const ticks = i.threads.map((c) => c.startTick);
    return sort === "startDate" ? Math.min(...ticks) : Math.max(...ticks);
  };
  return [...interactions].sort((a, b) => key(b) - key(a));
}

/* Sort trigger — same `Popover` + `RadioGroup` composition `DateFilterChip`
   already uses for an identical "single choice from a short, mutually
   exclusive list" picker (see that component's own doc comment), just an
   icon-only `ActionIconButton` trigger instead of a labeled chip (there's no
   room for chip text this deep in the rail). Closes itself on selection —
   unlike `DateFilterChip`, which stays open in case "Custom" reveals a
   second field to fill in, picking either option here is the whole
   interaction, so there's nothing left to keep the popover open for. */
export function AssignmentsSortButton({
  value,
  onValueChange,
}: {
  value: AssignmentSortValue;
  onValueChange: (value: AssignmentSortValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = ASSIGNMENT_SORT_OPTIONS.find((o) => o.value === value)?.label ?? "";

  return (
    <Tooltip content={`Sort by: ${selectedLabel}`} placement="right" disabled={open}>
      <span className="inline-flex">
        <Popover
          open={open}
          onOpenChange={setOpen}
          placement="bottom"
          // `Popover`'s own content defaults to `z-50` (popover.tsx) —
          // lower than `InteractionNavItem`'s compact-tile hover-preview
          // card (`z-[9999]`, interaction-nav-item.tsx), which sits right
          // next to this button in the collapsed rail and can overlap it.
          // Bumped above that so the sort menu isn't hidden behind an
          // assignment card's hover preview.
          className="z-[10000]"
          content={
            <div className="flex flex-col gap-1 p-3 w-[180px]">
              <RadioGroup
                value={value}
                onValueChange={(v) => {
                  onValueChange(v as AssignmentSortValue);
                  setOpen(false);
                }}
              >
                {ASSIGNMENT_SORT_OPTIONS.map((option) => (
                  <RadioGroupItem key={option.value} value={option.value} label={option.label} />
                ))}
              </RadioGroup>
            </div>
          }
        >
          {/* `aria-label`, not `title` — `ActionIconButton`/`Button` auto-
              wraps an icon button in its OWN `Tooltip` whenever `title` is
              set (button.tsx), which stacked a second, redundant "Sort by:
              ..." tooltip underneath this component's own outer one
              (confirmed via screenshot — two overlapping tooltips). Passing
              `aria-label` instead keeps the accessible name (it flows
              through Button's own `{...props}` spread, which runs after —
              and so overrides — its internal `aria-label={isIconVariant ?
              title : undefined}` line) without triggering that second
              Tooltip, since only `title` opts a button into it. */}
          <ActionIconButton size="sm" aria-label={`Sort by: ${selectedLabel}`} aria-expanded={open}>
            <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={1.5} />
          </ActionIconButton>
        </Popover>
      </span>
    </Tooltip>
  );
}

/* Collapse-all/Expand-all trigger — sits directly left of
   `AssignmentsSortButton` in the caption row, per explicit request, only
   shown alongside it (same `count > 1` gate — with zero or one assignment
   there's nothing meaningful to bulk-collapse/expand either). Same
   `ActionIconButton size="sm"` + `Tooltip`/`aria-label` (not `title`, for
   the identical double-tooltip reason `AssignmentsSortButton` documents on
   its own trigger) shape as that button, so the two read as one matched
   pair rather than two differently-styled icons side by side.

   A single toggle, not two separate buttons — `allExpanded` (owned by the
   `AgentNextGenPage` state further down, alongside the version counter
   each click bumps) tracks which action the NEXT click performs, and the
   icon swaps to match: showing `ChevronsDownUp` ("Collapse all") while
   currently all-expanded, `ChevronsUpDown` ("Expand all") once collapsed.
   This doesn't try to track each individual card's own true expanded/
   collapsed state (an agent can still toggle any one card by hand after a
   bulk action, same as before this existed) — it's just "which direction
   does the NEXT click bulk-apply," the same single-toggle idiom the
   per-card chevron itself uses. */
export function AssignmentsExpandCollapseAllButton({
  allExpanded,
  onToggle,
}: {
  allExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Tooltip content={allExpanded ? "Collapse all" : "Expand all"} placement="right">
      <ActionIconButton
        size="sm"
        aria-label={allExpanded ? "Collapse all" : "Expand all"}
        onClick={onToggle}
      >
        {allExpanded ? (
          <ChevronsDownUp className="h-3.5 w-3.5" strokeWidth={1.5} />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5" strokeWidth={1.5} />
        )}
      </ActionIconButton>
    </Tooltip>
  );
}

/* "Assignments (N active)" section caption — sits at the very top of
   LeftNav's scrollable `header` region (left-nav.tsx), directly under the
   "New Outbound" `pinnedHeader` (fixed above it, exempt from scrolling —
   see that call site's own comment for "New Outbound"'s own back-and-forth
   on where it landed before settling back here), with the list of
   InteractionNavItem cards below it — both this caption and the cards
   passed together as `header`. The Home/Settings rail renders LAST
   (LeftNav's default, non-`itemsFirst` order), sticky to the BOTTOM of the
   scroll region instead of the top, so this caption + the cards are what
   scrolls, not the rail. `count` is `interactions.length`, the exact same
   live list the cards render from, so the two numbers can't drift apart.
   Collapsed to icon-only rail (`expanded` false), the text has nowhere to
   go — but the sort button is a real standalone action, not just a label,
   so it stays reachable as a lone icon directly below Settings (the last
   `items` rail button above it) rather than disappearing along with the
   text the way the rest of this caption does.

   Sort button only shows once there's actually something to sort — with
   zero or one assignment there's only one possible order either way, so
   the control would just be a dead click. Collapsed rail: with the button
   hidden, there's nothing left in that state to show at all, so the whole
   caption returns null instead of an empty centered row.

   Used to also render a `JumpToLongestWaitingButton` alongside the sort
   button — removed per explicit follow-up: sorting by "Longest Wait"
   (`assignmentSort`'s own third option) already surfaces the same card as
   the very first one in the list, so a separate one-click jump to it was
   redundant once that sort existed. */
export function AssignmentsSectionCaption({
  expanded,
  count,
  sort,
  onSortChange,
  allExpanded,
  onToggleAllExpanded,
}: {
  expanded?: boolean;
  count: number;
  sort: AssignmentSortValue;
  onSortChange: (value: AssignmentSortValue) => void;
  /** See `AssignmentsExpandCollapseAllButton`'s own doc comment above. */
  allExpanded: boolean;
  onToggleAllExpanded: () => void;
}) {
  const showSort = count > 1;
  if (!expanded) {
    if (!showSort) return null;
    return (
      <div className="flex justify-center pb-2">
        <AssignmentsSortButton value={sort} onValueChange={onSortChange} />
      </div>
    );
  }
  return (
    // `Separator` moved below the heading row (was above it) — per
    // explicit request, it should read as "under the Assignments (N
    // active) caption," separating the heading from the card list below,
    // not separating the caption from "New Outbound" above it.
    //
    // No `gap` at all now (was `gap-0.5`/2px, before that `gap-3`/12px) —
    // per explicit follow-up request, removed entirely: the heading row's
    // own `py-2` below (8px top AND bottom, was just implicit/0) already
    // pushes the separator down 8px from the text baseline on its own, so
    // an additional gap on top of that padding was redundant.
    //
    // `pl-2` (8px) lives on the HEADING ROW itself now, not this outer
    // wrapper — per explicit follow-up correction: putting it here
    // originally also inset the `Separator` below (a block child of this
    // same wrapper, so it inherited the same left edge), shortening it
    // instead of leaving it flush edge-to-edge like every other separator
    // in this rail. The heading row is the only thing that should actually
    // shift right.
    <div className="flex flex-col pb-2">
      <div className="flex items-center justify-between gap-2 pl-2 py-2">
        <div className="flex items-baseline gap-1">
          <span className="lyra-body-md-emphasis text-lyra-fg-default">Assignments</span>
          <span className="lyra-body-md text-lyra-fg-secondary">({count} active)</span>
        </div>
        {showSort && (
          <div className="flex items-center gap-1">
            <AssignmentsExpandCollapseAllButton allExpanded={allExpanded} onToggle={onToggleAllExpanded} />
            <AssignmentsSortButton value={sort} onValueChange={onSortChange} />
          </div>
        )}
      </div>
      <Separator />
    </div>
  );
}

/* ── Sample notifications ── */

/** Which channel each "new-case"/"escalation" notification's assignment
 *  actually opens on when clicked (`handleOpenAssignmentFromNotification`)
 *  — keyed by notification id. `AgentNotification` (lyra-ui) has no
 *  channel field of its own, and this is fixed demo data anyway, so this
 *  stays a small app-local lookup rather than a new field on the shared
 *  type. Drives both a notification's own title text (`channelNoun`/
 *  `newCaseNotificationTitle` below) and the channel that actually opens on
 *  click, so the two can't drift apart the way a fixed "New Assignment"/
 *  "Escalation" title next to a hardcoded "always opens Email" click
 *  handler used to. Falls back to "email" for any id not listed here — the
 *  closest reading among the channels this prototype models for "a case
 *  landed in the queue." */
export const NOTIFICATION_CHANNEL: Record<string, ChannelType> = {
  "1": "email",
  "3": "email",
  "4": "sms",
};

export const INITIAL_NOTIFICATIONS: AgentNotification[] = [
  { id: "1", type: "new-case",       title: newCaseNotificationTitle(NOTIFICATION_CHANNEL["1"]), subtitle: "Noah Patel",   timestamp: "13m ago", read: false },
  // "new-agent-chat", not "new-chat" — a request from a colleague, not a
  // customer, so it gets its own type (distinct icon/color,
  // agent-notifications.tsx) and title, per explicit request that it read
  // as a different category from "Olivia Reed"'s customer chat below, not
  // just different label text on the same look.
  { id: "2", type: "new-agent-chat", title: "New Agent Chat",                                            subtitle: "Sarah Miller",  timestamp: "18m ago", read: false },
  // "Escalation - {channel}" — same per-channel suffix pattern as
  // "new-case"'s own title, per explicit request, rather than a bare
  // "Escalation" that doesn't say what actually landed.
  { id: "3", type: "escalation",     title: `Escalation - ${channelNoun(NOTIFICATION_CHANNEL["3"])}`,     subtitle: "Lauren Kim",    timestamp: "24m ago", read: false },
  { id: "4", type: "new-case",       title: newCaseNotificationTitle(NOTIFICATION_CHANNEL["4"]),          subtitle: "Ethan Zhang",   timestamp: "37m ago", read: true  },
  { id: "5", type: "new-chat",       title: "New Chat",                                                   subtitle: "Olivia Reed",   timestamp: "51m ago", read: true  },
  { id: "6", type: "missed-call",    title: "Missed Call",                                                 subtitle: "David Brown",   timestamp: "1h ago",  read: true  },
];

/* ── Sample latest contacts ── */

export interface ContactInteraction {
  id: string;
  caseId: string;
  priority: number;
  type: "email" | "chat" | "voice";
  direction: "inbound" | "outbound";
  createDate: string;
  status: "open" | "closed";
  channel: string;
  resolutionTime: string;
  skill: string;
  owner: string;
}

export interface LatestContact {
  id: string;
  name: string;
  status: "open" | "closed";
  /** Rendered left of the name in the accordion trigger row — matches the queue's channel type (chat/voice/voicemail/task). */
  icon: LucideIcon;
  /** Drives both the body copy ("{N} contacts in queue") and the "Contacts" metric at the end of the row, so the two numbers can't drift apart. */
  contactsCount: number;
  /** Drives the "Skills" metric at the end of the row. */
  skillsCount: number;
  /** "Agents" metric on the home tab's queue widget — a static per-queue headcount (not derived from `QueueSubItem`, which has no single "assigned agents" total of its own to stay in sync with). */
  agentsCount: number;
  channel: string;
  wait: string;
  caseId: string;
  interactions: ContactInteraction[];
}

/* Sample interaction-history rows, cycled per contact so each accordion's
   interior table has a few realistic-looking prior interactions. Each source
   pairs a Type icon (email/chat/voice) with a real-looking channel + skill label. */
export const INTERACTION_CHANNELS: { type: ContactInteraction["type"]; channel: string; skill: string }[] = [
  { type: "chat",  channel: "mojo_finance_async", skill: "" },
  { type: "email", channel: "CXi SME Email",      skill: "Chat_General" },
  { type: "chat",  channel: "Chat_General",       skill: "Chat_General" },
  { type: "chat",  channel: "Rebooking_Chat",     skill: "Rebooking" },
  { type: "voice", channel: "Voice_General",      skill: "" },
  { type: "email", channel: "Email_Support",      skill: "Billing_Support" },
  { type: "chat",  channel: "SMS_General",        skill: "Technical_Support" },
];

export const RESOLUTION_TIMES = ["0 sec", "12 sec", "45 sec", "1 min", "2 min", "3 min", "5 min", "8 min"];

/* Welcome modal — last login timestamp shown under the greeting. The
   assigned-skills/online-teammate counts that used to accompany it
   (`AGENT_SKILLS_COUNT`/`TEAMMATES_ONLINE_COUNT`/`TEAMMATES_AVAILABLE_COUNT`)
   are commented out below, not deleted — the info-box that displayed them
   is hidden for now (per explicit request; see the `AgentWelcomeMessage`
   call site), so keeping unused consts around would just be dead-code
   lint noise until it comes back. */
export const WELCOME_MODAL_LAST_LOGIN = "Today at 8:42 AM";
// const AGENT_SKILLS_COUNT = 3;
// const TEAMMATES_ONLINE_COUNT = 8;
// const TEAMMATES_AVAILABLE_COUNT = 5;

export const INTERACTION_OWNERS = [
  "John Smith",
  "Kevin Jensen",
  "Andres Arenas",
  "Priya Anand",
  "Erwin de Vera",
  "Tim O'Connor",
  "Josh Robertson",
];

/* contactStatus drives every interaction's status: a closed case has every
   interaction closed; an open case has exactly one (its most recent, i === 0)
   still-open interaction — which also has no resolution time yet — while the
   rest of its history is closed. */
export function buildInteractions(seed: number, contactStatus: "open" | "closed", count: number): ContactInteraction[] {
  return Array.from({ length: count }, (_, i) => {
    const source = INTERACTION_CHANNELS[(seed + i) % INTERACTION_CHANNELS.length];
    const isStillOpen = contactStatus === "open" && i === 0;
    return {
      id: `${seed}-${i}`,
      caseId: makeCaseId(seed, i),
      priority: 0,
      type: source.type,
      direction: i % 2 === 0 ? "inbound" : "outbound",
      createDate: formatCreateDate(seed, i),
      status: isStillOpen ? "open" : "closed",
      channel: source.channel,
      resolutionTime: isStillOpen ? "—" : RESOLUTION_TIMES[(seed * 3 + i * 5) % RESOLUTION_TIMES.length],
      skill: source.skill,
      owner: INTERACTION_OWNERS[(seed * 5 + i * 3) % INTERACTION_OWNERS.length],
    };
  });
}

/* ── Queue widget side panel (drill-down) ──
   Clicking one of the four home-tab queue widgets opens the interior panel
   with this queue's own skills — e.g. "Digital" breaks down into its own
   channels (UX Chat, UX Email, UX SMS, Social Support). Each row shows an
   icon matching its own label (not a single icon reused across every row),
   how many contacts are waiting, the longest wait time, and — per explicit
   confirmation — the same Available/Working/Unavailable agent breakdown
   the Activity/Productivity cards already use: same icons
   (CheckCircle2/CircleDot/MinusCircle), same success/warning/critical
   colors, same left-to-right order, just rendered as compact circular
   `Icon` badges here instead of a donut or bar.

   `INITIAL_QUEUE_SUB_ITEMS` is only the *seed* — the component below holds
   the live copy in `queueSubItems` state (see "Live queue simulation" near
   the component's other state) so the home tab's Contacts metric can
   visibly fluctuate over time while staying derived from this same list
   (see `sumInQueue` below), not an independently-randomized number.

   Defined before the queue-widget row (rather than after, as it originally
   was) so each queue widget's `skillsCount` can be derived from this
   list's own length — see the comment on `LATEST_CONTACTS_STATIC` below. */
export interface QueueSubItem {
  id: string;
  label: string;
  icon: LucideIcon;
  inQueueCount: number;
  wait: string;
  available: number;
  working: number;
  unavailable: number;
}

export const INITIAL_QUEUE_SUB_ITEMS: Record<string, QueueSubItem[]> = {
  "1": [
    { id: "d1", label: "UX Chat",         icon: MessageSquare, inQueueCount: 2, wait: "3m 5s", available: 3, working: 1, unavailable: 0 },
    { id: "d2", label: "UX Email",        icon: Mail,          inQueueCount: 2, wait: "3m 5s", available: 3, working: 1, unavailable: 0 },
    { id: "d3", label: "UX SMS",          icon: MessageCircle, inQueueCount: 2, wait: "3m 5s", available: 3, working: 1, unavailable: 0 },
    { id: "d4", label: "Social Support",  icon: Share2,        inQueueCount: 2, wait: "3m 5s", available: 3, working: 1, unavailable: 0 },
  ],
  "2": [
    { id: "v1", label: "AKR_Phone_IB",              icon: PhoneIncoming, inQueueCount: 0, wait: "0s", available: 0, working: 0, unavailable: 1 },
    { id: "v2", label: "AKR_Phone_IB_Sales",        icon: PhoneIncoming, inQueueCount: 0, wait: "0s", available: 0, working: 0, unavailable: 1 },
    { id: "v3", label: "Auto Attendant",            icon: PhoneIncoming, inQueueCount: 0, wait: "0s", available: 0, working: 0, unavailable: 1 },
    { id: "v4", label: "Auto Inbound",               icon: PhoneIncoming, inQueueCount: 0, wait: "0s", available: 0, working: 0, unavailable: 1 },
    { id: "v5", label: "KJ_Inbound_Phone",          icon: PhoneIncoming, inQueueCount: 0, wait: "0s", available: 1, working: 0, unavailable: 1 },
    { id: "v6", label: "mojo_finance_voice_support", icon: PhoneIncoming, inQueueCount: 0, wait: "0s", available: 0, working: 0, unavailable: 1 },
  ],
  "3": [
    { id: "vm1", label: "UX Voicemail",  icon: Voicemail, inQueueCount: 3, wait: "15m", available: 1, working: 0, unavailable: 1 },
    { id: "vm2", label: "After-Hours VM", icon: Voicemail, inQueueCount: 0, wait: "0s",  available: 0, working: 0, unavailable: 0 },
  ],
  "4": [
    { id: "w1", label: "Case Management", icon: ClipboardList, inQueueCount: 4, wait: "30m", available: 2, working: 3, unavailable: 0 },
    { id: "w2", label: "Escalations",     icon: ClipboardList, inQueueCount: 1, wait: "10m", available: 1, working: 1, unavailable: 0 },
    { id: "w3", label: "Billing Review",  icon: ClipboardList, inQueueCount: 0, wait: "0s",  available: 1, working: 0, unavailable: 0 },
  ],
  "5": [
    { id: "ov1", label: "Outbound_Sales_Voice",       icon: PhoneOutgoing, inQueueCount: 1, wait: "0s", available: 2, working: 1, unavailable: 0 },
    { id: "ov2", label: "Outbound_Renewals",          icon: PhoneOutgoing, inQueueCount: 0, wait: "0s", available: 1, working: 0, unavailable: 0 },
    { id: "ov3", label: "Outbound_Win_Back_Campaign", icon: PhoneOutgoing, inQueueCount: 1, wait: "0s", available: 1, working: 1, unavailable: 1 },
  ],
};

/* Contact-in-queue counts for each queue widget — NOT independently
   randomized (that was the bug: an earlier version generated these with
   `randomContactsCount()`, a plausible-looking number with no connection to
   the actual queue data, so the metric card's "Contacts" count and the side
   panel's own "In Queue" figures for the same queue could — and did —
   disagree, e.g. "2 Contacts" on a queue whose sub-items summed to 5).
   Fixed the same way `skillsCount` already worked, and still true now that
   the source list is React state instead of a module constant: derived
   directly from a `QueueSubItem[]`, the same list the side panel renders,
   so the two can never drift apart — including while the live simulation
   below is nudging that list's counts up and down. */
export function sumInQueue(items: QueueSubItem[]): number {
  return items.reduce((total, item) => total + item.inQueueCount, 0);
}

/** Static per-queue "Agents" metric for the home tab's queue widgets — a
 *  headcount `QueueSubItem` has no single equivalent of (its own
 *  available/working/unavailable are per-channel, not a queue-wide total),
 *  so unlike `contactsCount`/`skillsCount` this one has no underlying list
 *  to derive from and is just seeded to match the reference screenshot. */
export const AGENTS_COUNT_BY_QUEUE: Record<string, number> = { "1": 3, "2": 2, "3": 3, "4": 11, "5": 4 };

/** Baseline queue-wait seconds (matches the reference screenshot's
 *  00:02:34 / 00:00:00 / 00:02:00 / 00:00:24) — the component below adds
 *  the shared `clockTick` counter to these every render so the home tab's
 *  "Wait Time" ticks up in real time like a live clock, the same
 *  convention `formatElapsedTime`'s callers already use for interaction
 *  elapsed-time displays. */
export const QUEUE_WAIT_BASE_SECONDS: Record<string, number> = { "1": 154, "2": 0, "3": 120, "4": 24, "5": 0 };

/* Everything about each queue widget that never changes on its own — kept
   separate from the derived/ticking fields (`contactsCount`, `skillsCount`,
   `agentsCount`, `wait`) so those can be recomputed each render (see the
   `latestContacts` useMemo inside the component) without re-running
   `buildInteractions` every tick. */
export const LATEST_CONTACTS_STATIC: Omit<LatestContact, "contactsCount" | "skillsCount" | "agentsCount" | "wait">[] = [
  { id: "1", name: "Digital",       icon: MessageSquare, status: "open",   channel: "Atlas", caseId: "CST-21009", interactions: buildInteractions(1, "open", 3) },
  { id: "2", name: "Inbound Voice", icon: PhoneIncoming, status: "open",   channel: "Atlas", caseId: "CST-21016", interactions: buildInteractions(2, "open", 5) },
  { id: "3", name: "Voicemail",     icon: Voicemail,     status: "closed", channel: "Atlas", caseId: "CST-21028", interactions: buildInteractions(3, "closed", 1) },
  { id: "4", name: "Work Item",     icon: ClipboardList, status: "open",   channel: "Emily", caseId: "CST-15001", interactions: buildInteractions(4, "open", 7) },
  { id: "5", name: "Outbound Voice", icon: PhoneOutgoing, status: "open",  channel: "Atlas", caseId: "CST-21042", interactions: buildInteractions(5, "open", 2) },
];

/* ── Home screen summary cards ── */

export type DateFilterValue = "today" | "yesterday" | "last7" | "custom";

// Desk-tab keys/labels — shared by `activeDeskTab`/`deskTabOrder` state and
// the reorderable tab row that renders them (see `deskTabOrder`'s own doc
// comment further down). Centralized here so the row can be built with a
// `.map()` (each `Tab` needs a stable `key` for `TabList`'s `reorderable`
// drag-and-drop to work) instead of five hand-written near-duplicate `<Tab>`
// elements.
export type DeskTabKey = "home" | "customers" | "accounts" | "tickets" | "wem" | "interactions";
export const DESK_TAB_LABELS: Record<DeskTabKey, string> = {
  home: "Dashboard",
  customers: "Customers",
  accounts: "Accounts",
  tickets: "Tickets",
  wem: "WEM",
  interactions: "Interactions",
};

/* Dummy Performance data per date range — drives the Performance summary
   card's rows/footer so the numbers actually change when a range is picked.
   `overallPerformance` is a percentage (replaces the old "CSAT Score"
   0-5 rating), stored pre-formatted with the "%" like every other range
   here does with its own unit. */
export const PERFORMANCE_DATA_BY_RANGE: Record<
  DateFilterValue,
  { casesResolved: string; overallPerformance: string; handleTime: string; improvement: string }
> = {
  today:     { casesResolved: "12",  overallPerformance: "96%", handleTime: "8m 32s", improvement: "15% improvement" },
  yesterday: { casesResolved: "19",  overallPerformance: "92%", handleTime: "9m 05s", improvement: "8% improvement" },
  last7:     { casesResolved: "104", overallPerformance: "94%", handleTime: "8m 50s", improvement: "11% improvement" },
  custom:    { casesResolved: "—",   overallPerformance: "—",   handleTime: "—",      improvement: "Select a range" },
};

/* Channel Type breakdown (Performance card) — Inbound/Outbound call counts,
   "you" vs. "team", per date range. Same static-meta + per-range-values
   split as `PRODUCTIVITY_STATUS_META`/`PRODUCTIVITY_DATA_BY_RANGE` below,
   and rendered with that same row shape (icon+label+value, indented "Team"
   comparison line beneath) rather than a literal `Table` — a plain stacked
   list reads fine for 2-3 rows and keeps this card visually consistent
   with the Productivity card right next to it. */

export type ChannelTypeId = "inbound" | "outbound";

export interface ChannelTypeMeta {
  id: ChannelTypeId;
  label: string;
  icon: LucideIcon;
}

export const CHANNEL_TYPE_META: ChannelTypeMeta[] = [
  { id: "inbound",  label: "Inbound",  icon: PhoneIncoming },
  { id: "outbound", label: "Outbound", icon: PhoneOutgoing },
];

export interface ChannelTypeValue {
  you: number;
  team: number;
}

export const CHANNEL_TYPE_DATA_BY_RANGE: Record<DateFilterValue, Record<ChannelTypeId, ChannelTypeValue>> = {
  // Matches the reference screenshot's all-zero state — no calls logged yet today.
  today: {
    inbound:  { you: 0, team: 0 },
    outbound: { you: 0, team: 0 },
  },
  yesterday: {
    inbound:  { you: 14, team: 162 },
    outbound: { you: 9,  team: 98  },
  },
  last7: {
    inbound:  { you: 88, team: 1024 },
    outbound: { you: 52, team: 640  },
  },
  custom: {
    inbound:  { you: 0, team: 0 },
    outbound: { you: 0, team: 0 },
  },
};

/* ── Productivity breakdown card (agent state duration bars + date filter chip) ──
   Replaces the third summary card slot — same Container/header styling as the
   Schedule/Performance stat cards (no Table), with a FilterChip (search + Select
   All + checkbox options) for the date filter in the header. Each agent state
   (Available/Working/Unavailable) shows the agent's own duration bar + time,
   plus a lighter "Team" comparison bar + time beneath it. Static id/label/icon
   metadata is kept separate from the per-range numeric values so the date
   filter can swap the values without touching the row definitions. */

export type ProductivityStatusId = "available" | "working" | "unavailable";

export interface ProductivityStatusMeta {
  id: ProductivityStatusId;
  label: string;
  icon: LucideIcon;
  iconColorClassName: string;
}

export const PRODUCTIVITY_STATUS_META: ProductivityStatusMeta[] = [
  { id: "available",   label: "Available",   icon: CheckCircle2, iconColorClassName: "text-lyra-status-success-strong" },
  { id: "working",     label: "Working",     icon: CircleDot,    iconColorClassName: "text-lyra-status-warning-strong" },
  { id: "unavailable", label: "Unavailable", icon: MinusCircle,  iconColorClassName: "text-lyra-status-critical-strong" },
];

/* Sub-state breakdown shown in the info tooltip on the Productivity card's
   Unavailable row — which specific unavailable codes made up that time. */
export const UNAVAILABLE_STATE_BREAKDOWN: { label: string; percent: number }[] = [
  { label: "Bio Break", percent: 100 },
  { label: "Break",     percent: 0 },
  { label: "Meeting",   percent: 0 },
  { label: "Team",      percent: 100 },
];

export interface ProductivityStatusValue {
  percent: number;
  teamPercent: number;
  time: string;
  teamTime: string;
}

export const PRODUCTIVITY_DATA_BY_RANGE: Record<DateFilterValue, Record<ProductivityStatusId, ProductivityStatusValue>> = {
  today: {
    available:   { percent: 22, teamPercent: 28, time: "01:45:12", teamTime: "02:14:40" },
    working:     { percent: 61, teamPercent: 55, time: "04:53:08", teamTime: "04:24:00" },
    unavailable: { percent: 17, teamPercent: 17, time: "01:21:40", teamTime: "01:21:20" },
  },
  yesterday: {
    available:   { percent: 18, teamPercent: 24, time: "01:26:24", teamTime: "01:55:12" },
    working:     { percent: 67, teamPercent: 58, time: "05:21:36", teamTime: "04:38:24" },
    unavailable: { percent: 15, teamPercent: 18, time: "01:12:00", teamTime: "01:26:24" },
  },
  last7: {
    available:   { percent: 24, teamPercent: 27, time: "13:26:00", teamTime: "15:07:20" },
    working:     { percent: 58, teamPercent: 54, time: "32:26:24", teamTime: "30:14:24" },
    unavailable: { percent: 18, teamPercent: 19, time: "10:04:48", teamTime: "10:38:16" },
  },
  custom: {
    available:   { percent: 0, teamPercent: 0, time: "00:00:00", teamTime: "00:00:00" },
    working:     { percent: 0, teamPercent: 0, time: "00:00:00", teamTime: "00:00:00" },
    unavailable: { percent: 0, teamPercent: 0, time: "00:00:00", teamTime: "00:00:00" },
  },
};

export const DATE_FILTER_OPTIONS: { value: DateFilterValue; label: string }[] = [
  { value: "today",     label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7",     label: "Last 7 days" },
  { value: "custom",    label: "Custom" },
];

/* Single-select date filter chip — same trigger styling as FilterChip's
   "default" (neutral) variant, via the exported filterChipVariants, so it
   matches the same gray chip look FilterChip itself uses whenever nothing
   is actively narrowing/differing from the norm — including DashboardCard's
   own header FilterChip in its unselected state. This picker always has
   *some* range selected ("Today" by default), but that's just its resting
   state, not a filter being "applied" the way FilterChip's blue "active"
   variant signals — so it shouldn't render permanently blue the way
   `variant: "active"` did before. Uses a RadioGroup (not checkboxes) in the
   popover since only one range can be selected at a time. Selecting
   "Custom" reveals a DateRangePicker beneath the radio list. */
export function DateFilterChip({ onValueChange }: { onValueChange?: (value: DateFilterValue) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<DateFilterValue>("today");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);

  const selectedLabel = DATE_FILTER_OPTIONS.find((o) => o.value === value)?.label ?? "";

  const handleValueChange = (v: DateFilterValue) => {
    setValue(v);
    onValueChange?.(v);
  };

  return (
    // Tooltip wraps the Popover from the OUTSIDE (not the other way around)
    // — CONTRIBUTING.md §16 "Portals still bubble through the React tree":
    // wiring it any other way risks the tooltip re-triggering off hover
    // inside the popover's own portaled content. `disabled` while `open` is
    // true keeps the tooltip from competing with the already-open popover
    // for the same corner of the screen. Mainly earns its keep once the
    // chip has collapsed to the icon-only kebab below 480px (see
    // lyra-tokens.css's "Filter chip icon collapse" family) — there's no
    // visible "Date: Today" label left at that point for a sighted user to
    // read at a glance, and no accessible name for anyone else without this
    // (the `aria-label` below covers screen readers either way, but the
    // visible tooltip matters for sighted mouse users too).
    <Tooltip content={`Date filter: ${selectedLabel}`} placement="bottom" disabled={open}>
      <span className="inline-flex">
        <Popover
          open={open}
          onOpenChange={setOpen}
          placement="bottom"
          content={
            <div className="flex flex-col gap-3 p-3 w-[260px]">
              <RadioGroup value={value} onValueChange={(v) => handleValueChange(v as DateFilterValue)}>
                {DATE_FILTER_OPTIONS.map((option) => (
                  <RadioGroupItem key={option.value} value={option.value} label={option.label} />
                ))}
              </RadioGroup>
              {value === "custom" && (
                <DateRangePicker
                  value={customRange}
                  onChange={setCustomRange}
                  placeholder="Select date range"
                />
              )}
            </div>
          }
        >
          <Button
            variant="ghost"
            aria-label={open ? "Close date filter" : `Date filter: ${selectedLabel}`}
            className={cn(filterChipVariants({ variant: "default" }), "rounded-lyra-md lyra-container-header-filter-trigger")}
          >
            {/* Full label — hidden below 480px of the header's own width (see
                lyra-tokens.css's "Filter chip icon collapse" family) in favor
                of the compact kebab icon below, both wired to this same
                Popover trigger/open state. */}
            <span className="lyra-container-header-filter-full inline-flex items-baseline gap-1">
              <span className="lyra-body-md-emphasis whitespace-nowrap">Date:</span>
              <span className="lyra-body-md truncate">{selectedLabel}</span>
            </span>
            <ChevronDown className={cn("lyra-container-header-filter-full h-3.5 w-3.5 flex-shrink-0 transition-transform", open && "rotate-180")} strokeWidth={1.5} aria-hidden="true" />
            <MoreVertical className="lyra-container-header-filter-compact h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </Button>
        </Popover>
      </span>
    </Tooltip>
  );
}

/* ── Activity card (donut chart) ──
   Replaces the old Schedule summary card. Reuses the same Available/Working/
   Unavailable status metadata and values as the ring chart at the bottom of
   the Productivity card below (see `ACTIVITY_STATUS_COLORS`), so the two
   stay visually consistent — same colors, same percentages. */
export const ACTIVITY_STATUS_COLORS: Record<ProductivityStatusId, { dotClassName: string; colorVar: string }> = {
  available:   { dotClassName: "bg-lyra-status-success-strong",  colorVar: "var(--lyra-color-status-success-strong)" },
  working:     { dotClassName: "bg-lyra-status-warning-strong",  colorVar: "var(--lyra-color-status-warning-strong)" },
  unavailable: { dotClassName: "bg-lyra-status-critical-strong", colorVar: "var(--lyra-color-status-critical-strong)" },
};

/* Productivity breakdown card — agent state duration bars (Available/
   Working/Unavailable, each with a "Team" comparison line beneath) plus,
   below all three rows, the same ring-chart + legend that used to be its
   own standalone "Activity" card. Folded into this card (rather than kept
   separate) on request — the ring visualizes the exact same
   Available/Working/Unavailable percentages already listed above it, so it
   reads as one more view of this card's own data instead of a second card
   repeating it. Both the rows and the ring now share the one live
   `dateFilter`/`values` this card already owns — the ring is no longer
   pinned to "today" the way the standalone Activity card was. */
export function PerformanceBreakdownCard() {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("today");
  const values = PRODUCTIVITY_DATA_BY_RANGE[dateFilter];
  const ringData = PRODUCTIVITY_STATUS_META.map((meta) => ({
    id: meta.id,
    label: meta.label,
    percent: values[meta.id].percent,
    ...ACTIVITY_STATUS_COLORS[meta.id],
  }));

  return (
    <DashboardCard
      variant="neutral-subtle"
      headerTitle="Productivity"
      headerIcon={<Icon icon={Gauge} size="md" background="info" shape="rounded" decorative />}
      headerActions={<DateFilterChip onValueChange={setDateFilter} />}
      // No `SearchInput` here to wrap — `actionsWrap` is only turned on so
      // its container-query boundary exists for `DateFilterChip`'s own
      // icon-collapse (see lyra-tokens.css's "Filter chip icon collapse"
      // family, which reuses this same ancestor). The row-wrap half of
      // `actionsWrap` is a no-op with a single action child either way.
      headerActionsWrap
    >
      <div className="flex flex-col gap-4 px-4 pb-4">
        {PRODUCTIVITY_STATUS_META.map((meta) => {
          const row = values[meta.id];
          return (
            <div key={meta.id} className="flex flex-col gap-1.5">
              {/* Self row */}
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 lyra-body-md-emphasis text-lyra-fg-default">
                  <meta.icon className={cn("h-4 w-4", meta.iconColorClassName)} strokeWidth={1.5} />
                  {meta.label}
                  <span className="lyra-body-sm text-lyra-fg-secondary font-normal">({row.percent}%)</span>
                  {meta.id === "unavailable" && (
                    <Tooltip
                      placement="right"
                      content={
                        <div className="flex flex-col gap-1">
                          {UNAVAILABLE_STATE_BREAKDOWN.map((state) => (
                            <span key={state.label} className="lyra-body-sm text-lyra-fg-default whitespace-nowrap">
                              {state.label} ({state.percent}%)
                            </span>
                          ))}
                        </div>
                      }
                    >
                      <span className="inline-flex items-center text-lyra-fg-secondary hover:text-lyra-fg-action transition-colors cursor-default">
                        <Info className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                        <span className="sr-only">
                          Unavailable breakdown: {UNAVAILABLE_STATE_BREAKDOWN.map((s) => `${s.label} (${s.percent}%)`).join(", ")}
                        </span>
                      </span>
                    </Tooltip>
                  )}
                </span>
                <span className="lyra-body-md-emphasis tabular-nums text-lyra-fg-default">{row.time}</span>
              </div>
              {/* Team comparison row */}
              <div className="flex items-center justify-between gap-3 pl-6">
                <span className="lyra-body-sm text-lyra-fg-secondary">Team ({row.teamPercent}%)</span>
                <span className="lyra-body-sm tabular-nums text-lyra-fg-secondary">{row.teamTime}</span>
              </div>
            </div>
          );
        })}

        <Separator />

        {/* Ring chart + legend — same Available/Working/Unavailable data as
            the rows above, just visualized as a ring instead of stacked bars. */}
        <div className="flex items-center gap-6">
          <div className="h-[120px] w-[120px] shrink-0">
            <DonutChart
              data={ringData.map((d) => ({ label: d.label, value: d.percent, colorVar: d.colorVar }))}
            />
          </div>
          <div className="flex flex-1 flex-col gap-2.5">
            {ringData.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 lyra-body-md text-lyra-fg-secondary">
                  <span className={cn("h-2.5 w-2.5 rounded-full", d.dotClassName)} aria-hidden="true" />
                  {d.label}
                </span>
                <span className="lyra-heading-sm text-lyra-fg-default">{d.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

/* Performance summary card — mirrors PerformanceBreakdownCard's pattern:
   owns its own date filter state and looks up dummy data per range so the
   Assignments Resolved / Overall Performance numbers — and the Channel Type
   breakdown below them — change when a range is picked. */
export function PerformanceSummaryCard() {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("today");
  const data = PERFORMANCE_DATA_BY_RANGE[dateFilter];
  const channelData = CHANNEL_TYPE_DATA_BY_RANGE[dateFilter];
  const overallYou = CHANNEL_TYPE_META.reduce((sum, meta) => sum + channelData[meta.id].you, 0);
  const overallTeam = CHANNEL_TYPE_META.reduce((sum, meta) => sum + channelData[meta.id].team, 0);

  return (
    <DashboardCard
      variant="neutral-subtle"
      headerTitle="Performance"
      headerIcon={<Icon icon={TrendingUp} size="md" background="success" shape="rounded" decorative />}
      headerActions={<DateFilterChip onValueChange={setDateFilter} />}
      // See PerformanceBreakdownCard's identical `headerActionsWrap` comment.
      headerActionsWrap
    >
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="flex items-center justify-between">
          <span className="lyra-body-md text-lyra-fg-secondary">Assignments Resolved</span>
          <span className="lyra-heading-sm text-lyra-fg-default">{data.casesResolved}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="lyra-body-md text-lyra-fg-secondary">Overall Performance</span>
          <span className="lyra-heading-sm text-lyra-status-success-strong">{data.overallPerformance}</span>
        </div>
        <Separator />

        {/* Channel Type breakdown — same row shape as PerformanceBreakdownCard's
            Productivity rows (icon+label+value, indented "Team" comparison line
            beneath) rather than a Table, so this section reads consistently with
            the card right next to it. */}
        <span className="lyra-body-sm-emphasis text-lyra-fg-secondary">Channel Type</span>
        <div className="flex flex-col gap-4">
          {CHANNEL_TYPE_META.map((meta) => {
            const row = channelData[meta.id];
            const pct = percentOfTeam(row.you, row.team);
            return (
              <div key={meta.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 lyra-body-md-emphasis text-lyra-fg-default">
                    <meta.icon className="h-4 w-4 text-lyra-fg-secondary" strokeWidth={1.5} />
                    {meta.label}
                  </span>
                  <span className="lyra-body-md-emphasis tabular-nums text-lyra-fg-default">{row.you}</span>
                </div>
                <div className="flex items-center justify-between gap-3 pl-6">
                  <span className="lyra-body-sm text-lyra-fg-secondary">Team ({pct}% of Team)</span>
                  <span className="lyra-body-sm tabular-nums text-lyra-fg-secondary">{row.team}</span>
                </div>
              </div>
            );
          })}

          <Separator />

          {/* Overall — the summed total, same row shape but with no icon and no indent on its own Team line (it's a total, not a per-channel comparison). */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="lyra-body-md-emphasis text-lyra-fg-default">Overall</span>
              <span className="lyra-body-md-emphasis tabular-nums text-lyra-fg-default">{overallYou}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="lyra-body-sm text-lyra-fg-secondary">Team ({percentOfTeam(overallYou, overallTeam)}% of Team)</span>
              <span className="lyra-body-sm tabular-nums text-lyra-fg-secondary">{overallTeam}</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
