import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { cn } from "@/lib/utils";
import {
  AppHeader,
  AppName,
  AppMenu,
  CXoneLogo,
  Modal,
  useAgentNotificationsContent,
  Draggable,
  ContainerHeader,
  NotificationsBell,
  AgentProfile,
  Container,
  InteriorPanel,
  SidePanel,
  PanelFooter,
  AIInput,
  PageHeader,
  Button,
  Textarea,
  Label,
  InlineNotification,
  Accordion,
  ActionIconButton,
  KebabMenuButton,
  PanelPinButton,
  useColumnReorder,
  Tag,
  TagPicker,
  Input,
  LeftNav,
  CreateNew,
  useOutboundAddButton,
  InteractionNavItem,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
  TableToolbar,
  ColumnToggle,
  SortableTableHead,
  Icon,
  Badge,
  SearchInput,
  Separator,
  DonutChart,
  DashboardCard,
  DashboardQueue,
  AgentWelcomeMessage,
  TabList,
  Tab,
  ChannelTab,
  // Aliased — this file already declares its own local `CHANNEL_TYPE_META`
  // (an unrelated inbound/outbound contact-history breakdown, see below)
  // and this import would otherwise collide with it.
  CHANNEL_TYPE_META as CHANNEL_ICON_META,
  Popover,
  Menu,
  WarningIconSolid,
  PanelHeader,
  RadioGroup,
  RadioGroupItem,
  RadioButtonGroup,
  DateRangePicker,
  filterChipVariants,
  Toast,
  ToastContainer,
  useToast,
  Select,
  Checkbox,
  DatePicker,
  EmailInput,
  PhoneInput,
  type PhoneValue,
  Tooltip,
  DateRangeFilterChip,
  type DateRangeFilterValue,
  type SelectOption,
  type NavItem,
  type SortDirection,
  type FilterChipOption,
  type DateRange,
  type TagVariant,
  type CreateNewOutboundConfig,
  type CreateNewOutboundContact,
  type InteractionChannel,
  type ChannelType,
  type ChannelOutcomeConfig,
  type TagPickerOption,
  type AgentStatus,
  type AppMenuGroup,
  type AgentNotification,
  type DraggableVariant,
  type EmbeddablePanelContent,
  type MenuEntry,
  QuickReplyMenu,
  type QuickReplyMenuItem,
  QuickReplyVariableForm,
  type QuickReplyField,
} from "@nicecxone/lyra-ui";
import { CREATE_NEW_AGENTS } from "@nicecxone/lyra-ui/agents-data";
import { CREATE_NEW_CUSTOMERS, type CreateNewCustomerRecord } from "@nicecxone/lyra-ui/customers-data";
import { useScheduleContent } from "@/components/SchedulePanel";
// PROTOTYPE — local-only, not in lyra-ui yet. See CollapsedChannelBadge's
// own doc comment for why, and CLAUDE.md's lyra-ui rules for the convention
// this follows (build new things locally, promote to lyra-ui only once
// explicitly asked).
import { CollapsedChannelBadge } from "@/components/CollapsedChannelBadge";
import appIcon from "@/assets/app-icon.svg";
import {
  Home,
  Settings,
  Phone,
  PhoneOutgoing,
  PhoneIncoming,
  Voicemail,
  ClipboardList,
  Mail,
  MessageSquare,
  MessageCircle,
  Share2,
  Clock,
  ArrowDown,
  ArrowUp,
  TrendingUp,
  CheckCircle2,
  CircleDot,
  MinusCircle,
  Gauge,
  ChevronDown,
  MoreVertical,
  LayoutGrid,
  ArrowUpDown,
  RotateCcw,
  UserPlus,
  UserRound,
  User,
  Info,
  Inbox,
  CalendarDays,
  MonitorUp,
  GripVertical,
  Move,
  Users,
  Building2,
  Ticket,
  Search,
  Bell,
  Pin,
  PanelLeftClose,
  History,
  ChevronLeft,
  ChevronRight,
  MessageSquarePlus,
  Copy,
  Paperclip,
  Bold,
  Italic,
  Smile,
  Zap,
  FileText,
  Send,
  ArrowUpRight,
  CircleCheck,
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
  RefreshCw,
  UserX,
  ChevronsDownUp,
  ChevronsUpDown,
  type LucideIcon,
} from "lucide-react";

/* ── App menu builder (needs onNavigate so built inside the component) ── */

function buildAppMenuGroups(onNavigate?: (page: Page) => void): AppMenuGroup[] {
  return [
    {
      items: [
        { label: "Agent Next Gen", active: true },
        { label: "Agent Workspace Premium", onClick: () => onNavigate?.("agent-workspace") },
        { label: "Outbound Engagement", onClick: () => onNavigate?.("outbound") },
        { label: "Login", onClick: () => onNavigate?.("login") },
      ],
    },
  ];
}

/* ── Create New → Outbound config ──
   Mirrors lyra-ui's CreateNew "Create New → Outbound" story (see
   lyra-ui/src/components/__stories__/create-new-outbound-mock.tsx) — only
   "Outbound" is wired up, the rest render as coming-soon placeholders. Teams
   and skills below are small, app-specific lists kept local, but the agent
   and customer "database" records themselves come from lyra-ui's shared
   fixture files (via the /agents-data and /customers-data aliases in
   vite.config.ts) so this app's Outbound picker can't quietly drift out of
   sync with lyra-ui's own story — same records, mapped into the shape
   `CreateNew` expects exactly like lyra-ui's own mock file does. */

function initialsFor(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const OUTBOUND_AGENTS: NonNullable<CreateNewOutboundConfig["groups"][number]["contacts"]> = CREATE_NEW_AGENTS.map((a) => ({
  id: a.id,
  name: a.name,
  initials: initialsFor(a.name),
  subtitle: a.agentId,
  avatarClassName: a.avatarClassName,
  channels: a.channels,
  status: a.status,
}));

const OUTBOUND_CUSTOMERS: NonNullable<CreateNewOutboundConfig["groups"][number]["contacts"]> = CREATE_NEW_CUSTOMERS.map((c) => ({
  id: c.id,
  name: c.name,
  initials: initialsFor(c.name),
  subtitle: c.customerId,
  avatarClassName: c.avatarClassName,
  channels: c.channels,
  // Matches `buildCustomerInfoFields`'s own synthesized "Phone #" exactly
  // (same `hashSeed`/`synthesizePhone`, same seed input) — both are
  // deterministic functions of the customer's own id, so "Select Phone"'s
  // default here and the Customer Information panel's Directory tab always
  // agree on the same "primary" number for a given customer, without one
  // needing to read the other's state. `hashSeed`/`synthesizePhone` are
  // `function` declarations further down this file, hoisted, so they're
  // callable up here despite being defined later.
  primaryPhone: { value: synthesizePhone(hashSeed(c.customerId || c.name)), label: synthesizePhone(hashSeed(c.customerId || c.name)) },
  // Matches `buildCustomerInfoFields`'s own synthesized "Email" fallback
  // exactly (same `splitCustomerName` + `${first}.${last}@example.com`
  // formula) — so Favorites' "Enter phone, email or search term" search
  // (`contactMatchesSearch`, create-new.tsx) can actually match a
  // customer's email, and it agrees with what the Customer Information
  // panel already shows for that same customer. `splitCustomerName` is a
  // `function` declaration further down this file, hoisted, so it's
  // callable up here despite being defined later.
  email: (() => {
    const { firstName, lastName } = splitCustomerName(c.name);
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
  })(),
}));

const OUTBOUND_TEAMS: NonNullable<CreateNewOutboundConfig["groups"][number]["contacts"]> = [
  { id: "t1", name: "Billing Support",    initials: "BS", subtitle: "TEAM-04", avatarClassName: "bg-lyra-accent-purple-soft text-lyra-accent-purple-strong", channels: ["voice", "email"] },
  { id: "t2", name: "Tier 2 Escalations", initials: "T2", subtitle: "TEAM-07", avatarClassName: "bg-lyra-accent-red-soft text-lyra-accent-red-strong",       channels: ["voice", "email"] },
];

// Deterministic (no Math.random) per-team agent roster for the Teams
// group's own "Choose team" sub-picker (see `CreateNewOutboundGroup.
// subFilter`'s own doc comment in create-new.tsx, and the "teams" group
// wiring in `outboundConfig` below) — per explicit request: picking a team
// there should let the agent search that team's real members. Round-robins
// `OUTBOUND_AGENTS` across `OUTBOUND_TEAMS` by index (no dedicated
// "team" field exists on `CreateNewAgentRecord`/`CREATE_NEW_AGENTS`), so
// each team gets a stable, real-looking set of members instead of an
// arbitrary or empty one.
const OUTBOUND_TEAM_MEMBERS: Record<string, NonNullable<CreateNewOutboundConfig["groups"][number]["contacts"]>> =
  Object.fromEntries(
    OUTBOUND_TEAMS.map((team: any, teamIndex: number) => [
      team.id,
      OUTBOUND_AGENTS.filter((_agent: any, agentIndex: number) => agentIndex % OUTBOUND_TEAMS.length === teamIndex),
    ])
  );

const OUTBOUND_SKILLS: NonNullable<CreateNewOutboundConfig["groups"][number]["contacts"]> = [
  { id: "s1", name: "Spanish Language",  initials: "ES", subtitle: "SKL-12", avatarClassName: "bg-lyra-accent-green-soft text-lyra-accent-green-strong", channels: ["voice", "email"], status: "available", queueCount: 4, waitTimeSeconds: 200 },
  { id: "s2", name: "Technical Support", initials: "TS", subtitle: "SKL-03", avatarClassName: "bg-lyra-accent-blue-soft text-lyra-accent-blue-strong",   channels: ["voice", "email"], status: "busy",      queueCount: 7, waitTimeSeconds: 95 },
];

// Every group the "New Outbound" filter dropdown COULD show — kept as its
// own named constant, separate from `OUTBOUND_CONFIG.groups` below, so
// "Dial Pad" can be hidden from the dropdown without deleting it: per
// explicit request ("hide it don't destroy it"), the group definition
// itself stays fully intact here, just filtered out before being handed
// to `CreateNew`. Restoring it later is a one-line revert (drop the
// `.filter(...)` below), not re-authoring the group from scratch.
const OUTBOUND_GROUPS: CreateNewOutboundConfig["groups"] = [
  // No dedicated "Favorites" entry in the group dropdown, per explicit
  // request — this "all" entry replaces it as the DEFAULT/starting
  // filter instead (`defaultGroupId` below) rather than sitting beside
  // it as a separate option. Still uses `kind: "favorites"` under the
  // hood (create-new.tsx's own behavior for that kind is exactly what's
  // wanted here: idle state shows only starred contacts, and typing a
  // search widens to every contact across every group — see
  // `activeGroupContacts`'s own doc comment there), just labeled/keyed
  // as "All" instead of "Favorites" since that's the only way an agent
  // reaches this view now.
  // `emptyMessage` per explicit request — plain "Search above to find a
  // contact" once nothing's favorited yet, no "No favorites yet —"
  // prefix (that phrasing read like an error/apology for something
  // missing, when the real point is just "type to search").
  { id: "all", label: "All", kind: "favorites", emptyMessage: "Search above to find a contact" },
  { id: "agents", label: "Agents", contacts: OUTBOUND_AGENTS },
  { id: "teams", label: "Teams", contacts: OUTBOUND_TEAMS },
  { id: "skills", label: "Skills", contacts: OUTBOUND_SKILLS },
  { id: "customers", label: "Customers", contacts: OUTBOUND_CUSTOMERS },
  // Hidden from the dropdown below (`HIDDEN_OUTBOUND_GROUP_IDS`), per
  // explicit request — NOT deleted. Still a complete, valid group
  // definition; `onQuickDial`/`handleQuickDial` (this config's own
  // handler, further down) are untouched and still wired up, they just
  // have no dropdown entry to reach this group's own dialpad UI through
  // right now.
  { id: "dialpad", label: "Dial Pad", kind: "dialpad" },
];

// Group ids hidden from the "New Outbound" filter dropdown without being
// removed from `OUTBOUND_GROUPS` above — see that constant's own doc
// comment for why. Add/remove ids here to hide/restore a group; the
// group's own definition never needs to change.
const HIDDEN_OUTBOUND_GROUP_IDS: string[] = ["dialpad"];

const OUTBOUND_CONFIG: CreateNewOutboundConfig = {
  outboundTitle: "New Outbound",
  groups: OUTBOUND_GROUPS.filter((g) => !HIDDEN_OUTBOUND_GROUP_IDS.includes(g.id)),
  // "all" (not "agents") — per explicit request, the New Outbound picker
  // now opens on the "All" filter (favorited contacts idle, full-database
  // search once typed) by default instead of Agents.
  defaultGroupId: "all",
  // One placeholder for the whole flow, not per-group — per explicit
  // request/confirmed UX bug: search matches name/subtitle/phone/email
  // identically no matter which group filter is selected, so a
  // placeholder that changed per group (e.g. "Search Agents") falsely
  // implied switching the filter changed what the box searched for. See
  // `CreateNewOutboundConfig.searchPlaceholder`'s own doc comment in
  // create-new.tsx.
  searchPlaceholder: "Enter phone, email or search term",
  // Per explicit request: the New Outbound picker's contact list isn't
  // ready to show yet — hide it (and its pagination footer) for every
  // group, leaving just the group dropdown ("Choose group" — Favorites/
  // Agents/Teams/Skills/Customers) and its search field visible above an
  // empty body. See `CreateNewOutboundConfig.hideContactList`'s own doc
  // comment in create-new.tsx. Remove this once the real list is ready.
  hideContactList: true,
  channelOptions: [
    { id: "voice",    label: "Call",     selectLabel: "Voice", icon: <Phone         className="h-5 w-5" strokeWidth={1.5} /> },
    { id: "email",    label: "Email",                          icon: <Mail          className="h-5 w-5" strokeWidth={1.5} /> },
    { id: "sms",      label: "SMS",                            icon: <MessageSquare className="h-5 w-5" strokeWidth={1.5} /> },
    { id: "whatsapp", label: "WhatsApp",                       icon: <MessageCircle className="h-5 w-5" strokeWidth={1.5} /> },
  ],
  phoneOptions: [
    { value: "+14563833329", label: "(456) 383-3329" },
    { value: "+14565559981", label: "(456) 555-9981" },
    { value: "+14565550147", label: "(456) 555-0147" },
  ],
  skillOptions: [
    { value: "general", label: "General Support" },
    { value: "technical", label: "Technical Support" },
    { value: "billing", label: "Billing" },
    { value: "sales", label: "Sales" },
    { value: "escalations", label: "Escalations" },
    { value: "vip", label: "VIP Support" },
  ],
  onQuickDial: (phoneNumber) => {
    // eslint-disable-next-line no-console
    console.log("Quick dial:", phoneNumber);
  },
  onStartCall: (selection) => {
    // eslint-disable-next-line no-console
    console.log(
      "Start call:",
      selection.channel,
      "→",
      selection.contact.name,
      `(phone: ${selection.phone}, skill: ${selection.skillId})`
    );
  },
  pageSize: 10,
};

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
interface TrackedChannel {
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
  /** This channel's own conversation/session id — distinct from
   *  `ActiveInteraction.recordId` below (the *customer/case* record shown in
   *  the page header): one record can have several channels open, each its
   *  own conversation with its own id. Synthesized via
   *  `generateInteractionId()` at channel-creation time (for every channel
   *  type, including voice); shown on this channel's `ChannelToggle` tooltip as
   *  "#{interactionId}". */
  interactionId?: string;
  /**
   * Every time this channel is restarted at the SAME address/handle (same
   * `id`, reused via `handleStartCall`'s "same contact already has an
   * interaction open" merge branch) while its own `channelStatuses` entry
   * currently reads `"Closed"`, one entry gets appended here — per explicit
   * request, reopening a closed channel via "Add Channel" shouldn't just
   * silently resume the same conversation as if nothing happened; it should
   * read as a genuinely NEW session, appended below whatever's already
   * there (the old closed session's own messages, real mock history or
   * otherwise) rather than replacing it. `InteractionTranscript` (this
   * file, further down) turns each entry here into one more synthetic,
   * empty "Session Details" separator — the exact same shape
   * `isFreshLaunch`'s own single synthetic session already uses, just one
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
   * slices the flat array back into per-session chunks using each entry's
   * own `messagesBeforeReopen` boundary below, not because the array
   * itself was ever cleared. Kept (not reset) across multiple close→reopen
   * cycles on the same channel, so each one gets its own distinct row
   * rather than the latest reopen silently overwriting a prior one. Text
   * channels (chat/sms/whatsapp) only — see `InteractionTranscript`'s own
   * `isTextChannel` gate for why voice/email don't have an equivalent
   * multi-session concept to extend here.
   */
  reopenedSessions?: {
    id: string;
    date: string;
    startTime: string;
    /**
     * Snapshot of `liveMessages[this channel's id]?.length` at the exact
     * moment this reopen happened — per explicit correction, reopening a
     * closed channel must NOT wipe its prior messages; they stay visible
     * (dimmed) under their original session instead of vanishing. This
     * boundary is what lets `InteractionTranscript` slice the one flat
     * `liveMessages` array back into per-session chunks: everything before
     * this index belongs to whatever session came before this reopen (the
     * base session, or an earlier reopen), everything from this index up
     * to the NEXT reopen's own `messagesBeforeReopen` (or the array's end,
     * for the last entry) belongs to this reopen's own session.
     */
    messagesBeforeReopen: number;
  }[];
}

/** One live interaction in the left nav — an agent/customer/team/skill
 *  contact (or, for a quick-dialed number with no contact record, the
 *  number itself) plus every channel currently open with them. Keyed by
 *  contact id (or `quickdial:<number>`) so starting a second channel with
 *  the same contact adds to this interaction's `channels` instead of
 *  creating a second card. */
interface ActiveInteraction {
  id: string;
  customerName?: string;
  /** Customer/agent/team/skill record id shown under the name on this
   *  interaction's detail page header — the contact's real id
   *  (`CreateNewOutboundContact.subtitle`, e.g. a customerId/agentId) when
   *  the interaction was started from a known record, `entry.caseId` when
   *  redialed from Contact History, or a freshly generated case number
   *  (`generateCaseId`) for quick-dialed numbers with no matching record. */
  recordId: string;
  channels: TrackedChannel[];
  /** Which open channel is "current" — shared source of truth between this
   *  interaction's `InteractionNavItem` card (its `currentChannelKey` prop)
   *  and its `ChannelToggle` bar (each toggle's `active`), so clicking either one
   *  updates the other. A `TrackedChannel.id` (falls back to the last
   *  channel's own id when unset — see the `?? mostRecentId` reads below —
   *  same default a fresh interaction already had before this field
   *  existed). Kept in sync by `handleStartCall`/`handleQuickDial`/
   *  `handleRedial` (a new/refreshed channel always takes over as current,
   *  mirroring `InteractionNavItem`'s own auto-select-newest rule) and by
   *  `handleChannelSelect` (a row or tab click). */
  currentChannelId?: string;
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
   * receive an actual customer response from). Kept on `ActiveInteraction`
   * itself (not local component state) so it survives switching away to a
   * different interaction and back via the left nav, instead of resetting
   * every time `InteractionTranscript` remounts.
   *
   * Keyed by channel (`TrackedChannel.id ?? .type`, same scheme
   * `currentChannelId`/`channelStatuses` already use — see the latter's own
   * doc comment), NOT one flat array for the whole interaction — this used
   * to be a lone `TranscriptMessage[]`, which was a real, confirmed bug:
   * every message sent on ANY channel landed in that one shared array, so
   * switching to a different (or freshly opened) channel on the same card
   * showed every other channel's own conversation too — e.g. opening a
   * Voice channel right after chatting on WhatsApp showed the WhatsApp
   * messages under the Voice tab. Per-channel keys fix that: the render call
   * site resolves only the CURRENT channel's own entry
   * (`liveMessages?.[currentKey] ?? []`) before handing it to
   * `InteractionTranscript`, same as `channelStatuses` already does for
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
   * `resolution`) — keyed by `TrackedChannel.id`, ONE entry per open
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
   * status (`TranscriptSession.status`) still applies. A channel that's
   * restarted at the same id (e.g. redialing the same number, reusing
   * `TrackedChannel.id`) has its entry explicitly cleared first (see
   * `withoutChannelStatus`) rather than silently inheriting whatever it
   * was left at before — a reopened channel should read as freshly open,
   * not still "Closed" under its own reused id.
   *
   * Kept here, on `ActiveInteraction` itself, for the same reason
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
   * Contact History row picks its (single, freshly-built) channel back up
   * in that same status instead of resetting to whatever hardcoded default
   * status `TRANSCRIPT_SESSIONS`/`_VOICE`/`_EMAIL` otherwise assigns it.
   */
  channelStatuses?: Record<string, string>;
}

/** Fallback case id for interactions with no real customer/agent/team/skill
 *  record behind them (quick-dialed numbers) — same "CS-" + digits shape as
 *  every other generated case id in this file, just namespaced separately
 *  since those already-real ids come with their own prefix per record type
 *  (customerId/agentId/TEAM-.../SKL-.../ASN-...). */
function generateCaseId(): string {
  return `CS-${Math.floor(1000000 + Math.random() * 9000000)}`;
}

/** Synthesized per-channel conversation/session id — same plain-numeric
 *  shape as the reference screenshot ("#707535188548", 12 digits, no
 *  prefix) — distinct from `generateCaseId`'s "CS-" shape, which is a
 *  customer/case-level id, not a per-channel one. See
 *  `TrackedChannel.interactionId`'s own doc comment for why these are two
 *  different things. */
function generateInteractionId(): string {
  return String(Math.floor(100000000000 + Math.random() * 900000000000));
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
 *  for. */
const AWAITING_WARNING_SECONDS = 30;

/** Wait threshold (seconds) past which an awaiting channel escalates from
 *  amber ("warning") to red ("critical") — see `getAwaitingSeverity` below.
 *  Placeholder value; tune to whatever the real digital-channel SLA calls
 *  for. */
const AWAITING_CRITICAL_SECONDS = 60;

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

function buildNavItems(
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
   `TrackedChannel` actually carries in this prototype (see `startTick`'s own
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
type AssignmentSortValue = "lastUpdated" | "startDate" | "awaitingLongest";

const ASSIGNMENT_SORT_OPTIONS: { value: AssignmentSortValue; label: string }[] = [
  { value: "lastUpdated", label: "Last Updated" },
  { value: "startDate", label: "Start Date" },
  { value: "awaitingLongest", label: "Longest Wait" },
];

function sortAssignments(interactions: ActiveInteraction[], sort: AssignmentSortValue): ActiveInteraction[] {
  if (sort === "awaitingLongest") {
    const key = (i: ActiveInteraction) => {
      const awaitingTicks = i.channels
        .filter((c) => c.awaitingResponse)
        .map((c) => c.lastCustomerMessageTick ?? c.startTick);
      return awaitingTicks.length > 0 ? Math.min(...awaitingTicks) : Infinity;
    };
    // Ascending, not descending like the other two — the OLDEST tick (the
    // longest wait) needs to sort first here.
    return [...interactions].sort((a, b) => key(a) - key(b));
  }
  const key = (i: ActiveInteraction) => {
    const ticks = i.channels.map((c) => c.startTick);
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
function AssignmentsSortButton({
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
function AssignmentsExpandCollapseAllButton({
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
function AssignmentsSectionCaption({
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
const NOTIFICATION_CHANNEL: Record<string, ChannelType> = {
  "1": "email",
  "3": "email",
  "4": "sms",
};

/** "Email"/"SMS"/"Chat"/"Call" — the bare channel-name word shared by both
 *  `newCaseNotificationTitle` ("New {X}") and Escalation's own title
 *  ("Escalation - {X}", see `INITIAL_NOTIFICATIONS` below), so the two
 *  can't describe the same channel with two different words.
 *  SMS/WhatsApp/Chat all read as "Chat" (default branch) — same
 *  chat-shaped-channels grouping this app already uses elsewhere (e.g.
 *  `contactHistoryChannelType`) — since nothing in this mock data
 *  distinguishes them from a customer's own vantage point; Voice falls
 *  back to "Call" defensively even though no current entry uses it. */
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
 *  title, derived from whichever channel it's actually on
 *  (`NOTIFICATION_CHANNEL` above) instead of a fixed "New Assignment"
 *  string regardless of channel, per explicit request. */
function newCaseNotificationTitle(channel: ChannelType): string {
  return `New ${channelNoun(channel)}`;
}

const INITIAL_NOTIFICATIONS: AgentNotification[] = [
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

interface ContactInteraction {
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

interface LatestContact {
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
const INTERACTION_CHANNELS: { type: ContactInteraction["type"]; channel: string; skill: string }[] = [
  { type: "chat",  channel: "mojo_finance_async", skill: "" },
  { type: "email", channel: "CXi SME Email",      skill: "Chat_General" },
  { type: "chat",  channel: "Chat_General",       skill: "Chat_General" },
  { type: "chat",  channel: "Rebooking_Chat",     skill: "Rebooking" },
  { type: "voice", channel: "Voice_General",      skill: "" },
  { type: "email", channel: "Email_Support",      skill: "Billing_Support" },
  { type: "chat",  channel: "SMS_General",        skill: "Technical_Support" },
];

const RESOLUTION_TIMES = ["0 sec", "12 sec", "45 sec", "1 min", "2 min", "3 min", "5 min", "8 min"];

/* Logged-in agent — matches the "Good morning, John" home screen greeting.
   Used both to populate the Owner Assignee column and to decide whether an
   interaction's kebab menu should offer "Assign To Me" (only when it isn't
   already his). */
const CURRENT_AGENT_NAME = "John Smith";
const [CURRENT_AGENT_FIRST_NAME, CURRENT_AGENT_LAST_NAME] = CURRENT_AGENT_NAME.split(" ");

/* Home tab greeting — "Good morning/afternoon/evening" based on the
   visitor's actual local time (not the static "Good morning" the welcome
   modal below always shows), read fresh on every render. */
function getGreetingPeriod(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/* Dashboard page-header subtitle — "Wednesday, July 29, 2026 · 9:41 AM",
   read fresh on every render. Ticks live for free: the component's
   `clockTick` state (see the shared elapsed-time clock a bit further down)
   already re-renders this whole tree once a second for the open-channel
   elapsed timers, so this just reads `new Date()` again on whichever render
   that produces — no separate interval needed here. */
function formatHeaderDateTime(): string {
  const now = new Date();
  const datePart = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const timePart = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

/* Welcome modal — last login timestamp shown under the greeting. The
   assigned-skills/online-teammate counts that used to accompany it
   (`AGENT_SKILLS_COUNT`/`TEAMMATES_ONLINE_COUNT`/`TEAMMATES_AVAILABLE_COUNT`)
   are commented out below, not deleted — the info-box that displayed them
   is hidden for now (per explicit request; see the `AgentWelcomeMessage`
   call site), so keeping unused consts around would just be dead-code
   lint noise until it comes back. */
const WELCOME_MODAL_LAST_LOGIN = "Today at 8:42 AM";
// const AGENT_SKILLS_COUNT = 3;
// const TEAMMATES_ONLINE_COUNT = 8;
// const TEAMMATES_AVAILABLE_COUNT = 5;

const INTERACTION_OWNERS = [
  "John Smith",
  "Kevin Jensen",
  "Andres Arenas",
  "Priya Anand",
  "Erwin de Vera",
  "Tim O'Connor",
  "Josh Robertson",
];

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

/* contactStatus drives every interaction's status: a closed case has every
   interaction closed; an open case has exactly one (its most recent, i === 0)
   still-open interaction — which also has no resolution time yet — while the
   rest of its history is closed. */
function buildInteractions(seed: number, contactStatus: "open" | "closed", count: number): ContactInteraction[] {
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
interface QueueSubItem {
  id: string;
  label: string;
  icon: LucideIcon;
  inQueueCount: number;
  wait: string;
  available: number;
  working: number;
  unavailable: number;
}

const INITIAL_QUEUE_SUB_ITEMS: Record<string, QueueSubItem[]> = {
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
function sumInQueue(items: QueueSubItem[]): number {
  return items.reduce((total, item) => total + item.inQueueCount, 0);
}

/** Static per-queue "Agents" metric for the home tab's queue widgets — a
 *  headcount `QueueSubItem` has no single equivalent of (its own
 *  available/working/unavailable are per-channel, not a queue-wide total),
 *  so unlike `contactsCount`/`skillsCount` this one has no underlying list
 *  to derive from and is just seeded to match the reference screenshot. */
const AGENTS_COUNT_BY_QUEUE: Record<string, number> = { "1": 3, "2": 2, "3": 3, "4": 11, "5": 4 };

/** Baseline queue-wait seconds (matches the reference screenshot's
 *  00:02:34 / 00:00:00 / 00:02:00 / 00:00:24) — the component below adds
 *  the shared `clockTick` counter to these every render so the home tab's
 *  "Wait Time" ticks up in real time like a live clock, the same
 *  convention `formatElapsedTime`'s callers already use for interaction
 *  elapsed-time displays. */
const QUEUE_WAIT_BASE_SECONDS: Record<string, number> = { "1": 154, "2": 0, "3": 120, "4": 24, "5": 0 };

/* Everything about each queue widget that never changes on its own — kept
   separate from the derived/ticking fields (`contactsCount`, `skillsCount`,
   `agentsCount`, `wait`) so those can be recomputed each render (see the
   `latestContacts` useMemo inside the component) without re-running
   `buildInteractions` every tick. */
const LATEST_CONTACTS_STATIC: Omit<LatestContact, "contactsCount" | "skillsCount" | "agentsCount" | "wait">[] = [
  { id: "1", name: "Digital",       icon: MessageSquare, status: "open",   channel: "Atlas", caseId: "CST-21009", interactions: buildInteractions(1, "open", 3) },
  { id: "2", name: "Inbound Voice", icon: PhoneIncoming, status: "open",   channel: "Atlas", caseId: "CST-21016", interactions: buildInteractions(2, "open", 5) },
  { id: "3", name: "Voicemail",     icon: Voicemail,     status: "closed", channel: "Atlas", caseId: "CST-21028", interactions: buildInteractions(3, "closed", 1) },
  { id: "4", name: "Work Item",     icon: ClipboardList, status: "open",   channel: "Emily", caseId: "CST-15001", interactions: buildInteractions(4, "open", 7) },
  { id: "5", name: "Outbound Voice", icon: PhoneOutgoing, status: "open",  channel: "Atlas", caseId: "CST-21042", interactions: buildInteractions(5, "open", 2) },
];

/* ── Home screen summary cards ── */

type DateFilterValue = "today" | "yesterday" | "last7" | "custom";

// Desk-tab keys/labels — shared by `activeDeskTab`/`deskTabOrder` state and
// the reorderable tab row that renders them (see `deskTabOrder`'s own doc
// comment further down). Centralized here so the row can be built with a
// `.map()` (each `Tab` needs a stable `key` for `TabList`'s `reorderable`
// drag-and-drop to work) instead of five hand-written near-duplicate `<Tab>`
// elements.
type DeskTabKey = "home" | "customers" | "accounts" | "tickets" | "wem";
const DESK_TAB_LABELS: Record<DeskTabKey, string> = {
  home: "Dashboard",
  customers: "Customers",
  accounts: "Accounts",
  tickets: "Tickets",
  wem: "WEM",
};

/* Dummy Performance data per date range — drives the Performance summary
   card's rows/footer so the numbers actually change when a range is picked.
   `overallPerformance` is a percentage (replaces the old "CSAT Score"
   0-5 rating), stored pre-formatted with the "%" like every other range
   here does with its own unit. */
const PERFORMANCE_DATA_BY_RANGE: Record<
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

type ChannelTypeId = "inbound" | "outbound";

interface ChannelTypeMeta {
  id: ChannelTypeId;
  label: string;
  icon: LucideIcon;
}

const CHANNEL_TYPE_META: ChannelTypeMeta[] = [
  { id: "inbound",  label: "Inbound",  icon: PhoneIncoming },
  { id: "outbound", label: "Outbound", icon: PhoneOutgoing },
];

interface ChannelTypeValue {
  you: number;
  team: number;
}

const CHANNEL_TYPE_DATA_BY_RANGE: Record<DateFilterValue, Record<ChannelTypeId, ChannelTypeValue>> = {
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

/** "% of Team" for a single row — you as a share of the team total. 0 when the team total is 0 (avoids dividing by zero). */
function percentOfTeam(you: number, team: number): number {
  return team > 0 ? Math.round((you / team) * 100) : 0;
}

/* ── Productivity breakdown card (agent state duration bars + date filter chip) ──
   Replaces the third summary card slot — same Container/header styling as the
   Schedule/Performance stat cards (no Table), with a FilterChip (search + Select
   All + checkbox options) for the date filter in the header. Each agent state
   (Available/Working/Unavailable) shows the agent's own duration bar + time,
   plus a lighter "Team" comparison bar + time beneath it. Static id/label/icon
   metadata is kept separate from the per-range numeric values so the date
   filter can swap the values without touching the row definitions. */

type ProductivityStatusId = "available" | "working" | "unavailable";

interface ProductivityStatusMeta {
  id: ProductivityStatusId;
  label: string;
  icon: LucideIcon;
  iconColorClassName: string;
}

const PRODUCTIVITY_STATUS_META: ProductivityStatusMeta[] = [
  { id: "available",   label: "Available",   icon: CheckCircle2, iconColorClassName: "text-lyra-status-success-strong" },
  { id: "working",     label: "Working",     icon: CircleDot,    iconColorClassName: "text-lyra-status-warning-strong" },
  { id: "unavailable", label: "Unavailable", icon: MinusCircle,  iconColorClassName: "text-lyra-status-critical-strong" },
];

/* Sub-state breakdown shown in the info tooltip on the Productivity card's
   Unavailable row — which specific unavailable codes made up that time. */
const UNAVAILABLE_STATE_BREAKDOWN: { label: string; percent: number }[] = [
  { label: "Bio Break", percent: 100 },
  { label: "Break",     percent: 0 },
  { label: "Meeting",   percent: 0 },
  { label: "Team",      percent: 100 },
];

interface ProductivityStatusValue {
  percent: number;
  teamPercent: number;
  time: string;
  teamTime: string;
}

const PRODUCTIVITY_DATA_BY_RANGE: Record<DateFilterValue, Record<ProductivityStatusId, ProductivityStatusValue>> = {
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

const DATE_FILTER_OPTIONS: { value: DateFilterValue; label: string }[] = [
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
function DateFilterChip({ onValueChange }: { onValueChange?: (value: DateFilterValue) => void }) {
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
const ACTIVITY_STATUS_COLORS: Record<ProductivityStatusId, { dotClassName: string; colorVar: string }> = {
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
function PerformanceBreakdownCard() {
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
function PerformanceSummaryCard() {
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

/* ── Contact History card (home tab, below Performance/Productivity) ──
   A recent-customer-contacts summary — name, resolution status, an optional
   "Redial" action for voice contacts, a one-line case summary, case ID, and
   (right-aligned) the channel + how long ago it happened, plus the handle
   time. The base 5 rows (`CONTACT_HISTORY`) are from a screenshot of
   exactly this content, so those values are that screenshot's own data,
   not derived from any other part of the app. Composed entirely from
   existing lyra-ui atoms — `DashboardCard` for the card shell
   (`headerActions` holding this card's own `ContactHistoryDateFilterChip`
   — a separate, 3-option "Today / Last 48 Hours / Last 72 Hours"
   control, not the shared `DateFilterChip` the Performance/Productivity
   cards' headers use, since this card's range options and cumulative-
   window semantics are its own — see `ContactHistoryDateFilterValue`'s own
   doc comment for why), `Badge` (`shape="circle" dot`) + plain text for the
   status indicator (critical=red/Escalated, info=blue/In Progress,
   success=green/Resolved, neutral=gray/New), and a plain `Button
   variant="outline"` for "Redial" (reusing the same `PhoneOutgoing` icon
   `InteractionRowActions`' kebab menu already uses for its own "Redial"
   action, rather than inventing a second icon for the same meaning) — no
   hand-rolled badge/pill markup.

   Row set is driven by the selected date range (`buildContactHistoryByRange`):
   "Today" starts EMPTY on login — there's no real backend here to have
   loaded any actual prior-contact history from, so this app no longer
   pretends otherwise with hand-authored placeholder rows the way it used
   to (a `TODAY_CONTACT_HISTORY` fixture, since removed). "Today" instead
   fills in for real, as the agent actually works: "Unassign & Dismiss"ing
   a whole assignment (`handleDismissInteraction`, main component) is what
   counts as a completed contact in this demo, and appends a genuine
   `ContactHistoryEntry` (`buildDismissedContactHistoryEntry`) onto
   `dismissedContactHistory` state — the one truly live piece of this
   card's data. Dismissing does NOT change that entry's status, though: it
   logs at the same neutral "Resolved" default every hand-authored
   `CONTACT_HISTORY` row's own closed-the-loop case uses, never a forced
   "Closed"/read-only one — an earlier pass tried that and it conflated
   leaving an assignment (a LeftNav/UI action) with the assignment's own
   status (a real-world fact about the case); per explicit follow-up,
   dismissing must never itself decide or change that. "Last 48 Hours"
   adds the 5 hand-authored `CONTACT_HISTORY` rows on top of whatever's
   been dismissed so far; "Last 72 Hours" adds 5 more
   (`EXTENDED_CONTACT_HISTORY`) pulled from the shared customer "database"
   (`CREATE_NEW_CUSTOMERS`, the same fixture `OUTBOUND_CUSTOMERS` above
   already sources from) rather than inventing unrelated names. Each range
   is a strict superset of the one before it — today's own (dismissed)
   rows never disappear just because a wider range is selected. */

/** Case-status color — "critical" (red, Escalated), "info" (blue, Pending),
 *  "warning" (orange, Open), "success" (green, Resolved), "neutral" (gray,
 *  New/Closed). Reuses `Badge`'s own `BadgeCircleVariant` names directly
 *  (see the status badge's own rendering below) rather than a separate
 *  string union, so there's no separate mapping table that could drift out
 *  of sync with what `Badge` actually accepts. Gained "warning" alongside
 *  `SESSION_STATUS_TO_CONTACT_HISTORY_VARIANT` below — until then this only
 *  ever needed to represent the 4 statuses this card's own fixtures used
 *  (Escalated/Resolved/New, "In Progress" never actually used), not the
 *  full 5-status vocabulary `TRANSCRIPT_SESSION_STATUS_OPTIONS` offers. */
type ContactHistoryStatusVariant = "critical" | "info" | "warning" | "success" | "neutral";

/** Maps a session status (`TRANSCRIPT_SESSION_STATUS_OPTIONS`' labels —
 *  Open/Pending/Escalated/Resolved/Closed) onto this card's own
 *  `ContactHistoryStatusVariant`, so `buildDismissedContactHistoryEntry`
 *  can log whatever status was actually last assigned to a dismissed
 *  interaction's primary channel (`ActiveInteraction.channelStatuses`) with a matching dot
 *  color, instead of a hardcoded "Resolved"/"success" regardless. "Closed"
 *  maps to "neutral" (gray) rather than reusing "critical" — a closed
 *  contact isn't a negative outcome the way "Escalated" is, and reusing red
 *  for both would read as if every closed row were also escalated. Falls
 *  back to "neutral" for any status not listed (defensive only — every
 *  value `TRANSCRIPT_SESSION_STATUS_OPTIONS` can actually produce is
 *  covered). */
const SESSION_STATUS_TO_CONTACT_HISTORY_VARIANT: Record<string, ContactHistoryStatusVariant> = {
  Open: "warning",
  Pending: "info",
  Escalated: "critical",
  Resolved: "success",
  Closed: "neutral",
};

interface ContactHistoryEntry {
  id: string;
  name: string;
  statusLabel: string;
  statusVariant: ContactHistoryStatusVariant;
  /** Voice contacts only — shows a "Redial" action next to the status tag. */
  redial: boolean;
  description: string;
  caseId: string;
  channelType: "voice" | "chat" | "email";
  channelLabel: string;
  timeAgo: string;
  duration: string;
  /** The real `CREATE_NEW_CUSTOMERS` record id backing this row, when this
   *  entry was built from that fixture (see `buildContactHistoryFromCustomers`
   *  below) — undefined for the hand-authored `CONTACT_HISTORY` rows above,
   *  which have no real customer record behind their invented names/case
   *  IDs. `handleRedial` uses this (when present) as the redialed
   *  interaction's own id instead of a synthetic `redial:` one, so the
   *  resulting card's id resolves in `useOutboundAddButton`'s contact
   *  lookup the exact same way a card started from the Outbound picker
   *  does — see `handleRedial`'s own doc comment for why a synthetic id
   *  silently broke that card's "+" (Add Channel) button. */
  customerId?: string;
  /**
   * True for a row that represents a genuinely closed/over conversation —
   * NOT set by "Unassign & Dismiss" (`buildDismissedContactHistoryEntry`
   * logs a normal "Resolved" row, per explicit follow-up: dismissing must
   * never itself decide or change an assignment's status; see this file's
   * own "Contact History card" doc comment above), only ever hand-authored
   * on a `ContactHistoryEntry` directly if a future row needs it. Every
   * status this app's own rows actually use (New/Open/Pending/Escalated/
   * Resolved — the hand-authored `CONTACT_HISTORY`/`EXTENDED_CONTACT_HISTORY`
   * rows, and every dismissed row, all use "Resolved"/"Escalated") is still
   * an active, appendable conversation once reopened; none of them set
   * this. `closed` drives `handleReopenContactHistoryEntry` →
   * `ActiveInteraction.closed`: a closed interaction reopens read-only (an
   * inline "You are viewing a closed interaction." banner, no
   * `InteractionComposer`, no per-channel kebab actions) instead of a
   * normal, reply-able one. A plain boolean rather than checking
   * `statusLabel === "Closed"` by string — display text shouldn't double as
   * the thing behavior branches on. */
  closed?: boolean;
}

const CONTACT_HISTORY_CHANNEL_ICON: Record<ContactHistoryEntry["channelType"], LucideIcon> = {
  voice: Phone,
  chat:  MessageCircle,
  email: Mail,
};

const CONTACT_HISTORY: ContactHistoryEntry[] = [
  {
    id: "ch1", name: "Nathan Cole", statusLabel: "Resolved", statusVariant: "success", redial: true,
    description: "Customer was locked out after 5 failed attempts. Verified identity via KBA, reset credentials, and confirmed access restored.",
    caseId: "CST-22841", channelType: "voice", channelLabel: "Voice", timeAgo: "8m ago", duration: "8m 14s",
  },
  {
    id: "ch2", name: "Priya Shah", statusLabel: "Resolved", statusVariant: "success", redial: false,
    description: "Duplicate charge dispute — $89.99 refund issued",
    caseId: "CST-30164", channelType: "chat", channelLabel: "Chat", timeAgo: "34m ago", duration: "12m 02s",
  },
  {
    id: "ch3", name: "Omar Farooq", statusLabel: "Resolved", statusVariant: "success", redial: false,
    description: "Plan upgrade confirmation & feature overview",
    caseId: "CST-16823", channelType: "email", channelLabel: "Email", timeAgo: "2h ago", duration: "6m 30s",
  },
  {
    id: "ch4", name: "Lauren Briggs", statusLabel: "Escalated", statusVariant: "critical", redial: true,
    description: "Escalated fraud investigation — 4 suspicious transactions",
    caseId: "CST-27760", channelType: "voice", channelLabel: "Voice", timeAgo: "5h ago", duration: "22m 47s",
  },
  {
    id: "ch5", name: "Mei Tanaka", statusLabel: "Resolved", statusVariant: "success", redial: false,
    description: "Shipping delay — expedited replacement dispatched",
    caseId: "CST-31045", channelType: "chat", channelLabel: "Chat", timeAgo: "1d ago", duration: "9m 15s",
  },
];

const CONTACT_HISTORY_CHANNEL_LABEL: Record<ContactHistoryEntry["channelType"], string> = {
  voice: "Voice",
  chat: "Chat",
  email: "Email",
};

/** Channel-type tag color — Voice/Chat/Email each get one of `Tag`'s fixed
 *  "purple"/"teal"/"pink" accent variants (see CONTRIBUTING.md's "Channel
 *  type colors" convention) rather than a one-off className per row, so
 *  any other spot that adds a channel-type tag later picks the same
 *  mapping instead of inventing its own. */
const CONTACT_HISTORY_CHANNEL_TAG_VARIANT: Record<ContactHistoryEntry["channelType"], TagVariant> = {
  voice: "purple",
  chat: "teal",
  email: "pink",
};

/** Same Voice/Chat/Email → purple/teal/pink mapping as
 *  `CONTACT_HISTORY_CHANNEL_TAG_VARIANT` above, as plain icon-color
 *  classes instead of a `Tag` variant — for spots like
 *  `InteractionsTable`'s per-row type icon, where the channel indicator is
 *  a bare icon (no room for a pill in a 48px column) but should still tint
 *  to the same three hues rather than sitting flat gray. */
const CHANNEL_TYPE_ICON_COLOR_CLASS: Record<ContactHistoryEntry["channelType"], string> = {
  voice: "text-lyra-accent-purple-strong",
  chat: "text-lyra-accent-teal-strong",
  email: "text-lyra-accent-pink-strong",
};

/** Maps a customer's supported `ChannelType[]` (from `CREATE_NEW_CUSTOMERS`,
 *  e.g. `["email", "sms", "voice"]`) down to Contact History's own narrower
 *  channel grouping — voice takes priority (it's what "Redial" needs),
 *  then sms/whatsapp both read as "Chat", falling back to "Email" (every
 *  customer record includes it). */
function contactHistoryChannelType(channels: ChannelType[]): ContactHistoryEntry["channelType"] {
  if (channels.includes("voice")) return "voice";
  if (channels.includes("sms") || channels.includes("whatsapp")) return "chat";
  return "email";
}

/** Shared per-row content shape for every customer-derived (as opposed to
 *  hand-authored, like `CONTACT_HISTORY` above) Contact History row —
 *  everything except what's already on the `CREATE_NEW_CUSTOMERS` record
 *  itself (name/caseId) or derived from it (channelType/channelLabel/
 *  redial, via `contactHistoryChannelType`). */
interface ContactHistoryTemplate {
  statusLabel: string;
  statusVariant: ContactHistoryStatusVariant;
  description: string;
  timeAgo: string;
  duration: string;
}

/** Builds a set of Contact History rows from real `CREATE_NEW_CUSTOMERS`
 *  fixture records — same "deterministic indexes, not `Math.random()`"
 *  convention as the rest of this file's dummy data. `customerIndexes[i]`
 *  pairs with `templates[i]`; `idPrefix` keeps each range's ids from
 *  colliding with another range's (e.g. "Today" vs. "Last 7 days" picking
 *  overlapping customer indexes would otherwise produce duplicate React
 *  keys if both ever rendered in the same list). */
function buildContactHistoryFromCustomers(
  customerIndexes: number[],
  templates: ContactHistoryTemplate[],
  idPrefix: string
): ContactHistoryEntry[] {
  return customerIndexes.map((customerIndex, i) => {
    const customer = CREATE_NEW_CUSTOMERS[customerIndex];
    const channelType = contactHistoryChannelType(customer.channels);
    return {
      id: `${idPrefix}-${customer.id}`,
      name: customer.name,
      // `customer.customerId` is already "CST-…"-prefixed — use it as-is
      // rather than re-prefixing into "CST-CST-…".
      caseId: customer.customerId,
      channelType,
      channelLabel: CONTACT_HISTORY_CHANNEL_LABEL[channelType],
      redial: channelType === "voice",
      // The real `CREATE_NEW_CUSTOMERS` id (e.g. "customer-9") — see
      // `ContactHistoryEntry.customerId`'s own doc comment for why
      // `handleRedial` needs this.
      customerId: customer.id,
      ...templates[i],
    };
  });
}

/** Converts a just-dismissed `ActiveInteraction` into a real Contact History
 *  row — "Unassign & Dismiss"ing a whole assignment (`handleDismissInteraction`,
 *  main component) is the one thing in this demo that actually completes a
 *  contact, so it's the one thing that logs a row here, prepended onto
 *  `dismissedContactHistory` (newest first, same descending-recency order
 *  every other range's own rows already read in). Ending just ONE channel of
 *  a card that's still otherwise open (`handleDismissChannel`) does NOT call
 *  this — the interaction as a whole isn't actually over yet, so there's
 *  nothing to log.
 *
 *  This row's status reflects whatever was actually last assigned to this
 *  interaction's primary channel, NOT a hardcoded default: `statusLabel:
 *  interaction.channelStatuses?.[primaryChannel?.id] ?? "Resolved"` (falls
 *  back to "Resolved" — the same neutral default every hand-authored
 *  `CONTACT_HISTORY` row's own "closed the loop" case uses — only if the
 *  agent never actually touched the status popover this visit for that
 *  channel), `statusVariant` resolved from that label via
 *  `SESSION_STATUS_TO_CONTACT_HISTORY_VARIANT`. Per explicit request: an
 *  assignment that was left at, say, "Escalated" or "Pending" when
 *  dismissed should log — and later reopen — AT that status, not silently
 *  reset to "Resolved". This is still a different thing from the OLDER
 *  "force `closed: true`" mistake documented below: the primary channel's
 *  status can legitimately BE "Closed" (the agent closed the contact
 *  themselves before dismissing), but that's what they actually chose, not
 *  something this function invents on their behalf — `closed`/
 *  `ActiveInteraction.closed` (the read-only-reopen flag) is still left
 *  unset entirely regardless of what that status says, so reopening this row later
 *  (`handleReopenContactHistoryEntry`) behaves like any other normal,
 *  reply-able row (able to change status again, composer available) — no
 *  forced read-only banner, even for a "Closed"-status row. An earlier pass
 *  forced `statusLabel: "Closed"` AND `closed: true` together here; per
 *  explicit follow-up, leaving an assignment (a LeftNav/UI action) must not
 *  itself decide or invent that assignment's own status OR its read-only-
 *  ness — both of those are governed entirely by what the agent actually
 *  did (the status popover) before dismissing, not by the act of dismissing
 *  itself. `customerId` is only set when `interaction.id` actually matches a
 *  real `CREATE_NEW_CUSTOMERS` id shape (`"customer-N"`) — an interaction
 *  started from an agent/team/skill/quick-dial/redial contact has no real
 *  customer record behind it, and `ContactHistoryEntry.customerId`'s own doc
 *  comment is specific about what this field means. */
/** Drops a single channel id's entry out of a `channelStatuses` map, leaving
 *  every other channel's own status untouched — used by `handleStartCall`
 *  when a channel is restarted at the SAME address (so it reuses
 *  `TrackedChannel.id`, per that field's own doc comment): without this, a
 *  channel that was previously set to "Closed" and then redialed at the same
 *  number would silently reopen still reading "Closed" under its reused id,
 *  since nothing would otherwise clear the stale entry. Returns `undefined`
 *  (rather than an empty object) when the map is empty afterward, matching
 *  `ActiveInteraction.channelStatuses`'s own optional-when-nothing-set
 *  convention. */
function withoutChannelStatus(
  statuses: Record<string, string> | undefined,
  channelId: string
): Record<string, string> | undefined {
  if (!statuses || !(channelId in statuses)) return statuses;
  const { [channelId]: _omit, ...rest } = statuses;
  return Object.keys(rest).length > 0 ? rest : undefined;
}

function buildDismissedContactHistoryEntry(interaction: ActiveInteraction, clockTick: number): ContactHistoryEntry {
  const channelType = contactHistoryChannelType(interaction.channels.map((c) => c.type));
  const primaryChannel = interaction.channels.find((c) => c.type === channelType) ?? interaction.channels[0];
  const earliestStart =
    interaction.channels.length > 0 ? Math.min(...interaction.channels.map((c) => c.startTick)) : clockTick;
  const statusLabel = interaction.channelStatuses?.[primaryChannel?.id ?? ""] ?? "Resolved";
  return {
    id: `dismissed-${interaction.id}-${Date.now()}`,
    name: interaction.customerName ?? "Customer",
    statusLabel,
    statusVariant: SESSION_STATUS_TO_CONTACT_HISTORY_VARIANT[statusLabel] ?? "success",
    redial: channelType === "voice",
    description: primaryChannel?.preview
      ? `${primaryChannel.preview} — ${statusLabel.toLowerCase()} and dismissed by agent`
      : `${statusLabel} and dismissed by agent`,
    caseId: interaction.recordId,
    channelType,
    channelLabel: CONTACT_HISTORY_CHANNEL_LABEL[channelType],
    timeAgo: "Just now",
    duration: formatElapsedTime(clockTick - earliestStart),
    customerId: /^customer-\d+$/.test(interaction.id) ? interaction.id : undefined,
  };
}

// Fixed customer indexes + content templates for the 5 extra rows that
// appear once "Last 72 Hours" is selected (on top of "Last 48 Hours"'s own
// today+yesterday rows) — deterministic (not `Math.random()`), matching
// the rest of this file's dummy-data convention. Names/case IDs come from
// the real `CREATE_NEW_CUSTOMERS` records at these indexes; only the
// description/status/timing are authored here. `timeAgo` is capped at
// "2d ago" (hour 49-72 of the window: today=hours 0-24, yesterday=hours
// 24-48, this batch=hours 48-72) so nothing in "Last 72 Hours" reads as
// older than its own label.
const EXTENDED_CONTACT_HISTORY_CUSTOMER_INDEXES = [5, 12, 19, 26, 33];
const EXTENDED_CONTACT_HISTORY_TEMPLATES: ContactHistoryTemplate[] = [
  { statusLabel: "Resolved", statusVariant: "success", description: "Password reset — identity verified via KBA, access restored", timeAgo: "1d ago", duration: "7m 40s" },
  { statusLabel: "Resolved", statusVariant: "success", description: "Billing question — walked through recent charges, no refund needed", timeAgo: "1d ago", duration: "5m 18s" },
  { statusLabel: "Escalated", statusVariant: "critical", description: "Product setup issue escalated to Tier 2 for configuration support", timeAgo: "2d ago", duration: "14m 05s" },
  { statusLabel: "Resolved", statusVariant: "success", description: "Subscription cancellation request — retention offer accepted", timeAgo: "2d ago", duration: "10m 52s" },
  { statusLabel: "Resolved", statusVariant: "success", description: "Shipping delay follow-up — updated delivery window provided", timeAgo: "2d ago", duration: "4m 27s" },
];
const EXTENDED_CONTACT_HISTORY: ContactHistoryEntry[] = buildContactHistoryFromCustomers(
  EXTENDED_CONTACT_HISTORY_CUSTOMER_INDEXES,
  EXTENDED_CONTACT_HISTORY_TEMPLATES,
  "ch-ext"
);

/** Contact History's own date filter — deliberately a separate type/value
 *  set from the shared `DateFilterValue` (Today/Yesterday/Last 7 days/
 *  Custom) the Productivity/Performance cards' `DateFilterChip` uses: this
 *  card only ever wants 3 cumulative, "as of now" windows, no custom range
 *  picker. Reusing `DateFilterValue` here would either force those other
 *  two cards' filter to change too (they weren't asked to) or require
 *  awkwardly repurposing "yesterday"/"last7" values to mean something else
 *  than their names say. */
type ContactHistoryDateFilterValue = "today" | "last48h" | "last72h";

const CONTACT_HISTORY_DATE_FILTER_OPTIONS: { value: ContactHistoryDateFilterValue; label: string }[] = [
  { value: "today",   label: "Today" },
  { value: "last48h", label: "Last 48 Hours" },
  { value: "last72h", label: "Last 72 Hours" },
];

/* Each range is cumulative (a superset of the one before it) — "Last 48
   Hours" is today's rows plus yesterday's, "Last 72 Hours" adds the day
   before that on top — rather than each range being its own disjoint
   bucket the way the old Today/Yesterday/Last 7 days setup was (selecting
   "Last 7 days" there dropped today's own rows entirely, which read as a
   bug once the range names started actually promising "the last N hours"
   instead of a single day or a disjoint window).

   "Today" is `dismissedContactHistory` (main component) — real, agent-
   dismissed assignments (`buildDismissedContactHistoryEntry`), empty until
   the agent actually dismisses one; there's no real backend here to have
   loaded any actual prior-contact history from, so it starts genuinely
   empty rather than pretending otherwise with hand-authored placeholder
   rows the way it used to (a `TODAY_CONTACT_HISTORY` fixture, since
   removed). A function, not a static object, so it can be recomputed as
   that state grows — called from `AgentNextGenPage` inside a `useMemo`
   keyed on `dismissedContactHistory`. */
function buildContactHistoryByRange(
  dismissedContactHistory: ContactHistoryEntry[]
): Record<ContactHistoryDateFilterValue, ContactHistoryEntry[]> {
  return {
    today: dismissedContactHistory,
    last48h: [...dismissedContactHistory, ...CONTACT_HISTORY],
    last72h: [...dismissedContactHistory, ...CONTACT_HISTORY, ...EXTENDED_CONTACT_HISTORY],
  };
}

/* Same trigger/popover chrome as `DateFilterChip` above (filterChipVariants
   "default" trigger, RadioGroup popover) but for `ContactHistoryDateFilterValue`
   specifically and with no "Custom" branch/DateRangePicker — kept as its own
   small component rather than genericizing `DateFilterChip` itself, since
   the two have different value sets and this one is intentionally simpler
   (no custom-range case to handle). */
function ContactHistoryDateFilterChip({ onValueChange }: { onValueChange?: (value: ContactHistoryDateFilterValue) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<ContactHistoryDateFilterValue>("today");

  const selectedLabel = CONTACT_HISTORY_DATE_FILTER_OPTIONS.find((o) => o.value === value)?.label ?? "";

  const handleValueChange = (v: ContactHistoryDateFilterValue) => {
    setValue(v);
    onValueChange?.(v);
  };

  return (
    // See `DateFilterChip`'s identical Tooltip-wraps-Popover composition
    // above (CONTRIBUTING.md §16) for why this is structured outside-in.
    <Tooltip content={`Date filter: ${selectedLabel}`} placement="bottom" disabled={open}>
      <span className="inline-flex">
        <Popover
          open={open}
          onOpenChange={setOpen}
          placement="bottom"
          content={
            <div className="flex flex-col gap-3 p-3 w-[260px]">
              <RadioGroup value={value} onValueChange={(v) => handleValueChange(v as ContactHistoryDateFilterValue)}>
                {CONTACT_HISTORY_DATE_FILTER_OPTIONS.map((option) => (
                  <RadioGroupItem key={option.value} value={option.value} label={option.label} />
                ))}
              </RadioGroup>
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

function ContactHistoryCard({
  onRedial,
  onReopen,
  historyByRange,
}: {
  onRedial?: (entry: ContactHistoryEntry) => void;
  /** Fired by clicking anywhere on a row OTHER than the "Redial" button
   *  (which keeps its own distinct behavior — starting a fresh voice call,
   *  not viewing this past interaction) — reopens it via
   *  `handleReopenContactHistoryEntry` (main component). */
  onReopen?: (entry: ContactHistoryEntry) => void;
  /** Built by `buildContactHistoryByRange` (main component, via `useMemo`
   *  keyed on `dismissedContactHistory`) — passed down rather than read
   *  from a module-level constant, since "Today" is real, growing state
   *  (see this card's own doc comment above), not a fixed fixture. */
  historyByRange: Record<ContactHistoryDateFilterValue, ContactHistoryEntry[]>;
}) {
  const [dateFilter, setDateFilter] = useState<ContactHistoryDateFilterValue>("today");
  const [searchQuery, setSearchQuery] = useState("");
  const entries = historyByRange[dateFilter];

  // Filters the already date-ranged `entries` down to whatever matches the
  // search box — name, case ID, channel, or the one-line case summary, so
  // a query like "billing" or "CST-30164" both find their row. Case-
  // insensitive substring match, same convention as every other quick
  // search in this app (e.g. `DesktopDesignsPage`'s table toolbar).
  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) =>
      [entry.name, entry.description, entry.caseId, entry.channelLabel].some((field) =>
        field.toLowerCase().includes(query)
      )
    );
  }, [entries, searchQuery]);

  return (
    <DashboardCard
      variant="neutral-subtle"
      headerTitle="Contact History"
      headerIcon={<Icon icon={History} size="md" background="info" shape="rounded" decorative />}
      headerActionsWrap
      // Two real `SearchInput`s, both bound to the same `searchQuery` state
      // — one lives in `headerActions` (visible ≥480px, inline beside the
      // date filter), the other in `headerTabs` (visible <480px, its own
      // full-width row below the title). CSS toggles which one shows (see
      // lyra-tokens.css's "Search inline/below" family); the date filter
      // chip stays in `headerActions` either way and never moves — only
      // search needed room, so search is the only thing that relocates
      // (confirmed from a screenshot: forcing the whole actions block to
      // move together, the previous approach, shoved a lone filter chip
      // onto its own line even on cards with no search box at all).
      headerActions={
        <>
          <SearchInput
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Search contact history"
            size="sm"
            className="lyra-container-header-search-inline flex-1 min-w-[240px]"
          />
          <ContactHistoryDateFilterChip onValueChange={setDateFilter} />
        </>
      }
      headerTabs={
        // The `-search-below` toggle class goes on this plain OUTER div,
        // not on `SearchInput`'s own className — `SearchInput`'s root is
        // itself `position: relative` and its search icon is positioned
        // `absolute left-3` against that same box, so padding added
        // directly to `SearchInput`'s className would shift the padding
        // edge the icon measures from, throwing the icon out of alignment
        // with the input's own baked-in `pl-9` text padding. Padding lives
        // out here instead, where it can't affect that inner math.
        //
        // `pt-3` — `ContainerHeader`'s `tabs` slot (which this reuses, see
        // its own doc comment) drops the header's normal bottom padding to
        // 0 whenever `tabs` is set, on the assumption its content (usually
        // a `TabList`) supplies its own visual separation via a `border-b`.
        // A `SearchInput` has no such border, so without this it sat
        // flush against the title row above it — confirmed from a
        // screenshot. Plain static padding, not container-query-gated:
        // this whole div is already only visible in the narrow state (see
        // `.lyra-container-header-search-below` in lyra-tokens.css), so
        // there's no "wide" state where this padding needs to disappear.
        <div className="lyra-container-header-search-below px-4 pt-3 pb-3">
          <SearchInput
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Search contact history"
            size="sm"
            className="w-full"
          />
        </div>
      }
    >
      {filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
          <Inbox className="h-6 w-6 text-lyra-fg-secondary" strokeWidth={1.5} aria-hidden="true" />
          <span className="lyra-body-md text-lyra-fg-secondary">
            {entries.length === 0 ? "Nothing to Display" : "No matching contacts"}
          </span>
        </div>
      ) : (
        <div className="flex flex-col">
          {filteredEntries.map((entry, i) => {
            const ChannelIcon = CONTACT_HISTORY_CHANNEL_ICON[entry.channelType];
            return (
              <div
                key={entry.id}
                role={onReopen ? "button" : undefined}
                tabIndex={onReopen ? 0 : undefined}
                onClick={() => onReopen?.(entry)}
                onKeyDown={(e) => {
                  if (onReopen && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onReopen(entry);
                  }
                }}
                className={cn(
                  "flex items-start justify-between gap-4 px-4 py-4 transition-colors hover:bg-lyra-state-hover",
                  onReopen && "cursor-pointer",
                  i > 0 && "border-t border-lyra-border-subtle"
                )}
              >
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="lyra-body-md-emphasis text-lyra-fg-default">{entry.name}</span>
                    {/* Status badge — dot + label, matching the reference
                        screenshot's status-dropdown rows (colored dot,
                        plain text, no pill background) rather than Tag's
                        bordered/tinted pill: critical=red (Escalated),
                        info=blue (In Progress), success=green (Resolved),
                        neutral=gray (New). */}
                    <span className="inline-flex items-center gap-1.5">
                      <Badge shape="circle" dot size="sm" variant={entry.statusVariant} aria-hidden="true" />
                      <span className="lyra-body-sm-emphasis text-lyra-fg-default">{entry.statusLabel}</span>
                    </span>
                    {entry.redial && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          // Redial starts a fresh voice call (`handleRedial`)
                          // — a distinct action from reopening this row to
                          // view/continue the past interaction itself, which
                          // is what the row's own `onClick` above does.
                          // Without stopping propagation, clicking Redial
                          // would fire both.
                          e.stopPropagation();
                          onRedial?.(entry);
                        }}
                      >
                        <PhoneOutgoing className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Redial
                      </Button>
                    )}
                  </div>
                  <span className="lyra-body-md text-lyra-fg-secondary">{entry.description}</span>
                  <span className="lyra-body-sm text-lyra-fg-secondary">{entry.caseId}</span>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {/* Channel-type pill — "purple"/"teal"/"pink" per
                      CONTACT_HISTORY_CHANNEL_TAG_VARIANT (Voice/Chat/
                      Email), matching the same three `lyra-accent-*`
                      hues CONTRIBUTING.md's "Channel type colors"
                      convention documents, not a one-off tint. */}
                  <Tag
                    label={entry.channelLabel}
                    variant={CONTACT_HISTORY_CHANNEL_TAG_VARIANT[entry.channelType]}
                    shape="pill"
                    icon={<ChannelIcon strokeWidth={1.5} />}
                  />
                  <span className="lyra-body-sm text-lyra-fg-secondary whitespace-nowrap">{entry.timeAgo}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}

/* ── CustomersListView ──
   Contacts list view populating the Dashboard tab row's "Customers" tab
   (`activeDeskTab === "customers"`, see the render branch below). Row
   data now comes from lyra-ui's own shared `CREATE_NEW_CUSTOMERS` fixture
   (`@nicecxone/lyra-ui/customers-data`, already imported above for the
   Outbound picker) instead of a hand-transcribed screenshot table, so
   this list view can't drift out of sync with lyra-ui's "customer
   database" — see create-new-customers-data.ts, which now carries
   firstName/lastName/group/firstPhone/emailAddress/address1/city/state/
   postalCode fields (added alongside its pre-existing id/name/customerId/
   channels/avatarClassName) specifically so this table has real columns
   to render.

   The UI itself is a direct, trimmed port of lyra-ui's own "Data
   Management" template (DataManagement.stories.tsx's
   `DataManagementTemplate`) — same state shape (`sortKey`/`sortDir`/
   `handleSort`/`dirFor`, `useColumnReorder`, `visibleCols`/
   `ColumnToggle`, `filterValues`/`filterDefs`, row-selection
   `Checkbox`es, real `currentPage`/`rowsPerPage`-driven pagination),
   same `columnConfig: Record<Key, {label, flex}>` shape (proportional
   `flex-[n]` ratios, no per-column `min-w-[…]` floor — that floor is
   what made the table wider than its container earlier), same render
   shape (`TableToolbar` → `Table` → `TableFooter`). Left out: the
   template's own `PageHeader`/`SidePanel`/`TabList`/grouping/auto-fit —
   this embeds inside `AgentNextGenPage`'s own PageHeader/tab row, which
   already cover that job, and grouping/auto-fit weren't asked for. */

interface CustomerListRecord {
  contactNumber: string;
  /** Which channels this customer can be reached on — same field lyra-ui's
   *  Outbound picker already uses for its own per-row hover flyout (see
   *  create-new-customers-data.ts). Rendered here as hover-reveal
   *  `ActionIconButton`s instead of a Menu flyout — see
   *  `CustomerChannelCell` below. */
  channels: ChannelType[];
  firstName: string;
  lastName: string;
  group: string;
  firstPhone: string;
  emailAddress: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  originalCustomerId: string;
  dateOfBirth: string;
  agent: string;
  agentTeam: string;
  paymentBalance: string;
}

// Mapped 1:1 from lyra-ui's `CREATE_NEW_CUSTOMERS` — `customerId` (e.g.
// "CST-10000") becomes this table's "Contact Number" column, everything
// else is a passthrough of the matching field already on that record.
const CUSTOMER_LIST_RECORDS: CustomerListRecord[] = CREATE_NEW_CUSTOMERS.map((c: CreateNewCustomerRecord) => ({
  contactNumber: c.customerId,
  channels: c.channels,
  firstName: c.firstName,
  lastName: c.lastName,
  group: c.group,
  firstPhone: c.firstPhone,
  emailAddress: c.emailAddress,
  address1: c.address1,
  city: c.city,
  state: c.state,
  postalCode: c.postalCode,
  originalCustomerId: c.originalCustomerId,
  dateOfBirth: c.dateOfBirth,
  agent: c.agent,
  agentTeam: c.agentTeam,
  paymentBalance: c.paymentBalance,
}));

// The table's actual rendered columns — deliberately NOT `keyof
// CustomerListRecord` (`CUSTOMER_COLUMN_CONFIG` below is a per-COLUMN
// config, one entry per key here, and needs to stay exhaustive over
// exactly this set). originalCustomerId/dateOfBirth/agent/agentTeam/
// paymentBalance are real `CustomerListRecord` fields but intentionally
// filter-only, not columns — see `CustomerFilterKey` below, which does
// cover them.
type CustomerColKey =
  | "contactNumber"
  | "channels"
  | "firstName"
  | "lastName"
  | "group"
  | "firstPhone"
  | "emailAddress"
  | "address1"
  | "city"
  | "state"
  | "postalCode";
/** Every filterable string field on `CustomerListRecord` — everything
 *  except `channels` (a `ChannelType[]`, not a plain string value a
 *  checkbox-style `FilterChip` can compare against). Wider than
 *  `CustomerColKey` on purpose: the "+ Filter" menu can filter on fields
 *  (e.g. Original customer ID, Date of birth, Agent, Agent team, Payment
 *  balance) that aren't rendered as their own table column. */
type CustomerFilterKey = Exclude<keyof CustomerListRecord, "channels">;

// Fixed left-to-right channel order the hover flyout renders in — only
// channels the row's own `channels` array actually includes are shown
// ("only supported channels show", same rule as the Outbound picker).
const CUSTOMER_CHANNEL_ORDER: ChannelType[] = ["voice", "sms", "email", "whatsapp"];

/** Which field the launch popover's address dropdown shows for a given
 *  channel — email uses the row's `emailAddress`, voice/sms use its
 *  `firstPhone`, WhatsApp uses a synthesized `@FirstName LastName` handle
 *  (see below) rather than either of those. This dataset only carries one
 *  number/address per customer (unlike the full Outbound picker's
 *  `resolveOutboundDetailField`, which juggles several candidate numbers),
 *  so there's just one option to offer either way.
 *
 *  WhatsApp used to fall into the same `firstPhone` branch as voice/sms —
 *  a real, confirmed bug: this table's own database (`CREATE_NEW_CUSTOMERS`,
 *  `create-new-customers-data.ts`) has no `whatsappHandle`-style field to
 *  read a real one from, so the launch popover's "Select Phone" field
 *  listed this row's plain phone number (and, via `addressOptionsForChannel`
 *  below, the same shared `OUTBOUND_CONFIG.phoneOptions` pool every OTHER
 *  phone-based channel offers) for a channel that isn't actually reached by
 *  phone number at all. `@${row.firstName} ${row.lastName}` mirrors the
 *  exact synthesis lyra-ui's own `resolveOutboundDetailField` already uses
 *  for the real "New Outbound" launch flow (`create-new.tsx`,
 *  `channel === "whatsapp"` branch: `` `@${contact.name}` `` — the same
 *  "no real per-contact handle field exists yet" gap that function's own
 *  doc comment documents) so this table's picker maps to the exact same
 *  handle the rest of the app would derive for this same customer, instead
 *  of a second, disconnected value. */
function customerChannelAddress(row: CustomerListRecord, channel: ChannelType): { label: string; value: string } {
  if (channel === "email") return { label: "Select Email Address", value: row.emailAddress };
  if (channel === "whatsapp") return { label: "Select WhatsApp Handle", value: `@${row.firstName} ${row.lastName}` };
  return { label: "Select Phone", value: row.firstPhone };
}

/** Every known address this row can be reached at for a given channel —
 *  the row's own number/email/handle first (same value
 *  `customerChannelAddress` returns), then, for PHONE-based channels only
 *  (voice/sms — NOT WhatsApp, see below), the same shared fallback pool
 *  (`OUTBOUND_CONFIG.phoneOptions`) already offered everywhere else a phone
 *  number needs to be picked (e.g. the `CreateNew` outbound picker's own
 *  "Select Phone" screen) — deduped so the row's own number isn't listed
 *  twice if it happens to coincide with a pool entry. Without this, a
 *  channel type already open on its ONE known number read as fully
 *  exhausted here even though the very same contact still has other real
 *  numbers reachable elsewhere in the app (caught from a screenshot of
 *  Sarah Miller's SMS icon disappearing entirely despite her own "Add
 *  Channel" picker still listing 3 more unused numbers). Email and
 *  WhatsApp both have no such shared pool — a customer only ever has the
 *  one address/handle on file for either (WhatsApp's is synthesized, see
 *  `customerChannelAddress`'s own doc comment, but is still just the one
 *  value) — `OUTBOUND_CONFIG.phoneOptions` is a pool of raw PHONE numbers
 *  specifically, and mixing WhatsApp's own handle-shaped value into that
 *  pool (its pre-existing behavior) offered actual phone numbers as
 *  "WhatsApp handles," which was the bug this whole function got rewritten
 *  to fix. */
function addressOptionsForChannel(row: CustomerListRecord, channel: ChannelType): { value: string; label: string }[] {
  const own = customerChannelAddress(row, channel);
  const options = own.value ? [{ value: own.value, label: own.value }] : [];
  if (channel === "email" || channel === "whatsapp") return options;
  for (const opt of OUTBOUND_CONFIG.phoneOptions) {
    if (!options.some((o) => o.value === opt.value)) options.push(opt);
  }
  return options;
}

/** Shared "Select Channel / Select Phone (or Email) / Outbound Skill /
 *  Start Interaction" popover body — same shape as lyra-ui's own
 *  `OutboundAddButton` (create-new.tsx), composed here from the same
 *  primitives (`Popover`/`RadioButtonGroup`/`Select`/`Button`) rather than
 *  imported directly, since `OutboundAddButton`'s own trigger is a fixed
 *  "+" icon it can't swap out. Extracted into its own component (rather
 *  than living inline in `CustomerChannelPopoverButton`) so both that
 *  per-channel-icon trigger AND `CustomerAddChannelButton`'s single
 *  generic header trigger can share one copy of this form instead of
 *  each hand-rolling their own. Reuses `OUTBOUND_CONFIG.skillOptions` so
 *  the skill list can't drift from the real Outbound picker's own list.
 *  `placement="bottom"` is only a preferred side — `Popover`'s underlying
 *  Radix collision detection (`avoidCollisions`, see popover.tsx) flips it
 *  above the trigger automatically when there isn't room below. */
function CustomerChannelPicker({
  row,
  defaultChannel,
  available,
  openAddresses = {},
  onStartInteraction,
  trigger,
  open,
  onOpenChange,
}: {
  row: CustomerListRecord;
  /** Which channel the form starts on when opened — the clicked icon's own
   *  channel for `CustomerChannelPopoverButton`, or simply `available[0]`
   *  for `CustomerAddChannelButton`'s single generic trigger. */
  defaultChannel: ChannelType;
  available: ChannelType[];
  /** Address values already open on THIS interaction, keyed by channel
   *  type — subtracted from `addressOptionsForChannel`'s full pool so an
   *  agent can't pick a number/address that's already an open channel
   *  (would just duplicate it) while still seeing/picking any other real
   *  one that isn't. Omitted entirely by `CustomerChannelCell`'s Customers-
   *  table usage, where there's no active interaction to already have
   *  channels open against — defaults to `{}` (nothing excluded) there. */
  openAddresses?: Partial<Record<ChannelType, string[]>>;
  onStartInteraction: (contact: CreateNewOutboundContact, channel: ChannelType, phone: string, skillId: string) => void;
  trigger: React.ReactNode;
  /** Open state lives in whichever wrapper renders `trigger` (not in here),
   *  so that wrapper's own `aria-expanded`/hover-fade styling reads the
   *  exact same real open state `Popover` itself uses, instead of each
   *  keeping its own disconnected copy. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>(defaultChannel);
  const [address, setAddress] = useState("");
  const [skillId, setSkillId] = useState("");

  // Every real address for a channel MINUS whichever of those are already
  // open on this interaction — see `openAddresses`'s own doc comment above.
  // An empty result means this channel is genuinely exhausted (every known
  // number/address for it is already an open channel), not merely that one
  // particular number happens to be taken.
  const remainingOptionsFor = (channel: ChannelType) =>
    addressOptionsForChannel(row, channel).filter((o) => !(openAddresses[channel] ?? []).includes(o.value));

  // Re-derive every time this popover opens (not just on first mount) —
  // same "only once actually open" timing `OutboundAddButton` uses (see its
  // own effect comments), and for the same reason: this popover instance is
  // reused across every open of its trigger, so a stale channel/skill from
  // a previous open needs to be overwritten before the fields render again.
  useEffect(() => {
    if (!open) return;
    setSelectedChannel(defaultChannel);
    setSkillId("");
  }, [open, defaultChannel]);

  useEffect(() => {
    if (!open) return;
    setAddress(remainingOptionsFor(selectedChannel)[0]?.value ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedChannel, row, openAddresses]);

  const fieldMeta = customerChannelAddress(row, selectedChannel);
  const remainingOptions = remainingOptionsFor(selectedChannel);
  // No real, still-unused phone/email left for this channel — true both
  // for a customer record with a blank `firstPhone`/`emailAddress` on file
  // AND for a real row whose only known number(s) are already open as other
  // channels on this same interaction. Gates the address field and Start
  // Interaction button below so an agent can't select a channel that looks
  // available but has nothing real (or nothing UNUSED) behind it and
  // silently no-ops on click — see this component's own
  // `handleStartInteraction` guard, which already fails the same way but
  // with no visible signal.
  const hasAddress = remainingOptions.length > 0;

  const handleStartInteraction = () => {
    if (!skillId || !hasAddress) return;
    // `OUTBOUND_CUSTOMERS` is built 1:1 (same order, same underlying
    // record) from the exact same `CREATE_NEW_CUSTOMERS` fixture
    // `CUSTOMER_LIST_RECORDS` maps into `row` from — its `subtitle` field
    // is that customer's `customerId`, i.e. exactly this row's own
    // `contactNumber` (see `CUSTOMER_LIST_RECORDS`'s own mapping comment
    // above) — so this reliably finds the matching `CreateNewOutboundContact`
    // `handleStartCall` needs, without this table needing its own parallel
    // copy of that lookup/contact-shape logic.
    const contact = OUTBOUND_CUSTOMERS.find((c: CreateNewOutboundContact) => c.subtitle === row.contactNumber);
    if (!contact) return;
    onStartInteraction(contact, selectedChannel, address, skillId);
    onOpenChange(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      placement="bottom"
      sideOffset={4}
      showArrow={false}
      onOpenAutoFocus={(e: Event) => e.preventDefault()}
      className="w-64"
      bodyPadding={false}
      content={
        // `onClick` stopPropagation below — this content renders through a
        // Radix portal (outside the row's DOM subtree), but React bubbles
        // portal events along the *React* tree, not the DOM tree, so a
        // click anywhere in here (a radio option, a Select option — even
        // though `Select`'s own listbox is a further-nested portal, it's
        // still a React descendant of this div) would otherwise keep
        // bubbling up through `CustomerChannelPopoverButton` into the
        // `TableRow`'s own `onClick`, toggling the Customer Information
        // panel open/closed on every field interaction. The trigger icon
        // already stops propagation on itself (see
        // `CustomerChannelPopoverButton`) for the same reason, but that
        // only covers the click that opens the popover, not clicks made
        // once it's open.
        <div className="w-64 p-3 space-y-3" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <RadioButtonGroup
            label="Select Channel"
            // Disables (rather than hides) whichever channel options have
            // no real, still-unused phone/email left for this row — same
            // `remainingOptionsFor` lookup the address Select below uses.
            // Kept selectable-looking-but-blocked instead of removed from
            // the list entirely so the agent can still see every channel
            // type this contact is nominally reachable on, just not
            // proceed past it once every real address for that type is
            // either unknown or already open elsewhere on this interaction
            // — the Select/Start Interaction gating below (`hasAddress`)
            // is the same signal, just surfaced one step earlier.
            options={available.map((c) => ({
              value: c,
              label: CHANNEL_ICON_META[c].label,
              disabled: remainingOptionsFor(c).length === 0,
            }))}
            value={selectedChannel}
            onValueChange={(v: string) => setSelectedChannel(v as ChannelType)}
          />
          <Select
            label={fieldMeta.label}
            value={hasAddress ? address || undefined : undefined}
            onValueChange={setAddress}
            disabled={!hasAddress}
            placeholder={
              hasAddress
                ? undefined
                : `No ${
                    selectedChannel === "email"
                      ? "email address"
                      : selectedChannel === "whatsapp"
                      ? "WhatsApp handle"
                      : "unused phone number"
                  } available`
            }
            options={remainingOptions}
          />
          <Select
            label="Outbound Skill"
            placeholder="Select Outbound Skill"
            value={skillId || undefined}
            onValueChange={setSkillId}
            options={OUTBOUND_CONFIG.skillOptions}
          />
          <Button
            variant="default"
            size="lg"
            className="w-full"
            disabled={!skillId || !hasAddress}
            onClick={handleStartInteraction}
          >
            Start Interaction
          </Button>
        </div>
      }
    >
      {trigger}
    </Popover>
  );
}

/** One hover-reveal channel icon in a Customers row — thin wrapper around
 *  `CustomerChannelPicker`, anchored to whichever icon was actually
 *  clicked and defaulted to that icon's own channel (unlike
 *  `CustomerAddChannelButton`'s single generic trigger). */
function CustomerChannelPopoverButton({
  row,
  channel,
  available,
  onStartInteraction,
}: {
  row: CustomerListRecord;
  channel: ChannelType;
  available: ChannelType[];
  onStartInteraction: (contact: CreateNewOutboundContact, channel: ChannelType, phone: string, skillId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = CHANNEL_ICON_META[channel];
  return (
    <CustomerChannelPicker
      row={row}
      defaultChannel={channel}
      available={available}
      onStartInteraction={onStartInteraction}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <ActionIconButton
          size="sm"
          title={meta.label}
          aria-expanded={open}
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => e.stopPropagation()}
          className={cn(
            "transition-opacity",
            // Stays visible/interactive whenever ITS OWN popover is open —
            // moving the pointer off the row and into the popover's content
            // (portalled outside the row, so `group-hover` alone would end)
            // shouldn't fade the trigger out from under an open popover, same
            // "force visible while open" rule the message-bubble Copy/Add-tag
            // toolbar and its TagPicker popover already use elsewhere in this
            // file.
            !open &&
              "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
          )}
        >
          {meta.icon}
        </ActionIconButton>
      }
    />
  );
}

/** Single, always-visible "Add channel" header action for
 *  `CustomerRowInfoPanel` — opens the exact same channel-picker popover as
 *  the table row's own per-channel hover icons (`CustomerChannelPopoverButton`),
 *  just from one generic trigger instead of one icon per supported channel,
 *  since the panel header has room for exactly one such button. Defaults to
 *  the row's first supported channel (`CUSTOMER_CHANNEL_ORDER` order, same
 *  as `CustomerChannelCell` below) — the agent can still switch channels via
 *  the popover's own "Select Channel" field once it's open. */
function CustomerAddChannelButton({
  row,
  onStartInteraction,
}: {
  /** `null` while `CustomerRowInfoPanel` is closed (its header still mounts
   *  during the close animation — see that component's own render) — there's
   *  no record to add a channel to yet, so this just renders disabled. */
  row: CustomerListRecord | null;
  onStartInteraction: (contact: CreateNewOutboundContact, channel: ChannelType, phone: string, skillId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const available = row ? CUSTOMER_CHANNEL_ORDER.filter((c) => row.channels.includes(c)) : [];
  if (!row || available.length === 0) {
    return (
      <ActionIconButton title="Add channel" disabled>
        <MessageSquarePlus className="h-4 w-4" />
      </ActionIconButton>
    );
  }
  return (
    <CustomerChannelPicker
      row={row}
      defaultChannel={available[0]}
      available={available}
      onStartInteraction={onStartInteraction}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <ActionIconButton title="Add channel" aria-expanded={open}>
          <MessageSquarePlus className="h-4 w-4" />
        </ActionIconButton>
      }
    />
  );
}

/** Hover-reveal channel icons for a row's supported channels — reuses
 *  lyra-ui's own `CHANNEL_TYPE_META` icon/label map (channel-row.tsx) so
 *  the icon-per-channel choice stays identical to every other channel
 *  picker in the app, rather than redeclaring Phone/Mail/MessageSquare/
 *  WhatsAppIcon here. Each icon opens its own launch popover — see
 *  `CustomerChannelPopoverButton`. Fades in on row hover/focus-within,
 *  matching the Copy/Add-tag hover-toolbar convention used on conversation
 *  bubbles elsewhere in this file; the row itself needs `className="group"`
 *  for this to fire (added on `TableRow` below). */
function CustomerChannelCell({
  row,
  onStartInteraction,
}: {
  row: CustomerListRecord;
  onStartInteraction: (contact: CreateNewOutboundContact, channel: ChannelType, phone: string, skillId: string) => void;
}) {
  const available = CUSTOMER_CHANNEL_ORDER.filter((c) => row.channels.includes(c));
  if (available.length === 0) {
    return <span className="lyra-body-sm text-lyra-fg-disabled">—</span>;
  }
  return (
    <div className="flex items-center gap-1">
      {available.map((c) => (
        <CustomerChannelPopoverButton
          key={c}
          row={row}
          channel={c}
          available={available}
          onStartInteraction={onStartInteraction}
        />
      ))}
    </div>
  );
}

function nextCustomerSortDirection(current: SortDirection): SortDirection {
  if (current === null) return "asc";
  if (current === "asc") return "desc";
  return null;
}

// Proportional `flex-[n]` ratios — same shape as DataManagement.stories.tsx's
// own `columnConfig` — so the table shrinks/grows to fill exactly whatever
// width is available. `minWidth`/`minWidthPx` are a per-column readability
// floor (same px value, once as a Tailwind class for the cell itself, once
// as a plain number so `CustomersListView` can sum the visible columns and
// feed the total to `<Table style={{ minWidth }}>` — see the long comment
// down there for why the *cell-level* class alone isn't enough to get a
// real horizontal scrollbar here). (Class strings are written out in full,
// not built from the numbers via template literals — Tailwind's build only
// picks up `min-w-[…]` utilities that appear literally in source.)
const CUSTOMER_COLUMN_CONFIG: Record<CustomerColKey, { label: string; flex: string; minWidth: string; minWidthPx: number }> = {
  contactNumber: { label: "Contact Number", flex: "flex-1",      minWidth: "min-w-[120px]", minWidthPx: 120 },
  channels:      { label: "Channels",       flex: "flex-1",      minWidth: "min-w-[150px]", minWidthPx: 150 },
  firstName:     { label: "First Name",     flex: "flex-1",      minWidth: "min-w-[100px]", minWidthPx: 100 },
  lastName:      { label: "Last Name",      flex: "flex-1",      minWidth: "min-w-[100px]", minWidthPx: 100 },
  group:         { label: "Group",          flex: "flex-[0.7]",  minWidth: "min-w-[90px]",  minWidthPx: 90 },
  firstPhone:    { label: "First Phone",    flex: "flex-[1.2]",  minWidth: "min-w-[140px]", minWidthPx: 140 },
  emailAddress:  { label: "Email Address",  flex: "flex-[1.6]",  minWidth: "min-w-[200px]", minWidthPx: 200 },
  address1:      { label: "Address 1",      flex: "flex-[1.6]",  minWidth: "min-w-[180px]", minWidthPx: 180 },
  city:          { label: "City",           flex: "flex-1",      minWidth: "min-w-[100px]", minWidthPx: 100 },
  state:         { label: "State",          flex: "flex-[0.6]",  minWidth: "min-w-[70px]",  minWidthPx: 70 },
  postalCode:    { label: "Postal Code",    flex: "flex-[0.8]",  minWidth: "min-w-[100px]", minWidthPx: 100 },
};

// Fixed-width column outside `CUSTOMER_COLUMN_CONFIG` — the trailing sticky
// "Actions" (delete) column — added to the visible columns' summed
// `minWidthPx` below to get the table's true minimum width.
const CUSTOMER_FIXED_COLUMNS_WIDTH = 48 /* actions */;

const CUSTOMER_ALL_COLUMN_DEFS: { key: string; label: string }[] = Object.entries(CUSTOMER_COLUMN_CONFIG).map(
  ([key, val]) => ({ key, label: val.label })
);
const CUSTOMER_ALL_COLUMN_KEYS = Object.keys(CUSTOMER_COLUMN_CONFIG) as CustomerColKey[];

// Every field the "+ Filter" add-filter menu can offer — real, filterable
// fields on `CUSTOMER_LIST_RECORDS` (not decoration), in the same order as
// the reference "Add Filter" list this was built from. Picking one from the
// menu is what actually adds it as a live `FilterChip` in the toolbar (see
// `addedFilterKeys` in `CustomersListView`) — this array only lists what's
// *available* to add, not what's currently active.
const CUSTOMER_FILTER_FIELD_DEFS: { key: CustomerFilterKey; label: string }[] = [
  { key: "contactNumber", label: "Customer ID" },
  { key: "originalCustomerId", label: "Original customer ID" },
  { key: "firstPhone", label: "Phone" },
  { key: "emailAddress", label: "Email address" },
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "group", label: "Group" },
  { key: "agent", label: "Agent" },
  { key: "agentTeam", label: "Agent team" },
  { key: "address1", label: "Address 1" },
  { key: "paymentBalance", label: "Payment balance" },
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
];

// Options shown inside a given field's own `FilterChip` once it's been
// added — the distinct values actually present across `CUSTOMER_LIST_
// RECORDS` for that field. Precomputed once at module load (the records
// themselves never change at runtime), same reasoning `CUSTOMER_STATE_
// OPTIONS` used before this became a general multi-field system.
const CUSTOMER_FILTER_VALUE_OPTIONS: Record<CustomerFilterKey, FilterChipOption[]> = Object.fromEntries(
  CUSTOMER_FILTER_FIELD_DEFS.map(({ key }) => [
    key,
    Array.from(new Set(CUSTOMER_LIST_RECORDS.map((r) => r[key]).filter(Boolean))).map((v) => ({ value: v, label: v })),
  ])
) as Record<CustomerFilterKey, FilterChipOption[]>;

function CustomersListView({
  onStartInteraction,
  addedFilterKeys,
  onAddedFilterKeysChange,
  filterValues,
  onFilterValuesChange,
  onRowClick,
  searchQuery,
  onSearchChange,
  sortKey,
  sortDir,
  onSort,
  sortedRows,
  openRowId,
}: {
  onStartInteraction: (contact: CreateNewOutboundContact, channel: ChannelType, phone: string, skillId: string) => void;
  // Filter state is a controlled prop, not local `useState`, so it lives on
  // (and survives) `AgentNextGenPage` itself instead of resetting every
  // time this component unmounts — which happens on every navigation away
  // from the Desk dashboard (an active interaction, Settings), not just
  // when switching between desk tabs. See the state's own declaration
  // comment in `AgentNextGenPage` for the full explanation.
  addedFilterKeys: string[];
  onAddedFilterKeysChange: (keys: string[]) => void;
  filterValues: Record<string, string[]>;
  onFilterValuesChange: (values: Record<string, string[]>) => void;
  /** Opens `CustomerRowInfoPanel` for the clicked row — lifted up to
   *  `AgentNextGenPage` for the same reason the filter state above is:
   *  that panel renders as a sibling of this whole component (docked to
   *  the right of it, not nested inside), so its "which row" state has to
   *  live on their common parent, not in here. */
  onRowClick: (row: CustomerListRecord) => void;
  // Search/sort are also controlled props now, computed into `sortedRows`
  // by `AgentNextGenPage` (not locally in here) — so `CustomerRowInfoPanel`'s
  // next/back chevrons can step through the exact same order this table is
  // rendering, rather than each maintaining its own possibly-divergent copy
  // of the same filter/sort logic. See that state's own declaration comment
  // in `AgentNextGenPage`.
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortKey: CustomerColKey | null;
  sortDir: SortDirection;
  onSort: (key: CustomerColKey) => void;
  sortedRows: CustomerListRecord[];
  /** `contactNumber` of the row currently open in `CustomerRowInfoPanel`
   *  (or `null`), so that row can show as selected/highlighted in the
   *  table itself while its panel is open. */
  openRowId: string | null;
}) {
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(CUSTOMER_ALL_COLUMN_KEYS));

  // Which fields the agent has actually added via the "+ Filter" menu below
  // — only these get rendered as live `FilterChip`s / applied to `filtered`.
  // Starts empty (in the lifted state's own initializer): no filter is
  // active until the agent explicitly adds one, matching the reference
  // "Add Filter" menu this was built from.
  const filterDefs = addedFilterKeys.map((key) => {
    const def = CUSTOMER_FILTER_FIELD_DEFS.find((f) => f.key === key)!;
    return { key: def.key, label: def.label, options: CUSTOMER_FILTER_VALUE_OPTIONS[def.key] };
  });
  const handleFilterChange = (key: string, values: string[]) => onFilterValuesChange({ ...filterValues, [key]: values });
  const clearAllFilters = () => onFilterValuesChange({});
  // Adding/removing a field from the "+ Filter" menu — removing one also
  // drops its stored selected values, so re-adding it later starts fresh
  // instead of resurrecting a stale selection nobody can see in the meantime.
  const handleAddedFiltersChange = (keys: string[]) => {
    onAddedFilterKeysChange(keys);
    onFilterValuesChange(Object.fromEntries(Object.entries(filterValues).filter(([k]) => keys.includes(k))));
  };

  const { columnOrder: allColumnOrder, dragOverKey, dragHandlers } = useColumnReorder<CustomerColKey>(
    CUSTOMER_ALL_COLUMN_KEYS
  );
  const columnOrder = allColumnOrder.filter((k: CustomerColKey) => visibleCols.has(k));

  // Explicit total min-width for `<Table>`, computed from the currently
  // *visible* columns' own `minWidthPx` (+ the fixed checkbox/actions
  // columns) — same technique `resize.totalWidth` uses internally (see
  // table.tsx's own long comment on `Table`'s `<table>` element): a
  // concrete pixel `min-width` reliably cascades down through
  // `thead`/`tbody`/`tr` via top-down `align-items: stretch`, which plain
  // per-cell `min-w-[…]` classes alone don't — Chrome doesn't reliably
  // propagate flexbox's "automatic minimum size" back *up* through this
  // many nested flex levels (table → tbody → tr → td) to make the row's
  // own box (and therefore its `border-b`/hover background) grow to match.
  // Without this, the columns individually refuse to shrink below their
  // `min-w-[…]` floor (so text stays readable and content visibly scrolls
  // into view), but each row's own painted box stays capped at the
  // container's original width — exactly the "row separator lines vanish
  // once scrolled past that boundary" bug reported via screenshot. This
  // only takes effect before any manual column resize; once a column is
  // actually dragged, `Table` swaps in `resize.totalWidth` (computed from
  // real registered widths) in its place.
  const tableMinWidth =
    CUSTOMER_FIXED_COLUMNS_WIDTH +
    columnOrder.reduce((sum: number, key: CustomerColKey) => sum + CUSTOMER_COLUMN_CONFIG[key].minWidthPx, 0);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const dirFor = (key: CustomerColKey): SortDirection => (sortKey === key ? sortDir : null);
  const sorted = sortedRows;

  const totalRecords = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * rowsPerPage;
  const pageRows = sorted.slice(startIdx, startIdx + rowsPerPage);
  const displayStart = totalRecords === 0 ? 0 : startIdx + 1;
  const displayEnd = Math.min(startIdx + rowsPerPage, totalRecords);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [rowsPerPage, totalPages, currentPage]);

  return (
    // `min-w-0 overflow-hidden` — this is a flex ITEM inside the Desk
    // body's row container (`<div className="relative flex flex-1
    // overflow-hidden">`), and flex items default to `min-width: auto`
    // (refuse to shrink below their content's own intrinsic width).
    // Matches the sibling Dashboard-tab column's own `min-w-0` a few
    // lines below in this same file.
    <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
      <TableToolbar
        className="px-6"
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        filterDefs={filterDefs}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onFilterClear={clearAllFilters}
        // The "+ Filter" add-menu itself — `TableToolbar`'s own `filters`
        // slot renders right alongside the `filterDefs`-driven chips above
        // (table.tsx: filterChips, then filters, then the Clear button),
        // exactly where FilterChip.stories.tsx's own "Removable" demo
        // places this same trigger. Composed from `Select`
        // (multiple/searchable/showSelectAll, a custom "+ Filter" trigger
        // instead of its default text box) rather than lyra-ui's
        // `FilterChip` itself — `FilterChip` renders ONE already-added
        // filter's value picker; this is the separate "pick which fields
        // are active at all" control that decides what shows up in
        // `filterDefs` in the first place, same distinction
        // FilterChip.stories.tsx's own demo draws between its per-filter
        // chips and this single add-menu.
        filters={
          <Select
            options={CUSTOMER_FILTER_FIELD_DEFS.map((f) => ({ value: f.key, label: f.label }))}
            multiple
            searchable
            showSelectAll
            dropdownAlign="left"
            values={addedFilterKeys}
            onValuesChange={handleAddedFiltersChange}
            trigger={
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lyra-sm lyra-label transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lyra-border-focus focus-visible:ring-offset-2 border border-lyra-border-default bg-lyra-bg-control text-lyra-fg-action hover:bg-lyra-state-hover active:bg-lyra-state-pressed h-8 px-3"
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                Filter
              </button>
            }
            className="inline-flex relative"
          />
        }
        actionDefs={[
          { key: "refresh", label: "Refresh", icon: <RefreshCw className="h-4 w-4" strokeWidth={1.5} /> },
          { key: "new", label: "New", icon: <Plus className="h-4 w-4" strokeWidth={1.5} /> },
        ]}
        actions={
          <ColumnToggle
            columns={CUSTOMER_ALL_COLUMN_DEFS}
            visibleColumns={visibleCols}
            onVisibilityChange={setVisibleCols}
          />
        }
      />

      <div className="flex-1 min-h-0 overflow-auto px-6">
        <Table style={{ minWidth: tableMinWidth }}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columnOrder.map((key: CustomerColKey) => {
                const col = CUSTOMER_COLUMN_CONFIG[key];
                return (
                  <SortableTableHead
                    key={key}
                    className={cn(col.flex, col.minWidth, "relative")}
                    sortDirection={dirFor(key)}
                    onSort={() => onSort(key)}
                    columnKey={key}
                    dragHandlers={dragHandlers}
                    isDragOver={dragOverKey === key}
                    resizable
                    minWidth={80}
                  >
                    {col.label}
                  </SortableTableHead>
                );
              })}
              <TableHead className="w-[48px] shrink-0 sticky right-0 bg-lyra-bg-surface-base">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row) => (
              <TableRow
                key={row.contactNumber}
                className="group cursor-pointer"
                data-state={row.contactNumber === openRowId ? "selected" : undefined}
                onClick={() => onRowClick(row)}
              >
                {/* `stopPropagation` below — same reason the channel popover
                    buttons already stop it (see `CustomerChannelCell`):
                    without it, clicking this row's delete button would ALSO
                    open the Customer Information panel via the row's own
                    `onClick` above. */}
                {columnOrder.map((key: CustomerColKey) => (
                  <TableCell
                    key={key}
                    columnKey={key}
                    className={cn(CUSTOMER_COLUMN_CONFIG[key].flex, CUSTOMER_COLUMN_CONFIG[key].minWidth)}
                  >
                    {key === "channels" ? (
                      <CustomerChannelCell row={row} onStartInteraction={onStartInteraction} />
                    ) : (
                      row[key]
                    )}
                  </TableCell>
                ))}
                <TableCell
                  className="w-[48px] shrink-0 sticky right-0 bg-lyra-bg-surface-base"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <button
                    aria-label={`Delete ${row.firstName} ${row.lastName}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lyra-sm text-lyra-fg-secondary hover:bg-lyra-bg-surface-shell transition-colors"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TableFooter
        className="px-6 shrink-0"
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(val: number) => { setRowsPerPage(val); setCurrentPage(1); }}
        totalRecords={totalRecords}
        displayStart={displayStart}
        displayEnd={displayEnd}
      />
    </div>
  );
}

/* ── Interaction history table (sortable) — content of each Latest Interactions accordion item ── */

type InteractionSortKey = "owner" | "priority" | "createDate" | "status" | "channel" | "resolutionTime" | "skill";

function nextInteractionSortDirection(current: SortDirection): SortDirection {
  if (current === null) return "asc";
  if (current === "asc") return "desc";
  return null;
}

/* Per-row "more options" kebab — opens a Menu with a single contextual
   action: voice interactions offer "Redial", everything else offers "Reopen".
   Built on the shared `KebabMenuButton` (composes `MenuRadix`) rather than a
   hand-rolled `Popover` + raw `<button>` + `Menu`, per CONTRIBUTING.md's
   Rule 0/"every menu must be built on Menu" — this exact trigger+menu shape
   is what `KebabMenuButton` exists for, and its default 24px size (not this
   row's old hand-picked 28px) matches every other per-row kebab in the
   design system (e.g. channel-row.tsx). No local open/setOpen state needed
   either — `MenuRadix` (unlike the bare `Menu` this used to wrap in a
   hand-rolled `Popover`) already closes itself on select. */
function InteractionRowActions({ interaction }: { interaction: ContactInteraction }) {
  const isVoice = interaction.type === "voice";
  const isAssignedToMe = interaction.owner === CURRENT_AGENT_NAME;

  const items: MenuEntry[] = [];
  items.push(
    isVoice
      ? { id: "redial", label: "Redial", icon: <PhoneOutgoing className="h-4 w-4" strokeWidth={1.5} /> }
      : {
          id: interaction.status === "open" ? "open-interaction" : "reopen",
          label: interaction.status === "open" ? "Open Interaction" : "Reopen",
          icon: <RotateCcw className="h-4 w-4" strokeWidth={1.5} />,
        }
  );
  if (!isAssignedToMe) {
    items.push({
      id: "assign-to-me",
      label: "Assign To Me",
      icon: <UserPlus className="h-4 w-4" strokeWidth={1.5} />,
    });
  }
  items.push("separator");
  items.push({
    id: "customer-info",
    label: "Customer Information",
    icon: <UserRound className="h-4 w-4" strokeWidth={1.5} />,
  });

  return <KebabMenuButton items={items} ariaLabel="More options" />;
}

function InteractionsTable({ interactions }: { interactions: ContactInteraction[] }) {
  const [sortKey, setSortKey] = useState<InteractionSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  const handleSort = (key: InteractionSortKey) => {
    if (sortKey === key) {
      const next = nextInteractionSortDirection(sortDir);
      setSortDir(next);
      if (next === null) setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const dirFor = (key: InteractionSortKey): SortDirection => (sortKey === key ? sortDir : null);

  const sorted = [...interactions].sort((a, b) => {
    if (!sortKey || !sortDir) return 0;
    const aVal = String(a[sortKey]).toLowerCase();
    const bVal = String(b[sortKey]).toLowerCase();
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[48px] shrink-0"><span className="sr-only">Type</span></TableHead>
          <SortableTableHead className="flex-[1.4]" sortDirection={dirFor("owner")} onSort={() => handleSort("owner")}>Owner Assignee</SortableTableHead>
          <SortableTableHead className="flex-[0.7]" sortDirection={dirFor("priority")} onSort={() => handleSort("priority")}>Priority</SortableTableHead>
          <SortableTableHead className="flex-1" sortDirection={dirFor("createDate")} onSort={() => handleSort("createDate")}>Create Date</SortableTableHead>
          <SortableTableHead className="flex-1" sortDirection={dirFor("status")} onSort={() => handleSort("status")}>Status</SortableTableHead>
          <SortableTableHead className="flex-[1.2]" sortDirection={dirFor("channel")} onSort={() => handleSort("channel")}>Channel</SortableTableHead>
          <SortableTableHead className="flex-1" sortDirection={dirFor("resolutionTime")} onSort={() => handleSort("resolutionTime")}>Resolution Time</SortableTableHead>
          <SortableTableHead className="flex-1" sortDirection={dirFor("skill")} onSort={() => handleSort("skill")}>Skill</SortableTableHead>
          <TableHead className="w-[48px] shrink-0"><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((interaction) => (
          <TableRow key={interaction.id}>
            <TableCell className="w-[48px] shrink-0">
              <span className={cn("relative inline-flex h-4 w-4 items-center justify-center", CHANNEL_TYPE_ICON_COLOR_CLASS[interaction.type])}>
                {interaction.type === "email" ? (
                  <Mail className="h-4 w-4" strokeWidth={1.5} />
                ) : interaction.type === "voice" ? (
                  <Phone className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                )}
                {interaction.direction === "inbound" ? (
                  <ArrowDown className="absolute -bottom-1 -left-1 h-3 w-3 rounded-full bg-lyra-bg-surface-base p-[1px]" strokeWidth={2} />
                ) : (
                  <ArrowUp className="absolute -bottom-1 -left-1 h-3 w-3 rounded-full bg-lyra-bg-surface-base p-[1px]" strokeWidth={2} />
                )}
              </span>
            </TableCell>
            <TableCell className="flex-[1.4]">{interaction.owner}</TableCell>
            <TableCell className="flex-[0.7]">{interaction.priority}</TableCell>
            <TableCell className="flex-1">{interaction.createDate}</TableCell>
            <TableCell className="flex-1">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    interaction.status === "open" ? "bg-lyra-status-success-strong" : "bg-lyra-status-critical-strong"
                  )}
                  aria-hidden="true"
                />
                {interaction.status === "open" ? "Open" : "Closed"}
              </span>
            </TableCell>
            <TableCell className="flex-[1.2]">{interaction.channel}</TableCell>
            <TableCell className="flex-1">{interaction.resolutionTime}</TableCell>
            <TableCell className="flex-1">{interaction.skill || "—"}</TableCell>
            <TableCell className="w-[48px] shrink-0">
              <InteractionRowActions interaction={interaction} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ── InteractionTranscript ──
   The conversation-transcript body for an active interaction's detail page,
   shown below the page header — whose own `titleSuffix` slot holds the
   `ChannelToggle` row now, not a separate row beneath it (replaces the
   empty placeholder div that used to sit there — see the `activeInteraction`
   branch above). Shows
   one fixed mock conversation (Liam Davis ↔ John Smith) split across two
   fixed mock sessions (`TRANSCRIPT_SESSIONS`) for every active interaction
   rather than a real per-interaction transcript — this is a UI prototype of
   the transcript layout itself, not a case-data integration.

   Only shown as-is for SMS/WhatsApp (a chat-shaped channel) — `channelType`
   picks which content renders, matching the record header's own active
   `ChannelToggle` pill: Voice and Email are placeholders ("Coming Soon
   {Voice,Email} Content") rather than the same chat transcript, since a
   voice call's or an email thread's own content genuinely doesn't look like
   a chat log and hasn't been designed yet — showing the SMS mock underneath
   either would misrepresent it as done. `customerName` swaps in for every
   customer-sender message's hardcoded mock name/initials ("Liam Davis"/
   "LD") in the SMS/WhatsApp branch, so the transcript at least reads as
   this interaction's actual customer rather than always the same fixed
   mock person; falls back to "Liam Davis" when unset (e.g. no active
   interaction) so this still renders sensibly in isolation.

   Broken into sessions (each a `# <case id> · <date>` separator — see
   `TranscriptSessionSeparator` — followed by that session's own messages)
   rather than one flat message list, per explicit request: a single
   interaction can span more than one contact record (a follow-up thread
   days later, a callback), and each one needs its own separator that
   expands in place to a "Session Details" summary (`TranscriptSession
   Details`) without disturbing the others. Each separator is `sticky
   top-0`, so scrolling through a session keeps its separator pinned at the
   top until the next session's own separator reaches the top and takes
   over — plain CSS sticky-header stacking, no scroll listener — see that
   component's own doc comment for why source order alone is enough to get
   this behavior.

   Deliberately hand-built instead of composed from lyra-ui's
   `ConversationMessage`: that component's "agent" variant doesn't produce
   the white-bordered customer bubble the reference screenshot shows (no
   variant maps to that background), and its avatar sits beside the bubble
   rather than below it next to the tag row — both would require changing
   `ConversationMessage` itself, which is off the table for this feature
   ("do not update the components in lyra-ui until i say"). The removable
   Technical/Urgent/Billing pills still reuse `Tag` unmodified — it already
   supports `onRemove` plus the purple/critical/default variants used below,
   no lyra-ui changes needed there. */

interface TranscriptTag {
  id: string;
  label: string;
  variant: TagVariant;
}

interface TranscriptMessage {
  id: string;
  sender: "customer" | "agent";
  name: string;
  initials: string;
  timestamp: string;
  text: string;
  tags?: TranscriptTag[];
}

/* Each `TranscriptSession` is one contact record within the interaction —
   the reference screenshot's "# CTX-20250722-08841 · July 22, 2025 ⌄"
   separator plus the "Session Details" panel it expands to (Contact ID /
   Date / Start / End / Channel / Skill / Agent / Status). A single
   interaction can span more than one session (a callback, a follow-up
   message thread days later, etc.) — grouping `TranscriptMessage[]` under
   a session rather than one flat list is what lets the transcript render a
   separator between each and let every one collapse/expand independently.
   Two mock sessions here (a closed first contact, then a shorter follow-up)
   are enough to demonstrate the separator-per-session + sticky-stacking
   behavior; still a UI prototype, not real per-interaction session data.
   Session info (this separator + its Session Details panel) is shown for
   every channel type — Voice/Email get their own sibling arrays just below
   (`TRANSCRIPT_SESSIONS_VOICE`/`TRANSCRIPT_SESSIONS_EMAIL`), each with an
   empty `messages: []` since neither channel has designed transcript
   content yet (a call recording/summary UI, an email thread UI) — the
   session separator and its expandable details still apply to a call or an
   email the same as they do to a chat, it's only the message-by-message
   body underneath that's still a placeholder. See `InteractionTranscript`'s
   per-session render below for where that placeholder actually shows. */
// Status → `Tag` variant for `TranscriptSessionSeparator`'s pill — a small,
// local map rather than reusing `CUSTOMER_LATEST_INTERACTION_STATUS_POOL`
// (Customer Information panel's own status pool): that one's a random-draw
// pool for a different feature's synthesized data and doesn't even include
// "Open" (every draw there is Resolved/Escalated/Pending), so it isn't
// actually the same vocabulary. `Tag` (pill shape), not `Badge` — per
// explicit request, matching the same pill-shaped tag treatment used
// elsewhere in this transcript (e.g. the applied message tags just above
// the composer). Falls back to "neutral" for any future
// `TranscriptSession.status` value not listed here, rather than throwing.
// Now covers every status the session-status popover offers (see
// `TRANSCRIPT_SESSION_STATUS_OPTIONS` just below) — "warning"/"info"/
// "purple"/"success"/"critical" read as orange/blue/purple/green/red, the
// same five hues that popover's own dot swatches use.
const TRANSCRIPT_SESSION_STATUS_VARIANT: Record<string, TagVariant> = {
  Open: "warning",
  Pending: "info",
  Escalated: "purple",
  Resolved: "success",
  Closed: "critical",
};

// The session-status popover's own row list (reference screenshot: a dot +
// label per row, one highlighted as the current selection) — dot colors
// mirror the exact same semantic mapping as `TRANSCRIPT_SESSION_STATUS_
// VARIANT` above (so the chip and the popover's own "current" row always
// agree), just resolved straight to the underlying CSS var instead of
// through `Badge`'s circle-shape `variant` prop: that only exposes 6
// semantic roles and has no true purple, so a plain inline-styled dot (same
// small circle shape `Badge`'s own `dot` mode renders, just not routed
// through the component) is what actually reaches "Escalated"'s purple in
// the reference screenshot. Order matches the reference screenshot's own
// row order (Open/Pending/Escalated/Resolved/Closed), not alphabetical.
const TRANSCRIPT_SESSION_STATUS_OPTIONS: { label: string; dotColor: string }[] = [
  { label: "Open", dotColor: "var(--lyra-color-status-warning-strong)" },
  { label: "Pending", dotColor: "var(--lyra-color-status-info-strong)" },
  { label: "Escalated", dotColor: "var(--lyra-color-accent-purple-strong)" },
  { label: "Resolved", dotColor: "var(--lyra-color-status-success-strong)" },
  { label: "Closed", dotColor: "var(--lyra-color-status-critical-strong)" },
];

/* ── Outcome popover mock data ──
 * Option lists for the "Outcome" popover (`ChannelRow`'s own `outcome` prop,
 * channel-row.tsx) — Disposition-code choices and the tag palette are
 * business data, which is exactly why `ChannelRow` itself takes these as
 * props instead of hardcoding them (see `ChannelOutcomeConfig`'s own doc
 * comment). Kept as flat module-level consts, same as
 * `TRANSCRIPT_SESSION_STATUS_OPTIONS` just above — none of these depend on
 * component state/props.
 *
 * There's no separate `OUTCOME_RESOLUTION_OPTIONS` here anymore — the
 * Outcome popover's "Resolution" field now reuses
 * `TRANSCRIPT_SESSION_STATUS_OPTIONS` directly (wired below, in `channels`)
 * so it shows the exact same Open/Pending/Escalated/Resolved/Closed
 * colored-dot rows as the session-status pill's own dropdown, and both
 * read/write the same `interaction.channelStatuses` entry for that specific
 * channel — changing status in either place changes it in both, per
 * explicit request. */
const OUTCOME_TAG_OPTIONS: TagPickerOption[] = [
  { label: "Technical", variant: "info" },
  { label: "Account", variant: "purple" },
  { label: "Billing", variant: "warning" },
  { label: "General Support", variant: "teal" },
  { label: "VIP", variant: "critical" },
];

const OUTCOME_DISPOSITION_OPTIONS: SelectOption[] = [
  { value: "Issue Resolved", label: "Issue Resolved" },
  { value: "Follow-Up Required", label: "Follow-Up Required" },
  { value: "Transferred", label: "Transferred" },
  { value: "Customer Callback", label: "Customer Callback" },
  { value: "No Resolution", label: "No Resolution" },
];

const OUTCOME_DEFAULT_SUMMARY =
  "Interaction with davidbauerjr@gmail.com — customer concern reviewed and resolved. Agent provided clear guidance and confirmed next steps. Follow-up actions logged where applicable.";

/** Client/device metadata captured off a text-channel session's own chat
 *  widget (OS/Browser/Language/Device Type/Application Type) — shown as a
 *  single "chat fingerprint" line in that session's `TranscriptSessionDetails`
 *  footer (per explicit request/reference screenshot). Optional on
 *  `TranscriptSession` and only ever populated for chat/SMS/WhatsApp
 *  sessions, same "text channels only" convention `messageCount`
 *  (`TranscriptSessionSeparator`) already establishes — a phone call or an
 *  email has no browser/device to fingerprint, so `TRANSCRIPT_SESSIONS_VOICE`/
 *  `_EMAIL` below simply omit this field and the footer doesn't render at
 *  all for those, rather than showing something invented. */
interface TranscriptSessionFingerprint {
  os: string;
  browser: string;
  language: string;
  deviceType: string;
  applicationType: string;
}

// One shared, reused mock fingerprint (per the reference screenshot) rather
// than inventing slightly different device info per session — same "one
// plausible example, reused" pattern `OUTCOME_DEFAULT_SUMMARY` above already
// uses; there's no real per-session client telemetry anywhere in this app's
// data for it to vary by.
const TRANSCRIPT_SESSION_FINGERPRINT: TranscriptSessionFingerprint = {
  os: "Windows 10",
  browser: "Edge v.150.0.0.0",
  language: "en-US",
  deviceType: "Desktop",
  applicationType: "Browser",
};

interface TranscriptSession {
  id: string;
  caseId: string;
  date: string;
  startTime: string;
  endTime: string;
  channel: string;
  skill: string;
  agent: string;
  status: string;
  /** See `TranscriptSessionFingerprint`'s own doc comment above. */
  fingerprint?: TranscriptSessionFingerprint;
  messages: TranscriptMessage[];
}

const TRANSCRIPT_SESSIONS: TranscriptSession[] = [
  {
    id: "session-1",
    caseId: "CTX-20250722-08841",
    date: "July 22, 2025",
    startTime: "9:13 AM",
    endTime: "9:27 AM",
    channel: "SMS",
    skill: "SMS Support",
    agent: "John Smith",
    status: "Resolved",
    fingerprint: TRANSCRIPT_SESSION_FINGERPRINT,
    messages: [
      {
        id: "m1",
        sender: "customer",
        name: "Liam Davis",
        initials: "LD",
        timestamp: "9:14 AM",
        text: "Hi, I'm having trouble with my recent invoice — it looks like I was charged twice for the same service.",
      },
      {
        id: "m2",
        sender: "agent",
        name: "John Smith",
        initials: "JS",
        timestamp: "9:15 AM",
        text: "Hi! Thanks for reaching out. I'm sorry to hear that — let me pull up your account right away.",
      },
      {
        id: "m3",
        sender: "agent",
        name: "John Smith",
        initials: "JS",
        timestamp: "9:17 AM",
        text: "I can see the duplicate charge from July 18th. I'll submit a refund request for the second charge now.",
      },
      {
        id: "m4",
        sender: "customer",
        name: "Liam Davis",
        initials: "LD",
        timestamp: "9:18 AM",
        text: "Thank you! How long will it take?",
        tags: [{ id: "m4-billing", label: "Billing", variant: "default" }],
      },
      {
        id: "m5",
        sender: "agent",
        name: "John Smith",
        initials: "JS",
        timestamp: "9:20 AM",
        text: "Refunds typically appear within 3–5 business days. You'll also receive a confirmation email shortly.",
      },
      {
        id: "m6",
        sender: "customer",
        name: "Liam Davis",
        initials: "LD",
        timestamp: "9:22 AM",
        text: "Great, sounds good. One more thing — can I also update the billing email on file?",
      },
      {
        id: "m7",
        sender: "agent",
        name: "John Smith",
        initials: "JS",
        timestamp: "9:23 AM",
        text: "Of course! What would you like to change it to?",
      },
      {
        id: "m8",
        sender: "customer",
        name: "Liam Davis",
        initials: "LD",
        timestamp: "9:24 AM",
        text: "Please update it to: sarah.chen@example.com",
      },
      {
        id: "m9",
        sender: "agent",
        name: "John Smith",
        initials: "JS",
        timestamp: "9:25 AM",
        text: "Done! Your billing email has been updated. Is there anything else I can help with?",
      },
      {
        id: "m10",
        sender: "customer",
        name: "Liam Davis",
        initials: "LD",
        timestamp: "9:26 AM",
        text: "No, that's all. Thanks for your help!",
      },
    ],
  },
  {
    id: "session-2",
    caseId: "CTX-20250723-09234",
    date: "July 23, 2025",
    startTime: "2:04 PM",
    endTime: "2:12 PM",
    channel: "SMS",
    skill: "SMS Support",
    agent: "John Smith",
    // The follow-up session (the customer came back because the refund
    // still hadn't appeared) is genuinely still open, unlike the first
    // session it follows up on — per explicit request, so the two session
    // pills read differently rather than both saying "Resolved".
    status: "Open",
    fingerprint: TRANSCRIPT_SESSION_FINGERPRINT,
    messages: [
      {
        id: "m11",
        sender: "customer",
        name: "Liam Davis",
        initials: "LD",
        timestamp: "2:05 PM",
        text: "Hi again — the refund still hasn't appeared on my account.",
      },
      {
        id: "m12",
        sender: "agent",
        name: "John Smith",
        initials: "JS",
        timestamp: "2:08 PM",
        text: "Hi! I apologize for the delay. I can see the refund was processed on our end — it may take until the end of the business day to appear.",
      },
      {
        id: "m13",
        sender: "customer",
        name: "Liam Davis",
        initials: "LD",
        timestamp: "2:10 PM",
        text: "Okay, I'll check again tomorrow.",
      },
      {
        id: "m14",
        sender: "agent",
        name: "John Smith",
        initials: "JS",
        timestamp: "2:11 PM",
        text: "Sounds good! Feel free to reach back out if you don't see it by tomorrow afternoon.",
      },
    ],
  },
];

// Voice's own session — see `TranscriptSession`'s own doc comment above for
// why `messages` is empty here. One closed/"Resolved" session is enough to
// show the separator + Session Details for a call, same as chat's own mock
// log demonstrates it for SMS/WhatsApp.
const TRANSCRIPT_SESSIONS_VOICE: TranscriptSession[] = [
  {
    id: "session-voice-1",
    caseId: "CTX-20250718-04417",
    date: "July 18, 2025",
    startTime: "11:02 AM",
    endTime: "11:19 AM",
    channel: "Voice",
    skill: "Voice Support",
    agent: "John Smith",
    status: "Resolved",
    messages: [],
  },
];

// Email's own session — same reasoning as `TRANSCRIPT_SESSIONS_VOICE` just
// above.
const TRANSCRIPT_SESSIONS_EMAIL: TranscriptSession[] = [
  {
    id: "session-email-1",
    caseId: "CTX-20250719-05532",
    date: "July 19, 2025",
    startTime: "3:41 PM",
    endTime: "3:58 PM",
    channel: "Email",
    skill: "Email Support",
    agent: "John Smith",
    status: "Resolved",
    messages: [],
  },
];

// Quick-add options offered from a message's hover "Tags" action — matches
// the app's real tag vocabulary (Complain/Help/Praise/Share/Billing), not
// an invented set, so a picked tag reads the same as the one seeded on m4.
// "Billing" (topic label, not sentiment) reuses the same neutral `default`
// variant "Share" already established for a non-sentiment tag. Deliberately
// not purple/teal/pink — CONTRIBUTING.md reserves those three Tag variants
// for channel-type coloring specifically.
// Canned replies drawn from for the simulated customer response
// `handleSendMessage` schedules after the agent sends a message — this demo
// has no real customer on the other end, so a short, generic pool stands in
// for one, same "randomly draw from a fixed pool" pattern already used for
// synthesized Customer Information data (`CUSTOMER_LATEST_NOTE_POOL`, etc.).
const CUSTOMER_AUTO_REPLY_POOL = [
  "Thanks, got it!",
  "Okay, that makes sense.",
  "Appreciate the quick response.",
  "Got it, thank you!",
  "Sounds good, thanks for the help.",
  "Perfect, that answers my question.",
];

// Expanded to 25 (per explicit request, to actually exercise TagPicker's
// scrollable checkbox list rather than a 5-row set that never needed to
// scroll) — a realistic support-conversation tag vocabulary, not filler:
// sentiment/feedback tags (Complain/Praise/...), the common request
// categories an agent would tag a message with (Billing/Refund/
// Cancellation/...), and a few urgency/risk markers (Escalation/Fraud
// Alert/Churn Risk). Still only `default`/`success`/`warning`/`critical`/
// `info`/`neutral` variants — see this file's own note above reserving
// `purple`/`teal`/`pink` for channel-type coloring.
const QUICK_TAG_OPTIONS: Omit<TranscriptTag, "id">[] = [
  { label: "Complain", variant: "critical" },
  { label: "Help", variant: "info" },
  { label: "Praise", variant: "success" },
  { label: "Share", variant: "default" },
  { label: "Billing", variant: "default" },
  { label: "Refund", variant: "warning" },
  { label: "Cancellation", variant: "critical" },
  { label: "Escalation", variant: "critical" },
  { label: "Follow-Up", variant: "info" },
  { label: "Feedback", variant: "neutral" },
  { label: "Bug Report", variant: "critical" },
  { label: "Feature Request", variant: "info" },
  { label: "Shipping", variant: "default" },
  { label: "Delivery Delay", variant: "warning" },
  { label: "Password Reset", variant: "info" },
  { label: "Account Access", variant: "warning" },
  { label: "Upgrade", variant: "success" },
  { label: "Downgrade", variant: "neutral" },
  { label: "Fraud Alert", variant: "critical" },
  { label: "Payment Failed", variant: "critical" },
  { label: "Subscription", variant: "default" },
  { label: "Warranty", variant: "neutral" },
  { label: "Return", variant: "warning" },
  { label: "Exchange", variant: "default" },
  { label: "Technical Issue", variant: "info" },
];

/* ── TranscriptMessageBubble ──
   One customer/agent bubble, extracted out of the old flat-list
   `InteractionTranscript` so it can be looped once per `TranscriptSession`
   instead of once for the whole (now session-grouped) transcript. Tag
   add/remove and the copy action are still owned by `InteractionTranscript`
   (tag state lives per-session there) — this component is just the row
   markup, taking the handlers it needs as props. Unchanged from the
   original inline JSX otherwise. */
function TranscriptMessageBubble({
  message,
  tagPickerOpen,
  onTagPickerOpenChange,
  onAddTag,
  onRemoveTag,
  onClearTags,
  onCopy,
}: {
  message: TranscriptMessage;
  tagPickerOpen: boolean;
  onTagPickerOpenChange: (open: boolean) => void;
  onAddTag: (option: Omit<TranscriptTag, "id">) => void;
  onRemoveTag: (tagId: string) => void;
  onClearTags: () => void;
  onCopy: () => void;
}) {
  const isCustomer = message.sender === "customer";
  return (
    <div className={cn("flex flex-col", isCustomer ? "items-start" : "items-end")}>
      <div className={cn("flex max-w-[70%] items-start gap-2", isCustomer ? "flex-row" : "flex-row-reverse")}>
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full lyra-body-sm-emphasis lyra-transcript-avatar",
            isCustomer
              ? "bg-lyra-accent-green-soft text-lyra-accent-green-strong"
              : "bg-lyra-bg-primary text-lyra-fg-on-primary"
          )}
          aria-hidden="true"
        >
          {message.initials}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <span className={cn("lyra-body-sm text-lyra-fg-secondary px-1", !isCustomer && "text-right")}>
            {message.name}
          </span>
          <div className={cn("group flex items-end gap-1.5", isCustomer ? "flex-row" : "flex-row-reverse")}>
            <div
              className={cn(
                "rounded-lyra-lg px-4 py-3 border border-transparent",
                isCustomer ? "rounded-tl-none bg-lyra-state-hover" : "rounded-tr-none"
              )}
              style={!isCustomer ? { backgroundColor: "var(--lyra-color-bg-conversation-user)" } : undefined}
            >
              <p className="lyra-body-md text-lyra-fg-default">{message.text}</p>
              <span className="mt-2 block lyra-body-sm text-lyra-fg-secondary">{message.timestamp}</span>
            </div>
            {/* Copy / Add tag — hidden until the bubble row is hovered,
                sitting just outside the bubble (right for customer bubbles,
                left for agent bubbles), bottom-aligned with it rather than
                overlapping it. Bare icons, no surrounding toolbar chrome
                (no border/bg/shadow container) — just the two
                ActionIconButtons floating next to the bubble. The
                TagPicker's own popover (the flyout for picking a tag) is
                unaffected by this — only the outer wrapper around these two
                icons lost its box styling. */}
            <div
              className={cn(
                // `pointer-events-none` while hidden — otherwise the
                // invisible (opacity-0) ActionIconButtons underneath still
                // receive hover/focus, so their Tooltip (Button's own
                // `isIconVariant && title` wrap, tooltip.tsx) can pop open
                // pointing at nothing whenever the cursor happens to pass
                // over that dead space. `pointer-events-auto` restores
                // interactivity once actually visible (hover or open).
                //
                // `group-focus-within:` alongside `group-hover:` — per
                // explicit accessibility request: Copy/Add-tag are real
                // buttons, so `opacity-0`/`pointer-events-none` alone
                // doesn't remove them from the tab order, it just leaves
                // them invisible (and unclickable, pre-`pointer-events-auto`)
                // while a keyboard user has actually tabbed to one. Tabbing
                // into either button now reveals this toolbar exactly like
                // hovering the row does; the hover behavior itself is
                // unchanged.
                "mb-0.5 flex shrink-0 items-center gap-0.5 pointer-events-none opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100",
                // The "Add tag" popover renders in a portal, so moving the
                // pointer into it isn't hovering this row anymore —
                // group-hover alone would fade the toolbar out from under
                // an open popover. Force it visible (and interactive)
                // whenever this message's picker is open.
                tagPickerOpen && "pointer-events-auto opacity-100"
              )}
            >
              <ActionIconButton size="sm" title="Copy message" onClick={onCopy}>
                <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
              </ActionIconButton>
              {/* `TagPicker` (lyra-ui) — a Popover-based "pick a colored tag
                  pill" flyout, extracted from what used to be a hand-rolled
                  Popover + raw <button> row here. Deliberately a Popover
                  with custom content, not `Menu` — see tag-picker.tsx's own
                  doc comment for why forcing a row that's just a colored
                  pill through `Menu`'s icon+label+trailing template doesn't
                  fit. Its own popover flyout is untouched by the wrapper
                  change above — only removed the box around the trigger
                  icons, not the picker's own dropdown. */}
              <TagPicker
                options={QUICK_TAG_OPTIONS}
                appliedLabels={message.tags?.map((t) => t.label) ?? []}
                open={tagPickerOpen}
                onOpenChange={onTagPickerOpenChange}
                onSelect={onAddTag}
                // `TagPicker` is now a real checkbox multi-select (per
                // explicit request) — unchecking an already-applied tag
                // needs to actually remove it, not just no-op. Looks the
                // matching `TranscriptTag` up by label to get the real id
                // `onRemoveTag` needs (this component only tracks labels,
                // not ids — see tag-picker.tsx's own doc comment).
                onDeselect={(label) => {
                  const tag = message.tags?.find((t) => t.label === label);
                  if (tag) onRemoveTag(tag.id);
                }}
              />
            </div>
          </div>
          {message.tags && message.tags.length > 0 && (
            <div
              className={cn(
                "group/tags mt-1 flex flex-wrap items-center gap-2",
                isCustomer ? "flex-row" : "flex-row-reverse"
              )}
            >
              {message.tags.map((tag) => (
                <Tag key={tag.id} label={tag.label} variant={tag.variant} shape="pill" onRemove={() => onRemoveTag(tag.id)} />
              ))}
              {/* Hover-reveal "Clear Tags" — only shows once the applied-tags
                  row itself is hovered (a separate, named `group/tags` from
                  the bubble row's own `group` above, so hovering the message
                  bubble/copy-and-add-tag toolbar doesn't also reveal this).
                  `variant="ghost"` (button.tsx) — a small, text-only button
                  is the correct "ghost" per this design system's own
                  naming, not a guessed style. */}
              <Button
                variant="ghost"
                size="sm"
                // `group-focus-within/tags:opacity-100` alongside the
                // existing hover reveal — per explicit accessibility
                // request: this button is itself the focusable element,
                // but `group-focus-within` (not `focus-visible`) is used
                // here instead of `favorite-button.tsx`'s simpler
                // technique since the visibility is driven by the PARENT
                // `group/tags` row, not this button's own focus state in
                // isolation — matches the toolbar fix just above.
                className="opacity-0 transition-opacity group-hover/tags:opacity-100 group-focus-within/tags:opacity-100"
                onClick={onClearTags}
              >
                Clear Tags
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── TranscriptSessionDetails ──
   The "Session Details" card a session separator expands to (reference
   screenshot 2) — Contact ID/Date, Start/End, Channel/Skill, Agent/Status,
   two fields per row. Uses lyra-ui's own documented "Label Horizontal"
   pattern (`Input.stories.tsx`'s `LabelHorizontalWithSeparator` story: the
   real `Label` atom on the left, a plain `lyra-body-md text-lyra-fg-
   secondary` value span on the right, in one row) rather than `Input` —
   `Input` always stacks its label *above* the field, which read as a
   normal editable-looking form regardless of `readonly`, not the
   horizontal label/value row the reference screenshot shows. Same pattern
   minus that story's trailing `Separator` — explicitly no dividers between
   rows here, this card is one glanceable block, not a divided list. Two
   pairs per row via `.lyra-form-grid` (an existing lyra-tokens.css
   container-query family, not a bare Tailwind `grid-cols-2`) under a
   `lyra-form-grid-wrap` boundary, same mechanism `CustomerDetailTabContent`
   uses for its own 2-up field rows.

   Wrapped in the same neutral `rounded-lyra-md border border-lyra-border-
   subtle bg-lyra-bg-control-subtle` container CONTRIBUTING.md's "Composing
   panel body content" convention uses for a card-like block sitting inside
   a body area — the Overview tab's own "Latest Interaction" accordion uses
   the identical classes for the same reason (a block that reads as a
   distinct card, not flush against the transcript's own background). */
function TranscriptSessionDetails({ session }: { session: TranscriptSession }) {
  const rows: Array<[string, string, string, string]> = [
    ["Contact ID", session.caseId, "Date", session.date],
    ["Start", session.startTime, "End", session.endTime],
    ["Channel", session.channel, "Skill", session.skill],
    ["Agent", session.agent, "Status", session.status],
  ];
  // "Chat fingerprint" footer (per explicit request/reference screenshot) —
  // see `TranscriptSessionFingerprint`'s own doc comment for why this is
  // `undefined` (and so this whole footer omitted) for Voice/Email.
  const fingerprintFields: Array<[string, string]> | undefined = session.fingerprint
    ? [
        ["OS", session.fingerprint.os],
        ["Browser", session.fingerprint.browser],
        ["Language", session.fingerprint.language],
        ["Device Type", session.fingerprint.deviceType],
        ["Application Type", session.fingerprint.applicationType],
      ]
    : undefined;
  return (
    <div className="flex flex-col gap-3 rounded-lyra-md border border-lyra-border-subtle bg-lyra-bg-control-subtle p-4 lyra-form-grid-wrap">
      <h3 className="lyra-body-md-emphasis text-lyra-fg-default">Session Details</h3>
      {rows.map(([label1, value1, label2, value2]) => (
        <div key={label1} className="lyra-form-grid">
          <div className="flex items-center justify-between gap-4">
            <Label label={label1} />
            <span className="lyra-body-md text-lyra-fg-secondary">
              {value1}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label label={label2} />
            <span className="lyra-body-md text-lyra-fg-secondary">{value2}</span>
          </div>
        </div>
      ))}
      {fingerprintFields && (
        // Per explicit request: one single row, not the two-per-row grid
        // the fields above use — `truncate` (Tailwind's overflow:hidden +
        // text-overflow:ellipsis + white-space:nowrap in one) rather than
        // `flex-wrap`, so narrowing this card's own container collapses
        // the line down to an ellipsis instead of reflowing onto a second
        // line. Plain inline content (no `flex` on this element itself) is
        // what actually makes `truncate` behave this way here — a flex row
        // of individually-truncating children wouldn't collapse as one
        // unit the way a single inline text flow does. `border-t` sets
        // this apart as the card's own footer, same divider treatment
        // `Popover`'s own footer slot elsewhere in this file already uses
        // between body content and a trailing row.
        <p className="truncate border-t border-lyra-border-subtle pt-3 lyra-body-sm text-lyra-fg-secondary">
          {fingerprintFields.map(([label, value], i) => (
            <React.Fragment key={label}>
              {i > 0 && <span aria-hidden="true"> | </span>}
              <span className="lyra-body-sm-emphasis text-lyra-fg-default">{label}</span> {value}
            </React.Fragment>
          ))}
        </p>
      )}
    </div>
  );
}

/* ── TranscriptSessionSeparator ──
   The "# CTX-... · <date>" pill row between sessions. `sticky top-0` (no
   extra plumbing needed — this relies on plain CSS sticky-header stacking:
   each separator is the first child of its own session block, in normal
   document flow as a sibling of the next session block below it, so as the
   transcript's own `overflow-y-auto` container scrolls, a separator sticks
   to the top for as long as its session's messages are still scrolling by,
   then gets pushed off-screen the instant the *next* session block's own
   top — and therefore its own separator — reaches the scroll container's
   top edge. That hand-off is the "then it replaces the other one" behavior
   from the request; no scroll listener or IntersectionObserver needed for
   it, just each separator being `sticky top-0` in source order.
   `bg-lyra-bg-surface-base` keeps messages scrolling underneath from
   showing through while it's pinned; `z-[1]` keeps it above them —
   deliberately *not* `z-10`: `CustomerInformationSidePanel` (the
   docked panel this transcript sits beside) renders at `z-[5]`
   (side-panel.tsx), and a sticky element's own `z-index` opens a new
   stacking context compared against siblings up the tree, not just against
   the messages scrolling directly beneath it — `z-10` was outranking that
   panel and painting the separator/expanded Session Details card over top
   of it once the panel had content past the fold (confirmed via
   screenshot). `z-[1]` is enough to clear plain in-flow message content
   (which has no z-index of its own) while staying under every panel in
   this file that intentionally layers above the transcript.

   The trailing gradient div is the same "soft fade instead of a hard edge"
   technique `InteractionComposer` uses for its own top edge (see that
   component's doc comment), mirrored: `position: sticky` already
   establishes a containing block for an absolutely-positioned descendant
   (same as `relative` would), so no extra wrapper is needed here. Placed
   at `-bottom-8` (outside this div's own box, extending down into the
   messages scrolling underneath) rather than as internal bottom padding,
   so it overlays whatever message content is passing directly beneath the
   separator instead of just adding empty space inside it. Gradient runs
   solid (matching this bar's own background) at the top down to
   transparent at the bottom — the reverse of the composer's direction,
   since here the solid edge is at the *top* of the fade band, not the
   bottom.

   Session Details' open/close is animated via @radix-ui/react-accordion
   directly (AccordionPrimitive.Root/Item/Content) rather than lyra-ui's
   own Accordion component — that component always renders its own trigger
   row (a full-width button with its own chevron) plus a border-b divider
   after every item, neither of which fits here: the real trigger is the
   "# CTX-..." pill button below, and this feature was explicitly built
   with no dividers. Reusing the bare Radix primitives keeps the actual
   animation mechanism identical to Accordion's though — same
   data-[state=open]:animate-accordion-down data-[state=closed]:animate-
   accordion-up classes, same --radix-accordion-content-height CSS
   variable driving the height, same 200ms ease-in-out keyframes already
   defined in this app's own tailwind.config.js (added there so Tailwind
   picks up the classes Accordion itself needs) — just without Accordion's
   own trigger/divider markup along for the ride. Root is fully controlled
   off openSessionIds (InteractionTranscript's own state) via value; the
   pill button below drives that state directly and never touches Radix's
   own Trigger (not rendered here at all), so onValueChange is a no-op —
   it only exists to satisfy React's controlled-prop-without-a-change-
   handler warning.

   The status `Tag` (e.g. "Resolved") used to be plain decoration inside
   the same big toggle button as the rest of the pill. It's now its own
   `Popover` trigger, pulled out of that button into a sibling — clicking
   it opens a status list (`Menu`, `bare` since `Popover`'s own content
   wrapper already supplies the surface) instead of toggling Session
   Details, so the two actions (change status / expand details) don't
   fight over one click target. Picking "Closed" swaps that same popover's
   `content` to a confirm view instead of closing it (`statusMenuView`) —
   one Popover instance, two possible bodies, not a second nested Popover —
   matching the reference screenshots' "select Closed → a warning to
   confirm" flow. Once a session's status IS "Closed", the trigger is
   `disabled` (`isClosed` below): there's no way back in from here, matching
   "closed cannot be re-opened." All the actual status state (which session
   is "Closed" now, which popover/view is open) lives in
   `InteractionTranscript` (this component owns no state of its own) —
   same reasoning `sessionMessages`/`openSessionIds` already live one level
   up: every session's status is independent, and only one status popover
   should ever be open across the whole transcript at a time. */

/** Person + redirect-arrow composite — same "no single Lucide icon covers
 *  transfer" composition lyra-ui's own `ConsultTransferIcon` uses
 *  (channel-row.tsx) for its Consult/Transfer button, recreated locally here
 *  since that one's a private, unexported helper in that file — this app
 *  only needs the same LOOK, not a shared import. */
function TransferIcon() {
  return (
    <span className="relative inline-flex h-4 w-4 items-center justify-center" aria-hidden="true">
      <User className="h-4 w-4" strokeWidth={1.5} />
      <ArrowUpRight className="absolute -right-1 -top-1 h-2.5 w-2.5" strokeWidth={2.5} />
    </span>
  );
}

function TranscriptSessionSeparator({
  session,
  open,
  onToggle,
  statusMenuOpen,
  statusMenuView,
  onStatusMenuOpenChange,
  onSelectStatus,
  onConfirmClose,
  onCancelClose,
  messageCount,
  outcome,
  onDismiss,
  channelClosed,
}: {
  session: TranscriptSession;
  open: boolean;
  onToggle: () => void;
  /** This session's own message (chat bubble) count — shown as "{n}
   *  Messages | " right before "# caseId · date", same "Messages | #id"
   *  format `ChannelTab`'s own tooltip line already uses (channel-row.tsx)
   *  for the identical fact. Omit entirely (not `0`) for a channel with no
   *  real per-message transcript to count — Voice/Email's sessions only
   *  ever hold a placeholder `messages: []` (see `TRANSCRIPT_SESSIONS_VOICE`/
   *  `_EMAIL`'s own doc comment), so "0 Messages" there would misreport a
   *  call/email as an empty chat rather than just not applying. Only passed
   *  for chat/SMS/WhatsApp (`InteractionTranscript`'s own call site checks
   *  `channelType`), where `messages.length` is a real, meaningful count. */
  messageCount?: number;
  /** Whether THIS session's status popover is the one currently open —
   *  `InteractionTranscript`'s `statusMenuOpenId` only ever names one
   *  session at a time, same pattern as `tagPickerOpenId` for message tag
   *  pickers. */
  statusMenuOpen: boolean;
  /** Which body the (currently open) popover shows: the Open/Pending/
   *  Escalated/Resolved/Closed list, or the "Close Contact?" confirm.
   *  Meaningless while `statusMenuOpen` is false. */
  statusMenuView: "menu" | "confirm";
  onStatusMenuOpenChange: (open: boolean) => void;
  /** A non-"Closed" status was picked straight from the list — applies
   *  immediately and closes the popover. Picking "Closed" itself doesn't
   *  call this; see `onConfirmClose` below. */
  onSelectStatus: (status: string) => void;
  /** "Close" clicked on the confirm view — actually applies the "Closed"
   *  status and closes the popover. */
  onConfirmClose: () => void;
  /** "Cancel" clicked on the confirm view — closes the popover without
   *  changing anything (the status stays whatever it was before "Closed"
   *  was picked from the list). */
  onCancelClose: () => void;
  /** Real Consult/Transfer + Outcome buttons, floated right of the "#
   *  caseId · date" pill — per explicit request. Only meaningful/passed
   *  for the CURRENT session (`InteractionTranscript`'s `lastSessionId`)
   *  since it's the same live `ChannelOutcomeConfig` shape (and, via
   *  `resolution`/`onResolutionChange`, the exact same underlying value)
   *  the LeftNav's own `ChannelRow` Outcome button already uses for this
   *  same channel — opening either one shows the identical popover/draft.
   *  Historical sessions get the Transfer icon too (purely decorative,
   *  same as everywhere else in this app — see rule #30) but no working
   *  Outcome popover, since there's no real per-historical-session outcome
   *  state to back one. */
  outcome?: ChannelOutcomeConfig;
  /** Real "Unassign & Dismiss" button, immediately right of the status tag
   *  — per explicit request. Same "current session only" scoping as
   *  `outcome` above (see `InteractionTranscript`'s own `onDismissChannel`
   *  doc comment): a historical session has no live channel left to
   *  dismiss, so this is `undefined` there and the button doesn't render
   *  at all (no decorative/disabled version — unlike Transfer, this is a
   *  real destructive action, not a static icon, so there's nothing
   *  meaningful to show non-functionally). */
  onDismiss?: () => void;
  /** True once the whole CHANNEL/interaction this session belongs to reads
   *  as closed/read-only — same union of conditions `InteractionTranscript`'s
   *  own `dimmed` prop is already built from (`ActiveInteraction.closed` OR
   *  this channel's own `channelStatuses` entry reading "Closed" — see that
   *  prop's own doc comment for the full picture). Distinct from `isClosed`
   *  below (THIS session's own `status`, which a historical row can read
   *  "Closed" on independent of whether the live channel it belongs to is
   *  still open) — per explicit request, Consult/Transfer/Outcome/Unassign &
   *  Dismiss need to disappear in BOTH cases, not just when this particular
   *  session's own status happens to say "Closed". */
  channelClosed?: boolean;
}) {
  const isClosed = session.status === "Closed" || !!channelClosed;
  // Local to the Outcome popover's own "Status" field — same "one popover
  // instance, two possible bodies (list vs. Closed confirm)" pattern this
  // component's own session-status pill dropdown already uses above
  // (`statusMenuView`), and the exact same shape `ChannelRow`'s Outcome
  // popover uses for its identical field (channel-row.tsx).
  const [outcomeResolutionMenuOpen, setOutcomeResolutionMenuOpen] = useState(false);
  const [outcomeResolutionMenuView, setOutcomeResolutionMenuView] = useState<"menu" | "confirm">("menu");
  return (
    <AccordionPrimitive.Root
      type="single"
      collapsible
      value={open ? session.id : ""}
      onValueChange={() => {}}
      className="sticky top-0 z-[1] bg-lyra-bg-surface-base"
    >
      <AccordionPrimitive.Item value={session.id}>
        <div className="flex flex-wrap items-center justify-between gap-3 py-2">
          {/* Flat, left-aligned case info — no wrapping pill border/
              background and no flanking divider lines (per earlier design
              update matching the reference screenshot): plain inline
              content. The status tag itself sits at the far right (see the
              Consult/Transfer + Outcome cluster below). Customer name +
              channel address used to sit here too, ahead of "# caseId ·
              date" — per explicit follow-up request, dropped as redundant
              (not just hidden): both are already shown elsewhere for this
              same conversation (the record-header tab's own face/tooltip,
              the Customer Information panel), so repeating them on every
              single session row added noise without new information. This
              component no longer takes `customerName`/`channelAddress`
              props at all as a result — see `InteractionTranscript`'s own
              call site, which no longer passes them either.

              `flex-wrap` on the row above — per explicit follow-up request,
              when the container narrows the Consult/Transfer + Outcome +
              status tag cluster should break onto its own line rather than
              clipping/overflowing (an earlier overflow-hidden/truncate
              attempt was the wrong read of the request — undone here). The
              right-hand cluster below lost its `ml-auto` for the same
              reason — it now left-aligns under this cluster once wrapped,
              rather than floating to the far right on its own line. */}
          <div className="flex flex-wrap items-center gap-1.5 lyra-body-sm text-lyra-fg-secondary">
            {/* "# caseId · date" + the expand/collapse chevron — per
                explicit request, stays a real, always-toggleable `Button`
                regardless of `isClosed`: a closed session's own Session
                Details can still be opened/collapsed to review it, same as
                an open one — only the status chip/composer/etc. actually
                lock down once closed, not this. (Previously swapped to
                plain, non-interactive text here once `isClosed` — that's
                been removed.) Not an icon-shaped `Button` (`variant="ghost"`,
                real visible text content), so `Button` itself never wraps it
                in a tooltip on its own (that built-in behavior is
                `isIconVariant && title`-gated, see button.tsx — this doesn't
                qualify) — wrapped in a real `Tooltip` here explicitly
                instead of passing `title`. */}
            <Tooltip content="View Details" placement="bottom">
              <Button
                variant="ghost"
                onClick={onToggle}
                aria-expanded={open}
                // Same `hover:bg-transparent active:bg-transparent`
                // override as the status-tag `Button` above, and for the
                // same reason — the wrapping pill div owns the one,
                // whole-pill hover now.
                className="h-auto shrink-0 gap-1.5 p-0 hover:bg-transparent active:bg-transparent lyra-body-sm text-lyra-fg-secondary"
              >
                {messageCount != null && (
                  <>
                    <span>{messageCount} Message{messageCount === 1 ? "" : "s"}</span>
                    <span aria-hidden="true">|</span>
                  </>
                )}
                <span aria-hidden="true">#</span>
                <span>{session.caseId}</span>
                <span aria-hidden="true">·</span>
                <span>{session.date}</span>
                {open ? (
                  <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                )}
              </Button>
            </Tooltip>
          </div>
          {/* Consult/Transfer + Outcome — same real buttons/icons
              `ChannelRow`'s own trailing cluster uses (channel-row.tsx). No
              more `ml-auto` on this cluster itself — that pinned it to the
              row's far right edge even once it wrapped onto its own line
              (reported via screenshot), which reads as floating rather than
              a natural line break. The row above now uses `justify-between`
              instead: while both clusters share one line, it still pushes
              this one flush to the row's right edge (identical look to
              before); once this cluster wraps onto its own line, being the
              lone item on that line means `justify-between` places it at
              that line's start (left) instead — exactly `flex-start`'s
              behavior for a single flex item, no `ml-auto` needed either
              way. Consult/Transfer has no real action anywhere in this app yet
              (see rule #30) — same static, unwired icon button here.
              Outcome IS real when `outcome` is passed (the current
              session only — see this prop's own doc comment): the exact
              same popover UI `ChannelRow`'s Outcome button renders,
              reusing its shared `outcomeDraftKey`/`outcomeDraft` state one
              level up so opening it here or from the LeftNav card shows
              the identical draft. `gap-1` (4px) between every item in this
              cluster (Transfer, Outcome, status chip, Unassign & Dismiss)
              — per explicit request, was `gap-0` (flush together). */}
          <div className="shrink-0 flex items-center gap-1">
            {/* Per explicit follow-up request: once this SESSION reads
                "Closed" (`isClosed` — the exact same flag that already
                locks the status tag below), Consult/Transfer/Outcome/
                Unassign & Dismiss are removed entirely, not just disabled
                — there's nothing left to transfer, log an outcome for, or
                unassign from on a session that's already closed out, so no
                dead icon should linger there either. (First pass just
                `disabled`-grayed these — per this follow-up, that wasn't
                far enough.) The status tag itself is untouched here — it's
                not one of these icons, and still needs to show "Closed" as
                its own label. */}
            {!isClosed && (
              <Button variant="icon" size="icon-sm" title="Consult / Transfer" className="text-lyra-fg-secondary">
                <TransferIcon />
              </Button>
            )}
            {outcome && !isClosed ? (
              <Popover
                open={outcome.open}
                onOpenChange={outcome.onOpenChange}
                placement="bottom"
                align="end"
                className="w-80"
                onCloseAutoFocus={(e: Event) => e.preventDefault()}
                header={
                  <PanelHeader
                    title={outcome.title ?? "Log Outcome"}
                    bordered={false}
                    className="px-5 pb-0"
                    onClose={() => outcome.onOpenChange(false)}
                  />
                }
                footer={
                  <div className="flex items-center justify-end gap-2 px-5 pb-4 pt-1">
                    <Button variant="outline" size="md" onClick={outcome.onCancel}>
                      Cancel
                    </Button>
                    <Button variant="default" size="md" onClick={outcome.onSave}>
                      Approve &amp; Save
                    </Button>
                  </div>
                }
                content={
                  <div className="flex flex-col gap-4 pb-2 pt-1">
                    <div>
                      <Label label="Status" className="mb-1.5" />
                      <Popover
                        open={outcomeResolutionMenuOpen}
                        onOpenChange={(nextOpen: boolean) => {
                          setOutcomeResolutionMenuOpen(nextOpen);
                          setOutcomeResolutionMenuView("menu");
                        }}
                        placement="bottom"
                        align="start"
                        className="w-[var(--radix-popover-trigger-width)]"
                        bodyPadding={outcomeResolutionMenuView === "confirm"}
                        header={
                          outcomeResolutionMenuView === "confirm" ? (
                            <PanelHeader
                              title="Close Contact?"
                              icon={
                                <WarningIconSolid
                                  className="h-5 w-5 text-lyra-status-critical-strong"
                                  aria-hidden="true"
                                />
                              }
                              bordered={false}
                              className="px-5 pb-0"
                            />
                          ) : undefined
                        }
                        footer={
                          outcomeResolutionMenuView === "confirm" ? (
                            <div className="flex items-center justify-end gap-2 px-5 pb-4 pt-1">
                              <Button
                                variant="destructive"
                                size="md"
                                onClick={() => {
                                  outcome.onResolutionChange("Closed");
                                  setOutcomeResolutionMenuOpen(false);
                                  setOutcomeResolutionMenuView("menu");
                                }}
                              >
                                Close
                              </Button>
                              <Button
                                variant="outline"
                                size="md"
                                onClick={() => {
                                  setOutcomeResolutionMenuOpen(false);
                                  setOutcomeResolutionMenuView("menu");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : undefined
                        }
                        content={
                          outcomeResolutionMenuView === "confirm" ? (
                            <p className="pb-2 pt-1 lyra-body-md text-lyra-fg-secondary">
                              Closing a contact cannot be undone. Are you sure you want to close this contact?
                            </p>
                          ) : (
                            <Menu
                              bare
                              items={outcome.resolutionOptions.map((option: { label: string; dotColor: string }) => ({
                                id: option.label,
                                label: option.label,
                                active: option.label === outcome.resolution,
                                icon: (
                                  <span
                                    aria-hidden="true"
                                    className="block h-2 w-2 rounded-full"
                                    style={{ backgroundColor: option.dotColor }}
                                  />
                                ),
                                onClick: () => {
                                  if (option.label === "Closed") {
                                    setOutcomeResolutionMenuView("confirm");
                                    return;
                                  }
                                  outcome.onResolutionChange(option.label);
                                  setOutcomeResolutionMenuOpen(false);
                                },
                              }))}
                            />
                          )
                        }
                      >
                        <Button
                          variant="outline"
                          aria-haspopup="menu"
                          aria-expanded={outcomeResolutionMenuOpen}
                          disabled={outcome.resolution === "Closed"}
                          className="h-9 w-full justify-between border-lyra-border-strong bg-lyra-bg-field font-normal text-lyra-fg-default hover:bg-lyra-bg-field hover:border-lyra-state-border-hover-neutral"
                        >
                          <span className="truncate">{outcome.resolution}</span>
                          {outcome.resolution !== "Closed" && (
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 shrink-0 text-lyra-fg-secondary transition-transform",
                                outcomeResolutionMenuOpen && "rotate-180"
                              )}
                              strokeWidth={1.5}
                              aria-hidden="true"
                            />
                          )}
                        </Button>
                      </Popover>
                    </div>
                    <div>
                      <Label label="Tags" className="mb-1.5" />
                      <Select
                        multiple
                        placeholder="Select tags"
                        options={outcome.tagOptions.map((option: TagPickerOption) => ({ value: option.label, label: option.label }))}
                        values={outcome.selectedTags}
                        onValuesChange={outcome.onTagsChange}
                      />
                      {outcome.selectedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {outcome.selectedTags.map((tagLabel: string) => {
                            const option = outcome.tagOptions.find((o: TagPickerOption) => o.label === tagLabel);
                            return (
                              <Tag
                                key={tagLabel}
                                label={tagLabel}
                                variant={option?.variant ?? "neutral"}
                                onRemove={() =>
                                  outcome.onTagsChange(outcome.selectedTags.filter((t: string) => t !== tagLabel))
                                }
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <Select
                      label="Disposition code"
                      searchable
                      options={outcome.dispositionOptions}
                      value={outcome.dispositionCode}
                      onValueChange={outcome.onDispositionChange}
                    />
                    <Textarea
                      label="Summary"
                      rows={5}
                      value={outcome.summary}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => outcome.onSummaryChange(e.target.value)}
                    />
                  </div>
                }
              >
                <Button
                  variant="icon"
                  size="icon-sm"
                  title="Outcome"
                  className="text-lyra-fg-secondary"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <CircleCheck className="h-4 w-4 text-lyra-status-info-strong" strokeWidth={1.5} />
                </Button>
              </Popover>
            ) : (
              // Also covers the `outcome && isClosed` case now (the real
              // popover above is gated on `!isClosed` too) — a historical
              // session with no `outcome` prop at all already rendered
              // nothing here once THIS branch itself is skipped for
              // `isClosed`, so a just-closed CURRENT session reads
              // identically (no icon) rather than a static disabled one.
              !isClosed && (
                <Button variant="icon" size="icon-sm" title="Outcome" className="text-lyra-fg-secondary">
                  <CircleCheck className="h-4 w-4 text-lyra-status-info-strong" strokeWidth={1.5} />
                </Button>
              )
            )}
            {/* Status tag — moved to the far right of the Consult/Transfer +
                Outcome cluster (was previously the leading element at the
                far left of this row) per explicit request. Same Popover/
                Menu/confirm-view behavior as before, just relocated. */}
            <Popover
              open={statusMenuOpen}
              onOpenChange={onStatusMenuOpenChange}
              placement="bottom"
              align="end"
              className="w-72"
              // The menu view wants Menu's own full-bleed rows (no inset —
              // `bare` already gives each row its own `p-1` breathing room);
              // the confirm view wants the normal 20px `content` inset for
              // its plain description paragraph. One Popover instance
              // serves both bodies (see this component's own doc comment
              // above), so `bodyPadding` just tracks whichever view is
              // showing right now rather than being fixed to one value.
              bodyPadding={statusMenuView === "confirm"}
              // `header`/`footer` are real `Popover` slots (`PanelHeader`
              // for the icon+title row, a plain button row for Close/
              // Cancel) — only supplied for the confirm view; the menu view
              // has neither, it's just `content`.
              header={
                statusMenuView === "confirm" ? (
                  <PanelHeader
                    title="Close Contact?"
                    icon={
                      <WarningIconSolid
                        className="h-5 w-5 text-lyra-status-critical-strong"
                        aria-hidden="true"
                      />
                    }
                    bordered={false}
                    className="px-5 pb-0"
                  />
                ) : undefined
              }
              footer={
                statusMenuView === "confirm" ? (
                  <div className="flex items-center justify-end gap-2 px-5 pb-4 pt-1">
                    <Button variant="destructive" size="md" onClick={onConfirmClose}>
                      Close
                    </Button>
                    <Button variant="outline" size="md" onClick={onCancelClose}>
                      Cancel
                    </Button>
                  </div>
                ) : undefined
              }
              content={
                statusMenuView === "confirm" ? (
                  <p className="pb-2 pt-1 lyra-body-md text-lyra-fg-secondary">
                    Closing a contact cannot be undone. Are you sure you want to close this contact?
                  </p>
                ) : (
                  <Menu
                    bare
                    items={TRANSCRIPT_SESSION_STATUS_OPTIONS.map((option) => ({
                      id: option.label,
                      label: option.label,
                      active: option.label === session.status,
                      icon: (
                        <span
                          aria-hidden="true"
                          className="block h-2 w-2 rounded-full"
                          style={{ backgroundColor: option.dotColor }}
                        />
                      ),
                      onClick: () => onSelectStatus(option.label),
                    }))}
                  />
                )
              }
            >
              <Button
                variant="ghost"
                size="sm"
                disabled={isClosed}
                aria-haspopup="menu"
                aria-expanded={statusMenuOpen}
                className="h-auto shrink-0 rounded-full p-0 disabled:opacity-100"
              >
                <Tag
                  label={session.status}
                  variant={TRANSCRIPT_SESSION_STATUS_VARIANT[session.status] ?? "neutral"}
                  shape="pill"
                  // The dropdown affordance lives INSIDE the pill, in the
                  // same trailing slot `Tag`'s own remove-button ("×") uses
                  // — `trailingIcon` (tag.tsx), not a sibling icon next to
                  // the Tag, which is why `tag.tsx` gained that prop rather
                  // than composing a second element here. Purely decorative
                  // (no `onClick` of its own): the whole pill is already
                  // this `Button`'s child, so a real nested button here
                  // would be invalid HTML and steal the click. Dropped for
                  // a Closed pill (see `isClosed`'s own doc comment) — once
                  // locked, this isn't a dropdown trigger anymore, so
                  // nothing here should suggest it still is. Rotates the
                  // same way `Select`'s own chevron does (select.tsx) while
                  // the popover is open, rather than a plain static glyph.
                  trailingIcon={
                    !isClosed && (
                      <ChevronDown
                        className={cn("transition-transform", statusMenuOpen && "rotate-180")}
                        strokeWidth={1.5}
                      />
                    )
                  }
                />
              </Button>
            </Popover>
            {/* Unassign & Dismiss — immediately right of the status tag, per
                explicit request. Same icon/action `ChannelTab`'s own kebab
                entry uses for this channel (see `onDismiss`'s own doc
                comment above for the exact scoping/wiring); only rendered
                at all for the current session, so there's no dead button on
                historical rows. `UserX` (not a warning/alert glyph) — per
                explicit correction, this isn't a warning; it just removes
                the agent from the assignment, and sharing `TriangleAlert`
                with the SLA-severity tab icon made the two easy to
                confuse at a glance. */}
            {onDismiss && !isClosed && (
              <Button
                variant="icon"
                size="icon-sm"
                title="Unassign & Dismiss"
                className="text-lyra-fg-secondary"
                onClick={onDismiss}
              >
                <UserX className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            )}
          </div>
        </div>
        <AccordionPrimitive.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="pb-4">
            <TranscriptSessionDetails session={session} />
          </div>
        </AccordionPrimitive.Content>
      </AccordionPrimitive.Item>
      <div
        className="pointer-events-none absolute inset-x-0 -bottom-8 h-8 bg-gradient-to-b from-lyra-bg-surface-base to-transparent"
        aria-hidden="true"
      />
    </AccordionPrimitive.Root>
  );
}

function InteractionTranscript({
  channelType,
  customerName,
  recordId,
  skillLabel,
  isFreshLaunch,
  reopenedSessions,
  liveMessages,
  currentStatus,
  onCurrentStatusChange,
  outcomeOpen,
  onOutcomeOpenChange,
  outcomeTags,
  onOutcomeTagsChange,
  outcomeDispositionCode,
  onOutcomeDispositionChange,
  outcomeSummary,
  onOutcomeSummaryChange,
  onOutcomeSave,
  onOutcomeCancel,
  onDismissChannel,
  dimmed,
}: {
  /** Which channel's content to show — see this component's own doc
   *  comment above. Undefined (no active interaction/channel yet) renders
   *  the same as SMS/WhatsApp. */
  channelType?: ChannelType;
  /** Real customer name to substitute for every customer-sender message's
   *  hardcoded mock name in the SMS/WhatsApp transcript — see this
   *  component's own doc comment above. (Used to also be shown at the far
   *  left of every `TranscriptSessionSeparator` row alongside the active
   *  channel's own address — dropped from there per a later explicit
   *  request, as redundant with the record-header tab/Customer Information
   *  panel; this message-substitution use is unaffected.) */
  customerName?: string;
  /** This interaction's own record id — used as the synthetic "just
   *  launched" session's Contact ID (see `isFreshLaunch` below). */
  recordId: string;
  /** The active channel's own skill preview (`TrackedChannel.preview`), if
   *  any — shown as the synthetic "just launched" session's Skill field. */
  skillLabel?: string;
  /** True only for an interaction whose card was just created this session
   *  (`ActiveInteraction.startedFresh` — see its own doc comment) — shows a
   *  single empty "Session Details" separator (today's date, no messages)
   *  for Chat/SMS/WhatsApp instead of the fixed mock chat log, since a
   *  brand-new text conversation genuinely has no history yet. Has no
   *  effect for Voice/Email — those always show their own fixed session
   *  (with its own placeholder "Coming Soon" body) regardless, since
   *  there's no "pre-existing conversation" for either to wrongly show in
   *  the first place. */
  isFreshLaunch: boolean;
  /**
   * One entry per time this channel was reopened (via "Add Channel") while
   * closed — `ActiveInteraction`'s own `TrackedChannel.reopenedSessions`,
   * passed straight through. Rendered as one additional, empty synthetic
   * "Session Details" separator per entry, appended AFTER whichever base
   * session list this channel type otherwise shows (see this component's
   * own doc comment above and the render return below) — see that field's
   * own doc comment for the full reasoning. Text channels
   * (chat/sms/whatsapp) only; always `undefined`/ignored for voice/email,
   * which have no equivalent multi-session concept (`isTextChannel` below
   * gates this the same way it gates `isFreshLaunch`). Each entry's own
   * `messagesBeforeReopen` is what lets `liveMessagesBySessionId` below
   * slice the flat `liveMessages` prop back into per-session chunks — see
   * that field's own doc comment (on `TrackedChannel.reopenedSessions`) for
   * the full boundary reasoning.
   */
  reopenedSessions?: { id: string; date: string; startTime: string; messagesBeforeReopen: number }[];
  /**
   * Messages actually sent this session (`InteractionComposer`'s Send
   * button) plus the simulated customer reply that follows — this
   * interaction's own `ActiveInteraction.liveMessages`, passed straight
   * through. Rendered after whatever the branches below otherwise show (the
   * fixed mock log, or nothing yet for a fresh SMS launch), in its own
   * trailing block — see the render return below. Tag state for these
   * messages (`liveMessageTags`) is kept separate from `sessionMessages`
   * (the mock log's own tag state) rather than merged into it: merging
   * would mean re-deriving a stable `sessionMessages` entry from a prop
   * that's a fresh `[]` reference on every render an interaction has no
   * live messages yet, which'd need an effect just to keep in sync for no
   * real benefit.
   */
  liveMessages: TranscriptMessage[];
  /**
   * The status last explicitly assigned (via the status popover) to the
   * ACTIVE channel's current/most-recent session — the caller resolves this
   * from `ActiveInteraction.channelStatuses[activeChannel.id]` (see that
   * field's own doc comment for why status has to be tracked per-channel,
   * up on `ActiveInteraction`, rather than purely in this component's own
   * state) and passes the single resolved value straight through. Only ever
   * applies to the LAST entry in `sessionsToRender` below (the "current"
   * session — the freshly-launched synthetic one, the shared mock log's
   * follow-up session, or Voice/Email's single session); every earlier/
   * historical session still uses its own local `sessionStatusOverrides`
   * state.
   */
  currentStatus?: string;
  /** Fires whenever the agent changes the CURRENT session's status via the
   *  popover (a plain pick, or confirming "Close") — the caller writes this
   *  back onto the active channel's own entry in `ActiveInteraction.
   *  channelStatuses` (`handleInteractionStatusChange`, main component).
   *  Never fires for a status change on any earlier/historical session —
   *  those stay local to this component (see `currentStatus` above). */
  onCurrentStatusChange: (status: string) => void;
  /**
   * Real Consult/Transfer + Outcome buttons on the CURRENT session's own
   * separator bar (`TranscriptSessionSeparator`, floated right per explicit
   * request) — all of these are the exact same shared `outcomeDraftKey`/
   * `outcomeDraft` state (main component) the LeftNav's `ChannelRow`
   * Outcome button already uses for THIS channel, threaded down as plain
   * values/setters rather than one bundled object so this component (which
   * has no other reason to know about `ChannelOutcomeConfig`'s shape) only
   * takes on the individual pieces it actually forwards. All optional and
   * only meaningfully passed together — see the render-call site
   * (`showPanelToggle` gates whether Customer Information / outcome state
   * exists at all in this app). `resolution`/`onResolutionChange` aren't
   * separate props here since they're just `currentStatus`/
   * `onCurrentStatusChange` above (one underlying value, same as the
   * LeftNav's own outcome wiring).
   */
  outcomeOpen?: boolean;
  onOutcomeOpenChange?: (open: boolean) => void;
  outcomeTags?: string[];
  onOutcomeTagsChange?: (tags: string[]) => void;
  outcomeDispositionCode?: string;
  onOutcomeDispositionChange?: (value: string) => void;
  outcomeSummary?: string;
  onOutcomeSummaryChange?: (value: string) => void;
  onOutcomeSave?: () => void;
  onOutcomeCancel?: () => void;
  /**
   * Real "Unassign & Dismiss" button on the CURRENT session's own separator
   * bar, immediately right of the status tag — per explicit request. Same
   * scoping as the `outcome*` props above: only meaningful for the CURRENT
   * session (the caller only ever passes this alongside a defined
   * `outcomeOpen`, mirroring that gate at the render-call site below),
   * since a historical/closed session has no live channel left to dismiss.
   * The caller wires this to the exact same `handleDismissChannel`/
   * `handleDismissInteraction` pair the LeftNav's `ChannelTab` kebab's own
   * "Unassign & Dismiss" entry already uses for this channel — same icon
   * (`UserX`), same action, just a second real trigger for it.
   */
  onDismissChannel?: () => void;
  /**
   * True once this whole conversation reads as over/read-only — either
   * `ActiveInteraction.closed` (a reopened, fully-closed historical
   * interaction) or the ACTIVE channel's own `channelStatuses` entry
   * reading `"Closed"` (still an otherwise-open assignment, just this one
   * channel closed via the status popover) — the same union of conditions
   * that already gate the "You are viewing a closed interaction."/"This
   * channel is closed." banners at the render call site, reused here
   * rather than re-derived from `currentStatus` alone so this fades for
   * BOTH closed states those two banners cover, not just one of them. Per
   * explicit request, fades every session's messages (not just the
   * current one) to 50% opacity — the whole conversation is inert now, not
   * just its most recent stretch. */
  dimmed?: boolean;
}) {
  // A freshly-launched Chat/SMS/WhatsApp interaction (see `isFreshLaunch`'s
  // own doc comment) shows just a single synthesized "Session Details"
  // separator (today's date, this interaction's own recordId/skill) with no
  // mock messages under it — a brand-new outbound conversation genuinely
  // has no history yet — in place of the fixed `TRANSCRIPT_SESSIONS` log.
  // Originally only SMS got this (per an earlier, narrower request); Chat/
  // WhatsApp fell through to the shared mock log even when freshly
  // launched, which is exactly the "brand-new WhatsApp shows a full,
  // pre-existing conversation" bug reported from a screenshot of a New
  // Outbound WhatsApp launch — every one of the three text-transcript
  // channel types has the same "no history yet" reality for a brand-new
  // outbound, so this now covers all three, not just SMS. Voice/Email are
  // deliberately NOT included here: they always render their own fixed
  // `TRANSCRIPT_SESSIONS_VOICE`/`_EMAIL` session (a placeholder body, not a
  // real conversation log) regardless of `isFreshLaunch` — there's no
  // "pre-existing conversation" for a call/email to wrongly show in the
  // first place. Either way, `liveMessages` (real, sent-this-visit
  // messages) renders in its own trailing block right after whichever of
  // the two this resolves to — see the render return below.
  //
  // Computed up here, before any hooks below, purely so `sessionsToRender`
  // (specifically its LAST entry's id) is available to `getSessionStatus`/
  // `selectSessionStatus`/`handleConfirmCloseSession` further down without
  // reordering those — this is a plain computation from props, not a hook
  // itself, so moving it earlier doesn't affect hook call order/count.
  const isTextChannel = channelType === "chat" || channelType === "sms" || channelType === "whatsapp";
  const isFreshTextLaunch = isTextChannel && isFreshLaunch;
  const now = new Date();
  // The synthesized fresh session's own "Channel" field (Session Details'
  // Contact ID/Date/.../Channel/Skill row) should read as whichever of the
  // three text channels was actually launched, not a hardcoded "SMS" now
  // that this also covers Chat/WhatsApp.
  const freshSessionChannelLabel =
    channelType === "whatsapp" ? "WhatsApp" : channelType === "chat" ? "Chat" : "SMS";
  // Voice/Email get their own session arrays (see `TRANSCRIPT_SESSIONS_VOICE`/
  // `TRANSCRIPT_SESSIONS_EMAIL`'s own doc comments) rather than falling
  // through to chat's `TRANSCRIPT_SESSIONS` — every channel type shows
  // session info, but a call or an email shouldn't be mislabeled "SMS" in
  // its own Session Details panel just because it fell into the same
  // default branch.
  const baseSessionsToRender: TranscriptSession[] = isFreshTextLaunch
    ? [
        {
          id: "session-fresh",
          caseId: recordId,
          date: now.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }),
          startTime: now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
          endTime: "—",
          channel: freshSessionChannelLabel,
          skill: skillLabel ?? "—",
          agent: `${CURRENT_AGENT_FIRST_NAME} ${CURRENT_AGENT_LAST_NAME}`,
          status: "Open",
          fingerprint: TRANSCRIPT_SESSION_FINGERPRINT,
          messages: [],
        },
      ]
    : channelType === "voice"
    ? TRANSCRIPT_SESSIONS_VOICE
    : channelType === "email"
    ? TRANSCRIPT_SESSIONS_EMAIL
    : TRANSCRIPT_SESSIONS;
  // One more synthetic, empty "Session Details" separator per reopen — see
  // `reopenedSessions`' own doc comment above. Same synthetic shape as
  // `session-fresh` above, just built from the reopen's own captured
  // date/time (`reopenedSessions` entries) instead of "now" and keyed by
  // that entry's own id rather than the fixed `"session-fresh"` one, so
  // several reopens on the same channel each render as their own distinct
  // row instead of colliding on id. Text channels only, same as
  // `isFreshTextLaunch` above — voice/email have no multi-session concept
  // to extend here (their `reopenedSessions` prop is always `undefined` in
  // practice, but `isTextChannel` guards this regardless).
  const reopenedSessionsToRender: TranscriptSession[] = isTextChannel
    ? (reopenedSessions ?? []).map((entry) => ({
        id: entry.id,
        caseId: recordId,
        date: entry.date,
        startTime: entry.startTime,
        endTime: "—",
        channel: freshSessionChannelLabel,
        skill: skillLabel ?? "—",
        agent: `${CURRENT_AGENT_FIRST_NAME} ${CURRENT_AGENT_LAST_NAME}`,
        status: "Open",
        fingerprint: TRANSCRIPT_SESSION_FINGERPRINT,
        messages: [],
      }))
    : [];
  const sessionsToRender: TranscriptSession[] = [...baseSessionsToRender, ...reopenedSessionsToRender];
  // The "current" session for status purposes — see `currentStatus`/
  // `onCurrentStatusChange`'s own doc comments above. Now always the most
  // RECENT reopen (if any) rather than always `baseSessionsToRender`'s own
  // last entry — reopening should hand "current" over to the brand-new
  // session, not leave it pointed at the old closed one.
  const lastSessionId = sessionsToRender[sessionsToRender.length - 1]?.id;
  // Per explicit request: a session that got superseded by a LATER reopen
  // on this same channel must keep reading "Closed" rather than reverting
  // to whatever generic status it started with (e.g. a mock "Open") the
  // moment it stops being `lastSessionId`. `handleStartCall`'s own
  // `isReopenOfClosedChannel` gate (main component) requires the channel to
  // already read "Closed" before a reopen is even possible in the first
  // place — so whichever session immediately precedes a
  // "session-reopened-..." entry in this array is, by construction, exactly
  // the one that was closed right before that reopen landed. Built directly
  // from `sessionsToRender` (not tracked via a mount/transition effect), so
  // this is correct even if the agent reopened this channel while looking
  // at a DIFFERENT one and only switches back here afterward — there's
  // nothing timing-dependent to miss.
  const supersededByReopenIds = new Set<string>();
  for (let i = 1; i < sessionsToRender.length; i++) {
    if (sessionsToRender[i].id.startsWith("session-reopened-")) {
      supersededByReopenIds.add(sessionsToRender[i - 1].id);
    }
  }

  // Slices the one flat `liveMessages` array back into per-session chunks,
  // keyed by session id — per explicit correction, reopening a closed
  // channel must NOT wipe its prior messages; they need to keep rendering
  // (dimmed) under their ORIGINAL session, with only the messages sent
  // since the reopen landing under the new one. Each `reopenedSessions`
  // entry's own `messagesBeforeReopen` (see that field's own doc comment)
  // is the exact index boundary: everything before the first reopen's
  // boundary belongs to `baseSessionsToRender`'s own last id (the session
  // `liveMessages` always attached to before reopens existed at all);
  // everything between one reopen's boundary and the next belongs to that
  // reopen's own session id; everything after the last boundary belongs to
  // the most recent reopen. Plain computation (not a memo) — cheap, and
  // `sessionsToRender` right above it isn't memoized either.
  const baseLiveMessageSessionId = baseSessionsToRender[baseSessionsToRender.length - 1]?.id;
  const liveMessagesBySessionId: Record<string, TranscriptMessage[]> = {};
  if (isTextChannel) {
    const boundaries = reopenedSessionsToRender.map(
      (_, idx) => reopenedSessions?.[idx]?.messagesBeforeReopen ?? liveMessages.length
    );
    let start = 0;
    if (baseLiveMessageSessionId) {
      const end = boundaries[0] ?? liveMessages.length;
      liveMessagesBySessionId[baseLiveMessageSessionId] = liveMessages.slice(0, end);
      start = end;
    }
    reopenedSessionsToRender.forEach((session, idx) => {
      const end = boundaries[idx + 1] ?? liveMessages.length;
      liveMessagesBySessionId[session.id] = liveMessages.slice(start, end);
      start = end;
    });
  } else if (baseLiveMessageSessionId) {
    // Voice/Email — no reopen concept at all (see `isTextChannel`'s own
    // gate above); the whole flat array still attaches to the single base
    // session's id, same as before this per-session slicing existed.
    liveMessagesBySessionId[baseLiveMessageSessionId] = liveMessages;
  }

  // Local, per-session tag state — removing/adding a tag on one message
  // shouldn't touch any other message's tags (in this session or any
  // other), so this is keyed by session id rather than one flat array.
  const [sessionMessages, setSessionMessages] = useState<Record<string, TranscriptMessage[]>>(() =>
    Object.fromEntries(TRANSCRIPT_SESSIONS.map((s) => [s.id, s.messages]))
  );
  // Which message's "Add tag" popover is open — at most one at a time,
  // across every session (message ids are already unique per session, so
  // a single id is enough with no session key needed alongside it).
  const [tagPickerOpenId, setTagPickerOpenId] = useState<string | null>(null);
  // Which sessions' "Session Details" panel is expanded — a Set, not a
  // single id, since sessions toggle open/closed independently rather than
  // as an exclusive accordion (matches the reference: clicking one
  // separator doesn't collapse another that's already open).
  const [openSessionIds, setOpenSessionIds] = useState<Set<string>>(new Set());

  const toggleSession = (sessionId: string) => {
    setOpenSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  // Per-session status, overriding whatever `TranscriptSession.status` the
  // static session data (`TRANSCRIPT_SESSIONS`/`_VOICE`/`_EMAIL`, or the
  // synthesized fresh-SMS session) started with — same "state lives here,
  // not in the static array" pattern as `sessionMessages` above. Keyed by
  // session id rather than nested under anything channel-specific since ids
  // are already unique across every session source.
  //
  // Only covers earlier/historical sessions now, NOT the current one
  // (`lastSessionId`) — that one's status is `currentStatus`, a prop from
  // `ActiveInteraction` (see its own doc comment for why), not local state
  // here. `getSessionStatus` picks whichever source applies per session,
  // falling back to that session's own built-in `status` until either kind
  // of override exists for it.
  const [sessionStatusOverrides, setSessionStatusOverrides] = useState<Record<string, string>>({});
  const getSessionStatus = (session: TranscriptSession) =>
    session.id === lastSessionId
      ? currentStatus ?? session.status
      // `supersededByReopenIds` (see its own doc comment above) wins over
      // this session's plain static `status` — a session that was closed
      // right before a reopen landed stays "Closed" by default here, same
      // as `sessionStatusOverrides` already lets the agent freeze any OTHER
      // historical session's status explicitly; either one can still
      // override that default via the normal status popover.
      : sessionStatusOverrides[session.id] ?? (supersededByReopenIds.has(session.id) ? "Closed" : session.status);

  // Which session's status popover is open, and which of that popover's two
  // bodies (the status list, or the "Close Contact?" confirm) it's
  // currently showing — see `TranscriptSessionSeparator`'s own doc comment
  // for why this is one Popover with a swappable body rather than two. At
  // most one open across the whole transcript at a time, same pattern as
  // `tagPickerOpenId` above.
  const [statusMenuOpenId, setStatusMenuOpenId] = useState<string | null>(null);
  const [statusMenuView, setStatusMenuView] = useState<"menu" | "confirm">("menu");

  // Opening (or re-opening) a session's status popover always starts on the
  // list view, never stranded on a stale "confirm" from a previous visit —
  // `onStatusMenuOpenChange(false)` (outside click, Escape, re-clicking the
  // trigger) resets both pieces of state so the next open is always fresh.
  const handleStatusMenuOpenChange = (sessionId: string, open: boolean) => {
    if (open) {
      setStatusMenuView("menu");
      setStatusMenuOpenId(sessionId);
    } else {
      setStatusMenuOpenId(null);
      setStatusMenuView("menu");
    }
  };

  // A non-"Closed" status picked straight from the list — applies right
  // away and closes the popover. "Closed" itself is deliberately not
  // handled here; see `handleConfirmCloseSession` below for why that one
  // status needs a confirm step first. Routes to `onCurrentStatusChange`
  // (up onto `ActiveInteraction`) for the current session specifically, or
  // local `sessionStatusOverrides` for any other (historical) session — see
  // `getSessionStatus`'s own comment for why these are two different
  // sources.
  const selectSessionStatus = (sessionId: string, status: string) => {
    if (status === "Closed") {
      setStatusMenuView("confirm");
      return;
    }
    if (sessionId === lastSessionId) {
      onCurrentStatusChange(status);
    } else {
      setSessionStatusOverrides((prev) => ({ ...prev, [sessionId]: status }));
    }
    setStatusMenuOpenId(null);
  };

  const handleConfirmCloseSession = (sessionId: string) => {
    if (sessionId === lastSessionId) {
      onCurrentStatusChange("Closed");
    } else {
      setSessionStatusOverrides((prev) => ({ ...prev, [sessionId]: "Closed" }));
    }
    setStatusMenuOpenId(null);
    setStatusMenuView("menu");
  };

  const handleCancelCloseSession = () => {
    setStatusMenuOpenId(null);
    setStatusMenuView("menu");
  };

  const removeTag = (sessionId: string, messageId: string, tagId: string) => {
    setSessionMessages((prev) => ({
      ...prev,
      [sessionId]: prev[sessionId].map((m) => (m.id === messageId ? { ...m, tags: m.tags?.filter((t) => t.id !== tagId) } : m)),
    }));
  };

  const clearTags = (sessionId: string, messageId: string) => {
    setSessionMessages((prev) => ({
      ...prev,
      [sessionId]: prev[sessionId].map((m) => (m.id === messageId ? { ...m, tags: [] } : m)),
    }));
  };

  const addTag = (sessionId: string, messageId: string, option: Omit<TranscriptTag, "id">) => {
    setSessionMessages((prev) => ({
      ...prev,
      [sessionId]: prev[sessionId].map((m) =>
        m.id === messageId
          ? { ...m, tags: [...(m.tags ?? []), { ...option, id: `${messageId}-${option.label.toLowerCase()}` }] }
          : m
      ),
    }));
    // Deliberately doesn't close the popover — picking a tag is meant to be
    // a quick multi-select (add Complain, then Help, then close when done),
    // not a one-shot pick. Closing is explicit: the header's close button,
    // or clicking off the popover (Radix's default outside-click handling
    // on `PopoverPrimitive.Content`, unchanged here).
  };

  const copyMessage = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  // Tag state for `liveMessages` (sent/received messages, not the fixed mock
  // log) — kept separate from `sessionMessages` above; see `liveMessages`
  // prop's own doc comment for why. Keyed by message id, same shape as
  // `sessionMessages`' per-message tags, just not nested under a session id
  // since there's only ever one flat live list, not several sessions' worth.
  const [liveMessageTags, setLiveMessageTags] = useState<Record<string, TranscriptTag[]>>({});

  const addLiveTag = (messageId: string, option: Omit<TranscriptTag, "id">) => {
    setLiveMessageTags((prev) => ({
      ...prev,
      [messageId]: [...(prev[messageId] ?? []), { ...option, id: `${messageId}-${option.label.toLowerCase()}` }],
    }));
  };

  const removeLiveTag = (messageId: string, tagId: string) => {
    setLiveMessageTags((prev) => ({
      ...prev,
      [messageId]: (prev[messageId] ?? []).filter((t) => t.id !== tagId),
    }));
  };

  const clearLiveTags = (messageId: string) => {
    setLiveMessageTags((prev) => ({ ...prev, [messageId]: [] }));
  };

  // Scroll to the latest message on open — every SMS/chat transcript should
  // land on the newest message (bottom of the last session) rather than the
  // very first one from potentially days ago. `useLayoutEffect` (not
  // `useEffect`) so this happens before the browser paints the first frame
  // — no visible flash of the top of the transcript before it jumps to the
  // bottom. Empty deps: fires once when this transcript mounts (i.e. an
  // interaction is opened), not on every re-render — adding a tag or
  // toggling a session's details shouldn't yank an agent's scroll position
  // back to the bottom while they're reading further up.
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Total message count across every session — the one number that tells us
  // whether "new" messages have shown up since the agent last looked at the
  // bottom of the transcript. Flattened rather than tracked per-session
  // since the "N new" chip is a single count regardless of which session(s)
  // the new messages landed in.
  const totalMessageCount = useMemo(
    () => Object.values(sessionMessages).reduce((sum, messages) => sum + messages.length, 0) + liveMessages.length,
    [sessionMessages, liveMessages]
  );

  // Whether the agent is currently scrolled to (near) the bottom — drives
  // the floating "Scroll To Latest" affordance, which should only appear
  // once they've scrolled up and away from the live edge of the
  // conversation.
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  // How many total messages had arrived as of the last time the agent was
  // at the bottom — a ref (not state) since it's only ever read inside
  // effects/handlers, never rendered directly.
  const lastSeenCountRef = useRef(totalMessageCount);
  // Mirrors `isAtBottom` into a ref purely so the auto-scroll effect below
  // can read its *current* value without listing it as a dependency — see
  // that effect's own comment for why it deliberately only re-fires on
  // `totalMessageCount` changing, not on every `isAtBottom` flip.
  const isAtBottomRef = useRef(isAtBottom);
  useEffect(() => {
    isAtBottomRef.current = isAtBottom;
  }, [isAtBottom]);

  const BOTTOM_THRESHOLD_PX = 24;
  const handleTranscriptScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsAtBottom(distanceFromBottom < BOTTOM_THRESHOLD_PX);
  };

  // Keeps the "N new" count in sync with reality: while at the bottom,
  // every message is by definition "seen," so the seen-count tracks the
  // live total and the chip stays hidden; once the agent scrolls away, any
  // further growth in the total is exactly how many they've missed.
  useEffect(() => {
    if (isAtBottom) {
      lastSeenCountRef.current = totalMessageCount;
      setNewMessageCount(0);
    } else {
      setNewMessageCount(Math.max(0, totalMessageCount - lastSeenCountRef.current));
    }
  }, [totalMessageCount, isAtBottom]);

  // Auto-scroll to the newest message as new ones arrive (a sent message, or
  // the simulated customer reply that follows it a couple seconds later).
  // Two different rules for the two cases:
  //  - The agent's OWN just-sent message always scrolls to it, regardless of
  //    where they'd scrolled to — they just took an action in this
  //    conversation, so they should see it land, same as `scrollToLatest`
  //    below. Also resets `isAtBottom` to `true` (as if they'd clicked
  //    "Scroll To Latest" themselves), so the customer's reply a couple
  //    seconds later keeps auto-scrolling right along with it too.
  //  - The simulated customer reply only scrolls if the agent was already
  //    caught up to the bottom (`isAtBottomRef.current`, read fresh rather
  //    than depended on — see that ref's own comment) — if they've scrolled
  //    up to read earlier messages, an incoming reply shouldn't yank them
  //    back down; it only self-resumes once they scroll back down
  //    themselves (`handleTranscriptScroll`) or click "Scroll To Latest".
  // Distinguished by `liveMessages`' own last entry's `sender` — the fixed
  // mock log never changes at runtime, so any growth in `liveMessages` is
  // exactly "the agent sent one" or "the customer replied," in that order.
  // Keyed on `liveMessages.length` (a primitive), not the `liveMessages`
  // array itself — that's a fresh `[]` reference every render an
  // interaction has no live messages yet (`activeInteraction.liveMessages
  // ?? []` at the call site), which would otherwise re-fire this effect on
  // every unrelated re-render (e.g. the shared clock tick).
  useEffect(() => {
    const lastLiveMessage = liveMessages[liveMessages.length - 1];
    const isOwnJustSentMessage = lastLiveMessage?.sender === "agent";
    if (!isOwnJustSentMessage && !isAtBottomRef.current) return;
    const el = scrollContainerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    if (isOwnJustSentMessage) setIsAtBottom(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMessages.length]);

  const scrollToLatest = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setIsAtBottom(true);
  };

  // SMS/WhatsApp (and no active channel yet) — the existing mock chat log,
  // with every customer-sender message's hardcoded mock name/initials
  // ("Liam Davis"/"LD") swapped for this interaction's real customer (see
  // this component's own doc comment above). Only `TranscriptMessageBubble`
  // sees the substituted copy — `sessionMessages` itself (and its tag
  // mutations, keyed by the mock message ids) stays untouched.
  const displayName = customerName?.trim() || "Liam Davis";
  const displayInitials = initialsFor(displayName);

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={scrollContainerRef}
        onScroll={handleTranscriptScroll}
        className="h-full overflow-y-auto"
      >
        <div className="w-full max-w-[1200px] mx-auto px-6 py-4">
          {sessionsToRender.map((session) => {
            // Falls back to `[]` for the synthetic "just launched" session
            // (not seeded into `sessionMessages` at mount, since it isn't
            // part of the fixed `TRANSCRIPT_SESSIONS` array that seeds that
            // state) — genuinely empty there, not a bug.
            const messages = sessionMessages[session.id] ?? [];
            // Patches this session's own current status (which may have
            // been changed via the status popover) onto the otherwise-
            // static session object — `TranscriptSessionSeparator`'s chip
            // and `TranscriptSessionDetails`' "Status" row both read
            // straight off `session.status`, so this one patch keeps both
            // in sync without either needing a separate status prop.
            const sessionWithCurrentStatus: TranscriptSession = {
              ...session,
              status: getSessionStatus(session),
            };
            // Per explicit request: the session detail row itself
            // (`TranscriptSessionSeparator` — the sticky "customerName |
            // address | N Messages | #caseId · date" header, plus its
            // status tag/Consult/Transfer/Outcome cluster) no longer dims
            // when a session reads as closed/historical — only the actual
            // conversation content under it (the mock/live message bubbles,
            // and the Voice/Email "Coming Soon" placeholder) still fades to
            // 50% opacity. Was one `opacity-50` on the whole per-session
            // wrapper (separator included) — moved down onto a new inner
            // wrapper around just the content below the separator instead;
            // see that inner div further down.
            const sessionContentDimmed = session.id !== lastSessionId || dimmed;
            return (
              <div key={session.id} className="flex flex-col">
                <TranscriptSessionSeparator
                  session={sessionWithCurrentStatus}
                  open={openSessionIds.has(session.id)}
                  onToggle={() => toggleSession(session.id)}
                  // Only a real, meaningful count for chat/SMS/WhatsApp —
                  // see this prop's own doc comment on `TranscriptSession
                  // Separator` for why Voice/Email (`messages: []`
                  // placeholders) are left `undefined` instead of `0`. Adds
                  // in this session's own slice of live messages
                  // (`liveMessagesBySessionId`) on top of the static mock
                  // count — a fresh/reopened synthetic session always has
                  // `messages: []` (nothing seeded into `sessionMessages`
                  // for it), so without this its header would always read
                  // "0 Messages" even once real messages exist under it.
                  messageCount={
                    isTextChannel
                      ? messages.length + (liveMessagesBySessionId[session.id]?.length ?? 0)
                      : undefined
                  }
                  statusMenuOpen={statusMenuOpenId === session.id}
                  statusMenuView={statusMenuView}
                  onStatusMenuOpenChange={(nextOpen) => handleStatusMenuOpenChange(session.id, nextOpen)}
                  onSelectStatus={(status) => selectSessionStatus(session.id, status)}
                  onConfirmClose={() => handleConfirmCloseSession(session.id)}
                  onCancelClose={handleCancelCloseSession}
                  // Real Outcome popover only for the CURRENT session (see
                  // this prop's own doc comment) — reuses `currentStatus`/
                  // `onCurrentStatusChange` (this component's own props)
                  // for the "Status" field, same as the LeftNav's
                  // `ChannelRow` Outcome button does for this same channel's
                  // own `interaction.channelStatuses` entry/`handleInteractionStatusChange`.
                  outcome={
                    session.id === lastSessionId && outcomeOpen !== undefined
                      ? {
                          open: outcomeOpen,
                          onOpenChange: onOutcomeOpenChange!,
                          resolutionOptions: TRANSCRIPT_SESSION_STATUS_OPTIONS,
                          resolution: currentStatus ?? "Resolved",
                          onResolutionChange: (value: string) => onCurrentStatusChange(value),
                          tagOptions: OUTCOME_TAG_OPTIONS,
                          selectedTags: outcomeTags ?? [],
                          onTagsChange: onOutcomeTagsChange!,
                          dispositionOptions: OUTCOME_DISPOSITION_OPTIONS,
                          dispositionCode: outcomeDispositionCode ?? OUTCOME_DISPOSITION_OPTIONS[0].value,
                          onDispositionChange: onOutcomeDispositionChange!,
                          summary: outcomeSummary ?? OUTCOME_DEFAULT_SUMMARY,
                          onSummaryChange: onOutcomeSummaryChange!,
                          onSave: onOutcomeSave!,
                          onCancel: onOutcomeCancel!,
                        }
                      : undefined
                  }
                  // Same "current session only" gate as `outcome` above —
                  // see `onDismissChannel`'s own doc comment for why.
                  onDismiss={session.id === lastSessionId ? onDismissChannel : undefined}
                  // Same "whole conversation is read-only" signal `dimmed`
                  // (this component's own prop, see its doc comment) already
                  // is — reused as-is rather than re-derived, so Consult/
                  // Transfer/Outcome/Unassign & Dismiss lock down here in
                  // lockstep with the exact same condition that already
                  // fades this session's own message content and drives the
                  // "closed interaction"/"channel is closed" banners above.
                  channelClosed={dimmed}
                />
                {/* Everything below the separator (mock/live message
                    bubbles, the Voice/Email placeholder) is what actually
                    dims — see `sessionContentDimmed`'s own doc comment
                    above for why this moved off the whole per-session
                    wrapper. Plain wrapper div, not `lyra-transcript-wrap`
                    itself (that container-type still lives on the messages
                    block right below, unchanged) and not an ancestor of
                    `TranscriptSessionSeparator` above (a SIBLING of this
                    div, same as before) — so its own `sticky top-0` keeps
                    working exactly as already documented there. */}
                <div className={cn(sessionContentDimmed && "opacity-50 transition-opacity")}>
                {messages.length > 0 && (
                  // `lyra-transcript-wrap` (container-type: inline-size,
                  // lyra-tokens.css — drives the avatar-collapse breakpoint
                  // below 400px) lives here, scoped to just this session's
                  // own messages — NOT on any ancestor of
                  // `TranscriptSessionSeparator` above (this div is that
                  // separator's SIBLING, not its parent). Two earlier
                  // placements both silently broke the separator's own
                  // `sticky top-0` ("we lost that at some point"): first the
                  // padded/centered column one level up from here, then
                  // (when moving it out to fix that) the scroll container
                  // itself — `container-type` implies CSS containment
                  // wherever it sits, and turns out ANY contained ancestor
                  // between a sticky element and its real scrolling
                  // ancestor stops that element from sticking at all, even
                  // the scrolling ancestor itself. This is the one spot
                  // that measures every message's avatar (still a
                  // descendant of THIS div) without being an ancestor of
                  // the sticky separator at all — confirmed against a live
                  // screenshot after the first fix didn't actually resolve
                  // it.
                  <div className="flex flex-col gap-5 py-4 lyra-transcript-wrap">
                    {messages.map((message) => (
                      <TranscriptMessageBubble
                        key={message.id}
                        message={
                          message.sender === "customer"
                            ? { ...message, name: displayName, initials: displayInitials }
                            : message
                        }
                        tagPickerOpen={tagPickerOpenId === message.id}
                        onTagPickerOpenChange={(open) => setTagPickerOpenId(open ? message.id : null)}
                        onAddTag={(option) => addTag(session.id, message.id, option)}
                        onRemoveTag={(tagId) => removeTag(session.id, message.id, tagId)}
                        onClearTags={() => clearTags(session.id, message.id)}
                        onCopy={() => copyMessage(message.text)}
                      />
                    ))}
                  </div>
                )}
                {/* Voice/Email have no designed message-by-message transcript
                    content yet (a call recording/summary UI, an email thread
                    UI) — a plain placeholder stands in for it under this
                    session's own separator, same as before this session
                    info was added for these two channels, just no longer
                    replacing the separator/Session Details too (see
                    `TRANSCRIPT_SESSIONS_VOICE`/`TRANSCRIPT_SESSIONS_EMAIL`'s
                    own doc comments). Keyed off `messages.length === 0`
                    rather than unconditionally for these channel types so a
                    future session that *does* get real messages seeded onto
                    it (e.g. once voice/email transcripts are designed) stops
                    showing this the moment it has any. */}
                {messages.length === 0 && (channelType === "voice" || channelType === "email") && (
                  <div className="flex items-center justify-center py-12">
                    <p className="lyra-body-md text-lyra-fg-secondary">
                      Coming Soon {channelType === "voice" ? "Voice" : "Email"} Content
                    </p>
                  </div>
                )}
                {/* Live messages — this interaction's own sent/received
                    messages (see `ActiveInteraction.liveMessages`'s own doc
                    comment) — rendered here, INSIDE this session's own
                    per-session block, not as a separate block after this
                    whole `.map()` (where it used to live). Sliced per-
                    session via `liveMessagesBySessionId` (see that const's
                    own doc comment) rather than always attaching the whole
                    flat array to `lastSessionId` — per explicit correction,
                    reopening a closed channel keeps its PRIOR messages
                    visible under their original session (dimmed, above),
                    with only newly-sent messages landing under the current
                    one. Still no separator of its own — it's a continuation
                    of the same session's conversation, not a new session —
                    but it has to be a DOM descendant of this same
                    `<div key={session.id}>` for `TranscriptSessionSeparator`'s
                    `sticky top-0` above to actually work once live messages
                    are what's overflowing: a `position: sticky` element can
                    only stick for as long as its OWN containing block still
                    has height below it to scroll through. With live
                    messages rendered as a sibling of this whole block
                    instead of inside it, the fresh-launch session's own
                    container held nothing but the separator itself (its
                    real `messages` array is empty — the conversation is
                    entirely live), so that container's height was
                    essentially zero and the separator unstuck itself almost
                    immediately — sticky worked for the fixed mock sessions
                    (separator + real messages sharing one container) but
                    not for a brand-new conversation (per explicit report:
                    "sticky for existing conversations but new conversations
                    ... when the conversation reaches an overflow-y it is
                    not sticky"). */}
                {(() => {
                  const sessionLiveMessages = liveMessagesBySessionId[session.id] ?? [];
                  return (
                    sessionLiveMessages.length > 0 && (
                      <div className="flex flex-col gap-5 py-4">
                        {sessionLiveMessages.map((message) => (
                          <TranscriptMessageBubble
                            key={message.id}
                            message={{
                              ...message,
                              ...(message.sender === "customer" ? { name: displayName, initials: displayInitials } : {}),
                              tags: liveMessageTags[message.id] ?? message.tags,
                            }}
                            tagPickerOpen={tagPickerOpenId === message.id}
                            onTagPickerOpenChange={(open) => setTagPickerOpenId(open ? message.id : null)}
                            onAddTag={(option) => addLiveTag(message.id, option)}
                            onRemoveTag={(tagId) => removeLiveTag(message.id, tagId)}
                            onClearTags={() => clearLiveTags(message.id)}
                            onCopy={() => copyMessage(message.text)}
                          />
                        ))}
                      </div>
                    )
                  );
                })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {!isAtBottom && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={scrollToLatest}
            className="pointer-events-auto rounded-full bg-lyra-bg-surface-base text-lyra-fg-default shadow-lg"
          >
            <ArrowDown className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            Scroll To Latest
            {newMessageCount > 0 && (
              <Badge color="slate" variant="solid">
                {newMessageCount} New
              </Badge>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── Quick replies ──
   Canned-response data for `InteractionComposer`'s "/trigger" picker
   (`QuickReplyMenu`/`QuickReplyVariableForm`, both lyra-ui exports) — app-
   local business content, same "reusable UI in lyra-ui, real data in the
   app" split as `CONTACT_HISTORY`/`CREATE_NEW_CUSTOMERS` and everything
   else in this file that isn't generic across every lyra-ui consumer.

   `rich`/`fields` items need a value chosen for each `{token}` in their
   `template` before they make sense to send (a business-day range, a
   department, a date/time) — `InteractionComposer` swaps the matching
   list for `QuickReplyVariableForm` to collect those, keyed by each
   field's own `key`, which must match a `{key}` token in `template`
   exactly (see `fillQuickReplyTemplate` below). Plain (non-`rich`) items
   have no `fields` at all and insert `template` verbatim. */
interface QuickReplyItem {
  /** The id typed after `QUICK_REPLY_TRIGGER_CHAR` to reach this item */
  id: string;
  title: string;
  /** May contain `{key}` tokens matching `fields[].key`, for a `rich` item */
  template: string;
  rich?: boolean;
  fields?: QuickReplyField[];
}

const QUICK_REPLIES: QuickReplyItem[] = [
  { id: "greeting", title: "Greeting", template: "Thank you for contacting us. How can I assist you today?" },
  { id: "acknowledge", title: "Acknowledge", template: "I understand your concern. Let me look into that for you." },
  { id: "account", title: "Request Account #", template: "Could you please provide me with your account number?" },
  { id: "reviewed", title: "Account Reviewed", template: "I've reviewed your account and I can see the issue." },
  { id: "escalate", title: "Escalate", template: "I'm escalating this to our specialist team right away." },
  {
    id: "timeline",
    title: "Processing Time",
    template: "Please allow {days} business days for this to take effect.",
    rich: true,
    fields: [
      {
        key: "days",
        label: "Business Days",
        type: "select",
        options: [
          { value: "1–2", label: "1–2" },
          { value: "3–5", label: "3–5" },
          { value: "5–7", label: "5–7" },
          { value: "7–10", label: "7–10" },
        ],
      },
    ],
  },
  { id: "closing", title: "Closing", template: "Is there anything else I can help you with today?" },
  {
    id: "success",
    title: "Request Success",
    template: "Your {requestType} has been processed successfully.",
    rich: true,
    fields: [{ key: "requestType", label: "Request Type", type: "text", placeholder: "e.g. refund request" }],
  },
  {
    id: "callback",
    title: "Schedule Callback",
    template: "I'll arrange a callback on {date} at {time} for you.",
    rich: true,
    fields: [
      { key: "date", label: "Date", type: "date" },
      { key: "time", label: "Time", type: "time" },
    ],
  },
  {
    id: "transfer",
    title: "Transfer Notice",
    template: "I'm transferring you to {department}. Please hold for a moment.",
    rich: true,
    fields: [
      {
        key: "department",
        label: "Department",
        type: "select",
        options: [
          { value: "Billing", label: "Billing" },
          { value: "Technical Support", label: "Technical Support" },
          { value: "Retention", label: "Retention" },
          { value: "Escalations", label: "Escalations" },
          { value: "Account Management", label: "Account Management" },
        ],
      },
    ],
  },
  { id: "thankyou", title: "Thank You", template: "Thank you so much for your patience. We really appreciate it!" },
  { id: "sorry", title: "Apology", template: "I sincerely apologize for the inconvenience this has caused you." },
];

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

/** Fills a `rich` item's `template` from its current field values —
 *  `bracket` wraps each filled-in value in `[...]` (matching the reference
 *  mockup's own preview treatment, e.g. "Please allow [1–2] business
 *  days...") for the live preview shown while still editing; the final
 *  text actually inserted into the composer (`bracket: false`) has no
 *  brackets, since those were only ever a preview affordance marking which
 *  parts of the sentence came from a field. Plain (non-`rich`) items never
 *  reach this — their `template` has no `fields`/tokens to fill and is
 *  used as-is. */
function fillQuickReplyTemplate(
  item: QuickReplyItem,
  values: Record<string, string | Date | undefined>,
  bracket: boolean
): string {
  if (!item.fields) return item.template;
  return item.fields.reduce((text, field) => {
    const display = quickReplyFieldDisplayValue(field, values[field.key]);
    const shown = bracket && display !== `{${field.key}}` ? `[${display}]` : display;
    return text.split(`{${field.key}}`).join(shown);
  }, item.template);
}

/* ── InteractionComposer ──
   The message-input bar fixed to the bottom of an active interaction's
   detail page — a sibling rendered right after `InteractionTranscript`
   rather than living inside it, so it's a `shrink-0` row in the same flex
   column instead of scrolling away with the transcript above it (which is
   the `flex-1 overflow-y-auto` element doing all the scrolling).

   Composed from existing lyra-ui exports (`Textarea`, `Button`,
   `ActionIconButton`) plus the two new `QuickReplyMenu`/
   `QuickReplyVariableForm` exports for the "/trigger" quick-reply picker
   (see the "Quick replies" data block above this component). The "Send ▾"
   control is hand-built from two adjacent `Button`s (rounded-r-none /
   rounded-l-none, a hairline divider between) since lyra-ui has no
   dedicated split-button component; same reasoning as everywhere else in
   this file that composes existing atoms rather than waiting on a new
   lyra-ui primitive.

   Quick-reply mechanics: typing `/` (`QUICK_REPLY_TRIGGER_CHAR` below —
   `/` rather than `#`, per explicit request: it's the near-universal
   chat-command convention, e.g. Slack/Discord/Front/Intercom/Zendesk,
   where `#` almost always means a hashtag/channel instead) followed by
   any run of word characters with the caret still immediately after them
   (`QUICK_REPLY_TRIGGER_PATTERN` below, re-tested against the text up to
   the caret on every keystroke) opens the menu, filtered to items whose
   `id`/`title` contains what's typed so far; the (existing, previously
   unwired) "Quick replies" toolbar button opens the same menu at the
   current caret with no filter instead, for agents who'd rather browse
   than type a shortcut from memory. `quickReplyTriggerStart` records
   where the inserted/replaced range begins — either the `/`'s own
   position (typed trigger) or the bare caret (toolbar button, nothing to
   replace, pure insert). The menu itself owns no keyboard state (see
   `QuickReplyMenu`'s own doc comment) — arrow keys/Enter/Escape are all
   handled by this component's `onKeyDown` on the `Textarea` itself, so
   the textarea never loses focus/caret position while browsing. Selecting
   a plain item inserts `template` immediately; selecting a `rich` one
   swaps the same on-screen spot to `QuickReplyVariableForm` instead of
   closing, so the agent can fill in its field(s) — see
   `fillQuickReplyTemplate`'s own doc comment for the bracketed-preview-
   vs-final-insert distinction — before either inserting or cancelling
   back out (Cancel closes the whole picker rather than returning to the
   list, same "start over from `/`" flow either way).

   `onSend` hands the typed text up to `handleSendMessage` (the main
   component, where `interactions`/`setInteractions` actually live — this
   component has no access to that state itself) — that's what pushes the
   message into the active interaction's `liveMessages` and schedules the
   simulated customer reply. This component still owns nothing but the
   input's own text (and now the quick-reply picker's transient state);
   it doesn't know or care what happens to a message once sent. */
const QUICK_REPLY_TRIGGER_CHAR = "/";
const QUICK_REPLY_TRIGGER_PATTERN = /\/(\w*)$/;
function InteractionComposer({ onSend }: { onSend: (text: string) => void }) {
  const [message, setMessage] = useState("");
  const canSend = message.trim().length > 0;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Per explicit request: tabbing out of the message textarea should land
  // on the Send button first — not the toolbar's Attach/Bold/Italic/etc.
  // icon buttons, which sit BEFORE Send in visual/DOM order (see the render
  // below) and so would otherwise be next in line for a plain, un-messed-
  // with browser Tab order. `handleComposerKeyDown` intercepts Tab on the
  // textarea itself and focuses this directly instead of letting the
  // browser's default order run.
  const sendButtonRef = useRef<HTMLButtonElement>(null);

  // ── Quick-reply picker state ──
  // `quickReplyTriggerStart` is the message-text index the eventually-
  // inserted text replaces through to the caret at insert time — either
  // where the typed trigger character itself sits (so "/time" gets
  // replaced outright),
  // or the bare caret position when opened via the toolbar button instead
  // (nothing typed to replace, a pure insert at that point). `null` means
  // closed. See this component's own doc comment above for the full flow.
  const [quickReplyTriggerStart, setQuickReplyTriggerStart] = useState<number | null>(null);
  const [quickReplyQuery, setQuickReplyQuery] = useState("");
  const [quickReplyActiveIndex, setQuickReplyActiveIndex] = useState(0);
  // Non-null while showing `QuickReplyVariableForm` for a `rich` item
  // instead of the plain matching list — same overlay slot, different
  // content (see the render below).
  const [quickReplyConfiguring, setQuickReplyConfiguring] = useState<QuickReplyItem | null>(null);
  const [quickReplyFieldValues, setQuickReplyFieldValues] = useState<Record<string, string | Date | undefined>>({});
  const quickReplyOpen = quickReplyTriggerStart !== null;
  const quickReplyContainerRef = useRef<HTMLDivElement>(null);

  const quickReplyMatches = useMemo(() => {
    const q = quickReplyQuery.trim().toLowerCase();
    if (!q) return QUICK_REPLIES;
    return QUICK_REPLIES.filter(
      (item) => item.id.toLowerCase().includes(q) || item.title.toLowerCase().includes(q)
    );
  }, [quickReplyQuery]);

  const closeQuickReplyMenu = () => {
    setQuickReplyTriggerStart(null);
    setQuickReplyQuery("");
    setQuickReplyActiveIndex(0);
    setQuickReplyConfiguring(null);
    setQuickReplyFieldValues({});
  };

  // Dismiss on outside click — this menu is a plain absolutely-positioned
  // overlay, not a `Popover` (see this component's own doc comment for
  // why: the `Textarea` itself must keep focus/caret while browsing, which
  // rules out a focus-trapping Radix popover). `mousedown` (not `click`)
  // so this fires before a menu-row's own `onClick` — the row's click
  // handler still runs normally afterward since it's inside
  // `quickReplyContainerRef` and skipped here.
  //
  // The `[data-radix-popper-content-wrapper]` check covers
  // `QuickReplyVariableForm`'s own `Select`/`DatePicker`/`TimePicker`
  // fields — Radix always portals THEIR dropdown/calendar content
  // straight to `document.body`, outside `quickReplyContainerRef`'s own
  // DOM subtree, no matter how deeply nested those fields are inside it.
  // Without this, picking e.g. a Business Days option registered as an
  // "outside" click and closed the whole rich form before the selection
  // even landed — confirmed live. Every Radix popper-positioned surface
  // (`Popover`/`Select`/`DropdownMenu`/etc., all built on
  // `@radix-ui/react-popper`) tags its own wrapper with this attribute,
  // so this isn't specific to any one field type.
  useEffect(() => {
    if (!quickReplyOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (quickReplyContainerRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-radix-popper-content-wrapper]")) return;
      closeQuickReplyMenu();
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [quickReplyOpen]);

  // Replaces `[quickReplyTriggerStart, caret)` — the typed "/query" (or,
  // for the toolbar-button path, a zero-length range right at the caret)
  // — with `text`, then restores focus with the caret placed right after
  // the newly-inserted text. `requestAnimationFrame` — the caret can only
  // be repositioned after React actually commits the new `value` to the
  // DOM `<textarea>`, which hasn't happened yet inside this same handler.
  const insertQuickReplyText = (text: string) => {
    const el = textareaRef.current;
    const start = quickReplyTriggerStart ?? el?.selectionStart ?? message.length;
    const end = el?.selectionStart ?? message.length;
    const next = message.slice(0, start) + text + message.slice(end);
    setMessage(next);
    const caret = start + text.length;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  };

  const handleSelectQuickReply = (item: QuickReplyItem) => {
    if (item.rich) {
      setQuickReplyConfiguring(item);
      setQuickReplyFieldValues({});
      return;
    }
    insertQuickReplyText(item.template);
    closeQuickReplyMenu();
  };

  const handleInsertRichQuickReply = () => {
    if (!quickReplyConfiguring) return;
    insertQuickReplyText(fillQuickReplyTemplate(quickReplyConfiguring, quickReplyFieldValues, false));
    closeQuickReplyMenu();
  };

  const openQuickReplyMenuAtCaret = () => {
    const el = textareaRef.current;
    setQuickReplyTriggerStart(el?.selectionStart ?? message.length);
    setQuickReplyQuery("");
    setQuickReplyActiveIndex(0);
    el?.focus();
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    const caret = e.target.selectionStart ?? value.length;
    const match = QUICK_REPLY_TRIGGER_PATTERN.exec(value.slice(0, caret));
    if (match) {
      setQuickReplyTriggerStart(caret - match[0].length);
      setQuickReplyQuery(match[1]);
      setQuickReplyActiveIndex(0);
    } else if (quickReplyOpen && !quickReplyConfiguring) {
      // Only auto-closes the plain matching list on a non-matching edit —
      // once `quickReplyConfiguring` is set the agent's focus has moved
      // into the variable form's own fields, so further edits (there
      // shouldn't be any — the textarea isn't part of that flow anymore)
      // shouldn't tear down the form out from under them.
      closeQuickReplyMenu();
    }
  };

  // Arrow keys/Enter/Escape all handled here, not inside `QuickReplyMenu`
  // itself — see this component's own doc comment for why the textarea
  // must keep owning focus/caret the whole time the menu is open.
  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (quickReplyOpen && !quickReplyConfiguring) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setQuickReplyActiveIndex((i) => Math.min(i + 1, Math.max(quickReplyMatches.length - 1, 0)));
          break;
        case "ArrowUp":
          e.preventDefault();
          setQuickReplyActiveIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          if (quickReplyMatches[quickReplyActiveIndex]) {
            e.preventDefault();
            handleSelectQuickReply(quickReplyMatches[quickReplyActiveIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          closeQuickReplyMenu();
          break;
      }
      return;
    }
    // Per explicit request — ordinary typing (the quick-reply picker isn't
    // up): plain Enter sends the message, same as most chat composers
    // (Slack/Intercom/etc.); Shift+Enter still inserts a real newline,
    // since the textarea is multi-line (`rows={3}`) and losing that would
    // make a multi-paragraph reply impossible to type. `handleSend` itself
    // already no-ops on an empty/whitespace-only message (`canSend`), so
    // this is safe to fire unconditionally on a bare Enter.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }
    // Same request, other half: Tab out of the textarea goes straight to
    // Send, not into the Attach/Bold/Italic/Emoji/Quick replies/Templates
    // toolbar row that sits before it in DOM order (see the render below) —
    // those would otherwise be next in a plain, un-intercepted Tab order.
    // Shift+Tab (backing OUT of the textarea) is left alone, same reasoning
    // `Enter` above leaves Shift+Enter alone.
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      sendButtonRef.current?.focus();
    }
  };

  const handleSend = () => {
    if (!canSend) return;
    onSend(message);
    setMessage("");
  };

  return (
    <div className="relative shrink-0 bg-lyra-bg-surface-base px-6 py-4">
      {/* Soft fade instead of a hard border-top — reads as the transcript
          scrolling *under* the composer rather than stopping at a line.
          Positioned outside this div's own box (negative top), so it
          overlays the last ~32px of the scrollable transcript sitting
          directly above it (that sibling isn't `overflow-hidden` on itself
          from the outside, only its own internal scroll is clipped, so an
          absolutely-positioned overlay from a neighboring box can still
          paint over it). */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-b from-transparent to-lyra-bg-surface-base"
        aria-hidden="true"
      />
      <div className="w-full max-w-[1200px] mx-auto">
        {quickReplyOpen && (
          // Normal flow, NOT `absolute` — this used to float over the
          // transcript above (a sibling `flex-1 overflow-y-auto` box, not
          // a descendant this composer can resize directly), which
          // visually buried the last few messages behind an opaque panel
          // the agent couldn't scroll past. Sitting in-flow instead grows
          // this composer's own (`shrink-0`) height, which — same flexbox
          // math that already keeps the composer pinned to the bottom at
          // its natural size — shrinks the transcript's available height
          // to make room rather than covering any of it, so its own
          // scrolling keeps working exactly as before, just over a
          // shorter viewport while this is open.
          <div ref={quickReplyContainerRef} className="mb-2">
            {quickReplyConfiguring ? (
              <QuickReplyVariableForm
                title={quickReplyConfiguring.title}
                hashtagId={quickReplyConfiguring.id}
                triggerChar={QUICK_REPLY_TRIGGER_CHAR}
                fields={quickReplyConfiguring.fields ?? []}
                values={quickReplyFieldValues}
                onValueChange={(key, value) => setQuickReplyFieldValues((prev) => ({ ...prev, [key]: value }))}
                preview={fillQuickReplyTemplate(quickReplyConfiguring, quickReplyFieldValues, true)}
                onCancel={closeQuickReplyMenu}
                onClose={closeQuickReplyMenu}
                onInsert={handleInsertRichQuickReply}
              />
            ) : (
              <QuickReplyMenu
                query={quickReplyQuery}
                triggerChar={QUICK_REPLY_TRIGGER_CHAR}
                items={quickReplyMatches.map((item): QuickReplyMenuItem => ({
                  id: item.id,
                  title: item.title,
                  preview: item.template,
                  rich: item.rich,
                }))}
                activeIndex={quickReplyActiveIndex}
                onHoverItem={setQuickReplyActiveIndex}
                onSelect={(menuItem) => {
                  const item = QUICK_REPLIES.find((r) => r.id === menuItem.id);
                  if (item) handleSelectQuickReply(item);
                }}
                onClose={closeQuickReplyMenu}
              />
            )}
          </div>
        )}
        <Textarea
          ref={textareaRef}
          label="Chat with Customer"
          placeholder="Type a message... or / for quick replies"
          rows={3}
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleComposerKeyDown}
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <ActionIconButton size="sm" title="Attach file">
              <Paperclip className="h-4 w-4" strokeWidth={1.5} />
            </ActionIconButton>
            <ActionIconButton size="sm" title="Bold">
              <Bold className="h-4 w-4" strokeWidth={1.5} />
            </ActionIconButton>
            <ActionIconButton size="sm" title="Italic">
              <Italic className="h-4 w-4" strokeWidth={1.5} />
            </ActionIconButton>
            <ActionIconButton size="sm" title="Emoji">
              <Smile className="h-4 w-4" strokeWidth={1.5} />
            </ActionIconButton>
            <ActionIconButton size="sm" title="Quick replies" onClick={openQuickReplyMenuAtCaret}>
              <Zap className="h-4 w-4" strokeWidth={1.5} />
            </ActionIconButton>
            <ActionIconButton size="sm" title="Templates">
              <FileText className="h-4 w-4" strokeWidth={1.5} />
            </ActionIconButton>
          </div>
          <div className="inline-flex items-center">
            <Button
              ref={sendButtonRef}
              variant="default"
              size="lg"
              className="gap-1.5 rounded-r-none"
              disabled={!canSend}
              onClick={handleSend}
            >
              <Send className="h-4 w-4" strokeWidth={1.5} />
              Send
            </Button>
            <Button
              variant="default"
              size="icon-lg"
              className="rounded-l-none border-l border-white/25"
              disabled={!canSend}
              title="More send options"
            >
              <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── CustomerInformationPanelBody ──
   Body content for the "Customer Information" `InteriorPanel` docked right
   of an active interaction — a profile block (avatar initials + name +
   presence),
   two placeholder tab sections, and a detail-row list, reproducing the
   reference mockup's layout as placeholder content (real per-tab data isn't
   wired up yet, same "prototype the shape first" status as the transcript
   above).

   The mockup's field rows (label left, value right, hairline divider) are
   lyra-ui's own documented "Label Horizontal With Separator" composition
   (see Input.stories.tsx) — `Label` (not a plain span) + a value span
   (`lyra-body-md text-lyra-fg-secondary`) + `Separator`, not literally the
   `Input` component itself (Input's own `readonly` mode still renders a
   bordered box, which isn't this shape at all — the horizontal/label-only
   look lives in this separate story pattern, composed from `Label` +
   `Separator`, both already lyra-ui exports). Avatar uses initials
   (`initialsFor`, already used everywhere else in this file) instead of
   the mockup's photo — no photo source exists for these interactions. */

interface CustomerInfoField {
  label: string;
  value: string;
}

// Content swapped from the earlier agent-metrics mockup to real customer
// contact/billing fields (per a later reference screenshot) — same
// Label + Separator row formatting as before. The values themselves used to
// be one fixed placeholder profile (literally the app owner's own info,
// "dBauer79"/"david.bauer@nice.com") shown for every interaction regardless
// of who the actual customer was — confirmed from a screenshot that this
// read as static/disconnected rather than describing whoever was actually
// open. Replaced below with `buildCustomerInfoFields`, which derives a
// profile per interaction instead.

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

// There's no real per-customer contact/billing record anywhere in this
// app's data — `CREATE_NEW_CUSTOMERS` (lyra-ui's shared customer fixture,
// see the import above) only carries `id`/`name`/`customerId`/`channels`,
// nothing address- or billing-shaped. These pools exist so the synthesized
// profile below reads as plausible varied data (different customers land on
// different cities/streets) rather than everyone getting the exact same
// invented address with only the house number changing.
const CUSTOMER_INFO_STREET_NAMES = [
  "Clinton Heights Ave", "Maple Grove Dr", "Sunset Ridge Ln", "Harbor View Ct",
  "Cedar Hollow Rd", "Birchwood Ter", "Fieldstone Way", "Willow Creek Blvd",
];
const CUSTOMER_INFO_CITY_STATE: { city: string; state: string }[] = [
  { city: "Columbus", state: "OH" },
  { city: "Austin", state: "TX" },
  { city: "Portland", state: "OR" },
  { city: "Raleigh", state: "NC" },
  { city: "Denver", state: "CO" },
  { city: "Tampa", state: "FL" },
  { city: "Madison", state: "WI" },
  { city: "Boise", state: "ID" },
];

/** A plausible (but invented) US phone number, formatted to match this
 *  panel's own existing style ("+1 614 749 1794") — used only as a fallback
 *  when the active interaction has no real voice channel address to show
 *  instead (see `buildCustomerInfoFields` below). */
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

/** Builds this panel's field list for whichever customer/interaction is
 *  actually open, instead of one fixed placeholder profile shown for every
 *  interaction. Prefers real data already on the interaction itself over
 *  synthesized filler: `recordId` (the same id already shown in the panel's
 *  own header subhead) becomes "Contact #", and "Phone #"/"Email" read the
 *  real address a voice/email channel was actually opened on
 *  (`TrackedChannel.addressLabel`/`value` — see that field's own doc
 *  comment) when one exists, since that's genuine data particular to this
 *  interaction, not invented. Everything else (balance, street address,
 *  city/state/zip) has no real source anywhere in this app's data — see the
 *  const comment above — so it's deterministically synthesized from
 *  `recordId` via `hashSeed`, which at least keeps a given customer's
 *  "invented" details stable across reopens instead of reshuffling every
 *  render. */
function buildCustomerInfoFields(
  customerName: string | undefined,
  recordId: string,
  channels: TrackedChannel[]
): CustomerInfoField[] {
  const name = customerName ?? "Customer";
  const { firstName, lastName } = splitCustomerName(customerName);
  const seed = hashSeed(recordId || name);

  const voiceChannel = channels.find((c) => c.type === "voice");
  const emailChannel = channels.find((c) => c.type === "email");

  const phone = voiceChannel?.addressLabel ?? voiceChannel?.value ?? synthesizePhone(seed);
  const email = emailChannel?.value ?? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;

  const { city, state } = CUSTOMER_INFO_CITY_STATE[seed % CUSTOMER_INFO_CITY_STATE.length];
  const street = CUSTOMER_INFO_STREET_NAMES[Math.floor(seed / 7) % CUSTOMER_INFO_STREET_NAMES.length];
  const houseNumber = 100 + (seed % 900);
  const zipCode = String(10000 + (seed % 89999)).padStart(5, "0");
  const balance = (seed % 25000) / 100;

  return [
    { label: "Phone #", value: phone },
    { label: "Contact #", value: recordId },
    { label: "Email", value: email },
    { label: "Balance", value: balance.toLocaleString("en-US", { style: "currency", currency: "USD" }) },
    { label: "Address", value: `${houseNumber} ${street}` },
    { label: "City", value: city },
    { label: "State", value: state },
    { label: "Zip Code", value: zipCode },
  ];
}

// "Latest Interaction" summary shown on the Overview tab, below the
// contact/billing field list. Same "no real per-customer data source, so
// deterministically synthesize one from the customer's own recordId"
// approach as `buildCustomerInfoFields` above — used to be one fixed
// summary (gendered pronoun and all: "Walked *her* through the upgrade
// flow") shown for every interaction regardless of who was actually open,
// which read just as disconnected as the old fixed contact-fields
// placeholder did. Pools below are written in third person with no
// pronouns at all, since the same pool is shared across every customer.
interface CustomerLatestInteraction {
  timeAgo: string;
  channel: string;
  status: string;
  /** Reuses `ContactHistoryStatusVariant` (its own `Badge`'s circle-shape
   *  `variant` vocabulary) now that status renders as a small dot + label
   *  instead of a pill `Badge` — see the render site's own doc comment for
   *  why. */
  statusVariant: ContactHistoryStatusVariant;
  summary: string;
  caseId: string;
  handledBy: string;
}

const CUSTOMER_LATEST_INTERACTION_STATUS_POOL: { status: string; variant: ContactHistoryStatusVariant }[] = [
  { status: "Resolved", variant: "success" },
  { status: "Escalated", variant: "critical" },
  { status: "Pending", variant: "warning" },
];

const CUSTOMER_LATEST_INTERACTION_CHANNEL_POOL = ["Email", "Voice", "Chat", "SMS"];

const CUSTOMER_LATEST_INTERACTION_TIME_AGO_POOL = [
  "3 days ago", "9 days ago", "2 weeks ago", "3 weeks ago", "1 month ago", "6 weeks ago",
];

const CUSTOMER_LATEST_INTERACTION_SUMMARY_POOL = [
  "Asked about upgrading to the Pro tier for additional storage. Walked through the upgrade flow and confirmed the new billing amount.",
  "Reported trouble accessing the account after a password reset. Verified identity via KBA and confirmed access was restored.",
  "Requested a copy of the most recent invoice. Located the billing record and sent it over by email.",
  "Called in to update the account's mailing address. Confirmed the new address and applied the change.",
  "Flagged a recent charge that looked unfamiliar. Reviewed the transaction history and clarified the charge.",
  "Wanted to add an additional user seat to the plan. Walked through the add-seat flow and confirmed the updated price.",
];

/** Deterministic per-customer "Latest Interaction" summary — same
 *  `hashSeed`-on-`recordId` approach as `buildCustomerInfoFields`, just
 *  salted with a different suffix so this doesn't land on the exact same
 *  pool indexes that function's own fields happen to hash to for the same
 *  customer. `handledBy` reuses the real `OUTBOUND_AGENTS` roster (the
 *  same agent names already used elsewhere in this app) rather than a
 *  separate invented-name pool. */
function buildLatestInteraction(customerName: string | undefined, recordId: string): CustomerLatestInteraction {
  const seed = hashSeed(`${recordId || customerName || "customer"}-latest-interaction`);
  const { status, variant } = CUSTOMER_LATEST_INTERACTION_STATUS_POOL[seed % CUSTOMER_LATEST_INTERACTION_STATUS_POOL.length];
  const channel = CUSTOMER_LATEST_INTERACTION_CHANNEL_POOL[Math.floor(seed / 3) % CUSTOMER_LATEST_INTERACTION_CHANNEL_POOL.length];
  const timeAgo = CUSTOMER_LATEST_INTERACTION_TIME_AGO_POOL[Math.floor(seed / 7) % CUSTOMER_LATEST_INTERACTION_TIME_AGO_POOL.length];
  const summary = CUSTOMER_LATEST_INTERACTION_SUMMARY_POOL[Math.floor(seed / 11) % CUSTOMER_LATEST_INTERACTION_SUMMARY_POOL.length];
  const handledByAgent = OUTBOUND_AGENTS[seed % OUTBOUND_AGENTS.length];
  const caseId = `CASE-${40000 + (seed % 9000)}`;

  return {
    timeAgo,
    channel,
    status,
    statusVariant: variant,
    summary,
    caseId,
    handledBy: handledByAgent?.name ?? "Support Team",
  };
}

// "Latest Note" summary shown on the Overview tab, directly below "Latest
// Interaction" — same deterministic-synthesis approach (no real per-
// customer notes data source yet) as `buildLatestInteraction` above, just
// its own pools/salt so a given customer doesn't land on the same pool
// indexes for both cards.
interface CustomerLatestNote {
  timeAgo: string;
  author: string;
  note: string;
}

const CUSTOMER_LATEST_NOTE_TIME_AGO_POOL = [
  "1 day ago", "4 days ago", "1 week ago", "2 weeks ago", "1 month ago", "2 months ago",
];

const CUSTOMER_LATEST_NOTE_POOL = [
  "Customer prefers email follow-up over phone calls going forward.",
  "Flagged as a long-tenured account — check for loyalty offers before escalating.",
  "Prefers to be addressed by first name; mentioned this during last contact.",
  "Has a pending shipment; hold off on billing-related outreach until it arrives.",
  "Requested callback outside of standard business hours — see availability note on file.",
  "Previously disputed a charge that was resolved in the customer's favor; handle related questions with extra care.",
];

/** Deterministic per-customer "Latest Note" — same `hashSeed`-on-`recordId`
 *  approach as `buildLatestInteraction`, salted with a different suffix so
 *  it doesn't land on the same pool indexes. `author` reuses the real
 *  `OUTBOUND_AGENTS` roster, same as `buildLatestInteraction`'s
 *  `handledBy`. */
function buildLatestNote(customerName: string | undefined, recordId: string): CustomerLatestNote {
  const seed = hashSeed(`${recordId || customerName || "customer"}-latest-note`);
  const timeAgo = CUSTOMER_LATEST_NOTE_TIME_AGO_POOL[seed % CUSTOMER_LATEST_NOTE_TIME_AGO_POOL.length];
  const note = CUSTOMER_LATEST_NOTE_POOL[Math.floor(seed / 3) % CUSTOMER_LATEST_NOTE_POOL.length];
  const author = OUTBOUND_AGENTS[Math.floor(seed / 7) % OUTBOUND_AGENTS.length];

  return {
    timeAgo,
    author: author?.name ?? "Support Team",
    note,
  };
}

// Placeholder tab set (per reference screenshot). The panel should open on
// "Overview" (index 0) by default — so `activeTab` below just starts at 0
// rather than looking up a specific tab's index. "Interactions" (this
// customer's own session history — was a separate, independently-selectable
// "Customer History" tab in the record header, alongside the channel tabs —
// see `CustomerHistoryTabContent`'s own doc comment) moved in here per
// explicit request, so it's now just another tab of this same panel like
// Detail/Directory/etc., not a separate top-level control.
const CUSTOMER_PANEL_TABS = ["Overview", "Interactions", "Detail", "Directory", "Tasks", "Notes", "Accounts", "Tickets"];

// Temporarily hides the Overview tab's "Ask about this customer..."
// `AIInput` footer during an active interaction, per explicit request —
// flip back to `true` to restore it. Gates both the real panel's own
// `footer` (`CustomerInformationSidePanel`) and the hover-preview's
// content-parity copy of the same footer (`CustomerInfoHoverPreview`),
// so the two stay in sync rather than one showing an input the other
// doesn't.
const SHOW_CUSTOMER_INFO_AI_INPUT = false;

/** Shared neutral bordered-container treatment for every collapsible
 *  `Accordion` in the Customer Information panel (Overview tab's "Customer
 *  Overview"/"Latest Interaction", Detail tab's "General"/"Address",
 *  Directory tab's per-phone-slot rows) — one constant instead of each tab
 *  re-typing the same class string, so the four surfaces can't quietly
 *  drift apart. Callers that need an additional class alongside it (the
 *  Overview tab's `.lyra-card-split-even`) compose it with `cn(...)` rather
 *  than duplicating this string with an extra class appended. */
const CUSTOMER_INFO_ACCORDION_CLASSNAME = "rounded-lyra-md border border-lyra-border-subtle bg-lyra-bg-control-subtle overflow-hidden h-fit";

/** Looks up one of `buildCustomerInfoFields`'s rows by label — lets the
 *  Detail tab below reuse the exact same Contact #/Balance/Address/City/
 *  State/Zip values the Overview tab already shows for this customer,
 *  instead of a second, independently-synthesized set that could disagree
 *  with it (e.g. a different "invented" balance on each tab for the same
 *  customer). */
function getFieldValue(fields: CustomerInfoField[], label: string): string {
  return fields.find((f) => f.label === label)?.value ?? "";
}

/* ── Customer History tab ──
   Per a reference screenshot: a scrollable list of this customer's past
   sessions (one card per past voice/SMS/email contact — target, direction +
   channel, handling agent, timestamp, and an optional status like
   "Disconnected"), and clicking a card opens a right-docked `InteriorPanel`
   with that session's own detail fields (Start Date, Agent/Target, Type,
   Call Center, Customer, External Interaction ID, External Thread ID) plus
   a "Conversation Details" summary below them — same "click a row, open a
   right InteriorPanel with details, chevron through the list" shape
   `CustomerRowInfoPanel` already uses for the Customers table (see that
   component's own doc comment), just scoped to one customer's own history
   instead of the whole Customers table.

   No real backend/session log exists for this prototype, so
   `buildCustomerHistoryEntries` below deterministically synthesizes a
   plausible list per customer — same `hashSeed`-on-`recordId` approach
   `buildLatestInteraction`/`buildLatestNote` already use, salted per entry
   index so a given customer always sees the same history across reopens
   instead of it reshuffling every render. Target phone/email reuse the
   exact same values `buildCustomerInfoFields` already synthesizes for the
   Overview tab (via `getFieldValue` above) rather than a second,
   independently-invented address that could disagree with it. */

type CustomerHistoryDirection = "inbound" | "outbound";
type CustomerHistoryChannelType = "voice" | "sms" | "email";

interface CustomerHistorySessionEntry {
  id: string;
  direction: CustomerHistoryDirection;
  channelType: CustomerHistoryChannelType;
  /** e.g. "Outbound call" / "Inbound SMS" / "Outbound email" — precomputed
   *  so the card and the detail panel's own "Type" field always agree on
   *  the exact same string. */
  typeLabel: string;
  target: string;
  agentName: string;
  agentEmail: string;
  timestamp: Date;
  /** "MM/DD/YYYY h:mm:ss AM/PM" — shared by the card's own timestamp and
   *  the detail panel's "Start Date" field (see `formatHistoryTimestamp`). */
  timestampDisplay: string;
  /** Only ever set for `channelType === "voice"` (see the reference
   *  screenshots — SMS/email rows never carry one); undefined most of the
   *  time even for voice, same "not every field is always present" shape
   *  `TrackedChannel.addressLabel` etc. already have elsewhere. */
  statusLabel?: string;
  callCenter: string;
  customerUsername: string;
  externalInteractionId: string;
  externalThreadId: string;
  conversationSummary: string;
  /** Only set for `channelType === "sms"` — the actual reconstructed
   *  message thread shown on the detail panel's "Conversation" tab (see
   *  `CustomerHistoryConversationContent`). Voice/email have no message
   *  thread of their own; they use `callDurationDisplay`/`emailSubject`
   *  below instead. */
  conversationMessages?: CustomerHistoryConversationMessage[];
  /** Only set for `channelType === "voice"` — "m:ss", shown on the
   *  Conversation tab's call-notes card. */
  callDurationDisplay?: string;
  /** Only set for `channelType === "email"` — shown above
   *  `conversationSummary` (reused as the email body) on the Conversation
   *  tab. */
  emailSubject?: string;
  /** 1-2 labels drawn from `OUTCOME_TAG_OPTIONS` (the same vocabulary the
   *  live-interaction Outcome tagging popover uses elsewhere in this file)
   *  — reused rather than inventing a second tag vocabulary, and it's what
   *  the history toolbar's own "Tags" filter checklist is built from (see
   *  `CUSTOMER_HISTORY_TAG_FILTER_OPTIONS`). Not rendered anywhere on the
   *  card itself (the reference screenshots never show tags on a history
   *  row) — purely a filterable attribute here. */
  tags: string[];
}

interface CustomerHistoryConversationMessage {
  sender: "customer" | "agent";
  text: string;
  timestampDisplay: string;
}

const CUSTOMER_HISTORY_DIRECTION_LABEL: Record<CustomerHistoryDirection, string> = {
  inbound: "Inbound",
  outbound: "Outbound",
};

// Lowercase per the reference screenshots ("Outbound call", "Outbound
// email") except the SMS acronym, which stays upper — see `typeLabel`.
const CUSTOMER_HISTORY_CHANNEL_LOWER_LABEL: Record<CustomerHistoryChannelType, string> = {
  voice: "call",
  sms: "SMS",
  email: "email",
};

const CUSTOMER_HISTORY_CHANNEL_ICON: Record<CustomerHistoryChannelType, LucideIcon> = {
  voice: Phone,
  sms: MessageSquare,
  email: Mail,
};

// Purple/green/pink per the reference screenshots — a different trio from
// `CONTACT_HISTORY_CHANNEL_TAG_VARIANT`'s purple/teal/pink (that one only
// has `TagVariant`'s 9 fixed categorical values to work with, and settled
// on teal for chat/SMS; this is plain `text-*` on a bare icon, not a `Tag`,
// so it isn't limited to that vocabulary and can use green directly).
const CUSTOMER_HISTORY_CHANNEL_COLOR_CLASS: Record<CustomerHistoryChannelType, string> = {
  voice: "text-lyra-accent-purple-strong",
  sms: "text-lyra-accent-green-strong",
  email: "text-lyra-accent-pink-strong",
};

const CUSTOMER_HISTORY_CALL_CENTER_POOL = [
  "Testing Call Center", "Main Call Center", "East Region Call Center", "Overflow Call Center",
];

// Only `voice` entries ever roll against this — `undefined` (no status
// shown) is deliberately in the pool twice, so most calls show nothing at
// all, same as most rows in the reference screenshots.
const CUSTOMER_HISTORY_VOICE_STATUS_POOL: (string | undefined)[] = [
  "Disconnected", "Disconnected", undefined, undefined, "dialing",
];

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

// SMS thread content (Conversation tab, `channelType === "sms"`) — a short
// alternating customer/agent exchange. Indexed independently by sender so a
// synthesized thread doesn't accidentally pair an agent line that doesn't
// answer the customer line right before it; realism isn't the bar here (no
// real transcript data exists to reproduce), just a plausible-looking
// back-and-forth.
const CUSTOMER_HISTORY_SMS_CUSTOMER_MESSAGE_POOL = [
  "Hi, I had a question about my last bill.",
  "Can you check if my address on file is up to date?",
  "I don't think I received the confirmation text yet.",
  "Thanks, that answers my question!",
  "Is there a fee for that?",
  "Sorry, one more thing — when does that take effect?",
];
const CUSTOMER_HISTORY_SMS_AGENT_MESSAGE_POOL = [
  "Sure, let me pull that up for you.",
  "I can see that on your account now.",
  "You're all set — that's been updated.",
  "No problem, happy to help!",
  "That fee was waived for your account.",
  "It'll take effect on your next billing cycle.",
];

// Email content (Conversation tab, `channelType === "email"`) — `subject`
// only; the body reuses `conversationSummary` (already a customer-facing
// paragraph, no need for a second, near-duplicate pool).
const CUSTOMER_HISTORY_EMAIL_SUBJECT_POOL = [
  "Following up on your account",
  "Your recent request",
  "Question about your invoice",
  "Update to your account details",
  "Re: your last message",
];

/** "m:ss" — a plausible call length, from ~20 seconds up to ~14 minutes.
 *  Shown on the Conversation tab's call-notes card for `channelType ===
 *  "voice"` entries. */
function synthesizeCallDuration(seed: number): string {
  const totalSeconds = 20 + (seed % 840);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

/** Builds the "sms" conversation thread for one history entry — 3 to 5
 *  messages, alternating strictly by sender, starting with whichever side
 *  actually initiated the session (`direction`): an outbound session opens
 *  with the agent reaching out, an inbound one opens with the customer.
 *  Timestamps step forward a minute or two per message from the session's
 *  own start time, so they read in order without ever running past it. */
function buildCustomerHistorySmsMessages(
  seed: number,
  direction: CustomerHistoryDirection,
  sessionStart: Date
): CustomerHistoryConversationMessage[] {
  const messageCount = 3 + (seed % 3);
  const startsWithAgent = direction === "outbound";
  const messages: CustomerHistoryConversationMessage[] = [];
  let cursor = new Date(sessionStart);

  for (let i = 0; i < messageCount; i++) {
    const isAgentTurn = startsWithAgent ? i % 2 === 0 : i % 2 === 1;
    const pool = isAgentTurn ? CUSTOMER_HISTORY_SMS_AGENT_MESSAGE_POOL : CUSTOMER_HISTORY_SMS_CUSTOMER_MESSAGE_POOL;
    const text = pool[(seed + i * 5) % pool.length];
    cursor = new Date(cursor.getTime() + (60 + ((seed + i) % 90)) * 1000);
    messages.push({
      sender: isAgentTurn ? "agent" : "customer",
      text,
      timestampDisplay: formatHistoryTimestamp(cursor),
    });
  }

  return messages;
}

const CUSTOMER_HISTORY_ENTRY_COUNT = 8;

/** Deterministically synthesizes this customer's session history — see this
 *  section's own doc comment above for why (no real session log exists).
 *  Ordered most-recent-first: entry `0` is the most recent, walking
 *  backward in time from "now" by a pseudo-random (but seed-stable) number
 *  of hours per step. */
function buildCustomerHistoryEntries(
  customerName: string | undefined,
  recordId: string,
  channels: TrackedChannel[]
): CustomerHistorySessionEntry[] {
  const fields = buildCustomerInfoFields(customerName, recordId, channels);
  const phone = getFieldValue(fields, "Phone #");
  const email = getFieldValue(fields, "Email");
  const { firstName, lastName } = splitCustomerName(customerName);

  const entries: CustomerHistorySessionEntry[] = [];
  let cursor = new Date();

  for (let i = 0; i < CUSTOMER_HISTORY_ENTRY_COUNT; i++) {
    const seed = hashSeed(`${recordId || customerName || "customer"}-history-${i}`);

    // Step backward before creating this entry, so entry 0 isn't literally
    // "right now" — a couple hours to just under two days between sessions.
    cursor = new Date(cursor.getTime() - (2 + (seed % 46)) * 60 * 60 * 1000);

    const direction: CustomerHistoryDirection = seed % 10 < 7 ? "outbound" : "inbound";
    const channelPool: CustomerHistoryChannelType[] = ["voice", "voice", "sms", "email"];
    const channelType = channelPool[Math.floor(seed / 7) % channelPool.length];

    const agent = OUTBOUND_AGENTS[Math.floor(seed / 11) % OUTBOUND_AGENTS.length];
    const agentName = agent?.name ?? "Support Team";
    const { firstName: agentFirst, lastName: agentLast } = splitCustomerName(agentName);
    const agentEmail = `${agentFirst.toLowerCase()}.${agentLast.toLowerCase()}@cxisme.com`;

    entries.push({
      id: `${recordId || customerName || "customer"}-history-${i}`,
      direction,
      channelType,
      typeLabel: `${CUSTOMER_HISTORY_DIRECTION_LABEL[direction]} ${CUSTOMER_HISTORY_CHANNEL_LOWER_LABEL[channelType]}`,
      target: channelType === "email" ? email : phone,
      agentName,
      agentEmail,
      timestamp: cursor,
      timestampDisplay: formatHistoryTimestamp(cursor),
      statusLabel:
        channelType === "voice"
          ? CUSTOMER_HISTORY_VOICE_STATUS_POOL[Math.floor(seed / 13) % CUSTOMER_HISTORY_VOICE_STATUS_POOL.length]
          : undefined,
      callCenter: CUSTOMER_HISTORY_CALL_CENTER_POOL[Math.floor(seed / 17) % CUSTOMER_HISTORY_CALL_CENTER_POOL.length],
      customerUsername: `${firstName.charAt(0).toLowerCase()}${lastName}${10 + (seed % 90)}`,
      externalInteractionId: synthesizeExternalInteractionId(seed),
      externalThreadId: synthesizeExternalThreadId(seed),
      conversationSummary:
        CUSTOMER_LATEST_INTERACTION_SUMMARY_POOL[Math.floor(seed / 19) % CUSTOMER_LATEST_INTERACTION_SUMMARY_POOL.length],
      conversationMessages: channelType === "sms" ? buildCustomerHistorySmsMessages(seed, direction, cursor) : undefined,
      callDurationDisplay: channelType === "voice" ? synthesizeCallDuration(seed) : undefined,
      emailSubject:
        channelType === "email"
          ? CUSTOMER_HISTORY_EMAIL_SUBJECT_POOL[Math.floor(seed / 23) % CUSTOMER_HISTORY_EMAIL_SUBJECT_POOL.length]
          : undefined,
      // 1-2 tags per entry, drawn from the same `OUTCOME_TAG_OPTIONS`
      // vocabulary the live Outcome popover uses — see the field's own doc
      // comment on `CustomerHistorySessionEntry` above for why.
      tags:
        seed % 5 < 3
          ? [OUTCOME_TAG_OPTIONS[Math.floor(seed / 29) % OUTCOME_TAG_OPTIONS.length].label]
          : [
              OUTCOME_TAG_OPTIONS[Math.floor(seed / 29) % OUTCOME_TAG_OPTIONS.length].label,
              OUTCOME_TAG_OPTIONS[Math.floor(seed / 31) % OUTCOME_TAG_OPTIONS.length].label,
            ].filter((label, idx, arr) => arr.indexOf(label) === idx),
    });
  }

  return entries;
}

/** Small directional-icon pair (an `ArrowUp`/`ArrowDown` beside the channel
 *  icon) — no existing composed "inbound/outbound channel icon" exists
 *  anywhere in this file or lyra-ui (checked); side-by-side rather than
 *  overlaid as a corner badge (the convention `Button`'s own `badge` prop/
 *  `channelCount` pill elsewhere in this file use) since at this small size
 *  an overlaid arrow would mostly obscure the channel glyph underneath it,
 *  and the reference screenshots show both fully visible side by side. */
function CustomerHistoryChannelIcon({
  channelType,
  direction,
}: {
  channelType: CustomerHistoryChannelType;
  direction: CustomerHistoryDirection;
}) {
  const ChannelIcon = CUSTOMER_HISTORY_CHANNEL_ICON[channelType];
  const DirectionIcon = direction === "outbound" ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn("flex items-center gap-0.5 shrink-0 pt-0.5", CUSTOMER_HISTORY_CHANNEL_COLOR_CLASS[channelType])}
      aria-hidden="true"
    >
      <DirectionIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
      <ChannelIcon className="h-4 w-4" strokeWidth={1.75} />
    </span>
  );
}

// Static checklist options for the history toolbar's "Channel type" and
// "Direction" filters — unlike `CUSTOMER_FILTER_FIELD_DEFS`'s "+ Filter"
// add-menu system (12 optional fields, none active by default), this list
// only ever has these 3 facets plus the date range below, so all 3 are
// always shown in the toolbar rather than gated behind an add-filter step.
const CUSTOMER_HISTORY_CHANNEL_TYPE_FILTER_OPTIONS: FilterChipOption[] = [
  { value: "voice", label: "Voice" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
];
const CUSTOMER_HISTORY_DIRECTION_FILTER_OPTIONS: FilterChipOption[] = [
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
];
// Built from `OUTCOME_TAG_OPTIONS` (declared well above this section) so the
// filter's checklist always matches whatever `tags` actually get synthesized
// onto each entry, without a second hand-maintained label list to drift out
// of sync with it.
const CUSTOMER_HISTORY_TAG_FILTER_OPTIONS: FilterChipOption[] = OUTCOME_TAG_OPTIONS.map((t) => ({
  value: t.label,
  label: t.label,
}));

// `DateRangeFilterChip`'s own default `options` (`DATE_RANGE_FILTER_OPTIONS`)
// stops at "Last 7 days" + "Custom" — too narrow here, since synthesized
// entries can land up to ~16 days back (see `buildCustomerHistoryEntries`'s
// per-step "2 to 47 hours" walk × 8 entries). Adds "Last 30/90 days" (already
// supported by `DateRangeFilterValue`, just not in the default option list)
// so the toolbar's default selection doesn't start out hiding most of a
// customer's real history.
const CUSTOMER_HISTORY_DATE_RANGE_OPTIONS = [
  { value: "today" as const, label: "Today" },
  { value: "yesterday" as const, label: "Yesterday" },
  { value: "last7" as const, label: "Last 7 days" },
  { value: "last30" as const, label: "Last 30 days" },
  { value: "last90" as const, label: "Last 90 days" },
  { value: "custom" as const, label: "Custom" },
];

/** Whether `timestamp` falls inside the selected date-range filter value —
 *  mirrors `DateRangeFilterChip`'s own value vocabulary
 *  (`DateRangeFilterValue`) rather than inventing a parallel one. `"custom"`
 *  with no range picked yet (`customRange` undefined/`from` unset) passes
 *  everything through, same "no filter applied yet" behavior the checklist
 *  facets below have when their own value array is empty. */
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

/** The "Interactions" tab's own body — a toolbar (search + Channel
 *  type/Direction/Tags checklists + a date-range filter) above a list of
 *  `CustomerHistorySessionEntry` cards (see this section's own doc comment
 *  above). `selectedIndex`/`onSelectIndex` drive which one's own detail
 *  panel (`CustomerHistorySessionDetailPanel`, rendered as a sibling at the
 *  call site) is open; clicking the already-open card's own row toggles it
 *  back closed instead of just re-selecting the same one, same convention
 *  `CustomersListView`'s own `onRowClick` uses for `CustomerRowInfoPanel`.
 *
 *  Scrolls in its OWN independent box (`flex-1 min-h-0 overflow-hidden`
 *  below, with the list itself `overflow-y-auto`) — not as part of the
 *  Customer Information panel's shared `PanelContent` scroll region.
 *  Briefly changed to the latter (single shared scroll + a `sticky`
 *  toolbar) while chasing what turned out to be a real bug one level up —
 *  `SidePanel`'s own docked/pinned branch was missing an `h-full` its
 *  full-screen branch already had, so nothing above this component ever
 *  had a genuinely definite height to bound against, no matter how this
 *  component itself was built. With that fixed at its actual source (see
 *  `CustomerInformationPanelBody`'s own outer wrapper comment), the
 *  original independent-scroll design works as intended again, and is
 *  worth keeping over the shared-scroll fallback: it's what lets
 *  `CustomerHistorySessionDetailPanel` (rendered as this component's own
 *  sibling at the call site) overlay ON TOP of this list instead of
 *  pushing it down or inheriting an arbitrary, content-driven height that
 *  doesn't match the visible viewport.
 *
 *  Search/filter state is local (`useState` in here), not lifted to
 *  `AgentNextGenPage` — unlike `selectedIndex` (which has to survive this
 *  component unmounting, since the detail panel renders as its sibling),
 *  nothing outside this component ever needs to read or restore the
 *  toolbar's own state, so there's no reason to hoist it. `selectedIndex`
 *  itself always refers to a position in the full, unfiltered `entries`
 *  array (so `CustomerHistorySessionDetailPanel`'s prev/next chevrons keep
 *  stepping through the customer's whole history, not just whatever's
 *  currently visible under a filter) — the filtered rows below are mapped
 *  with their original index preserved for exactly that reason. */
function CustomerHistoryTabContent({
  entries,
  selectedIndex,
  onSelectIndex,
}: {
  entries: CustomerHistorySessionEntry[];
  selectedIndex: number | null;
  onSelectIndex: (index: number | null) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>({});
  const [dateRangeValue, setDateRangeValue] = useState<DateRangeFilterValue>("last30");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);

  const filterDefs = [
    { key: "channelType", label: "Channel type", options: CUSTOMER_HISTORY_CHANNEL_TYPE_FILTER_OPTIONS },
    { key: "direction", label: "Direction", options: CUSTOMER_HISTORY_DIRECTION_FILTER_OPTIONS },
    { key: "tags", label: "Tags", options: CUSTOMER_HISTORY_TAG_FILTER_OPTIONS },
  ];
  const handleFilterChange = (key: string, values: string[]) =>
    setFilterValues((prev) => ({ ...prev, [key]: values }));
  const clearAllFilters = () => {
    setFilterValues({});
    setSearchQuery("");
    setDateRangeValue("last30");
    setCustomDateRange(undefined);
  };

  const channelTypeValues = filterValues.channelType ?? [];
  const directionValues = filterValues.direction ?? [];
  const tagValues = filterValues.tags ?? [];

  // Keeps each visible row's ORIGINAL index into `entries` (see this
  // component's own doc comment above for why that matters), rather than
  // reassigning fresh 0-based indices to the filtered subset.
  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => {
        if (query) {
          const haystack = `${entry.target} ${entry.agentName} ${entry.typeLabel}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        if (channelTypeValues.length && !channelTypeValues.includes(entry.channelType)) return false;
        if (directionValues.length && !directionValues.includes(entry.direction)) return false;
        if (tagValues.length && !entry.tags.some((tag) => tagValues.includes(tag))) return false;
        if (!isWithinCustomerHistoryDateRange(entry.timestamp, dateRangeValue, customDateRange)) return false;
        return true;
      });
  }, [entries, searchQuery, channelTypeValues, directionValues, tagValues, dateRangeValue, customDateRange]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
        <Inbox className="h-8 w-8 text-lyra-fg-disabled" strokeWidth={1.5} aria-hidden="true" />
        <p className="lyra-body-md text-lyra-fg-disabled text-center">No previous interactions with this customer</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <TableToolbar
        className="px-6"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterDefs={filterDefs}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onFilterClear={clearAllFilters}
        filters={
          <DateRangeFilterChip
            value={dateRangeValue}
            onValueChange={setDateRangeValue}
            options={CUSTOMER_HISTORY_DATE_RANGE_OPTIONS}
            customValue={customDateRange}
            onCustomValueChange={setCustomDateRange}
          />
        }
      />

      {filteredEntries.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
          <Inbox className="h-8 w-8 text-lyra-fg-disabled" strokeWidth={1.5} aria-hidden="true" />
          <p className="lyra-body-md text-lyra-fg-disabled text-center">No interactions match these filters</p>
        </div>
      ) : (
        // `min-h-0` — without it, this flex-column item's default
        // `min-height: auto` lets it refuse to shrink below its own
        // (potentially long) list's natural content height during the
        // flex algorithm's shrink pass, so it would grow past its actual
        // available space instead of respecting it — the classic nested-
        // flex-scroll gotcha. Needed now that this list is back to
        // scrolling in its own independent box (see this component's own
        // doc comment).
        <div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
          {filteredEntries.map(({ entry, index }, i) => {
            const isSelected = selectedIndex === index;
            return (
              <div
                key={entry.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onClick={() => onSelectIndex(isSelected ? null : index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectIndex(isSelected ? null : index);
                  }
                }}
                className={cn(
                  "flex items-start gap-3 px-6 py-3 cursor-pointer transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lyra-border-focus focus-visible:-ring-offset-2",
                  i > 0 && "border-t border-lyra-border-subtle",
                  isSelected
                    ? "bg-lyra-bg-active-subtle hover:bg-lyra-state-hover-active-subtle"
                    : "hover:bg-lyra-state-hover"
                )}
              >
                <CustomerHistoryChannelIcon channelType={entry.channelType} direction={entry.direction} />
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  {/* Full-width now that the timestamp isn't sharing this
                      row with it anymore — was truncating badly (e.g. a
                      whole phone number down to "(456) 383-3...") in the
                      Customer Information panel's own narrower width (this
                      list used to only ever render at full page width, back
                      when "Interactions" was a separate top-level tab — see
                      `CUSTOMER_PANEL_TABS`), since the timestamp's own
                      `whitespace-nowrap` column was claiming a fixed chunk
                      of that now-scarcer horizontal space on every row. */}
                  <span className="lyra-body-md text-lyra-fg-default truncate">{entry.target}</span>
                  {/* Just the timestamp now — the call type/direction text
                      (e.g. "Outbound call", "Inbound sms", formerly inline
                      here next to it) and the trailing status column (e.g.
                      "Disconnected"/"Dialing") were both dropped per
                      explicit request. Direction is still conveyed visually
                      via `CustomerHistoryChannelIcon`'s own up/down arrow
                      (left of the target line above), so removing the
                      redundant text label doesn't lose that information. */}
                  <span className="lyra-body-sm text-lyra-fg-secondary whitespace-nowrap">
                    {entry.timestampDisplay}
                  </span>
                  <span className="lyra-body-sm-emphasis text-lyra-fg-default truncate">
                    {entry.agentName} ({entry.agentEmail.toUpperCase()})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Read-only session-detail field, `Label` stacked above its value —
 *  matches the reference screenshot's own layout (label above value, not
 *  `CustomerInformationPanelBody`'s Overview-tab "label left, value right"
 *  row), and reuses the plain `Label` atom rather than a hand-styled
 *  uppercase span (CONTRIBUTING's "don't hand-roll `text-transform`" rule —
 *  `Label`'s own built-in look is whatever this app already uses for every
 *  other field label, so this stays visually consistent with the rest of
 *  the panel even though it isn't pixel-identical to the reference). */
function CustomerHistoryDetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <Label label={label} />
      <span className="lyra-body-md text-lyra-fg-default break-words">{value}</span>
    </div>
  );
}

const CUSTOMER_HISTORY_DETAIL_TABS = ["Details", "Conversation"];

/** One read-only customer/agent bubble for the Conversation tab's SMS
 *  thread (`CustomerHistoryConversationContent` below) — a trimmed-down
 *  sibling of `TranscriptMessageBubble` (this file's live-transcript
 *  bubble), reusing the exact same avatar/bubble/timestamp classes for
 *  visual consistency. No hover toolbar (Copy/Add tag) or tags row here —
 *  both are live-editing affordances for an open conversation, and every
 *  session this panel shows is already closed history; there's nothing to
 *  tag or copy-in-progress. */
function CustomerHistoryConversationMessageBubble({ message }: { message: CustomerHistoryConversationMessage }) {
  const isCustomer = message.sender === "customer";
  return (
    <div className={cn("flex flex-col", isCustomer ? "items-start" : "items-end")}>
      <div className={cn("flex max-w-[85%] items-start gap-2", isCustomer ? "flex-row" : "flex-row-reverse")}>
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full lyra-body-sm-emphasis lyra-transcript-avatar",
            isCustomer
              ? "bg-lyra-accent-green-soft text-lyra-accent-green-strong"
              : "bg-lyra-bg-primary text-lyra-fg-on-primary"
          )}
          aria-hidden="true"
        >
          {isCustomer ? "C" : "A"}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <div
            className={cn(
              "rounded-lyra-lg px-4 py-3 border border-transparent",
              isCustomer ? "rounded-tl-none bg-lyra-state-hover" : "rounded-tr-none"
            )}
            style={!isCustomer ? { backgroundColor: "var(--lyra-color-bg-conversation-user)" } : undefined}
          >
            <p className="lyra-body-md text-lyra-fg-default">{message.text}</p>
            <span className="mt-2 block lyra-body-sm text-lyra-fg-secondary">{message.timestampDisplay}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The Conversation tab's actual body — what it shows depends on
 *  `entry.channelType`, since a call/SMS thread/email genuinely don't look
 *  like the same kind of content (same reasoning `InteractionTranscript`'s
 *  own per-channel branching already uses, see that component's doc
 *  comment): an SMS session renders its real reconstructed message thread
 *  (`conversationMessages`); a voice session has no messages at all, just a
 *  call-notes card (`conversationSummary`) with its `callDurationDisplay`;
 *  an email session renders as `emailSubject` + body (`conversationSummary`
 *  again) rather than chat bubbles, since an email doesn't read as a
 *  back-and-forth the way SMS does. */
function CustomerHistoryConversationContent({ entry }: { entry: CustomerHistorySessionEntry }) {
  if (entry.channelType === "sms") {
    return (
      <div className="flex flex-col gap-4 px-4 py-3">
        {(entry.conversationMessages ?? []).map((message, i) => (
          <CustomerHistoryConversationMessageBubble key={i} message={message} />
        ))}
      </div>
    );
  }

  if (entry.channelType === "email") {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className={cn(CUSTOMER_INFO_ACCORDION_CLASSNAME, "flex flex-col gap-3 p-4")}>
          <CustomerHistoryDetailField label="Subject" value={entry.emailSubject ?? ""} />
          <div className="flex flex-col gap-1">
            <Label label="Body" />
            <p className="lyra-body-md text-lyra-fg-default">{entry.conversationSummary}</p>
          </div>
        </div>
      </div>
    );
  }

  // Voice — call notes + duration, no message thread.
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className={cn(CUSTOMER_INFO_ACCORDION_CLASSNAME, "flex flex-col gap-3 p-4")}>
        <CustomerHistoryDetailField label="Duration" value={entry.callDurationDisplay ?? ""} />
        <div className="flex flex-col gap-1">
          <Label label="Call Notes" />
          <p className="lyra-body-md text-lyra-fg-default">{entry.conversationSummary}</p>
        </div>
      </div>
    </div>
  );
}

/** Right-docked `InteriorPanel` opened by clicking a `CustomerHistoryTabContent`
 *  card — same "click a row, open a right `InteriorPanel`, chevron through
 *  the list" shape `CustomerRowInfoPanel` already uses for the Customers
 *  table (see that component's own doc comment), just over
 *  `CustomerHistorySessionEntry` rows instead of `CustomerListRecord` ones.
 *
 *  Two tabs, per explicit request: "Details" (a "Conversation Details" card
 *  — summary blurb + Duration for voice entries — directly above a
 *  "Session Details" card of this session's own identity fields, both
 *  collapsible `Accordion`s rather than permanently-expanded blocks; panel
 *  header itself reads "Interaction Details", was "Session Details") and
 *  "Conversation" (the actual reconstructed conversation content,
 *  `CustomerHistoryConversationContent` above). Own `activeTab` state,
 *  reset back to "Details" whenever a different session's entry is opened
 *  (via `entry?.id`) — a `Conversation` tab left open on session A
 *  shouldn't carry over silently to session B. */
function CustomerHistorySessionDetailPanel({
  entry,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: {
  entry: CustomerHistorySessionEntry | null;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}) {
  /* Defaults to "Conversation", not "Details" — agents open a past session
     to read what was said; the metadata fields are the secondary tab.
     Deliberately NOT reset when `entry.id` changes (it used to reset to 0
     on every change): the prev/next chevrons' primary use is scanning back
     through several sessions reading each conversation, and resetting the
     tab forced a re-click of "Conversation" on every step of that scan. */
  const [activeTab, setActiveTab] = useState(() => CUSTOMER_HISTORY_DETAIL_TABS.indexOf("Conversation"));

  return (
    <InteriorPanel
      side="right"
      open={entry !== null}
      onClose={onClose}
      // `z-[3]` — overrides `InteriorPanel`'s own default `z-[5]` (via
      // `cn()`'s `tailwind-merge` dedup, same "consumer className overrides
      // the internal default" mechanism `CustomerInformationSidePanel`'s own
      // header-icon `Popover` etc. already rely on elsewhere in this file).
      // Needed because this panel's absolutely-positioned narrow/overlay
      // branch (interior-panel.tsx, triggered below ~1024px of available
      // width) and `CustomerInformationSidePanel`'s own unpinned/floating
      // branch (side-panel.tsx) both otherwise land on that exact same
      // `z-[5]` tier — and since neither of their shared ancestors (the
      // "everything else" column, this body row) sets its own `z-index`,
      // they compete in the SAME stacking context, where DOM order (this
      // panel renders later/deeper) broke the tie in this panel's favor —
      // confirmed live: opening a session's details in a narrow container
      // painted this panel over top of the Customer Information panel
      // instead of leaving it visible. `z-[3]` keeps this panel safely
      // above the plain `CustomerHistoryTabContent` list it's meant to
      // cover (unstyled, `z-auto`) while staying below the Customer
      // Information panel's own `z-[5]` — same "pick a tier relative to
      // that panel's z-[5]" convention already established for the
      // transcript's own sticky session separator (`z-[1]`, see its own
      // doc comment) and the shared panel's fullscreen overlay (`z-[9]`).
      className="z-[3]"
      storageKey="customer-history-session-detail-panel-width"
      headerTitle="Interaction Details"
      headerSubhead={entry?.timestampDisplay}
      headerActions={
        <>
          <Button
            variant="outline"
            size="icon-md"
            onClick={onPrevious}
            disabled={!hasPrevious}
            title="Previous session"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </Button>
          <Button variant="outline" size="icon-md" onClick={onNext} disabled={!hasNext} title="Next session">
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </Button>
        </>
      }
      headerTabs={
        <TabList className="px-4" overflowMenu>
          {CUSTOMER_HISTORY_DETAIL_TABS.map((label, i) => (
            <Tab key={label} active={activeTab === i} onClick={() => setActiveTab(i)}>
              {label}
            </Tab>
          ))}
        </TabList>
      }
    >
      {entry && activeTab === CUSTOMER_HISTORY_DETAIL_TABS.indexOf("Details") && (
        <div className="flex flex-col gap-4 px-4 pt-3 pb-4 lyra-form-grid-wrap">
          {/* Conversation Details — moved above Session Details (per
              explicit request; was below it). Duration added here too
              (voice entries only — `callDurationDisplay` is only ever set
              for `channelType === "voice"`, see `CustomerHistorySessionEntry`'s
              own doc comment — SMS/email entries just show the summary
              alone, same as before). */}
          <Accordion
            className={CUSTOMER_INFO_ACCORDION_CLASSNAME}
            defaultValue="conversation-details"
            items={[
              {
                id: "conversation-details",
                title: "Conversation Details",
                content: (
                  <div className="flex flex-col gap-4">
                    {entry.callDurationDisplay && (
                      <CustomerHistoryDetailField label="Duration" value={entry.callDurationDisplay} />
                    )}
                    <p className="lyra-body-md text-lyra-fg-secondary">{entry.conversationSummary}</p>
                  </div>
                ),
              },
            ]}
          />
          <Accordion
            className={CUSTOMER_INFO_ACCORDION_CLASSNAME}
            defaultValue="session-details"
            items={[
              {
                id: "session-details",
                title: "Session Details",
                content: (
                  <div className="flex flex-col gap-4">
                    <CustomerHistoryDetailField label="Start Date" value={entry.timestampDisplay} />
                    <div className="lyra-form-grid">
                      <CustomerHistoryDetailField
                        label="Agent"
                        value={`${entry.agentName} (${entry.agentEmail.toUpperCase()})`}
                      />
                      <CustomerHistoryDetailField label="Target" value={entry.target} />
                    </div>
                    <CustomerHistoryDetailField label="Type" value={entry.typeLabel} />
                    <CustomerHistoryDetailField label="Call Center" value={entry.callCenter} />
                    <CustomerHistoryDetailField label="Customer" value={entry.customerUsername} />
                    <CustomerHistoryDetailField label="External Interaction ID" value={entry.externalInteractionId} />
                    <CustomerHistoryDetailField label="External Thread ID" value={entry.externalThreadId} />
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}
      {entry && activeTab === CUSTOMER_HISTORY_DETAIL_TABS.indexOf("Conversation") && (
        <>
          {/* One-line outcome header — status · agent · date — so quick
              "how did that end?" lookups can finish without reading the
              thread at all. Same lyra-body-sm secondary treatment as the
              Overview tab's Latest Interaction meta lines. */}
          <div className="px-4 pt-3">
            <span className="lyra-body-sm text-lyra-fg-secondary">
              {[entry.statusLabel, entry.agentName, entry.timestampDisplay].filter(Boolean).join(" · ")}
            </span>
          </div>
          <CustomerHistoryConversationContent entry={entry} />
        </>
      )}
    </InteriorPanel>
  );
}

/* ── HistoryConversationView ──
   A past session's conversation rendered in the INTERACTION SPACE (the
   record area's content column), as the body of the history tab the
   Customer Information panel's "Open Conversation" deep link opens — full
   reading width, unlike the ≤425px panel detail. Same one-line outcome
   header + `CustomerHistoryConversationContent` composition the panel's own
   detail view uses; `px-2` tops up that content's own `px-4` to the record
   area's standard 24px inset. */
function HistoryConversationView({ entry }: { entry: CustomerHistorySessionEntry }) {
  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-y-auto px-2">
      <div className="px-4 pt-4">
        <span className="lyra-body-sm text-lyra-fg-secondary">
          {[entry.statusLabel, entry.agentName, entry.timestampDisplay].filter(Boolean).join(" · ")}
        </span>
      </div>
      <CustomerHistoryConversationContent entry={entry} />
    </div>
  );
}

const CUSTOMER_DETAIL_ACCOUNT_BLOCK_OPTIONS: SelectOption[] = [
  { value: "none", label: "None" },
  { value: "collections", label: "Collections" },
  { value: "fraud-review", label: "Fraud Review" },
  { value: "credit-hold", label: "Credit Hold" },
];

/* ── CustomerDetailTabContent ──
   The "Detail" tab's field-editor form (per a reference screenshot of a
   legacy admin contact-edit page) — two collapsible `Accordion` sections,
   "General" and "Address", both open by default, each a responsive
   `.lyra-form-grid` of real lyra-ui field components (`Input`/`Select`/
   `Checkbox`/`DatePicker`), same "Accordion wrapping real editable fields"
   composition `FormTemplate`'s own "Placement Information" section already
   demonstrates (form-template.tsx) — not a hand-rolled bordered box imitating
   one. `lyra-form-grid-wrap` on the root establishes the container-query
   boundary `.lyra-form-grid` needs (see that class's own doc comment in
   lyra-tokens.css): each row is 2-up at this component's own full width,
   stepping down to a single column well before an `InteriorPanel`'s
   typical ~250–425px width would otherwise crowd two fields onto one line.

   Reference screenshot's field labels were all-caps ("CONTACT #", "FIRST
   NAME") — that's the *legacy* admin app's own styling, not something to
   replicate via CSS `text-transform` (CONTRIBUTING.md §17 already covers
   exactly this mistake). Labels here are typed in normal case and rendered
   through each field component's own built-in label, same as every other
   field in this panel/app.

   Fields with a real source reuse it instead of inventing a second,
   possibly-disagreeing value: "Contact #"/"Total Balance"/"Address
   1"/"City"/"State"/"Zip Code" come straight from `fields` (the same
   per-customer data `buildCustomerInfoFields` already computed for the
   Overview tab — see `getFieldValue` above), and "First Name"/"Last Name"
   split `customerName` the same way `buildCustomerInfoFields`'s own
   synthesized email does (`splitCustomerName`). Everything else in the
   reference screenshot (Original Contact #, Title, Department, Balance
   Due, Account Block, Group, Due Date, Address 2) has no real or
   synthesized source anywhere in this app's data, so those stay at the
   screenshot's own shown defaults (empty / "None" / unchecked-false where
   shown, "$0.00" for Balance Due specifically since it's a distinct
   "amount currently owed" concept from Total Balance, not just a repeat of
   it) — editable, uncontrolled-from-outside local state, same
   "self-contained, not wired to persistence" status as every other
   prototype form in this app (`FormTemplate` included). */
function CustomerDetailTabContent({
  customerName,
  fields,
}: {
  customerName?: string;
  fields: CustomerInfoField[];
}) {
  const { firstName, lastName } = splitCustomerName(customerName);

  const [originalContactNumber, setOriginalContactNumber] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [balanceDue, setBalanceDue] = useState("$0.00");
  const [active, setActive] = useState(true);
  const [accountBlock, setAccountBlock] = useState("none");
  const [group, setGroup] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [address2, setAddress2] = useState("");

  // Same neutral bordered-container treatment as the Overview tab's
  // "Customer Overview"/"Latest Interaction" accordions (see
  // `CustomerInformationPanelBody`) — each section gets its own card-like
  // container rather than the two sharing one borderless `Accordion` root,
  // so "General" and "Address" read as distinct blocks instead of one long
  // list. Split into two single-item `Accordion`s (each still open by
  // default via its own `defaultValue`) instead of the previous single
  // `type="multiple"` root, since that's what separate containers require —
  // each item now toggles independently by construction, the same behavior
  // `type="multiple"` was providing before.
  return (
    <div className="flex flex-col gap-4 px-4 pt-3 pb-4 lyra-form-grid-wrap">
      <Accordion
        defaultValue="general"
        className={CUSTOMER_INFO_ACCORDION_CLASSNAME}
        items={[
          {
            id: "general",
            title: "General",
            content: (
              <div className="flex flex-col gap-4">
                <div className="lyra-form-grid">
                  <Input label="Contact #" value={getFieldValue(fields, "Contact #")} readonly />
                  <Input label="Original Contact #" value={originalContactNumber} onChange={(e) => setOriginalContactNumber(e.target.value)} />
                </div>
                <div className="lyra-form-grid">
                  <Input label="First Name" defaultValue={firstName} />
                  <Input label="Last Name" defaultValue={lastName} />
                </div>
                <div className="lyra-form-grid">
                  <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <Input label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
                </div>
                <div className="lyra-form-grid">
                  <Input label="Total Balance" value={getFieldValue(fields, "Balance")} readonly />
                  <Input label="Balance Due" value={balanceDue} onChange={(e) => setBalanceDue(e.target.value)} />
                </div>
                <div className="lyra-form-grid">
                  <Checkbox label="Active" checked={active} onCheckedChange={(checked) => setActive(checked === true)} />
                  <Select
                    label="Account Block"
                    options={CUSTOMER_DETAIL_ACCOUNT_BLOCK_OPTIONS}
                    value={accountBlock}
                    onValueChange={setAccountBlock}
                  />
                </div>
                <div className="lyra-form-grid">
                  <Select
                    label="Group"
                    options={[]}
                    value={group}
                    onValueChange={setGroup}
                    placeholder="Select group"
                  />
                  <DatePicker label="Due Date" value={dueDate} onChange={setDueDate} />
                </div>
              </div>
            ),
          },
        ]}
      />
      <Accordion
        defaultValue="address"
        className={CUSTOMER_INFO_ACCORDION_CLASSNAME}
        items={[
          {
            id: "address",
            title: "Address",
            content: (
              <div className="flex flex-col gap-4">
                <div className="lyra-form-grid">
                  <Input label="Address 1" value={getFieldValue(fields, "Address")} readonly />
                  <Input label="Address 2" value={address2} onChange={(e) => setAddress2(e.target.value)} />
                </div>
                <div className="lyra-form-grid">
                  <Input label="City" value={getFieldValue(fields, "City")} readonly />
                  <Input label="State" value={getFieldValue(fields, "State")} readonly />
                </div>
                <div className="lyra-form-grid">
                  <Input label="Zip Code" value={getFieldValue(fields, "Zip Code")} readonly />
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

/** Bare digits (US-style raw phone digits, no formatting/dial code — what
 *  `PhoneInput`'s own `PhoneValue.number` expects) parsed out of one of
 *  this panel's own already-formatted display strings (e.g. "Phone #"'s
 *  "+1 614 749 1794"). Strips a leading "1" country-code digit when
 *  present so a 10-digit US number round-trips back into `PhoneInput`
 *  correctly instead of overflowing its mask by one digit. Falls back to
 *  an empty number (still a valid, just-blank `PhoneValue`) for a
 *  synthesized phone that doesn't parse cleanly, rather than showing
 *  something wrong. */
function phoneValueFromDisplay(display: string): PhoneValue {
  const digits = display.replace(/\D/g, "");
  const withoutCountryCode = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return { countryCode: "us", number: withoutCountryCode };
}

const CUSTOMER_DIRECTORY_BLOCK_OPTIONS = [
  { value: "no-block", label: "No Block" },
  { value: "block-daily", label: "Block Daily" },
  { value: "block-permanent", label: "Block Permanent" },
];

/** Total phone slots the Directory tab renders — "up to 10 phones" per the
 *  reference screenshot: the first is always labeled "Home", the rest
 *  "Phone 2" through "Phone 10". */
const CUSTOMER_DIRECTORY_PHONE_COUNT = 10;
const CUSTOMER_DIRECTORY_PHONE_LABELS = Array.from({ length: CUSTOMER_DIRECTORY_PHONE_COUNT }, (_, i) =>
  i === 0 ? "Home" : `Phone ${i + 1}`
);

interface CustomerDirectoryPhoneState {
  phone: PhoneValue;
  consentCall: boolean;
  consentSms: boolean;
  block: string;
}

/* ── CustomerDirectoryPhoneRow ──
   One phone slot's worth of fields, its own little self-contained block —
   pulled out of `CustomerDirectoryTabContent` (rather than inlined in a
   `.map`) so each of the up to 10 rows below owns independent `useState`
   the normal way a component does, instead of ten parallel array-indexed
   state slots in the parent needing hand-rolled per-index update
   functions for every field. Same "Call Attempts Today/Total" read-only
   stat pair for every row (there's no live call-attempt tracking in this
   demo, same static-`0` status as `TrackedChannel.messageCount`
   elsewhere) — plain text, not `Metric`/`DashboardCardMetric`, since those
   render a large headline figure + caption meant for a dashboard card,
   not a compact inline stat under a phone field.

   Each slot is its own single-item `Accordion` (title = the slot label,
   e.g. "Home"/"Phone 2") — collapsible per request, `defaultValue={label}`
   so every slot still starts open (same "collapsible but open by default"
   convention as the Overview tab's own "Latest Interaction" accordion).
   `PhoneInput` no longer gets its own `label` prop: the accordion's own
   trigger already shows the slot name as its title immediately above the
   field, so a second, identical label directly under it was pure
   duplication (confirmed from a screenshot of the pre-accordion layout —
   "Home" as a plain heading, then "Home" again as the phone field's own
   label right below it).

   No divider of its own on this row — `Accordion`'s own per-item
   `border-b` (accordion.tsx, rendered after every item's content)
   supplies the hairline between consecutive slots; `CustomerDirectory
   TabContent` adds one `border-t` above the whole list of rows for the
   divider separating it from the Email/Consent block, rather than every
   row duplicating that same top border (which used to visually double up
   with the row-before's own bottom divider). */
function CustomerDirectoryPhoneRow({
  label,
  defaultState,
}: {
  label: string;
  defaultState: CustomerDirectoryPhoneState;
}) {
  const [phone, setPhone] = useState<PhoneValue>(defaultState.phone);
  const [consentCall, setConsentCall] = useState(defaultState.consentCall);
  const [consentSms, setConsentSms] = useState(defaultState.consentSms);
  const [block, setBlock] = useState(defaultState.block);

  return (
    <Accordion
      type="single"
      defaultValue={label}
      // Same neutral bordered-container treatment as the Overview tab's
      // "Customer Overview"/"Latest Interaction" accordions and the Detail
      // tab's "General"/"Address" accordions (see those components' own
      // comments) — each phone slot now reads as its own card instead of a
      // borderless row, consistent across all three tabs.
      className={CUSTOMER_INFO_ACCORDION_CLASSNAME}
      items={[
        {
          id: label,
          title: label,
          content: (
            // Three columns — phone + its call-attempt stats, consent
            // checkboxes, block radios — share one `.lyra-form-grid` row.
            // `.lyra-form-grid` already handles any number of children
            // evenly (`> *` gets `flex: 1 1 0%` by default — no
            // per-consumer modifier needed, unlike `.lyra-card-split`'s
            // `-even`, see that class's own doc comment in
            // lyra-tokens.css for why the two families differ here), and
            // reacts off the same `.lyra-form-grid-wrap` boundary this
            // row's ancestor (`CustomerDirectoryTabContent`'s root div)
            // already establishes — full width (e.g. `allowFullScreen`'d)
            // reads as a real 3-up row per the reference screenshot, this
            // panel's normal ~350–425px resizable width stacks to one
            // column same as before this existed.
            <div className="lyra-form-grid">
              <div className="flex flex-col gap-3">
                {/* `max-w-sm` (384px) — same convention as the Directory
                    tab's `EmailInput` above (see its own comment): caps a
                    single full-width-by-default field at a sane reading
                    width via the standing `className` passthrough, rather
                    than letting it stretch to fill this column's full
                    (already only ~1/3-row) width. */}
                <PhoneInput value={phone} onChange={setPhone} className="max-w-sm" />
                <div className="flex flex-col gap-1">
                  <span className="lyra-body-md-emphasis text-lyra-fg-default">Call Attempts Today: 0</span>
                  <span className="lyra-body-md-emphasis text-lyra-fg-default">Call Attempts Total: 0</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Checkbox label="Consent Call" checked={consentCall} onCheckedChange={(c) => setConsentCall(c === true)} />
                <Checkbox label="Consent SMS" checked={consentSms} onCheckedChange={(c) => setConsentSms(c === true)} />
              </div>
              <RadioGroup value={block} onValueChange={setBlock} className="gap-2">
                {CUSTOMER_DIRECTORY_BLOCK_OPTIONS.map((option) => (
                  <RadioGroupItem key={option.value} value={option.value} label={option.label} />
                ))}
              </RadioGroup>
            </div>
          ),
        },
      ]}
    />
  );
}

/* ── CustomerDirectoryTabContent ──
   The "Directory" tab (per a reference screenshot of a legacy admin
   contact-edit page): an `EmailInput` + a standalone consent `Checkbox` at
   the top, then up to 10 phone slots (`CustomerDirectoryPhoneRow`),
   separated by a hairline divider between every section
   (`border-lyra-border-subtle`). The reference screenshot's own
   alternating shaded/unshaded rows were dropped on request — plain
   dividers only, no zebra striping.

   Reference screenshot's own field labels were all-caps ("EMAIL", "HOME") —
   same legacy-app-styling situation as the Detail tab's "CONTACT #" etc.
   (see `CustomerDetailTabContent`'s own doc comment and CONTRIBUTING.md
   §17): typed in normal case here and left to each field component's own
   built-in label typography, not forced uppercase via CSS.

   Only the "Home" row (the first phone slot) seeds from real data — the
   same `fields` "Phone #" this panel's Overview/Detail tabs already show
   (parsed back into a `PhoneValue` via `phoneValueFromDisplay`), with
   `consentCall`/`consentSms` defaulted true since it's the customer's
   already-established primary channel. "Phone 2" through "Phone 10" have
   no real or synthesized source (a customer doesn't have 10 real numbers
   in this app's data), so they start genuinely blank/unconsented, same as
   the reference screenshot shows them. */
function CustomerDirectoryTabContent({ email, phoneDisplay }: { email: string; phoneDisplay: string }) {
  const [directoryEmail, setDirectoryEmail] = useState(email);
  const [emailConsent, setEmailConsent] = useState(false);

  return (
    <div className="flex flex-col lyra-form-grid-wrap">
      <div className="flex flex-col gap-3 px-4 py-4">
        {/* `max-w-sm` (384px) — same "cap a single full-width-by-default
            field at a sane reading width" convention lyra-ui's own
            Storybook demos use for a lone `Input`/`EmailInput` outside a
            multi-column grid (`Input.stories.tsx`'s `max-w-[400px]`,
            `TagsInput`/`Textarea` stories' `max-w-sm`) — `EmailInput`
            itself has no dedicated width prop; `className` lands on its
            outer wrapper div (email-input.tsx) same as `Input`, so this is
            the standing way to constrain one rather than adding a new
            component prop for it. */}
        <EmailInput label="Email" value={directoryEmail} onChange={setDirectoryEmail} className="max-w-sm" />
        <Checkbox label="Consent" checked={emailConsent} onCheckedChange={(c) => setEmailConsent(c === true)} />
      </div>
      {/* Each phone slot is now its own bordered card
          (`CUSTOMER_INFO_ACCORDION_CLASSNAME` on the `Accordion` inside
          `CustomerDirectoryPhoneRow`), so this wrapper switches from a bare
          `border-t` + flush list (dividers supplied by each row's own
          bottom border) to a gap + padding, matching the Overview/Detail
          tabs' own card-stack spacing. */}
      <div className="flex flex-col gap-4 px-4 pt-3 pb-4">
        {CUSTOMER_DIRECTORY_PHONE_LABELS.map((label, i) => (
          <CustomerDirectoryPhoneRow
            key={label}
            label={label}
            defaultState={
              i === 0
                ? { phone: phoneValueFromDisplay(phoneDisplay), consentCall: true, consentSms: true, block: "no-block" }
                : { phone: { countryCode: "us", number: "" }, consentCall: false, consentSms: false, block: "no-block" }
            }
          />
        ))}
      </div>
    </div>
  );
}

function CustomerInformationPanelBody({
  activeTab,
  customerName,
  fields,
  latestInteraction,
  latestNote,
  recordId,
  channels,
  onOpenConversation,
  onViewAllInteractions,
}: {
  activeTab: number;
  /** Overview's "Open Conversation" deep link (Latest Interaction
   *  accordion) — opens the newest past session's conversation as a TAB in
   *  the interaction space (record header), not inside this panel. Only
   *  the real side panel passes it; the hover preview doesn't. */
  onOpenConversation?: (entry: CustomerHistorySessionEntry) => void;
  /**
   * Overview's "View All Interactions" button (Latest Interaction
   * accordion, directly below "Open Conversation") — switches THIS SAME
   * panel over to its own "Interactions" tab, per explicit request. Unlike
   * `onOpenConversation` above (which opens a whole separate tab in the
   * interaction space), this stays entirely within the panel the agent is
   * already looking at — so every caller that owns `activeTab`/
   * `setActiveTab` (the real side panel, the hover preview, and the
   * Customers-table row panel alike) can wire this the same simple way:
   * `() => setActiveTab(CUSTOMER_PANEL_TABS.indexOf("Interactions"))`.
   * Gated at the render site below on `recordId` (not
   * `customerHistoryEntries.length`, unlike `onOpenConversation`) — the
   * Interactions tab itself is always worth switching to once a real
   * record exists, even for a customer with zero synthesized entries
   * (`CustomerHistoryTabContent`'s own empty state already covers that
   * case), whereas "Open Conversation" specifically needs a real newest
   * entry to open.
   */
  onViewAllInteractions?: () => void;
  /** Needed here (not just by `buildCustomerInfoFields`) for the Detail
   *  tab's "First Name"/"Last Name" fields — see `CustomerDetailTabContent`. */
  customerName?: string;
  /** Built per-interaction by `buildCustomerInfoFields` (see
   *  `CustomerInformationSidePanel`, which owns the interaction's
   *  `customerName`/`recordId`/`channels` this depends on) — no longer a
   *  fixed module-level placeholder shared by every interaction. */
  fields: CustomerInfoField[];
  /** Built per-interaction by `buildLatestInteraction` — see that
   *  function's own doc comment. */
  latestInteraction: CustomerLatestInteraction;
  /** Built per-interaction by `buildLatestNote` — see that function's own
   *  doc comment. Renders as its own accordion directly below Latest
   *  Interaction (see the "Latest Interaction"/"Latest Note" column
   *  comment below). */
  latestNote: CustomerLatestNote;
  /** Supplied by `CustomerInformationSidePanel` and `CustomerInfoHoverPreview`
   *  (both have a real interaction's `recordId`/`channels` in scope to
   *  synthesize session history from) — left `undefined` only by
   *  `CustomerRowInfoPanel` (Customers-table row, no `TrackedChannel[]` of
   *  its own to build from), where the Interactions tab renders nothing
   *  (same "no content behind it yet" treatment as Tasks/Notes/Accounts/
   *  Tickets below) rather than a possibly-misleading empty state. See the
   *  Interactions-tab branch below for how this gates that content. */
  recordId?: string;
  channels?: TrackedChannel[];
}) {
  // Controlled (not `defaultValue`, unlike Latest Interaction beside it)
  // specifically so the stacked column below knows whether Latest Note
  // itself is open — needed to gate its own `flex-1` height-matching growth
  // (see that Accordion's own comment) off while it's collapsed. Growing a
  // COLLAPSED card to fill the column's full stretched height would stretch
  // its little closed header row across a tall box with a big dead gray gap
  // below it instead of matching content — the exact failure mode this
  // file's own `bothCardsOpen` gate was originally written to avoid for the
  // two cards' old side-by-side row (see git history), reapplied here to
  // just the one trailing card that actually needs it now.
  const [latestNoteAccordionValue, setLatestNoteAccordionValue] = useState("latest-note");
  const latestNoteOpen = latestNoteAccordionValue !== "";
  // Same controlled pattern, same reasoning, for Customer Overview itself —
  // per explicit follow-up request, height-matching between the two
  // COLUMNS now has to work in BOTH directions: Customer Overview used to
  // be assumed the reliably-taller side (see `CUSTOMER_INFO_ACCORDION_
  // CLASSNAME`'s `h-fit` on it, still the default height), with only the
  // right-hand stacked column ever growing to match it. Adding "View All
  // Interactions" to Latest Interaction can now push the RIGHT column
  // taller instead for some customers (a long field list isn't guaranteed
  // to stay the taller side any more) — so Customer Overview needs the
  // exact same "stay `h-fit` while collapsed, grow to match while open"
  // toggle Latest Note already has, just applied to the ROW's cross axis
  // (height, via the row's own default `align-items: stretch`) instead of
  // a COLUMN's main axis (see that Accordion's own `flex-1 h-auto` comment
  // for the axis distinction) — no `flex-1` needed here for that reason,
  // just clearing `h-fit` to `h-auto` is enough to let the row's existing
  // stretch behavior size it to match whichever side is actually taller.
  const [customerOverviewAccordionValue, setCustomerOverviewAccordionValue] = useState("customer-overview");
  const customerOverviewOpen = customerOverviewAccordionValue !== "";

  // Interactions tab — this customer's synthesized session history
  // (`CustomerHistoryTabContent`/`CustomerHistorySessionDetailPanel`, see
  // that section's own doc comment) — was a separate, independently-
  // selectable "Customer History" tab in the record header before, moved in
  // here per explicit request so it's just another tab of this same panel.
  // State lives locally in this component (not lifted to `AgentNextGenPage`
  // the way it used to be) because this whole component already remounts on
  // a genuine interaction switch via its caller's own
  // `key={`side-panel-${activeInteraction.id}`}` wrapper — the exact same
  // "survives navigate-away-and-back to the SAME interaction, resets on a
  // genuinely different one" behavior the old lifted state was hand-rolling
  // via a ref-based identity check, now free from the remount itself.
  // `undefined` while `recordId` isn't supplied (see that prop's own doc
  // comment) — this tab renders nothing at all in that case, so the
  // synthesized-entries memo just yields an empty array and nothing below
  // ever reads `selectedHistoryIndex`.
  const customerHistoryEntries = useMemo(
    () => (recordId ? buildCustomerHistoryEntries(customerName, recordId, channels ?? []) : []),
    [customerName, recordId, channels]
  );
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  const selectedHistoryEntry = selectedHistoryIndex !== null ? customerHistoryEntries[selectedHistoryIndex] ?? null : null;

  const handleHistoryNav = (direction: 1 | -1) => {
    setSelectedHistoryIndex((prev) => {
      if (prev === null) return prev;
      const next = prev + direction;
      if (next < 0 || next >= customerHistoryEntries.length) return prev;
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* `h-full min-h-0` — unconditional, every tab, not just gated to
          Interactions. Two earlier attempts at giving Interactions its own
          independently-scrolling box (one gated to just this tab, one
          unconditional like this) both failed live — but the actual root
          cause turned out to be one level up, not here: `SidePanel`'s own
          pinned/docked branch (side-panel.tsx) was missing the `h-full`
          its unpinned/full-screen branch already had, so `PanelContent`
          above this wrapper never reliably had a DEFINITE height to give
          it in docked mode specifically (confirmed by the exact symptom
          reported: full-screen scrolled fine, docked didn't — full-screen
          reaches its height a completely different way, `position:
          absolute` against `Container`'s own unambiguous flex-grow height,
          which was never affected by the bug). With that fixed at its
          actual source, this wrapper's own `h-full` now resolves correctly
          again — every tab gets a real box matching `PanelContent`'s
          available height (harmless for Overview/Detail/etc., which just
          overflow it normally with no clipping, same as always), and the
          Interactions tab below gets a genuinely bounded box to build its
          own internal list-scroll + overlaying detail panel on top of. */}
      {/* No avatar/name/presence block here — the InteriorPanel's own
          header (`headerTitle="Customer Information"` +
          `headerSubhead="{name} · {id}"`) already shows the name, so a
          second name+avatar block right below it was redundant.

          No tabs here either anymore — they used to live at the top of
          this same scrolling body, pinned via a hand-rolled `sticky`
          wrapper (see the git history / CONTRIBUTING.md's "Composing
          panel body content" for the full story of why that was wrong:
          the surrounding scroll container's own scrollbar still ran
          alongside a merely-`sticky` row, and `TabList`'s "N More"
          overflow menu had its own separate bug where selecting a tab
          from it silently did nothing once the row collapsed, fixed in
          tabs.tsx). They now render inside the header itself via
          `SidePanel`'s `headerTabs` prop — see
          `CustomerInformationSidePanel` below, which owns the
          `activeTab` state both this body and that header tab row need
          and passes this component just the number.

          This field list and the Customer Overview/Latest Interaction/
          Latest Note block below it are now both explicitly gated to the
          Overview tab (`activeTab === ...indexOf("Overview")`) —
          previously only the accordions had that gate, so this list
          rendered on every tab, including the new Detail tab added below,
          which shows its own full editable version of the same fields
          (`CustomerDetailTabContent`) and would otherwise show them twice.

          Layout (per explicit follow-up request): Customer Overview is now
          its own full-width row on top; Latest Interaction and Latest Note
          share one `.lyra-card-split-wrap`/`.lyra-card-split` row below it
          (see lyra-tokens.css) — reusing the same family `DashboardCard`
          bodies already use for "a couple of regions side by side,
          stacking once the container's own width gets tight" rather than
          inventing a new one (its ≤480px threshold already fits here on
          both ends: this panel's normal resizable range, ~350–425px per
          `InteriorPanel`'s own min/max defaults, stays comfortably under
          it — single column, unchanged from before this existed — and
          `allowFullScreen`'d width is easily past it — side by side).
          (Earlier arrangement, superseded here: Latest Interaction paired
          with Customer Overview in the split row, Latest Note full-width
          below both — moved per this follow-up request so Latest
          Interaction sits directly left of Latest Note instead.)

          Top/bottom order (both row and stacked state) falls straight out
          of plain DOM order — flexbox doesn't reverse either axis without
          an explicit `row-reverse`/`column-reverse`, so whichever child
          comes FIRST in the JSX is the TOP block regardless of state here
          (Customer Overview, full width, has no row-state sibling to sit
          left/right of). `align-items: stretch` (the split family's own
          default) is harmless here specifically because `Accordion`'s own
          root has no `h-full`/`flex-1` of its own (accordion.tsx) — a
          stretched flex item just leaves invisible empty space below its
          natural-height content, not a visibly over-tall bordered box.

          Unlike `.lyra-container-grid`/`.lyra-form-grid`, `.lyra-card-
          split` does NOT put `flex: 1 1 0%` on its children automatically
          — that family's own two optional modifiers (`.lyra-card-split-
          fixed`, a deliberately fixed 12rem column; `.lyra-card-split-
          chart`, `flex: 1 1 0%` for the region beside it) exist precisely
          because its usual pairing is one fixed-width region next to one
          flexible one, not two equal columns. Left as plain children, the
          two `Accordion`s took their own natural content width instead,
          rendering visibly unequal (each has its own different content
          length). The `.lyra-card-split-even` modifier (lyra-tokens.css)
          on both fixes that, splitting the row evenly (and correctly
          resetting back to full-width at the stacked stage, same as
          `.lyra-container-grid`/`.lyra-form-grid`'s own children — see
          that modifier's own doc comment for why a bare `flex-1` utility
          class alone isn't enough here).

          Gap consistency (per explicit request — rows and columns both
          16px): the outer `flex flex-col gap-4` below already puts 16px
          between Customer Overview and the split row. `.lyra-card-split`'s
          own shared rule (lyra-tokens.css) defaults to `gap: 1.5rem`
          (24px) — correct for its other consumers, but inconsistent with
          this 16px if left alone. Overridden here via an inline `style`
          (not a Tailwind class) specifically because `.lyra-card-split`'s
          `gap` comes from a plain CSS class, not a Tailwind utility —
          `cn()`/`tailwind-merge` only dedupes genuine Tailwind utility
          conflicts, so a `gap-4` class alongside `lyra-card-split` would
          just tie in specificity with it and depend on stylesheet source
          order to win, the exact fragility CONTRIBUTING.md already warns
          about elsewhere in this file. An inline style has no such
          ambiguity — it always wins. Applies identically whether the row
          is side-by-side or (≤480px) stacked to a column, since inline
          styles aren't scoped to a breakpoint the way the shared class's
          own `@container` rule is — 16px either way, matching the 16px
          above it. */}
      {activeTab === CUSTOMER_PANEL_TABS.indexOf("Overview") && (
        <div className="px-4 py-3 flex flex-col gap-4">
          {/* Customer Overview now sits directly LEFT of a stacked Latest
              Interaction/Latest Note column (per explicit request) — was a
              full-width block on its own row above that pair, back when
              Latest Interaction and Latest Note were side-by-side beneath
              it instead of stacked. Reuses the same `.lyra-card-split-wrap`/
              `.lyra-card-split`/`.lyra-card-split-even` family the two-
              column Latest Interaction/Latest Note row already used for "a
              couple of regions side by side, stacking once the container's
              own width gets tight" (see that modifier's own doc comment in
              lyra-tokens.css) — just with two DIFFERENT regions as the
              row's two children now: this Accordion on the left, and the
              new stacked wrapper below on the right, rather than each half
              being one Accordion the way the old row was. Its ≤480px
              stacking threshold still fits here: at the panel's normal
              resizable width (~325–425px) it stacks to a column (Customer
              Overview on top, matching the old top-to-bottom reading order),
              and `allowFullScreen`'d width stays comfortably side by side. */}
          <div className="lyra-card-split-wrap">
            <div className="lyra-card-split" style={{ gap: "1rem" }}>
              {/* Customer Overview field list. Wrapped in a neutral
                  container (`bg-lyra-bg-control-subtle`, rounded) per
                  CONTRIBUTING.md's "Composing panel body content"
                  convention, rather than sitting flush against the panel
                  background — the convention to follow for any future
                  card-like block added here, not a one-off choice for this
                  block alone. Collapsible via lyra-ui's `Accordion` (single
                  item, open by default) rather than a plain static block,
                  so the panel can be collapsed once read.

                  Height-matching now goes BOTH ways, per explicit follow-up
                  request — this used to stay unconditionally `h-fit` (its
                  own natural content height, from `CUSTOMER_INFO_ACCORDION_
                  CLASSNAME`) on the assumption its own field list was
                  reliably the taller side, with only the stacked column on
                  the right ever growing to match it. That assumption broke
                  once "View All Interactions" made the right column taller
                  for some customers — so this now clears `h-fit` to
                  `h-auto` (via `customerOverviewOpen`, controlled the same
                  way `latestNoteOpen` is — see that state's own comment)
                  whenever it's open, letting the row's own default
                  `align-items: stretch` size it to match whichever side is
                  actually taller, same mechanism the stacked wrapper below
                  already relied on for the other direction. Stays `h-fit`
                  while collapsed (same reasoning `latestNoteOpen`'s own gate
                  documents) so collapsing this card doesn't leave it
                  stretched into a tall box with a dead gap below its closed
                  header row. */}
              <Accordion
                className={cn(
                  CUSTOMER_INFO_ACCORDION_CLASSNAME,
                  "lyra-card-split-even",
                  customerOverviewOpen && "h-auto"
                )}
                value={customerOverviewAccordionValue}
                onValueChange={setCustomerOverviewAccordionValue}
                items={[
                  {
                    id: "customer-overview",
                    title: "Customer Overview",
                    content: (
                      <div className="flex flex-col gap-3">
                        {fields.map((field, index) => (
                          <div key={field.label} className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-4">
                              <Label label={field.label} />
                              <span className="lyra-body-md text-lyra-fg-secondary whitespace-nowrap">
                                {field.value}
                              </span>
                            </div>
                            {index < fields.length - 1 && <Separator />}
                          </div>
                        ))}
                      </div>
                    ),
                  },
                ]}
              />

              {/* Latest Interaction stacked directly ABOVE Latest Note (per
                  explicit request) — was side-by-side with it in its own
                  row below Customer Overview before; now the two share this
                  plain flex column instead, which is itself the second
                  (right) child of the Customer Overview split row above.
                  `lyra-card-split-even` goes on THIS wrapper (a direct
                  child of `.lyra-card-split`), not on the two Accordions
                  inside it — they're no longer direct children of the split
                  row themselves, just plain stacked flex-column children.

                  `align-items: stretch` (the split row's own default)
                  stretches this wrapper's HEIGHT to match the row's cross
                  size — since it has no explicit height of its own to opt
                  out with, unlike each side's own Accordion, which opts
                  BACK out to `h-fit` whenever collapsed (Customer Overview's
                  own `customerOverviewOpen`/Latest Note's own
                  `latestNoteOpen` gates — see each Accordion's own comment).
                  While open, the row's cross size is simply the max of the
                  two sides' natural content heights, and BOTH sides now grow
                  to match it (Customer Overview via the row's cross axis
                  directly, this wrapper's own stacked column via Latest
                  Note's `flex-1` below) — so whichever side is actually
                  taller for a given customer, the other one grows to match
                  it, not just one fixed "always taller" side. That alone
                  only gets the outer wrapper box to the right total height,
                  though — a plain `flex-col` of two natural-height
                  Accordions doesn't automatically grow its own children to
                  fill that extra space, so without more, the wrapper would
                  just end in blank unbordered space below Latest Note
                  instead of the two columns visually lining up (confirmed
                  live — this was the very next thing reported). Latest
                  Note's own `flex-1` (see that Accordion's own comment
                  below) is what actually closes that gap, growing ITS
                  bordered box to absorb the leftover height so the stack's
                  own bottom edge lines up with Customer Overview's — same
                  "stretch a card's own box to fill available height, even
                  past its natural content" mechanism this file's own
                  `bothCardsOpen`/`h-auto` used for the two cards' old
                  side-by-side row, just applied to one trailing card in a
                  column instead of two peer cards in a row. */}
              <div className="flex flex-col gap-4 lyra-card-split-even">
                {/* Its trigger renders the "Latest Interaction" title
                    itself — no hand-styled label needed here at all, which
                    also fixes an earlier mistake: that label used to be a
                    hand-built `uppercase tracking-wide` span, applying an
                    all-caps CSS transform to change how it displayed
                    instead of just typing it correctly — exactly the thing
                    CONTRIBUTING.md §17 ("Field label casing") says not to
                    do ("don't add `text-transform`; type the label text
                    correctly to begin with"). Typing the string as
                    `"Latest Interaction"` (already correct Title Case) and
                    letting the shared component's own typography render it
                    is the fix, not restyling it further.

                    Content itself comes from `latestInteraction` (built by
                    `buildLatestInteraction`) rather than one fixed
                    placeholder blurb — see that function's own doc comment
                    for why (it used to be the exact same "Asked about
                    upgrading her plan..." summary for every customer,
                    gendered pronoun and all, regardless of who was actually
                    open).

                    Status used to render as its own pill `Badge` sitting to
                    the right of the timestamp line — reverted per explicit
                    request (a filled pill there read as too visually loud/
                    noticeable). Now a plain second line directly below the
                    timestamp: a small circle `Badge` dot (`shape="circle"
                    dot"`, colored via `statusVariant` the same semantic-role
                    vocabulary `ContactHistoryStatusVariant`/Contact
                    History's own status dots already use) plus the status
                    name as plain text next to it — quieter than a filled
                    pill, same "dot + label" idiom already established
                    elsewhere in this file. */}
                <Accordion
                  className={CUSTOMER_INFO_ACCORDION_CLASSNAME}
                  defaultValue="latest-interaction"
                  items={[
                    {
                      id: "latest-interaction",
                      title: "Latest Interaction",
                      content: (
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 lyra-body-sm text-lyra-fg-secondary">
                              <Clock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                              {latestInteraction.timeAgo} · {latestInteraction.channel}
                            </span>
                            <span className="inline-flex items-center gap-1.5 lyra-body-sm text-lyra-fg-secondary">
                              <Badge shape="circle" dot size="sm" variant={latestInteraction.statusVariant} aria-hidden="true" />
                              {latestInteraction.status}
                            </span>
                          </div>
                          <p className="lyra-body-md text-lyra-fg-default">{latestInteraction.summary}</p>
                          <span className="lyra-body-sm text-lyra-fg-secondary">
                            {latestInteraction.caseId} · Handled by {latestInteraction.handledBy}
                          </span>
                          {/* Deep link: the single most common history lookup
                              ("what happened last time?") in ONE click from the
                              panel's landing tab — opens the newest past
                              session's conversation as a tab in the
                              INTERACTION SPACE (record header), full reading
                              width, per explicit request. Only rendered when
                              the owner wired it (real side panel, not the
                              hover preview) and entries exist. */}
                          {onOpenConversation && customerHistoryEntries.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="self-start"
                              onClick={() => onOpenConversation(customerHistoryEntries[0])}
                            >
                              Open Conversation
                              <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                            </Button>
                          )}
                          {/* "View All Interactions" — per explicit
                              request, an outline button (visually distinct
                              from "Open Conversation"'s own plain `ghost`
                              styling right above it) that switches this
                              same panel over to its "Interactions" tab
                              rather than opening a separate one — see
                              `onViewAllInteractions`'s own doc comment for
                              why its gate (`recordId`) differs from "Open
                              Conversation"'s (`customerHistoryEntries.
                              length > 0`). */}
                          {onViewAllInteractions && recordId && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="self-start"
                              onClick={onViewAllInteractions}
                            >
                              View All Interactions
                            </Button>
                          )}
                        </div>
                      ),
                    },
                  ]}
                />

                {/* Latest Note — directly below Latest Interaction (per
                    explicit request). Same neutral-container + collapsible-
                    Accordion treatment as Latest Interaction above it (see
                    that block's own comments for the container/collapsible
                    rationale — applies identically here), synthesized by
                    `buildLatestNote` the same deterministic-per-customer
                    way. No status `Badge` here — notes don't carry a
                    resolution status the way an interaction does — just the
                    author + relative time, same placement
                    `latestInteraction`'s case-id/handled-by line uses.

                    `flex-1` (only while open — see `latestNoteOpen`) is
                    what actually makes the stacked column's own stretched
                    height (from the split row's `align-items: stretch`,
                    see the wrapper's own comment above) show up as a real,
                    visibly-taller bordered box instead of invisible space
                    below it — growing THIS card, specifically, rather than
                    Latest Interaction above it, so the trailing card in the
                    stack is the one that absorbs the leftover height,
                    matching Customer Overview's own bottom edge. `h-auto`
                    alongside it clears `CUSTOMER_INFO_ACCORDION_CLASSNAME`'s
                    own `h-fit` for the same reason it did on the two cards'
                    old side-by-side row (see that history for the full
                    "h-fit silently overriding stretch" explanation) — this
                    is a flex-COLUMN growing on the main axis (height) this
                    time rather than a flex-ROW stretching on the cross axis,
                    but an explicit `h-fit` risks the same kind of fight
                    with the flex algorithm either way, so it's cleared here
                    too rather than assumed harmless. */}
                <Accordion
                  className={cn(CUSTOMER_INFO_ACCORDION_CLASSNAME, latestNoteOpen && "flex-1 h-auto")}
                  value={latestNoteAccordionValue}
                  onValueChange={setLatestNoteAccordionValue}
                  items={[
                    {
                      id: "latest-note",
                      title: "Latest Note",
                      content: (
                        <div className="flex flex-col gap-3">
                          <span className="inline-flex items-center gap-1.5 lyra-body-sm text-lyra-fg-secondary">
                            <FileText className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                            {latestNote.timeAgo}
                          </span>
                          <p className="lyra-body-md text-lyra-fg-default">{latestNote.note}</p>
                          <span className="lyra-body-sm text-lyra-fg-secondary">By {latestNote.author}</span>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === CUSTOMER_PANEL_TABS.indexOf("Interactions") && recordId && (
        // `relative flex flex-1 min-h-0 overflow-hidden` — restored (was
        // briefly simplified away to plain `relative` while chasing what
        // turned out to be an unrelated bug one level up — see the outer
        // wrapper's own comment above). This is the shape that was always
        // intended: a flex ROW, bounded to this tab's own share of the
        // panel's real available height (`min-h-0` off the now-reliably-
        // definite `h-full` chain above).
        //   - `relative` gives `CustomerHistorySessionDetailPanel` (a
        //     right-docked `InteriorPanel`) the positioning context it
        //     needs to dock within THIS box specifically, not the whole
        //     app shell.
        //   - At this panel's normal docked/popover widths (well under
        //     `InteriorPanel`'s own 1024px `isNarrow` threshold), that
        //     panel renders via its absolute-overlay branch — floating on
        //     TOP of the list below, not pushing it down, and (now that
        //     this box has a real bounded height instead of an arbitrary
        //     content-driven one) sized to the actual visible area instead
        //     of the full unscrolled list height — which is what was
        //     causing the reported "double scroll"/cut-off-with-room-to-
        //     spare symptoms: an absolutely-positioned `h-full` matching a
        //     content-driven ancestor's height is exactly as tall as ALL
        //     the (possibly very long) list content, not the viewport.
        //   - At real full-screen width (≥1024px, `allowFullScreen`'d),
        //     that same panel switches to its normal inline branch instead
        //     — and because THIS wrapper is a flex ROW (not a plain block),
        //     that inline panel sits beside `CustomerHistoryTabContent` as
        //     a true side-by-side dock, not stacked below it (a plain
        //     block wrapper, as this briefly was, stacks block children
        //     vertically instead — confirmed live as the "session details
        //     opening below the list in full screen" report).
        //   - `CustomerHistoryTabContent`'s own `flex-1 min-h-0 overflow-
        //     hidden` root (see that component) is what then gives its
        //     list a real box to scroll independently WITHIN — a single
        //     scroll, not the double-scroll this box's earlier, unbounded
        //     `relative`-only version produced (list content overflowing
        //     into the page's own scroll AND the detail panel separately
        //     trying to scroll its own oversized box).
        <div className="relative flex flex-1 min-h-0 overflow-hidden">
          <CustomerHistoryTabContent
            entries={customerHistoryEntries}
            selectedIndex={selectedHistoryIndex}
            onSelectIndex={setSelectedHistoryIndex}
          />
          <CustomerHistorySessionDetailPanel
            entry={selectedHistoryEntry}
            onClose={() => setSelectedHistoryIndex(null)}
            onPrevious={() => handleHistoryNav(-1)}
            onNext={() => handleHistoryNav(1)}
            hasPrevious={selectedHistoryIndex !== null && selectedHistoryIndex > 0}
            hasNext={selectedHistoryIndex !== null && selectedHistoryIndex < customerHistoryEntries.length - 1}
          />
        </div>
      )}

      {activeTab === CUSTOMER_PANEL_TABS.indexOf("Detail") && (
        <CustomerDetailTabContent customerName={customerName} fields={fields} />
      )}

      {activeTab === CUSTOMER_PANEL_TABS.indexOf("Directory") && (
        <CustomerDirectoryTabContent
          email={getFieldValue(fields, "Email")}
          phoneDisplay={getFieldValue(fields, "Phone #")}
        />
      )}
    </div>
  );
}

/** Shows the exact same "Customer Information" content the real panel
 *  displays — same `CustomerInformationPanelBody`, fed by the same
 *  `buildCustomerInfoFields`/`buildLatestInteraction`/`buildLatestNote`
 *  data and the same `CUSTOMER_PANEL_TABS` tab set, even the same
 *  Overview-tab `AIInput` footer — inside a `Popover` when the agent
 *  hovers the record header's toggle icon while the real panel is closed
 *  (see the render site further down). A hover-preview flyout of the panel
 *  itself, per explicit request, not a separate hand-built summary — this
 *  can never show something different from what actually opening the panel
 *  would. Same idea as `InteractionNavItem`'s own compact-rail hover
 *  preview (interaction-nav-item.tsx: "think of how you display your left
 *  nav when it's closed"), which shows that card's full real content
 *  (`cardBody`) inside a bare, self-chromed `Popover` rather than a
 *  simplified stand-in — this component supplies that same complete chrome
 *  itself (border/background/shadow/rounded corners, matching `SidePanel`'s
 *  own `bg-lyra-bg-surface-container-subtle` — side-panel.tsx) since the
 *  render site strips the default `Popover` framing to a bare frame around
 *  it, exactly like that same precedent.
 *
 *  Sized to actually fit as a flyout (fixed `w-[340px]`, matching this
 *  panel's own default docked width, `max-h-[70vh]` with only the body
 *  scrolling) rather than the real panel's full docked/full-screen height —
 *  the header (title/subhead + tabs) stays pinned via `PanelHeader`'s own
 *  `tabs` prop, same fixed-header/scrolling-body split `SidePanel` itself
 *  uses, so a tall tab's content scrolls internally instead of pushing the
 *  popover off-screen. Owns its own `activeTab` state (starts on Overview),
 *  independent of the real panel's own — switching tabs in this preview
 *  doesn't affect, and isn't affected by, whatever tab the agent last left
 *  the real panel on.
 *
 *  `onMouseEnter`/`onMouseLeave` are wired by the caller to the exact same
 *  open-immediately/close-on-a-short-delay handlers as the trigger icon
 *  itself — Radix `Popover.Content` portals straight to `document.body`,
 *  outside the trigger icon's own DOM subtree, so without re-arming here
 *  too, moving the pointer from the icon into this (portaled) popover would
 *  fire the icon's own `onMouseLeave` and close the preview before the
 *  agent can actually read it — same fix already applied once for
 *  `InteractionNavItem`'s own hover-preview card. */
function CustomerInfoHoverPreview({
  customerName,
  recordId,
  channels,
  onMouseEnter,
  onMouseLeave,
}: {
  customerName?: string;
  recordId: string;
  channels: TrackedChannel[];
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const fields = useMemo(
    () => buildCustomerInfoFields(customerName, recordId, channels),
    [customerName, recordId, channels]
  );
  const latestInteraction = useMemo(
    () => buildLatestInteraction(customerName, recordId),
    [customerName, recordId]
  );
  const latestNote = useMemo(() => buildLatestNote(customerName, recordId), [customerName, recordId]);

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      // `h-[80vh] max-h-[768px]` — a standard size regardless of which
      // tab's content happens to be active, rather than shrinking to fit
      // whatever's shortest (confirmed live: switching to the Interactions
      // tab here — before it had `recordId`/`channels` wired below — showed
      // nothing, and with no min/fixed height the whole flyout collapsed
      // down to just its header, which read as broken rather than merely
      // empty). `80vh` scales with the viewport (was `90vh` — confirmed
      // live that overflowed the screen on a normal-height display, since
      // this popover trigger sits fairly high up the record header, not
      // vertically centered — 80vh leaves enough margin above/below to
      // stay fully on-screen), and `max-h-[768px]` caps it from growing
      // arbitrarily tall on very large displays — per explicit spec.
      className="flex h-[80vh] max-h-[768px] w-[340px] flex-col overflow-hidden rounded-lyra-lg border border-lyra-border-default bg-lyra-bg-surface-container-subtle shadow-lg"
    >
      <PanelHeader
        title={customerName ?? "Customer"}
        subhead={recordId}
        tabs={
          <TabList className="px-4" overflowMenu>
            {CUSTOMER_PANEL_TABS.map((label, i) => (
              <Tab key={label} active={activeTab === i} onClick={() => setActiveTab(i)}>
                {label}
              </Tab>
            ))}
          </TabList>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <CustomerInformationPanelBody
          activeTab={activeTab}
          customerName={customerName}
          fields={fields}
          latestInteraction={latestInteraction}
          latestNote={latestNote}
          // Was left unwired (Interactions rendered nothing here, same
          // stub treatment as Tasks/Notes/Accounts/Tickets) — but unlike
          // those genuinely-unimplemented tabs, this data is already
          // sitting right here in scope (this component's own required
          // `recordId`/`channels` props), so there's no real reason not to
          // show it. Per explicit follow-up request.
          recordId={recordId}
          channels={channels}
          onViewAllInteractions={() => setActiveTab(CUSTOMER_PANEL_TABS.indexOf("Interactions"))}
        />
      </div>
      {/* Same Overview-only `AIInput` footer as the real panel (see its own
          `footer` prop above) — kept here too for exact content parity,
          per this component's own doc comment. `SHOW_CUSTOMER_INFO_AI_INPUT`
          — see that flag's own doc comment — temporarily hides it here too. */}
      {SHOW_CUSTOMER_INFO_AI_INPUT && activeTab === CUSTOMER_PANEL_TABS.indexOf("Overview") && (
        <PanelFooter className="relative shrink-0 justify-start">
          <div
            className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-b from-transparent to-lyra-bg-surface-container-subtle"
            aria-hidden="true"
          />
          <AIInput placeholder="Ask about this customer..." showAttach={false} className="w-full" />
        </PanelFooter>
      )}
    </div>
  );
}

/* ── CustomerInformationSidePanel ──
   Owns `activeTab` — the one piece of state both the header's `TabList`
   (via `SidePanel`'s `headerTabs`) and the scrolling body below it
   (`CustomerInformationPanelBody`) need, which is why this wraps both
   instead of `CustomerInformationPanelBody` owning that state itself the
   way it used to when the tabs still lived inside it.

   Also where the field list and Latest Interaction summary are actually
   computed (`buildCustomerInfoFields`/`buildLatestInteraction`, each
   memoized on `customerName`/`recordId`/`channels`) — takes the raw
   interaction fields instead of a pre-joined `headerSubhead` string so it
   has what it needs to build the header text and both panel-body pieces
   from the same source, rather than the caller assembling one string this
   component has to parse back apart.

   Docked LEFT via the generic `SidePanel` primitive (matching the request
   to move this content into a left side panel, per the reference
   screenshot) rather than the right-docked `InteriorPanel` this was
   previously built on — pin/hover-preview state lives in the parent
   (mirrors `AgentNextGenTemplate.stories.tsx`'s own `CustomerInformation-
   Panel` usage, the current reference for a left-docked side panel in
   this exact spot), since that's a `SidePanel`-only concept `InteriorPanel`
   never had. `allowFullScreen`/`exitFullScreenSignal`/`onOverlayModeChange`
   don't carry over — `SidePanel` has no "full screen" or "floating
   overlay" concept of its own; an unpinned panel simply shows/hides on
   hover instead.

   Full-screen (per explicit follow-up request) is built entirely here,
   without adding a real "full screen" concept to `SidePanel` itself: the
   caller passes `pinned={false}` (always an unpinned/floating overlay
   while full-screen — pushing the main column over via docked/pinned mode
   wouldn't read as "overlay full screen within its parent container") and
   `width` equal to the parent `Container`'s own measured width
   (`sidePanelContainerWidth`, already tracked for the narrow-container
   guard) instead of the normal drag-resized width, so the panel's own
   existing unpinned/absolute rendering branch (side-panel.tsx) covers the
   whole container edge to edge — animated by the same CSS width
   transition every other resize already uses, so expanding/collapsing
   full-screen isn't an instant jump cut. That animation needed one small
   fix in the shared `usePanelDragResize` hook (use-panel-drag-resize.ts):
   it used to latch onto whatever width a manual drag last set and ignore
   further external `width` prop changes afterward, which (a) silently
   broke this full-screen toggle for a panel that had been manually
   resized even once before, and (b) meant this component used to have to
   force a full remount on every full-screen toggle just to reset that
   stale internal state, which skipped the transition entirely (a fresh
   DOM node has no prior frame to animate from). The hook now resets its
   own internal drag state whenever its `initialWidth` prop changes, so it
   stays properly reactive to external width changes and no remount is
   needed here anymore. */
function CustomerInformationSidePanel({
  open,
  pinned,
  onClose,
  fullScreen,
  onToggleFullScreen,
  onMouseEnter,
  onMouseLeave,
  customerName,
  recordId,
  channels,
  width,
  containerWidth,
  onWidthChange,
  onResizeStateChange,
  onOpenHistoryConversation,
}: {
  open: boolean;
  pinned: boolean;
  /** Forwarded to `CustomerInformationPanelBody`'s `onOpenConversation` —
   *  see that prop's own doc comment. */
  onOpenHistoryConversation?: (entry: CustomerHistorySessionEntry) => void;
  /** Hides the panel WITHOUT unpinning it — rendered as a `PanelLeftClose`-
   *  iconed `PanelPinButton` in the header via `headerActions` below, NOT
   *  `SidePanel`'s own built-in pin button (that one has no way to
   *  override its default `Pin` icon, and this is a real close action now,
   *  not a pin/unpin toggle — see `handleSidePanelClose`'s own doc
   *  comment). `SidePanel`'s `onPinToggle` prop is deliberately left unset
   *  below so its internal default button doesn't also render. */
  onClose?: () => void;
  /** Whether the panel is currently overlaying the whole parent Container
   *  edge to edge — purely a rendering choice the caller makes (see this
   *  component's own doc comment above); only used here to pick the
   *  Maximize2/Minimize2 icon and label on the toggle button below. */
  fullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  customerName?: string;
  recordId: string;
  channels: TrackedChannel[];
  width: number;
  /** The parent Container's own currently measured width
   *  (`sidePanelContainerWidth`, already tracked for the narrow-container
   *  guard) — per explicit request, this panel must never render wider
   *  than that, docked or full-screen, so both `width` and `maxWidth`
   *  below are clamped against it. */
  containerWidth: number;
  onWidthChange: (width: number) => void;
  onResizeStateChange?: (isResizing: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const fields = useMemo(
    () => buildCustomerInfoFields(customerName, recordId, channels),
    [customerName, recordId, channels]
  );
  const latestInteraction = useMemo(
    () => buildLatestInteraction(customerName, recordId),
    [customerName, recordId]
  );
  const latestNote = useMemo(
    () => buildLatestNote(customerName, recordId),
    [customerName, recordId]
  );

  // Never render wider than the parent Container actually is, docked or
  // full-screen — see `containerWidth`'s own doc comment. `Math.max(0, ...)`
  // guards the pathological case of a container narrower than any usable
  // width at all; `SidePanel` itself already treats a 0/near-0 width
  // sanely (see its own `open ? currentWidth : 0` branches).
  const clampedWidth = Math.max(0, Math.min(width, containerWidth));
  const clampedMaxWidth = Math.max(0, Math.min(425, containerWidth));

  return (
    <SidePanel
      side="left"
      open={open}
      pinned={pinned}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      headerTitle={customerName ?? "Customer"}
      headerSubhead={recordId}
      // `PanelLeftClose`-iconed `PanelPinButton`, standing in for
      // `SidePanel`'s own default `Pin`-iconed one (suppressed by leaving
      // `onPinToggle` unset above) — same shared atom, just a different
      // icon/labels/handler, per explicit request. `pinned` is hardcoded
      // `false` here (NOT this panel's real `pinned` prop) — per explicit
      // follow-up request to drop the "currently active" highlighted
      // background `PanelPinButton` normally shows while pinned (see its
      // own `icon && pinned` branch): this is a momentary close action, not
      // a toggle with a persistent on/off state to reflect.
      headerActions={
        <>
          {/* Full-screen toggle — same `PanelPinButton` atom as the close
              button below (just another icon/label/handler over the shared
              "small icon button in a panel header" shape), per explicit
              request. `pinned={false}` here too, for the same reason the
              close button hardcodes it: this toggles between two distinct
              states (full-screen on/off) but isn't a pin, so it shouldn't
              wear `PanelPinButton`'s "currently active" highlight either. */}
          {onToggleFullScreen && (
            <PanelPinButton
              pinned={false}
              onToggle={onToggleFullScreen}
              icon={
                fullScreen ? (
                  <Minimize2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                ) : (
                  <Maximize2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                )
              }
              pinnedLabel={fullScreen ? "Exit Full Screen" : "Full Screen"}
              unpinnedLabel={fullScreen ? "Exit Full Screen" : "Full Screen"}
            />
          )}
          {onClose && (
            <PanelPinButton
              pinned={false}
              onToggle={onClose}
              icon={<PanelLeftClose className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}
              pinnedLabel="Close Customer Information"
              unpinnedLabel="Close Customer Information"
            />
          )}
        </>
      }
      // Plain default `"wide"` mode (no `overflowBreakpoint` override) —
      // same behavior as every other `TabList` in the app; see the
      // previous `InteriorPanel`-based version's identical reasoning for
      // why `"wide"` (not `"compact"`) is the deliberate choice here.
      headerTabs={
        <TabList className="px-4" overflowMenu>
          {CUSTOMER_PANEL_TABS.map((label, i) => (
            <Tab key={label} active={activeTab === i} onClick={() => setActiveTab(i)}>
              {label}
            </Tab>
          ))}
        </TabList>
      }
      width={clampedWidth}
      // Hides the drag-resize handle while full-screen — its width is
      // fully caller-controlled in that state (see this component's own
      // doc comment), not something the agent should be able to drag.
      resizable={!fullScreen}
      // 325 — explicit min-width for this panel's drag-resize handle, per
      // explicit request. `SidePanel`'s own default (`minWidth = 200`,
      // side-panel.tsx) is too narrow for this panel's own content
      // (field labels/values, Latest Interaction card, etc.) to stay
      // legible once dragged all the way down.
      minWidth={325}
      // 425 was `SidePanel`'s own implicit default max-width (never passed
      // explicitly before) — now clamped against `containerWidth` too, so
      // a manual drag can't resize past the parent Container's own current
      // width either (see `clampedMaxWidth`'s own doc comment above).
      maxWidth={clampedMaxWidth}
      onWidthChange={onWidthChange}
      onResizeStateChange={onResizeStateChange}
      // AI Input pinned to the bottom of the Overview tab only — `footer`
      // renders as a `shrink-0` sibling AFTER `PanelContent` (see
      // side-panel.tsx), so it's already outside the scroll region and
      // naturally stays fixed to the bottom without any extra CSS.
      // Temporarily hidden — see `SHOW_CUSTOMER_INFO_AI_INPUT`'s own doc
      // comment.
      footer={
        SHOW_CUSTOMER_INFO_AI_INPUT && activeTab === CUSTOMER_PANEL_TABS.indexOf("Overview") ? (
          <PanelFooter className="relative justify-start">
            {/* Soft fade instead of a hard border-top — same treatment as
                `InteractionComposer`'s transcript-to-composer transition
                (see that component's own comment above) — reads as the
                Overview content scrolling *under* the input rather than
                stopping at a line. Positioned outside this div's own box
                (negative top), overlaying the last ~32px of the scrollable
                content sitting directly above it. */}
            <div
              className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-b from-transparent to-lyra-bg-surface-container-subtle"
              aria-hidden="true"
            />
            <AIInput placeholder="Ask about this customer..." showAttach={false} className="w-full" />
          </PanelFooter>
        ) : undefined
      }
    >
      <CustomerInformationPanelBody
        activeTab={activeTab}
        customerName={customerName}
        fields={fields}
        latestInteraction={latestInteraction}
        latestNote={latestNote}
        recordId={recordId}
        channels={channels}
        onOpenConversation={onOpenHistoryConversation}
        onViewAllInteractions={() => setActiveTab(CUSTOMER_PANEL_TABS.indexOf("Interactions"))}
      />
    </SidePanel>
  );
}

/* ── CustomerRowInfoPanel ──
   Right-docked `InteriorPanel` opened by clicking a row in the Customers
   list view (`CustomersListView`'s `onRowClick`) — reuses the exact same
   "Customer Information" content (`CustomerInformationPanelBody`, and the
   `buildCustomerInfoFields`/`buildLatestInteraction`/`buildLatestNote`
   helpers that feed it) `CustomerInformationSidePanel` already shows for an
   active interaction, rather than a second hand-built copy of that same
   Overview/Detail/Directory content. Two real differences from that
   component, both per explicit request: docked RIGHT via `InteriorPanel`
   (that one is left-docked via `SidePanel`, for an unrelated reason — see
   its own doc comment), and no `footer`/`AIInput` at all — this panel is
   read-only reference info about whichever customer row was clicked, not
   the seat of an active conversation to ask the AI assistant about.

   `channels: []` passed to `buildCustomerInfoFields` below — that param
   only exists so a real *active* interaction's actually-open voice/email
   channel can override the synthesized phone/email fallback (see that
   function's own doc comment); a Customers-table row was never opened as
   an interaction, so there's no such channel to prefer over the
   synthesized one. */
function CustomerRowInfoPanel({
  row,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  onStartInteraction,
}: {
  /** The clicked customer row, or `null` when the panel is closed. Kept as
   *  the single source of both "is it open" (`open={row !== null}`) and
   *  "whose info to show" — same pattern the Dashboard's own queue
   *  drill-down `InteriorPanel` already uses (`selectedQueueId`) a bit
   *  further down this file. */
  row: CustomerListRecord | null;
  onClose: () => void;
  /** Step to the previous/next customer in `AgentNextGenPage`'s
   *  `customerSortedRows` — the exact same filtered+sorted order the table
   *  itself is currently showing (see that state's own doc comment) — not
   *  a separate, potentially-different order this panel would otherwise
   *  have to recompute on its own. */
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  onStartInteraction: (contact: CreateNewOutboundContact, channel: ChannelType, phone: string, skillId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState(0);

  // `InteriorPanel` forwards its own outer wrapper's ref (see interior-
  // panel.tsx — `ref={stableOuterRef}`, whose element's own inline `width`
  // style IS the panel's true current rendered width: 0 while closed,
  // otherwise its resized/default docked width — capped at `maxWidth`
  // (425 here, the default) — or "100%" of the main container while full-
  // screen). Observed here (rather than re-deriving `isFullScreen`/
  // `currentWidth`, both internal/uncontrolled state this component has no
  // access to) so the header's Add Channel/Refresh/Delete actions know
  // whether there's room to stay inline or need to collapse into a kebab —
  // same "measure the real box, don't guess" approach `TableToolbar` uses
  // for its own action-button collapse (table.tsx's `isWide`).
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(9999);
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    setPanelWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setPanelWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // 480px sits comfortably above `InteriorPanel`'s own 425px `maxWidth` (the
  // widest this panel can ever reach while normally docked/resized) and
  // comfortably below any realistic full-screen width (the main content
  // column, easily 800px+) — so this reliably reads "docked" as narrow and
  // "full screen" as wide, with no in-between flapping.
  const isNarrowActions = panelWidth < 480;

  // Back to the Overview tab every time a *different* row is opened — same
  // reasoning `CustomerChannelPopoverButton`'s own reset effects use
  // elsewhere in this file: reopening this panel on the previous row's
  // last-viewed tab would be a mildly confusing default. `row?.contactNumber`
  // (not `row` itself, a fresh object reference every render) is what this
  // actually keys off, so this doesn't also fire on every unrelated re-render
  // while the same row's panel is already open.
  useEffect(() => {
    if (row) setActiveTab(0);
  }, [row?.contactNumber]);

  const customerName = row ? `${row.firstName} ${row.lastName}` : undefined;
  const recordId = row?.contactNumber ?? "";
  const fields = useMemo(() => buildCustomerInfoFields(customerName, recordId, []), [customerName, recordId]);
  const latestInteraction = useMemo(() => buildLatestInteraction(customerName, recordId), [customerName, recordId]);
  const latestNote = useMemo(() => buildLatestNote(customerName, recordId), [customerName, recordId]);

  // Refresh/Delete — no `onClick` (no-op stubs), matching this exact
  // prototype's existing precedent for these two actions: the Customers
  // table's own toolbar `actionDefs` ("Refresh"/"Delete", a few hundred
  // lines up in `CustomersListView`) are the same bare label+icon with no
  // handler wired up yet.
  const recordActionItems: MenuEntry[] = [
    { id: "refresh", label: "Refresh Record", icon: <RefreshCw className="h-4 w-4" strokeWidth={1.5} />, disabled: !row },
    { id: "delete", label: "Delete Record", icon: <Trash2 className="h-4 w-4" strokeWidth={1.5} />, disabled: !row, destructive: true },
  ];

  return (
    <InteriorPanel
      ref={panelRef}
      side="right"
      open={row !== null}
      onClose={onClose}
      // Lets the agent manually expand to full screen via `InteriorPanel`'s
      // own built-in toggle button (rendered next to the close button in
      // its header, self-contained `isFullScreen` state — see interior-
      // panel.tsx's own doc comment on `allowFullScreen`) — per explicit
      // request: opens as a normal docked flyout by default, with full
      // screen as an option, not the default.
      allowFullScreen
      headerTitle={customerName ?? "Customer"}
      headerSubhead={recordId}
      // Sequential prev/next through the same filtered+sorted order the
      // Customers table itself is showing (`customerSortedRows`, lifted to
      // `AgentNextGenPage` — see that state's own doc comment). Plain
      // `ActionIconButton`s, not `PanelPinButton`: these are momentary
      // one-shot actions with no on/off state to reflect, unlike the
      // pin/full-screen/close buttons elsewhere that reuse `PanelPinButton`.
      // Rendered via `headerActions` so they appear BEFORE `InteriorPanel`'s
      // own automatic full-screen-toggle/close buttons (its `actions={<>
      // {headerActions}{fullScreenToggle}</>}` composition order). Ordered
      // AFTER Refresh/Delete (the "trash icon") rather than leading the
      // cluster, per explicit request.
      headerActions={
        <>
          {/* Add Channel stays its own always-visible button here regardless
              of full-screen state — it opens a whole "Select Channel/
              Address/Skill" form (`CustomerChannelPicker`), which doesn't
              belong as a plain row inside the Refresh/Delete kebab below;
              only true single-click actions collapse there. Previously
              floated into `headerTitleBadge` (next to the customer name)
              while full-screen instead of sitting here — reverted per
              explicit follow-up request to keep it with the rest of the
              action cluster in every mode; that floated placement was also
              what forced the title+subhead box taller than its plain-text
              case (see `container-header.tsx`'s own `min-h-10` fix), so
              this also removes the one real consumer that ever needed that
              extra headroom. */}
          <CustomerAddChannelButton row={row} onStartInteraction={onStartInteraction} />
          {isNarrowActions ? (
            // `KebabMenuButton`'s own default trigger is a fixed h-6 w-6
            // (24px) — visibly smaller than every other icon button in
            // this row (Add Channel/prev/next/the built-in fullscreen-
            // toggle+close, all 32px+). `className` bumps it up to h-8 w-8
            // (32px, matching prev/next's own `icon-md` and the built-in
            // toggle/close buttons) and the glyph up to the same h-4 w-4
            // every neighboring icon here uses, per explicit request.
            <KebabMenuButton
              items={recordActionItems}
              ariaLabel="Record actions"
              className="h-8 w-8"
              icon={<MoreVertical className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}
            />
          ) : (
            <>
              <ActionIconButton title="Refresh record" disabled={!row}>
                <RefreshCw className="h-4 w-4" />
              </ActionIconButton>
              <ActionIconButton title="Delete record" disabled={!row}>
                <Trash2 className="h-4 w-4" />
              </ActionIconButton>
            </>
          )}
          {/* Back in this same header-actions row regardless of width (per
              explicit follow-up request reverting the earlier "own row
              below the title" layout) — but as bordered `Button
              variant="outline"` icon buttons rather than the plain ghost
              `ActionIconButton`s Refresh/Delete/Add Channel use above, so
              they still read as visually distinct from that cluster even
              while sharing its row. `size="icon-md"` (32px, one step below
              `ActionIconButton`'s own default "icon-lg"/36px — see
              `ACTION_ICON_BUTTON_SIZE_MAP` in actions.tsx) per explicit
              follow-up request to size these down a notch from the rest
              of the cluster. */}
          <Button variant="outline" size="icon-md" title="Previous customer" disabled={!hasPrevious} onClick={onPrevious}>
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </Button>
          <Button variant="outline" size="icon-md" title="Next customer" disabled={!hasNext} onClick={onNext}>
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </Button>
        </>
      }
      headerTabs={
        <TabList className="px-4" overflowMenu>
          {CUSTOMER_PANEL_TABS.map((label, i) => (
            <Tab key={label} active={activeTab === i} onClick={() => setActiveTab(i)}>
              {label}
            </Tab>
          ))}
        </TabList>
      }
    >
      <CustomerInformationPanelBody
        activeTab={activeTab}
        customerName={customerName}
        fields={fields}
        latestInteraction={latestInteraction}
        latestNote={latestNote}
        onViewAllInteractions={() => setActiveTab(CUSTOMER_PANEL_TABS.indexOf("Interactions"))}
      />
    </InteriorPanel>
  );
}

/* ── AgentNextGenPage ── */

type Page = "agent-workspace" | "agent" | "outbound" | "login";

// Shared default width for the single app-header panel (Search/Customers/
// Accounts/Tickets/WEM/Screen Pop/Agent Chat/Schedule/Notifications) —
// renamed from `AI_PANEL_DEFAULT_WIDTH` now that Ask AI (its original sole
// occupant, back when each of these was its own independently-sized
// `Draggable`) has been removed from this app.
const SHARED_PANEL_DEFAULT_WIDTH = 360;

// Screen Pop — visual mock of an external app's login screen, shown in
// place of a real embed. Real screen-pop targets like Salesforce/Zendesk
// send clickjack-protection headers (X-Frame-Options / CSP frame-ancestors)
// on their login and app pages specifically to refuse cross-origin
// iframing — that protection lives on THEIR side and can't be relaxed from
// a consumer/embedding page no matter how it's built (see
// support.zendesk.com's own "Embedding Zendesk into an iframe is not
// allowed" article, and the equivalent Salesforce clickjack protection on
// login.salesforce.com). So rather than a broken/blank iframe, each app
// gets a hand-rolled, obviously-fake login card instead — every field is
// `disabled` and the button/links are non-interactive, and the badge under
// the card spells out that it's a mock, so it can never be mistaken for a
// real login prompt (or an actual authentication surface asking for real
// credentials).
function MockLoginCard({
  appName,
  accent,
  logo,
  usernameLabel = "Username",
  usernamePlaceholder = "username@company.com",
  buttonLabel = "Log In",
  footerLink = "Forgot Your Password?",
  rememberMe = true,
}: {
  appName: string;
  accent: string;
  logo: React.ReactNode;
  usernameLabel?: string;
  usernamePlaceholder?: string;
  buttonLabel?: string;
  footerLink?: string;
  rememberMe?: boolean;
}) {
  return (
    <div className="overflow-y-auto flex-1 flex flex-col items-center bg-[#f4f6f9] px-4 pt-10 pb-6 gap-4">
      <div className="w-full max-w-[280px] bg-white rounded-lg shadow-md border border-[#e5e5e5] flex flex-col items-center px-7 py-8">
        {logo}
        <div className="flex flex-col gap-1 w-full mb-3 mt-1">
          <label className="text-xs text-[#3e3e3c]">{usernameLabel}</label>
          <input
            type="text"
            disabled
            placeholder={usernamePlaceholder}
            className="border border-[#c9c9c9] rounded px-2.5 py-2 text-sm text-[#3e3e3c] placeholder:text-[#aeaeae] bg-white disabled:opacity-100 disabled:cursor-not-allowed focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1 w-full mb-3">
          <label className="text-xs text-[#3e3e3c]">Password</label>
          <input
            type="password"
            disabled
            placeholder="••••••••"
            className="border border-[#c9c9c9] rounded px-2.5 py-2 text-sm text-[#3e3e3c] bg-white disabled:opacity-100 disabled:cursor-not-allowed focus:outline-none"
          />
        </div>
        {rememberMe && (
          <label className="flex items-center gap-2 text-xs text-[#3e3e3c] w-full mb-4">
            <input type="checkbox" disabled defaultChecked className="disabled:cursor-not-allowed" />
            Remember me
          </label>
        )}
        <button
          type="button"
          disabled
          style={{ backgroundColor: accent }}
          className="w-full text-white text-sm font-medium rounded px-4 py-2 mb-3 disabled:opacity-100 cursor-not-allowed"
        >
          {buttonLabel}
        </button>
        <a className="text-xs pointer-events-none" style={{ color: accent }}>{footerLink}</a>
      </div>
      <span className="lyra-body-xs text-lyra-fg-disabled bg-lyra-bg-surface-container-subtle border border-lyra-border-subtle rounded-full px-2.5 py-1">
        Mock preview — not a live {appName} session
      </span>
    </div>
  );
}

// Screen Pop — external apps an agent can pop the current contact/record
// into. Dummy list; wiring an actual screen-pop integration per app is out
// of scope for now.
const SCREEN_POP_APPS: SelectOption[] = [
  { value: "salesforce",         label: "Salesforce" },
  { value: "zendesk",            label: "Zendesk" },
  { value: "servicenow",         label: "ServiceNow" },
  { value: "hubspot",            label: "HubSpot" },
  { value: "freshdesk",          label: "Freshdesk" },
  { value: "script",             label: "Script" },
  { value: "launch",             label: "Launch" },
  { value: "custom-workspace",   label: "Custom Workspace" },
];

export function AgentNextGenPage({
  showPageHeader = false,
  showPanelToggle = false,
  showInteriorPanel = true,
  onNavigate,
  initialInteraction,
  sidePanelToggleLabel,
}: {
  showPageHeader?: boolean;
  showPanelToggle?: boolean;
  showInteriorPanel?: boolean;
  onNavigate?: (page: Page) => void;
  /**
   * Seeds `interactions`/`activeInteractionId` with an already-active call
   * instead of starting empty — mirrors lyra-ui's `AgentNextGenTemplate`
   * "Active Interaction" story prop of the same name (see that story's own
   * doc comment for the full rationale). Not passed anywhere in this app
   * today — kept as an opt-in capability so this component stays in sync
   * with the canonical template's shape, not to change default behavior.
   */
  initialInteraction?: ActiveInteraction;
  /**
   * Overrides the record-header toggle button's visible label for the
   * Customer Information `InteriorPanel` — mirrors lyra-ui's
   * `AgentNextGenTemplate` prop of the same name. Defaults to "Customer
   * Information" here; pass a different string to override it.
   */
  sidePanelToggleLabel?: string;
}) {
  // Closed by default on load (not gated on `initialInteraction` — the
  // rail should be collapsed the first time this page renders regardless
  // of whether the agent is seeded mid-call). `handleResize`'s narrow-
  // viewport auto-collapse (a few lines down) still applies after that
  // first paint.
  const [navOpen, setNavOpen] = useState(false);
  // No interactions exist until the agent launches one from the CreateNew
  // menu (Start Interaction / quick dial) — see handleStartCall/handleQuick
  // Dial below. Click any resulting InteractionNavItem card to make it the
  // active one. `initialInteraction` (see above) seeds this instead, for
  // callers that want to start already mid-call.
  const [interactions, setInteractions] = useState<ActiveInteraction[]>(
    () => (initialInteraction ? [initialInteraction] : [])
  );
  // Real "Today" Contact History rows — starts empty (nothing to show on
  // login, there's no backend here to have loaded anything from) and grows
  // as the agent actually dismisses whole assignments (`handleDismissInteraction`
  // below, via `buildDismissedContactHistoryEntry`) — see `ContactHistoryCard`'s
  // own doc comment for the full picture.
  const [dismissedContactHistory, setDismissedContactHistory] = useState<ContactHistoryEntry[]>([]);
  // Toast fired by both `handleDismissInteraction` (whole assignment) and
  // `handleDismissChannel` (one of several open channels) below, via
  // `fireDismissToast` — `useToast` just tracks the list; `<ToastContainer>`
  // actually renders it, near the end of this component's JSX.
  const { toasts, addToast, dismissToast, dismissAllToasts } = useToast();
  // Shared by both dismiss paths so the toast's own shape only lives in one
  // place. `title` is just "Success" — matching `Toast`'s own convention
  // (see toast.tsx's Storybook demos: a short status word as the bold
  // title, the specifics as body copy underneath) — with the
  // "{Name} {Record ID} Successfully Dismissed" text moved into `message`
  // (the body) instead of previously being crammed into `title` itself.
  // `customerName` falls back to "Customer" the same way the main
  // interaction header does (see `mainRegionTabLabel`) — an ad-hoc (typed
  // number/email, no matched customer) interaction still has *some* value
  // here (the raw address itself, see `customerIdentified`'s own doc
  // comment in lyra-ui's interaction-nav-item.tsx), so this fallback is
  // just defensive, not the common case.
  const fireDismissToast = (interaction: Pick<ActiveInteraction, "customerName" | "recordId">) => {
    addToast({
      variant: "success",
      title: "Success",
      message: `${interaction.customerName ?? "Customer"} ${interaction.recordId} Successfully Dismissed`,
      duration: 4000,
    });
  };
  // Fired by `AgentProfile`'s own `onAgentLegStatusChange` (agent-profile.tsx)
  // once the agent leg actually finishes connecting/disconnecting — never
  // for the in-between "connecting" state, and never on initial mount (see
  // that prop's own doc comment). `success`/`warning` rather than always
  // `success` — landing back on "disconnected" isn't a positive event the
  // way finishing a connect is, same reasoning the SLA banner elsewhere in
  // this file reserves warning/critical for something actually needing
  // attention rather than defaulting every toast to green.
  const fireAgentLegStatusToast = (agentLegConnectionStatus: "disconnected" | "connected") => {
    addToast({
      variant: agentLegConnectionStatus === "connected" ? "success" : "warning",
      title: agentLegConnectionStatus === "connected" ? "Agent Leg Connected" : "Agent Leg Disconnected",
      message:
        agentLegConnectionStatus === "connected"
          ? "Your agent leg is now connected."
          : "Your agent leg has been disconnected.",
      duration: 4000,
    });
  };
  // "Outcome" popover (`ChannelRow`'s own `outcome` prop, channel-row.tsx) —
  // logs Resolution/Tags/Disposition code/Summary for whichever channel's
  // Outcome button was clicked. Only one can be open across the entire left
  // nav at a time, same "one popover at a time" convention the session-
  // status popover already uses (`statusMenuOpenId`) — identified by
  // `${interactionId}:${channelKey}` since a channel's own `id`/`type` alone
  // isn't unique across DIFFERENT interactions, only within one card.
  // Note: no `resolution` field here — unlike Tags/Disposition/Summary
  // (which really are per-draft scratch state with no backend to persist
  // to), Resolution now reads/writes that specific channel's own entry in
  // `interaction.channelStatuses` directly (see `channels` below), the same
  // already-lifted piece of state the session-status pill itself reads/
  // writes via `handleInteractionStatusChange` — so there's nothing left
  // for a local draft to own for that field.
  const [outcomeDraftKey, setOutcomeDraftKey] = useState<string | null>(null);
  // Which of the three triggers actually opened the popover currently named
  // by `outcomeDraftKey` — the LeftNav `ChannelRow` Outcome button, the
  // transcript's own `TranscriptSessionSeparator` Outcome button, and the
  // record-header `ChannelTab`'s kebab "Outcome" entry all key off the exact
  // same `${interactionId}:${channelKey}` value for a given channel (so all
  // three stay in sync on the same shared draft), but that meant clicking
  // any one satisfied every `outcomeDraftKey === key` check and popped open
  // more than one popover at once (reported via screenshot, back when there
  // were only two triggers). Each trigger's own `open` now additionally
  // requires this to match its own source, so only the one actually clicked
  // shows as open — the underlying draft (tags/disposition/summary) still
  // stays the same shared state either way.
  const [outcomeDraftSource, setOutcomeDraftSource] = useState<"leftnav" | "transcript" | "tab" | null>(null);
  const buildDefaultOutcomeDraft = () => ({
    tags: ["Technical", "Account"],
    dispositionCode: OUTCOME_DISPOSITION_OPTIONS[0].value,
    summary: OUTCOME_DEFAULT_SUMMARY,
  });
  const [outcomeDraft, setOutcomeDraft] = useState(buildDefaultOutcomeDraft);
  const handleOutcomeOpenChange = (key: string, open: boolean, source: "leftnav" | "transcript" | "tab") => {
    if (open) {
      // Reset to a fresh draft every time a (possibly different) channel's
      // popover opens — no real backend here to load a previously-saved
      // outcome from, so every open starts from the same plausible example
      // rather than carrying over whatever the last channel's draft had.
      setOutcomeDraft(buildDefaultOutcomeDraft());
      setOutcomeDraftKey(key);
      setOutcomeDraftSource(source);
    } else if (outcomeDraftKey === key && outcomeDraftSource === source) {
      setOutcomeDraftKey(null);
      setOutcomeDraftSource(null);
    }
  };
  // "Approve & Save"/"Cancel" both just close the popover — there's no real
  // backend here to persist an outcome to, same no-op placeholder state
  // every other not-yet-wired action in this file starts from (e.g. Consult
  // / Transfer — see rule #30's own note in CLAUDE.md).
  const handleOutcomeSave = () => {
    setOutcomeDraftKey(null);
    setOutcomeDraftSource(null);
  };
  const handleOutcomeCancel = () => {
    setOutcomeDraftKey(null);
    setOutcomeDraftSource(null);
  };
  const contactHistoryByRange = useMemo(
    () => buildContactHistoryByRange(dismissedContactHistory),
    [dismissedContactHistory]
  );
  // Drives `AssignmentsSortButton`'s `RadioGroup` — "Last Updated" (default,
  // matching a typical inbox's own default order) or "Start Date". Actual
  // ordering happens where the cards render (`sortAssignments`), leaving
  // `interactions` itself in insertion order for everything else that reads
  // it (`activeInteraction`, dismiss/redial handlers, etc.).
  const [assignmentSort, setAssignmentSort] = useState<AssignmentSortValue>("lastUpdated");
  // Drives `AssignmentsExpandCollapseAllButton` — see that component's own
  // doc comment for why this is a one-shot "which direction does the NEXT
  // click bulk-apply" toggle (`channelsAllExpanded`) plus a version nonce
  // (`channelsExpandedOverrideVersion`, bumped on every click) rather than
  // a plain controlled boolean threaded straight into every card: each
  // `InteractionNavItem`'s own channel list still needs to keep toggling
  // independently after a bulk action, not stay permanently locked to this
  // one shared value. Both passed down as one `channelsExpandedOverride`
  // object (interaction-nav-item.tsx) at each card's own call site below.
  const [channelsAllExpanded, setChannelsAllExpanded] = useState(true);
  const [channelsExpandedOverrideVersion, setChannelsExpandedOverrideVersion] = useState(0);
  const handleToggleAllChannelsExpanded = () => {
    setChannelsAllExpanded((v) => !v);
    setChannelsExpandedOverrideVersion((v) => v + 1);
  };
  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(
    () => initialInteraction?.id ?? null
  );
  // Customers table's "+ Filter" state, lifted up here (not local to
  // `CustomersListView`) — that component sits inside the Desk dashboard's
  // own branch of the `showSettings ? ... : activeInteraction ? ... : (
  // dashboard )` conditional a few thousand lines down, which unmounts the
  // WHOLE dashboard (including `CustomersListView`) the moment the agent
  // starts/opens an interaction or Settings, not just when switching desk
  // tabs. Keeping `CustomersListView` mounted-but-hidden across desk-tab
  // switches (see its own render call site) only covers THAT narrower case;
  // it still unmounts for real here, which would reset any state that
  // lived in its own `useState`. Living up here instead, on a component
  // that's never unmounted for the lifetime of this page, is what actually
  // makes the filters survive navigating away to an interaction/Settings
  // and back to Customers, not just switching between desk tabs.
  const [customerAddedFilterKeys, setCustomerAddedFilterKeys] = useState<string[]>([]);
  const [customerFilterValues, setCustomerFilterValues] = useState<Record<string, string[]>>({});
  // Which Customers-table row (if any) has its Customer Information panel
  // open — also lifted up here rather than local to `CustomersListView`,
  // since `CustomerRowInfoPanel` (the panel itself) renders as a SIBLING of
  // `CustomersListView`, docked to its right, not nested inside it; two
  // sibling components can only share state through a common parent. Not
  // reset to `null` on unmount either way, for the same "survives
  // navigating to an interaction/Settings and back" reason the filter
  // state above lives here — though `CustomerRowInfoPanel` itself is only
  // ever rendered while the Customers tab is active, so in practice this
  // only matters for the "still open on that row" case, not the panel
  // literally staying visible over other tabs.
  const [selectedCustomerRow, setSelectedCustomerRow] = useState<CustomerListRecord | null>(null);
  // Search/sort — also lifted up here, alongside the filter state above,
  // for a second reason beyond survival-across-unmount: `CustomerRowInfoPanel`'s
  // next/back chevrons (`handleCustomerRowNav` below) need to step through
  // the *exact same* filtered+sorted order the table itself is currently
  // showing, not the raw `CUSTOMER_LIST_RECORDS` order — and since that
  // panel is a sibling of `CustomersListView`, not a child of it, the only
  // way both can agree on "the current order" is computing it once here
  // (`customerSortedRows` below) and having `CustomersListView` render
  // *that*, instead of each independently deriving its own possibly-
  // different-by-a-render-cycle copy.
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerSortKey, setCustomerSortKey] = useState<CustomerColKey | null>(null);
  const [customerSortDir, setCustomerSortDir] = useState<SortDirection>(null);
  const handleCustomerSort = (key: CustomerColKey) => {
    if (customerSortKey === key) {
      const next = nextCustomerSortDirection(customerSortDir);
      setCustomerSortDir(next);
      if (next === null) setCustomerSortKey(null);
    } else {
      setCustomerSortKey(key);
      setCustomerSortDir("asc");
    }
  };
  // Same filter/search/sort logic `CustomersListView` used to compute this
  // itself locally — moved up here so `CustomerRowInfoPanel`'s chevrons and
  // `CustomersListView`'s own render both read the one shared result.
  const customerSortedRows = useMemo(() => {
    const filtered = CUSTOMER_LIST_RECORDS.filter((row) => {
      if (customerSearchQuery) {
        const q = customerSearchQuery.toLowerCase();
        const haystack = `${row.firstName} ${row.lastName} ${row.contactNumber} ${row.emailAddress}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      for (const key of customerAddedFilterKeys) {
        const selected = customerFilterValues[key];
        if (selected?.length && !selected.includes(row[key as CustomerFilterKey])) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (!customerSortKey || !customerSortDir) return 0;
      const aVal = String(a[customerSortKey]).toLowerCase();
      const bVal = String(b[customerSortKey]).toLowerCase();
      if (aVal < bVal) return customerSortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return customerSortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [customerSearchQuery, customerAddedFilterKeys, customerFilterValues, customerSortKey, customerSortDir]);
  // Index of the row currently open in `CustomerRowInfoPanel`, within that
  // same shared order — `-1` (nothing selected, or the selected row got
  // filtered out from under the panel by a search/filter change) disables
  // both chevrons via `hasPrevious`/`hasNext` below rather than throwing.
  const selectedCustomerIndex = selectedCustomerRow
    ? customerSortedRows.findIndex((r) => r.contactNumber === selectedCustomerRow.contactNumber)
    : -1;
  const handleCustomerRowNav = (direction: 1 | -1) => {
    if (selectedCustomerIndex === -1) return;
    const nextIndex = selectedCustomerIndex + direction;
    if (nextIndex < 0 || nextIndex >= customerSortedRows.length) return;
    setSelectedCustomerRow(customerSortedRows[nextIndex]);
  };
  // Drives the main content area: whenever an interaction is active, the
  // Desk dashboard is replaced by that interaction's blank detail page (see
  // the PageHeader "record header" mode below) — starting/quick-dialing/
  // redialing a new assignment always sets this, so the screen switches
  // over automatically the moment one is added.
  const activeInteraction = interactions.find((i) => i.id === activeInteractionId) ?? null;

  /* A past session's conversation opened as a TAB in the interaction space
     (record header), via the Customer Information panel's Overview "Open
     Conversation" deep link. One at a time; opening another replaces it.
     `active` mirrors the channel tabs' selection model: clicking a channel
     tab deactivates this tab (but keeps it in the strip); clicking it
     re-activates it; its kebab's "Close Tab" removes it. Cleared when
     switching to a DIFFERENT interaction (see `switchActiveInteraction`). */
  const [historyConversationTab, setHistoryConversationTab] = useState<{
    interactionId: string;
    entry: CustomerHistorySessionEntry;
    active: boolean;
  } | null>(null);
  const historyConversationForActive =
    activeInteraction && historyConversationTab && historyConversationTab.interactionId === activeInteraction.id
      ? historyConversationTab
      : null;
  const isHistoryConversationView = Boolean(historyConversationForActive?.active);
  // Which channel type `InteractionTranscript` (below) should render content
  // for — the same "current" channel the record header's own
  // `ChannelToggleGroup` highlights (see its `active={... === key}` a few
  // hundred lines down) and `InteractionNavItem`'s `currentChannelKey` both
  // derive from, recomputed here rather than threading a shared value down
  // from either of those since neither is an ancestor of
  // `InteractionTranscript` in the tree. Falls back to the most recently
  // added channel when nothing's been explicitly selected yet, same as
  // everywhere else this "current channel" concept appears.
  const activeChannel = activeInteraction
    ? activeInteraction.channels.find(
        (c) =>
          (c.id ?? c.type) ===
          (activeInteraction.currentChannelId ?? activeInteraction.channels[activeInteraction.channels.length - 1]?.id)
      )
    : undefined;
  const activeChannelType = activeChannel?.type;
  // The bare channel-key half of `activeChannelOutcomeKey` below — used on
  // its own to resolve this channel's own entry out of
  // `ActiveInteraction.liveMessages` (see that field's own doc comment for
  // why it's keyed per-channel) at the `InteractionTranscript` render call
  // site further down, so a freshly opened/different channel never shows
  // another channel's own live messages.
  const activeChannelKey = activeChannel?.id ?? activeChannel?.type ?? "channel";
  // Same `${interactionId}:${channelKey}` scheme the LeftNav's own
  // `ChannelRow` Outcome button keys `outcomeDraftKey` with (a few hundred
  // lines down) — computed here too so `InteractionTranscript`'s current-
  // session Outcome popover (`TranscriptSessionSeparator`) reads/writes the
  // exact same shared draft for this channel, not a second, disconnected
  // one. `activeInteraction`-less renders (Desk dashboard) never actually
  // use this — it's just always in scope for the JSX below.
  const activeChannelOutcomeKey = activeInteraction
    ? `${activeInteraction.id}:${activeChannel?.id ?? activeChannel?.type ?? "channel"}`
    : undefined;
  // This active channel's own status (see `ActiveInteraction.channelStatuses`'s
  // doc comment for why status has to be tracked per-channel rather than as
  // one flat interaction-wide value) — undefined until the agent actually
  // assigns one for THIS channel specifically. Drives both the transcript's
  // status pill/Outcome "Resolution" field and whether the composer shows
  // (hidden once this specific channel reads "Closed" — see the render call
  // site below) without touching any sibling channel's own status.
  const activeChannelStatus = activeChannel ? activeInteraction?.channelStatuses?.[activeChannel.id] : undefined;
  // Shared clock powering every open channel's live "MM:SS since it
  // started" elapsed display — independent of `elapsedSeconds` below, which
  // is the agent's own status timer and resets on status change.
  const [clockTick, setClockTick] = useState(0);
  // Mirrors `clockTick` for code that needs the CURRENT tick inside a
  // callback that itself fires later (`handleSendMessage`'s simulated
  // customer-reply `setTimeout`, 2.5s after the call that scheduled it) —
  // reading the `clockTick` state variable there would close over its
  // stale value from scheduling time, not whatever it's actually
  // incremented to by the time that timeout fires. Updated in the same
  // place `clockTick` itself is, so the two can't drift apart.
  const clockTickRef = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      setClockTick((t) => {
        clockTickRef.current = t + 1;
        return t + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);
  // Same "how urgently is this channel awaiting a reply" signal the record-
  // header tab bar's own `<ChannelTab awaitingSeverity=...>` call site
  // computes per-channel (render return, further down) — resolved once
  // more, here, for the ACTIVE channel specifically so the "nearing SLA
  // breach"/"breached SLA" `InlineNotification` banner (also in the render
  // return, directly above the transcript) reflects the exact same tier as
  // that channel's own tab, rather than re-deriving it a third time at the
  // banner's own JSX. `undefined` whenever the active channel isn't
  // awaiting at all (mirrors `awaitingSeverity` being omitted for that case
  // everywhere else) — that's what tells the banner to render nothing.
  const activeChannelAwaitingSeverity: "success" | "warning" | "critical" | undefined = activeChannel?.awaitingResponse
    ? getAwaitingSeverity(clockTick - (activeChannel.lastCustomerMessageTick ?? activeChannel.startTick))
    : undefined;
  const [activeDeskTab, setActiveDeskTab] = useState<"home" | "customers" | "accounts" | "tickets" | "wem">("home");
  // Desk-tab display order — separate from `activeDeskTab` above (which
  // one is selected), so the user can click-and-drag reorder the Home/
  // Customers/Accounts/Tickets/WEM tabs (via `TabList`'s `reorderable`/
  // `onReorder`, tabs.tsx) without that affecting which tab is currently
  // active. `TabList` doesn't own this order itself — it only reports the
  // result of a drag — so this array is the actual source of truth the
  // tab row below is rendered from.
  const [deskTabOrder, setDeskTabOrder] = useState<DeskTabKey[]>([
    "home",
    "customers",
    "accounts",
    "tickets",
    "wem",
  ]);
  /* Settings — a third top-level view alongside Desk/interaction-record,
     shown in place of both in the content column when the Settings rail
     item is clicked. Mutually exclusive with an active interaction: opening
     one closes the other. Interaction → Settings is enforced below via an
     effect (selecting/starting any interaction always takes over the
     content column, same "one primary view at a time" rule Desk already
     follows per `buildNavItems`'s `active: !hasActiveInteraction`); Settings
     → interaction is enforced the other way, directly in the `LeftNav`
     `onSettingsClick` handler, since there's only that one call site
     (unlike `setActiveInteractionId`, which has several). */
  const [showSettings, setShowSettings] = useState(false);

  // Effect rather than touching every `setActiveInteractionId` call site
  // individually.
  useEffect(() => {
    if (activeInteractionId) setShowSettings(false);
  }, [activeInteractionId]);
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("unavailable");
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(
    () => document.documentElement.getAttribute("data-theme") === "dark"
  );

  const handleDarkModeToggle = () => {
    setDarkMode((prev) => {
      const next = !prev;
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
      return next;
    });
  };

  const appMenuGroups = buildAppMenuGroups((page) => {
    setAppMenuOpen(false);
    onNavigate?.(page);
  });

  /* Panel animation state machine — see AgentNextGenTemplate.stories.tsx for full comment */
  type PanelState = "closed" | "open" | "closing";

  /* ── Single-container app-header panel ──
     Screen Pop/Agent Chat/Schedule/Notifications/Ask AI used to each be
     an independently open/mounted/positioned/sized `Draggable` (five full
     copies of this state, plus a `dockPanelExclusively` helper enforcing
     "only one of the five may be docked at once"). Per request ("Multiple
     Containers: false" — see lyra-ui's `Draggable.stories.tsx`
     `MultiplePanelsSingleDock` story and its own "Multiple Containers"
     control), there is now only ONE physical container — clicking a
     different button just swaps `activePanelKey` (and therefore which
     content shows) without the container itself resizing, repositioning,
     or replaying its open/close animation. That also makes the old
     "only one may be docked" rule trivially true (there's only ever one
     container to dock) instead of something to actively enforce.

     Notifications' actual content (previously only reachable via the
     standalone `AgentNotifications` component, which bakes its own header
     AND its own `Draggable` wrapper together) now comes from
     `useAgentNotificationsContent` (lyra-ui) — the same hook that
     component calls internally, so this is a second CALLER of that
     content, not a second, drifting copy of it. See lyra-ui's own "Single
     Container - Real Content" Storybook demo (`Draggable.stories.tsx`) for
     this exact pattern in isolation (that demo also includes Ask AI's
     content via `useAiPanelContent` — dropped from this app per request,
     but left in the shared demo since it's still a real, valid caller of
     that hook). */
  type PanelKey =
    | "notif"
    | "conversations"
    | "schedule"
    | "screenpop"
    | "customers"
    | "accounts"
    | "tickets"
    | "wem"
    | "search";

  const [panelOpen,      setPanelOpen]      = useState(false);
  const [panelMounted,   setPanelMounted]   = useState(false);
  const [panelState,     setPanelState]     = useState<PanelState>("closed");
  const [activePanelKey, setActivePanelKey] = useState<PanelKey | null>(null);
  // Defaults to "docked" per an earlier request — the AppHeader icon
  // buttons should each open the full layout-pushing docked panel
  // immediately on first click, rather than a transient floating popover.
  // The actual dock-on-open happens explicitly in `handlePanelButtonClick`
  // below (only when transitioning fully closed -> open) — "float" is
  // still reachable afterward (dragging the panel off the edge, or just
  // switching which button is active while already open leaves whatever
  // variant it was already in alone).
  const [panelVariant,    setPanelVariant]    = useState<DraggableVariant>("docked");
  const [panelWidth,      setPanelWidth]      = useState(SHARED_PANEL_DEFAULT_WIDTH);
  const [panelHeight,     setPanelHeight]     = useState(860);
  const [panelIsResizing, setPanelIsResizing] = useState(false);
  // Fullscreen toggle for the shared panel (AI/Notifications/Apps/
  // Calendar/etc.) — distinct from `panelVariant`'s "float"/"docked" (which
  // is `Draggable`'s own concept and stays within/beside the interaction
  // container). This instead expands the panel to fill the ENTIRE main
  // content container (`containerRef` — everything right of LeftNav, below
  // AppHeader; the same box the Customer Information panel/main interaction
  // `Container` live in), covering that area only — LeftNav and AppHeader
  // stay visible, unlike a real page-covering modal. Implemented as a
  // separate `position: absolute; inset: 0` overlay (`sharedPanelFullScreenOverlay`
  // below), positioned against `containerRef` (which is already `relative`)
  // rather than the viewport, reusing the same header/body content but
  // rendered independently of `Draggable` entirely — `Draggable` has no
  // fullscreen concept of its own (only float/docked), and coercing its
  // "float" variant into spanning the container would mean fighting its
  // internal width/height/offset state and its own
  // `clampOffsetIntoViewport` containment logic (viewport-based, not
  // container-based, and not easily repurposed). Whichever of
  // `panelVariant`'s two states was active before entering fullscreen is
  // preserved (untouched) and simply resumes when fullscreen exits.
  const [panelFullScreen, setPanelFullScreen] = useState(false);
  // Keeps `sharedPanelFullScreenOverlay` mounted for a beat after
  // `panelFullScreen` flips back to false, so the exit transition (see
  // that overlay's own doc comment, and `fullScreenAnimTimer` below) can
  // actually play instead of the overlay disappearing instantly — same
  // "state machine outlives the boolean it's animating" shape as
  // `panelState`/`panelOpen` above, just scoped to fullscreen alone
  // rather than the whole panel's mount lifecycle.
  const [fullScreenRendered, setFullScreenRendered] = useState(false);
  // The actual opacity/scale target for the fullscreen overlay's CSS
  // transition — deliberately a SEPARATE flag from `panelFullScreen`
  // itself. A freshly-mounted DOM node that starts life with `opacity: 1`
  // has no earlier frame at `opacity: 0` for the browser to transition
  // FROM, so it would just pop in instantly with no visible animation.
  // Mounting at the "hidden" values first, then flipping this to `true`
  // one frame later (`requestAnimationFrame`, see the effect below) gives
  // the browser a real prior frame to interpolate from. Exiting doesn't
  // need this two-step dance — it's already mounted/visible, so setting
  // this straight to `false` immediately starts the fade/scale-out.
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  // Which team is picked in the "New Outbound" Teams group's own "Choose
  // team" sub-picker (see `outboundConfig` below, and `OUTBOUND_TEAM_
  // MEMBERS`/`CreateNewOutboundGroup.subFilter`'s own doc comments) — ""
  // means no team picked yet. Lives here (not inside create-new.tsx) since
  // that component has no concept of "team," only of a generic per-group
  // `subFilter` control it renders and reports picks from.
  const [selectedOutboundTeamId, setSelectedOutboundTeamId] = useState("");
  // Exit the shared panel's fullscreen whenever the agent navigates away
  // from the current main-content context — clicking a different
  // assignment card, Home, or Settings (and starting/selecting any new
  // interaction, e.g. via CreateNew/Outbound) all funnel through
  // `activeInteractionId`/`showSettings` changing, so one effect here
  // covers every one of those call sites instead of threading
  // `setPanelFullScreen(false)` through each of them individually — same
  // "effect rather than touching every call site" approach `showSettings`'s
  // own reset (right above, near `activeInteractionId`'s own declaration)
  // already uses. `panelVariant` itself is untouched, so the panel simply
  // resumes whichever of "docked"/"float" it was in before fullscreen,
  // exactly like exiting via the toggle button itself. NOTE: this alone
  // doesn't cover clicking the card that's ALREADY the active one — that
  // sets the same `activeInteractionId`, no value change, so this effect
  // doesn't fire — see the assignment card's own `onClick` (further down),
  // which calls `setPanelFullScreen(false)` directly for that reason.
  useEffect(() => {
    setPanelFullScreen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInteractionId, showSettings]);
  // `containerRef` is the CONTENT container — everything to the right of
  // LeftNav (its own JSX comment further down calls it "Content area"),
  // also used elsewhere for AI/Notifications float positioning. This is
  // the real, scoped "interaction container" a container query should
  // react to — NOT the whole page/viewport: measuring the full "Body:
  // LeftNav + Content" row (an earlier version of this guard did, via a
  // since-removed `bodyContainerRef`) is indistinguishable from a plain
  // page-width media query, since that row spans edge-to-edge with
  // nothing else constraining it. `containerRef`'s own width, by
  // contrast, genuinely shrinks/grows independently of the page (e.g. as
  // LeftNav's own rail width changes between its 52px/256px states) —
  // per explicit follow-up request, the Customer Information panel's own
  // narrow guard below (`isSidePanelContainerNarrow`) reads THIS
  // measurement, not a page-wide one. Safe from feedback loops: this div
  // is a flex-1 item sized by ITS OWN PARENT (the Body row), not by its
  // children — so whether the docked panel INSIDE it is pinned or
  // floating doesn't change this box's own measured width.
  const containerRef  = useRef<HTMLDivElement>(null);
  const [sidePanelContainerWidth, setSidePanelContainerWidth] = useState(9999);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setSidePanelContainerWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setSidePanelContainerWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // The "Body: LeftNav + Content" row (both the nav and everything to its
  // right sit inside this one div, see its own JSX comment further down) —
  // measured via ResizeObserver so `isNavNarrow` below reacts to this row's
  // own box width, a real container query, rather than the whole browser
  // viewport (`window.innerWidth`), which it used before this was pointed
  // out as a mismatch. Deliberately NOT `containerRef` above — the side
  // nav's own auto-collapse/overlay decision needs a measurement that
  // doesn't depend on the nav's own current rail width (52px vs 256px),
  // which `containerRef` (content area, i.e. "everything right of
  // LeftNav") does; this row includes LeftNav itself, so its width is
  // unaffected by the nav's own open/collapsed state.
  const bodyContainerRef = useRef<HTMLDivElement>(null);
  const [bodyContainerWidth, setBodyContainerWidth] = useState(9999);
  useEffect(() => {
    const el = bodyContainerRef.current;
    if (!el) return;
    setBodyContainerWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setBodyContainerWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const panelFloatLeft = useRef<number | null>(null);
  const panelFloatTop  = useRef<number | null>(null);
  const panelRef       = useRef<HTMLDivElement>(null);
  const panelAnimTimer = useRef<ReturnType<typeof setTimeout>>();
  const fullScreenAnimTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Defaults to "salesforce" (per explicit request) rather than starting
  // unselected — Screen Pop should open straight into the mocked
  // Salesforce login instead of an empty picker the agent has to act on
  // first.
  const [screenPopApp, setScreenPopApp] = useState("salesforce");
  // Search panel's own query — separate from `searchQuery` (contact
  // history search elsewhere in this file) since this is a distinct,
  // unrelated search surface that happens to share the same app-header
  // panel shell.
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  // "View All Apps" kebab menu — lists every app-header panel button
  // regardless of pinned state, with a `PanelPinButton` per row so any app
  // can be pinned/unpinned right from the menu. All nine start pinned
  // (matching today's always-visible header row); unpinning one just hides
  // its persistent header icon — the app's still reachable by clicking its
  // row in this menu, which opens the shared panel exactly like the header
  // icon would.
  // Default pinned set — header shows (right to left) Notifications,
  // Agent Chat, Search; Schedule/Customers/Accounts/Tickets/WEM/Screen Pop
  // start unpinned. Customers/Accounts/Tickets/WEM are also filtered out
  // of the "View All Apps" menu itself (see `HIDDEN_FROM_APPS_MENU`
  // below), making them fully unreachable from the app header; Schedule
  // and Screen Pop aren't in that list, so unpinning them (Schedule per
  // this follow-up request) just hides their header icon — both stay
  // reachable via "View All Apps".
  const [pinnedKeys, setPinnedKeys] = useState<Record<PanelKey, boolean>>({
    notif: true,
    conversations: true,
    schedule: false,
    screenpop: false,
    customers: false,
    accounts: false,
    tickets: false,
    wem: false,
    search: true,
  });
  const [appsMenuOpen, setAppsMenuOpen] = useState(false);

  /* Interior panel (right) */
  const [interiorPanelOpen, setInteriorPanelOpen] = useState(false);
  /* Which home-tab queue widget (if any) is selected — reuses the same
     interior panel slot as Case Details, swapping its content instead of
     stacking a second right-docked panel. */
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);

  /* ── Live queue simulation ──
     The home tab's queue widgets should look "live" — wait time ticks up
     like a real clock, and Contacts fluctuates a bit over time — without
     reintroducing the old `randomContactsCount()` bug (an independently-
     randomized number that could disagree with the side panel's own
     breakdown, see the comment on `sumInQueue` above). So the *only* thing
     that gets randomized here is `queueSubItems` itself — the same list
     the side panel renders and `sumInQueue` totals for the Contacts metric
     — every few seconds one random sub-item's `inQueueCount` nudges by
     -1/0/+1 (clamped to [0, 20]). Both the widget's Contacts number and the
     side panel's "In Queue" figures re-derive from this one state update,
     so they can't drift apart. Wait time uses the shared `clockTick`
     (declared above) instead of its own timer — same "count seconds since
     mount" convention `formatElapsedTime`'s callers already use — added to
     each queue's `QUEUE_WAIT_BASE_SECONDS` baseline every render. */
  const [queueSubItems, setQueueSubItems] = useState<Record<string, QueueSubItem[]>>(INITIAL_QUEUE_SUB_ITEMS);
  useEffect(() => {
    const id = setInterval(() => {
      setQueueSubItems((prev) => {
        const queueIds = Object.keys(prev);
        const queueId = queueIds[Math.floor(Math.random() * queueIds.length)];
        const items = prev[queueId];
        const itemIndex = Math.floor(Math.random() * items.length);
        const delta = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        const nextCount = Math.max(0, Math.min(20, items[itemIndex].inQueueCount + delta));
        if (nextCount === items[itemIndex].inQueueCount) return prev;
        return {
          ...prev,
          [queueId]: items.map((item, i) => (i === itemIndex ? { ...item, inQueueCount: nextCount } : item)),
        };
      });
    }, 4000);
    return () => clearInterval(id);
  }, []);

  /* Home tab's queue widget row — `LATEST_CONTACTS_STATIC`'s fixed fields
     merged with the live `contactsCount`/`skillsCount` (derived from
     `queueSubItems`) and `wait` (derived from `clockTick`) every time
     either changes. Wait is pinned to zero once a queue actually empties
     (matches the reference screenshot's own Inbound Voice row: 0 contacts,
     00:00:00 wait) rather than ticking up forever regardless of whether
     anyone's still waiting. */
  const latestContacts = useMemo<LatestContact[]>(() => {
    return LATEST_CONTACTS_STATIC.map((base) => {
      const contactsCount = sumInQueue(queueSubItems[base.id]);
      return {
        ...base,
        contactsCount,
        skillsCount: queueSubItems[base.id].length,
        agentsCount: AGENTS_COUNT_BY_QUEUE[base.id],
        wait: contactsCount > 0 ? formatWaitTime(QUEUE_WAIT_BASE_SECONDS[base.id] + clockTick) : formatWaitTime(0),
      };
    });
  }, [queueSubItems, clockTick]);

  /* Customer Information panel — a left-docked `SidePanel` (per explicit
     request to move this content into a left side panel, matching a
     reference screenshot), built via the local `CustomerInformationSide-
     Panel` wrapper. State/wiring below mirrors `AgentNextGenTemplate
     .stories.tsx`'s own `CustomerInformationPanel` usage — the current
     reference for a left-docked side panel in this exact spot — rather
     than the plain open/closed boolean the right-docked `InteriorPanel`
     version this replaces got away with: a `SidePanel` needs pinned vs.
     hover-preview state and its own narrow-container guard, since (unlike
     `InteriorPanel`) it has no such handling built in. */
  // Open + pinned by default (per explicit request) — a fresh interaction's
  // Customer Information panel starts docked open rather than closed/
  // hover-only; `isSidePanelContainerNarrow`'s guard below still forces it
  // unpinned (floating overlay, not docked) below 768px regardless of these
  // defaults — it stays OPEN though, just no longer docked. See that
  // guard's own doc comment.
  const [sidePanelOpen,     setSidePanelOpen]     = useState(true);
  const [sidePanelPinned,   setSidePanelPinned]   = useState(true);
  const [sidePanelResizing, setSidePanelResizing] = useState(false);
  // 340 — explicit starting width for the SidePanel version (was 425,
  // matching the old InteriorPanel's `maxWidth` default) — per explicit
  // request.
  const [sidePanelWidth, setSidePanelWidth] = useState(340);
  // Full-screen toggle (per explicit request) — see
  // `CustomerInformationSidePanel`'s own doc comment for how this actually
  // renders (an unpinned overlay sized to the parent Container's own
  // measured width, `sidePanelContainerWidth`, rather than the normal
  // drag-resized `sidePanelWidth`). Reset to `false` whenever the panel is
  // explicitly closed (`handleSidePanelClose` below) — a freshly reopened
  // panel shouldn't silently reopen full-screen from a previous session.
  const [sidePanelFullScreen, setSidePanelFullScreen] = useState(false);
  const sidePanelHoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Header icon's hover preview (`CustomerInfoHoverPreview`, only rendered
  // while the real panel is closed — see the render site) — same
  // open-now/close-on-a-short-delay shape as `sidePanelHoverTimer` above,
  // just its own independent state/timer since this is a lightweight
  // `Popover` preview of the panel, not the panel itself.
  const [customerInfoPreviewOpen, setCustomerInfoPreviewOpen] = useState(false);
  const customerInfoPreviewTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The agent's own last explicit open/closed choice (the header's
  // "Customer History" toggle icon while pinned, or the panel's own close
  // button) — per explicit request, a freshly started/quick-dialed/
  // redialed/reopened interaction's panel now starts in WHICHEVER state the
  // agent last picked, not hardcoded open every time. A ref, not state: it
  // only needs to be read at the moment a new interaction launches, never
  // drives a render itself. Hover-preview opens/closes (only relevant while
  // unpinned) are deliberately NOT recorded here — those are transient,
  // not a real choice the agent made.
  const lastSidePanelOpenChoice = useRef(true);

  // Container-width pin guard — `SidePanel` has no built-in "too narrow,
  // force an overlay" handling of its own (unlike `InteriorPanel`), so this
  // reproduces it: reads `sidePanelContainerWidth` (`containerRef` — the
  // real content-area container, see its own doc comment above) to force
  // the panel unpinned below 768px of THAT container's width, so it
  // renders as a floating overlay instead of pushing the main content
  // column over. Deliberately a real container query on the content area,
  // not on the whole page/viewport — see `containerRef`'s own doc comment
  // for why that distinction matters.
  //
  // Per explicit request, this no longer force-CLOSES the panel when the
  // container narrows (it used to: `setSidePanelOpen(false)`) — an agent
  // who had it open keeps it open, just as a floating overlay instead of
  // docked, once `effectiveSidePanelPinned` below goes false. Only
  // `sidePanelPinned`'s effective value changes here; `sidePanelOpen` is
  // untouched by width and only ever changes via an explicit agent action
  // (the panel's own close button, the header icon toggle, or a new
  // interaction applying `lastSidePanelOpenChoice`).
  const isSidePanelContainerNarrow = sidePanelContainerWidth < 768;
  const effectiveSidePanelPinned = isSidePanelContainerNarrow ? false : sidePanelPinned;

  // Auto full-screen — per explicit request, an OPEN panel automatically
  // goes full-screen once the container narrows down to 425px (the
  // panel's own normal max width — see `CustomerInformationSidePanel`'s
  // `maxWidth`), rather than staying docked/overlaid at a width that no
  // longer comfortably fits its own content next to the interaction
  // column. Only forces full-screen ON when this crosses that threshold
  // (or when the panel opens while already at/under it) — does NOT force
  // it back OFF on its own when the container widens back out past 425,
  // and does nothing at all if the agent has already manually exited
  // full-screen since the last such crossing (the effect only re-fires
  // when one of its own two dependencies actually changes value, not on
  // every render), so a manual "Exit Full Screen" click while still
  // narrow isn't immediately fought and re-applied. (The narrower 350px
  // threshold below DOES force it back off, but only on its own specific
  // crossing — see that effect's own doc comment.)
  const isSidePanelAtMaxWidthBreakpoint = sidePanelContainerWidth <= 425;
  useEffect(() => {
    if (isSidePanelAtMaxWidthBreakpoint && sidePanelOpen) {
      setSidePanelFullScreen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSidePanelAtMaxWidthBreakpoint, sidePanelOpen]);

  // Below 350px of the same container width, per explicit follow-up
  // request: hide the full-screen toggle button entirely (see
  // `onToggleFullScreen` at the render call site below — passing
  // `undefined` there hides it, same "no prop, no button" pattern
  // `onClose` already uses) rather than leaving a control on-screen with
  // no room left to usefully act on. Crossing back up over 350px both
  // restores that button AND explicitly exits full-screen — unlike the
  // 425px threshold above (which never forces an exit on its own), this
  // one always does, since the button being hidden below 350px means the
  // agent had no way to have manually exited full-screen in the meantime
  // anyway, so there's nothing to preserve/avoid fighting here. Only
  // fires on the actual crossing (dependency array), not continuously.
  const isSidePanelAtMinimalThreshold = sidePanelContainerWidth <= 350;
  useEffect(() => {
    if (!isSidePanelAtMinimalThreshold) {
      setSidePanelFullScreen(false);
    }
  }, [isSidePanelAtMinimalThreshold]);

  // Used to force-close (and reset pinned) whenever the agent left the
  // interaction view entirely (dismissing it, or navigating to Desk/
  // Settings/another tab) — removed per explicit request: the panel now
  // just keeps whatever open/closed state the agent last left it in
  // (`lastSidePanelOpenChoice` covers re-applying that to the NEXT
  // interaction too), rather than being force-closed by navigating away
  // and force-reopened for every new one. Only an explicit close (the
  // panel's own close button, or the header icon toggle while pinned)
  // changes it now.

  // Delayed reveal for the record header's "Customer Information" toggle
  // button + divider (`showPanelToggle && ...` at the render site below,
  // only ever shown while the panel is closed). `sidePanelOpen` itself
  // still drives the real panel's own `open` prop directly (so its own
  // close animation timing is unaffected) — but rendering the button off
  // a plain `!sidePanelOpen` made it pop into the header the INSTANT the
  // panel started closing, while `SidePanel`'s own 250ms width-collapse
  // (side-panel.tsx) was still visibly playing — a button inviting the
  // agent to reopen a panel that hadn't actually finished closing yet,
  // confirmed live as a jarring flash/glitch. This mirrors `sidePanelOpen`
  // but with a short delay on the "reveal" edge only (closing → show
  // button) — the "hide" edge (opening → hide button) stays instant, since
  // there's no equivalent glitch in hiding something the moment it's no
  // longer true. 100ms (started at 250ms, matching the panel's own full
  // close transition exactly, then trimmed to 150ms, then this — both per
  // explicit follow-up request) — short enough the button no longer reads
  // as visibly lagging behind the rest of the collapse, while still
  // clearing the worst of the original flash/glitch.
  const [sidePanelToggleVisible, setSidePanelToggleVisible] = useState(!sidePanelOpen);
  const sidePanelToggleRevealTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(sidePanelToggleRevealTimer.current);
    if (sidePanelOpen) {
      setSidePanelToggleVisible(false);
    } else {
      sidePanelToggleRevealTimer.current = setTimeout(() => setSidePanelToggleVisible(true), 100);
    }
    return () => clearTimeout(sidePanelToggleRevealTimer.current);
  }, [sidePanelOpen]);

  // Hover-preview handlers — guarded on `sidePanelPinned` (not the
  // narrow-adjusted `effectiveSidePanelPinned`): once pinned, hover does
  // nothing at all in either direction, open/closed is controlled solely by
  // the click toggle while pinned, same as every other `SidePanel` consumer.
  const onSidePanelHoverStart = () => {
    if (sidePanelPinned) return;
    clearTimeout(sidePanelHoverTimer.current);
    setSidePanelOpen(true);
  };
  const onSidePanelHoverEnd = () => {
    if (sidePanelPinned) return;
    sidePanelHoverTimer.current = setTimeout(() => setSidePanelOpen(false), 300);
  };
  // Fired by the panel's own header button (a `PanelPinButton` wearing a
  // `PanelLeftClose` icon instead of the default `Pin` glyph, per explicit
  // request) — just hides the panel, per explicit follow-up request;
  // leaves `sidePanelPinned` untouched (still pinned if it was), so the
  // person-icon toggle in the record header (`handleSidePanelIconToggle`)
  // still reopens it in the same pinned state rather than this having
  // quietly unpinned it first.
  const handleSidePanelClose = () => {
    setSidePanelOpen(false);
    setSidePanelFullScreen(false);
    lastSidePanelOpenChoice.current = false;
  };

  /* Per-assignment memory for the Customer Information panel's open/closed
     and full-screen state — per explicit request: switching between two
     already-active assignments (e.g. clicking a different LeftNav
     assignment card) must not let one assignment's full-screen/closed
     choice leak onto another. Closing the panel on assignment A and
     leaving it full-screen on assignment B, then switching back to A,
     should show A closed again — not full-screen just because that's
     wherever the shared `sidePanelOpen`/`sidePanelFullScreen` state
     happened to land last.

     Deliberately a small helper called from every place `activeInteractionId`
     changes, rather than a `useEffect` keyed on it (the "effect instead of
     touching every call site" pattern this file otherwise prefers — see
     `panelFullScreen`'s own reset effect above). An effect can't do this
     correctly here: several of the switch call sites below also set
     `sidePanelOpen` themselves (their own `isNewInteraction` branches) in
     the SAME batch as `setActiveInteractionId`. React applies every
     setState in that batch together in one render, so by the time any
     effect watching `activeInteractionId` could run, `sidePanelOpen`
     already reflects the NEW assignment's value — there's no render left
     in which the OUTGOING assignment's actual value is still visible to
     read. This helper instead reads `sidePanelOpen`/`sidePanelFullScreen`
     synchronously, via plain closure, at the moment it's called — BEFORE
     any state update from this switch has been applied — which is exactly
     the outgoing assignment's real last value every time.

     Only covers open/full-screen, per explicit request — `sidePanelPinned`/
     `sidePanelWidth` stay shared across assignments (read more like a
     general layout preference than something tied to one specific
     assignment, and weren't asked for); extend the same way if that's ever
     requested too.

     A never-before-seen assignment id (no snapshot yet) always gets
     `fullScreen: false` — a fresh assignment should never silently inherit
     full-screen from whatever was active before — but `sidePanelOpen` is
     deliberately left untouched here: each "new interaction" call site
     below already decides that correctly via `lastSidePanelOpenChoice`
     right after calling this, and re-deciding it here too would just be a
     second, competing source of truth for the same value.

     Restoring a different assignment's own open/full-screen values here
     used to still visibly play `SidePanel`'s own width/opacity transitions
     (side-panel.tsx — `transition: "width 250ms cubic-bezier(...)"` on
     open/close, `"opacity 150ms ease 30ms"` on its inner content) exactly
     as if the agent had just clicked the toggle themselves — switching TO
     an assignment whose panel happens to be closed (or full-screen)
     visibly slid the panel shut (or expanded it) on every single switch,
     read as "disorienting" per explicit report, since none of that was an
     actual open/close ACTION, just this assignment's panel already having
     been left that way. A first attempt suppressed that transition
     outright (a `!important` CSS class toggled on briefly via this
     helper), which fixed the sliding but traded it for a different
     problem, also reported live: the panel then just snapped into view
     with no animation at all, while the content column beside it (see
     `key={`interaction-${activeInteraction.id}`}` below) was still doing
     its own soft `animate-in fade-in-0` — the panel read as "not fading,
     just appearing," out of sync with everything else on the same switch.

     Fixed properly at the render site instead (not here): the panel is
     now wrapped in a `key`ed div using `activeInteraction.id`, the exact
     same "force a full remount on every genuine switch" technique the
     content column already uses for its own fade-in — see that div's own
     doc comment further down for why this solves BOTH problems at once
     without any transition-suppression trickery. This helper's own job
     stays exactly what it says above: decide WHAT `sidePanelOpen`/
     `sidePanelFullScreen` should be for the incoming assignment, not HOW
     that change gets animated. */
  const sidePanelStateByAssignmentId = useRef(new Map<string, { open: boolean; fullScreen: boolean }>());
  const switchActiveInteraction = (nextId: string | null) => {
    const outgoingId = activeInteractionId;
    if (outgoingId !== nextId) setHistoryConversationTab(null);
    if (outgoingId && outgoingId !== nextId) {
      sidePanelStateByAssignmentId.current.set(outgoingId, {
        open: sidePanelOpen,
        fullScreen: sidePanelFullScreen,
      });
    }
    setActiveInteractionId(nextId);
    if (nextId && nextId !== outgoingId) {
      const saved = sidePanelStateByAssignmentId.current.get(nextId);
      if (saved) {
        setSidePanelOpen(saved.open);
        setSidePanelFullScreen(saved.fullScreen);
      } else {
        setSidePanelFullScreen(false);
      }
    }
  };

  // Click on the header's toggle icon — always opens/closes the panel, in
  // whatever mode `effectiveSidePanelPinned` currently puts it in: docked
  // inline while pinned (the normal case, since `sidePanelPinned` itself
  // never actually goes false anymore — nothing unpins it), or as a
  // floating overlay once the container gets narrow enough to force
  // `effectiveSidePanelPinned` false. Used to no-op below 768px (the old
  // "hover handles opening while unpinned instead" reasoning) — per
  // explicit request, an agent whose container narrowed enough to
  // auto-close the panel still needs a working click target to bring it
  // back, and hovering a plain click button isn't a real affordance there.
  const handleSidePanelIconToggle = () => {
    setSidePanelOpen((v) => {
      const next = !v;
      lastSidePanelOpenChoice.current = next;
      return next;
    });
    // Clicking always opens the real panel from here (this icon only
    // renders while it's closed — see the render site's own comment), which
    // unmounts the hover-preview `Popover` right along with it. Explicitly
    // closing the preview's own state too so it doesn't reopen instantly
    // (no real hover) the next time this icon happens to render again.
    clearTimeout(customerInfoPreviewTimer.current);
    setCustomerInfoPreviewOpen(false);
  };
  // Open immediately on hover-in, close on a short delay on hover-out —
  // same hover-intent shape as `onSidePanelHoverStart`/`onSidePanelHoverEnd`
  // above, just for the lightweight preview `Popover` instead of the real
  // panel. Both the trigger icon and the preview's own content
  // (`CustomerInfoHoverPreview`) call these, so moving the pointer from one
  // to the other keeps it open — see that component's own doc comment for
  // why the preview needs to re-arm this itself too.
  const openCustomerInfoPreview = () => {
    clearTimeout(customerInfoPreviewTimer.current);
    setCustomerInfoPreviewOpen(true);
  };
  const scheduleCloseCustomerInfoPreview = () => {
    clearTimeout(customerInfoPreviewTimer.current);
    customerInfoPreviewTimer.current = setTimeout(() => setCustomerInfoPreviewOpen(false), 150);
  };
  // Guards against a stale `true` leaking into the next interaction this
  // icon renders for (e.g. switching interactions mid-hover, without ever
  // moving the pointer far enough away to fire the close timer above).
  useEffect(() => {
    setCustomerInfoPreviewOpen(false);
  }, [activeInteraction?.id]);

  // Track window width — still drives `isCompactHeader` below.
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Nav overlay breakpoint — `bodyContainerWidth` (see `bodyContainerRef`'s
  // own doc comment up by `containerRef`), not the browser viewport.
  const isNavNarrow = bodyContainerWidth < 768;
  const isCompactHeader = windowWidth < 760;

  // Auto-collapse the expanded nav when the container drops below 768px
  useEffect(() => {
    if (isNavNarrow && navOpen) setNavOpen(false);
  }, [isNavNarrow]); // eslint-disable-line react-hooks/exhaustive-deps

  // Below 768px, a DOCKED panel no longer forces itself to float+closed —
  // it now combines with the main container into a single container with
  // two tabs instead (see `isCombinedPanelMode` below, computed once
  // `activePanelContent` exists further down). Floating panels are
  // untouched by this breakpoint; they still float exactly as before.
  // `narrowActiveRegion` is which of those two tabs is currently showing —
  // reset back to "main" whenever the combined layout isn't actually in
  // play (wide viewport, or nothing open), so it can't be left stuck on
  // "panel" from a previous narrow session with nothing to show for it.
  const [narrowActiveRegion, setNarrowActiveRegion] = useState<"main" | "panel">("main");
  useEffect(() => {
    if (!isNavNarrow || !panelOpen) setNarrowActiveRegion("main");
  }, [isNavNarrow, panelOpen]);

  const MAX_PANEL_HEIGHT = 860;
  const BOTTOM_PADDING   = 8;
  // Matches `Draggable`'s own default `maxWidth` (draggable.tsx) — made
  // explicit here (and passed as an explicit prop below) rather than left
  // as an implicit default, since `handleFullScreenToDragMode` below also
  // needs this exact value to size the panel at its true maximum.
  const SHARED_PANEL_MAX_WIDTH = 1024;

  const computePanelHeight = () => {
    if (!containerRef.current) return MAX_PANEL_HEIGHT;
    const top = containerRef.current.getBoundingClientRect().top;
    return Math.min(window.innerHeight - top - BOTTOM_PADDING, MAX_PANEL_HEIGHT);
  };

  /* Timer */
  useEffect(() => {
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const h = Math.floor(elapsedSeconds / 3600);
  const m = Math.floor((elapsedSeconds % 3600) / 60);
  const s = elapsedSeconds % 60;
  const formattedTimer = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  const handleStatusChange = (status: AgentStatus) => {
    setAgentStatus(status);
    setElapsedSeconds(0);
  };

  /* ── Launching interactions from CreateNew ──
     Overrides OUTBOUND_CONFIG's default onStartCall/onQuickDial (which just
     console.log) so this page actually surfaces what gets launched as
     InteractionNavItem cards in the left nav. Used to also force the nav
     open (`setNavOpen(true)`) whenever a new assignment launched — dropped
     per explicit request: starting/reopening an assignment no longer
     expands a collapsed rail on its own. */
  const handleStartCall = (selection: {
    contact: CreateNewOutboundContact;
    channel: ChannelType;
    phone: string;
    skillId: string;
  }) => {
    const skillLabel = OUTBOUND_CONFIG.skillOptions.find((o) => o.value === selection.skillId)?.label;
    // `phoneOptions` only has a value→label mapping for phone numbers (raw
    // digits → formatted display string) — email/WhatsApp addresses are
    // already human-readable as-is (see `create-new.tsx`'s
    // `defaultDetailValueFor`, where their `value` and `label` are the same
    // string), so falling back to `selection.phone` itself is correct there,
    // not a placeholder.
    const addressLabel = OUTBOUND_CONFIG.phoneOptions.find((o) => o.value === selection.phone)?.label ?? selection.phone;
    // Read before `setInteractions` below — whether this customer already
    // has a card open decides whether Customer Information animates open
    // (see the `setSidePanelOpen` call at the end of this handler).
    const isNewInteraction = !interactions.some((i) => i.id === selection.contact.id);
    // Read before `setInteractions` below, same reasoning as
    // `isNewInteraction` — this channel's own id (`type:phone`, reused
    // verbatim across restarts at the same address) is how a restart of a
    // previously-CLOSED channel is actually detected: if a channel with
    // this exact id already exists on this contact's interaction AND its
    // own `channelStatuses` entry currently reads `"Closed"`, this is a
    // genuine reopen (agent picked the same channel/handle again via "Add
    // Channel"), not a brand-new one — see `TrackedChannel.
    // reopenedSessions`'s own doc comment for what that then does.
    const existingInteraction = interactions.find((i) => i.id === selection.contact.id);
    const existingChannelId = `${selection.channel}:${selection.phone}`;
    const existingChannel = existingInteraction?.channels.find((c) => c.id === existingChannelId);
    const isReopenOfClosedChannel =
      !!existingChannel && existingInteraction?.channelStatuses?.[existingChannelId] === "Closed";
    const reopenedSessions = isReopenOfClosedChannel
      ? [
          ...(existingChannel!.reopenedSessions ?? []),
          {
            // `Date.now()` (a real, always-unique timestamp), not
            // `clockTick` (an incrementing seconds counter this app's own
            // shared 1s interval drives) — two reopens landing inside the
            // same tick would otherwise collide on id.
            id: `session-reopened-${Date.now()}`,
            date: new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }),
            startTime: new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
            // Snapshot of how many live messages this channel had BEFORE
            // this reopen — per explicit correction, those messages must
            // stay visible (dimmed) under their own prior session, not be
            // wiped. See this field's own doc comment on `TrackedChannel.
            // reopenedSessions` for how `InteractionTranscript` uses it.
            messagesBeforeReopen: existingInteraction?.liveMessages?.[existingChannelId]?.length ?? 0,
          },
        ]
      : existingChannel?.reopenedSessions;
    const newChannel: TrackedChannel = {
      id: existingChannelId,
      type: selection.channel,
      startTick: clockTick,
      preview: skillLabel,
      value: selection.phone,
      addressLabel,
      // A freshly started outbound conversation hasn't exchanged any
      // messages yet — `0` (not omitted) so the tooltip actually reads "0
      // Messages" instead of showing nothing. Voice has no message concept
      // at all, so it's left `undefined` there — see
      // `ChannelTabProps.messageCount`'s own doc comment.
      messageCount: selection.channel === "voice" ? undefined : 0,
      interactionId: generateInteractionId(),
      reopenedSessions,
    };

    setInteractions((prev) => {
      const idx = prev.findIndex((i) => i.id === selection.contact.id);
      // No existing interaction with this contact — start a new card.
      if (idx === -1) {
        return [...prev, {
          id: selection.contact.id,
          // `adhoc:`-prefixed ids are lyra-ui's own "Continue with" flow
          // (`buildAdHocSearchContact`, create-new.tsx) — a typed query that
          // matched no real directory contact, so CreateNew builds a
          // throwaway contact whose `name` IS the raw typed phone number/
          // email itself. Passed straight through as `customerName` (not
          // blanked out) — per explicit request, the raw address is exactly
          // what should show as this card's name/title text (both here and
          // in `CustomerInformationSidePanel`'s header) when there's no real
          // customer — only the AVATAR needs different treatment for that
          // case (a channel icon instead of initials derived from the
          // address's own leading character), which is driven by the
          // separate `customerIdentified` prop at the `InteractionNavItem`
          // render call site below, not by blanking this out.
          customerName: selection.contact.name,
          // `subtitle` is the contact's real id (customerId/agentId/
          // TEAM-.../SKL-.../ASN-...) whenever CreateNew's record set one —
          // only missing for records that genuinely have none.
          recordId: selection.contact.subtitle ?? generateCaseId(),
          channels: [newChannel],
          currentChannelId: newChannel.id,
          startedFresh: true,
        }];
      }
      // Same contact already has an interaction open — restart the matching
      // channel's timer if this is the *same* type+address (e.g. redialing
      // the same SMS number), or add a new row alongside the existing ones
      // if it's a different address on the same type (e.g. a second SMS
      // thread on a different number) — those are genuinely separate
      // conversations, not a duplicate of the first, so they shouldn't
      // overwrite it.
      return prev.map((interaction, i) => {
        if (i !== idx) return interaction;
        const chIdx = interaction.channels.findIndex((c) => c.id === newChannel.id);
        const channels = chIdx === -1
          ? [...interaction.channels, newChannel]
          : interaction.channels.map((c, j) => (j === chIdx ? newChannel : c));
        // The channel just started/restarted always takes over as current —
        // mirrors InteractionNavItem's own auto-select-newest rule, now
        // mirrored up here too since this state is what drives both the
        // card (via currentChannelKey) and the new ChannelToggle bar.
        return {
          ...interaction,
          channels,
          currentChannelId: newChannel.id,
          // Only matters when `chIdx !== -1` (same-address restart, reused
          // `newChannel.id`) — clears that one channel's possibly-stale
          // "Closed" entry so a redialed/reopened channel reads as freshly
          // open again, without disturbing any sibling channel's own
          // status. A genuinely new channel (`chIdx === -1`) has no entry
          // to clear in the first place, so this is a no-op there.
          channelStatuses: withoutChannelStatus(interaction.channelStatuses, newChannel.id),
          // NOTE: `liveMessages` is deliberately left untouched here (no
          // `withoutLiveMessages` call) — per explicit correction, reopening
          // a closed channel must NOT wipe its prior messages. They stay in
          // the flat `liveMessages[newChannel.id]` array exactly as they
          // were; `InteractionTranscript` slices that array back into
          // per-session chunks using each `reopenedSessions` entry's own
          // `messagesBeforeReopen` boundary, so the old messages keep
          // rendering (dimmed) under their original session instead of
          // vanishing. `withoutLiveMessages` is still used elsewhere
          // (`handleQuickDial`/`handleRedial`/
          // `handleReopenContactHistoryEntry`/
          // `handleOpenAssignmentFromNotification`) — those flows have no
          // reopened-session concept to attribute old messages to, so
          // clearing is still correct there.
        };
      });
    });
    switchActiveInteraction(selection.contact.id);
    // Only a genuinely NEW interaction touches Customer Information's
    // open/closed state at all — starting a second interaction with a
    // customer who already has one open leaves the panel exactly as the
    // agent last left it for THAT card, rather than re-applying anything
    // here. A new one opens/stays closed per `lastSidePanelOpenChoice` —
    // the agent's own last explicit choice (not hardcoded open) — per
    // explicit follow-up request.
    if (isNewInteraction) setSidePanelOpen(lastSidePanelOpenChoice.current);
  };

  // App-local only (per "changes to components should only happen locally
  // unless specified") — lyra-ui's shared `CreateNew` intentionally keeps
  // focus on its own trigger button on a normal click-to-open (see that
  // component's own doc comment on `openedViaLaunchRequestRef`), which is
  // the right default for every other app using it. Rather than changing
  // that shared behavior (or adding an opt-in prop to the library, or even
  // wrapping `<CreateNew>` in an extra element — `LeftNav`'s `injectExpanded`
  // clones `pinnedHeader`'s own DIRECT child to push in the hover-driven
  // `expanded` prop in overlay/narrow-nav mode, so a wrapper div here would
  // silently break that and leave the trigger stuck at whatever `expanded`
  // value this file passes instead of expanding on hover), this listens
  // for the trigger's own click at the document level instead, matched by
  // its stable `aria-label` (`title`, i.e. "New Outbound") — no JSX
  // wrapper, `CreateNew` stays `pinnedHeader`'s sole direct child. Once the
  // popover's open transition has settled, it finds the outbound search
  // field by its placeholder (`OUTBOUND_CONFIG.searchPlaceholder`, defined
  // below), suppresses the browser's own autofill suggestions on it (see
  // inline comment), and focuses it directly. A closing click just fails
  // the query harmlessly (nothing to focus once the content's unmounted).
  useEffect(() => {
    const CREATE_NEW_TRIGGER_LABEL = "New Outbound";
    const onDocumentClick = (e: MouseEvent) => {
      const trigger = (e.target as HTMLElement).closest?.(
        `button[aria-label="${CREATE_NEW_TRIGGER_LABEL}"]`
      );
      if (!trigger) return;
      requestAnimationFrame(() => {
        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>(
            `input[placeholder="${OUTBOUND_CONFIG.searchPlaceholder}"]`
          );
          if (!input) return;
          // The placeholder text itself contains "email" (part of
          // OUTBOUND_CONFIG.searchPlaceholder's own copy, "Enter phone,
          // email or search term"), which is enough for some browsers'
          // autofill heuristics to treat this as a saved-address field and
          // show a suggestions dropdown the moment it's focused. Chrome
          // ignores this plain autocomplete="off" for that category (a
          // stronger readonly-at-focus workaround was tried and reverted —
          // not worth the added complexity), but it's kept because Safari
          // does respect it. Set before `.focus()` (same synchronous tick).
          input.setAttribute("autocomplete", "off");
          input.focus();
        }, 50);
      });
    };
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, []);

  const handleQuickDial = (phoneNumber: string) => {
    // No contact record for a quick-dialed number — key the card off the
    // number itself so redialing the same number restarts its card rather
    // than stacking up duplicates.
    const id = `quickdial:${phoneNumber}`;
    // Read before `setInteractions` below — see `handleStartCall`'s own
    // `isNewInteraction` comment for why.
    const isNewInteraction = !interactions.some((i) => i.id === id);
    // Voice has no message concept at all, so `messageCount` is left
    // undefined here (not `0`) — see `ChannelTabProps.messageCount`'s own
    // doc comment for why that's a deliberate omission, not an oversight.
    const newChannel: TrackedChannel = {
      id: "voice",
      type: "voice",
      startTick: clockTick,
      value: phoneNumber,
      addressLabel: phoneNumber,
      interactionId: generateInteractionId(),
    };
    setInteractions((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return [...prev, { id, recordId: generateCaseId(), channels: [newChannel], currentChannelId: newChannel.id, startedFresh: true }];
      // `channels: [newChannel]` wholesale-replaces every previous channel
      // with this one fresh "voice" channel, so `channelStatuses`/
      // `liveMessages` are reset entirely too (rather than selectively
      // cleared like `handleStartCall`'s reused-id case) — no other channel
      // survives this merge for a stale entry to belong to. `liveMessages`
      // in particular matters here since `newChannel.id` is always the same
      // literal `"voice"` — without clearing it, redialing the same number
      // again would reopen still showing whatever was said on the PREVIOUS
      // call under that reused id.
      return prev.map((interaction, i) =>
        i === idx
          ? { ...interaction, channels: [newChannel], currentChannelId: newChannel.id, channelStatuses: undefined, liveMessages: undefined }
          : interaction
      );
    });
    switchActiveInteraction(id);
    if (isNewInteraction) setSidePanelOpen(lastSidePanelOpenChoice.current);
  };

  /* "Redial" from the home tab's Contact History card — same merge-by-id
     pattern as `handleQuickDial` (a fresh "voice" channel, keyed so redialing
     the same past contact again restarts their existing card instead of
     stacking a duplicate), but keyed off that contact-history entry's own id
     (namespaced "redial:" to stay distinct from quick-dial/outbound ids) and
     carrying the customer's real name, since — unlike a quick-dialed number —
     Contact History always has one on hand. Also expands the nav, same
     reasoning as handleStartCall/handleQuickDial above.

     Prefers `entry.customerId` (the real `CREATE_NEW_CUSTOMERS` id) over the
     synthetic `redial:` one whenever it's on hand — this was a real, shipped
     bug: `useOutboundAddButton`'s `getHeaderAction` looks up an interaction's
     own id in `outboundConfig.groups` to build its "+" (Add Channel) button.
     A synthetic `redial:ch1`-style id never matches any real contact, so
     `getHeaderAction` now returns `null` for it (no button at all) rather
     than one that renders but silently does nothing once picked — see
     `getHeaderAction`'s own doc comment in create-new.tsx. Using the real id
     makes a redialed card id-identical to one started from the Outbound
     picker for the same customer, so "Add Channel" (and, as a side effect,
     redialing the same customer who already has a card open elsewhere) both
     resolve correctly. Only the 5 hand-authored `CONTACT_HISTORY` rows
     (fictional names/case IDs, no backing `CREATE_NEW_CUSTOMERS` record)
     still fall back to the synthetic id, and so get no "+" button — same
     pre-existing limitation `handleQuickDial` already has for numbers with
     no contact record at all, not something new. */
  const handleRedial = (entry: ContactHistoryEntry) => {
    const id = entry.customerId ?? `redial:${entry.id}`;
    // Read before `setInteractions` below — see `handleStartCall`'s own
    // `isNewInteraction` comment for why.
    const isNewInteraction = !interactions.some((i) => i.id === id);
    // No stored phone number on ContactHistoryEntry — this channel's
    // ChannelToggle just shows icon + "Voice" with no address, same as any
    // other channel with no addressLabel.
    const newChannel: TrackedChannel = {
      id: "voice",
      type: "voice",
      startTick: clockTick,
      interactionId: generateInteractionId(),
    };
    setInteractions((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return [...prev, { id, customerName: entry.name, recordId: entry.caseId, channels: [newChannel], currentChannelId: newChannel.id, startedFresh: true }];
      // Same reasoning as `handleQuickDial` above — `channels: [newChannel]`
      // wholesale-replaces every previous channel, so `channelStatuses`/
      // `liveMessages` reset entirely rather than being selectively cleared.
      return prev.map((interaction, i) =>
        i === idx
          ? { ...interaction, channels: [newChannel], currentChannelId: newChannel.id, channelStatuses: undefined, liveMessages: undefined }
          : interaction
      );
    });
    switchActiveInteraction(id);
    if (isNewInteraction) setSidePanelOpen(lastSidePanelOpenChoice.current);
  };

  /** Fired by clicking a Contact History row itself (`ContactHistoryCard`'s
   *  new `onReopen` prop — distinct from that same row's "Redial" button,
   *  which still starts a fresh voice call via `handleRedial` above; the
   *  row click below reopens THIS past interaction to view/continue it).
   *  Builds a single channel matching `entry.channelType` — "voice"/"chat"/
   *  "email" are already valid `ChannelType` values (Contact History's own
   *  narrower grouping is a subset, not a separate vocabulary needing
   *  translation) — and reuses the same replace-or-add-by-id logic
   *  `handleRedial` uses, so reopening a row for a customer who already has
   *  a card open just refreshes that card's channel instead of creating a
   *  second one. `startedFresh` is deliberately left unset either way —
   *  reopening should show the existing (shared mock) conversation, not an
   *  empty "just launched" slate.
   *
   *  `closed` (from `entry.closed` — see its own doc comment) is the one
   *  thing that changes what the reopened card can do: carried straight
   *  onto `ActiveInteraction.closed`, which the render layer below reads to
   *  show a "viewing a closed interaction" banner, hide the composer, and
   *  hide every channel's kebab (no status change) instead of behaving like
   *  a normal, reply-able assignment.
   *
   *  `entry.statusLabel` is carried straight onto `ActiveInteraction.
   *  channelStatuses` (keyed by the freshly-built channel's own id) too —
   *  per explicit request, reopening a row should pick its current session
   *  back up AT the status it was last logged with
   *  (whatever `buildDismissedContactHistoryEntry` captured, or whatever a
   *  hand-authored `CONTACT_HISTORY`/`EXTENDED_CONTACT_HISTORY` row already
   *  says), not reset to `TRANSCRIPT_SESSIONS`/`_VOICE`/`_EMAIL`'s own
   *  hardcoded default status for that session. This is independent of
   *  `closed` above: a row can be reopened at, say, "Escalated" and still be
   *  fully reply-able (most rows), or reopened at "Closed" specifically —
   *  its own status, not the separate read-only-viewing flag — and still
   *  only go fully read-only if `entry.closed` also happens to be true. */
  const handleReopenContactHistoryEntry = (entry: ContactHistoryEntry) => {
    const id = entry.customerId ?? `history:${entry.id}`;
    const isNewInteraction = !interactions.some((i) => i.id === id);
    const newChannel: TrackedChannel = {
      id: entry.channelType,
      type: entry.channelType,
      startTick: clockTick,
      interactionId: generateInteractionId(),
    };
    setInteractions((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) {
        return [
          ...prev,
          {
            id,
            customerName: entry.name,
            recordId: entry.caseId,
            channels: [newChannel],
            currentChannelId: newChannel.id,
            closed: entry.closed,
            channelStatuses: { [newChannel.id]: entry.statusLabel },
          },
        ];
      }
      return prev.map((interaction, i) =>
        i === idx
          ? {
              ...interaction,
              channels: [newChannel],
              currentChannelId: newChannel.id,
              closed: entry.closed,
              channelStatuses: { [newChannel.id]: entry.statusLabel },
              // `channels: [newChannel]` wholesale-replaces every previous
              // channel (same as `handleQuickDial`/`handleRedial` above),
              // and `newChannel.id` here is just `entry.channelType` — so
              // reopening the same history row again (or one that happens
              // to share a channel type with whatever this card had open
              // before) needs `liveMessages` cleared too, or it'd reopen
              // still showing a stale previous conversation under that
              // reused key.
              liveMessages: undefined,
            }
          : interaction
      );
    });
    switchActiveInteraction(id);
    if (isNewInteraction) setSidePanelOpen(lastSidePanelOpenChoice.current);
  };

  /* "Unassign & Dismiss" — `InteractionNavItem` itself decides which of
     these two applies (based on how many channels the card has open when
     it's clicked), so these just need to implement each half:
     `onDismiss` (whole card, only called when just one channel was open —
     nothing would be left of the card otherwise) removes the interaction
     entirely, clearing `activeInteractionId` too if it was the active one so
     the side panel/content area doesn't keep pointing at a card that no
     longer exists. `onDismissChannel` (only called when more than one
     channel was open) drops just that one channel, leaving the rest of the
     card and its other channels open. The `ChannelToggle` bar's own kebab
     wires to the same two handlers (see the `activeInteraction` block
     below), so dismissing from a toggle behaves identically to dismissing
     from the card. */
  const handleDismissInteraction = (id: string) => {
    // Logs this assignment to Contact History before it's gone — an open
    // assignment being unassigned/dismissed is exactly the "completed
    // contact" event this demo has to log one from (see
    // `buildDismissedContactHistoryEntry`'s own doc comment). Looked up
    // from `interactions` (not `remaining` below) since that's the one
    // place the about-to-be-removed interaction's data still exists.
    // Deliberately does NOT change or invent this assignment's status —
    // logged as a normal "Resolved" row (see `buildDismissedContactHistoryEntry`),
    // never a forced "Closed"/read-only one: leaving an assignment (a
    // LeftNav/UI action) must not itself decide or change that
    // assignment's own status. `handleDismissChannel` (ending just one
    // channel of a card that's still otherwise open) does NOT call this —
    // the interaction as a whole isn't actually over yet, so there's
    // nothing to log.
    const dismissed = interactions.find((interaction) => interaction.id === id);
    if (dismissed) {
      setDismissedContactHistory((prev) => [buildDismissedContactHistoryEntry(dismissed, clockTick), ...prev]);
      fireDismissToast(dismissed);
    }
    // Dismissing the active assignment shouldn't strand the agent on an
    // empty dashboard when there's other open work waiting — hand "active"
    // to whichever assignment now sits at the top of the LeftNav list
    // (`interactions` renders top-down, see the `header` block below)
    // instead of clearing to `null`. Only clears to `null` (back to the
    // dashboard) once every assignment is gone. Computed from the same
    // filtered list `setInteractions` below produces, so the two state
    // updates can never disagree about what's actually left.
    const remaining = interactions.filter((interaction) => interaction.id !== id);
    setInteractions(remaining);
    // The dismissed id no longer belongs to any real assignment — drop its
    // Customer Information panel snapshot too (see `switchActiveInteraction`
    // above), so it can't resurface stale open/full-screen values if some
    // future assignment ever happened to reuse the same id.
    sidePanelStateByAssignmentId.current.delete(id);
    // Plain closure read (not a functional updater) — safe here since
    // nothing else in this same handler changes `activeInteractionId`
    // first, and `switchActiveInteraction` itself already needs a real,
    // synchronous "outgoing id" read rather than a queued updater (see its
    // own doc comment for why).
    if (activeInteractionId === id) {
      switchActiveInteraction(remaining[0]?.id ?? null);
    }
  };

  const handleDismissChannel = (id: string, channel: Pick<InteractionChannel, "id" | "type">) => {
    // Match on `id` (falling back to `type`, same as InteractionNavItem's
    // own `channelKey` convention) rather than `type` alone — two open
    // channels can share a `type` (e.g. two SMS threads on different
    // numbers), and filtering by `type` would drop *both* instead of just
    // the one the agent actually dismissed.
    const dismissedKey = channel.id ?? channel.type;
    // Fires the same success toast `handleDismissInteraction` does — every
    // dismissed channel gets its own confirmation, not just the one that
    // happens to empty the card out entirely. Looked up from `interactions`
    // (not `remaining`/the updater below) for the same reason
    // `handleDismissInteraction` does: that's the one place this
    // assignment's current `customerName`/`recordId` still exist before the
    // state update below removes just this one channel from it.
    const interaction = interactions.find((i) => i.id === id);
    if (interaction) fireDismissToast(interaction);
    setInteractions((prev) =>
      prev.map((interaction) => {
        if (interaction.id !== id) return interaction;
        const channels = interaction.channels.filter((c) => (c.id ?? c.type) !== dismissedKey);
        // Dismissing the currently-selected channel needs to hand "current"
        // to another remaining one (the new last channel, same fallback
        // InteractionNavItem itself uses) — otherwise the card/tab bar would
        // keep pointing at a channel that no longer exists.
        const currentChannelId = interaction.currentChannelId === dismissedKey
          ? channels[channels.length - 1]?.id
          : interaction.currentChannelId;
        return { ...interaction, channels, currentChannelId };
      })
    );
  };

  /** Fired by a card row's `onCurrentChannelChange` or a `ChannelToggle`'s
   *  `onClick` — both point at this same setter so either one updates the
   *  other (see `ActiveInteraction.currentChannelId`'s own doc comment). */
  const handleChannelSelect = (interactionId: string, channelKey: string) => {
    setInteractions((prev) =>
      prev.map((interaction) =>
        interaction.id === interactionId ? { ...interaction, currentChannelId: channelKey } : interaction
      )
    );
  };

  /** Fired by `InteractionComposer`'s Send button — appends the agent's
   *  typed message to this interaction's `liveMessages` (see that field's
   *  own doc comment), clears the awaiting-response flag on whichever
   *  channel is currently open (the agent just replied), then — since
   *  there's no real backend here for an actual customer to respond from —
   *  simulates one coming back a couple seconds later: appends a canned
   *  customer reply and flips that same channel's `awaitingResponse` back
   *  on. That flag is what feeds `InteractionNavItem.awaitingResponse`
   *  (both the card-level prop and each channel row's own), so the customer
   *  "replying" is what puts the red badge on this interaction's nav item —
   *  exactly the treatment `InteractionNavItem.stories.tsx`'s "Active,
   *  Awaiting Response" story already documents, not a new visual invented
   *  for this feature. */
  const handleSendMessage = (interactionId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const agentMessage: TranscriptMessage = {
      id: `live-${Date.now()}-agent`,
      sender: "agent",
      name: `${CURRENT_AGENT_FIRST_NAME} ${CURRENT_AGENT_LAST_NAME}`,
      initials: initialsFor(`${CURRENT_AGENT_FIRST_NAME} ${CURRENT_AGENT_LAST_NAME}`),
      timestamp: new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
      text: trimmed,
    };

    // Captured once, here, from whichever channel is current on THIS
    // interaction right now — `InteractionComposer` (which fired this) is
    // always scoped to the currently active channel, so this is genuinely
    // "the channel this message was sent on." NOT recomputed separately
    // inside `applyToChannel` at both the immediate-send and delayed-reply
    // moments below: the agent is free to switch to a different channel tab
    // (or away and back) during the 2.5s before the simulated customer
    // reply lands, and re-deriving "current" at that later point would
    // misattribute the reply (and the `liveMessages` entry it's appended
    // to) to whatever channel happens to be active THEN instead of the one
    // this whole exchange actually started on.
    const interactionAtSend = interactions.find((i) => i.id === interactionId);
    const channelKeyAtSend =
      interactionAtSend?.currentChannelId ??
      (interactionAtSend?.channels[interactionAtSend.channels.length - 1]
        ? interactionAtSend.channels[interactionAtSend.channels.length - 1].id ??
          interactionAtSend.channels[interactionAtSend.channels.length - 1].type
        : undefined) ??
      "channel";

    const applyToChannel = (
      interaction: ActiveInteraction,
      message: TranscriptMessage,
      awaitingResponse: boolean,
      // Only ever passed on the customer-reply branch below — the moment
      // that reply actually lands is exactly what `lastCustomerMessageTick`
      // needs to record (see that field's own doc comment). Omitted (not
      // just `undefined`-valued) on the agent-send branch so it doesn't
      // overwrite the channel's existing value with `undefined` there.
      lastCustomerMessageTick?: number
    ): ActiveInteraction => ({
      ...interaction,
      // Keyed by `channelKeyAtSend` — see `ActiveInteraction.liveMessages`'s
      // own doc comment for why this can't be one flat array shared across
      // every channel on the card.
      liveMessages: {
        ...interaction.liveMessages,
        [channelKeyAtSend]: [...(interaction.liveMessages?.[channelKeyAtSend] ?? []), message],
      },
      channels: interaction.channels.map((c) =>
        (c.id ?? c.type) === channelKeyAtSend
          ? { ...c, awaitingResponse, ...(lastCustomerMessageTick !== undefined ? { lastCustomerMessageTick } : {}) }
          : c
      ),
    });

    setInteractions((prev) =>
      prev.map((interaction) =>
        interaction.id === interactionId ? applyToChannel(interaction, agentMessage, false) : interaction
      )
    );

    // Simulated customer reply — canned text, not a real conversation
    // engine. "Customer"/"C" here are placeholders: `InteractionTranscript`
    // already swaps every customer-sender message's name/initials for this
    // interaction's real customer at render time (see its own doc comment),
    // so this reads correctly without needing the real name threaded
    // through here too.
    window.setTimeout(() => {
      const customerMessage: TranscriptMessage = {
        id: `live-${Date.now()}-customer`,
        sender: "customer",
        name: "Customer",
        initials: "C",
        timestamp: new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
        text: CUSTOMER_AUTO_REPLY_POOL[Math.floor(Math.random() * CUSTOMER_AUTO_REPLY_POOL.length)],
      };
      setInteractions((prev) =>
        prev.map((interaction) =>
          interaction.id === interactionId
            // `clockTickRef.current`, not the `clockTick` state variable —
            // this callback fires 2.5s after `handleSendMessage` was
            // called, and a plain closure over `clockTick` would still
            // read its value from THAT moment, not now. See the ref's own
            // doc comment above.
            ? applyToChannel(interaction, customerMessage, true, clockTickRef.current)
            : interaction
        )
      );
    }, 2500);
  };

  /** Fired by `InteractionTranscript`'s `onCurrentStatusChange` (for the
   *  active channel) and the LeftNav `ChannelRow` Outcome popover's own
   *  Resolution field (for any channel) — the agent changed a specific
   *  channel's status via the status popover (a plain pick, or confirming
   *  "Close"). Writes it onto that one channel's own entry in
   *  `ActiveInteraction.channelStatuses` (see that field's own doc comment
   *  for why status has to be tracked per-channel, and why it has to live
   *  here rather than purely in `InteractionTranscript`'s own state) —
   *  leaving every sibling channel's own status untouched. Read back by
   *  `buildDismissedContactHistoryEntry` when this interaction is later
   *  dismissed, so the logged Contact History row reflects whatever status
   *  was actually last assigned instead of always "Resolved". */
  const handleInteractionStatusChange = (interactionId: string, channelId: string, status: string) => {
    setInteractions((prev) =>
      prev.map((interaction) =>
        interaction.id === interactionId
          ? { ...interaction, channelStatuses: { ...interaction.channelStatuses, [channelId]: status } }
          : interaction
      )
    );
    // Per explicit request: confirm every status change with a toast — this
    // one function is the single point every status-pill/Outcome-Resolution
    // trigger for the CURRENT channel already funnels through (see this
    // function's own doc comment above for the three real call sites), so
    // firing it here covers all of them at once rather than needing the
    // same `addToast` call repeated at each trigger.
    addToast({
      variant: "success",
      title: "Success",
      message: `Status changed to "${status}"`,
      duration: 4000,
    });
  };

  /* ── Preventing duplicate channels from the CreateNew picker ──
     A contact already reachable via a currently-open channel (e.g. Jamie
     Torres has an SMS interaction open on a specific number) still shows
     that channel in "Select Channel" and every address in the detail
     screen's second field ("Select Phone"/"Select Email Address"/"Select
     WhatsApp Handle") — except whichever exact address(es) are already in
     use, which are disabled so starting another interaction on one of them
     wouldn't just duplicate the one already running (a different outbound
     line for the same channel — or a second, still-unused one, even when
     one SMS number is already open — stays selectable). Voice is the one
     exception to "disable by address, not by channel" — see
     `openChannelTypes`/`isChannelBlockedForContact`'s own doc comments
     (create-new.tsx) for why a call has no per-address concept to key off
     of at all.
     `CreateNewOutboundContact.openChannelAddresses`/`openChannelTypes` are
     exactly the mechanisms `CreateNew` exposes for this (see each one's own
     doc comment), so rather than adding new disabling logic to that shared
     component, this derives a per-render copy of OUTBOUND_CONFIG that tags
     each contact with every address in use (`openChannelAddresses`) AND
     every channel *type* currently open regardless of address
     (`openChannelTypes`) for whichever channels they already have open in
     `interactions` (read off each `TrackedChannel.type`/`.value`, set at
     start-call time — a contact can have more than one channel of the same
     type open at once, e.g. two SMS threads on different numbers, so
     addresses are a list per channel type, not a single value), across
     every group (Agents/Teams/Skills/Customers — Favorites is derived from
     these same records, so it inherits the tagging automatically).
     Recomputed whenever `interactions` changes so an address/channel
     re-enables the moment its interaction is dismissed. */
  const outboundConfig = useMemo<CreateNewOutboundConfig>(() => {
    const openAddressesByContactId = new Map<string, Partial<Record<ChannelType, string[]>>>();
    // Separate from `openAddressesByContactId` above — that one only ever
    // records a channel once it has a real `.value` (an actual number/
    // address), so a channel with none on record (e.g. `handleRedial`'s
    // voice channel, which has no stored phone number at all) would never
    // show up there despite genuinely being open. `openChannelTypes` tracks
    // presence alone, regardless of address, which is what
    // `isChannelBlockedForContact` (create-new.tsx) needs to disable
    // "Select Channel"'s Voice option — see that function's own doc
    // comment for the bug this fixes (a redialed voice interaction's own
    // "Add Channel" flow let Voice be picked again, since the
    // address-keyed map had nothing to disable it with).
    const openTypesByContactId = new Map<string, Set<ChannelType>>();
    for (const interaction of interactions) {
      const byType: Partial<Record<ChannelType, string[]>> = {};
      const types = new Set<ChannelType>();
      for (const c of interaction.channels) {
        // Per explicit request: a channel the agent has explicitly CLOSED
        // (via the status popover — `channelStatuses[c.id] === "Closed"`)
        // no longer counts as "open" here, so "Add Channel"/"Select
        // Channel" offers its type/address again instead of disabling it
        // as already-in-use. Reselecting it is exactly how a closed
        // channel gets reopened — see `handleStartCall`'s own
        // `isReopenOfClosedChannel` branch, which is what actually detects
        // and handles that case once the agent picks it back here.
        if (interaction.channelStatuses?.[c.id] === "Closed") continue;
        types.add(c.type);
        if (!c.value) continue;
        (byType[c.type] ??= []).push(c.value);
      }
      openAddressesByContactId.set(interaction.id, byType);
      openTypesByContactId.set(interaction.id, types);
    }
    // Tags a contact with its open-channel info (see this memo's own doc
    // comment above) — pulled out so it can run identically over the
    // "teams" group's swapped-in member roster below, not just every other
    // group's own static `contacts`.
    const tagOpenChannels = (contact: NonNullable<CreateNewOutboundConfig["groups"][number]["contacts"]>[number]) => {
      const openChannelAddresses = openAddressesByContactId.get(contact.id);
      const openChannelTypes = openTypesByContactId.get(contact.id);
      if (!openChannelTypes || openChannelTypes.size === 0) return contact;
      return {
        ...contact,
        ...(openChannelAddresses && Object.keys(openChannelAddresses).length > 0 ? { openChannelAddresses } : {}),
        openChannelTypes: [...openChannelTypes],
      };
    };
    return {
      ...OUTBOUND_CONFIG,
      groups: OUTBOUND_CONFIG.groups.map((group) => {
        // Teams' own "Choose team" sub-picker — per explicit request,
        // picking a team here swaps this group's `contacts` from the
        // (now-unused-as-a-list) team records over to that team's real
        // member agents (`OUTBOUND_TEAM_MEMBERS`), so the existing search
        // box then filters those members exactly like it already does for
        // every other group — `contactMatchesSearch`/`activeGroupContacts`
        // (create-new.tsx) need no changes for this. With no team picked
        // yet, `contacts` is empty and `emptyMessage` prompts the agent to
        // pick one above instead of showing "No favorited teams yet",
        // which would be misleading before any team is even chosen.
        if (group.id === "teams") {
          const members = selectedOutboundTeamId ? OUTBOUND_TEAM_MEMBERS[selectedOutboundTeamId] ?? [] : [];
          return {
            ...group,
            contacts: members.map(tagOpenChannels),
            emptyMessage: selectedOutboundTeamId
              ? "No favorited agents in this team yet"
              : "Choose a team above to see its agents",
            subFilter: {
              ariaLabel: "Choose team",
              placeholder: "Choose a team",
              value: selectedOutboundTeamId,
              options: OUTBOUND_TEAMS.map((team) => ({ value: team.id, label: team.name })),
              onChange: setSelectedOutboundTeamId,
            },
          };
        }
        if (!group.contacts) return group;
        return {
          ...group,
          contacts: group.contacts.map(tagOpenChannels),
        };
      }),
    };
  }, [interactions, selectedOutboundTeamId]);

  // Every "Agent Next Gen" consumer (this app, AgentNextGenTemplate.
  // stories.tsx, LeftNav.stories.tsx's "Agent Next Gen Left Nav" story,
  // InteractionNavItem.stories.tsx) wants the exact same "+" behavior on
  // each InteractionNavItem card — look up that interaction's underlying
  // outbound contact and scope the flyout to whatever channels it actually
  // supports. That's `useOutboundAddButton` (lyra-ui) — a single shared
  // implementation instead of hand-copied ones that could (and did) quietly
  // drift out of sync.
  //
  // No more `launchRequest`/`onLaunchRequestHandled` here — `OutboundAddButton`
  // is fully self-contained now (per explicit request: adding a channel from
  // an already-open interaction's own "+" was popping the detail form up
  // next to the LeftNav's separate "New Outbound" trigger instead of right
  // where the "+" was clicked). The picked channel's whole detail form
  // (Select Channel/Select Address/Outbound Skill/Start Interaction) now
  // renders in that same small popover, and `onStartCall` fires directly —
  // no hand-off to the LeftNav's own `CreateNew` instance for this flow.
  //
  // `onStartCall: handleStartCall` override is required here, same as the
  // LeftNav's own `<CreateNew outbound={{...outboundConfig, onStartCall:
  // handleStartCall, ...}}>` wiring below — `outboundConfig` itself still
  // carries `OUTBOUND_CONFIG`'s placeholder `onStartCall` (just a
  // console.log, see its own definition), not the real handler. Passing
  // the bare `outboundConfig` here was a real, shipped bug: pressing
  // "Start Interaction" from this button silently logged instead of
  // actually opening a card, since `useOutboundAddButton`'s `getHeaderAction`
  // calls `outboundConfig.onStartCall?.(selection)` directly (create-new.tsx).
  const { getHeaderAction } = useOutboundAddButton({ ...outboundConfig, onStartCall: handleStartCall });

  /* Welcome modal — shown once on page load; "Go Available" flips the agent
     to Available, "Start Unavailable" keeps them Unavailable (the default
     state). lyra-ui's `AgentStatus` dropped "offline" (just
     Available/Unavailable now), so this no longer keeps the agent
     "Offline" — Unavailable is the closest equivalent starting state. */
  const handleGoAvailable = () => {
    handleStatusChange("available");
    setShowWelcomeModal(false);
  };
  const handleStartUnavailable = () => {
    handleStatusChange("unavailable");
    setShowWelcomeModal(false);
  };

  // Open/close animation state machine for the single shared panel — mounts
  // on open, transitions through the shared fade/slide animation on close,
  // then unmounts. Previously a generic `usePanelOpenEffect` factory called
  // once per panel (five times); with only one physical container now,
  // there's only one caller, so it's inlined rather than kept as a
  // factory-of-one.
  useEffect(() => {
    clearTimeout(panelAnimTimer.current);
    if (panelOpen) {
      if (containerRef.current && panelFloatLeft.current === null) {
        const r = containerRef.current.getBoundingClientRect();
        panelFloatLeft.current = r.left + containerRef.current.offsetWidth - panelWidth - 16;
      }
      setPanelHeight(computePanelHeight());
      setPanelMounted(true);
      setPanelState("open");
    } else {
      setPanelState("closing");
      setPanelFullScreen(false);
      panelAnimTimer.current = setTimeout(() => setPanelState("closed"), 150);
    }
    return () => clearTimeout(panelAnimTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelOpen]);

  // Shrink panel height with viewport when open
  useEffect(() => {
    if (!panelOpen) return;
    const onResize = () => setPanelHeight(computePanelHeight());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelOpen]);

  // Same "outlive the boolean so the exit transition can play" shape as
  // the `panelOpen`/`panelState` effect above, scoped to fullscreen alone
  // — per explicit request for an animation on the fullscreen
  // expand/collapse toggle. Entering: mount immediately (still at the
  // "hidden" style, `fullScreenVisible` starts false) then flip
  // `fullScreenVisible` true one frame later, so the fade/scale-in CSS
  // transition (`sharedPanelFullScreenOverlay`'s own styles, below) has a
  // real prior frame to animate from — see `fullScreenVisible`'s own doc
  // comment for why that two-step is needed. Exiting: flip
  // `fullScreenVisible` false right away (starts the fade/scale-out
  // immediately) and only unmount (`fullScreenRendered` false) 180ms
  // later, once that transition has actually finished playing.
  useEffect(() => {
    if (panelFullScreen) {
      clearTimeout(fullScreenAnimTimer.current);
      setFullScreenRendered(true);
      // Double rAF, not a single one — the classic gotcha here is that a
      // single `requestAnimationFrame` callback can still land in the SAME
      // frame as the commit that mounted the "hidden" style (browsers run
      // due rAF callbacks before that frame's own layout/paint), so the
      // "hidden" style never actually gets painted and there's nothing
      // for the transition to visibly animate from — the element just
      // pops straight to visible instead. Waiting for a second frame
      // guarantees the first one (with `fullScreenVisible` still false)
      // has genuinely been painted before flipping it to true.
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setFullScreenVisible(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    setFullScreenVisible(false);
    clearTimeout(fullScreenAnimTimer.current);
    fullScreenAnimTimer.current = setTimeout(() => setFullScreenRendered(false), 180);
    return () => clearTimeout(fullScreenAnimTimer.current);
  }, [panelFullScreen]);

  // When docking: capture actual rendered position (includes CSS transform
  // drag offset) before the float wrapper unmounts — restored when
  // undocking. The old "only one of five may be docked" exclusivity check
  // (`dockPanelExclusively`) is gone — with a single shared container
  // there's only ever one panel to dock in the first place.
  //
  // Width works the other direction: docking (float -> docked) always
  // resets to `SHARED_PANEL_DEFAULT_WIDTH`, full stop — per explicit
  // request, re-docking should land on the panel's true starting width
  // "regardless of how wide they've been dragged." An earlier version of
  // this only reset to whatever width the panel had at the MOMENT it was
  // last undocked (captured in a `panelDockedWidthBeforeUndock` ref) — that
  // covered a resize while floating, but not a resize that happened while
  // DOCKED: `Draggable`'s own `onWidthChange` (wired to `setPanelWidth`
  // below, near `sharedPanel`) fires the same way regardless of variant, so
  // dragging the panel's edge while it's already docked also changes
  // `panelWidth` directly — and that resized value would then get
  // snapshotted as the "restore to" target on the NEXT undock, quietly
  // leaking a docked-resize into a later re-dock. Hardcoding the true
  // default here instead of snapshotting "whatever it was" closes that gap
  // — there's no state left to leak from either direction.
  const handlePanelVariantChange = (v: DraggableVariant) => {
    if (v === "docked") {
      if (panelRef.current) {
        const r = panelRef.current.getBoundingClientRect();
        panelFloatLeft.current = r.left;
        panelFloatTop.current  = r.top;
      }
      setPanelWidth(SHARED_PANEL_DEFAULT_WIDTH);
    }
    setPanelVariant(v);
  };

  // The fullscreen overlay's own "drag mode" toggle (see
  // `sharedPanelFullScreenOverlay` below) — fullscreen bypasses `Draggable`
  // entirely, so it never receives `Draggable`'s own built-in dock button;
  // this is the equivalent action for getting from fullscreen straight into
  // float, at its MAXIMUM size (`SHARED_PANEL_MAX_WIDTH`/`computePanelHeight()`
  // — already "as tall as the viewport allows, capped at `MAX_PANEL_HEIGHT`")
  // rather than resuming whatever size the panel happened to be before
  // entering fullscreen, per explicit request. Safe to just set
  // `panelWidth`/`panelHeight` directly (unlike a live prop update to an
  // already-mounted `Draggable`, which wouldn't actually resize it — see
  // `SHARED_PANEL_MAX_WIDTH`'s own doc comment on `Draggable` never
  // resyncing its internal `width` from `defaultWidth` after mount): the
  // docked/float wrapper blocks below are both gated on `!panelFullScreen`,
  // so `Draggable` is always fully unmounted while fullscreen is active —
  // switching out of it always mounts a FRESH instance, which reads these
  // as its own `defaultWidth`/`defaultHeight` at that fresh mount. Toggling
  // back out of float from here works exactly like any other float panel —
  // `Draggable`'s own built-in dock button re-docks it to the side, same as
  // always (`handlePanelVariantChange`, above), which now always resets to
  // `SHARED_PANEL_DEFAULT_WIDTH` on its own — nothing needs capturing here
  // first, unlike before.
  const handleFullScreenToDragMode = () => {
    setPanelWidth(SHARED_PANEL_MAX_WIDTH);
    setPanelHeight(computePanelHeight());
    setPanelFullScreen(false);
    setPanelVariant("float");
  };

  // Float position — absolute viewport coordinates, anchored via
  // `panelFloatLeft`/`panelFloatTop` once set. No more per-panel z-index
  // "bring to front" competition (`topPanel`) — there's only ever one
  // floating panel now, so it's always topmost.
  const getPanelFloatStyle = (): React.CSSProperties => {
    const rect = containerRef.current?.getBoundingClientRect();
    const left = panelFloatLeft.current !== null
      ? panelFloatLeft.current
      : containerRef.current
        ? (rect?.left ?? 0) + containerRef.current.offsetWidth - panelWidth - 16
        : 0;
    const top = panelFloatTop.current !== null
      ? panelFloatTop.current
      : (rect?.top ?? 0);
    // Below the app-header menus' own `z-[9999]` (the "View All Apps" kebab
    // dropdown, menu-radix.tsx; the app-switcher popover a few hundred
    // lines up) — this used to be `10000`, one higher, so a floated panel
    // rendered ON TOP of either menu instead of under it (confirmed via
    // screenshot: the Customers panel covering the open kebab dropdown).
    // Still comfortably above the rest of the page's own z-index tiers
    // (AppHeader/Draggable's internal chrome top out around `z-20`).
    return { position: "fixed", top, left, zIndex: 40 };
  };

  // ── Content for each button ──
  /* "New Assignment"/"Escalation" notification click — opens (or re-focuses)
     a real assignment card in the LeftNav, same merge-by-id + "expand the
     nav, open the Customer Information panel" pattern `handleQuickDial`/
     `handleRedial` already use. Channel comes from `NOTIFICATION_CHANNEL`
     (falling back to "email" for any id not listed there) — see that map's
     own doc comment for why this stays a small app-local lookup rather
     than a field on `AgentNotification` itself.

     Keyed by a REAL `CREATE_NEW_CUSTOMERS` id — deterministically picked
     from the notification's own id (`Number(notification.id) % ...length`,
     not random, so re-clicking the same notification always resolves to the
     same card) — rather than a synthetic `notif:${id}` one. This is the
     exact same case `handleRedial`'s own doc comment above describes:
     `useOutboundAddButton`'s `getHeaderAction` looks up an interaction's id
     in `outboundConfig.groups` to resolve its "+" Add Channel button — a
     synthetic id never matches, so `getHeaderAction` returns no button at
     all for it. Using a real customer id here means notification-opened
     assignments get a working Add Channel button just like any other
     assignment, while still displaying the notification's own name
     (`customerName` below), since the merge branch further down never
     overwrites an existing card's `customerName`. */
  const handleOpenAssignmentFromNotification = (notification: AgentNotification) => {
    const customerIdx = Number(notification.id) % CREATE_NEW_CUSTOMERS.length;
    const id = CREATE_NEW_CUSTOMERS[Number.isFinite(customerIdx) ? customerIdx : 0].id;
    // Read before `setInteractions` below — see `handleStartCall`'s own
    // `isNewInteraction` comment for why.
    const isNewInteraction = !interactions.some((i) => i.id === id);
    const channel = NOTIFICATION_CHANNEL[notification.id] ?? "email";
    const newChannel: TrackedChannel = {
      id: channel,
      type: channel,
      startTick: clockTick,
      interactionId: generateInteractionId(),
    };
    setInteractions((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) {
        // NOT `startedFresh: true` here, unlike `handleStartCall`'s own
        // new-card branch — a notification (new case/escalation/agent
        // chat) represents an already-existing, already-routed
        // conversation with real prior history (e.g. Ethan Zhang's "New
        // SMS" notification), not a brand-new outbound interaction the
        // agent is originating from scratch. Marking it fresh made
        // clicking that notification wrongly show `InteractionTranscript`'s
        // empty "session details only" state instead of its full mock
        // conversation — `startedFresh` must stay reserved for the actual
        // agent-initiated launch paths (`handleStartCall`/`handleQuickDial`/
        // `handleRedial`).
        return [...prev, {
          id,
          customerName: notification.subtitle,
          recordId: generateCaseId(),
          channels: [newChannel],
          currentChannelId: newChannel.id,
        }];
      }
      return prev.map((interaction, i) =>
        i === idx
          // `channels: [newChannel]` wholesale-replaces every previous
          // channel here too (same as the other launch paths above) — this
          // one doesn't reset `channelStatuses` (pre-existing, unrelated to
          // this fix), but `liveMessages` does need clearing: `newChannel.id`
          // reuses a fixed per-notification channel type/id, so without
          // this, opening the same notification-backed assignment again
          // could reopen it still showing a stale previous conversation
          // under that reused key.
          ? { ...interaction, channels: [newChannel], currentChannelId: newChannel.id, liveMessages: undefined }
          : interaction
      );
    });
    switchActiveInteraction(id);
    if (isNewInteraction) setSidePanelOpen(lastSidePanelOpenChoice.current);
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
  };

  // Notifications' real content — same `useAgentNotificationsContent`
  // hook `AgentNotifications` calls internally (agent-notifications.tsx
  // in lyra-ui) — so this app gets its actual body, not a reimplemented
  // copy. Called unconditionally every render (Rules of Hooks) regardless
  // of whether that content is the one currently showing.
  const notifContent = useAgentNotificationsContent({
    notifications,
    onMarkAllRead: () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
    onClearAll: () => setNotifications([]),
    onDismiss: (id: string) => setNotifications((prev) => prev.filter((n) => n.id !== id)),
    // "New Assignment" (`type: "new-case"`) and "Escalation" notifications
    // both open a real assignment. "New Agent Chat" (`type:
    // "new-agent-chat"`, e.g. Sarah Miller) is different from either —
    // per explicit request, clicking it doesn't open an assignment card at
    // all, it switches the shared header panel straight from Notifications
    // to Agent Chat (the renamed "Conversations" panel — see
    // `PANEL_KEY_METADATA.conversations`), since an agent-to-agent chat
    // lives there, not in the interaction list. The rest (New Chat/Missed
    // Call) keep the original "just mark it read" behavior, since they
    // don't represent anything this app actually models opening.
    onNotificationClick: (n: AgentNotification) => {
      if (n.type === "new-case" || n.type === "escalation") {
        handleOpenAssignmentFromNotification(n);
        return;
      }
      if (n.type === "new-agent-chat") {
        handlePanelButtonClick("conversations")();
        setNotifications((prev) => prev.map((i) => i.id === n.id ? { ...i, read: true } : i));
        return;
      }
      setNotifications((prev) => prev.map((i) => i.id === n.id ? { ...i, read: true } : i));
    },
  });
  // Schedule — basic Day/Week calendar shell (SchedulePanel.tsx, new this
  // session, app-only — not added to lyra-ui). Called unconditionally here
  // (a real hook, own local view/anchorDate state), same as any other
  // panel-content builder in this block.
  const scheduleContent = useScheduleContent();
  // Agent Chat — no bespoke component (same blank empty-state
  // `DraggablePanel` itself defaults to when given no children).
  const blankPanelContent = (title: string): EmbeddablePanelContent => ({
    title,
    body: (
      <div className="overflow-y-auto flex-1 flex items-center justify-center p-4">
        <p className="lyra-body-md text-lyra-fg-disabled text-center">Nothing here yet.</p>
      </div>
    ),
  });
  // Screen Pop — same blank body, plus a Select (which external app to pop
  // the current contact/record into) in `headerContent` (fixed above the
  // divider, alongside the title row) rather than the scrollable body, so
  // it stays put — no `label` since the field sits in the header, not a
  // body form, where a label would be redundant.
  const screenPopContent: EmbeddablePanelContent = {
    title: "Screen Pop",
    headerContent: (
      <Select
        placeholder="Select an app..."
        options={SCREEN_POP_APPS}
        value={screenPopApp}
        onValueChange={setScreenPopApp}
      />
    ),
    // "Salesforce"/"Zendesk" are mocked in place, not actually embedded —
    // see `MockLoginCard`'s own doc comment (near `SCREEN_POP_APPS`) for
    // why a real iframe of either login page isn't possible.
    body:
      screenPopApp === "salesforce" ? (
        <MockLoginCard
          appName="Salesforce"
          accent="#0176d3"
          logo={
            <svg viewBox="0 0 48 30" className="w-24 h-auto mb-4" aria-hidden="true">
              <path
                fill="#00A1E0"
                d="M19.5 6.6c1.5-1.6 3.6-2.6 6-2.6 3.1 0 5.8 1.7 7.3 4.3.9-.4 1.9-.6 3-.6 3.9 0 7.1 3.2 7.1 7.1s-3.2 7.1-7.1 7.1c-.5 0-.9 0-1.4-.1-.9 1.6-2.6 2.7-4.5 2.7-.8 0-1.6-.2-2.3-.5-.9 2.1-3 3.6-5.5 3.6-2.6 0-4.8-1.6-5.7-3.9-.4.1-.8.1-1.2.1-3.3 0-6-2.7-6-6 0-2.2 1.2-4.2 3-5.2-.1-.4-.1-.8-.1-1.2 0-3.6 2.9-6.5 6.5-6.5 1.4 0 2.7.4 3.9 1.2"
              />
            </svg>
          }
        />
      ) : screenPopApp === "zendesk" ? (
        <MockLoginCard
          appName="Zendesk"
          accent="#03363d"
          usernameLabel="Email"
          usernamePlaceholder="you@company.com"
          buttonLabel="Sign in"
          footerLink="Forgot my password"
          logo={
            <div className="flex flex-col items-center gap-2 mb-5">
              <svg viewBox="0 0 40 40" className="w-10 h-10" aria-hidden="true">
                <rect x="4" y="4" width="14" height="14" rx="3" fill="#03363D" />
                <circle cx="29" cy="11" r="7" fill="#03363D" />
                <rect x="4" y="22" width="14" height="14" rx="7" fill="#03363D" />
                <rect x="22" y="22" width="14" height="14" rx="3" fill="#03363D" />
              </svg>
              <span className="text-lg font-bold text-[#03363D] tracking-tight lowercase">Zendesk</span>
            </div>
          }
        />
      ) : (
        <div className="overflow-y-auto flex-1 flex items-center justify-center p-4">
          <p className="lyra-body-md text-lyra-fg-disabled text-center">Nothing here yet.</p>
        </div>
      ),
  };
  // Search — same blank body as Agent Chat/Schedule, plus a
  // `SearchInput` in `headerContent` (same "fixed above the divider"
  // treatment Screen Pop's app-select uses above) rather than a body
  // form field, so the query box stays put as results (once there's a
  // real data source) would scroll below it.
  const searchContent: EmbeddablePanelContent = {
    title: "Search",
    headerContent: (
      <SearchInput
        value={globalSearchQuery}
        onValueChange={setGlobalSearchQuery}
        placeholder="Search..."
        size="sm"
      />
    ),
    body: (
      <div className="overflow-y-auto flex-1 flex items-center justify-center p-4">
        <p className="lyra-body-md text-lyra-fg-disabled text-center">Nothing here yet.</p>
      </div>
    ),
  };
  const contentByPanelKey: Record<PanelKey, EmbeddablePanelContent> = {
    notif: notifContent,
    conversations: blankPanelContent("Agent Chat"),
    schedule: scheduleContent,
    screenpop: screenPopContent,
    customers: blankPanelContent("Customers"),
    accounts: blankPanelContent("Accounts"),
    tickets: blankPanelContent("Tickets"),
    // WEM = Workforce Engagement Management
    wem: blankPanelContent("WEM"),
    search: searchContent,
  };
  const activePanelContent = activePanelKey ? contentByPanelKey[activePanelKey] : null;

  // Below 768px, a DOCKED (not floating) open panel combines with the main
  // container into a single container with two tabs — one for whatever the
  // main view currently is (Settings/an active interaction/Home), one for
  // the panel — instead of sitting docked beside it. `panelOpen` is
  // required (not just `activePanelContent`, which stays non-null after
  // closing — `handlePanelButtonClick` never clears `activePanelKey`, only
  // `panelOpen`) so this doesn't stay "true" for a panel that's actually
  // closed.
  const isCombinedPanelMode = isNavNarrow && panelOpen && panelVariant === "docked" && !!activePanelContent;
  const mainRegionTabLabel = showSettings
    ? "Settings"
    : activeInteraction
      ? `${activeInteraction.customerName ?? "Customer"} (${activeInteraction.recordId})`
      : "Home";

  // Clicking a button: re-clicking the CURRENTLY showing one closes the
  // shared container outright. Otherwise, if it's closed, open it docked
  // (see `panelVariant`'s own doc comment above); if it's already open
  // showing a DIFFERENT key, only `activePanelKey` changes — the container
  // itself never resizes, repositions, or re-animates open+close, only its
  // title/body content does.
  const handlePanelButtonClick = (key: PanelKey) => () => {
    if (panelOpen && activePanelKey === key) {
      setPanelOpen(false);
      return;
    }
    if (!panelOpen) {
      setPanelVariant("docked");
      setPanelOpen(true);
    }
    setActivePanelKey(key);
    // Below 768px, opening a panel switches straight to its tab — otherwise
    // clicking a header icon while narrow would silently open the panel
    // behind whatever the main tab currently shows, with no visible change.
    if (isNavNarrow) setNarrowActiveRegion("panel");
  };

  // "Selected" treatment for whichever AppHeader icon button currently owns
  // the shared panel — same `bg-lyra-bg-active-moderate`/`text-lyra-fg-
  // active-strong` "active" idiom `PanelPinButton`/`LeftNav`/`Tabs` already
  // use elsewhere in the design system (also now `NotificationsBell`'s own
  // open state, notifications-bell.tsx), not a plain hover tint. Matches
  // lyra-ui's own "Multiple Containers" Storybook demos (`Draggable.
  // stories.tsx`), which use this exact class for the same purpose.
  const PANEL_BUTTON_SELECTED_CLASS = "bg-lyra-bg-active-moderate text-lyra-fg-active-strong hover:bg-lyra-bg-active-moderate";

  // Per-key label/icon used to build the "View All Apps" menu rows below —
  // same labels/icons as the header buttons' own `title`/child-icon pairs
  // above, just centralized so the menu doesn't hand-duplicate them.
  // "notif" uses `Bell` here (a plain menu row), unlike the header itself,
  // which keeps using the specialized `NotificationsBell` component (badge
  // count, its own portal, etc.) for that one button.
  const PANEL_KEY_METADATA: Record<PanelKey, { label: string; icon: LucideIcon }> = {
    notif: { label: "Notifications", icon: Bell },
    conversations: { label: "Agent Chat", icon: MessageSquare },
    schedule: { label: "Schedule", icon: CalendarDays },
    screenpop: { label: "Screen Pop", icon: MonitorUp },
    customers: { label: "Customers", icon: Users },
    accounts: { label: "Accounts", icon: Building2 },
    tickets: { label: "Tickets", icon: Ticket },
    wem: { label: "WEM", icon: Gauge },
    search: { label: "Search", icon: Search },
  };
  const PANEL_KEY_INITIAL_ORDER: PanelKey[] = [
    "search", "customers", "accounts", "tickets", "wem",
    "screenpop", "conversations", "schedule", "notif",
  ];
  // Live, user-reorderable order for both the header icon row AND the "View
  // All Apps" menu — ONE shared hook instance/state so dragging either
  // surface updates the exact same array the other one reads, rather than
  // two independently-drifting copies. `useColumnReorder` (lyra-ui,
  // table.tsx) already implements exactly this — a generic `K extends
  // string`-keyed array plus native HTML5 drag handlers — for
  // `SortableTableHead`'s column reordering; reused as-is here rather than
  // hand-rolling a second copy of the same splice/dataTransfer logic.
  const {
    columnOrder: panelOrder,
    dragOverKey: panelDragOverKey,
    dragHandlers: panelDragHandlers,
  } = useColumnReorder<PanelKey>(PANEL_KEY_INITIAL_ORDER);
  // Each row: clicking it opens that app in the shared panel (same handler
  // the header icon uses) and closes the menu; the trailing `PanelPinButton`
  // toggles `pinnedKeys` without triggering that — Radix closes the menu on
  // any click inside an item by default, so the pin button's own click is
  // wrapped in a `stopPropagation` span to both keep the menu open and avoid
  // also firing the row's `onClick` (which would open that app's panel too).
  // `draggable`/`onDragStart`/etc. wire this row into the exact same
  // `panelDragHandlers` the header icon buttons below use — dragging a row
  // here to reorder it moves the same underlying `panelOrder` array the
  // header reads, and vice versa.
  //
  // Customers/Accounts/Tickets/WEM are hidden from this menu specifically
  // (per explicit request) — `panelOrder`/`pinnedKeys` themselves are
  // untouched, so Customers (already pinned) keeps its header icon; Accounts/
  // Tickets/WEM (already unpinned) simply have no way to open them anymore,
  // since this menu was their only entry point.
  const HIDDEN_FROM_APPS_MENU: PanelKey[] = ["customers", "accounts", "tickets", "wem"];
  const appsMenuItems: MenuEntry[] = panelOrder.filter((key: PanelKey) => !HIDDEN_FROM_APPS_MENU.includes(key)).map((key) => {
    const { label, icon: KeyIcon } = PANEL_KEY_METADATA[key];
    return {
      id: key,
      label,
      icon: <KeyIcon className="h-4 w-4" strokeWidth={1.5} />,
      // Mirrors the header icon buttons' own `PANEL_BUTTON_SELECTED_CLASS`
      // condition — whichever app currently owns the shared panel gets the
      // same blue "active" row treatment here (MenuRadixItem's `item.active`
      // branch) that its header icon gets.
      active: panelOpen && activePanelKey === key,
      onClick: handlePanelButtonClick(key),
      // Selecting an app should just switch the shared panel to it, the
      // same way clicking its header icon would — not also close this
      // menu, since a caller might want to pin/unpin or jump between
      // several apps in one pass without it snapping shut after the first.
      closeOnSelect: false,
      draggable: true,
      dragOver: panelDragOverKey === key,
      onDragStart: (e) => panelDragHandlers.onDragStart(e, key),
      onDragOver: (e) => panelDragHandlers.onDragOver(e, key),
      onDrop: (e) => panelDragHandlers.onDrop(e, key),
      onDragEnd: panelDragHandlers.onDragEnd,
      onDragLeave: panelDragHandlers.onDragLeave,
      rightElement: (
        <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Same unread count `NotificationsBell`'s own header icon shows
              (`notifications.filter((n) => !n.read).length`) — reused here,
              not recomputed with different criteria, so this row can't tell
              a different story than the icon it's a menu-row stand-in for.
              `Badge`'s own `shape="circle"`/`variant="critical"`/`size="sm"`
              is the exact styling `Button`'s built-in `badge` prop already
              uses for this same count elsewhere (button.tsx) — reused
              directly since a `Menu` row's `rightElement` isn't an
              icon-shaped `Button`/`ActionIconButton` itself, so that prop
              isn't available here the way it is on the header icon. */}
          {key === "notif" && notifications.filter((n) => !n.read).length > 0 && (
            <Badge shape="circle" variant="critical" size="sm" count={notifications.filter((n) => !n.read).length} />
          )}
          <PanelPinButton
            pinned={pinnedKeys[key]}
            onToggle={() => setPinnedKeys((prev) => ({ ...prev, [key]: !prev[key] }))}
            pinnedLabel={`Unpin ${label}`}
            unpinnedLabel={`Pin ${label}`}
            // Notifications used to be forced pinned here (`disabled` +
            // hardcoded `pinnedLabel` explaining why) — per explicit
            // request it's unpinnable like every other app now. Unpinning
            // it just stops rendering `NotificationsBell` in the header
            // (same `showHeaderIcon` gate every other key already goes
            // through, see that loop below) — it doesn't lose the count
            // itself, which reappears as a badge on "View All Apps" instead
            // (see that button's own `badge` prop below), so an unread
            // notification is never silently unreachable.
            //
            // Only override the icon/className when PINNED — unpinned rows
            // pass neither prop, so they fall straight through to
            // `PanelPinButton`'s own untouched default rendering (plain gray
            // outline Pin, no rotation since `pinned` is false), exact same
            // as before this change. Pinned rows get a custom solid blue pin
            // (`fill-lyra-fg-active-strong` + matching `text-*`, same
            // "filled + colored icon" idiom `FavoriteButton`'s star already
            // uses) instead of the default's plain 45°-rotated outline Pin.
            // Passing a custom `icon` also opts this into `PanelPinButton`'s
            // "selected button background" treatment — not wanted here,
            // just the icon itself should read as filled/blue — so
            // `className` overrides that back to transparent (twMerge drops
            // the conflicting `bg-*`), also only when pinned.
            icon={
              pinnedKeys[key] ? (
                <Pin className="h-4 w-4 rotate-45 fill-lyra-fg-active-strong text-lyra-fg-active-strong" strokeWidth={1.5} />
              ) : undefined
            }
            className={pinnedKeys[key] ? "bg-transparent hover:bg-lyra-state-hover" : undefined}
          />
        </span>
      ),
    };
  });

  // ── Responsive header icon collapse ──
  // As the viewport narrows, the pinned icon-button row can eventually run
  // out of room and squish/wrap `AppName` ("Agent Next Gen") instead — so
  // rather than letting that happen, buttons drop out of the header one at
  // a time, always starting with the FARTHEST LEFT pinned one in the
  // *current* (user-reorderable) `panelOrder` — since that's the icon
  // nearest `AppName` and the first to collide with it as space runs out,
  // dragging a button further right also moves it further down the "gets
  // hidden first" list. A dropped button isn't gone — same as unpinning it,
  // it just stops rendering in the header and stays reachable via "View All
  // Apps" (`appsMenuItems` above lists every key regardless of pinned/
  // responsively-hidden state).
  //
  // This used to be a table of fixed viewport-width breakpoints, which
  // hid icons well before they actually needed the room (lots of dead space
  // between `AppName` and the icons at widths that were already hiding
  // several of them) and didn't account for anything BUT window width
  // (e.g. a wider/narrower `AppName` — it hardcodes "Agent Next Gen" today,
  // but AppMenu/AppName are generic). Replaced with real geometry: measure
  // the actual gap between `AppName`'s rendered right edge
  // (`appNameMeasureRef`) and the visible icon row's rendered left edge
  // (`headerIconsMeasureRef`) after every layout, and only hide/reveal a
  // icon when that gap actually crosses a threshold — i.e. when they're
  // genuinely about to collide, not on a width guess. A small hysteresis
  // gap (`SHOW_GAP_PX` well above `HIDE_GAP_PX`) keeps this from
  // flapping — hiding an icon frees up roughly one icon's width of gap,
  // which would otherwise immediately clear the "show one back" threshold
  // and re-show it next frame.
  const pinnedKeysInHeaderOrder = panelOrder.filter((key) => pinnedKeys[key]);
  const appHeaderRef = useRef<HTMLElement>(null);
  const appNameMeasureRef = useRef<HTMLDivElement>(null);
  const headerIconsMeasureRef = useRef<HTMLDivElement>(null);
  const [autoHiddenCount, setAutoHiddenCount] = useState(0);
  useLayoutEffect(() => {
    const HIDE_GAP_PX = 16; // start hiding once closer than this
    const SHOW_GAP_PX = 84; // ~44px icon + gap, plus headroom above HIDE_GAP_PX so it doesn't immediately re-show what was just hidden
    const measure = () => {
      const appNameEl = appNameMeasureRef.current;
      const iconsEl = headerIconsMeasureRef.current;
      if (!appNameEl || !iconsEl) return;
      const gap = iconsEl.getBoundingClientRect().left - appNameEl.getBoundingClientRect().right;
      setAutoHiddenCount((prev) => {
        if (gap < HIDE_GAP_PX && prev < pinnedKeysInHeaderOrder.length) return prev + 1;
        if (gap > SHOW_GAP_PX && prev > 0) return prev - 1;
        return prev;
      });
    };
    measure();
    // Widening the window back out doesn't necessarily change either
    // measured element's OWN size — once `AppName` is back to its natural
    // width and the hidden icons are gone, both boxes can sit still while
    // `justify-between` just grows the empty space between them, so a
    // ResizeObserver on only those two elements can miss the "there's now
    // room again" case entirely (this was the bug: icons stayed hidden
    // after growing the window back, even once the gap ,`prev` never
    // re-evaluated because nothing observed had actually changed size). The
    // header's OWN box, and the window itself, reliably do change size on
    // every resize regardless of whether `AppName`/the icon row happen to
    // — observing/listening to those too guarantees at least one
    // `measure()` call per resize either way.
    const ro = new ResizeObserver(measure);
    if (appHeaderRef.current) ro.observe(appHeaderRef.current);
    if (appNameMeasureRef.current) ro.observe(appNameMeasureRef.current);
    if (headerIconsMeasureRef.current) ro.observe(headerIconsMeasureRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // Re-measure whenever the pinned set changes (pinning/unpinning shifts
    // how many icons COULD show) and every time `autoHiddenCount` itself
    // changes — each change nudges the count by exactly one and re-runs
    // this effect, converging step by step rather than jumping straight to
    // a final value in one pass.
  }, [pinnedKeysInHeaderOrder.length, autoHiddenCount]);
  const responsivelyHiddenKeys = new Set(
    pinnedKeysInHeaderOrder.slice(0, Math.min(autoHiddenCount, pinnedKeysInHeaderOrder.length))
  );
  const showHeaderIcon = (key: PanelKey) => pinnedKeys[key] && !responsivelyHiddenKeys.has(key);

  // The one shared `Draggable` — its header (icon/actions/title) and body
  // swap to whichever button's content is active; the container itself
  // (variant/width/position) never does.
  const sharedPanel = panelMounted && activePanelContent ? (
    <Draggable
      ref={panelRef}
      variant={panelVariant}
      defaultWidth={panelWidth}
      defaultHeight={panelHeight}
      minWidth={280}
      maxWidth={SHARED_PANEL_MAX_WIDTH}
      minHeight={400}
      onVariantChange={handlePanelVariantChange}
      onWidthChange={setPanelWidth}
      onResizeStateChange={setPanelIsResizing}
      className={cn(
        "rounded-lyra-lg border border-lyra-border-subtle",
        // Floating (undocked/dragged) gets an 0.8 (80%) opacity background
        // per explicit request — plain `bg-lyra-bg-surface-base/80` can't
        // work here since Tailwind can't generate opacity-modified
        // utilities for our `var(--lyra-color-*)` tokens (same root cause
        // as the Modal backdrop's own `color-mix()` override, overlay.tsx/
        // AgentNextGenPage.tsx doc comments), so `color-mix()` directly
        // against the same `--lyra-color-bg-surface-base` variable the
        // plain utility itself resolves to (tailwind-preset.ts) is used
        // instead. Docked keeps the normal fully-opaque background.
        // `backdrop-blur-sm` (4px) — "blur the background slightly" —
        // softens whatever shows through that 20% transparency, same
        // pairing the Modal backdrop's own color-mix()-plus-backdrop-blur-sm
        // treatment already uses (entry-agent-next-gen-v2.tsx).
        panelVariant === "float"
          ? "shadow-lg backdrop-blur-sm bg-[color-mix(in_srgb,var(--lyra-color-bg-surface-base)_80%,transparent)]"
          : "h-full bg-lyra-bg-surface-base"
      )}
      renderHeaderControls={({ gripProps, dockButtonProps, dockIcon, variant: dVariant }) => (
        <>
          <ContainerHeader
            title={activePanelContent.title}
            titleBadge={activePanelContent.titleBadge}
            titleClassName={activePanelContent.titleClassName}
            icon={
              dVariant === "float"
                ? <div {...gripProps}><GripVertical className="h-4 w-4" strokeWidth={1.5} /></div>
                : activePanelContent.dockedIcon
            }
            bordered={!activePanelContent.headerContent}
            actions={
              <>
                {activePanelContent.headerActions}
                <Tooltip content="Full Screen" placement="bottom" asLabel>
                  <ActionIconButton
                    aria-label="Full Screen"
                    size="sm"
                    onClick={() => setPanelFullScreen(true)}
                    className="text-lyra-fg-secondary hover:text-lyra-fg-secondary"
                  >
                    <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </ActionIconButton>
                </Tooltip>
                <Tooltip content={dockButtonProps["aria-label"]} placement="bottom" asLabel>
                  <ActionIconButton
                    {...dockButtonProps}
                    size="sm"
                    className="text-lyra-fg-secondary hover:text-lyra-fg-secondary"
                  >
                    {dockIcon}
                  </ActionIconButton>
                </Tooltip>
              </>
            }
            onClose={() => setPanelOpen(false)}
          />
          {activePanelContent.headerContent && (
            <div className="shrink-0 px-4 pb-3 border-b border-lyra-border-subtle">
              {activePanelContent.headerContent}
            </div>
          )}
        </>
      )}
    >
      {activePanelContent.body}
    </Draggable>
  ) : null;

  // Fullscreen overlay for the shared panel — see `panelFullScreen`'s own
  // doc comment above for why this bypasses `Draggable` entirely rather
  // than trying to make its "float" variant cover the container. Mirrors
  // the Customer Information panel's header shape (title/icon/actions via
  // `ContainerHeader`, using the same `activePanelContent` the docked/float
  // rendering above uses) plus a `Minimize2` "exit full screen" action.
  // Positioned against `containerRef`'s own div (see where this is
  // rendered, below), which is already `relative` and is exactly the "main
  // content container" (everything right of LeftNav, below AppHeader) this
  // should fill; NOT `fixed`/the viewport, which would also cover LeftNav
  // and AppHeader. Deliberately NOT a plain `inset-0`, either — the
  // containing block for an absolutely positioned element is its
  // ancestor's PADDING box, so `right-0`/`bottom-0` would land flush with
  // containerRef's true outer edge, swallowing its own `pr-3 pb-3` (the
  // same gap the normal docked panel gets via its wrapper's `marginRight:
  // 12`/`pb-3`). Using `right-3 bottom-3` instead (matching `pr-3`/`pb-3`'s
  // 12px) reproduces that same gap so the fullscreen panel lines up with
  // where the docked panel's own right/bottom edges would sit — flush only
  // on top/left, matching the docked panel's own flush-top/flush-left
  // look. `rounded-lyra-lg border ... overflow-hidden` also matches
  // `sharedPanel`'s own docked-variant styling (and `Draggable`'s own
  // docked-branch wrapper, which always applies `overflow-hidden` — see
  // draggable.tsx) rather than the previous full-bleed/borderless look.
  // `z-[9]` sits above the Customer Information panel's `z-[5]` but
  // deliberately BELOW LeftNav's own collapse/expand toggle button
  // (`z-10`, left-nav.tsx) — that button is positioned `absolute -right-3`
  // (poking ~12px past LeftNav's own right edge, i.e. spatially into
  // `containerRef`'s territory), and `containerRef` itself doesn't
  // establish its own stacking context (no z-index of its own), so a
  // descendant's z-index here competes directly against LeftNav's
  // sibling-level z-10, not just against other things inside `containerRef`
  // — going any higher (e.g. the `z-[50]` this used originally) paints
  // over/hides that toggle button, per explicit follow-up request to keep
  // it clickable/visible instead. Doesn't need to compete with the
  // app-header's own menus (`z-[9999]`) — those live in a different row
  // entirely (above `containerRef`, not inside it).
  // Mounted on `fullScreenRendered` (which outlives `panelFullScreen` by
  // 180ms on the way out — see that state's own doc comment) rather than
  // `panelFullScreen` directly, so the fade/scale-out transition below
  // actually gets to play instead of the overlay just disappearing the
  // instant fullscreen is exited. The transition itself keys off
  // `fullScreenVisible`, NOT `panelFullScreen` directly — see that
  // state's own doc comment for why a freshly-mounted node needs a
  // separate "hidden first, visible one frame later" flag to actually
  // animate in, rather than just popping straight to its final opacity/
  // scale with nothing to transition from. CSS transition (not a
  // keyframe animation) per the same reasoning as the float/docked panels
  // just below — avoids compositor fill-mode flash. `scale`'s default
  // center origin reads fine here since this overlay already fills the
  // whole container; a corner-anchored origin would need `transformOrigin`
  // too, but center suits a "settle into place" feel just as well without
  // the extra complexity.
  const sharedPanelFullScreenOverlay = panelMounted && activePanelContent && fullScreenRendered ? (
    <div
      className="absolute top-0 left-0 right-3 bottom-3 z-[9] flex flex-col rounded-lyra-lg border border-lyra-border-subtle bg-lyra-bg-surface-base overflow-hidden"
      style={{
        opacity: fullScreenVisible ? 1 : 0,
        transform: fullScreenVisible ? "scale(1)" : "scale(0.98)",
        transition: fullScreenVisible
          ? "opacity 200ms ease, transform 200ms cubic-bezier(0.4, 0, 0.2, 1)"
          : "opacity 150ms ease, transform 150ms ease",
        pointerEvents: fullScreenVisible ? "auto" : "none",
      }}
    >
      <ContainerHeader
        title={activePanelContent.title}
        titleBadge={activePanelContent.titleBadge}
        titleClassName={activePanelContent.titleClassName}
        icon={activePanelContent.dockedIcon}
        bordered={!activePanelContent.headerContent}
        actions={
          <>
            {activePanelContent.headerActions}
            <Tooltip content="Exit Full Screen" placement="bottom" asLabel>
              <ActionIconButton
                aria-label="Exit Full Screen"
                size="sm"
                onClick={() => setPanelFullScreen(false)}
                className="text-lyra-fg-secondary hover:text-lyra-fg-secondary"
              >
                <Minimize2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              </ActionIconButton>
            </Tooltip>
            {/* "Drag mode" — see `handleFullScreenToDragMode`'s own doc
                comment for why this (not `Draggable`'s own dock button,
                which isn't mounted while fullscreen) is how fullscreen gets
                to float. Kept in the same relative position `Draggable`'s
                own dock button normally occupies (right after the
                full-screen toggle) so the header's button layout doesn't
                jump around across the transition. */}
            <Tooltip content="Undock" placement="bottom" asLabel>
              <ActionIconButton
                aria-label="Undock"
                size="sm"
                onClick={handleFullScreenToDragMode}
                className="text-lyra-fg-secondary hover:text-lyra-fg-secondary"
              >
                <Move className="h-3.5 w-3.5" strokeWidth={1.5} />
              </ActionIconButton>
            </Tooltip>
          </>
        }
        onClose={() => {
          setPanelFullScreen(false);
          setPanelOpen(false);
        }}
      />
      {activePanelContent.headerContent && (
        <div className="shrink-0 px-4 pb-3 border-b border-lyra-border-subtle">
          {activePanelContent.headerContent}
        </div>
      )}
      <div className="flex flex-col flex-1 min-h-0">{activePanelContent.body}</div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col h-screen bg-lyra-bg-surface-shell overflow-hidden animate-in fade-in-0 duration-500">

      {/* ── App Header ── */}
      <AppHeader
        ref={appHeaderRef}
        appName={
          // `appNameMeasureRef` — see "Responsive header icon collapse"
          // above — reads this wrapper's rendered right edge every layout
          // to decide whether the icon row on the other side of the header
          // is crowding it, so icons only hide once there's a real
          // overlap risk instead of a fixed viewport-width guess.
          <div ref={appNameMeasureRef} className="flex items-center">
            <PopoverPrimitive.Root open={appMenuOpen} onOpenChange={setAppMenuOpen}>
              <PopoverPrimitive.Trigger asChild>
                <AppName
                  icon={<img src={appIcon} alt="Agent Next Gen" className="h-6 w-6" />}
                  name="Agent Next Gen"
                  compact={isCompactHeader}
                  aria-expanded={appMenuOpen}
                />
              </PopoverPrimitive.Trigger>
              <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                  side="bottom"
                  align="start"
                  sideOffset={6}
                  onOpenAutoFocus={(e: Event) => e.preventDefault()}
                  className="z-[9999] animate-in fade-in-0 slide-in-from-top-2 duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 data-[state=closed]:duration-100"
                >
                  <AppMenu
                    groups={appMenuGroups}
                    footer={<CXoneLogo />}
                    header={isCompactHeader ? "Agent Next Gen" : undefined}
                  />
                </PopoverPrimitive.Content>
              </PopoverPrimitive.Portal>
            </PopoverPrimitive.Root>
          </div>
        }
        actions={
          <>
            {/* Search / Customers / Accounts / Tickets / WEM / Screen Pop /
                Agent Chat / Schedule / Notifications / Ask AI — all ten
                now go through lyra-ui's `ActionIconButton` (`size="xl"`,
                44px), the single canonical AppHeader icon-button shape.
                These used to be hand-rolled `<button>`s (`h-10 w-10
                rounded-lyra-lg`) matching `NotificationsBell`'s own
                trigger, which at the time was also hand-rolled rather than
                built on `ActionIconButton` — lyra-ui has since consolidated
                `NotificationsBell` and `ActionIconButton` onto one shared
                implementation (composing `Button` internally), with
                44px/`rounded-lyra-sm` as the confirmed canonical AppHeader
                size, so this row now matches `Header.tsx`'s (and lyra-ui's
                own `AppHeader.stories.tsx`) icon buttons instead of
                diverging from them. Labeled "Agent Chat" — renamed from
                "Conversations" (itself previously renamed from "Messages"),
                per explicit request tying it to the same click behavior
                Sarah Miller's "New Agent Chat" notification now switches to
                (see `onNotificationClick`'s own doc comment above) — same
                trigger/panel throughout, just the label. Screen Pop sits to
                the left of Agent Chat, using lucide's `MonitorUp` (monitor +
                up arrow) to match the requested icon exactly.

                Search/Customers/Accounts/Tickets/WEM all share the exact
                same single-container panel every other button here does
                (see `handlePanelButtonClick`/`contentByPanelKey` above) —
                each just shows its own blank placeholder body (Search gets
                a `SearchInput` in `headerContent` too, same "fixed above
                the divider" treatment Screen Pop's app-select uses), no
                bespoke content yet since none of the five has a real data
                source in this prototype. WEM = Workforce Engagement
                Management — `Gauge` (already used elsewhere on the Desk
                dashboard for a performance metric) reused here since it's
                the closest existing icon to "workforce performance/
                engagement" rather than importing a near-duplicate.

                Trailing "View All Apps" kebab (after Notifications, before
                the AgentProfile divider) lists all nine of these (via
                `appsMenuItems`, built above from `PANEL_KEY_METADATA`) with
                a pin toggle per row — unpinning one wraps its button above
                in `{showHeaderIcon("KEY") && ...}` (`pinnedKeys[key] &&
                !responsivelyHiddenKeys.has(key)`, see the "Responsive
                header icon collapse" block above), hiding the persistent
                header icon while leaving the app reachable from this menu
                (its `onClick` is the same `handlePanelButtonClick` the
                header icon itself uses). That same `showHeaderIcon` check
                is also what auto-hides pinned buttons left-to-right as the
                viewport narrows, so a small screen doesn't squish
                `AppName`. `KebabMenuButton` (not the hand-rolled
                `Menu`) because its rows render as Radix `<div
                role="menuitem">`s rather than `<button>`s — required here
                since each row nests a real `<button>` (`PanelPinButton`) in
                `rightElement`, which would be invalid HTML nested inside
                another button. Wrapped in `Tooltip`+`span` because
                `KebabMenuButton` doesn't spread arbitrary props onto its
                inner trigger, so `Tooltip`'s `asChild` cloning needs that
                intermediate span to attach its hover handlers (same fix
                already used for the "More options" overflow menu in
                lyra-ui's own agent-notifications.tsx). Sized up from its
                24px default to the 44px `ActionIconButton` standard via
                `className` (twMerge dedupes the conflicting h-6/w-6). Uses
                `align="right"` (its default) here since it now sits at the
                right end of the row, matching every other right-aligned
                overflow kebab in this file. */}
            {/* Search through Notifications used to be nine near-identical
                hand-written blocks (one per key); collapsed into a single
                `.map()` over the live, reorderable `panelOrder` (filtered to
                whichever are currently pinned-and-visible via
                `showHeaderIcon`) so drag-to-reorder only has to be wired up
                once. Each icon is wrapped in a plain draggable `<div>`
                rather than teaching `ActionIconButton`/`NotificationsBell`
                themselves about native HTML5 drag — same
                `panelDragHandlers`/`panelDragOverKey` the "View All Apps"
                menu rows below use, so dragging an icon here to reorder it
                moves the very same `panelOrder` array those rows read (and
                a drag in the menu reorders the header right back), rather
                than two independently-drifting orders. "notif" still
                renders the specialized `NotificationsBell` (badge count,
                its own `open`/`onOpenChange`) instead of a generic
                `ActionIconButton` — everything else comes straight out of
                `PANEL_KEY_METADATA`. `headerIconsMeasureRef` wraps just
                this visible row (not the kebab/separator/profile after it)
                — its rendered LEFT edge is the other half of the "Responsive
                header icon collapse" gap measurement above, alongside
                `appNameMeasureRef`. */}
            <div ref={headerIconsMeasureRef} className="flex items-center gap-1">
              {panelOrder.filter(showHeaderIcon).map((key) => {
                const { label, icon: KeyIcon } = PANEL_KEY_METADATA[key];
                const isActive = panelOpen && activePanelKey === key;
                return (
                  <div
                    key={key}
                    draggable
                    onDragStart={(e) => panelDragHandlers.onDragStart(e, key)}
                    onDragOver={(e) => panelDragHandlers.onDragOver(e, key)}
                    onDrop={(e) => panelDragHandlers.onDrop(e, key)}
                    onDragEnd={panelDragHandlers.onDragEnd}
                    onDragLeave={panelDragHandlers.onDragLeave}
                    className={cn(
                      "rounded-lyra-sm cursor-grab active:cursor-grabbing transition-colors",
                      panelDragOverKey === key && "bg-lyra-bg-active-moderate"
                    )}
                  >
                    {key === "notif" ? (
                      <NotificationsBell
                        notifications={notifications}
                        open={isActive}
                        onOpenChange={() => handlePanelButtonClick("notif")()}
                        renderPanel={false}
                      />
                    ) : (
                      <ActionIconButton
                        size="xl"
                        title={label}
                        aria-expanded={isActive}
                        onClick={handlePanelButtonClick(key)}
                        className={isActive ? PANEL_BUTTON_SELECTED_CLASS : undefined}
                      >
                        <KeyIcon className="h-5 w-5" strokeWidth={1.5} />
                      </ActionIconButton>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Separator between the icon-button row and the "View All
                Apps" kebab — same `orientation="vertical"` + `h-auto
                self-stretch` sizing lyra-ui's own vertical Separator usage
                uses elsewhere (see `dashboard-card.tsx`'s metric-row
                divider) so it stretches to match the row's height inside
                AppHeader's `flex items-center` actions container instead of
                a hand-picked fixed height. */}
            <Separator orientation="vertical" className="h-auto self-stretch pl-lyra-1 pr-lyra-1" />
            <Tooltip content="View All Apps" placement="bottom" disabled={appsMenuOpen}>
              <span className="inline-flex">
                <KebabMenuButton
                  items={appsMenuItems}
                  ariaLabel="View All Apps"
                  icon={<LayoutGrid className="h-5 w-5" strokeWidth={1.5} />}
                  // Same "outline" treatment as `Button`'s own `variant=
                  // "outline"` (button.tsx) — bordered/`bg-lyra-bg-control`
                  // rather than the plain borderless icon button every
                  // other AppHeader trigger uses, so this one reads as a
                  // distinct "more" control rather than just another app
                  // shortcut. `KebabMenuButton` isn't built on `Button`
                  // (it's its own hand-rolled trigger), so these classes are
                  // reproduced directly rather than passed as a `variant` prop.
                  className="h-11 w-11 rounded-lyra-sm border border-lyra-border-default bg-lyra-bg-control text-lyra-fg-action hover:bg-lyra-state-hover active:bg-lyra-state-pressed data-[state=open]:bg-lyra-state-hover"
                  onOpenChange={setAppsMenuOpen}
                  // Notifications is unpinnable now (see the `PanelPinButton`
                  // row above) — once it's unpinned (or responsively
                  // auto-hidden, `showHeaderIcon` covers both), its own
                  // `NotificationsBell` badge disappears from the header
                  // along with it. Surface the same unread count here
                  // instead, so an unread notification never goes
                  // completely invisible just because its icon is tucked
                  // away — only shown while the header ISN'T already
                  // showing that count itself, to avoid the same number
                  // appearing on two icons at once.
                  badge={!showHeaderIcon("notif") ? notifications.filter((n) => !n.read).length : undefined}
                />
              </span>
            </Tooltip>
            <AgentProfile
              name="John Smith"
              initials="JS"
              status={agentStatus}
              onStatusChange={handleStatusChange}
              onDarkModeToggle={handleDarkModeToggle}
              isDarkMode={darkMode}
              timer={formattedTimer}
              onAgentLegStatusChange={fireAgentLegStatusToast}
              // Standalone AppHeader "?" icon removed — this app now uses
              // `AgentProfile`'s own conditional "Help" row instead (renders
              // below "Agent Leg Disconnected" whenever `onHelpClick` is
              // passed; see agent-profile.tsx). Same destination/new-tab
              // behavior as the removed icon button.
              onHelpClick={() => window.open("https://help.nicecxone.com/content/agent/cxoneagent/cxoneagent.htm?cshid=CXoneAgent", "_blank", "noopener,noreferrer")}
              onLogOut={() => onNavigate?.("login")}
              // Per explicit request: this prototype has no real
              // integrations to surface here, so the status menu's
              // "Connected Apps" row (which otherwise always renders, even
              // with a permanently-empty "0" badge — see `hideConnectedApps`'s
              // own doc comment, agent-profile.tsx) is hidden outright.
              hideConnectedApps
              className="ml-1"
            />
          </>
        }
      />

      {/* ── Body: LeftNav + Content ── */}
      {/* overflow-hidden ensures docked panels never push layout past the viewport.
          ref measured by `bodyContainerRef` (see its own doc comment) — this
          row's own width drives `isNavNarrow`'s container query. */}
      <div ref={bodyContainerRef} className="flex flex-1 min-h-0 overflow-hidden">

        <LeftNav
          items={buildNavItems(
            Boolean(activeInteraction),
            () => { switchActiveInteraction(null); setShowSettings(false); },
            showSettings,
            () => { setShowSettings(true); switchActiveInteraction(null); }
          )}
          open={navOpen}
          onToggle={() => setNavOpen((v) => !v)}
          overlay={isNavNarrow}
          // Default (non-`itemsFirst`) order, per explicit follow-up
          // request: the "Assignments (N active)" caption + interaction
          // cards render FIRST (scrolling in the space below "New
          // Outbound"), and the Home/Settings rail renders LAST, `sticky
          // bottom-0` within that same scroll region — pinned to the
          // bottom of the nav whenever the card list is short enough to
          // leave slack, and sticking there as the list scrolls once it's
          // long enough to actually overflow, so cards scroll underneath/
          // behind the rail rather than the rail scrolling away with them.
          // (This app used to opt into `itemsFirst` — rail above the
          // caption/cards instead — per an earlier explicit request; that
          // request was superseded by this one.)
          //
          // "New Outbound" itself has moved several times now: started as
          // this exact `pinnedHeader` (fixed at the very TOP of the whole
          // rail, above the "Assignments" caption); moved to a `beforeItems`
          // slot (left-nav.tsx) pinning it to the STICKY BOTTOM rail
          // alongside Home/Settings (reverted — reported "problematic");
          // moved again to a plain child of `header`, scrolling directly
          // below the caption (reverted per THIS request — "move new
          // outbound back above assignments header"). Landed back here,
          // exactly where it started. `beforeItems` (added to left-nav.tsx
          // for the middle arrangement) was already removed entirely once
          // nothing used it — not re-added for this reversion since
          // `pinnedHeader` covers this exact spot on its own.
          pinnedHeader={
            <CreateNew
              title="New Outbound"
              outbound={{
                ...outboundConfig,
                onStartCall: handleStartCall,
                onQuickDial: handleQuickDial,
              }}
              expanded={navOpen}
            />
          }
          header={
            <>
              <AssignmentsSectionCaption
                expanded={navOpen}
                count={interactions.length}
                sort={assignmentSort}
                onSortChange={setAssignmentSort}
                allExpanded={channelsAllExpanded}
                onToggleAllExpanded={handleToggleAllChannelsExpanded}
              />
              {/* No cards until the agent actually starts one above — each
                  card is one contact (or quick-dialed number), with every
                  channel they're being reached on folded into that same
                  card unless it's a different address on an already-open
                  type, which opens as its own row instead (see
                  handleStartCall's merge-by-type+address logic). Sorted per
                  `assignmentSort` (`AssignmentsSectionCaption`'s own sort
                  button) — `interactions` itself stays in insertion order
                  for everything else that reads it, only this rendering
                  reorders a copy. */}
              {sortAssignments(interactions, assignmentSort).map((interaction) => {
                const mostRecentId = interaction.channels[interaction.channels.length - 1]?.id;
                const currentId = interaction.currentChannelId ?? mostRecentId;
                // Seconds since the CUSTOMER last wrote on this channel —
                // only meaningful (and only ever read) for a channel that's
                // actually awaiting, which per `hasCustomerResponded` below
                // can't be true without `lastCustomerMessageTick` also being
                // set, so this never actually falls back to `startTick` in
                // practice — kept as `?? c.startTick` only to satisfy the
                // type (`lastCustomerMessageTick` is optional).
                const channelAwaitingWaitSeconds = (c: TrackedChannel) =>
                  clockTick - (c.lastCustomerMessageTick ?? c.startTick);
                // Per explicit request: none of this card's timers (this
                // per-channel `elapsed` below, and the compact-tile
                // `elapsed`/`earliestStart` further down) should start
                // counting until the CUSTOMER has actually said something on
                // that channel — an agent-initiated channel that's still
                // waiting on the customer's very first reply has nothing to
                // measure yet ("since it opened" was a misleading reading
                // there: it made a freshly-dialed outbound channel look like
                // it'd already been waiting on someone). Once the customer
                // has responded at least once, `lastCustomerMessageTick` is
                // set for good (see its own doc comment) and every one of
                // these readings resumes exactly as before.
                const hasCustomerResponded = (c: TrackedChannel) => c.lastCustomerMessageTick !== undefined;
                const channels: InteractionChannel[] = interaction.channels.map((c) => {
                  // Identifies this specific channel's own Outcome popover —
                  // `c.id ?? c.type` is the same fallback `InteractionChannel
                  // .id`'s own doc comment establishes for "no id supplied,
                  // type alone is unique enough on this card"; prefixing the
                  // interaction id keeps it unique across DIFFERENT cards
                  // too, since `outcomeDraftKey` is one shared piece of
                  // state for the whole left nav (only one popover open at
                  // a time), not scoped per-card.
                  const outcomeKey = `${interaction.id}:${c.id ?? c.type}`;
                  // Per explicit request: a channel that's been explicitly
                  // closed (via the status popover), OR the whole interaction
                  // this card represents (a reopened-from-history, read-only
                  // one — `interaction.closed`), stops counting toward SLA/
                  // awaiting-response entirely — same union of conditions the
                  // record-header `ChannelTab` call site's own `channelClosed`
                  // now applies (channel-row.tsx). There's no reply pending on
                  // something that's already been closed out, so it shouldn't
                  // keep escalating amber/red (or green) no matter how long
                  // it's sat since.
                  const isClosed = interaction.channelStatuses?.[c.id] === "Closed" || !!interaction.closed;
                  const effectiveAwaitingResponse = !isClosed && (c.awaitingResponse ?? false);
                  return {
                    id: c.id,
                    type: c.type,
                    // Per `hasCustomerResponded`'s own doc comment above: no
                    // reading at all until the customer has said something on
                    // this channel at least once — an agent-initiated channel
                    // still waiting on a first reply has nothing to count yet.
                    // Per explicit follow-up, also blank once `isClosed` —
                    // there's nothing left to time on a channel/interaction
                    // that's already closed out, so the timer disappears
                    // there too rather than freezing on/continuing to show
                    // "how long since this channel opened". Once neither of
                    // those applies: awaiting: "how long since the CUSTOMER
                    // last wrote" — the metric that actually matters for a
                    // digital SLA. Not awaiting: "how long since this channel
                    // opened" — still the useful reading once there's nothing
                    // pending (but the channel isn't closed either). See
                    // `lastCustomerMessageTick`'s own doc comment for why
                    // these two diverge after more than one exchange.
                    elapsed:
                      !hasCustomerResponded(c) || isClosed
                        ? ""
                        : effectiveAwaitingResponse
                        ? formatElapsedTime(channelAwaitingWaitSeconds(c))
                        : formatElapsedTime(clockTick - c.startTick),
                    preview: c.preview,
                    current: c.id === currentId,
                    // See `effectiveAwaitingResponse` above — not read
                    // straight off `c.awaitingResponse` any more, since a
                    // closed channel should never render red/amber/green
                    // just because it happened to be awaiting right before
                    // it was closed.
                    awaitingResponse: effectiveAwaitingResponse,
                    // Amber-vs-red-vs-green escalation (see
                    // `getAwaitingSeverity`'s own doc comment) — `undefined`
                    // (not computed at all) when this channel isn't
                    // effectively awaiting (not awaiting at all, OR closed),
                    // so `ChannelRow`/`InteractionNavItem` (lyra-ui) fall
                    // back to their own "nothing pending" look rather than a
                    // stray severity value with no `awaitingResponse` to go
                    // with it.
                    awaitingSeverity: effectiveAwaitingResponse
                      ? getAwaitingSeverity(channelAwaitingWaitSeconds(c))
                      : undefined,
                    // Closed (either the whole reopened-from-history
                    // interaction, or just this one channel via the status
                    // popover — same `isClosed` above) is read-only — no
                    // kebab, so there's no way to Unassign & Dismiss/Consult/
                    // Transfer/change Outcome on a conversation that's
                    // already over. `ChannelRow` (lyra-ui) replaces the
                    // kebab with a real close ("×") button in that case
                    // instead of just hiding it — see `removable`'s own doc
                    // comment on `InteractionChannel` for that wiring.
                    removable: isClosed ? false : undefined,
                    // Wires "Outcome" to a real popover (see
                    // `ChannelOutcomeConfig`'s own doc comment,
                    // channel-row.tsx) — harmless to always pass even on a
                    // closed/read-only card, since `showMenu={removable !==
                    // false}` already hides the whole button (and this along
                    // with it) there.
                    outcome: {
                      open: outcomeDraftKey === outcomeKey && outcomeDraftSource === "leftnav",
                      onOpenChange: (open: boolean) => handleOutcomeOpenChange(outcomeKey, open, "leftnav"),
                      // Same options list AND same underlying value as the
                      // session-status pill's own dropdown
                      // (`TranscriptSessionSeparator`, fed by THIS channel's
                      // own `interaction.channelStatuses[c.id]`/
                      // `handleInteractionStatusChange` — rule #29) — not a
                      // separate `outcomeDraft` field like Tags/Disposition/
                      // Summary, so changing status from either surface
                      // changes it in both, per explicit request, WITHOUT
                      // touching any sibling channel's own status (see
                      // `ActiveInteraction.channelStatuses`'s own doc
                      // comment). Same `?? "Resolved"` fallback
                      // `buildDismissedContactHistoryEntry` already uses for
                      // this same field.
                      resolutionOptions: TRANSCRIPT_SESSION_STATUS_OPTIONS,
                      resolution: interaction.channelStatuses?.[c.id] ?? "Resolved",
                      onResolutionChange: (value: string) =>
                        handleInteractionStatusChange(interaction.id, c.id, value),
                      tagOptions: OUTCOME_TAG_OPTIONS,
                      selectedTags: outcomeDraft.tags,
                      onTagsChange: (tags: string[]) => setOutcomeDraft((d) => ({ ...d, tags })),
                      dispositionOptions: OUTCOME_DISPOSITION_OPTIONS,
                      dispositionCode: outcomeDraft.dispositionCode,
                      onDispositionChange: (value: string) => setOutcomeDraft((d) => ({ ...d, dispositionCode: value })),
                      summary: outcomeDraft.summary,
                      onSummaryChange: (value: string) => setOutcomeDraft((d) => ({ ...d, summary: value })),
                      onSave: handleOutcomeSave,
                      onCancel: handleOutcomeCancel,
                    } satisfies ChannelOutcomeConfig,
                  };
                });
                // Closed channels drop out of every card-level SLA/timer
                // computation below — per explicit request, once a channel
                // is closed it should stop counting toward the card's own
                // dot/color/timer entirely, not just stop escalating. A
                // card whose only channel(s) are all closed ends up with an
                // empty `cardOpenChannels`, which is exactly what makes
                // `earliestStart` (and so `elapsed`, at the render call site
                // below) `undefined` — the counter itself disappears rather
                // than falling back to "time since it was opened," same as
                // the dot disappearing once `awaitingSeverity` has nothing
                // left to compute from.
                const cardOpenChannels = interaction.channels.filter(
                  (c) => interaction.channelStatuses?.[c.id] !== "Closed"
                );
                // Per explicit request: an open channel that's never actually
                // heard from the customer yet (`hasCustomerResponded` above)
                // doesn't count toward "since it opened" either — an
                // agent-initiated channel still waiting on a first reply has
                // nothing to time, same reasoning as the per-channel
                // `elapsed` above. A card whose only open channel(s) are all
                // still waiting on that first reply ends up with an empty
                // `respondedOpenChannels`, which is what makes `earliestStart`
                // (and so `elapsed`, at the render call site below)
                // `undefined` — the counter disappears rather than starting
                // to tick the moment the channel was created.
                const respondedOpenChannels = cardOpenChannels.filter(hasCustomerResponded);
                const earliestStart =
                  respondedOpenChannels.length > 0
                    ? Math.min(...respondedOpenChannels.map((c) => c.startTick))
                    : undefined;
                // Card-level awaiting wait: the WORST (longest) of this
                // card's own awaiting, still-OPEN channels — not the
                // earliest-opened channel's own elapsed time — a card with
                // one fresh channel and one long-overdue one should read as
                // overdue, not average out to something in between.
                // `undefined` when nothing still-open on this card is
                // awaiting at all, so the card falls back to
                // `earliestStart`'s plain "since it opened" reading below
                // (itself `undefined`, and so blank, once every channel is
                // closed) — same as before this feature existed.
                const cardAwaitingChannels = cardOpenChannels.filter((c) => c.awaitingResponse);
                const cardAwaitingWaitSeconds =
                  cardAwaitingChannels.length > 0
                    ? Math.max(...cardAwaitingChannels.map(channelAwaitingWaitSeconds))
                    : undefined;
                // PROTOTYPE (CollapsedChannelBadge, local-only): the same
                // channel this card's `currentChannelKey` prop below already
                // resolves to — falls back to the most-recent channel when
                // nothing's explicitly current yet, same fallback `currentId`
                // itself uses. Only actually rendered in the collapsed-rail
                // branch further down.
                const currentChannelType =
                  channels.find((c) => c.id === currentId)?.type ?? channels[channels.length - 1]?.type;
                const navItem = (
                  <InteractionNavItem
                    key={interaction.id}
                    customerName={interaction.customerName}
                    // `adhoc:`-prefixed ids are lyra-ui's own "Continue
                    // with" ad-hoc flow (`buildAdHocSearchContact`, create-
                    // new.tsx) — a typed number/email with no matching
                    // directory contact, whose `customerName` above is that
                    // raw address itself, not a real name (see
                    // `handleStartCall`'s own comment on this same check).
                    // Tells the compact tile to show a channel icon in its
                    // avatar instead of deriving meaningless initials off
                    // that address — `customerName` itself is untouched, so
                    // the card's title text still reads as the address.
                    customerIdentified={!interaction.id.startsWith("adhoc:")}
                    active={activeInteractionId === interaction.id}
                    // Exits fullscreen directly here (not just via the
                    // `activeInteractionId`-keyed effect near
                    // `panelFullScreen`'s own declaration) because clicking
                    // the ALREADY-active card sets the same id — no value
                    // change, so that effect wouldn't fire, and the click
                    // would otherwise silently do nothing while the shared
                    // panel is covering the content the agent just clicked
                    // to see. Harmless/redundant on a real switch, where
                    // the effect would already handle it.
                    onClick={() => {
                      switchActiveInteraction(interaction.id);
                      setPanelFullScreen(false);
                    }}
                    awaitingResponse={cardAwaitingChannels.length > 0}
                    awaitingSeverity={cardAwaitingWaitSeconds !== undefined ? getAwaitingSeverity(cardAwaitingWaitSeconds) : undefined}
                    // "" (not a fallback duration) once every channel on
                    // this card is closed — see `cardOpenChannels`'s own doc
                    // comment above for why `earliestStart` is `undefined`
                    // in that case. `InteractionNavItem` (lyra-ui) skips
                    // rendering the elapsed span entirely for an empty
                    // string, so the counter itself disappears rather than
                    // showing a stale/frozen time.
                    elapsed={earliestStart !== undefined ? formatElapsedTime(cardAwaitingWaitSeconds ?? clockTick - earliestStart) : ""}
                    expanded={navOpen}
                    channels={channels}
                    onDismiss={() => handleDismissInteraction(interaction.id)}
                    onDismissChannel={(channel) => handleDismissChannel(interaction.id, channel)}
                    headerAction={getHeaderAction(interaction.id)}
                    // Per explicit request: the expanded card's "+" (Add
                    // Channel, `getHeaderAction` above) is replaced with a
                    // chevron that expands/collapses this card's own
                    // channel list — `headerAction` itself is left wired
                    // above (harmless; `InteractionNavItem` ignores it
                    // whenever `collapsible` is true — see that prop's own
                    // doc comment in interaction-nav-item.tsx) rather than
                    // removed, so Add Channel is one prop-flip away from
                    // coming back to this exact spot if that's ever wanted
                    // again.
                    collapsible
                    // "Collapse all"/"Expand all" (`AssignmentsExpandCollapseAllButton`
                    // above) — see `channelsAllExpanded`'s own doc comment
                    // near its declaration for why this is a one-shot
                    // `{ expanded, version }` override object rather than a
                    // plain controlled boolean.
                    channelsExpandedOverride={{
                      expanded: channelsAllExpanded,
                      version: channelsExpandedOverrideVersion,
                    }}
                    // Kept in sync with the ChannelToggle bar in this
                    // interaction's record-header PageHeader — see
                    // ActiveInteraction.currentChannelId's own doc comment.
                    currentChannelKey={currentId}
                    onCurrentChannelChange={(key) => handleChannelSelect(interaction.id, key)}
                  />
                );
                // Collapsed rail only (`!navOpen`) — the expanded card has
                // its own per-channel chips already showing type, so the
                // badge would be redundant there. `relative` wrapper is only
                // needed in this branch since the badge is absolutely
                // positioned against it. Also skipped once a card has more
                // than one open channel: `InteractionNavItem` itself already
                // renders its own count badge (the "2") in that exact same
                // top-left corner (see its own `channelCount > 1` branch,
                // interaction-nav-item.tsx) — showing a single channel's
                // icon on top of/behind it would both collide visually and
                // misrepresent a multi-channel card as single-channel.
                return !navOpen ? (
                  <div key={interaction.id} className="relative">
                    {navItem}
                    {currentChannelType && channels.length <= 1 && (
                      <CollapsedChannelBadge
                        type={currentChannelType}
                        // Same `cardAwaitingWaitSeconds`/`getAwaitingSeverity`
                        // this card's own `InteractionNavItem
                        // awaitingSeverity` prop above already resolves —
                        // reused, not recomputed, so a single-channel card's
                        // badge escalates in lockstep with everything else
                        // reading this card's severity (the avatar/border,
                        // the elapsed timer, the corner dot).
                        severity={
                          cardAwaitingWaitSeconds !== undefined ? getAwaitingSeverity(cardAwaitingWaitSeconds) : undefined
                        }
                      />
                    )}
                  </div>
                ) : (
                  navItem
                );
              })}
            </>
          }
        />

        {/* Content area — flex-1 shrinks to give space to docked panels.
            ref used to position float panels. */}
        <div ref={containerRef} className="relative flex flex-1 min-w-0 overflow-hidden pr-3 pb-3">

          {/* Main Container — flex column so `isCombinedPanelMode`'s tab row
              can stack above the content instead of sitting beside it. The
              Customer Information `SidePanel` docks left of that entire
              column (tab row included) via the nested flex-row wrapper just
              inside — same "panel beside column" shape as
              `AgentNextGenTemplate.stories.tsx`'s reference layout, just
              with `isCombinedPanelMode`'s own stacking preserved unchanged
              one level in. */}
          <Container className="flex flex-col flex-1 overflow-hidden relative">

            {/* Row: Customer Information panel (left) + everything else
                (tab row + content column, stacked). Not flattened into
                Container itself since `isCombinedPanelMode`'s tab row must
                stay OUTSIDE the panel's reach — only the column to its
                right stacks vertically. */}
            <div className="flex flex-1 overflow-hidden min-h-0">
              {showPanelToggle && activeInteraction && (
                // `key`ed on the assignment's own id, same "force a full
                // remount on every genuine switch" technique the content
                // column further down already uses (see that div's own
                // `animate-in fade-in-0 duration-200 delay-150 fill-mode-
                // backwards` doc comment for the full explanation) —
                // applied here too per explicit follow-up report: an
                // earlier fix suppressed `SidePanel`'s own width/opacity
                // transition instead (a briefly-toggled `!important` CSS
                // class), which stopped it sliding open/shut but replaced
                // that with a different problem — the panel then just
                // snapped into view with no animation at all while the
                // content column beside it was still doing its own soft
                // fade, so the two read as out of sync ("not fading, just
                // appearing").
                //
                // Remounting fixes both at once: a freshly-inserted DOM
                // node has no PRIOR width/opacity value on that same node
                // for `SidePanel`'s own `transition` to animate FROM, so
                // its width-slide never plays (no suppression hack
                // needed) — but a CSS *animation* (unlike a *transition*)
                // still runs from its keyframes at mount regardless, which
                // is exactly what `animate-in fade-in-0` on this wrapper
                // is, so the panel now genuinely fades in, on the same
                // `duration-200 delay-150` timing as the content column,
                // instead of either sliding open or hard-cutting into
                // place.
                //
                // Side effect, expected rather than a regression: this
                // panel's own internal `activeTab` (Overview/Interactions/
                // Detail/Directory — `CustomerInformationSidePanel`'s own
                // `useState(0)`), and the Interactions tab's own
                // `selectedHistoryIndex` (`CustomerInformationPanelBody`),
                // now reset to their defaults on every genuine assignment
                // switch too, since remounting discards them along with
                // everything else in the subtree. Landing on a different
                // customer's Overview tab first, rather than wherever the
                // PREVIOUS customer's panel happened to be left, matches the
                // same "genuinely new context should start from the top"
                // reasoning the outer interaction detail page's own
                // `key={`interaction-${id}`}` remount already establishes.
                //
                // `z-[5]` here (on THIS wrapper, not just relying on
                // `SidePanel`'s own internal `z-[5]`) — per explicit
                // follow-up report: a full-screen restore (this panel
                // unpinned/`position: absolute`, meant to overlay the
                // whole content column) briefly flashed with the
                // transcript visible on top instead of properly
                // underneath. Root cause is a well-known CSS gotcha: ANY
                // element with a live `animation-name` (which `animate-in`
                // sets, permanently, for as long as the class stays on the
                // element — not just while actually mid-play) forms its
                // OWN stacking context, same as `opacity`/`transform`/
                // `filter` do. Before this wrapper existed, `SidePanel`'s
                // own `position: absolute; z-index: 5` sat DIRECTLY in
                // `Container`'s stacking context, at the same explicit-
                // positive-z-index tier as the record header's sticky
                // separator (`z-[1]`), `InteriorPanel` (`z-[3]`), and the
                // shared panel's fullscreen overlay (`z-[9]`) — see those
                // components' own doc comments for this whole tier system.
                // Once wrapped, `z-[5]` on `SidePanel` only orders things
                // INSIDE this new stacking context (nothing else is in
                // here to compete with) — this wrapper itself, having NO
                // z-index of its own, instead got silently pushed down to
                // the plain "z-index: auto" tier alongside the content
                // column sibling next to it, so the two started competing
                // by DOM ORDER instead of by their intended z-index
                // values, and the content column (which happens to come
                // second in the JSX) could paint on top. Setting `z-[5]`
                // explicitly on this wrapper (a flex item of the
                // `flex flex-1 overflow-hidden min-h-0` row above — z-index
                // applies to flex items without needing `position` set)
                // restores the exact same tier this whole subtree occupied
                // before the wrapper was introduced.
                <div
                  key={`side-panel-${activeInteraction.id}`}
                  // `h-full` — explicit, not left to this flex item's own
                  // default cross-axis `align-items: stretch` from its
                  // parent row (`flex flex-1 overflow-hidden min-h-0`,
                  // "Row: Customer Information panel + everything else"
                  // above) — confirmed live as the actual root cause of
                  // the docked panel's own internal scrolling never
                  // engaging (while full-screen/unpinned mode, which
                  // reaches its height via `position: absolute` against
                  // `Container` instead — an unambiguous MAIN-axis
                  // flex-grow box, not cross-axis stretch — worked fine
                  // the whole time). Mirrored one level down on
                  // `SidePanel`'s own pinned-branch outer div
                  // (side-panel.tsx), which had the identical gap.
                  className="shrink-0 h-full z-[5] animate-in fade-in-0 duration-200 delay-150 fill-mode-backwards"
                >
                <CustomerInformationSidePanel
                  open={sidePanelOpen}
                  // Always unpinned (floating overlay) while full-screen —
                  // per explicit request this should overlay the parent
                  // Container, not push the tab row/transcript column over
                  // via docked mode.
                  pinned={sidePanelFullScreen ? false : effectiveSidePanelPinned}
                  // Always shown, even in the narrow-container overlay mode
                  // — per explicit request, an agent who's opened it as a
                  // floating overlay still needs a way to close it again
                  // from inside the panel itself, not just the (now-hidden
                  // while open) header toggle icon.
                  onClose={handleSidePanelClose}
                  fullScreen={sidePanelFullScreen}
                  // Hidden below 350px of container width — see
                  // `isSidePanelAtMinimalThreshold`'s own doc comment.
                  onToggleFullScreen={
                    isSidePanelAtMinimalThreshold ? undefined : () => setSidePanelFullScreen((v) => !v)
                  }
                  onMouseEnter={onSidePanelHoverStart}
                  onMouseLeave={sidePanelResizing ? undefined : onSidePanelHoverEnd}
                  customerName={activeInteraction.customerName}
                  recordId={activeInteraction.recordId}
                  channels={activeInteraction.channels}
                  onOpenHistoryConversation={(entry) =>
                    setHistoryConversationTab({ interactionId: activeInteraction.id, entry, active: true })
                  }
                  // Full-screen substitutes the parent Container's own
                  // measured width (`sidePanelContainerWidth` — already
                  // tracked for the narrow-container guard) for the normal
                  // drag-resized width, so the panel's unpinned/absolute
                  // rendering covers the whole container edge to edge.
                  width={sidePanelFullScreen ? sidePanelContainerWidth : sidePanelWidth}
                  containerWidth={sidePanelContainerWidth}
                  onWidthChange={setSidePanelWidth}
                  onResizeStateChange={setSidePanelResizing}
                />
                </div>
              )}
              <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

                {/* Below 768px with a docked panel open: a second tab
                    (`activePanelContent.title`, e.g. "Notifications") sits
                    alongside this main region's own tab, and this whole
                    container becomes the shared surface both regions toggle
                    inside of instead of the panel docking beside it. Same
                    `TabList`/`Tab` composition as the Dashboard's own tab row
                    below (and everywhere else in this file) — not a new
                    component. */}
                {isCombinedPanelMode && (
                  <TabList fullWidth className="bg-lyra-bg-surface-base shrink-0">
                    <Tab active={narrowActiveRegion === "main"} onClick={() => setNarrowActiveRegion("main")}>
                      {mainRegionTabLabel}
                    </Tab>
                    <Tab active={narrowActiveRegion === "panel"} onClick={() => setNarrowActiveRegion("panel")}>
                      {activePanelContent?.title}
                    </Tab>
                  </TabList>
                )}

                {/* Content column: PageHeader + page body */}
                <div
                  className={cn(
                    "flex flex-1 flex-col min-w-0 overflow-hidden",
                    isCombinedPanelMode && narrowActiveRegion !== "main" && "hidden"
                  )}
                >
              {showSettings ? (
                // ── Settings — a blank page for now (real settings content
                // isn't built yet), same "just the header, blank body below"
                // placeholder pattern the interaction record view below
                // uses. Takes priority over both Desk and an active
                // interaction — see the `showSettings` state's own doc
                // comment for how the three views stay mutually exclusive.
                // `key="settings"` (here and on the other two branches
                // below) forces a fresh mount every time the agent switches
                // between Settings/an interaction/the Desk dashboard, which
                // is what makes `animate-in fade-in-0` actually replay on
                // every switch — without a distinct key, React just patches
                // the existing tree in place (same position, same type where
                // it happens to coincide) and the "enter" animation only
                // fires once, on this whole page's very first mount. Plain
                // `div` instead of the bare `<>...</>` these three branches
                // used to be — a Fragment contributes no box of its own for
                // an animation/opacity class to apply to; classes here match
                // the parent "Content column" div's own
                // `flex flex-1 flex-col min-w-0 overflow-hidden` exactly, so
                // this extra nesting level is layout-inert.
                <div key="settings" className="flex flex-1 flex-col min-w-0 overflow-hidden animate-in fade-in-0 duration-200">
                  {showPageHeader && <PageHeader title="Settings" />}
                  <div className="flex-1 overflow-y-auto" />
                </div>
              ) : activeInteraction ? (
                // ── Active interaction's detail page — replaces the Desk
                // dashboard the moment a new assignment is started/quick-
                // dialed/redialed (see `activeInteraction` above). Just the
                // record header for now; the blank body below is where a
                // real case/contact detail view will go. Reverts back to
                // the dashboard automatically once the interaction is
                // dismissed (`activeInteractionId` clears). Keyed on the
                // interaction's own `id` (not a static string, unlike the
                // Settings/dashboard branches) — switching directly between
                // two different active interactions (redial/quick-dial while
                // one's already open) should still remount and replay the
                // fade-in, not just re-render the same subtree with new
                // props, the way a static key would.
                //
                // `delay-150 fill-mode-backwards` added to the plain
                // `animate-in fade-in-0` above (per explicit request — a
                // switch between assignments should read as one clean soft
                // fade, not a flash of whatever this specific assignment's
                // own content happens to animate on mount). A fresh remount
                // isn't actually blank underneath: things like an open-by-
                // default `Accordion` (Customer Information's Overview
                // cards) run their own `animate-accordion-down` height
                // grow-in the INSTANT they're painted, regardless of
                // whether the surrounding wrapper is still fading up from
                // opacity 0 — CSS animations tied to a class/data-attribute
                // that's already true at first paint still play from their
                // first frame, they don't wait for an ancestor's opacity to
                // reach 1 first. With only a plain fade before, that meant
                // briefly seeing pieces of the new assignment (cards
                // growing open, etc.) settle into place THROUGH the fade
                // rather than after it — every switch showing a flicker of
                // its own internals assembling.
                //
                // `fill-mode-backwards` (tailwindcss-animate's own utility
                // for `animation-fill-mode`) holds the fade-in animation's
                // FIRST frame — opacity 0 — for the entire `delay-150`
                // window before the animation itself starts, keeping this
                // whole subtree invisible while those nested mount-time
                // animations run their course out of sight. 150ms
                // comfortably covers the accordion height animation's own
                // 200ms duration by the time the fade-in itself finishes
                // (150ms delay + 200ms fade ≈ 350ms total), so by the time
                // anything here actually becomes visible, the new
                // assignment has already finished assembling underneath —
                // the agent just sees one soft fade to the fully-settled
                // page, never the assembly itself. `duration-200` (below)
                // is unchanged — this only changes WHEN the fade starts and
                // HOW it looks the moment it does, not how long the actual
                // fade takes once it begins.
                <div key={`interaction-${activeInteraction.id}`} className="flex flex-1 flex-col min-w-0 overflow-hidden animate-in fade-in-0 duration-200 delay-150 fill-mode-backwards">
                  {showPageHeader && (
                    // ── Record header, replaced with a tab bar ──
                    // Per explicit request: the old `PageHeader` (customer
                    // name/id title + a `ChannelToggleGroup` pill cluster in
                    // `titleSuffix`) is gone entirely — the name/id already
                    // live in the pinned Customer Information `SidePanel`'s
                    // own header now, so repeating them here was redundant.
                    // This row is just: the Customer Information toggle
                    // icon, a divider, then a single `TabList` holding one
                    // tab per open channel, replacing `ChannelToggleGroup`'s
                    // job of switching between them — real `Tab`s now, not
                    // toggle pills. (Used to also hold a separate
                    // "Customer History" tab here, mutually exclusive with
                    // the channel tabs — moved into the Customer Information
                    // panel itself as an "Interactions" tab per explicit
                    // request, see `CUSTOMER_PANEL_TABS`.) `ChannelTab`/
                    // `TabList` are safe to bring back
                    // here (this row's ONLY content, not squeezed into a
                    // `titleSuffix` slot alongside a title block) — it
                    // doesn't have the "no real width to fill" problem that
                    // sank the earlier `ChannelTab`/`TabList` attempt (see
                    // git history/CONTRIBUTING.md): that one was cramming
                    // the exact same tabs into `PageHeader`'s slim
                    // `titleSuffix` slot, not replacing the header outright.
                    // Back to `items-center` (per explicit follow-up —
                    // `items-end` threw off the icon button/divider's
                    // vertical centering relative to the tab labels).
                    // `TabList` alone opts OUT of that centering via its own
                    // `self-stretch` below, so it's still the one child that
                    // fills this row's full height — `Tab`'s own internal
                    // `items-center` (tabs.tsx) keeps each label/icon
                    // centered within its now-taller box either way, so
                    // nothing looks squished. That's what lets `TabList`'s
                    // (suppressed) own border coincide with this row's own
                    // `border-b` below, without needing to sacrifice the
                    // icon button/divider's normal centered look to get it.
                    //
                    // `lyra-customer-info-toggle-wrap` — establishes the
                    // container-query boundary the Customer Information
                    // toggle button collapses against below 991px (see
                    // index.css). Goes on this row (not the button's own
                    // wrapper) since this row is what actually has real,
                    // stretched width to measure — see that CSS rule's own
                    // doc comment.
                    <div className="flex items-center gap-3 border-b border-lyra-border-subtle bg-lyra-bg-surface-base px-6 pt-2 lyra-customer-info-toggle-wrap">
                      {/* Only shown while the panel itself is closed — once
                          it's open, this same icon would just sit there
                          doing nothing useful next to a panel that's
                          already visible (the panel's own close button is
                          the way to act on it once open); per explicit
                          request. Its own divider goes with it — a lone
                          divider with nothing to its left would just look
                          like a stray line at the start of the row.

                          Stays MOUNTED whenever `showPanelToggle` is true
                          (gated only on `sidePanelToggleVisible` below, via
                          a `grid-template-columns` 0fr↔1fr track — same
                          trick this file's own collapsible channel list
                          already uses for an analogous "unknown/auto
                          content size but needs to animate smoothly"
                          problem, just on the width axis here instead of
                          height) rather than conditionally rendered — a
                          CSS *transition* needs a PRIOR value on the same
                          DOM node to animate from, so a freshly-mounted
                          node (which conditional rendering would produce
                          every time this reappears) never animates; only
                          re-flowing an already-mounted node does. Per
                          explicit follow-up request: animate the REVEAL
                          (closing → button grows in) but not the hide
                          (opening → button should still vanish instantly,
                          same as before) — `transition-[grid-template-
                          columns]` only appears in the `sidePanelToggleVisible`
                          branch below, so collapsing back to `0fr` has no
                          transition property active and snaps instantly,
                          while expanding to `1fr` picks the transition up
                          and animates — same asymmetric "only transition
                          in one direction" idiom `SidePanel`'s own
                          `widthTransition` (`isResizing ? "none" : "width
                          250ms ..."`) already establishes in lyra-ui. */}
                      {showPanelToggle && (
                        <div
                          className={cn(
                            "grid overflow-hidden",
                            sidePanelToggleVisible
                              ? "grid-cols-[1fr] transition-[grid-template-columns] duration-200 ease-out"
                              : "grid-cols-[0fr]"
                          )}
                        >
                        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                          {/* Plain outlined icon `Button`, not a
                              `PanelPinButton` — per explicit request, this
                              needs a bordered "outline" look with no
                              persistent active/selected background at all
                              (`PanelPinButton` has no outline variant, and
                              always paints a selected bg once `pinned` and a
                              custom `icon` are both set — see its own doc
                              comment). Plain `onClick`, unchanged.

                              Wrapped in a `Popover` showing
                              `CustomerInfoHoverPreview` on hover (per
                              explicit request) — replaces the plain
                              text `Tooltip` `Button` auto-wraps a `title`
                              prop in (see button.tsx) with a richer
                              preview of the very panel this icon opens,
                              since hover-to-preview only matters while
                              the panel might already be showing... except
                              it's exactly the opposite here: this button
                              only renders while the panel is CLOSED (see
                              the gate above), which is precisely when a
                              quick glance at the customer without a full
                              click is most useful. `title` is dropped in
                              favor of a plain `aria-label` so `Button`
                              doesn't also auto-wrap its own competing
                              `Tooltip` around the same trigger (its
                              `isIconVariant && title` branch — button.tsx).
                              `onFocus`/`onBlur` mirror the mouse handlers
                              for keyboard parity, same as every other
                              hover-preview in this app.

                              `CustomerInfoHoverPreview` already supplies its
                              own complete chrome (border/background/shadow/
                              rounded corners, sized to fit — see its own
                              doc comment), so this `Popover`'s own default
                              framing is stripped down to a bare, invisible
                              frame around it — same "let the real content
                              supply its own chrome" convention
                              `InteractionNavItem`'s compact-rail hover
                              preview uses for the exact same reason
                              (interaction-nav-item.tsx).

                              `onOpenAutoFocus`/`onCloseAutoFocus` both
                              guarded — hover-opened content shouldn't steal
                              focus the instant the pointer happens to land
                              here (`onOpenAutoFocus`), and Radix's default
                              on close is to return focus to the trigger
                              (this `Button`), which — left unguarded — fires
                              its own `onFocus` right back (wired above for
                              keyboard parity) and reopens the very popover
                              that just closed, an infinite open/close flash
                              confirmed live. Same fix already established
                              for `InteractionNavItem`'s own hover-preview
                              Popover (interaction-nav-item.tsx) for the
                              exact same reason. */}
                          <Popover
                            open={customerInfoPreviewOpen}
                            onOpenChange={setCustomerInfoPreviewOpen}
                            placement="bottom"
                            align="start"
                            showArrow={false}
                            bodyPadding={false}
                            className="border-0 bg-transparent p-0 shadow-none"
                            onOpenAutoFocus={(e) => e.preventDefault()}
                            onCloseAutoFocus={(e) => e.preventDefault()}
                            content={
                              <CustomerInfoHoverPreview
                                customerName={activeInteraction.customerName}
                                recordId={activeInteraction.recordId}
                                channels={activeInteraction.channels}
                                onMouseEnter={openCustomerInfoPreview}
                                onMouseLeave={scheduleCloseCustomerInfoPreview}
                              />
                            }
                          >
                            <Button
                              variant="outline"
                              size="md"
                              // `lyra-customer-info-toggle-btn` — collapses
                              // this button's own label/padding down to a
                              // square icon-button footprint below 991px
                              // of the row's width (see index.css); no
                              // effect above that threshold.
                              className="shrink-0 lyra-customer-info-toggle-btn"
                              onClick={handleSidePanelIconToggle}
                              onMouseEnter={openCustomerInfoPreview}
                              onMouseLeave={scheduleCloseCustomerInfoPreview}
                              onFocus={openCustomerInfoPreview}
                              onBlur={scheduleCloseCustomerInfoPreview}
                              aria-label={sidePanelToggleLabel ?? "Open Customer Information"}
                            >
                              <User className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                              {/* `lyra-customer-info-toggle-label` — hidden
                                  by the same container query once the row
                                  drops below 991px, leaving just the icon
                                  above. */}
                              <span className="lyra-customer-info-toggle-label">Customer Information</span>
                            </Button>
                          </Popover>
                          <div className="h-8 w-px bg-lyra-border-subtle shrink-0" aria-hidden="true" />
                        </div>
                        </div>
                      )}
                      {/* `border-b-0` — cancels TabList's own default
                          bottom border (which only ever spans its own box,
                          not this whole row) so the row's own full-width
                          `border-b` above is the single, sole underline,
                          not a second, shorter one stacked on top of it.
                          `self-stretch` — the row itself is back to
                          `items-center` (see its own comment above), but
                          TabList alone still fills the row's full height,
                          so its own (suppressed) border position — and
                          each Tab's own bottom edge, where the active blue
                          indicator sits — lines up with this row's border
                          exactly, instead of sitting above it under a
                          gap. `Tab`'s own internal `items-center`
                          (tabs.tsx) keeps each tab's label/icon centered
                          within its now-taller box, so nothing looks
                          squished by this. */}
                      {/* `growToFillRow` — this row sits alongside the icon
                          button + divider before it and the "+" button
                          after it, so it needs to actually claim the rest of
                          that horizontal row instead of sizing to its own
                          near-content-less width (which was reading as
                          narrow enough to collapse the `overflowMenu`
                          breakpoint early even with plenty of real room
                          available — see that prop's own doc comment in
                          tabs.tsx). `className`'s own `flex-1 min-w-0` still
                          lands on the inner tab row itself (unrelated,
                          unaffected by this prop). */}
                      <TabList overflowMenu growToFillRow className="flex-1 min-w-0 self-stretch border-b-0">
                        {activeInteraction.channels.map((c) => {
                          const key = c.id ?? c.type;
                          // Same `${interactionId}:${channelKey}` scheme the
                          // LeftNav's own `ChannelRow` and the transcript's
                          // `TranscriptSessionSeparator` already key their
                          // own Outcome popovers with — see
                          // `outcomeDraftSource`'s own doc comment above for
                          // why each trigger needs its own `source` tag
                          // ("tab" here) alongside this shared key.
                          const outcomeKey = `${activeInteraction.id}:${key}`;
                          return (
                            <ChannelTab
                              key={key}
                              type={c.type}
                              // `address` now shows directly on the tab
                              // face itself (replacing the plain type
                              // label there — `showAddressOnFace`'s new
                              // default, see that prop's own doc comment,
                              // channel-row.tsx) per explicit request — an
                              // agent scanning open tabs cares which
                              // specific number/email/handle a conversation
                              // is on more than its generic channel type,
                              // which the leading icon still conveys. Also
                              // feeds the tooltip's own top line paired
                              // with the type label ("Email |
                              // david.brown@example.com"), so that's still
                              // reachable there too.
                              address={c.addressLabel}
                              // Same "Resolved" fallback the Outcome
                              // popover's own `resolution` field below
                              // already uses whenever `channelStatuses[c.id]`
                              // hasn't been explicitly set yet — one shared
                              // default rather than a second, different one
                              // just for this tooltip line.
                              statusLabel={activeInteraction.channelStatuses?.[c.id] ?? "Resolved"}
                              // Same "MM:SS since the customer's last
                              // message" elapsed convention this file's own
                              // LeftNav timers/SLA banner already use
                              // (`formatElapsedTime`) — reused here for the
                              // tooltip's "Last contact" line rather than a
                              // second, differently-formatted elapsed value.
                              // `undefined` (omitted, per that prop's own doc
                              // comment) whenever the customer hasn't
                              // actually said anything on this channel yet —
                              // same "nothing to time until they respond"
                              // reasoning as the LeftNav's own per-channel/
                              // card-level elapsed above; there's no "last
                              // contact" to report before the customer's
                              // first message has landed.
                              lastCustomerContactLabel={
                                c.lastCustomerMessageTick !== undefined
                                  ? formatElapsedTime(clockTick - c.lastCustomerMessageTick)
                                  : undefined
                              }
                              interactionId={c.interactionId}
                              active={
                                !isHistoryConversationView &&
                                (activeInteraction.currentChannelId ?? activeInteraction.channels[activeInteraction.channels.length - 1]?.id) === key
                              }
                              // Same "how long has the CUSTOMER been waiting"
                              // signal the LeftNav's own `ChannelRow` colors
                              // its elapsed-time text with (see that
                              // component's own `interactions.map` above,
                              // `channelAwaitingWaitSeconds`/
                              // `getAwaitingSeverity`) — recomputed here
                              // rather than threaded down from that separate
                              // render pass, since this tab bar isn't a
                              // descendant of it. The label text/underline
                              // only actually recolor while this tab reads
                              // `active` (see `Tab`'s own `severity` doc
                              // comment) — an awaiting-but-not-currently-
                              // viewed channel still shows those in plain
                              // gray. Its leading icon is the one exception:
                              // that stays in its success/warning/critical
                              // color (and, once actually overdue, swaps to
                              // the warning-triangle glyph — see
                              // `ChannelTab`'s own `tabIcon`) even while not
                              // selected, per explicit request.
                              //
                              // Both suppressed once THIS channel's own
                              // status reads "Closed" (see
                              // `ActiveInteraction.channelStatuses`'s own
                              // doc comment for why status is tracked per-
                              // channel) — per explicit follow-up, a closed
                              // channel's tab resets to its plain neutral
                              // look regardless of how the SLA clock reads,
                              // since there's no reply pending on something
                              // that's already been closed out.
                              awaitingResponse={
                                activeInteraction.channelStatuses?.[c.id] !== "Closed" && (c.awaitingResponse ?? false)
                              }
                              awaitingSeverity={
                                activeInteraction.channelStatuses?.[c.id] !== "Closed" && c.awaitingResponse
                                  ? getAwaitingSeverity(clockTick - (c.lastCustomerMessageTick ?? c.startTick))
                                  : undefined
                              }
                              onClick={() => {
                                setHistoryConversationTab((t) => (t && t.active ? { ...t, active: false } : t));
                                handleChannelSelect(activeInteraction.id, key);
                              }}
                              onDismiss={() => {
                                if (activeInteraction.channels.length > 1) handleDismissChannel(activeInteraction.id, c);
                                else handleDismissInteraction(activeInteraction.id);
                              }}
                              // Closed — either the WHOLE (reopened-from-
                              // history) interaction, or just THIS ONE
                              // channel via the status popover (same union
                              // the "This channel is closed."/"You are
                              // viewing a closed interaction." banners above
                              // this transcript already gate on) — no kebab
                              // either way, nothing left to Log Outcome/
                              // Consult/Transfer on. Per explicit follow-up,
                              // this tab's kebab spot now shows a real close
                              // ("×") button instead once `showMenu` is
                              // false — `ChannelTab` itself wires that
                              // straight to `onDismiss` above (see
                              // `ChannelTabProps.showMenu`'s own doc comment,
                              // channel-row.tsx), no separate prop needed
                              // here. See `ActiveInteraction.closed`'s own
                              // doc comment for the full picture.
                              showMenu={!activeInteraction.closed && activeInteraction.channelStatuses?.[c.id] !== "Closed"}
                              // Wires the kebab's "Outcome" entry to the real
                              // popover (`ChannelTabProps.outcome`, channel-
                              // row.tsx) — same shared draft/resolution state
                              // as the LeftNav's own Outcome button for this
                              // exact channel (`outcomeKey`), so logging an
                              // outcome from either surface reflects in both.
                              // Harmless to always pass even when
                              // `showMenu={false}` hides the kebab entirely —
                              // same reasoning `ChannelRow`'s own `outcome`
                              // doc comment already establishes.
                              outcome={{
                                open: outcomeDraftKey === outcomeKey && outcomeDraftSource === "tab",
                                onOpenChange: (open) => handleOutcomeOpenChange(outcomeKey, open, "tab"),
                                resolutionOptions: TRANSCRIPT_SESSION_STATUS_OPTIONS,
                                resolution: activeInteraction.channelStatuses?.[c.id] ?? "Resolved",
                                onResolutionChange: (value) =>
                                  handleInteractionStatusChange(activeInteraction.id, c.id, value),
                                tagOptions: OUTCOME_TAG_OPTIONS,
                                selectedTags: outcomeDraft.tags,
                                onTagsChange: (tags) => setOutcomeDraft((d) => ({ ...d, tags })),
                                dispositionOptions: OUTCOME_DISPOSITION_OPTIONS,
                                dispositionCode: outcomeDraft.dispositionCode,
                                onDispositionChange: (value) => setOutcomeDraft((d) => ({ ...d, dispositionCode: value })),
                                summary: outcomeDraft.summary,
                                onSummaryChange: (value) => setOutcomeDraft((d) => ({ ...d, summary: value })),
                                onSave: handleOutcomeSave,
                                onCancel: handleOutcomeCancel,
                              } satisfies ChannelOutcomeConfig}
                            />
                          );
                        })}
                        {/* Past-session conversation tab — opened via the
                            Customer Information panel's Overview "Open
                            Conversation" deep link. A plain `Tab` (not
                            `ChannelTab` — it's not a live channel: no
                            awaiting state, no address, no outcome). Its
                            kebab's "Close Tab" removes it; clicking a
                            channel tab deactivates it but keeps it here. */}
                        {historyConversationForActive && (
                          <Tab
                            active={historyConversationForActive.active}
                            icon={<History className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}
                            onClick={() =>
                              setHistoryConversationTab((t) => (t ? { ...t, active: true } : t))
                            }
                            menuItems={[
                              {
                                id: "close-history-conversation-tab",
                                label: "Close Tab",
                                onClick: () => setHistoryConversationTab(null),
                              },
                            ]}
                          >
                            {historyConversationForActive.entry.timestampDisplay}
                          </Tab>
                        )}
                      </TabList>
                      {/* Same Add Channel control every `InteractionNavItem`
                          card already has (`getHeaderAction`) — sitting
                          after the tab row instead of embedded inside
                          `ChannelToggleGroup`'s own bordered shell (there's
                          no such shell here to embed it in anymore). Sized
                          up to a medium outline icon button (`Button`'s own
                          `variant="outline"`/`size="icon-md"` tokens: h-8
                          w-8, bordered, `bg-lyra-bg-control`) via the
                          className override `getHeaderAction` exposes for
                          exactly this — `OutboundAddButton`'s own default is
                          a small (h-6 w-6) borderless ghost icon, meant for
                          the tight space inside an `InteractionNavItem`
                          card row, not a standalone header action. */}
                      {getHeaderAction(
                        activeInteraction.id,
                        "h-8 w-8 border border-lyra-border-default bg-lyra-bg-control text-lyra-fg-action"
                      )}
                    </div>
                  )}
                  {/* Body row: transcript+composer column. Customer
                      Information now renders as a `SidePanel` docked left of
                      the whole outer Container (see above), not inside this
                      row — so this is just the transcript/composer column
                      now, no docked panel sibling here anymore. (Used to
                      also conditionally show the "Customer History" tab's
                      list + right-docked detail panel here instead, when
                      that tab was selected — moved into the Customer
                      Information panel itself as an "Interactions" tab per
                      explicit request, see `CUSTOMER_PANEL_TABS`, so this is
                      unconditional again.) */}
                  <div className="flex flex-1 overflow-hidden">
                      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
                        {isHistoryConversationView && historyConversationForActive ? (
                          /* Past-session conversation, opened as its own tab in
                             this record area (see the history `Tab` in the
                             header row above) — replaces the live transcript/
                             composer while active. Read-only by nature: it's
                             an archived session, so no composer renders. */
                          <HistoryConversationView entry={historyConversationForActive.entry} />
                        ) : (
                        <>
                        {/* Reopened-from-history, closed interaction — read-only
                            notice. See `ActiveInteraction.closed`'s own doc
                            comment for the full picture (also drives hiding
                            `InteractionComposer` below and every channel's
                            kebab, both in this column and in the LeftNav
                            card/ChannelToggleGroup above). */}
                        {activeInteraction.closed && (
                          <div className="shrink-0 px-6 pt-4">
                            <InlineNotification variant="info">
                              You are viewing a closed interaction.
                            </InlineNotification>
                          </div>
                        )}
                        {/* Distinct from the read-only "closed interaction" notice
                            above — this is for a still-open assignment where just
                            THIS ONE channel has been set to "Closed" via the status
                            popover (see `ActiveInteraction.channelStatuses`'s own
                            doc comment). The agent can still switch to any other
                            (open, or not-yet-opened) channel on this same card
                            normally; only this specific channel's own composer
                            hides, per explicit request. */}
                        {!activeInteraction.closed && activeChannelStatus === "Closed" && (
                          <div className="shrink-0 px-6 pt-4">
                            <InlineNotification variant="info">
                              This channel is closed. Click Add Channel above and select the
                              appropriate channel to re-open the conversation.
                            </InlineNotification>
                          </div>
                        )}
                        {/* SLA banner — same `activeChannelAwaitingSeverity`
                            signal the record-header tab's own icon/color and
                            the LeftNav card's own dot already reflect for
                            this exact channel (see that derived value's own
                            doc comment above), just surfaced here as an
                            actual message too instead of relying on color
                            alone. Only for "warning"/"critical" — the green
                            "success" tier (customer just responded, still
                            well within SLA) isn't something worth an actual
                            banner over, same as "not awaiting at all"
                            (`undefined`) isn't. Gated the same way the
                            "channel closed" notice just above is — closed
                            (read-only or per-channel) is never actually
                            awaiting a reply, so `activeChannelAwaitingSeverity`
                            would already be `undefined` in either case
                            regardless, but the explicit checks keep this
                            banner's conditions self-evidently aligned with
                            its neighbor rather than relying on that being
                            true by coincidence. */}
                        {!activeInteraction.closed &&
                          activeChannelStatus !== "Closed" &&
                          (activeChannelAwaitingSeverity === "warning" || activeChannelAwaitingSeverity === "critical") && (
                          <div className="shrink-0 px-6 pt-4">
                            <InlineNotification variant={activeChannelAwaitingSeverity === "critical" ? "error" : "warning"}>
                              {activeChannelAwaitingSeverity === "critical"
                                ? "Agent has breached SLA time."
                                : "Agent is nearing SLA breach."}
                            </InlineNotification>
                          </div>
                        )}
                        <InteractionTranscript
                          channelType={activeChannelType}
                          customerName={activeInteraction.customerName}
                          recordId={activeInteraction.recordId}
                          skillLabel={activeChannel?.preview}
                          isFreshLaunch={!!activeInteraction.startedFresh}
                          reopenedSessions={activeChannel?.reopenedSessions}
                          liveMessages={activeInteraction.liveMessages?.[activeChannelKey] ?? []}
                          // Same union of conditions the "closed
                          // interaction"/"channel closed" banners just above
                          // this transcript already gate on — see `dimmed`'s
                          // own doc comment for why both, not just one.
                          dimmed={!!activeInteraction.closed || activeChannelStatus === "Closed"}
                          currentStatus={activeChannelStatus}
                          onCurrentStatusChange={(status) =>
                            activeChannel && handleInteractionStatusChange(activeInteraction.id, activeChannel.id, status)
                          }
                          // Same shared `outcomeDraftKey`/`outcomeDraft` state
                          // the LeftNav's own `ChannelRow` Outcome button uses
                          // for this exact channel (`outcomeKey` — same
                          // `${interactionId}:${channelKey}` scheme that
                          // call site uses) — see `InteractionTranscript`'s
                          // own outcome props' doc comment.
                          outcomeOpen={outcomeDraftKey === activeChannelOutcomeKey && outcomeDraftSource === "transcript"}
                          onOutcomeOpenChange={(open) => handleOutcomeOpenChange(activeChannelOutcomeKey!, open, "transcript")}
                          outcomeTags={outcomeDraft.tags}
                          onOutcomeTagsChange={(tags) => setOutcomeDraft((d) => ({ ...d, tags }))}
                          outcomeDispositionCode={outcomeDraft.dispositionCode}
                          onOutcomeDispositionChange={(value) => setOutcomeDraft((d) => ({ ...d, dispositionCode: value }))}
                          outcomeSummary={outcomeDraft.summary}
                          onOutcomeSummaryChange={(value) => setOutcomeDraft((d) => ({ ...d, summary: value }))}
                          onOutcomeSave={handleOutcomeSave}
                          onOutcomeCancel={handleOutcomeCancel}
                          // Same dismiss logic `ChannelTab`'s own kebab
                          // "Unassign & Dismiss" entry uses for this exact
                          // channel — dismiss just the channel while others
                          // remain open, or the whole interaction once this
                          // is the last one.
                          onDismissChannel={
                            activeChannel
                              ? () => {
                                  if (activeInteraction.channels.length > 1) {
                                    handleDismissChannel(activeInteraction.id, activeChannel);
                                  } else {
                                    handleDismissInteraction(activeInteraction.id);
                                  }
                                }
                              : undefined
                          }
                        />
                        {/* `activeChannelType !== "email" && !== "voice"` —
                            per explicit request, hidden for now on both
                            Email and Voice specifically: a plain "Chat with
                            Customer" text composer sitting under either's
                            own "Coming Soon ... Content" placeholder above
                            (see that placeholder's own doc comment) reads as
                            broken/out of place — there's no real Email/Voice
                            UI yet for it to actually send into. Will come
                            back once real content replaces those
                            placeholders. */}
                        {!activeInteraction.closed &&
                          activeChannelStatus !== "Closed" &&
                          activeChannelType !== "email" &&
                          activeChannelType !== "voice" && (
                            <InteractionComposer onSend={(text) => handleSendMessage(activeInteraction.id, text)} />
                          )}
                        </>
                        )}
                      </div>
                  </div>
                </div>
              ) : (
                <div key="dashboard" className="flex flex-1 flex-col min-w-0 overflow-hidden animate-in fade-in-0 duration-200">
                  {showPageHeader && (
                    <>
                      {/* Page header — main title is the same time-of-day
                          greeting the dashboard body used to render by hand
                          (`lyra-heading-2xl` "Good {period}, {name}"), now a
                          real `PageHeader` sitting above the tab row instead
                          of below it.

                          `actions` holds a `Badge` reading the "today"
                          Assignments Resolved count straight off
                          `PerformanceSummaryCard`'s own data source
                          (`PERFORMANCE_DATA_BY_RANGE.today.casesResolved`)
                          so the two numbers can't drift out of sync —
                          hardcoded to the "today" range regardless of
                          whatever range that card's own `DateFilterChip`
                          currently has selected, since this badge's copy is
                          always "resolved today", not date-filterable
                          itself. Floats to the header's right side the same
                          way the "New Outbound" `CreateNew` trigger it
                          replaced did — `actions` is always the right-hand
                          slot in `PageHeader`'s own title/actions row. */}
                      <PageHeader
                        title={`Good ${getGreetingPeriod()}, ${CURRENT_AGENT_FIRST_NAME}`}
                        subtitle={formatHeaderDateTime()}
                        actions={
                          <Badge color="green" variant="subtle">
                            {PERFORMANCE_DATA_BY_RANGE.today.casesResolved} Assignments resolved today
                          </Badge>
                        }
                      />
                      <TabList
                        overflowMenu
                        reorderable
                        onReorder={(order) => setDeskTabOrder(order as DeskTabKey[])}
                        className="px-6 bg-lyra-bg-surface-base shrink-0"
                      >
                        {deskTabOrder.map((key) => (
                          <Tab key={key} active={activeDeskTab === key} onClick={() => setActiveDeskTab(key)}>
                            {DESK_TAB_LABELS[key]}
                          </Tab>
                        ))}
                      </TabList>
                    </>
                  )}
              {/* Body row: main content + interior panel */}
              <div className="relative flex flex-1 overflow-hidden">
              {/* Customers list view + row-info panel stay mounted across
                  desk-tab switches (never unmounted by the `hidden` toggle
                  below) so `CustomersListView`'s own search/sort/filters/
                  added-filter-keys/visible-columns/pagination/row-selection
                  state all survive navigating away to another tab and back
                  — a plain `cond ? <CustomersListView/> : ...` would remount
                  it fresh (and lose every one of those) each time.

                  Both now live together in ONE real box (`flex flex-1
                  overflow-hidden`, not `display:contents`) that toggles
                  `hidden` as a whole, rather than each having its own
                  separate visibility mechanism the way this used to be
                  split (`CustomersListView` behind a `contents`/`hidden`
                  wrapper, `CustomerRowInfoPanel` driven by nulling its own
                  `row` prop instead). That split was the actual cause of a
                  reported bug: nulling `row` on tab-switch didn't hide the
                  panel — it told `InteriorPanel` to CLOSE, which plays its
                  own 250ms width-close transition. Because the panel was a
                  real flex sibling of whatever the newly-selected tab was
                  about to show, that 250ms of shrinking width visibly
                  reflowed the new tab's content growing to fill the space
                  beside it — the "dashboard animating its position" bug.
                  Removing it from layout instantly (rather than animating
                  the panel closed) is what fixes the reported reflow — the
                  panel's own real open/close animation still plays normally
                  for actual same-tab closes (its header's × button, or
                  `onRowClick` picking a different row); only navigating AWAY
                  from this tab skips it.

                  `display:none` (Tailwind's `hidden`) was the first attempt
                  here, but it caused a SECOND, subtler bug on the way BACK
                  in: `InteriorPanel` (inside `CustomerRowInfoPanel`) tracks
                  its own real DOM parent's width via `ResizeObserver` to
                  decide whether to auto-full-screen below 768px (see that
                  component's own doc comment) — and `display:none` elements
                  report a genuine 0×0 size to `ResizeObserver`, not just a
                  stale old value. So the instant this wrapper went
                  `display:none`, the observer fired with width 0, and that
                  0 lingered as `InteriorPanel`'s last-known parent width
                  until a NEW (necessarily asynchronous — `ResizeObserver`
                  callbacks never run synchronously with the style change
                  that caused them) callback caught up with the real width
                  after switching back. For that one frame, `parentWidth`
                  read as 0 (well under both the 1024px/768px thresholds),
                  so `InteriorPanel` briefly rendered its full-screen/
                  absolute-overlay layout before correcting itself back to
                  its normal ~350-425px docked width and position — visible
                  as the panel sliding in from full width, the left-to-right
                  animation reported after this fix's first pass.

                  `visibility:hidden` (`invisible`) + `position:absolute
                  inset-0` was the SECOND attempt, replacing `display:none` —
                  it still generates a real box with a real, stable size for
                  `ResizeObserver`, fixing the bug above. But it introduced a
                  THIRD bug: `visibility` is inherited but overridable by a
                  descendant that sets its own explicit value — and
                  `InteriorPanel`'s inner content div does exactly that
                  (`style={{ visibility: open ? "visible" : "hidden" }}`,
                  interior-panel.tsx), keyed off its OWN `open` prop, which is
                  `row !== null` — true regardless of which desk tab is
                  active, since `row` is just `selectedCustomerRow` now, not
                  gated on `activeDeskTab` (see the render call site below).
                  So `invisible` on this wrapper got silently overridden back
                  to visible one level down, and — still `position:absolute`,
                  so no longer competing for flex space either — the panel
                  rendered floating on top of whatever tab WAS actually
                  active, confirmed from a screenshot showing it overlapping
                  the Dashboard.

                  `opacity-0` (this wrapper) + `inert` (native HTML attribute,
                  supported as a real prop since React 19 — see this file's
                  own React version) is the fix that actually holds up:
                  unlike `visibility`, `opacity` composites the WHOLE
                  subtree as one flattened layer, so a descendant's own
                  inline `opacity`/`visibility` can't punch back through a
                  `0`-opacity ancestor the way it could with `visibility`
                  alone. `inert` (not just `pointer-events-none`) additionally
                  drops the entire subtree out of tab order and the
                  accessibility tree and blocks ALL interaction, not only
                  pointer events — the same "fully inactive but still really
                  there, still correctly sized" result `visibility:hidden`
                  was reaching for, just via a property children genuinely
                  cannot override. */}
              <div
                className={
                  activeDeskTab === "customers"
                    ? "relative flex flex-1 overflow-hidden animate-in fade-in-0 duration-200"
                    : "absolute inset-0 flex overflow-hidden opacity-0"
                }
                inert={activeDeskTab !== "customers"}
              >
                <CustomersListView
                  onStartInteraction={(contact, channel, phone, skillId) =>
                    handleStartCall({ contact, channel, phone, skillId })
                  }
                  addedFilterKeys={customerAddedFilterKeys}
                  onAddedFilterKeysChange={setCustomerAddedFilterKeys}
                  filterValues={customerFilterValues}
                  onFilterValuesChange={setCustomerFilterValues}
                  // Clicking the row that's already open (highlighted via
                  // `openRowId`) closes `CustomerRowInfoPanel` instead of
                  // just re-opening the same row it's already showing.
                  onRowClick={(row) =>
                    setSelectedCustomerRow((prev) =>
                      prev?.contactNumber === row.contactNumber ? null : row
                    )
                  }
                  searchQuery={customerSearchQuery}
                  onSearchChange={setCustomerSearchQuery}
                  sortKey={customerSortKey}
                  sortDir={customerSortDir}
                  onSort={handleCustomerSort}
                  sortedRows={customerSortedRows}
                  openRowId={selectedCustomerRow?.contactNumber ?? null}
                />
                <CustomerRowInfoPanel
                  row={selectedCustomerRow}
                  onClose={() => setSelectedCustomerRow(null)}
                  onPrevious={() => handleCustomerRowNav(-1)}
                  onNext={() => handleCustomerRowNav(1)}
                  hasPrevious={selectedCustomerIndex > 0}
                  hasNext={selectedCustomerIndex !== -1 && selectedCustomerIndex < customerSortedRows.length - 1}
                  onStartInteraction={(contact, channel, phone, skillId) =>
                    handleStartCall({ contact, channel, phone, skillId })
                  }
                />
              </div>
              {activeDeskTab !== "customers" && (activeDeskTab !== "home" ? (
                // Accounts/Tickets/WEM — no content built yet; same
                // "Coming soon" placeholder treatment used elsewhere in
                // this file for in-progress tabs (e.g. the Customer
                // History tab), rather than silently falling through to
                // the Dashboard's own queue widgets/summary cards below.
                // `key={activeDeskTab}` forces a fresh mount on every
                // switch (including Accounts → Tickets, which would
                // otherwise reuse this exact same element/position and
                // never replay `animate-in`) — same reasoning as the
                // top-level Settings/interaction/dashboard branches' own
                // `key`s above.
                <div key={activeDeskTab} className="flex flex-1 items-center justify-center p-4 animate-in fade-in-0 duration-200">
                  <p className="lyra-body-md text-lyra-fg-disabled text-center">Coming soon</p>
                </div>
              ) : (
                <>
                <div key={activeDeskTab} className="flex flex-1 flex-col min-w-0 overflow-y-auto px-6 py-6 animate-in fade-in-0 duration-200">
                  <div className="w-full max-w-[1200px] mx-auto lyra-container-grid-wrap">
                    {/* ── Queue widgets ──
                        `DashboardQueue` ("cards" variant, its default) —
                        the numbers come straight from `latestContacts`
                        (see the "Live queue simulation" state above), so
                        they'd stay in sync with the accordion presentation
                        of the same data if that's ever turned back on (see
                        the note below) — and Contacts/Wait Time visibly
                        tick/fluctuate in real time rather than sitting
                        frozen at the same numbers forever. Clicking a
                        widget opens the interior panel with that queue's
                        sub-queue breakdown; the selected widget gets the
                        "info-strong" (blue) treatment `DashboardQueue`
                        applies on selection, driven by the controlled
                        `selectedId`/`onSelect` pair kept in sync with the
                        panel state. */}
                    {/* No `mt-6` here — this is the first row in the
                        dashboard body, and the scroll wrapper around
                        `.lyra-container-grid-wrap` already supplies its
                        own top spacing (`py-6` a few lines up), so an
                        extra `mt-6` on top of that just doubled the gap
                        between the tab bar and this row. The rows below
                        (`ContactHistoryCard`, the summary cards) keep
                        their own `mt-6` — they still need spacing from
                        whatever row sits above THEM. */}
                    <DashboardQueue
                      items={latestContacts.map((contact) => ({
                        id: contact.id,
                        name: contact.name,
                        icon: contact.icon,
                        wait: contact.wait,
                        skillsCount: contact.skillsCount,
                        contactsCount: contact.contactsCount,
                        agentsCount: contact.agentsCount,
                      }))}
                      selectedId={selectedQueueId}
                      onSelect={setSelectedQueueId}
                    />

                    {/* ── Latest Cases ──
                        Removed for now (was `DashboardQueue`'s "accordion"
                        variant, showing the same data as expandable rows
                        with each queue's `InteractionsTable` as content) —
                        may come back later, so `latestContacts`,
                        `InteractionsTable`, and the rest of the data/markup
                        it depended on are left in place rather than deleted. */}

                    <div className="mt-6">
                      <ContactHistoryCard
                        onRedial={handleRedial}
                        onReopen={handleReopenContactHistoryEntry}
                        historyByRange={contactHistoryByRange}
                      />
                    </div>

                    {/* ── Summary cards ──
                        Was three cards (Activity/Performance/Productivity);
                        Activity's ring chart moved into the bottom of
                        PerformanceBreakdownCard (Productivity) and the
                        standalone Activity card was removed, since the ring
                        visualized the exact same Available/Working/
                        Unavailable data Productivity's own rows already
                        list — one card showing it twice added nothing a
                        single card + ring didn't already cover. */}
                    <div className="mt-6 lyra-container-grid">
                      <PerformanceSummaryCard />
                      <PerformanceBreakdownCard />
                    </div>
                  </div>
                </div>
                {showInteriorPanel && (
                  <InteriorPanel
                    side="right"
                    // Reuses this one docked slot for two different jobs —
                    // the pre-existing "Case Details" form and the new
                    // queue drill-down — rather than stacking a second
                    // right-side panel, since only one detail view is ever
                    // relevant at a time. `selectedQueueId` set takes
                    // priority in both the open condition and the content
                    // switch below.
                    open={interiorPanelOpen || Boolean(selectedQueueId)}
                    headerTitle={
                      selectedQueueId
                        ? latestContacts.find((c) => c.id === selectedQueueId)?.name ?? "Queue"
                        : "Case Details"
                    }
                    // "{n} Skills" — the same count as the queue widget's own
                    // Skills metric (`skillsCount`, derived from this exact
                    // `queueSubItems[selectedQueueId]` list), just surfaced
                    // in the drill-down panel's own header this time.
                    headerSubhead={
                      selectedQueueId
                        ? `${(queueSubItems[selectedQueueId] ?? []).length} Skills`
                        : undefined
                    }
                    onClose={() => {
                      setInteriorPanelOpen(false);
                      setSelectedQueueId(null);
                    }}
                  >
                    {selectedQueueId ? (
                      <div className="flex flex-col">
                        {(queueSubItems[selectedQueueId] ?? []).map((item, i) => (
                          <div
                            key={item.id}
                            className={cn(
                              "flex flex-col gap-2 px-4 py-4",
                              i > 0 && "border-t border-lyra-border-subtle"
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="inline-flex items-center gap-2 lyra-body-md-emphasis text-lyra-fg-default">
                                <item.icon className="h-4 w-4 text-lyra-fg-secondary" strokeWidth={1.5} />
                                {item.label}
                              </span>
                              <span className="lyra-body-sm text-lyra-fg-secondary whitespace-nowrap">
                                {item.inQueueCount} In Queue
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1 lyra-body-sm text-lyra-fg-secondary">
                              <Clock className="h-3 w-3" strokeWidth={1.5} />
                              Longest Wait Time: {item.wait}
                            </span>
                            {/* Available / Working / Unavailable agent counts for
                                this sub-queue — same icons, colors, and order as
                                PRODUCTIVITY_STATUS_META (Activity/Productivity
                                cards), just rendered as compact circular Icon
                                badges instead of a donut/bar. Each badge gets a
                                hover tooltip spelling out what the count means,
                                since the color/icon alone doesn't say "agents". */}
                            <div className="flex items-center gap-3">
                              <Tooltip content="Available Agents" placement="top">
                                <span className="inline-flex items-center gap-1.5">
                                  <Icon icon={CheckCircle2} size="sm" background="success" shape="circle" decorative />
                                  <span className="lyra-body-sm-emphasis text-lyra-fg-default">{item.available}</span>
                                </span>
                              </Tooltip>
                              <Tooltip content="Working Agents" placement="top">
                                <span className="inline-flex items-center gap-1.5">
                                  <Icon icon={CircleDot} size="sm" background="warning" shape="circle" decorative />
                                  <span className="lyra-body-sm-emphasis text-lyra-fg-default">{item.working}</span>
                                </span>
                              </Tooltip>
                              <Tooltip content="Unavailable Agents" placement="top">
                                <span className="inline-flex items-center gap-1.5">
                                  <Icon icon={MinusCircle} size="sm" background="critical" shape="circle" decorative />
                                  <span className="lyra-body-sm-emphasis text-lyra-fg-default">{item.unavailable}</span>
                                </span>
                              </Tooltip>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 px-4 py-4">
                        <Input label="Subject" placeholder="Enter subject" />
                        <Input label="Priority" placeholder="Select priority" />
                        <Input label="Assignee" placeholder="Search agents" />
                        <Input label="Tags" placeholder="Add tags" />
                      </div>
                    )}
                  </InteriorPanel>
                )}
                </>
              ))}
              </div>
                </div>
              )}
            </div>

            {/* The docked panel's own content, inline as this container's
                second tab — `Draggable`'s own grip/resize plumbing is
                skipped (nothing to drag-position or resize-into once this
                pane spans the container's full width), but the real
                `ContainerHeader` (title/icon/actions/close) is NOT — same
                shape `sharedPanel`'s `renderHeaderControls` below renders,
                just with the dock button wired directly to
                `handlePanelVariantChange` instead of `Draggable`'s own
                internal toggle (there's no mounted `Draggable` instance
                here to own that state while this pane is showing). Always
                shows the "docked" dock icon/label (`Move`/"Undock") since
                this pane only ever renders while `panelVariant === "docked"`
                — clicking it hands off to the exact same float rendering
                below (untouched), which is what makes the tabs disappear;
                re-docking from there flips `panelVariant` back to "docked"
                and `isCombinedPanelMode` brings the tabs right back. Also
                guarded on `!panelFullScreen` — if the nav narrows into
                combined mode while the shared panel happens to be
                fullscreen, `sharedPanelFullScreenOverlay` (rendered as
                `containerRef`'s own last child, further down) already
                covers this content; skip this copy so
                `activePanelContent.body` isn't mounted twice at once. */}
            {isCombinedPanelMode && activePanelContent && !panelFullScreen && (
              <div
                className={cn(
                  "flex flex-1 flex-col min-w-0 overflow-hidden",
                  narrowActiveRegion !== "panel" && "hidden"
                )}
              >
                <ContainerHeader
                  title={activePanelContent.title}
                  titleBadge={activePanelContent.titleBadge}
                  titleClassName={activePanelContent.titleClassName}
                  icon={activePanelContent.dockedIcon}
                  bordered={!activePanelContent.headerContent}
                  actions={
                    <>
                      {activePanelContent.headerActions}
                      <Tooltip content="Undock" placement="bottom" asLabel>
                        <ActionIconButton
                          aria-label="Undock"
                          size="sm"
                          onClick={() => handlePanelVariantChange("float")}
                          className="text-lyra-fg-secondary hover:text-lyra-fg-secondary"
                        >
                          <Move className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </ActionIconButton>
                      </Tooltip>
                    </>
                  }
                  onClose={() => setPanelOpen(false)}
                />
                {activePanelContent.headerContent && (
                  <div className="shrink-0 px-4 pb-3 border-b border-lyra-border-subtle">
                    {activePanelContent.headerContent}
                  </div>
                )}
                {activePanelContent.body}
              </div>
            )}

              </div>
            </div>

          </Container>

          {/* Shared single-container panel — float (CSS transitions, not
              keyframe animations — avoids compositor fill-mode flash).
              Was five near-identical blocks (one per panel); with only one
              physical container now, there's only one. */}
          {panelVariant === "float" && panelMounted && !panelFullScreen && (
            <div
              style={{
                ...getPanelFloatStyle(),
                pointerEvents: "none",
                visibility: panelState === "closed" ? "hidden" : "visible",
                opacity: panelState === "open" ? 1 : 0,
                transform: panelState === "open" ? "translateY(0)" : "translateY(-8px)",
                transition: panelState === "open"
                  ? "opacity 150ms ease, transform 150ms ease"
                  : "opacity 100ms ease, transform 100ms ease",
              }}
            >
              {sharedPanel}
            </div>
          )}

          {/* Shared single-container panel — fullscreen. Rendered here, as
              the last child of `containerRef`'s own div (which is already
              `relative`), so the `absolute inset-0` overlay fills exactly
              this container — LeftNav and AppHeader (both outside this
              div entirely) stay visible/untouched. See
              `sharedPanelFullScreenOverlay`'s own doc comment (near
              `sharedPanel`, above) for why this bypasses `Draggable`
              entirely instead of trying to stretch its "float" variant to
              cover the container. */}
          {sharedPanelFullScreenOverlay}

        </div>

        {/* Shared single-container panel — docked (sibling of containerRef
            so flex layout keeps it in-bounds). Was five near-identical
            blocks (one per panel); with only one physical container now,
            there's only one. Skipped in `isCombinedPanelMode` — below
            768px the panel's content renders inline as the main
            container's second tab instead (see above), not as this
            separate docked-width column beside it. Also skipped while
            `panelFullScreen` is on — `sharedPanelFullScreenOverlay` (an
            `absolute inset-0` overlay rendered as `containerRef`'s own last
            child, just above) takes over instead. */}
        {panelVariant === "docked" && !isCombinedPanelMode && !panelFullScreen && (
          <div className="flex h-full pb-3" style={{
            width: panelState === "open" ? panelWidth : 0,
            height: "100%",
            marginRight: panelState === "open" ? 12 : 0,
            overflow: "hidden",
            flexShrink: 0,
            transition: panelIsResizing ? "none" : "width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}>
            <div
              className="flex flex-col h-full animate-in fade-in-0 duration-150"
              style={{
                width: panelWidth,
                height: "100%",
                display: panelState === "open" ? "flex" : "none",
              }}
            >
              {sharedPanel}
            </div>
          </div>
        )}

      </div>

      {/* ── Welcome modal — shown once on page load. Uses the real lyra-ui
          `Modal` component (variant="light": frosted blur backdrop,
          portal-rendered via Radix Dialog, focus-trapped) rather than a
          hand-rolled backdrop div, so it actually dims/blurs the dashboard
          behind it like a real overlay instead of just painting over it.
          Not dismissible via backdrop click or Escape — only the two
          buttons close it. Previously composed by hand as `Overlay` +
          `AgentWelcomeMessage` (which itself rendered its own
          `Container variant="modal"` shell) — `Modal` now owns that
          Radix Dialog wiring directly, so `AgentWelcomeMessage` is passed
          `bare` to skip its own card chrome and avoid nesting two.

          `Modal`'s "light" variant is a fixed `bg-white/70` by design (see
          Overlay.stories.tsx — "light" vs. "dark" are two deliberately
          static, theme-independent overlay looks, not meant to react to
          dark mode). This page's backdrop needs to actually match the
          current theme, so we override just the background color via
          `overlayClassName` (twMerge drops the variant's `bg-white/70` for
          this `bg-[color-mix(...)]`, keeping `backdrop-blur-sm`). We use
          color-mix() instead of a plain `bg-lyra-bg-surface-shell/70`
          opacity modifier because Tailwind can't generate opacity-modified
          utilities for our `var(--lyra-color-*)` tokens (same root cause as
          the Tag border-color bug — see lyra-ui's PROJECT_SUMMARY.md).

          The card itself is still the shared `AgentWelcomeMessage` lyra-ui
          component (icon/title/lastLogin block + info-box slot + Separator +
          two-button footer) — `ariaTitle` gives screen readers the real
          dialog name since that title now renders inside `AgentWelcomeMessage`
          itself rather than through `Modal`'s own `headerTitle`. ── */}
      <Modal
        variant="light"
        overlayClassName="bg-[color-mix(in_srgb,var(--lyra-color-bg-surface-shell)_75%,transparent)]"
        open={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        closeOnBackdropClick={false}
        ariaTitle={`Good morning, ${CURRENT_AGENT_FIRST_NAME} ${CURRENT_AGENT_LAST_NAME}`}
      >
        {/* Info-box `children` (skills/teammates summary) hidden for
            now — per explicit request. `AgentWelcomeMessage` only renders
            that slot (and the Separator above the footer that goes with
            it) when `children` is actually passed, so simply omitting it
            here removes the box cleanly rather than rendering it empty.
            The numbers it used to show (`AGENT_SKILLS_COUNT`/
            `TEAMMATES_ONLINE_COUNT`/`TEAMMATES_AVAILABLE_COUNT`) are still
            defined/unused above — left in place to restore this easily
            later. */}
        <AgentWelcomeMessage
          bare
          icon={<img src={appIcon} alt="" className="h-8 w-8 shrink-0" />}
          title={`Good morning, ${CURRENT_AGENT_FIRST_NAME} ${CURRENT_AGENT_LAST_NAME}`}
          lastLogin={WELCOME_MODAL_LAST_LOGIN}
          onPrimaryClick={handleGoAvailable}
          onSecondaryClick={handleStartUnavailable}
        />
      </Modal>

      {/* Fired by `fireDismissToast` (`handleDismissInteraction`/
          `handleDismissChannel`), `fireAgentLegStatusToast`
          (`AgentProfile`'s own `onAgentLegStatusChange`), and
          `handleInteractionStatusChange` (any status pill/Outcome
          Resolution change) — kept at the very end of this tree, a sibling
          of everything else, same as `Modal` above, so it's always mounted
          regardless of which desk tab/panel is currently active.

          Wrapping `<div>` takes over the `fixed bottom-4 right-4`
          positioning `ToastContainer` normally owns itself (overridden
          below via its own `className` — `cn`'s `tailwind-merge` cleanly
          drops the conflicting defaults rather than fighting them) so the
          "Dismiss All" chip can sit as a normal flex sibling ABOVE the
          toast stack, per explicit request, rather than needing a second,
          separately-measured `fixed` element trying to track the first
          toast's ever-changing position by hand. */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {/* Only once there's more than one toast actually stacked up —
            with just one (or zero) on screen, its own "×" is already the
            one-click way to clear it; this chip only earns its place once
            dismissing them one at a time would actually be tedious. */}
        {toasts.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={dismissAllToasts}
            className="rounded-full bg-lyra-bg-surface-overlay shadow-lg"
          >
            Dismiss All
          </Button>
        )}
        <ToastContainer className="static bottom-auto right-auto z-auto">
          {toasts.map((t) => (
            <Toast key={t.id} variant={t.variant} title={t.title} duration={t.duration} onDismiss={() => dismissToast(t.id)}>
              {t.message}
            </Toast>
          ))}
        </ToastContainer>
      </div>
    </div>
  );
}
