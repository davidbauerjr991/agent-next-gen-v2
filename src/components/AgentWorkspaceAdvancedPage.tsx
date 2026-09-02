// AgentWorkspaceAdvancedPage — "Agent Workspace 2.0 Advanced" (originally
// "Agent Workspace Advanced", renamed per explicit request — the
// component/file name and internal `"agent-advanced"` page id/route were
// deliberately left as-is) in the top-left app menu (agent-next-gen-
// outbound-data.tsx's `buildAppMenuGroups`, second item), its own route at
// #/agent-advanced (App.tsx). Per explicit
// request, this is a duplicate of AgentNextGenPage.tsx (only the exported
// component's own name + this page's own display strings/page id were
// changed) — a genuinely separate file/component so edits to "Agent
// Workspace 2.0" (AgentNextGenPage.tsx) do NOT affect this page, and vice
// versa. Same convention as AgentWorkspace2WithDeskPage.tsx's own top-of-
// file note — the two are NOT kept in sync automatically.
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  AppHeader,
  AppNameMenu,
  CXoneLogo,
  Modal,
  useAgentNotificationsContent,
  Draggable,
  ContainerHeader,
  NotificationsBell,
  AgentProfile,
  Container,
  PageHeader,
  Button,
  InlineNotification,
  ActionIconButton,
  KebabMenuButton,
  PanelPinButton,
  useColumnReorder,
  Input,
  LeftNav,
  NavRail,
  CreateNew,
  useOutboundAddButton,
  InteractionNavItem,
  Icon,
  Badge,
  Separator,
  DashboardQueue,
  AgentWelcomeMessage,
  TabList,
  Tab,
  ChannelTab,
  ToggleGroup,
  Popover,
  Toast,
  ToastContainer,
  useToast,
  AgentLegDisconnectedToast,
  Select,
  Tooltip,
  type SelectOption,
  type SortDirection,
  type CreateNewOutboundConfig,
  type CreateNewOutboundContact,
  type InteractionChannel,
  type ChannelType,
  type InteractionNavItemProps,
  type ChannelOutcomeConfig,
  type AgentStatus,
  type AgentNotification,
  type DraggableVariant,
  type EmbeddablePanelContent,
  type MenuEntry,
  CHANNEL_TYPE_META,
  InteriorPanel,
  EmptyState,
} from "@nicecxone/lyra-ui";
import { CREATE_NEW_CUSTOMERS, type CreateNewCustomerRecord } from "@nicecxone/lyra-ui/customers-data";
import { useScheduleContent } from "@nicecxone/lyra-ui";
import {
  initialsFor,
  generateCaseId,
  generateInteractionId,
  generateContactId,
  formatElapsedTime,
  formatWaitTime,
  getAwaitingSeverity,
  CURRENT_AGENT_FIRST_NAME,
  CURRENT_AGENT_LAST_NAME,
  CURRENT_AGENT_ID,
  withoutChannelStatus,
  nextCustomerSortDirection,
  synthesizeChannelAddress,
  SHOW_ADD_CHANNEL_HEADER_BUTTON,
  buildContactOverviewInfo,
  type Page,
} from "@/components/agent-next-gen-shared-utils";
import {
  type TranscriptMessage,
  TRANSCRIPT_SESSION_STATUS_OPTIONS,
  OUTCOME_TAG_OPTIONS,
  OUTCOME_DISPOSITION_OPTIONS,
  OUTCOME_DEFAULT_SUMMARY,
  resolveCustomerAutoReply,
  InteractionTranscript,
  InteractionComposer,
  TRANSCRIPT_SESSIONS,
  TRANSCRIPT_SESSIONS_VOICE,
  TRANSCRIPT_SESSIONS_EMAIL,
} from "@/components/agent-next-gen-transcript";
import {
  buildAppMenuGroups,
  OUTBOUND_TEAMS,
  OUTBOUND_TEAM_MEMBERS,
  OUTBOUND_CONFIG,
  OUTBOUND_AGENTS,
  CONTACT_HISTORY_OUTBOUND_CONTACTS,
  buildContactHistoryOutboundContacts,
} from "@/components/agent-next-gen-outbound-data";
import {
  type Thread,
  type Interaction,
  buildNavItems,
  type AssignmentSortValue,
  sortAssignments,
  AssignmentsSectionCaption,
  interactionHasBreachedSla,
  NOTIFICATION_CHANNEL,
  INITIAL_NOTIFICATIONS,
  type LatestContact,
  WELCOME_MODAL_LAST_LOGIN,
  type QueueSubItem,
  INITIAL_QUEUE_SUB_ITEMS,
  sumInQueue,
  AGENTS_COUNT_BY_QUEUE,
  QUEUE_WAIT_BASE_SECONDS,
  LATEST_CONTACTS_STATIC,
  PerformanceBreakdownCard,
  PerformanceSummaryCard,
} from "@/components/agent-next-gen-interaction-dashboard";
import {
  type ContactHistoryEntry,
  buildDismissedContactHistoryEntry,
  buildContactHistoryByRange,
  ContactHistoryCard,
  ContactHistoryEntryDetail,
} from "@/components/agent-next-gen-contact-history";
import { saveCaseRecord, getCaseRecord } from "@/components/agent-next-gen-case-database";
import { readAgentLegStatus, saveAgentLegStatus, consumeInitialAgentLegAnnouncement } from "@/components/agent-next-gen-agent-leg-state";
import {
  type CustomerListRecord,
  CUSTOMER_LIST_RECORDS,
  type CustomerColKey,
  type CustomerFilterKey,
  CustomersListView,
} from "@/components/agent-next-gen-customers-table";
import { useSearchPanelContent, type SearchPanelTabKey } from "@/components/agent-next-gen-search-panel";
// `InteractionsListView` reimported directly per the "All Contacts"
// follow-up (`showAllContacts`, below) — the Search panel's own Contacts
// tab still renders it internally too (agent-next-gen-search-panel.tsx, via
// `useSearchPanelContent`), this is a second, independent render of the
// same component. `InteractionHistoryRecord` is still needed here for
// `handleOpenInteractionRow`'s own parameter type.
import {
  InteractionsListView,
  type InteractionHistoryRecord,
  buildContactHistoryEntryFromInteractionRecord,
} from "@/components/agent-next-gen-interactions-table";
import {
  type CustomerHistorySessionEntry,
  HistoryConversationView,
  CustomerInfoHoverPreview,
  CustomerInformationSidePanel,
  CustomerRowInfoPanel,
  AGENT_WORKSPACE_CUSTOMER_PANEL_TABS,
  type CustomerPanelTabLabel,
  buildCustomerInfoFields,
  useCustomerRecordDraft,
  findPossibleCustomerMatches,
  filterCustomersByQuery,
  buildCopilotSummary,
} from "@/components/agent-next-gen-customer-info-panel";
// PROTOTYPE — local-only, not in lyra-ui yet. See CollapsedChannelBadge's
// own doc comment for why, and CLAUDE.md's lyra-ui rules for the convention
// this follows (build new things locally, promote to lyra-ui only once
// explicitly asked).
import { CollapsedChannelBadge } from "@/components/CollapsedChannelBadge";
import { AddChannelAdHocButton } from "@/components/agent-next-gen-add-channel-button";
import appIcon from "@/assets/app-icon.svg";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  CircleDot,
  MinusCircle,
  UserCog,
  LayoutGrid,
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
  PanelRightClose,
  History,
  Maximize2,
  Minimize2,
  IdCard,
  PhoneOutgoing,
  RotateCcw,
  User,
  Headphones,
  ChevronRight,
  CircleAlert,
  Inbox,
  type LucideIcon,
} from "lucide-react";

// Shared default width for the single app-header panel (Search/Customers/
// Accounts/Tickets/WEM/Screen Pop/Agent Chat/Schedule/Notifications) —
// renamed from `AI_PANEL_DEFAULT_WIDTH` now that Ask AI (its original sole
// occupant, back when each of these was its own independently-sized
// `Draggable`) has been removed from this app.
// ── AgentWorkspaceAdvancedPage ── (see agent-next-gen-shared-utils.ts and sibling
// agent-next-gen-*.ts(x) files for everything this component itself no
// longer declares — split out once this file crossed Babel's 500KB
// code-generator threshold)
const SHARED_PANEL_DEFAULT_WIDTH = 360;

// The true, VISUAL minimum content width the interaction record's own main
// content column (`containerRef`) and the docked shared panel (Notifications/
// AI/Apps/etc., `Draggable`'s own `minWidth`) should both deliver at their
// respective floors — per explicit request, so the two sit at the same
// on-screen size at minimum, not just the same raw CSS number. The two
// consumers read this differently because only ONE of them pays a padding
// tax on the way there (see `INTERACTION_MAIN_CONTENT_MIN_WIDTH`, just below,
// for why): the docked panel's own outer box has no padding of its own, so it
// passes this value straight through as its literal `minWidth` prop; the main
// content column needs to add its own padding back on top (that's exactly
// what `INTERACTION_MAIN_CONTENT_MIN_WIDTH` is for).
const SHARED_CONTENT_MIN_VISUAL_WIDTH = 362;

// The interaction record's own main content column (record-header tab row +
// transcript + composer, `containerRef`'s div) — never renders narrower
// than this, even with a docked shared panel (Notifications/AI/Apps/etc.)
// open and LeftNav expanded. Below this, the record-header tab's own
// address/name label, the transcript bubbles, and the composer all started
// cramping/wrapping (confirmed live — the exact report that prompted this
// constant). Paired with `dockedPanelRenderWidth`'s own clamp (this docked
// panel's own render block, further down) rather than left as a plain CSS
// `min-w-[…]` floor on its own: a bare CSS floor with nothing else giving up
// space just pushes the WHOLE row past the viewport once every sibling's
// combined width exceeds what's actually available (confirmed live as an
// earlier, simpler attempt's actual failure mode) — the docked panel has to
// be the one that shrinks to make room, since it's the only sibling here
// with a size that's a preference (a drag-resized width) rather than a
// genuine floor of its own.
//
// `containerRef`'s own div is `border-box` sized (Tailwind's preflight
// default), so its `pr-3` (12px) right padding is CARVED OUT of a plain
// `min-w-[350px]` rather than added on top of it, leaving only 338px of
// actual usable content width for the record-header row/transcript/composer
// inside — confirmed live as the reason the row was still measurably
// narrower than intended even though the floor was technically "holding" at
// 350. This is `SHARED_CONTENT_MIN_VISUAL_WIDTH` (the real, usable-content
// target both this column and the docked panel should match) + 12 (this same
// `pr-3`), so the CONTENT area itself — not the padded border-box — never
// drops below `SHARED_CONTENT_MIN_VISUAL_WIDTH`. The docked panel does NOT
// need this same `+ 12` treatment — its own outer box carries no equivalent
// padding, so `SHARED_CONTENT_MIN_VISUAL_WIDTH` alone already lands it at the
// same real visual width as this column's floor.
//
// Two call sites read this: the plain CSS floor itself is a literal
// `min-w-[374px]` on `containerRef`'s own div (Tailwind's arbitrary-value
// classes need a literal string at build time, same reason
// `CUSTOMER_INFO_COLUMN_MINWIDTHS` above pairs each column's own
// `min-w-[…]` string with a plain numeric `minWidthPx` for JS math) — keep
// that literal in sync with this constant by hand if it ever changes.
const INTERACTION_MAIN_CONTENT_MIN_WIDTH = SHARED_CONTENT_MIN_VISUAL_WIDTH + 12;

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

// Wraps a single `InteractionNavItem` (plus its collapsed-rail-only
// `CollapsedChannelBadge` overlay) behind ONE stable top-level element,
// rather than the `.map()` callback below returning two structurally
// different shapes (a bare `InteractionNavItem` when expanded vs. a
// wrapping `<div className="relative">` around it + the badge when
// collapsed) depending on `navOpen`. That structural split is what broke
// `LeftNav`'s own hover-to-expand overlay mode (left-nav.tsx's
// `injectExpanded`) — per explicit bug report/screenshot: hovering the
// collapsed rail open visibly widened it to the full 256px panel (New
// Outbound's full label, "Assignments (N active)"'s full text — both
// plain top-level children of `header`, correctly re-cloned with
// `expanded={hoverOpen}`), but each interaction card stayed stuck as its
// small collapsed avatar tile instead of also switching to the full card.
// `injectExpanded` only clones `expanded` onto `header`'s own TOP-LEVEL
// children — with the collapsed-mode wrapper div in the way, that clone
// landed on a plain `<div>` (which just ignores an unknown `expanded`
// prop) instead of ever reaching the real `InteractionNavItem` nested
// inside it, which was left stuck on whatever `expanded={navOpen}` value
// `AgentNextGenPage` had explicitly hardcoded onto it (the PINNED
// open/closed state, not hover state) — so it never flipped along with
// hovering, no matter how wide the rail visibly got.
//
// This component is the fix: the `.map()` below now always returns ONE
// `<InteractionNavCard>` per card, unconditionally, so `injectExpanded`
// always has a single real element to clone `expanded` onto. Internally,
// THIS component (not the caller) decides whether to render the plain
// expanded card or the collapsed tile + badge, based on whatever
// `expanded` value it actually received — which is exactly the value
// `injectExpanded` just overwrote when hovering open in overlay mode, so
// the decision now correctly follows hover state, not just `navOpen`.
interface InteractionNavCardProps extends InteractionNavItemProps {
  /** This interaction's current channel type — only used for the
   *  collapsed-rail badge (see `showChannelBadge` below); ignored once
   *  `expanded` is true, since the expanded card already shows a per-
   *  channel chip for each open channel. */
  currentChannelType?: ChannelType;
  /** Whether the collapsed-rail badge should render at all — false once a
   *  card has more than one open channel, since `InteractionNavItem`
   *  already renders its own multi-channel count badge in that exact same
   *  corner (see `CollapsedChannelBadge`'s own doc comment for why the two
   *  are mutually exclusive). */
  showChannelBadge: boolean;
  /** Same "success"/"warning"/"critical" SLA tier the expanded card's own
   *  `awaitingSeverity` prop already resolves — passed straight through to
   *  `CollapsedChannelBadge` so the collapsed badge escalates in lockstep
   *  with the rest of the card. */
  badgeSeverity?: "success" | "warning" | "critical";
}
function InteractionNavCard({
  currentChannelType,
  showChannelBadge,
  badgeSeverity,
  expanded,
  ...itemProps
}: InteractionNavCardProps) {
  return !expanded ? (
    <div className="relative">
      <InteractionNavItem expanded={expanded} {...itemProps} />
      {currentChannelType && showChannelBadge && (
        <CollapsedChannelBadge type={currentChannelType} severity={badgeSeverity} />
      )}
    </div>
  ) : (
    <InteractionNavItem expanded={expanded} {...itemProps} />
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

// Search panel's own sub-tabs (`useSearchPanelContent`, agent-next-gen-
// search-panel.tsx) — all 4 tabs, with "interactions" listed FIRST per
// explicit request (was "customers" first, per an earlier explicit
// request — reverted per this later one, "have Interactions be the first
// tab visible" instead): that hook treats the first entry as both the
// leftmost tab AND its own default active tab. `AgentWorkspace2WithDeskPage.tsx`
// passes its own, shorter list (just Messages/Threads) to the same hook
// instead of this constant — see that file's own call site.
const SEARCH_PANEL_TABS: SearchPanelTabKey[] = ["interactions", "customers", "messages", "threads"];

// Builds a `tagOpenChannels` closure off of the given `interactions` — reads
// each `Thread.type`/`.value` (skipping any channel the agent has
// explicitly closed, `channelStatuses[c.id] === "Closed"`, since reselecting
// a closed channel is how it gets reopened again — see `handleStartCall`'s
// own `isReopenOfClosedChannel` branch) into per-contact maps of every
// address in use (`openChannelAddresses`) and every channel *type* open
// regardless of address (`openChannelTypes`, needed even when a channel has
// no stored address at all, e.g. `handleRedial`'s voice channel). Pulled out
// to a standalone function (rather than inlined in the `outboundConfig`
// `useMemo` below) so the exact same tagging can ALSO run over
// `CONTACT_HISTORY_OUTBOUND_CONTACTS` (see the `contactHistoryOutboundContacts`
// memo further down) — those contacts are deliberately kept OUT of
// `outboundConfig.groups` itself (would make them wrongly searchable from
// New Outbound, see that memo's own doc comment), so they'd otherwise never
// receive this tagging at all and their already-open channels would show as
// selectable again in a reopened Contact History card's "+" (Add Channel) row.
function buildOpenChannelTagger(interactions: Interaction[]) {
  const openAddressesByContactId = new Map<string, Partial<Record<ChannelType, string[]>>>();
  const openTypesByContactId = new Map<string, Set<ChannelType>>();
  for (const interaction of interactions) {
    const byType: Partial<Record<ChannelType, string[]>> = {};
    const types = new Set<ChannelType>();
    for (const c of interaction.threads) {
      if (interaction.threadStatuses?.[c.id] === "Closed") continue;
      types.add(c.type);
      if (!c.value) continue;
      (byType[c.type] ??= []).push(c.value);
    }
    openAddressesByContactId.set(interaction.id, byType);
    openTypesByContactId.set(interaction.id, types);
  }
  return function tagOpenChannels(
    contact: NonNullable<CreateNewOutboundConfig["groups"][number]["contacts"]>[number]
  ) {
    const openChannelAddresses = openAddressesByContactId.get(contact.id);
    const openChannelTypes = openTypesByContactId.get(contact.id);
    if (!openChannelTypes || openChannelTypes.size === 0) return contact;
    return {
      ...contact,
      ...(openChannelAddresses && Object.keys(openChannelAddresses).length > 0 ? { openChannelAddresses } : {}),
      openChannelTypes: [...openChannelTypes],
    };
  };
}

/** Duplicated verbatim from AgentNextGenPage.tsx (Agent Workspace 2.0) per
 *  this codebase's "no shared sync" convention (see BEHAVIOR.md) — used
 *  ONLY for the unknown-contact record-header subtitle (see the
 *  `resolveActiveChannelDateTimeLabel` doc comment below, and the
 *  `PageHeader`'s `subtitle` render call site further down this file). */
function formatCompactDateTime(input: string | Date): string | undefined {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return undefined;
  const datePart = date.toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "numeric" });
  const timePart = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${datePart} ${timePart}`;
}

/** Duplicated verbatim from AgentNextGenPage.tsx (Agent Workspace 2.0) per
 *  this codebase's "no shared sync" convention — see that file's own doc
 *  comment on this same function for the full priority-order rationale.
 *  Used ONLY for the unknown-contact record-header subtitle (this tier's
 *  real-customer subtitle is untouched by this port). */
function resolveActiveChannelDateTimeLabel(
  channelType: ChannelType | undefined,
  isFreshLaunch: boolean,
  activeChannel: Thread | undefined,
  launchedAt: string | undefined
): string | undefined {
  const reopened = activeChannel?.reopenedContacts?.[activeChannel.reopenedContacts.length - 1];
  if (reopened) {
    return formatCompactDateTime(`${reopened.date} ${reopened.startTime}`);
  }
  if (isFreshLaunch) {
    const isTextChannel = channelType === "chat" || channelType === "sms" || channelType === "whatsapp";
    if (isTextChannel) {
      return launchedAt ? formatCompactDateTime(launchedAt) : "Draft";
    }
    return formatCompactDateTime(new Date());
  }
  const baseSessions =
    channelType === "email"
      ? TRANSCRIPT_SESSIONS_EMAIL
      : channelType === "voice"
        ? TRANSCRIPT_SESSIONS_VOICE
        : channelType === "chat" || channelType === "sms" || channelType === "whatsapp"
          ? TRANSCRIPT_SESSIONS
          : undefined;
  const lastSession = baseSessions?.[baseSessions.length - 1];
  if (!lastSession) return undefined;
  return formatCompactDateTime(`${lastSession.date} ${lastSession.startTime}`);
}

/** Finds the most recent real customer-response timestamp across EVERY
 *  thread on an interaction (not just the active one) and formats it with
 *  `formatCompactDateTime` — feeds the record-header subtitle's
 *  "{N} channels open | Last Customer Response: {date/time}" pattern below,
 *  per explicit follow-up request, shown once 2+ channels are open in place
 *  of the single active channel's own "{icon} {label} | {date}" line (that
 *  line stops meaning much once several channels are live at once — this
 *  answers "when did the customer last actually say something," across
 *  whichever channel that happened on).
 *
 *  Resolution per thread, most authoritative first:
 *  1. `lastCustomerMessageTick` — set the instant a real (or simulated)
 *     customer reply lands on THIS session (`handleSendMessage`'s reply
 *     timeout). It's a `clockTick` value — real elapsed seconds since this
 *     page mounted (`clockTick`'s own 1-per-second `setInterval`, see that
 *     state's doc comment above) — so `pageMountTimeMs + tick * 1000` gives
 *     an exact, real wall-clock `Date`, not a mock string.
 *  2. `reopenedContacts` — a thread reopened from Contact History carries a
 *     real historical date/time of its own even with no live reply yet.
 *  3. A genuinely fresh (`interaction.startedFresh`) thread with neither of
 *     the above has had NO customer response at all — skipped outright,
 *     deliberately NOT falling through to canned session data (that would
 *     surface stale, unrelated mock history for a channel the customer
 *     hasn't touched, the same "isFreshLaunch short-circuits before the
 *     canned branch" reasoning `resolveActiveChannelDateTimeLabel` above
 *     already applies).
 *  4. Otherwise (a pre-existing/real customer channel, no live activity
 *     this session) — that channel type's last canned session's own last
 *     CUSTOMER-sender message timestamp (chat/sms/whatsapp only; Voice/
 *     Email's canned sessions ship an empty `messages: []`, so those fall
 *     back to the session's own `startTime`, same as
 *     `resolveActiveChannelDateTimeLabel`'s own base-session fallback).
 *
 *  Returns `undefined` (not a broken "Last Customer Response: undefined"
 *  string) when NONE of the interaction's threads have any qualifying
 *  response yet — the subtitle then reads just "{N} channels open" with no
 *  trailing clause. */
function resolveInteractionLastCustomerResponseLabel(
  interaction: Interaction,
  pageMountTimeMs: number
): string | undefined {
  let latest: Date | undefined;
  const consider = (candidate: Date | undefined) => {
    if (candidate && !Number.isNaN(candidate.getTime()) && (!latest || candidate.getTime() > latest.getTime())) {
      latest = candidate;
    }
  };
  for (const c of interaction.threads) {
    if (c.lastCustomerMessageTick !== undefined) {
      consider(new Date(pageMountTimeMs + c.lastCustomerMessageTick * 1000));
      continue;
    }
    const reopened = c.reopenedContacts?.[c.reopenedContacts.length - 1];
    if (reopened) {
      consider(new Date(`${reopened.date} ${reopened.startTime}`));
      continue;
    }
    // Per-THREAD, not `interaction.startedFresh` — see `Thread.startedFresh`'s
    // own doc comment. This loop already iterates per-thread (`c`); a
    // genuinely fresh thread (no history to fall back to) skips the canned
    // fallback below regardless of whether the interaction it lives on was
    // itself born fresh or resumed from history.
    if (c.startedFresh) continue;
    const baseSessions =
      c.type === "email"
        ? TRANSCRIPT_SESSIONS_EMAIL
        : c.type === "voice"
          ? TRANSCRIPT_SESSIONS_VOICE
          : c.type === "chat" || c.type === "sms" || c.type === "whatsapp"
            ? TRANSCRIPT_SESSIONS
            : undefined;
    const lastSession = baseSessions?.[baseSessions.length - 1];
    if (!lastSession) continue;
    const lastCustomerMessage = [...lastSession.messages].reverse().find((m) => m.sender === "customer");
    consider(new Date(`${lastSession.date} ${lastCustomerMessage?.timestamp ?? lastSession.startTime}`));
  }
  return latest ? formatCompactDateTime(latest) : undefined;
}

export function AgentWorkspaceAdvancedPage({
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
  initialInteraction?: Interaction;
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
  const [interactions, setInteractions] = useState<Interaction[]>(
    () => (initialInteraction ? [initialInteraction] : [])
  );
  // Real "Assignments resolved today" count — previously read by the
  // dashboard header's own `SHOW_RESOLVED_TODAY_CHIP`-gated Badge (see
  // that flag's own doc comment, agent-next-gen-shared-utils.ts, and the
  // `PageHeader` `actions` slot below, now showing the "{N} Active
  // Assignments" chip instead). That Badge was already hidden behind the
  // flag before this change; now nothing reads the value at all, so only
  // the setter is destructured — `handleInteractionStatusChange` below
  // still increments it live on every real Resolved transition, so
  // re-enabling the old badge later only needs this destructure changed
  // back, not the tracking logic itself.
  const [, setResolvedTodayCount] = useState(0);
  // Keeps `agent-next-gen-case-database.ts`'s own local "database" in sync
  // with every live interaction's TRUE current state — see this same
  // effect's own doc comment in AgentNextGenPage.tsx for the full
  // reasoning (mirrored here per this file's own established convention of
  // mirroring bug fixes/behavior changes across all 3 page components).
  useEffect(() => {
    interactions.forEach((interaction) => saveCaseRecord(interaction));
  }, [interactions]);
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
  const fireDismissToast = (
    interaction: Pick<Interaction, "customerName" | "customerId">,
    // Per explicit request: a genuine, never-launched draft being deleted
    // (see `handleDismissInteraction`/`handleDismissChannel`'s own
    // `everSentAgentMessage` check) reads as "Draft Deleted" instead of
    // "Successfully Dismissed" — there was never a real assignment to
    // dismiss, just an untouched draft to discard. Default `false` — every
    // existing call site (a real, worked assignment) is unaffected.
    isDraftDelete = false
  ) => {
    addToast({
      variant: "success",
      title: "Success",
      message: isDraftDelete
        ? `${interaction.customerName ?? "Customer"} Draft Deleted`
        : `${interaction.customerName ?? "Customer"} ${interaction.customerId} Successfully Dismissed`,
      duration: 4000,
    });
  };
  // Bumped by `handleConnectAgentLeg` below to imperatively start
  // connecting the agent leg from the dedicated `AgentLegDisconnectedToast`'s
  // own "Connect" button (lyra-ui) — see `AgentProfile`'s
  // `connectAgentLegSignal` prop for why a changing number, not a
  // boolean/callback, is what actually triggers this (agent-profile.tsx).
  const [connectAgentLegSignal, setConnectAgentLegSignal] = useState(0);
  // Seeds `AgentProfile`'s new `initialAgentLegStatus` prop (agent-profile
  // .tsx) with whatever the agent leg was last doing — possibly on a
  // DIFFERENT page (see agent-next-gen-agent-leg-state.ts's own top-of-file
  // doc comment for why this page alone can't be trusted to know that on
  // its own: switching between Agent Workspace tiers fully unmounts one
  // page and mounts another). Lazy initializer + `useState` (read once, at
  // mount) rather than a plain `const` — matches this file's other
  // read-once-at-mount seeds (e.g. `showWelcomeModal`'s own sibling state
  // just below) and keeps the read out of the render body proper.
  const [initialAgentLegStatus] = useState(() => readAgentLegStatus());
  // Tri-state mirror of `AgentProfile`'s own real `agentLegStatus` state
  // machine (agent-profile.tsx), seeded from the same persisted settled
  // value above. Same pattern as 2.0's `AgentNextGenPage.tsx`/Premium's
  // `AgentWorkspace2WithDeskPage.tsx` — see either file's own doc comment
  // for the full rationale: `handleConnectAgentLeg` below sets
  // `"connecting"` the instant the agent clicks the link, and
  // `fireAgentLegStatusToast` below sets the real settled value once
  // `AgentProfile`'s own `~2s` connecting→connected transition (or an
  // instant disconnect) actually fires `onAgentLegStatusChange` — never
  // set directly to `"connected"`/`"disconnected"` from anywhere else. Per
  // explicit request ("remove the connect agent leg from the right
  // side"), this state's only reader — the dashboard header's "Connect
  // Agent Leg" link/"Connecting..."/"Connection Lag Time: {lagTime}"
  // subhead — was removed (see §129's Advanced follow-up), so the read
  // binding is dropped here (only the setter is still needed); the state
  // itself stays, still tracked in lockstep with `AgentProfile`.
  const [, setAgentLegStatus] = useState<"disconnected" | "connecting" | "connected">(
    initialAgentLegStatus
  );
  // Whether the dedicated `AgentLegDisconnectedToast` (lyra-ui) is currently
  // showing — same "presence controls mounting" idiom `useToast`'s own
  // `toasts` array already uses for every other toast, just a plain
  // boolean since there's only ever one of these at a time (see that
  // component's own top-of-file doc comment). Set `true` on a real
  // "disconnected" event, `false` on a real "connected" event OR the
  // toast's own `onDismiss` (its "×", or its "Connect" button — see
  // `handleConnectAgentLeg` below) — per explicit request: "keep the alert
  // open until the agent connects the agent leg or clicks the close
  // button."
  const [agentLegDisconnectedToastOpen, setAgentLegDisconnectedToastOpen] = useState(false);
  // Fired by `AgentProfile`'s own `onAgentLegStatusChange` (agent-profile.tsx)
  // once the agent leg actually finishes connecting/disconnecting — never
  // for the in-between "connecting" state, and never on initial mount (see
  // that prop's own doc comment). `success`/`warning` rather than always
  // `success` — landing back on "disconnected" isn't a positive event the
  // way finishing a connect is, same reasoning the SLA banner elsewhere in
  // this file reserves warning/critical for something actually needing
  // attention rather than defaulting every toast to green.
  //
  // "Disconnected" no longer goes through the plain `addToast`/`toasts`
  // list at all — it's the dedicated `AgentLegDisconnectedToast` (lyra-ui)
  // instead, toggled via `agentLegDisconnectedToastOpen` above, since that
  // one needs its own persistent (no-auto-dismiss)/"Connect"-button
  // behavior no other toast in this app has. "Connected" is still a plain,
  // ordinary 4000ms-auto-dismiss toast exactly as before.
  const showAgentLegToast = (agentLegConnectionStatus: "disconnected" | "connected") => {
    if (agentLegConnectionStatus === "disconnected") {
      setAgentLegDisconnectedToastOpen(true);
      return;
    }
    setAgentLegDisconnectedToastOpen(false);
    addToast({
      variant: "success",
      title: "Agent Leg Connected",
      message: "Your agent leg is now connected.",
      duration: 4000,
    });
  };
  // Wired to `AgentLegDisconnectedToast`'s own `onConnect` — starts the
  // real connect. Closing the toast itself is `onDismiss`'s job (wired
  // separately below, right where the component is rendered), not this
  // function's — `AgentLegDisconnectedToast` already calls both in the
  // right order on a "Connect" click (see its own doc comment).
  const handleConnectAgentLeg = () => {
    setAgentLegStatus("connecting");
    setConnectAgentLegSignal((n) => n + 1);
  };
  // Last agent-leg status that arrived while the welcome modal was still
  // open — a ref (not state) since holding it shouldn't itself trigger a
  // re-render; the effect below is what actually flushes it once the modal
  // closes.
  const pendingAgentLegToastRef = useRef<"disconnected" | "connected" | null>(null);
  // Deferred, not dropped, while the welcome modal (`showWelcomeModal`) is
  // still open, per explicit request — the agent hasn't chosen Available/
  // Start Offline yet at that point, so a toast landing behind (or fighting
  // for attention with) the modal's own forced-choice UI reads as premature.
  // The agent leg's own status still updates normally underneath either way
  // (see `AgentProfile`'s `agentLegStatus`) — this just holds the
  // notification about it until right after the modal's been answered,
  // instead of showing it immediately or losing it entirely.
  const fireAgentLegStatusToast = (agentLegConnectionStatus: "disconnected" | "connected") => {
    // Persisted immediately, unconditionally — this is the real, settled
    // status the moment it happens; only the TOAST announcing it (below) is
    // ever deferred, not the underlying state a later page mount needs to
    // pick up from (see agent-next-gen-agent-leg-state.ts's own doc
    // comment).
    saveAgentLegStatus(agentLegConnectionStatus);
    // Updated unconditionally, same as `saveAgentLegStatus` right above —
    // this is the dashboard header's own tri-state mirror of the real
    // settled status (see `agentLegStatus`'s own doc comment), not the
    // toast announcing it, so it must NOT wait on `showWelcomeModal` the
    // way the toast itself (below) does.
    setAgentLegStatus(agentLegConnectionStatus);
    if (showWelcomeModal) {
      pendingAgentLegToastRef.current = agentLegConnectionStatus;
      return;
    }
    showAgentLegToast(agentLegConnectionStatus);
  };
  // Per explicit request: "I want it to display a not connected toast [on
  // login] but if connected, keep it connected when going to premium,
  // advanced, basic (and likewise keep it disconnected but don't fire the
  // toast again)." `consumeInitialAgentLegAnnouncement()` (agent-next-gen-
  // agent-leg-state.ts) is only `true` for the very FIRST Agent Workspace
  // page mounted in this browser tab — a genuine login — and `false` for
  // every subsequent tier switch (App.tsx itself never unmounts across
  // Premium/Advanced/Basic, so the module-level flag behind that function
  // survives every switch). Reuses `fireAgentLegStatusToast` (not
  // `showAgentLegToast` directly) so this goes through the exact same
  // welcome-modal deferral every other agent-leg toast already does. Only
  // fires for `"disconnected"` — a fresh login that's already carrying a
  // CONNECTED status (e.g. a real browser reload after connecting earlier
  // this same tab) has nothing to announce; a genuine in-session connect
  // event is still covered by the ordinary `showAgentLegToast("connected")`
  // success toast, unchanged.
  useEffect(() => {
    if (initialAgentLegStatus === "disconnected" && consumeInitialAgentLegAnnouncement()) {
      fireAgentLegStatusToast("disconnected");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
  // Per explicit request/follow-up: a fourth possible source, `"header"`,
  // for the record header's own top-right icon-button cluster — only
  // rendered while `showChannelTabRow` reads `false` for the active
  // interaction (see that const's own doc comment). Mirrors Agent Workspace
  // 2.0's identical `outcomeDraftSource` union (AgentNextGenPage.tsx).
  const [outcomeDraftSource, setOutcomeDraftSource] = useState<"leftnav" | "transcript" | "tab" | "header" | null>(null);
  const buildDefaultOutcomeDraft = () => ({
    tags: ["Technical", "Account"],
    dispositionCode: OUTCOME_DISPOSITION_OPTIONS[0].value,
    summary: OUTCOME_DEFAULT_SUMMARY,
  });
  const [outcomeDraft, setOutcomeDraft] = useState(buildDefaultOutcomeDraft);
  // Duplicated verbatim from AgentNextGenPage.tsx (Agent Workspace 2.0) per
  // this codebase's "no shared sync" convention — records, per
  // `${interactionId}:${channelKey}`, the real wall-clock moment a
  // brand-new text-channel thread's first-ever LIVE agent message actually
  // went out (captured once inside `handleSendMessage`, below). Used only
  // by `resolveActiveChannelDateTimeLabel` (above) so a fresh outbound
  // chat/SMS/WhatsApp thread's unknown-contact subtitle shows the literal
  // string "Draft" until that first message is sent, then freezes on the
  // real send time instead of ticking with `new Date()` forever.
  const [threadLaunchTimestamps, setThreadLaunchTimestamps] = useState<Record<string, string>>({});
  /** Per explicit request ("add a customer typing animation when a customer
   *  is responding to a sms/chat/whatsapp") — duplicated verbatim from
   *  AgentNextGenPage.tsx per this codebase's "no shared sync" convention:
   *  `true` while a simulated customer reply is in flight on a given
   *  channel, keyed `${interactionId}:${channelKey}`. */
  const [customerTyping, setCustomerTyping] = useState<Record<string, boolean>>({});
  /* ── Unknown-contact customer matching (per explicit request) ──
     When the docked Customer Information panel is showing an unknown-
     contact interaction (`!activeInteractionIsRealCustomer`, below), it now
     runs a simulated "does this look like anyone in the directory" check
     instead of just a blank Detail-tab form — these three pieces of state
     back that flow. See `handleLinkCustomerRecord`/`handleCreateNewCustomer`
     (below `handleOutcomeOpenChange`) for what actually consumes them, and
     `findPossibleCustomerMatches`/`CustomerMatchSearchBody`'s own doc
     comments (agent-next-gen-customer-info-panel.tsx) for the check itself. */
  /** Which step of the flow is showing — "search" (possible matches / 0
   *  matches / manual search) or "create" (the "Create New Customer"
   *  form). Reset to "search" whenever a DIFFERENT interaction becomes
   *  active (see the reset effect a bit further down, once
   *  `activeInteraction` itself is in scope) — an agent shouldn't land
   *  back on the create form for interaction B just because they'd
   *  clicked into it for interaction A. */
  const [customerMatchStep, setCustomerMatchStep] = useState<"search" | "create">("search");
  /** The "Search Customers" box's own typed value — reset alongside
   *  `customerMatchStep` for the same reason. */
  const [customerMatchQuery, setCustomerMatchQuery] = useState("");
  /** Customer directory records created THIS session via "Create New
   *  Customer" (see `handleCreateNewCustomer` below) — there's no real
   *  backend here to persist a new record into the actual
   *  `CREATE_NEW_CUSTOMERS` directory (that array is static, imported
   *  data), so newly "created" customers live here instead, in-memory for
   *  the rest of the session. Checked alongside `CREATE_NEW_CUSTOMERS`
   *  everywhere a real-customer membership test happens
   *  (`activeInteractionIsRealCustomer` below) and everywhere the match/
   *  search pool is built, so a customer created earlier this session
   *  reads as "real" from then on and can even show up as a possible
   *  match for a LATER unrelated unknown contact. */
  const [createdCustomerRecords, setCreatedCustomerRecords] = useState<CreateNewCustomerRecord[]>([]);
  const handleOutcomeOpenChange = (key: string, open: boolean, source: "leftnav" | "transcript" | "tab" | "header") => {
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
  // Formerly drove the record header's own icon-button-cluster Outcome
  // popover and status chip (Consult/Transfer, Outcome, kebab, status
  // chip) — that header cluster no longer exists (see the channel-
  // controls-always-in-session-row change); dead state/handlers removed
  // rather than left unused. `InteractionTranscript`'s own session-row
  // status popover (`statusMenuOpenId`/`statusMenuView`) is the only copy
  // of this left.
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
  // Each card's own current channel-list expanded/collapsed state, reported
  // via `InteractionNavItem`'s `onChannelsExpandedChange` (its own doc
  // comment explains why — the card owns that state internally, this is
  // just a read-only mirror of it). Keyed by `interaction.id`, NOT reset or
  // pruned when a card unmounts — a stale entry for a since-dismissed
  // interaction is harmless (the "every card agrees" check below only ever
  // looks up ids that are still in `interactions`).
  const [channelsExpandedById, setChannelsExpandedById] = useState<Record<string, boolean>>({});
  // Per explicit request: if the agent manually toggles individual cards'
  // chevrons by hand until every one happens to already agree with one
  // direction, `AssignmentsExpandCollapseAllButton`'s own `allExpanded`
  // should catch up to match — e.g. hand-expanding the one remaining
  // collapsed card should flip the button to "Collapse all" on its own,
  // without waiting for another bulk click. Deliberately does NOT bump
  // `channelsExpandedOverrideVersion` — this only updates the button's own
  // label/icon to reflect reality, it never re-applies an override onto
  // cards that already got there by hand.
  useEffect(() => {
    if (interactions.length === 0) return;
    const states = interactions.map((i) => channelsExpandedById[i.id]);
    if (states.some((s) => s === undefined)) return;
    if (states.every((s) => s === true) && !channelsAllExpanded) {
      setChannelsAllExpanded(true);
    } else if (states.every((s) => s === false) && channelsAllExpanded) {
      setChannelsAllExpanded(false);
    }
  }, [channelsExpandedById, interactions, channelsAllExpanded]);
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
  // Per explicit follow-up request ("keep the latest search results after
  // a search is run if navigated away from the search panel") — lifted
  // alongside `customerSearchQuery` above for the same reason (see
  // `searchSubmitted`'s own doc comment, agent-next-gen-search-panel.tsx):
  // `SimpleCustomerSearchBody`'s results-visibility flag used to be a local
  // `useState` there, which reset every time the Search panel itself was
  // unmounted/remounted by navigating away and back.
  const [customerSearchSubmitted, setCustomerSearchSubmitted] = useState(false);
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

  // Single, shared Customer Overview/Detail/Directory draft for whichever
  // interaction is currently active — owned HERE (not inside
  // `CustomerInformationSidePanel`/`CustomerInfoHoverPreview` themselves,
  // which used to each build their own independent instance) per explicit
  // request: an agent who starts an edit, then hovers off the record
  // header's hover preview (which unmounts its content every time the mouse
  // leaves — Radix `Popover.Content` has no `forceMount`) or toggles the
  // docked panel closed and back open, should still see that exact same
  // pending edit rather than a freshly reset one. Passing this ONE instance
  // to both consumers below also means an edit started in one shows up in
  // the other, since they're now genuinely the same state rather than two
  // disconnected copies of "the same customer's" data.
  //
  // `useCustomerRecordDraft` already resets itself whenever `recordId`
  // changes (see that hook's own effect) — switching to a genuinely
  // different active interaction (or having none at all) naturally starts a
  // fresh draft, and dismissing an assignment removes it from `interactions`
  // entirely, which is exactly the ONE thing per explicit request that
  // should actually discard pending edits — not merely closing the panel or
  // hovering away from it.
  const activeCustomerFields = useMemo(
    () =>
      activeInteraction
        ? buildCustomerInfoFields(activeInteraction.customerName, activeInteraction.customerId, activeInteraction.threads)
        : [],
    [activeInteraction?.customerName, activeInteraction?.customerId, activeInteraction?.threads]
  );
  const activeCustomerRecordDraft = useCustomerRecordDraft(
    activeCustomerFields,
    activeInteraction?.customerName,
    activeInteraction?.customerId
  );
  // Same lift as `activeCustomerRecordDraft` above, for the identical
  // reason — see that state's own doc comment.
  const [activeCustomerOverviewEditing, setActiveCustomerOverviewEditing] = useState(false);
  useEffect(() => {
    setActiveCustomerOverviewEditing(false);
  }, [activeInteraction?.customerId]);
  // Keyed on `activeInteraction?.id` (the left-nav slot key — this flips
  // the instant `handleLinkCustomerRecord`/`handleCreateNewCustomer`
  // succeed too, since both reassign it), not `customerId` like the effect
  // above: switching to a genuinely DIFFERENT card should always land back
  // on the search step, but resolving THIS SAME card's own unknown-contact
  // flow (which also changes `id`) should too — the panel stops rendering
  // this UI at all the instant `activeInteractionIsRealCustomer` flips
  // true, so there's nothing wrong with also quietly resetting `step` back
  // to "search" under it as this fires.
  useEffect(() => {
    setCustomerMatchStep("search");
    setCustomerMatchQuery("");
  }, [activeInteraction?.id]);

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
    ? activeInteraction.threads.find(
        (c) =>
          (c.id ?? c.type) ===
          (activeInteraction.currentThreadId ?? activeInteraction.threads[activeInteraction.threads.length - 1]?.id)
      )
    : undefined;
  const activeChannelType = activeChannel?.type;
  // Per explicit follow-up request ("leave the active badge visible if the
  // agent switches between chat/other channels"): whether the interaction
  // has a chat thread open ANYWHERE among its threads, not just whether the
  // currently-selected tab (`activeChannelType`) happens to be it — see the
  // record-header `badge` call site's own doc comment further down for the
  // full reasoning. `false` (not `undefined`) while there's no active
  // interaction at all, matching every other boolean derived here.
  const hasOpenChatThread = !!activeInteraction?.threads.some((c) => c.type === "chat");
  // The bare channel-key half of `activeChannelOutcomeKey` below — used on
  // its own to resolve this channel's own entry out of
  // `Interaction.liveMessages` (see that field's own doc comment for
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
  // This active channel's own status (see `Interaction.channelStatuses`'s
  // doc comment for why status has to be tracked per-channel rather than as
  // one flat interaction-wide value) — undefined until the agent actually
  // assigns one for THIS channel specifically. Drives both the transcript's
  // status pill/Outcome "Resolution" field and whether the composer shows
  // (hidden once this specific channel reads "Closed" — see the render call
  // site below) without touching any sibling channel's own status.
  const activeChannelStatus = activeChannel ? activeInteraction?.threadStatuses?.[activeChannel.id] : undefined;
  // Per explicit request/follow-up clarification: true for a brand-new
  // AGENT-INITIATED OUTBOUND active channel — the active Thread's OWN
  // `startedFresh` (see that field's own doc comment on why this reads
  // per-Thread now, not `activeInteraction.startedFresh`) AND-ed with "the
  // customer hasn't replied yet" (`lastCustomerMessageTick`), same compound
  // check `isNewOutboundThread` uses at the LeftNav card / record-header tab
  // loops (their own doc comments have the full reasoning) — reused here
  // for `InteractionTranscript`'s own `isNewThread` prop (the session row).
  const activeChannelIsNewOutboundThread =
    !!activeChannel?.startedFresh && activeChannel?.lastCustomerMessageTick === undefined;
  // Per explicit request: true when the active interaction's own `id` is
  // one of `OUTBOUND_AGENTS`'s ids — i.e. this is an agent-to-agent voice
  // call, not a customer interaction (an agent's own outbound "Chat" pick
  // never reaches this state at all — `handleStartCall`'s own agent+chat
  // branch, below, returns early before ever creating one). Gates BOTH
  // Customer Information (the docked panel + its header toggle/hover-
  // preview — an agent-to-agent call has no real customer record behind it
  // any more meaningfully than the existing "unknown contact" case does,
  // but per explicit follow-up request this hides it outright rather than
  // falling back to the Detail-only tab set that case still gets) AND the
  // header's own status chip (`ChannelStatusTag`, further down — an agent
  // call has no real Open/Pending/Resolved/Closed disposition to log
  // against a colleague the way a genuine customer contact does).
  const activeInteractionIsAgentCall = !!activeInteraction && OUTBOUND_AGENTS.some((a: CreateNewOutboundContact) => a.id === activeInteraction.id);
  // Per explicit request: true when the active interaction is genuinely
  // backed by a real `CREATE_NEW_CUSTOMERS` directory record — every
  // creation path either reuses that real `customer-N` id verbatim
  // (`handleStartCall`'s directory pick, `handleOpenAssignmentFromNotification`,
  // `handleOpenInteractionRow`, a `handleRedial` with a real
  // `entry.customerId`) or falls back to a synthetic, namespaced one with
  // no backing record (`quickdial:`, a `redial:` with no real customerId,
  // lyra-ui's `adhoc:` "Continue with" flow, a hand-authored Contact
  // History-only entry) — so this membership check is the precise,
  // general "is this a real customer" signal, not just a prefix check on
  // one specific synthetic namespace. `true` when there's no active
  // interaction at all — harmless default, nothing reads it in that case.
  // ALSO true when `id` matches a `createdCustomerRecords` entry (above) —
  // per explicit request, an interaction the agent just ran "Create New
  // Customer" or "Link To Record" on (`handleCreateNewCustomer`/
  // `handleLinkCustomerRecord`, below) must immediately read as a real
  // customer too, promoting it straight into every OTHER tier of this same
  // "real customer" treatment (full channel tab row, full Customer
  // Information tab set, plain customer-ID subtitle — see
  // `showChannelTabRow` right below) the instant either action resolves,
  // not just at the customer directory's own static, build-time contents.
  // Per explicit follow-up bug report — see AgentWorkspace2WithDeskPage.tsx's
  // identical fix for the full reasoning: a Contact History entry with no
  // `customerId` of its own reopens under a synthetic `history:${entry.id}`
  // id (`handleReopenContactHistoryEntry`, below); that id used to read as
  // NOT a real customer here, wrongly hiding Contact Overview for a
  // genuine past contact. `startsWith("history:")` covers only that case,
  // not the genuinely-unknown `adhoc:`/`quickdial:`/`redial:` ones.
  const activeInteractionIsRealCustomer = activeInteraction
    ? CREATE_NEW_CUSTOMERS.some((c) => c.id === activeInteraction.id) ||
      createdCustomerRecords.some((c) => c.id === activeInteraction.id) ||
      activeInteraction.id.startsWith("history:")
    : true;
  // Per explicit follow-up request (superseding the customer-identity
  // version this used to be — see git history for that prior condition):
  // now keyed purely on how many channels/threads this interaction
  // actually has open, for EVERY customer interaction, real or unknown.
  // With only one channel open there's nothing for a tab row to
  // disambiguate between, so this tier collapses to the same compact,
  // no-tab-row header treatment Agent Workspace 2.0 always uses (that
  // file's own `showChannelTabRow` doc comment) — this only affects the
  // tab row itself now. Per explicit follow-up request ("let's update the
  // channel controls to always be in the session row..."), the record-
  // header's own former action cluster (Consult/Transfer, Outcome, kebab,
  // status chip, Unassign & Dismiss/Delete Draft) no longer exists at
  // all — that cluster lives permanently in `TranscriptSessionSeparator`'s
  // own session-row cluster now (`showSessionActionCluster`, unconditional
  // at the `<InteractionTranscript>` call site below), regardless of
  // channel count.
  // `activeInteractionIsRealCustomer` (above) is now a fully independent
  // signal — it no longer feeds this at all, and continues to gate ONLY
  // Customer Information's own tab set / customer-matching UI, per
  // explicit request.
  // Was `!activeInteraction || activeInteraction.threads.length >= 2` —
  // hid this row outright for a single-channel interaction. Per explicit
  // follow-up request ("if only one interaction tab is open, display the
  // tab instead of removing it"), now always shows whenever there's a real
  // active interaction — a single open channel renders as its own one-tab
  // row instead of disappearing. Safe to widen this far: the ONLY other
  // consumer this constant used to also gate, `showSessionActionCluster`
  // at the `<InteractionTranscript>` call site below, is already
  // unconditional regardless of channel count (see the comment right
  // above this one) — it no longer reads this constant at all.
  const showChannelTabRow = !!activeInteraction;
  // Per explicit request ("hide the subhead from the interaction header
  // under the user's name for now - I may bring it back") — mirrors Agent
  // Workspace 2.0's identical flag (AgentNextGenPage.tsx, see that file's
  // own doc comment for the full reasoning): gates the record-header
  // `PageHeader`'s own `subtitle` prop, below. The underlying derivation is
  // left completely untouched — flipping this back to `true` restores the
  // exact same subtitle with no other changes needed.
  const SHOW_RECORD_HEADER_SUBTITLE = false;
  // Captured once, this component's real mount instant — lets
  // `resolveInteractionLastCustomerResponseLabel` (below) convert a
  // `lastCustomerMessageTick` value (real elapsed seconds since mount,
  // since `clockTick`, declared further down, ticks once per real second —
  // see that state's own doc comment) back into an exact real `Date`,
  // rather than a mock/relative string. Declared here (ahead of
  // `clockTick` itself) purely so it's available before
  // `lastCustomerResponseLabel` reads it a few lines below — it doesn't
  // actually depend on `clockTick`'s own state.
  const pageMountTimeRef = useRef(Date.now());
  // Duplicated verbatim from AgentNextGenPage.tsx (Agent Workspace 2.0) per
  // this codebase's "no shared sync" convention — the launch timestamp
  // (see `threadLaunchTimestamps`'s own doc comment above) for THIS active
  // channel specifically, and the resolved date/time (or "Draft") label
  // built from it. Used ONLY by the unknown-contact `PageHeader` subtitle
  // further down this file — a real-customer interaction's plain
  // customer-ID subtitle never reads either of these.
  const activeChannelLaunchedAt = activeInteraction
    ? threadLaunchTimestamps[`${activeInteraction.id}:${activeChannel?.id ?? activeChannel?.type ?? ""}`]
    : undefined;
  const activeChannelDateTime = resolveActiveChannelDateTimeLabel(
    activeChannelType,
    // Per-Thread, same reasoning as `activeChannelIsNewOutboundThread` above
    // — see `Thread.startedFresh`'s own doc comment.
    !!activeChannel?.startedFresh,
    activeChannel,
    activeChannelLaunchedAt
  );
  // Per explicit follow-up request: once 2+ channels are open
  // (`showChannelTabRow`), the record-header subtitle switches from the
  // single active channel's own "{icon} {label} | {date}" line (still used
  // for the 1-channel case above) to "{N} channels open | Last Customer
  // Response: {date/time}" instead — see
  // `resolveInteractionLastCustomerResponseLabel`'s own doc comment for the
  // full per-thread resolution order.
  const lastCustomerResponseLabel = activeInteraction
    ? resolveInteractionLastCustomerResponseLabel(activeInteraction, pageMountTimeRef.current)
    : undefined;
  // The full pool the unknown-contact matching flow (below) checks against
  // — the static directory plus anything `createdCustomerRecords` has
  // added this session (see that state's own doc comment for why a
  // created customer belongs in the pool too).
  const customerDirectoryPool = useMemo(
    () => [...CREATE_NEW_CUSTOMERS, ...createdCustomerRecords],
    [createdCustomerRecords]
  );
  // The raw dialed/typed identifier this unknown channel was reached on —
  // `Thread.value` (e.g. `handleQuickDial`'s own dialed `phoneNumber`) when
  // set, falling back to its own display label, then to whatever this
  // interaction's own card is titled, then its id — there's always SOME
  // stable string by the last fallback, which is all
  // `findPossibleCustomerMatches` actually needs (see that function's own
  // doc comment for why the exact string barely matters — it's a
  // deterministic seed, not something the check parses for meaning).
  const activeUnknownContactIdentifier =
    activeChannel?.value ?? activeChannel?.addressLabel ?? activeInteraction?.customerName ?? activeInteraction?.id;
  // Per explicit request: the automatic "does this look like anyone in the
  // directory" check for the active unknown-contact interaction — see
  // `findPossibleCustomerMatches`'s own doc comment
  // (agent-next-gen-customer-info-panel.tsx) for what it actually does.
  // Computed unconditionally (harmless for a real-customer interaction —
  // nothing reads it in that case, since the panel never sets `matchState`
  // for one) rather than gated behind `!activeInteractionIsRealCustomer`
  // here, so the `useMemo` dependency list stays simple.
  const possibleCustomerMatches = useMemo(
    () => findPossibleCustomerMatches(activeUnknownContactIdentifier, customerDirectoryPool),
    [activeUnknownContactIdentifier, customerDirectoryPool]
  );
  // The "Search Customers" box's own manual results — see
  // `filterCustomersByQuery`'s own doc comment. Empty (and therefore never
  // shown — see `CustomerInformationSidePanel`'s own `matchState` render
  // branch) until the agent actually types something.
  const customerSearchResults = useMemo(
    () => filterCustomersByQuery(customerMatchQuery, customerDirectoryPool),
    [customerMatchQuery, customerDirectoryPool]
  );
  /** Per explicit request: promotes the active unknown-contact interaction
   *  to a REAL customer by pointing it at an EXISTING directory record the
   *  agent picked from the "Possible Matches"/search list (`onLinkRecord`,
   *  wired into `CustomerMatchSearchBody`'s own "Link To Record" button —
   *  see that component's doc comment). Reassigns this interaction's own
   *  identity fields to the matched record's — `id` (so
   *  `activeInteractionIsRealCustomer` above reads `true` from the very
   *  next render, cascading into every other "real customer" surface:
   *  `showChannelTabRow`, the full Customer Information tab set, the plain
   *  customer-ID subtitle — see each of those consts' own doc comments),
   *  `customerId`, and `customerName`. Changing `customerId` also resets
   *  `activeCustomerRecordDraft` (that hook's own reset-on-recordId-change
   *  effect — see `useCustomerRecordDraft`'s own doc comment) to a FRESH
   *  draft synthesized from the matched record, discarding whatever was
   *  pending in the unknown-contact Detail form — correct here, since this
   *  interaction is now a totally different, already-real customer, not a
   *  continuation of the blank one. Deliberately updates `interactions`/
   *  `activeInteractionId` directly rather than going through
   *  `switchActiveInteraction` — this isn't switching to a DIFFERENT card,
   *  it's the same card being recognized as someone real, so none of that
   *  helper's "leaving one assignment for another" side-panel bookkeeping
   *  applies. */
  const handleLinkCustomerRecord = (customer: CreateNewCustomerRecord) => {
    if (!activeInteraction) return;
    const fromId = activeInteraction.id;
    setInteractions((prev) =>
      prev.map((interaction) =>
        interaction.id === fromId
          ? { ...interaction, id: customer.id, customerId: customer.customerId, customerName: customer.name }
          : interaction
      )
    );
    setActiveInteractionId(customer.id);
    addToast({
      variant: "success",
      title: "Linked to record",
      message: `Linked to ${customer.name}'s customer record`,
      duration: 4000,
    });
  };
  /** Advances the unknown-contact matching flow to its "Create New
   *  Customer" step (`CustomerMatchSearchBody`'s footer button) — see
   *  `customerMatchStep`'s own doc comment. */
  const handleStartCreateCustomer = () => setCustomerMatchStep("create");
  /** Returns to the search step WITHOUT discarding anything — the header's
   *  own back-arrow button (`CustomerInformationSidePanel`'s
   *  `matchState.onBackToSearch`) uses this directly; the create step's
   *  own Cancel button calls `activeCustomerRecordDraft.cancel()` first,
   *  THEN this — see that render call site. */
  const handleBackToCustomerSearch = () => setCustomerMatchStep("search");
  /** Per explicit request: promotes the active unknown-contact interaction
   *  to a real customer by minting a brand-new directory record from
   *  whatever the agent typed into the "Create New Customer" form
   *  (`activeCustomerRecordDraft.draft` — the SAME Detail-tab draft this
   *  panel already showed for this interaction; see
   *  `CustomerInformationSidePanel`'s own `matchState` body branch for why
   *  no separate draft/hook is needed for this step). Deliberately does
   *  NOT reassign `customerId` (unlike `handleLinkCustomerRecord` above) —
   *  keeping the interaction's own existing case number means
   *  `activeCustomerRecordDraft` never resets (its own reset effect is
   *  keyed on `customerId`, unchanged here), so every field the agent just
   *  typed stays showing, unbroken, the instant this flips the panel over
   *  to the full "known customer" Detail tab — genuinely "the new customer
   *  information populated," per the request, not a fresh resynthesis.
   *  Only `id` (so `activeInteractionIsRealCustomer` flips true) and
   *  `customerName` (built from the typed name, so the record header's
   *  title updates too) change. */
  const handleSaveNewCustomer = () => {
    if (!activeInteraction) return;
    const firstName = activeCustomerRecordDraft.draft.firstName.trim();
    const lastName = activeCustomerRecordDraft.draft.lastName.trim();
    const name = [firstName, lastName].filter(Boolean).join(" ") || activeInteraction.customerName || "New Customer";
    const newId = `created-customer:${activeInteraction.id}`;
    const newRecord: CreateNewCustomerRecord = {
      id: newId,
      name,
      customerId: activeInteraction.customerId,
      channels: activeChannelType ? [activeChannelType] : [],
      avatarClassName: "bg-lyra-accent-blue-soft text-lyra-accent-blue-strong",
      firstName: firstName || name,
      lastName,
      group: activeCustomerRecordDraft.draft.group || "Standard",
      firstPhone: activeChannelType === "voice" ? (activeChannel?.value ?? "") : "",
      emailAddress: activeChannelType === "email" ? (activeChannel?.value ?? "") : "",
      address1: "",
      city: "",
      state: "",
      postalCode: "",
      originalCustomerId: activeCustomerRecordDraft.draft.originalContactNumber || activeInteraction.customerId,
      dateOfBirth: "",
      agent: `${CURRENT_AGENT_FIRST_NAME} ${CURRENT_AGENT_LAST_NAME}`,
      agentTeam: "",
      paymentBalance: activeCustomerRecordDraft.draft.balanceDue || "$0.00",
    };
    const fromId = activeInteraction.id;
    setCreatedCustomerRecords((prev) => [...prev, newRecord]);
    setInteractions((prev) =>
      prev.map((interaction) => (interaction.id === fromId ? { ...interaction, id: newId, customerName: name } : interaction))
    );
    setActiveInteractionId(newId);
    addToast({
      variant: "success",
      title: "Customer created",
      message: `${name} added to the customer directory`,
      duration: 4000,
    });
  };
  // Shared clock powering every open channel's live "MM:SS since it
  // started" elapsed display — independent of `elapsedSeconds` below, which
  // is the agent's own status timer and resets on status change.
  const [clockTick, setClockTick] = useState(0);
  // Whether ANY assignment in the whole Personal Queue has a channel that's
  // actually breached SLA (red/"critical", not just "warning") — drives the
  // home header's "Personal Queue" chip color per explicit request ("make
  // the personal queue chip success when empty and warn when there are
  // assignments, make it red when an sla is breached in an assignment and
  // add a ! icon"). See `interactionHasBreachedSla`'s own doc comment
  // (agent-next-gen-interaction-dashboard.tsx) for why this re-derives the
  // same per-channel severity check each LeftNav card's own render loop
  // already applies, rather than importing that inline logic directly.
  const hasBreachedSlaAssignment = useMemo(
    () => interactions.some((i) => interactionHasBreachedSla(i, clockTick)),
    [interactions, clockTick]
  );
  // Mirrors `clockTick` for code that needs the CURRENT tick inside a
  // callback that itself fires later (`handleSendMessage`'s simulated
  // customer-reply `setTimeout`, 2s after the call that scheduled it) —
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
  // "interactions" removed from this page's own tab set — that content
  // moved to the Search right panel instead (see `searchContent`'s own
  // doc comment above). `DeskTabKey`/`DESK_TAB_LABELS` (shared,
  // agent-next-gen-interaction-dashboard.tsx) still include `"interactions"`
  // — untouched, since `AgentWorkspace2WithDeskPage.tsx` still uses it.
  //
  // The Home/Customers/Accounts/Tickets/WEM `TabList` row itself was
  // removed from this page's dashboard entirely per a follow-up explicit
  // request ("remove all of the tabs from the home page") — WEM moved to
  // its own top-right app-header icon instead (see `PANEL_KEY_METADATA.wem`
  // above), Customers already has its Search-panel Customers tab as a real
  // alternative, and Accounts/Tickets never had real content built. With no
  // `TabList` left to switch it, `activeDeskTab` can now only ever be
  // "home" — a plain constant, not `useState`, since nothing sets it
  // anymore (its own `setActiveDeskTab` setter, and the whole `deskTabOrder`
  // reorder-state this file used to also need for that row's drag-to-
  // reorder, are both gone for the same reason). The now-orphaned Customers/
  // Accounts/Tickets/WEM per-tab render branches further down this file
  // (the desk's own — separate from the Search panel's — `CustomersListView`
  // instance, and the Accounts/Tickets/WEM "Coming soon" placeholder) are
  // deliberately left in place rather than deleted, same "hide it, don't
  // destroy it" convention `HIDDEN_FROM_APPS_MENU`/`OUTBOUND_GROUPS`'s own
  // "Dial Pad" entry already follow elsewhere in this file — they simply
  // can never be reached anymore now that `activeDeskTab` is pinned to
  // "home".
  //
  // Still a `useState` (setter just never called/destructured anymore),
  // NOT a plain `const activeDeskTab: SomeUnion = "home"` — TypeScript
  // narrows a `const`'s later reads to its own literal initializer's type
  // even under an explicit wider annotation (confirmed live: that version
  // hit real `tsc` "no overlap" errors at every `activeDeskTab ===
  // "customers"`-style comparison below). `useState<T>(initial)`'s return
  // is typed as the explicit generic `T` itself, not narrowed from
  // `initial`'s own literal type, which is what keeps those comparisons
  // (and the "orphaned but not deleted" branches they gate) type-checking
  // correctly with no runtime behavior change.
  const [activeDeskTab] = useState<"home" | "customers" | "accounts" | "tickets" | "wem">("home");
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

  // Per explicit follow-up request ("detach the contacts table from the
  // search panel and have it exist on its own") — a fourth top-level view
  // alongside Desk/interaction-record/Settings, shown in place of all
  // three when the Home dashboard's "All Contacts" button (`ContactHistoryCard`'s
  // own `headerTitleBadge`) is clicked. Previously this button opened the
  // shared right-docked Search panel's own "Contacts" tab, maximized to
  // full screen (see BEHAVIOR.md §134) — that panel-based approach is
  // superseded here; `InteractionsListView` now also renders directly in
  // the content column below, completely independent of `Draggable`/
  // `ContainerHeader`/`activePanelKey`/`panelFullScreen`. Mutually
  // exclusive with Settings/an active interaction the same way those two
  // already are with each other while they're showing — enforced by the
  // ternary's own `showAllContacts && !activeInteraction` condition further
  // down (not by resetting this flag).
  //
  // Per a further explicit follow-up ("if the agent has all contacts open
  // and navigates away from home, keep home page (all contacts) at the
  // last state before navigating away") — this flag is NO LONGER cleared
  // just because Settings opens or an interaction starts; it only gets
  // cleared by the All Contacts view's own breadcrumb ("Dashboard" →
  // explicitly leaving All Contacts for the plain dashboard). Once Settings
  // closes or the interaction ends, whichever of them was active before
  // (plain dashboard vs. All Contacts) is exactly what reappears.
  // `selectedAllContactsRecord` (this view's own selected-row summary
  // panel, below) is preserved the same way, for the same reason — the
  // whole point is that "Home" always resumes right where the agent left
  // it.
  const [showAllContacts, setShowAllContacts] = useState(false);

  /* Which row (if any) is selected in the standalone "All Contacts" view's
     own `InteractionsListView` — per explicit follow-up request ("in the
     dashboard / contacts table - when one of the rows is clicked, open an
     interior panel like the ones in My Contact History"), clicking a row
     there opens a summary panel of its own (a second, independent
     `InteriorPanel`/`selectedContactHistoryEntry`-style pair, NOT the
     dashboard's shared one further down — the "All Contacts" view is a
     fully standalone view with no dashboard content mounted alongside it
     to share that docked slot with), instead of immediately opening the
     row as a live assignment the way it used to (`handleOpenInteractionRow`,
     still what the panel's own "Re-open"/"Redial" footer button calls).
     `InteractionHistoryRecord` has no `ContactHistoryEntry`-shaped summary
     of its own — `buildContactHistoryEntryFromInteractionRecord` (agent-
     next-gen-interactions-table.tsx) adapts one on the fly so this reuses
     `ContactHistoryEntryDetail` unchanged, same "Duration"/"Chat Summary"/
     "Conversation" layout the My Contact History card's own row-click panel
     already renders. */
  const [selectedAllContactsRecord, setSelectedAllContactsRecord] = useState<InteractionHistoryRecord | null>(null);

  // Per explicit follow-up request ("below the dashboard / all contacts
  // page header at tabs for Contacts (Active), Messages and Threads") — a
  // "(Active)" was dropped from the tab label per a follow-up ("Remove
  // (Active) from the contacts tab") — the tab is just "Contacts" now.
  // `TabList` row inside the All Contacts view itself, below its
  // `PageHeader`, same `TabList`/`Tab`/`activeTab`-string pattern already
  // used elsewhere in this app (e.g. the Customer Information panel's own
  // `CUSTOMER_PANEL_TABS`). Only "Contacts" has real content (the
  // existing `InteractionsListView` table + its own `InteriorPanel`,
  // below) — "Messages" and "Threads" are placeholders for now (same empty
  // `<div className="flex-1 overflow-y-auto" />` the Settings view already
  // uses as its own placeholder body), pending a real data model for
  // per-message/per-thread rows.
  const ALL_CONTACTS_TABS = ["Contacts", "Messages", "Threads"] as const;
  const [allContactsTab, setAllContactsTab] = useState<(typeof ALL_CONTACTS_TABS)[number]>("Contacts");

  // Effect rather than touching every `setActiveInteractionId` call site
  // individually. Only closes Settings — does NOT touch `showAllContacts`/
  // `selectedAllContactsRecord` (see that state's own doc comment above for
  // why): an active interaction still visually pre-empts All Contacts via
  // the content-column ternary's own `!activeInteraction` guard, without
  // discarding All Contacts' own state for when the interaction ends.
  useEffect(() => {
    if (activeInteractionId) {
      setShowSettings(false);
    }
  }, [activeInteractionId]);
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("unavailable");
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  // Flushes whatever `fireAgentLegStatusToast` deferred (further up this
  // component) the moment the welcome modal actually closes (Go Available /
  // Start Offline), so the agent still sees that toast — just after, not
  // during, the modal. Has to live down here, after `showWelcomeModal`
  // itself is declared — `useEffect`'s dependency array is evaluated
  // immediately as part of this call (unlike a plain function body, which
  // only reads `showWelcomeModal` once actually invoked later), so putting
  // this up near `fireAgentLegStatusToast` referenced `showWelcomeModal`
  // before its own `const` had run, which crashed the whole page on every
  // render (temporal dead zone) — that's why the welcome modal stopped
  // opening at all just now. Deliberately keyed only on `showWelcomeModal`
  // — `showAgentLegToast` is a plain function redefined every render (not
  // memoized), so including it would rerun this on every render instead of
  // only on the open→closed transition this is meant to catch.
  useEffect(() => {
    if (!showWelcomeModal && pendingAgentLegToastRef.current) {
      showAgentLegToast(pendingAgentLegToastRef.current);
      pendingAgentLegToastRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWelcomeModal]);
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
  }, "agent-advanced");

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
  // Defaults to "float" per explicit follow-up request — see 2.0's own
  // copy of this comment (AgentNextGenPage.tsx) for the full writeup on
  // reverting the earlier "docked" default and why no separate
  // remembered-preference flag is needed for "if docked then closed,
  // keep it docked on next open" — `panelVariant` itself already
  // persists across a close/reopen, `handlePanelButtonClick` just no
  // longer overwrites it.
  const [panelVariant,    setPanelVariant]    = useState<DraggableVariant>("float");
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
  // Record header's own measured width — drives the Add Channel/Customer
  // Information buttons' icon-only collapse (`recordHeaderWidth < 768`,
  // render site further down). Used to just reuse `sidePanelContainerWidth`
  // (`containerRef` above) instead of a dedicated measurement here — see
  // that old reasoning in git history — but that only held up while the
  // Customer Information toggle button was gated to the panel being
  // CLOSED (`showPanelToggle`), so `containerRef` (the docked panel's own
  // sibling) never had the panel competing with it for width whenever the
  // button was actually on screen. Once the button moved into `PageHeader`
  // and started rendering unconditionally (open or closed, per explicit
  // request), that assumption broke: `containerRef` spans BOTH the main
  // content column and the docked panel, so dragging the panel wider
  // visibly squeezes this header (and its buttons) while
  // `sidePanelContainerWidth` — measuring the pair's combined width, which
  // the drag doesn't change — stays flat, letting the buttons run out of
  // real room well before the (never-firing) breakpoint. Confirmed live:
  // resizing the docked panel wider shifted the header's own buttons left
  // with no icon-collapse ever kicking in. A dedicated measurement of just
  // the header itself (via `PageHeader`'s own forwarded ref, no extra
  // wrapper div needed) reacts to the ACTUAL space this row has, docked
  // panel or not. Safe to measure directly now, unlike the row this button
  // used to live in (see that old attempt's own note about a nested
  // `TabList`'s `container-type: inline-size` interfering) — the channel
  // tabs live in their own separate row below `PageHeader` now, so this
  // one has no such nested container query to fight.
  // A callback ref (not `useRef` + a mount-once `useEffect`, like
  // `containerRef`/`bodyContainerRef` above) — this is deliberate, not a
  // stylistic swap: those two both measure elements that exist for the
  // entire lifetime of this component, so a `[]`-deps effect reading
  // `.current` once on mount always finds them already attached.
  // `PageHeader` itself only exists conditionally (`showPageHeader &&
  // activeInteraction && ...`, several branches deep) — on any render
  // where it isn't mounted yet (e.g. the agent's on the Desk dashboard
  // when this component first mounts), that same mount-once effect would
  // find `recordHeaderRef.current` still `null`, bail out via its own
  // early return, and never run again (empty deps array), permanently
  // leaving `recordHeaderWidth` stuck at its initial `9999` — confirmed
  // live as exactly this: the buttons never collapsed at all, no matter
  // how narrow the header actually got, because the `ResizeObserver` never
  // got attached to the real element in the first place. A callback ref
  // fires on every actual mount/unmount of the node it's attached to,
  // however many times that happens over this component's lifetime, so
  // the observer below gets (re)attached correctly the moment `PageHeader`
  // itself first mounts, not just once at this component's own mount.
  const [recordHeaderNode, setRecordHeaderNode] = useState<HTMLDivElement | null>(null);
  const recordHeaderRef = useCallback((node: HTMLDivElement | null) => {
    setRecordHeaderNode(node);
  }, []);
  const [recordHeaderWidth, setRecordHeaderWidth] = useState(9999);
  useEffect(() => {
    const el = recordHeaderNode;
    if (!el) return;
    setRecordHeaderWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setRecordHeaderWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [recordHeaderNode]);
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
  // "View All Apps" kebab menu — lists every app-header panel button
  // regardless of pinned state, with a `PanelPinButton` per row so any app
  // can be pinned/unpinned right from the menu. All nine start pinned
  // (matching today's always-visible header row); unpinning one just hides
  // its persistent header icon — the app's still reachable by clicking its
  // row in this menu, which opens the shared panel exactly like the header
  // icon would.
  // Default pinned set — header shows (right to left) Notifications,
  // Agent Chat, Search; Schedule/Customers/Accounts/Tickets/WEM/Screen Pop
  // start unpinned. Customers/Accounts/Tickets are also filtered out of the
  // "View All Apps" menu itself (see `HIDDEN_FROM_APPS_MENU` below), making
  // them fully unreachable from the app header; Schedule/Screen Pop/WEM
  // aren't in that list, so unpinning them just hides their header icon —
  // all three stay reachable via "View All Apps". WEM starts unpinned again
  // per a follow-up explicit request ("unpin WEM when the app loads") —
  // still dropped from `HIDDEN_FROM_APPS_MENU` (unlike Customers/Accounts/
  // Tickets), so it's a real, clickable row in "View All Apps" (with its
  // own `PanelPinButton` to re-pin it) rather than fully unreachable like
  // those three; it just no longer shows a persistent header icon BY
  // DEFAULT on load — an agent can still pin it back from that menu, which
  // then persists for the rest of the session same as any other app.
  const [pinnedKeys, setPinnedKeys] = useState<Record<PanelKey, boolean>>({
    // Notifications re-pinned per explicit follow-up request ("pin
    // notifications in 2.0 only", then "make notifications pinned in
    // premium and advanced too") — Notifications is back to a persistent
    // header icon on load across all 3 tiers now. Schedule's own pinned
    // state (from the earlier swap) is untouched — still `true` — so this
    // tier now shows both as persistent header icons, same as 2.0.
    notif: true,
    conversations: true,
    schedule: true,
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
  /* Which Contact History row (if any) is selected — a THIRD job for that
     same shared interior panel slot, per explicit request: clicking a row
     now opens its summary here (Duration + Call Notes, via
     `ContactHistoryEntryDetail`) with Redial/Re-open buttons, instead of
     reopening the contact directly. See the panel's own `open`/
     `headerTitle`/content wiring further down for how the three jobs
     (Case Details default, Queue drill-down, this) take priority over one
     another. */
  const [selectedContactHistoryEntry, setSelectedContactHistoryEntry] = useState<ContactHistoryEntry | null>(null);

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
  // Drives `CustomerInformationSidePanel`'s own `focusTabOverride` prop —
  // see that prop's doc comment (agent-next-gen-customer-info-panel.tsx).
  // Fed by the Contact Overview's own "View customer info" link
  // (`focusCustomerPanelTab` below) via `InteractionTranscript`'s
  // `onViewCustomerInfo`.
  const [customerPanelFocusTab, setCustomerPanelFocusTab] = useState<
    { tab: CustomerPanelTabLabel; version: number } | undefined
  >(undefined);
  const customerPanelFocusTabVersionRef = useRef(0);
  const focusCustomerPanelTab = (tab: CustomerPanelTabLabel) => {
    customerPanelFocusTabVersionRef.current += 1;
    setCustomerPanelFocusTab({ tab, version: customerPanelFocusTabVersionRef.current });
    setSidePanelOpen(true);
  };
  // No setter — always pinned. `onPinToggle` is deliberately left unset on
  // the real `SidePanel` below (see its own doc comment), so there's no
  // path that ever actually unpins this; kept as `useState` rather than a
  // plain `const` only so a future unpin path can be wired back in without
  // re-threading every `sidePanelPinned` read site.
  const [sidePanelPinned] = useState(true);
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
  // Per explicit follow-up request ("keep the customer information panel
  // closed when a new assignment is opened") — reverses an earlier feature
  // that had every freshly started/quick-dialed/redialed/reopened
  // interaction's panel open in whichever state the agent last picked (see
  // this file's own git history for that version's `lastSidePanelOpenChoice`
  // ref, removed here along with every call site that read it). Every "new
  // interaction" launch path below now hardcodes `setSidePanelOpen(false)`
  // instead — a brand-new assignment's Customer Information panel always
  // starts closed, full stop, regardless of what the agent did on any
  // other assignment. Switching between two ALREADY-active assignments is
  // a separate mechanism (`sidePanelStateByAssignmentId`, just below) and
  // is untouched by this — an assignment the agent already opened the
  // panel on still shows it open again when switched back to.

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
  // interaction launching — which always starts it closed, per the doc
  // comment a few lines above).
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
  // just keeps whatever open/closed state the agent last left it in for
  // an EXISTING assignment (a NEW one always starts closed regardless —
  // see the "keep the customer information panel closed when a new
  // assignment is opened" doc comment above), rather than being force-
  // closed by navigating away and force-reopened for every new one. Only
  // an explicit close (the
  // panel's own close button, or the header icon toggle while pinned)
  // changes it now.

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
     below already decides that correctly (hardcoded `setSidePanelOpen(false)`
     — see that doc comment above) right after calling this, and re-deciding
     it here too would just be a second, competing source of truth for the
     same value.

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
    setSidePanelOpen((v) => !v);
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
    // The trigger button is only ever meant to be hovered/focused while the
    // real panel is closed (it's a preview of what opening would show) —
    // but per this component's own doc comment, the button and its
    // `Popover` actually stay MOUNTED the whole time (just visually
    // collapsed to a 0-width `overflow-hidden` track while the panel is
    // open, not unmounted), so a stray/residual `mouseenter`/`focus` can
    // still reach it. Confirmed live as a real bug — reported as the
    // preview popping up over the already-open real panel after navigating
    // away and back. This guard is the actual fix: never even schedule the
    // preview open while `sidePanelOpen` is true, no matter what fired this.
    if (sidePanelOpen) return;
    clearTimeout(customerInfoPreviewTimer.current);
    setCustomerInfoPreviewOpen(true);
  };
  // Optional event param — this is wired to both a plain `onMouseLeave`
  // (real `MouseEvent`) and `onBlur` (real `FocusEvent`), and also passed
  // straight through as `CustomerInfoHoverPreview`'s own `onMouseLeave`
  // prop (typed `() => void` there, but still actually CALLED with the
  // real DOM event at runtime — TS prop types don't change what a native
  // event handler is invoked with).
  const scheduleCloseCustomerInfoPreview = (e?: React.MouseEvent<Element> | React.FocusEvent<Element>) => {
    // Don't close if the pointer/focus is moving into a portaled overlay
    // that visually/logically "belongs" to this preview but isn't a real
    // DOM descendant of it — e.g. `CustomerInfoHoverPreview`'s own
    // `TabList overflowMenu` ("N More") dropdown, which portals straight
    // to `document.body` (tabs.tsx). React's mouseenter/mouseleave are
    // computed from the actual DOM tree (via the native `mouseout`
    // event's `relatedTarget`), not the React/portal tree, so moving the
    // pointer from this preview's content onto that portaled dropdown —
    // even though it's visually right on top of/beside the preview — always
    // fires a real `mouseleave` here, scheduling this preview closed right
    // out from under the dropdown the agent is still using. Confirmed
    // live: clicking an "N More" tab closed the whole hover preview, even
    // after fixing this same Popover's own `onInteractOutside` guard (that
    // fix covers Radix's CLICK-based outside-dismiss; this timer-based
    // hover-intent close is a separate mechanism with its own separate
    // bug). Same `[data-radix-popper-content-wrapper]` marker that fix
    // already relies on (see tabs.tsx's own doc comment on it) — reused
    // here via `relatedTarget` instead of `event.target`.
    const related = e?.relatedTarget as Element | null | undefined;
    if (related?.closest?.("[data-radix-popper-content-wrapper]")) return;
    clearTimeout(customerInfoPreviewTimer.current);
    customerInfoPreviewTimer.current = setTimeout(() => setCustomerInfoPreviewOpen(false), 150);
  };
  // Guards against a stale `true` leaking into the next interaction this
  // icon renders for (e.g. switching interactions mid-hover, without ever
  // moving the pointer far enough away to fire the close timer above), AND
  // against the real panel opening while the preview happened to be open —
  // `sidePanelOpen` added to the deps for the same reason `open Customer-
  // InfoPreview` above now guards itself: `Popover`'s own `onOpenChange` is
  // wired directly to the raw `setCustomerInfoPreviewOpen` setter (see the
  // render site), which bypasses that guard entirely if Radix's own
  // focus-management ever decides to flip it — this effect is the backstop
  // that un-does that regardless of what caused it.
  useEffect(() => {
    setCustomerInfoPreviewOpen(false);
  }, [activeInteraction?.id, sidePanelOpen]);

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

  // Auto "Working" status while on a live voice call, per explicit request
  // ("when an agent is in a call the status should change to 'working'").
  // `"working"` (lyra-ui's `AgentStatus`, agent-profile.tsx) is deliberately
  // NOT in that component's own `allStatuses` picker list — an agent never
  // selects it by hand, only this effect ever sets it, exactly the way the
  // request specified ("do not add this as a selectable status").
  // `isOnVoiceCall` — true whenever ANY still-open (`!closed`) interaction
  // has a voice `Thread` whose own `threadStatuses` entry isn't `"Closed"`
  // — not just the interaction currently being VIEWED, so switching over to
  // check on a different customer's chat mid-call doesn't incorrectly clear
  // "Working" the instant the voice call scrolls out of view.
  // `preCallStatusRef` remembers whatever status was active the moment the
  // call started, so hanging up restores it (Available/Unavailable/a
  // specific reason code) instead of always falling back to one hardcoded
  // default — same "restore what was there before" pattern
  // `connectAgentLegSignal`'s own effect (agent-profile.tsx) already uses
  // for a comparable "external signal drives an internal transition"
  // shape. Deliberately keyed only on `isOnVoiceCall` (not `agentStatus`
  // too) — this is an edge-triggered effect reacting to the call actually
  // starting/ending, not something that should re-fire just because
  // `agentStatus` itself changed for some unrelated reason.
  const isOnVoiceCall = interactions.some(
    (i) => !i.closed && i.threads.some((t) => t.type === "voice" && i.threadStatuses?.[t.id] !== "Closed")
  );
  const preCallStatusRef = useRef<AgentStatus | null>(null);
  useEffect(() => {
    if (isOnVoiceCall) {
      if (agentStatus !== "working") {
        preCallStatusRef.current = agentStatus;
        setAgentStatus("working");
        setElapsedSeconds(0);
      }
    } else if (agentStatus === "working") {
      setAgentStatus(preCallStatusRef.current ?? "unavailable");
      preCallStatusRef.current = null;
      setElapsedSeconds(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnVoiceCall]);

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
    // Per explicit request: picking "Chat" for an agent contact doesn't
    // start a normal interaction at all — it just opens the existing
    // "Agent Chat" docked panel, exactly like the "New Agent Chat"
    // notification's own `onNotificationClick` handler already does
    // elsewhere in this file (no interaction/card side effects, generic —
    // not wired to which agent was picked, confirmed via follow-up
    // clarification). `OUTBOUND_AGENTS` is the only group whose contacts
    // ever carry `"chat"` among their own `channels`, so this can only ever
    // fire for a real agent pick. Voice for an agent falls through to the
    // normal flow below unchanged — see `activeInteractionIsAgentCall`
    // further up this component for how that resulting interaction then
    // hides Customer Information + the status Select.
    if (selection.channel === "chat" && OUTBOUND_AGENTS.some((a: CreateNewOutboundContact) => a.id === selection.contact.id)) {
      handlePanelButtonClick("conversations")();
      return;
    }
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
    // own `threadStatuses` entry currently reads `"Closed"`, this is a
    // genuine reopen (agent picked the same channel/handle again via "Add
    // Channel"), not a brand-new one — see `Thread.
    // reopenedContacts`'s own doc comment for what that then does.
    const existingInteraction = interactions.find((i) => i.id === selection.contact.id);
    const existingChannelId = `${selection.channel}:${selection.phone}`;
    const existingChannel = existingInteraction?.threads.find((c) => c.id === existingChannelId);
    const isReopenOfClosedChannel =
      !!existingChannel && existingInteraction?.threadStatuses?.[existingChannelId] === "Closed";
    // This Interaction's own identity — see `Interaction.interactionId`'s
    // own doc comment for the full start/end lifecycle. `existingInteraction`
    // is only truthy when a card for this exact contact is ALREADY open (the
    // same check `isNewInteraction` above makes), so this is exactly "carry
    // the ongoing journey's id forward, or start a new journey" with no
    // separate lookup needed.
    const interactionId = existingInteraction?.interactionId ?? generateInteractionId();
    const reopenedContacts = isReopenOfClosedChannel
      ? [
          ...(existingChannel!.reopenedContacts ?? []),
          {
            // `Date.now()` (a real, always-unique timestamp), not
            // `clockTick` (an incrementing seconds counter this app's own
            // shared 1s interval drives) — two reopens landing inside the
            // same tick would otherwise collide on id.
            id: `session-reopened-${Date.now()}`,
            date: new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }),
            startTime: new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
            // This reopen's own, genuinely distinct Contact ID — a reopen is
            // a NEW Contact within the same still-ongoing Interaction/Thread,
            // not a continuation of the Thread's original one (`newChannel.
            // contactId` below, untouched by a reopen).
            contactId: generateContactId(),
            // Snapshot of how many live messages this channel had BEFORE
            // this reopen — per explicit correction, those messages must
            // stay visible (dimmed) under their own prior session, not be
            // wiped. See this field's own doc comment on `Thread.
            // reopenedContacts` for how `InteractionTranscript` uses it.
            messagesBeforeReopen: existingInteraction?.liveMessages?.[existingChannelId]?.length ?? 0,
          },
        ]
      : existingChannel?.reopenedContacts;
    const newChannel: Thread = {
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
      // This Thread's own BASE Contact id — generated once, the moment the
      // Thread is genuinely new (`existingChannel` falsy). A reopen of an
      // already-existing (closed) Thread does NOT get a fresh one here —
      // that reopen's own distinct Contact id lives on its own
      // `reopenedContacts` entry above instead, same "the Thread persists,
      // each Contact within it is its own instance" split the Thread/Contact
      // model draws.
      contactId: existingChannel?.contactId ?? generateContactId(),
      reopenedContacts,
      // Per explicit follow-up request ("whenever a new channel is open
      // unless it is re-opening a channel it should open as a draft"): an
      // agent-initiated outbound launch always gets a fresh, empty session
      // — see `Thread.startedFresh`'s own doc comment for why this is now a
      // per-Thread flag rather than the interaction-wide one this used to
      // rely on exclusively. `existingChannel`'s own reopen path already
      // renders its own synthetic empty session via `reopenedContacts`
      // regardless of this flag, so unconditionally `true` here is correct
      // either way.
      startedFresh: true,
    };

    setInteractions((prev) => {
      const idx = prev.findIndex((i) => i.id === selection.contact.id);
      // No existing interaction with this contact — start a new card.
      if (idx === -1) {
        return [...prev, {
          id: selection.contact.id,
          interactionId,
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
          customerId: selection.contact.subtitle ?? generateCaseId(),
          threads: [newChannel],
          currentThreadId: newChannel.id,
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
        const chIdx = interaction.threads.findIndex((c) => c.id === newChannel.id);
        const threads = chIdx === -1
          ? [...interaction.threads, newChannel]
          : interaction.threads.map((c, j) => (j === chIdx ? newChannel : c));
        // The channel just started/restarted always takes over as current —
        // mirrors InteractionNavItem's own auto-select-newest rule, now
        // mirrored up here too since this state is what drives both the
        // card (via currentChannelKey) and the new ChannelToggle bar.
        return {
          ...interaction,
          threads,
          currentThreadId: newChannel.id,
          // Only matters when `chIdx !== -1` (same-address restart, reused
          // `newChannel.id`) — clears that one channel's possibly-stale
          // "Closed" entry so a redialed/reopened channel reads as freshly
          // open again, without disturbing any sibling channel's own
          // status. A genuinely new channel (`chIdx === -1`) has no entry
          // to clear in the first place, so this is a no-op there.
          threadStatuses: withoutChannelStatus(interaction.threadStatuses, newChannel.id),
          // NOTE: `liveMessages` is deliberately left untouched here (no
          // `withoutLiveMessages` call) — per explicit correction, reopening
          // a closed channel must NOT wipe its prior messages. They stay in
          // the flat `liveMessages[newChannel.id]` array exactly as they
          // were; `InteractionTranscript` slices that array back into
          // per-session chunks using each `reopenedContacts` entry's own
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
    // here. A new one always starts closed — see the `lastSidePanelOpen
    // Choice` doc comment (its own declaration site, now removed — see
    // this file's own git history) for the earlier "remember last choice"
    // version this reverses, per explicit follow-up request.
    if (isNewInteraction) setSidePanelOpen(false);
    // Closes `CustomerRowInfoPanel` (the Customers table's own row-detail
    // flyout — a DIFFERENT panel from Customer Information/`setSidePanelOpen`
    // just above, which is the active-interaction record's own panel) any
    // time an interaction is actually launched from it — per explicit
    // request, specifically reported against the Search right panel's own
    // Customers tab: unlike the desk dashboard's Customers tab (which gets
    // hidden entirely once the page navigates to the newly-started
    // interaction), the Search panel is a persistent docked overlay that
    // stays mounted and visible across that navigation, so its own
    // `CustomerRowInfoPanel` — still showing whichever customer row was
    // clicked to launch this call — would otherwise keep sitting open on
    // top of the new interaction. Unconditional (not gated on
    // `isNewInteraction`) and safe as a no-op when nothing was open —
    // `setSelectedCustomerRow(null)` on an already-`null` value doesn't
    // trigger a re-render. This is the SAME lifted `selectedCustomerRow`
    // state the desk tab's own `CustomerRowInfoPanel` instance uses too, so
    // starting a call from EITHER instance now closes both.
    setSelectedCustomerRow(null);
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
  // field by its stable `id` (`#new-outbound-search`, set on lyra-ui's own
  // `CreateNew` — see that component's own doc comment on why it's a fixed
  // id rather than the field's default auto-generated one), suppresses the
  // browser's own autofill suggestions on it (see inline comment), and
  // focuses it directly. A closing click just fails the query harmlessly
  // (nothing to focus once the content's unmounted).
  useEffect(() => {
    const CREATE_NEW_TRIGGER_LABEL = "New Outbound";
    const onDocumentClick = (e: MouseEvent) => {
      const trigger = (e.target as HTMLElement).closest?.(
        `button[aria-label="${CREATE_NEW_TRIGGER_LABEL}"]`
      );
      if (!trigger) return;
      requestAnimationFrame(() => {
        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>("#new-outbound-search");
          if (!input) return;
          // The field's own label text contains "email" (part of
          // OUTBOUND_CONFIG.searchLabel's own copy, "Enter phone, email or
          // search term" — rendered as a real `<label>`, not placeholder
          // text, but still read by the same autofill heuristics), which
          // is enough for some browsers' autofill heuristics to treat this
          // as a saved-address field and show a suggestions dropdown the
          // moment it's focused. Chrome
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
    // Carries the EXISTING card's own interactionId forward when this
    // number already has one open — same "still the same journey" reasoning
    // as `handleStartCall`'s own `interactionId` — a fresh one only when
    // `isNewInteraction`.
    const interactionId = interactions.find((i) => i.id === id)?.interactionId ?? generateInteractionId();
    // Voice has no message concept at all, so `messageCount` is left
    // undefined here (not `0`) — see `ChannelTabProps.messageCount`'s own
    // doc comment for why that's a deliberate omission, not an oversight.
    const newChannel: Thread = {
      id: "voice",
      type: "voice",
      startTick: clockTick,
      value: phoneNumber,
      addressLabel: phoneNumber,
      contactId: generateContactId(),
      // Per explicit follow-up request — see `Thread.startedFresh`'s own
      // doc comment. A quick-dialed number has no prior conversation to
      // show; always a fresh, empty session.
      startedFresh: true,
    };
    setInteractions((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return [...prev, { id, interactionId, customerId: generateCaseId(), threads: [newChannel], currentThreadId: newChannel.id, startedFresh: true }];
      // `threads: [newChannel]` wholesale-replaces every previous thread
      // with this one fresh "voice" thread, so `threadStatuses`/
      // `liveMessages` are reset entirely too (rather than selectively
      // cleared like `handleStartCall`'s reused-id case) — no other thread
      // survives this merge for a stale entry to belong to. `liveMessages`
      // in particular matters here since `newChannel.id` is always the same
      // literal `"voice"` — without clearing it, redialing the same number
      // again would reopen still showing whatever was said on the PREVIOUS
      // call under that reused id.
      return prev.map((interaction, i) =>
        i === idx
          ? { ...interaction, threads: [newChannel], currentThreadId: newChannel.id, threadStatuses: undefined, liveMessages: undefined }
          : interaction
      );
    });
    switchActiveInteraction(id);
    if (isNewInteraction) setSidePanelOpen(false);
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
    // Same "carry the existing journey's id forward, or start a new one"
    // reasoning as `handleStartCall`/`handleQuickDial` above.
    const interactionId = interactions.find((i) => i.id === id)?.interactionId ?? generateInteractionId();
    // No stored phone number on ContactHistoryEntry — synthesize one the
    // same deterministic way `buildCustomerInfoFields`/`OUTBOUND_CUSTOMERS`
    // already do for this same customer (see `synthesizeChannelAddress`'s
    // own doc comment), keyed off `entry.caseId` since that's what this
    // interaction's own `customerId` is set to just below (same seed
    // `buildCustomerInfoFields` itself would read). Set on BOTH `value` and
    // `addressLabel` (identical string here — see `synthesizeChannelAddress`'s
    // own doc comment for why `value` matters just as much as the visible
    // label) — Voice's own exhaustion check reads `openChannelTypes`, not an
    // address, so this is more "stay consistent with every other handler"
    // than something this specific channel strictly needs today.
    const voiceAddress = synthesizeChannelAddress("voice", entry.caseId, entry.name);
    const newChannel: Thread = {
      id: "voice",
      type: "voice",
      startTick: clockTick,
      value: voiceAddress,
      addressLabel: voiceAddress,
      contactId: generateContactId(),
      // Per explicit follow-up request — see `Thread.startedFresh`'s own
      // doc comment. A redial is a fresh new call, not a continuation of
      // Contact History's own past conversation; always an empty session.
      startedFresh: true,
    };
    setInteractions((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return [...prev, { id, interactionId, customerName: entry.name, customerId: entry.caseId, threads: [newChannel], currentThreadId: newChannel.id, startedFresh: true }];
      // Same reasoning as `handleQuickDial` above — `threads: [newChannel]`
      // wholesale-replaces every previous thread, so `threadStatuses`/
      // `liveMessages` reset entirely rather than being selectively cleared.
      return prev.map((interaction, i) =>
        i === idx
          ? { ...interaction, threads: [newChannel], currentThreadId: newChannel.id, threadStatuses: undefined, liveMessages: undefined }
          : interaction
      );
    });
    switchActiveInteraction(id);
    if (isNewInteraction) setSidePanelOpen(false);
  };

  // Record header's "+" Add Channel fallback (`AddChannelAdHocButton`,
  // agent-next-gen-add-channel-button.tsx) — per explicit follow-up request
  // ("add the '+' to the unknown interactions in premium and advanced"),
  // covers the interactions `getHeaderAction` (below) still can't: it looks
  // up the interaction's own id in the combined `outboundConfig.groups` +
  // `contact-history` group (see `getHeaderAction`'s own call site's doc
  // comment), and returns `null` — no button at all — for any id that isn't
  // registered in EITHER of those (a genuinely ad-hoc/unknown interaction,
  // same "no real customer database" gap Agent Workspace 2.0 has for every
  // single one of its interactions). This is the exact same ad-hoc-only
  // component AND the exact same handler shape 2.0's own copy uses
  // (AgentNextGenPage.tsx) — adds a brand-new, unknown channel directly onto
  // the interaction that's CURRENTLY open, unlike `handleStartCall`, which
  // is keyed by CONTACT id and would start a whole separate new card for a
  // typed address with no real contact record behind it. There's no
  // skill/detail-form step in this ad-hoc flow (see that button's own doc
  // comment for why), so this builds the simplest correct `Thread` directly
  // — same shape `handleStartCall`'s own `newChannel` builds, minus the
  // fields that only exist because THAT flow goes through a real `CreateNew`
  // contact/skill pick (`preview`/`reopenedContacts`).
  const handleAddAdHocChannel = (query: string, channel: ChannelType) => {
    if (!activeInteraction) return;
    const interactionId = activeInteraction.id;
    const channelId = `${channel}:${query}`;
    const newChannel: Thread = {
      id: channelId,
      type: channel,
      startTick: clockTick,
      value: query,
      addressLabel: query,
      messageCount: channel === "voice" ? undefined : 0,
      contactId: generateContactId(),
      // Per explicit follow-up request ("whenever a new channel is open
      // unless it is re-opening a channel it should open as a draft — you
      // can see if you go to 2.0 and open an interaction from the search
      // then add a channel it populates the content") — see `Thread.
      // startedFresh`'s own doc comment for the full per-Thread fix.
      startedFresh: true,
    };
    setInteractions((prev) =>
      prev.map((interaction) => {
        if (interaction.id !== interactionId) return interaction;
        const chIdx = interaction.threads.findIndex((c) => c.id === channelId);
        const threads =
          chIdx === -1
            ? [...interaction.threads, newChannel]
            : interaction.threads.map((c, j) => (j === chIdx ? newChannel : c));
        return {
          ...interaction,
          threads,
          currentThreadId: newChannel.id,
          threadStatuses: withoutChannelStatus(interaction.threadStatuses, newChannel.id),
        };
      })
    );
  };

  /** Fired by the "Re-open" button on a Contact History entry's summary
   *  panel (the shared interior panel's `selectedContactHistoryEntry`
   *  branch, further down) — distinct from that same panel's "Redial"
   *  button, which still starts a fresh voice call via `handleRedial`
   *  above; this one reopens THIS past interaction to view/continue it.
   *  Used to fire directly off the Contact History row's own click, before
   *  that row started opening the summary panel first per explicit
   *  request — see `ContactHistoryCard`'s own doc comment. Builds a single
   *  channel matching `entry.channelType` — "voice"/"chat"/
   *  "email" are already valid `ChannelType` values (Contact History's own
   *  narrower grouping is a subset, not a separate vocabulary needing
   *  translation). `startedFresh` is deliberately left unset either way —
   *  reopening should show the existing (shared mock) conversation, not an
   *  empty "just launched" slate.
   *
   *  MERGES into an already-open Thread of this exact channel type on this
   *  same customer's card, per explicit request — mirrors `handleStartCall`'s
   *  own "same contact already has an interaction open" merge branch
   *  (`existingChannel`/`isReopenOfClosedChannel`/`reopenedContacts` above)
   *  almost exactly, rather than the wholesale `threads: [newChannel]`
   *  replace this used to do. Concretely: a customer with, say, an SMS
   *  thread already open (whether live or itself sitting Closed) who gets
   *  Re-opened from a DIFFERENT SMS-channel Contact History row doesn't get
   *  that whole card blown away and rebuilt from scratch — the reopened
   *  Contact stacks onto the SAME Thread via `reopenedContacts` (a fresh
   *  Contact id, prior messages preserved dimmed under their own session,
   *  same as any other channel reopen), and any OTHER already-open channel
   *  on that same card (an unrelated live Email/WhatsApp thread, say) is
   *  left completely untouched — `threads`/`threadStatuses`/`liveMessages`
   *  all merge in rather than replace wholesale. Only genuinely builds a
   *  brand-new Thread (no `reopenedContacts`, fresh `contactId`) when no
   *  Thread of this channel type is already on the card at all.
   *
   *  `entry.statusLabel` is carried onto `Interaction.threadStatuses`
   *  (keyed by the freshly-built channel's own id, merged alongside
   *  whatever this card's other channels already have) — per explicit
   *  request, reopening a row should pick its current session back up AT
   *  the status it was last logged with (whatever
   *  `buildDismissedContactHistoryEntry` captured, or whatever a
   *  hand-authored `CONTACT_HISTORY`/`EXTENDED_CONTACT_HISTORY` row already
   *  says), not reset to `TRANSCRIPT_SESSIONS`/`_VOICE`/`_EMAIL`'s own
   *  hardcoded default status for that session. Per explicit request,
   *  "Re-open" always hands the agent back a normal, fully reply-able
   *  assignment showing its last known state, never a locked read-only
   *  view: `Interaction.closed` (the flag that would otherwise drive a
   *  "viewing a closed interaction" banner, hidden composer, and hidden
   *  kebabs) is deliberately left unset here, regardless of `entry.closed`.
   *  If the status this reopens at happens to be literally "Closed", the
   *  normal per-channel mechanism already handles that same as it would
   *  for any other channel that closes mid-session: the status pill locks
   *  (a closed session can't be un-closed in place) and the "This channel
   *  is closed. Click Add Channel..." banner points the agent at the one
   *  real way to restart it — clicking that channel's own Add Channel
   *  button merges in a fresh, fully editable session (`reopenedContacts`)
   *  right on top, the exact same mechanism this handler itself now uses.
   *  Either way, the agent decides what to do next AFTER seeing the
   *  reopened card, not before. */
  const handleReopenContactHistoryEntry = (entry: ContactHistoryEntry) => {
    const id = entry.customerId ?? `history:${entry.id}`;
    const existingInteraction = interactions.find((i) => i.id === id);
    // Restore the exact record `agent-next-gen-case-database.ts` saved for
    // this case instead of rebuilding a lossy guess from this entry's own
    // single-channel summary — see that module's own top-of-file comment,
    // and this same short-circuit's doc comment in AgentNextGenPage.tsx,
    // for the full reasoning (mirrored here per this file's own
    // established convention).
    if (!existingInteraction) {
      const storedRecord = getCaseRecord(entry.caseId);
      if (storedRecord) {
        setInteractions((prev) => [...prev, storedRecord]);
        switchActiveInteraction(storedRecord.id);
        setSidePanelOpen(false);
        return;
      }
    }
    const isNewInteraction = !existingInteraction;
    // Same "carry the existing journey's id forward, or start a new one"
    // reasoning as `handleStartCall`/`handleQuickDial`/`handleRedial` above.
    const interactionId = existingInteraction?.interactionId ?? generateInteractionId();
    // Same reasoning as `handleRedial`'s own `addressLabel`/`value` above —
    // no real address stored on `ContactHistoryEntry`, so it's synthesized
    // the same deterministic way, keyed off `entry.caseId` (this
    // interaction's own `customerId`, set just below). `entry.channelType`
    // covers "chat" here too (unlike `handleRedial`, always "voice"), which
    // is exactly the case `synthesizeChannelAddress` special-cases into
    // "Chat {time}" instead of a fabricated address (and chat has no
    // `value`-based exhaustion check to satisfy either way — see that
    // function's own doc comment). Setting `value` here (not just
    // `addressLabel`, which is all this used to set) was a real, shipped
    // bug: confirmed via screenshot that reopening a hand-authored Contact
    // History row, then clicking its still-enabled header Email/WhatsApp/
    // SMS button, opened a silent duplicate of the exact same channel
    // instead of disabling itself — `buildOpenChannelTagger`
    // (AgentNextGenPage.tsx) only ever reads `Thread.value` to
    // populate `openChannelAddresses`, never `addressLabel`, so a channel
    // with no `value` set could never register as "already open" no matter
    // how it displayed on its own tab.
    const address = synthesizeChannelAddress(entry.channelType, entry.caseId, entry.name);
    // Same "is there already a Thread of this exact type on this card, and
    // is IT currently Closed" lookup `handleStartCall` does for its own
    // `existingChannel`/`isReopenOfClosedChannel` — see this function's own
    // doc comment above for why. `entry.channelType` alone (not a
    // `type:address` composite like `handleStartCall`'s own
    // `existingChannelId`) is this handler's own established channel-id
    // scheme (unchanged from before this merge fix) — Contact History rows
    // carry no real per-address identity to build a composite id from.
    // (`existingInteraction` itself is computed once, at the top of this
    // function, so the DB-restore short-circuit above can use it too.)
    const existingChannelId = entry.channelType;
    const existingChannel = existingInteraction?.threads.find((c) => c.id === existingChannelId);
    const isReopenOfClosedChannel =
      !!existingChannel && existingInteraction?.threadStatuses?.[existingChannelId] === "Closed";
    // Same reopen-stacking shape `handleStartCall` builds for its own
    // `reopenedContacts` — see that field's own doc comment (`Thread.
    // reopenedContacts`, agent-next-gen-interaction-dashboard.tsx) for the
    // full picture of how `InteractionTranscript` turns this into one more
    // "Session Details" separator, prior messages preserved (dimmed) under
    // their own boundary rather than wiped.
    const reopenedContacts = isReopenOfClosedChannel
      ? [
          ...(existingChannel!.reopenedContacts ?? []),
          {
            id: `session-reopened-${Date.now()}`,
            date: new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }),
            startTime: new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
            contactId: generateContactId(),
            messagesBeforeReopen: existingInteraction?.liveMessages?.[existingChannelId]?.length ?? 0,
          },
        ]
      : existingChannel?.reopenedContacts;
    const newChannel: Thread = {
      id: existingChannelId,
      type: entry.channelType,
      startTick: clockTick,
      value: address,
      addressLabel: address,
      // Reopening an EXISTING Thread keeps its own base Contact id — a
      // reopen's own distinct Contact id lives on its `reopenedContacts`
      // entry above instead, same "the Thread persists, each Contact
      // within it is its own instance" split `handleStartCall` already
      // draws. Only a genuinely new Thread gets a fresh one here.
      contactId: existingChannel?.contactId ?? generateContactId(),
      reopenedContacts,
    };
    setInteractions((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) {
        return [
          ...prev,
          {
            id,
            interactionId,
            customerName: entry.name,
            customerId: entry.caseId,
            threads: [newChannel],
            currentThreadId: newChannel.id,
            threadStatuses: { [newChannel.id]: entry.statusLabel },
          },
        ];
      }
      return prev.map((interaction, i) => {
        if (i !== idx) return interaction;
        // Merge, not replace — same "add alongside, or replace just the
        // matching one in place" logic `handleStartCall` uses for its own
        // `threads` update, so any OTHER already-open channel on this same
        // card (unrelated to `entry.channelType`) survives untouched.
        const chIdx = interaction.threads.findIndex((c) => c.id === newChannel.id);
        const threads =
          chIdx === -1
            ? [...interaction.threads, newChannel]
            : interaction.threads.map((c, j) => (j === chIdx ? newChannel : c));
        return {
          ...interaction,
          threads,
          currentThreadId: newChannel.id,
          // Merged alongside whatever this card's other channels already
          // have — a wholesale replace here would wipe an unrelated
          // channel's own status the same way `threads: [newChannel]`
          // used to wipe its whole channel list.
          threadStatuses: { ...interaction.threadStatuses, [newChannel.id]: entry.statusLabel },
          // `liveMessages` deliberately left untouched (no reset) — same
          // reasoning as `handleStartCall`'s own merge branch: this
          // channel's prior messages need to stay in place so
          // `InteractionTranscript` can keep rendering them (dimmed) under
          // their original session via `reopenedContacts.
          // messagesBeforeReopen` above, and any OTHER channel's own
          // `liveMessages` entry was never touched by this reopen in the
          // first place.
        };
      });
    });
    switchActiveInteraction(id);
    if (isNewInteraction) setSidePanelOpen(false);
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
      // Per explicit request: skip ALL of this logging when the agent
      // never actually sent a message on any channel of this assignment —
      // a genuine, never-launched draft (the exact case the LeftNav card/
      // session row/record header's own red trash "Delete Draft" button
      // now renders for, see `removeVariant`/`isNewThread` at their own
      // call sites). There was never a real customer contact here to log;
      // logging one anyway would leave a phantom "Resolved" row for a
      // conversation the customer never even saw. A dismissed assignment
      // the agent actually worked (even just one message, even if the
      // customer never got a chance to reply yet) still logs normally,
      // same as before this check existed — this only ever suppresses the
      // brand-new, untouched case.
      const everSentAgentMessage = Object.values(dismissed.liveMessages ?? {}).some((messages) =>
        messages.some((m) => m.sender === "agent")
      );
      if (everSentAgentMessage) {
        // Explicit save, redundant with the continuous `useEffect` sync above
        // — see that effect's own doc comment in AgentNextGenPage.tsx for why
        // this exact moment can't rely on the effect alone.
        saveCaseRecord(dismissed);
        const entry = buildDismissedContactHistoryEntry(dismissed, clockTick);
        // Upsert by `caseId`, not a plain prepend — per explicit bug report:
        // reopening a dismissed case (from Contact History or otherwise),
        // touching it, and dismissing it again used to log a SECOND row for
        // the exact same case, so a customer bounced open/closed a few times
        // piled up one near-duplicate "Contact History" entry per cycle
        // instead of reading as one case whose status just changed. `caseId`
        // (== `Interaction.customerId`) is the right identity to match on —
        // it's stable across the whole life of a card, carried straight
        // through on every reopen (`handleReopenContactHistoryEntry`'s own
        // `customerId: entry.caseId`), unlike this entry's own synthetic
        // `id` (`dismissed-${interaction.id}-${Date.now()}`), which is
        // deliberately unique per dismiss and would never match anything.
        // Only ever collapses entries within `dismissedContactHistory`
        // itself (today's real, agent-generated rows) — the separate
        // hand-authored `CONTACT_HISTORY`/`EXTENDED_CONTACT_HISTORY` fixture
        // rows `buildContactHistoryByRange` layers in for "Last 48/72 Hours"
        // are untouched, different (fictional) cases entirely.
        setDismissedContactHistory((prev) => [entry, ...prev.filter((e) => e.caseId !== entry.caseId)]);
      }
      fireDismissToast(dismissed, !everSentAgentMessage);
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
    if (interaction) {
      // Same "genuine, never-launched draft" check `handleDismissInteraction`
      // runs, scoped to just THIS channel — see that handler's own doc
      // comment for the full reasoning. Only affects the toast's wording
      // here (`fireDismissToast`'s own `isDraftDelete` doc comment) — this
      // handler never logs Contact History either way (dismissing one
      // channel of a still-open, multi-channel card was never a "the whole
      // assignment is over" event to log in the first place).
      const everSentAgentMessage = (interaction.liveMessages?.[dismissedKey] ?? []).some(
        (m) => m.sender === "agent"
      );
      fireDismissToast(interaction, !everSentAgentMessage);
    }
    setInteractions((prev) =>
      prev.map((interaction) => {
        if (interaction.id !== id) return interaction;
        const channels = interaction.threads.filter((c) => (c.id ?? c.type) !== dismissedKey);
        // Dismissing the currently-selected channel needs to hand "current"
        // to another remaining one (the new last channel, same fallback
        // InteractionNavItem itself uses) — otherwise the card/tab bar would
        // keep pointing at a channel that no longer exists.
        const currentThreadId = interaction.currentThreadId === dismissedKey
          ? channels[channels.length - 1]?.id
          : interaction.currentThreadId;
        return { ...interaction, threads: channels, currentThreadId };
      })
    );
  };

  /** Fired by a card row's `onCurrentChannelChange` or a `ChannelToggle`'s
   *  `onClick` — both point at this same setter so either one updates the
   *  other (see `Interaction.currentThreadId`'s own doc comment). */
  const handleChannelSelect = (interactionId: string, channelKey: string) => {
    setInteractions((prev) =>
      prev.map((interaction) =>
        interaction.id === interactionId ? { ...interaction, currentThreadId: channelKey } : interaction
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
      interactionAtSend?.currentThreadId ??
      (interactionAtSend?.threads[interactionAtSend.threads.length - 1]
        ? interactionAtSend.threads[interactionAtSend.threads.length - 1].id ??
          interactionAtSend.threads[interactionAtSend.threads.length - 1].type
        : undefined) ??
      "channel";
    // Same key `applyToChannel`/`customerTyping` below share — see
    // `customerTyping`'s own doc comment. Only chat/SMS/WhatsApp ever gets a
    // "customer is typing" bubble (`InteractionTranscript`'s own
    // `isTextChannel` render gate covers this too, but resolving the type
    // here as well avoids ever setting the flag for voice/email in the
    // first place).
    const channelTypeAtSend = interactionAtSend?.threads.find((c) => (c.id ?? c.type) === channelKeyAtSend)?.type;
    const isTextChannelAtSend =
      channelTypeAtSend === "chat" || channelTypeAtSend === "sms" || channelTypeAtSend === "whatsapp";
    const typingKey = `${interactionId}:${channelKeyAtSend}`;

    // Duplicated verbatim from AgentNextGenPage.tsx (Agent Workspace 2.0)
    // per this codebase's "no shared sync" convention — captures the real
    // send time of a brand-new thread's first-ever LIVE agent message
    // (guarded on no prior `liveMessages` for this channel key), once, into
    // `threadLaunchTimestamps` (see that state's own doc comment above).
    if (!interactionAtSend?.liveMessages?.[channelKeyAtSend]?.length) {
      const launchKey = `${interactionId}:${channelKeyAtSend}`;
      setThreadLaunchTimestamps((prev) => (prev[launchKey] ? prev : { ...prev, [launchKey]: new Date().toISOString() }));
    }

    const applyToChannel = (
      interaction: Interaction,
      message: TranscriptMessage,
      awaitingResponse: boolean,
      // Only ever passed on the customer-reply branch below — the moment
      // that reply actually lands is exactly what `lastCustomerMessageTick`
      // needs to record (see that field's own doc comment). Omitted (not
      // just `undefined`-valued) on the agent-send branch so it doesn't
      // overwrite the channel's existing value with `undefined` there.
      lastCustomerMessageTick?: number
    ): Interaction => ({
      ...interaction,
      // Keyed by `channelKeyAtSend` — see `Interaction.liveMessages`'s
      // own doc comment for why this can't be one flat array shared across
      // every channel on the card.
      liveMessages: {
        ...interaction.liveMessages,
        [channelKeyAtSend]: [...(interaction.liveMessages?.[channelKeyAtSend] ?? []), message],
      },
      threads: interaction.threads.map((c) =>
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

    // "Customer is typing" — see `customerTyping`'s own doc comment. Per
    // explicit follow-up request ("do not display the typing indicator
    // until 2s after the agent message is sent"), no longer set the
    // instant the agent's own message goes out — behind its own 2000ms
    // `window.setTimeout` instead, so the bubble only appears starting 2s
    // after the agent sends a message, not immediately. Still cleared (and
    // the actual reply lands) at the original 2500ms mark below — this
    // narrows the indicator's own visible window to the LAST 500ms before
    // the reply lands, rather than changing the total reply delay itself
    // (a separate, unrelated earlier misreading of this same request —
    // reverted).
    if (isTextChannelAtSend) {
      window.setTimeout(() => {
        setCustomerTyping((prev) => ({ ...prev, [typingKey]: true }));
      }, 2000);
    }

    // Simulated customer reply — canned text, not a real conversation
    // engine. "Customer"/"C" here are placeholders: `InteractionTranscript`
    // already swaps every customer-sender message's name/initials for this
    // interaction's real customer at render time (see its own doc comment),
    // so this reads correctly without needing the real name threaded
    // through here too.
    window.setTimeout(() => {
      if (isTextChannelAtSend) {
        setCustomerTyping((prev) => ({ ...prev, [typingKey]: false }));
      }
      const customerMessage: TranscriptMessage = {
        id: `live-${Date.now()}-customer`,
        sender: "customer",
        name: "Customer",
        initials: "C",
        timestamp: new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
        text: resolveCustomerAutoReply(trimmed),
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
   *  `Interaction.channelStatuses` (see that field's own doc comment
   *  for why status has to be tracked per-channel, and why it has to live
   *  here rather than purely in `InteractionTranscript`'s own state) —
   *  leaving every sibling channel's own status untouched. Read back by
   *  `buildDismissedContactHistoryEntry` when this interaction is later
   *  dismissed, so the logged Contact History row reflects whatever status
   *  was actually last assigned instead of always "Resolved". */
  // Per explicit follow-up request, no longer fires a toast on every status
  // change — the confirming toast (added per an earlier request) turned out
  // to be more noise than signal once every status-pill/Outcome-Resolution
  // trigger for the current channel started funneling through here (see
  // this function's own three real call sites) — a toast firing on nearly
  // every status click read as excessive rather than helpful.
  const handleInteractionStatusChange = (interactionId: string, channelId: string, status: string) => {
    setInteractions((prev) =>
      prev.map((interaction) => {
        if (interaction.id !== interactionId) return interaction;
        // Live "Assignments resolved today" count (see `resolvedTodayCount`'s
        // own doc comment above) — increments only on the actual Open/
        // whatever→Resolved TRANSITION, not on every write to an
        // already-Resolved channel (re-selecting the same status from the
        // dropdown, or a second status change on a channel that's already
        // Resolved, shouldn't inflate the count).
        if (status === "Resolved" && interaction.threadStatuses?.[channelId] !== "Resolved") {
          setResolvedTodayCount((n) => n + 1);
        }
        return { ...interaction, threadStatuses: { ...interaction.threadStatuses, [channelId]: status } };
      })
    );
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
     `interactions` (read off each `Thread.type`/`.value`, set at
     start-call time — a contact can have more than one channel of the same
     type open at once, e.g. two SMS threads on different numbers, so
     addresses are a list per channel type, not a single value), across
     every group (Agents/Teams/Skills/Customers — Favorites is derived from
     these same records, so it inherits the tagging automatically).
     Recomputed whenever `interactions` changes so an address/channel
     re-enables the moment its interaction is dismissed. */
  const outboundConfig = useMemo<CreateNewOutboundConfig>(() => {
    const tagOpenChannels = buildOpenChannelTagger(interactions);
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

  // `CONTACT_HISTORY_OUTBOUND_CONTACTS` (the 5 hand-authored rows) PLUS a
  // live-rebuilt contact for every row in `dismissedContactHistory` (see
  // `buildContactHistoryOutboundContacts`'s own doc comment for why the
  // latter needs the exact same treatment — a freshly dismissed interaction
  // logs its own brand-new `ContactHistoryEntry` with a fresh id, so it hits
  // the identical "nothing registered under this synthetic id" gap the 5
  // original rows had), all run through the exact same `buildOpenChannelTagger`
  // as every group inside `outboundConfig` above — see that function's own
  // doc comment for why these can't just be folded into `outboundConfig.groups`
  // directly. Recomputed off `interactions`/`dismissedContactHistory` so a
  // reopened/redialed Contact History card's already-open channels disable
  // themselves the same way a real customer's would, re-enable the moment
  // that interaction is dismissed, and a newly-dismissed customer's own
  // card gets a working "+" (Add Channel) row the very next time it's
  // reopened, not just the 5 rows that happened to be hand-authored ahead
  // of time.
  const contactHistoryOutboundContacts = useMemo(
    () =>
      [...CONTACT_HISTORY_OUTBOUND_CONTACTS, ...buildContactHistoryOutboundContacts(dismissedContactHistory)].map(
        buildOpenChannelTagger(interactions)
      ),
    [interactions, dismissedContactHistory]
  );

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
  //
  // `groups` gets one extra entry here, ON TOP OF `outboundConfig.groups` —
  // `contactHistoryOutboundContacts` (tagged copy of
  // `CONTACT_HISTORY_OUTBOUND_CONTACTS`, agent-next-gen-outbound-data.tsx,
  // computed above), keyed under the exact synthetic `history:${id}`/
  // `redial:${id}` ids `handleReopenContactHistoryEntry`/`handleRedial` fall
  // back to for the 5 hand-authored `CONTACT_HISTORY` rows with no real
  // `CREATE_NEW_CUSTOMERS` record behind them. Per explicit request:
  // reopening/redialing one of those rows used to leave the record header's
  // own "+" (Add Channel) row completely empty — `useOutboundAddButton`'s
  // `contactsById` had nothing to find under either synthetic id, so
  // `getAvailableChannels` always came back `[]` even for a customer with
  // other channels genuinely on file (`ContactHistoryEntry.channels`).
  // Deliberately appended ONLY here, not folded into `outboundConfig`
  // itself — `outboundConfig` is the exact same object the LeftNav's own
  // `<CreateNew outbound={{...outboundConfig, ...}}>` picker below reads for
  // its "Choose group" dropdown AND its typed-search results
  // (`hideContactList` only suppresses the idle browse list, not a real
  // search match — see that prop's own doc comment, create-new.tsx), so
  // adding it there would make these fictional, non-real "customers"
  // wrongly searchable/dialable from New Outbound. This hook's own
  // `contactsById`, by contrast, is never rendered as a browsable/searchable
  // list anywhere — it only ever resolves ONE already-known interaction id
  // at a time (`getAvailableChannels(activeInteraction.id)`/
  // `getHeaderAction(interaction.id)`), so there's nothing for this extra
  // group to leak into. Per explicit follow-up request, this group's own
  // contacts still need the exact same already-open-channel disabling as
  // every other group gets — that's why `contactHistoryOutboundContacts`
  // (run through `buildOpenChannelTagger`, same as `outboundConfig`'s own
  // groups above) is used here instead of the raw, untagged
  // `CONTACT_HISTORY_OUTBOUND_CONTACTS` constant.
  const { getHeaderAction } = useOutboundAddButton({
    ...outboundConfig,
    groups: [
      ...outboundConfig.groups,
      { id: "contact-history", label: "Contact History", contacts: contactHistoryOutboundContacts },
    ],
    onStartCall: handleStartCall,
  });

  /* Welcome modal — shown once on page load; "Go Available" flips the agent
     to Available, "Start Offline" (button label — see the AgentWelcomeMessage
     call site's own doc comment for why the label reads "Offline" while this
     handler is still named/keyed "Unavailable") keeps them Unavailable (the
     default state). lyra-ui's `AgentStatus` dropped "offline" (just
     Available/Unavailable now), so this no longer keeps the agent
     "Offline" as a real status — Unavailable is the closest equivalent
     starting state; the button's own label was renamed back to "Start
     Offline" per explicit request, but the underlying status is still
     "unavailable". */
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
    // Same "carry the existing journey's id forward, or start a new one"
    // reasoning as every other handler above.
    const interactionId = interactions.find((i) => i.id === id)?.interactionId ?? generateInteractionId();
    const channel = NOTIFICATION_CHANNEL[notification.id] ?? "email";
    const newChannel: Thread = {
      id: channel,
      type: channel,
      startTick: clockTick,
      contactId: generateContactId(),
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
          interactionId,
          customerName: notification.subtitle,
          customerId: generateCaseId(),
          threads: [newChannel],
          currentThreadId: newChannel.id,
        }];
      }
      return prev.map((interaction, i) =>
        i === idx
          // `threads: [newChannel]` wholesale-replaces every previous
          // thread here too (same as the other launch paths above) — this
          // one doesn't reset `threadStatuses` (pre-existing, unrelated to
          // this fix), but `liveMessages` does need clearing: `newChannel.id`
          // reuses a fixed per-notification channel type/id, so without
          // this, opening the same notification-backed assignment again
          // could reopen it still showing a stale previous conversation
          // under that reused key.
          ? { ...interaction, threads: [newChannel], currentThreadId: newChannel.id, liveMessages: undefined }
          : interaction
      );
    });
    switchActiveInteraction(id);
    if (isNewInteraction) {
      setSidePanelOpen(false);
      // Per explicit request ("when a new interaction comes in - if the
      // left nav is closed, open it"), scoped to genuinely INBOUND arrivals
      // only — a notification represents work that landed on its own, not
      // something the agent just launched. Deliberately does NOT extend to
      // `handleStartCall`/`handleQuickDial`/`handleRedial` (the
      // agent-initiated launch paths) — that auto-open was explicitly
      // dropped per an earlier request (see this same file's own
      // `handleStartCall` doc comment above), and this stays scoped clear
      // of reintroducing it there.
      setNavOpen(true);
    }
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
  };

  // Wired to the Search panel's Interactions tab (`InteractionsListView`'s
  // own `onOpenInteraction`, via `useSearchPanelContent` below) — per
  // explicit request, clicking a row there opens it as a real, active
  // assignment in the left nav, same shape `handleOpenAssignmentFromNotification`
  // just above already builds from a notification click: NOT `startedFresh`
  // (a row in this table represents an already-existing, already-routed
  // conversation with real prior history, not a blank-slate outbound
  // interaction the agent is originating), wholesale-replaces `channels`/
  // clears `liveMessages` when the same contact already has a card open
  // (same reasoning as that handler's own comment on that branch). The
  // matching `CreateNewOutboundContact`/customer record is looked up by
  // `record.caseId`, which `buildInteractionHistory` (this file — actually
  // agent-next-gen-interactions-table.tsx) sets to that customer's own
  // `customerId` in the first place, so this reliably finds the same
  // record every row was built from without a second, parallel id scheme.
  const handleOpenInteractionRow = (record: InteractionHistoryRecord) => {
    const customer = CREATE_NEW_CUSTOMERS.find((c) => c.customerId === record.caseId) ?? CREATE_NEW_CUSTOMERS[0];
    const id = customer.id;
    // Read before `setInteractions` below — see `handleStartCall`'s own
    // `isNewInteraction` comment for why.
    const isNewInteraction = !interactions.some((i) => i.id === id);
    // Same "carry the existing journey's id forward, or start a new one"
    // reasoning as every other handler above.
    const interactionId = interactions.find((i) => i.id === id)?.interactionId ?? generateInteractionId();
    // Same reasoning as `handleRedial`/`handleReopenContactHistoryEntry`'s
    // own `addressLabel`/`value` above — `InteractionHistoryRecord` has no
    // stored address either, so it's synthesized the same deterministic
    // way, keyed off `record.caseId` (this interaction's own `customerId`,
    // set just below) so it agrees with the Customer Information panel's
    // own fields — AND `OUTBOUND_CUSTOMERS`' own `email`/`primaryPhone` for
    // this exact customer (`record.caseId` is this row's real
    // `customerId`, the same seed `OUTBOUND_CUSTOMERS` itself keys off —
    // see `handleOpenInteractionRow`'s own `customer` lookup just above).
    // `record.type` covers "chat" here too, which `synthesizeChannelAddress`
    // special-cases into "Chat {time}". Setting `value` (not just
    // `addressLabel`) fixes the same already-open-channel-not-disabling bug
    // `handleReopenContactHistoryEntry`'s own doc comment describes — this
    // handler had the identical gap, just for real `CREATE_NEW_CUSTOMERS`
    // records reopened from the Interactions table instead of hand-authored
    // Contact History ones.
    const address = synthesizeChannelAddress(record.type, record.caseId, record.customerName);
    const newChannel: Thread = {
      id: record.type,
      type: record.type,
      startTick: clockTick,
      value: address,
      addressLabel: address,
      contactId: generateContactId(),
      preview: record.skill,
    };
    setInteractions((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) {
        return [...prev, {
          id,
          interactionId,
          customerName: record.customerName,
          customerId: record.caseId,
          threads: [newChannel],
          currentThreadId: newChannel.id,
        }];
      }
      return prev.map((interaction, i) =>
        i === idx
          ? { ...interaction, threads: [newChannel], currentThreadId: newChannel.id, liveMessages: undefined }
          : interaction
      );
    });
    switchActiveInteraction(id);
    if (isNewInteraction) setSidePanelOpen(false);
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
  // Schedule — basic Day/Week calendar shell (lyra-ui schedule-panel, new this
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
  // Search — per explicit request, the Interactions table (previously its
  // own top-level desk tab, `InteractionsListView`, agent-next-gen-
  // interactions-table.tsx) has been MOVED here as this panel's body,
  // replacing the old blank "Nothing here yet" placeholder — not
  // duplicated; the desk tab itself is gone (see `deskTabOrder`'s own
  // initial array and the `activeDeskTab` render branch further down,
  // both of which no longer include `"interactions"`).
  //
  // Built via the shared `useSearchPanelContent` hook (agent-next-gen-
  // search-panel.tsx) — per a follow-up explicit request, this Search
  // panel's tab/content system is now shared with
  // `AgentWorkspace2WithDeskPage.tsx` too. `tabs: SEARCH_PANEL_TABS` below
  // is now dead/unused — per the latest explicit request ("in advanced
  // and premium, clear the search panel of content and just have a
  // search bar...") this call site passes `simpleCustomerSearch: true`
  // instead, which makes the hook ignore `tabs` entirely (see that
  // option's own doc comment) — kept only because the hook's own internal
  // `activeTab` state still needs a non-empty array to seed its
  // (unreachable-in-this-mode) `useState` initializer.
  //
  // Customers' body reuses the EXACT SAME lifted state the desk
  // dashboard's own "Customers" tab already uses (`customerSortedRows`,
  // `customerAddedFilterKeys`, `selectedCustomerRow`, etc. — all declared
  // once, near this component's top, alongside that tab's own
  // `<CustomersListView>` render call further down) rather than a second,
  // independent copy — it's conceptually the SAME customer list/filters/
  // sort/selection either way, just reachable from two different places
  // in the UI, so both should always agree rather than silently drifting
  // apart. `CustomersListView` itself is a fully controlled component (no
  // internal state of its own — every prop is lifted, see its own props
  // doc comments), so mounting a second instance of it here (inside the
  // hook) with those same props/handlers is safe: both instances just
  // render synced views of that one shared state, and acting on either
  // updates it for both.
  //
  // The headerContent wrapper these 3 panel-render call sites already put
  // around EVERY panel's `headerContent` (docked/fullscreen/combined-mode,
  // all `<div className="shrink-0 px-4 pb-3 border-b ...">`) draws its own
  // `border-b` right underneath regardless, so a `TabList` here — which
  // already has its own `border-b` right under the tab row itself — showed
  // two stacked horizontal lines: the tab row's own bottom border (the
  // "tab separator", flush under the labels/active-indicator) AND that
  // wrapper's (the "heading separator", a few pixels further down, below
  // the wrapper's own `pb-3` padding). Per explicit request, it's the
  // WRAPPER's border that's suppressed here (not the TabList's own) — see
  // each of those 3 call sites' own `activePanelKey === "search"` check —
  // so the single remaining divider is the tab row's own, flush underline,
  // not the lower one.
  const searchContent = useSearchPanelContent({
    tabs: SEARCH_PANEL_TABS,
    onAddToast: addToast,
    onOpenInteraction: handleOpenInteractionRow,
    simpleCustomerSearch: true,
    customers: {
      onStartInteraction: (contact, channel, phone, skillId) =>
        handleStartCall({ contact, channel, phone, skillId }),
      addedFilterKeys: customerAddedFilterKeys,
      onAddedFilterKeysChange: setCustomerAddedFilterKeys,
      filterValues: customerFilterValues,
      onFilterValuesChange: setCustomerFilterValues,
      // Per a later explicit follow-up request ("have the customer info
      // panel open in the right panel when the rows are clicked (like in
      // premium)"), this no longer no-ops — clicking a row here now opens
      // `CustomerRowInfoPanel` again, toggle-open/close on the same row
      // (mirroring Premium's own desk-tab Customers table `onRowClick`
      // pattern). The desk-tab Customers table's own `onRowClick` just
      // above stays a no-op — this change is scoped to the Search panel's
      // Customers sub-tab specifically, per that request's own wording.
      // The panel's pop-out/full-screen toggle is suppressed separately —
      // see `hideFullScreenToggle` at this branch's `CustomerRowInfoPanel`
      // call site (agent-next-gen-search-panel.tsx).
      onRowClick: (row) =>
        setSelectedCustomerRow((prev) => (prev?.contactNumber === row.contactNumber ? null : row)),
      searchQuery: customerSearchQuery,
      onSearchChange: setCustomerSearchQuery,
      searchSubmitted: customerSearchSubmitted,
      onSearchSubmittedChange: setCustomerSearchSubmitted,
      sortKey: customerSortKey,
      sortDir: customerSortDir,
      onSort: handleCustomerSort,
      sortedRows: customerSortedRows,
      selectedRow: selectedCustomerRow,
      onCloseRow: () => setSelectedCustomerRow(null),
      onPreviousRow: () => handleCustomerRowNav(-1),
      onNextRow: () => handleCustomerRowNav(1),
      hasPreviousRow: selectedCustomerIndex > 0,
      hasNextRow: selectedCustomerIndex !== -1 && selectedCustomerIndex < customerSortedRows.length - 1,
      // Per explicit follow-up ("you didn't add the icon to advanced") —
      // the Search panel's own Customers sub-tab only ever renders from
      // this page (see its own `leadingChannelStack` doc comment), so it
      // gets the same eye-icon "is this customer open" check the main
      // Desk-tab table below already uses (no `openCustomerTabs` concept
      // on this tier, same as that call site).
      isRowOpen: (row) => interactions.some((i) => i.customerId === row.contactNumber),
      // Matches this tier's own main desk-tab Customers view's own
      // `CustomerRowInfoPanel` call site (`tabs={AGENT_WORKSPACE_CUSTOMER_
      // PANEL_TABS}`, below) — see `panelTabs`'s own doc comment (agent-
      // next-gen-search-panel.tsx) for why this is now threaded through
      // explicitly instead of hard-coded inside the hook.
      panelTabs: AGENT_WORKSPACE_CUSTOMER_PANEL_TABS,
    },
  });
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
  // `showAllContacts` alone isn't enough once it stops being cleared on
  // interaction start (see that state's own doc comment) — `!activeInteraction`
  // keeps this label matching the ternary branch actually rendered below.
  const mainRegionTabLabel = showSettings
    ? "Settings"
    : showAllContacts && !activeInteraction
      ? "All Contacts"
      : activeInteraction
        ? `${activeInteraction.customerName ?? "Customer"} (${activeInteraction.customerId})`
        : "Home";

  // Clicking a button: re-clicking the CURRENTLY showing one closes the
  // shared container outright. Otherwise, if it's closed, open it in
  // whatever `panelVariant` already is (see that state's own doc comment
  // above); if it's already open showing a DIFFERENT key, only
  // `activePanelKey` changes — the container itself never resizes,
  // repositions, or re-animates open+close, only its title/body content
  // does.
  const handlePanelButtonClick = (key: PanelKey) => () => {
    if (panelOpen && activePanelKey === key) {
      setPanelOpen(false);
      return;
    }
    if (!panelOpen) {
      setPanelOpen(true);
    }
    setActivePanelKey(key);
    // Below 768px, opening a panel switches straight to its tab — otherwise
    // clicking a header icon while narrow would silently open the panel
    // behind whatever the main tab currently shows, with no visible change.
    if (isNavNarrow) setNarrowActiveRegion("panel");
  };

  // Per explicit follow-up request ("detach the contacts table from the
  // search panel and have it exist on its own") — wired to
  // `ContactHistoryCard`'s own `onOpenAllContacts` prop below. The original
  // version of this handler opened the shared right-docked Search panel's
  // own "Contacts" tab, maximized to full screen (see BEHAVIOR.md §134);
  // this follow-up replaces that entirely with the new `showAllContacts`
  // top-level view (declared next to `showSettings` above) — no panel
  // involved at all anymore. Reaches the Contacts table, not "Customers"
  // (the separate customer-database tab this tier alone also has).
  const handleOpenAllContacts = () => {
    setShowAllContacts(true);
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
    wem: { label: "WEM", icon: UserCog },
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
  // Customers/Accounts/Tickets are hidden from this menu specifically (per
  // explicit request) — `panelOrder`/`pinnedKeys` themselves are untouched,
  // so Accounts/Tickets (unpinned) simply have no way to open them anymore,
  // since this menu was their only entry point; Customers (also unpinned)
  // is the same, but has its Search-panel Customers tab as a real
  // alternative entry point. WEM is deliberately NOT in this list (dropped
  // per a follow-up explicit request, "Add WEM to the top right app area")
  // — it's now pinned (see `pinnedKeys` above) AND listed here, a fully
  // reachable, discoverable app like Notifications/Agent Chat/etc.
  const HIDDEN_FROM_APPS_MENU: PanelKey[] = ["customers", "accounts", "tickets"];
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

  // How much room the DOCKED shared panel can actually claim without
  // pushing `containerRef`'s own `min-w-[374px]` floor (and so the whole
  // row) past the viewport — see `INTERACTION_MAIN_CONTENT_MIN_WIDTH`'s own
  // doc comment for the full reasoning. Computed here (not just down at the
  // docked-panel render block that actually uses it) so it can ALSO feed
  // `Draggable`'s own `maxWidth` prop below — per explicit follow-up
  // report, capping only the RENDERED width (this file's own earlier
  // attempt) still let an active drag visually run the panel off the right
  // edge of the screen while dragging, since that render-width clamp used
  // to explicitly bypass itself while `panelIsResizing`. `Draggable` itself
  // already re-reads `maxWidth` live on every pointer-move during a drag
  // (`draggable.tsx`'s own resize handlers), so feeding it this same,
  // per-render-fresh boundary stops the drag handle itself right at the
  // wall instead of only clipping the box after the fact.
  const leftNavRenderWidth = isNavNarrow ? 0 : navOpen ? 256 : 60;
  const maxDockedWidthForMainFloor = Math.max(
    0,
    bodyContainerWidth - leftNavRenderWidth - INTERACTION_MAIN_CONTENT_MIN_WIDTH - 12
  );

  // The one shared `Draggable` — its header (icon/actions/title) and body
  // swap to whichever button's content is active; the container itself
  // (variant/width/position) never does.
  const sharedPanel = panelMounted && activePanelContent ? (
    <Draggable
      ref={panelRef}
      variant={panelVariant}
      defaultWidth={panelWidth}
      defaultHeight={panelHeight}
      // Shares `containerRef`'s own tested VISUAL content floor
      // (`SHARED_CONTENT_MIN_VISUAL_WIDTH`) rather than a separate,
      // never-validated 280px default — per explicit request to give the
      // main content column and the docked shared panel the same real
      // on-screen minimum size. Deliberately NOT
      // `INTERACTION_MAIN_CONTENT_MIN_WIDTH` (374) — that number already has
      // `containerRef`'s own `pr-3` padding baked in (see that constant's own
      // doc comment), but this outer box carries no equivalent padding of
      // its own, so adding it here would make the panel's floor render 12px
      // WIDER than `containerRef`'s, not the same. Below this the panel's
      // own content (list rows, labels, actions) gets just as cramped as the
      // main column would.
      minWidth={SHARED_CONTENT_MIN_VISUAL_WIDTH}
      // This instance already computes its own precise ceiling from real
      // sibling layout (`maxDockedWidthForMainFloor`, above) — `Draggable`'s
      // generic "below 1440px viewport, tighten to 800px" heuristic
      // (`getResponsiveMaxWidth`) has no visibility into that and was
      // capping the panel below 1024px even while `containerRef` sat
      // comfortably above its own floor with room to spare. Opting out lets
      // the floor-aware ceiling be the only cap, matching the explicit
      // requirement: resizable up to `SHARED_PANEL_MAX_WIDTH` OR until
      // `containerRef` hits its floor, whichever is smaller — nothing else.
      disableResponsiveMaxWidth
      // Deliberately NOT unified with `containerRef`'s max — main stays
      // uncapped (grows to fill whatever's left via `flex-1`) per explicit
      // request; only the DOCKED panel is capped here, to stop it from
      // squeezing `containerRef` under its own floor (see
      // `maxDockedWidthForMainFloor`'s own doc comment just above). No
      // effect on the FLOAT variant (an undocked/dragged float panel
      // doesn't claim any of `containerRef`'s layout space to begin with).
      // Fullscreen bypasses `Draggable` entirely (see
      // `sharedPanelFullScreenOverlay`) and is already uncapped — it fills
      // whatever `containerRef` itself measures, with no width cap of its
      // own, so "uncapped when full screen" falls out for free here.
      maxWidth={panelVariant === "docked" ? Math.min(SHARED_PANEL_MAX_WIDTH, maxDockedWidthForMainFloor) : SHARED_PANEL_MAX_WIDTH}
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
            // Reverted back to `ContainerHeader`'s own generic default `X`
            // — see AgentNextGenPage.tsx's own matching call site for the
            // full doc comment; mirrored here verbatim.
          />
          {activePanelContent.headerContent && (
            // `activePanelKey === "search"` skips this wrapper ENTIRELY
            // (no padding, no border) for the Search panel's tabbed
            // headerContent, per explicit request — its `TabList` is meant
            // to sit flush against the panel's own edges (left/right/
            // bottom), not inset like every other panel's headerContent
            // (Screen Pop's Select, etc.), which still gets the padded,
            // bordered wrapper as before. `TabList` already draws its own
            // "tab separator" underline right under the tabs themselves
            // regardless (see `searchContent`'s own doc comment), so
            // there's still a real divider here even with the wrapper
            // gone.
            activePanelKey === "search" ? (
              activePanelContent.headerContent
            ) : (
              <div className="shrink-0 px-4 pb-3 border-b border-lyra-border-subtle">
                {activePanelContent.headerContent}
              </div>
            )
          )}
        </>
      )}
    >
      {/* Per explicit request ("when the user navigates between apps,
          please have them fade in when transitioning"): `key={activePanelKey}`
          forces a fresh mount on every app switch (Home/Search/Agent Chat/
          Schedule/etc.), which is what lets `animate-in fade-in-0` actually
          replay instead of only firing once ever — same "force a remount to
          replay animate-in" pattern this file's own desk-tab switch and
          active-interaction switch already use elsewhere in this file.
          Applied identically at every render site of `activePanelContent.
          body` (this docked/float `Draggable`, the fullscreen overlay, and
          the combined-mode panel below) so the fade is consistent
          regardless of which layout is currently active. */}
      <div key={activePanelKey} className="flex flex-col flex-1 min-h-0 animate-in fade-in-0 duration-200">
        {activePanelContent.body}
      </div>
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
        // Same revert-to-default-`X` as the docked variant's own
        // `ContainerHeader` above — see that call site's own doc comment.
      />
      {activePanelContent.headerContent && (
        // See the docked variant's own matching wrapper (above) for why
        // "search" skips this wrapper entirely.
        (activePanelKey === "search" ? (
          activePanelContent.headerContent
        ) : (
          <div className="shrink-0 px-4 pb-3 border-b border-lyra-border-subtle">
            {activePanelContent.headerContent}
          </div>
        ))
      )}
      {/* Per explicit request ("... fade in when transitioning" — see the
          docked variant's own matching wrapper above for the full doc
          comment): `key={activePanelKey}` forces a remount on every app
          switch so `animate-in fade-in-0` replays each time. */}
      <div key={activePanelKey} className="flex flex-col flex-1 min-h-0 animate-in fade-in-0 duration-200">
        {activePanelContent.body}
      </div>
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
            <AppNameMenu
              icon={<img src={appIcon} alt="Agent Workspace 2.0 Advanced" className="h-6 w-6" />}
              name="Agent Workspace 2.0 Advanced"
              compact={isCompactHeader}
              groups={appMenuGroups}
              menuFooter={<CXoneLogo />}
              open={appMenuOpen}
              onOpenChange={setAppMenuOpen}
            />
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

                Customers/Accounts/Tickets/WEM all share the exact same
                single-container panel every other button here does (see
                `handlePanelButtonClick`/`contentByPanelKey` above) — each
                just shows its own blank placeholder body, no bespoke
                content yet since none of the four has a real data source
                in this prototype. Search is the one exception — its body
                is the real `InteractionsListView` (moved in from the old
                "Interactions" desk tab) behind a Contacts/Messages/
                Customers/Threads `TabList` in `headerContent` (see
                `searchContent`'s own doc comment for the full story).
                WEM = Workforce Engagement Management — `UserCog` (a
                person + a settings/management gear) per explicit request
                for "an appropriate Workforce management Lucide icon",
                swapped in for the previous placeholder `Gauge`.

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
            <div ref={headerIconsMeasureRef} className="flex items-center gap-0">
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
                  className="h-11 w-11 rounded-lyra-sm border border-lyra-border-soft bg-lyra-bg-control text-lyra-fg-action hover:bg-lyra-state-hover active:bg-lyra-state-pressed data-[state=open]:bg-lyra-state-hover"
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
              connectAgentLegSignal={connectAgentLegSignal}
              initialAgentLegStatus={initialAgentLegStatus}
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
          // Home and Settings used to be one `buildNavItems(...)` array
          // passed straight through as `items`, rendered together as a
          // single rail. Per explicit request ("match the left nav in
          // premium and advanced to 2.0") this now mirrors 2.0's own
          // restructuring exactly — `homeNavItem` goes into `items` (below,
          // with `itemsFirst`), `settingsNavItem` into `footer` (further
          // down) — still built from the one shared `buildNavItems` helper
          // to avoid duplicating its icon/active-state/handler logic here.
          // See `AgentNextGenPage.tsx`'s own copy of this exact block for
          // the full history/reasoning; kept identical here on purpose.
          items={(() => {
            const [homeNavItem] = buildNavItems(
              Boolean(activeInteraction),
              // Per explicit follow-up request, Home no longer resets
              // `showAllContacts`/`selectedAllContactsRecord` — see that
              // state's own doc comment for why "Home" now always resumes
              // whatever was showing there before the agent navigated away
              // (plain dashboard or All Contacts), instead of forcing back
              // to the plain dashboard every time.
              () => { switchActiveInteraction(null); setShowSettings(false); },
              showSettings,
              // Same follow-up — opening Settings no longer discards All
              // Contacts' own state either; it just takes visual priority
              // while showing (this ternary branch is checked first), and
              // All Contacts reappears exactly as left once Settings closes.
              () => { setShowSettings(true); switchActiveInteraction(null); }
            );
            return [homeNavItem];
          })()}
          open={navOpen}
          onToggle={() => setNavOpen((v) => !v)}
          overlay={isNavNarrow}
          // `itemsFirst` — Home (now the sole entry in `items`) renders
          // ABOVE `header` (the "Assignments" caption + empty-state/cards),
          // `sticky top-0` within the shared scroll region, directly under
          // `pinnedHeader` ("New Outbound"). Settings goes to `footer`
          // instead (see below), genuinely pinned to the true bottom of
          // the rail rather than sharing this sticky-top spot with Home.
          itemsFirst
          // Lets `header` (the caption/cards region) grow to fill
          // whatever height Home+"New Outbound" don't use, so the
          // "Your assignment queue is empty" message can be vertically
          // centered in that leftover space instead of sitting flush
          // under the caption — see the centering wrapper around
          // `EmptyState` below, and `headerFillsHeight`'s own doc comment
          // in left-nav.tsx.
          headerFillsHeight
          // "Assignments (N)" caption — per explicit follow-up request
          // ("fix the assignments header under the home button so it
          // doesn't scroll"), mirrored from 2.0 (`AgentNextGenPage.tsx` —
          // see that file's own comment on this same prop for the fuller
          // writeup): rendered via `stickyCaption` now, the same sticky-top
          // box as `items` (Home), so it stays pinned with Home instead of
          // scrolling away with the cards under it.
          stickyCaption={
            <AssignmentsSectionCaption
              expanded={navOpen}
              count={interactions.length}
              sort={assignmentSort}
              onSortChange={setAssignmentSort}
              allExpanded={channelsAllExpanded}
              onToggleAllExpanded={handleToggleAllChannelsExpanded}
              // See `AssignmentsSectionCaption`'s own doc comment on
              // `compact` — see 2.0's own copy for the full reasoning.
              compact
            />
          }
          // Settings — genuinely pinned to the TRUE bottom of the nav (not
          // just `sticky bottom-0`, which only holds once the card list
          // actually overflows; short lists used to leave it sitting right
          // after the cards with empty space below). `footer` renders as a
          // sibling AFTER the whole scrollable region entirely — always at
          // the aside's real bottom edge regardless of how much content is
          // above it — so no flex/`mt-auto` trick is needed here. `NavRail`
          // (exported from left-nav.tsx) renders the single Settings
          // `NavItem` with the exact same TreeMenu/icon-only styling
          // `items` itself uses.
          footer={
            // `expanded={navOpen}` passed explicitly, NOT left to
            // `injectExpanded` — `left-nav.tsx`'s INLINE (non-overlay)
            // mode renders `footer` as `{footer}` directly, with no
            // `injectExpanded` call at all (only the OVERLAY-mode branch
            // auto-injects `expanded`), so `NavRail` would otherwise be
            // stuck on its `expanded = false` default — always the
            // icon-only collapsed button, even with the nav wide open.
            // Same reason `AssignmentsSectionCaption`/`EmptyState` below
            // (in `header`) already take `expanded={navOpen}` explicitly.
            <NavRail
              expanded={navOpen}
              items={(() => {
                const [, settingsNavItem] = buildNavItems(
                  Boolean(activeInteraction),
                  () => { switchActiveInteraction(null); setShowSettings(false); },
                  showSettings,
                  () => { setShowSettings(true); switchActiveInteraction(null); }
                );
                return [settingsNavItem];
              })()}
            />
          }
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
              {/* Per explicit request ("add a message and icon into the left
                  nav when there are no assignments indicating that the
                  agent's assignment queue is empty") — only while expanded;
                  the icon-only collapsed rail has no room for text (matches
                  `AssignmentsSectionCaption`'s own "nothing to show" null
                  return in that state, just above).

                  Wrapped in a `flex-1 min-h-0 items-center justify-center`
                  container to vertically center it — this only has real
                  slack to center within because `header` itself now grows
                  to fill the rail's available height (`headerFillsHeight`
                  on `LeftNav`, above); without that, this wrapper's
                  `flex-1` would have nothing to consume and the message
                  would still sit flush under the caption. `EmptyState`'s
                  own `h-full`/`py-8` (meant for a bounded box) is still
                  overridden with `h-auto`/`py-6` — the centering comes
                  from THIS wrapper now, not from `EmptyState` trying to
                  size itself.

                  `animate-in fade-in-0 duration-150 delay-200
                  fill-mode-backwards` — per explicit follow-up ("text
                  growing/shrinking ... have it fade in"), mirrored from
                  AgentNextGenPage.tsx (see that file's own comment on this
                  same block for the full writeup): without it, this message
                  mounts the instant `navOpen` flips true while the `<aside>`
                  is still mid-`transition-all duration-200` on its own
                  width, so it visibly rewraps as the box widens. `delay-200`
                  waits out that same 200ms before the message starts
                  becoming visible; `duration-150 fill-mode-backwards` is the
                  fade-in itself, held at opacity 0 for the whole delay
                  (approximating the requested `display: none` → `display:
                  inline`, since `display` can't be transitioned/faded).
                  Close needs no equivalent — this block unmounts instantly
                  when `navOpen` goes false, before the aside starts
                  collapsing, so nothing is ever visible to reflow. */}
              {interactions.length === 0 && navOpen && (
                <div className="flex flex-1 min-h-0 items-center justify-center animate-in fade-in-0 duration-150 delay-200 fill-mode-backwards">
                  <EmptyState
                    icon={<Inbox className="h-8 w-8" strokeWidth={1.5} />}
                    message="Your assignment queue is empty"
                    description="New assignments will appear here."
                    className="h-auto w-full py-6"
                    // Per explicit follow-up, with a screenshot comparing
                    // this to Contact History's own "Nothing to Display"
                    // placeholder: `EmptyState`'s default `tone`
                    // (`text-lyra-fg-disabled`) read too dim/low-contrast
                    // next to it. `tone="secondary"` matches that
                    // placeholder's own `text-lyra-fg-secondary` exactly.
                    tone="secondary"
                  />
                </div>
              )}
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
                const mostRecentId = interaction.threads[interaction.threads.length - 1]?.id;
                const currentId = interaction.currentThreadId ?? mostRecentId;
                // Seconds since the CUSTOMER last wrote on this channel —
                // only meaningful (and only ever read) for a channel that's
                // actually awaiting, which per `hasCustomerResponded` below
                // can't be true without `lastCustomerMessageTick` also being
                // set, so this never actually falls back to `startTick` in
                // practice — kept as `?? c.startTick` only to satisfy the
                // type (`lastCustomerMessageTick` is optional).
                const channelAwaitingWaitSeconds = (c: Thread) =>
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
                const hasCustomerResponded = (c: Thread) => c.lastCustomerMessageTick !== undefined;
                const channels: InteractionChannel[] = interaction.threads.map((c) => {
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
                  // it's sat since. Drives the READ-ONLY lockdown below
                  // (`removable`) — NOT the SLA timer directly (see
                  // `slaSuppressed` just below for that) — since "Resolved"
                  // needs to affect one without the other (next paragraph).
                  const isClosed = interaction.threadStatuses?.[c.id] === "Closed" || !!interaction.closed;
                  // Per explicit request/follow-up clarification: a brand-new
                  // AGENT-INITIATED OUTBOUND channel — this channel's OWN
                  // `c.startedFresh` (see `Thread.startedFresh`'s own doc
                  // comment for why per-Thread, not `interaction.startedFresh`),
                  // reused straight from the same signal `isFreshLaunch`/
                  // `copilotAvailable` already key off — hasn't earned
                  // Consult/Transfer, Outcome, or Unassign & Dismiss yet, so
                  // this card's kebab collapses to a plain close ("×") button
                  // just like a closed one (`removable` below).
                  // `!hasCustomerResponded(c)` matters too: the moment the
                  // customer actually replies, this is a real, live
                  // conversation like any other — same "still fresh vs.
                  // already has real activity" split `copilotAvailable`
                  // already draws — so the lockdown lifts automatically
                  // rather than persisting for the rest of the interaction's
                  // life just because it happened to start as an outbound
                  // dial. Never true for a customer-initiated thread
                  // (notification/table-row opens deliberately don't set
                  // `startedFresh` — see those call sites' own doc comments),
                  // matching the explicit "not outbound" clarification.
                  const isNewOutboundThread = !!c.startedFresh && !hasCustomerResponded(c);
                  // Per explicit request: a "Resolved" channel ALSO stops
                  // counting toward SLA/awaiting-response — same treatment
                  // `isClosed` above already gets — WITHOUT closing the
                  // thread: `isClosed` alone (not this) still drives
                  // `removable`/the composer/kebab lockdown below, so a
                  // Resolved channel stays a completely normal, repliable,
                  // dismissable channel; only its timer/dot goes quiet, per
                  // explicit follow-up ("don't close the thread"). A
                  // channel can't be both interaction-`closed` (read-only)
                  // and still accepting a status change to "Resolved" at
                  // the same time in practice, so this simple OR is safe —
                  // it's not trying to distinguish those two cases.
                  const slaSuppressed = isClosed || interaction.threadStatuses?.[c.id] === "Resolved";
                  const effectiveAwaitingResponse = !slaSuppressed && (c.awaitingResponse ?? false);
                  return {
                    id: c.id,
                    type: c.type,
                    // Per `hasCustomerResponded`'s own doc comment above: no
                    // reading at all until the customer has said something on
                    // this channel at least once — an agent-initiated channel
                    // still waiting on a first reply has nothing to count yet.
                    // Per explicit follow-up, also blank once `slaSuppressed`
                    // (closed OR Resolved) — there's nothing left to time on
                    // a channel that's already closed out or wrapped up, so
                    // the timer disappears there too rather than freezing
                    // on/continuing to show "how long since this channel
                    // opened". Once neither of those applies: awaiting: "how
                    // long since the CUSTOMER last wrote" — the metric that
                    // actually matters for a digital SLA. Not awaiting: "how
                    // long since this channel opened" — still the useful
                    // reading once there's nothing pending (but the channel
                    // isn't closed/resolved either). See
                    // `lastCustomerMessageTick`'s own doc comment for why
                    // these two diverge after more than one exchange.
                    elapsed:
                      !hasCustomerResponded(c) || slaSuppressed
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
                    // Same collapsed/close-only treatment for a brand-new
                    // outbound thread (`isNewOutboundThread`, above) — per
                    // explicit request, it hasn't earned a working kebab
                    // yet either.
                    removable: isClosed || isNewOutboundThread ? false : undefined,
                    // Per explicit follow-up request: the `removable={false}`
                    // fallback above reads as a red trash icon/"Delete Draft"
                    // for a genuine, never-launched draft thread specifically
                    // (`isNewOutboundThread`), NOT for an already-closed
                    // channel/interaction — those still get the plain
                    // neutral "×"/"Close" treatment (`ChannelRow`'s own
                    // `removeVariant` default). See `InteractionChannel.
                    // removeVariant`'s own doc comment, channel-row.tsx.
                    removeVariant: isNewOutboundThread ? "delete-draft" : "close",
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
                      // `Interaction.channelStatuses`'s own doc
                      // comment). Fallback here is `"Open"`, not
                      // `"Resolved"` — a channel with no status set yet is
                      // a genuinely untouched/fresh thread, not one that's
                      // already wrapped up (bug fix; this used to read
                      // `?? "Resolved"`, matching `buildDismissedContact-
                      // HistoryEntry`'s own fallback for this same field —
                      // that one intentionally still uses `"Resolved"`,
                      // since it only ever runs at dismiss time for an
                      // already-concluded historical entry, so the two no
                      // longer need to match).
                      resolutionOptions: TRANSCRIPT_SESSION_STATUS_OPTIONS,
                      resolution: interaction.threadStatuses?.[c.id] ?? "Open",
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
                // Closed OR Resolved channels drop out of every card-level
                // SLA/timer computation below — per explicit request, once a
                // channel is closed OR resolved it should stop counting
                // toward the card's own dot/color/timer entirely, not just
                // stop escalating (Resolved doesn't touch anything else —
                // the card stays a normal, open, dismissable card; see
                // `slaSuppressed`'s own doc comment above for the same split
                // at the per-channel level). A card whose only channel(s)
                // are all closed/resolved ends up with an empty
                // `cardOpenChannels`, which is exactly what makes
                // `earliestStart` (and so `elapsed`, at the render call site
                // below) `undefined` — the counter itself disappears rather
                // than falling back to "time since it was opened," same as
                // the dot disappearing once `awaitingSeverity` has nothing
                // left to compute from. (Despite the name, "open" here means
                // "still counts toward the SLA timer," not "not closed" —
                // this is a timer-only list, not the read-only-lockdown one.)
                const cardOpenChannels = interaction.threads.filter(
                  (c) =>
                    interaction.threadStatuses?.[c.id] !== "Closed" &&
                    interaction.threadStatuses?.[c.id] !== "Resolved"
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
                // itself uses. Only actually rendered by `InteractionNavCard`
                // itself once collapsed — see that component's own doc
                // comment (above `AgentNextGenPage`) for why this whole card
                // is built through it now, rather than this `.map()`
                // returning two structurally different shapes depending on
                // `navOpen` the way it originally did.
                const currentChannelType =
                  channels.find((c) => c.id === currentId)?.type ?? channels[channels.length - 1]?.type;
                return (
                  <InteractionNavCard
                    key={interaction.id}
                    currentChannelType={currentChannelType}
                    showChannelBadge={channels.length <= 1}
                    // Same `cardAwaitingWaitSeconds`/`getAwaitingSeverity`
                    // this card's own `awaitingSeverity` prop below already
                    // resolves — reused, not recomputed, so a single-channel
                    // card's collapsed badge escalates in lockstep with
                    // everything else reading this card's severity (the
                    // avatar/border, the elapsed timer, the corner dot).
                    badgeSeverity={cardAwaitingWaitSeconds !== undefined ? getAwaitingSeverity(cardAwaitingWaitSeconds) : undefined}
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
                    // Mirrors this card's own expanded state up into
                    // `channelsExpandedById` — see that state's own doc
                    // comment for why (catching up
                    // `AssignmentsExpandCollapseAllButton`'s own label once
                    // every card happens to agree by hand).
                    onChannelsExpandedChange={(expanded) =>
                      setChannelsExpandedById((prev) =>
                        prev[interaction.id] === expanded ? prev : { ...prev, [interaction.id]: expanded }
                      )
                    }
                    // Kept in sync with the ChannelToggle bar in this
                    // interaction's record-header PageHeader — see
                    // Interaction.currentChannelId's own doc comment.
                    currentChannelKey={currentId}
                    onCurrentChannelChange={(key) => handleChannelSelect(interaction.id, key)}
                  />
                );
              })}
            </>
          }
        />

        {/* Content area — flex-1 shrinks to give space to docked panels,
            down to `INTERACTION_MAIN_CONTENT_MIN_WIDTH` (350px) — below
            that, the docked shared panel's own render width clamps down
            instead (see `dockedPanelRenderWidth`'s own doc comment,
            further down) so THIS floor never has to fight it for space and
            push the whole row past the viewport. ref used to position
            float panels. */}
        <div ref={containerRef} className="relative flex flex-1 min-w-[374px] overflow-hidden pr-3 pb-3">

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
              <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

                {/* Below 768px with a docked panel open: a second region
                    (`activePanelContent.title`, e.g. "Notifications") sits
                    alongside this main region, and this whole container
                    becomes the shared surface both toggle inside of instead
                    of the panel docking beside it. Per explicit follow-up
                    request ("use toggle buttons instead of tabs for the
                    combined panels"): switched from the `TabList`/`Tab`
                    composition (still used everywhere else in this file,
                    e.g. the Dashboard's own tab row below) to `ToggleGroup`
                    — a two-item single-select segmented control reads more
                    like "which surface is showing" (a view switch) than
                    "which sub-page am I on" (what tabs usually mean), and
                    it visually sets this switch apart from the record
                    header's OWN channel `TabList` that can render directly
                    underneath it once `narrowActiveRegion === "main"`
                    lands on an active interaction — two adjacent real tab
                    rows would have read as one continuous 3+-tab strip. */}
                {isCombinedPanelMode && (
                  <div className="bg-lyra-bg-surface-base p-2 shrink-0 border-b border-lyra-border-subtle">
                    <ToggleGroup
                      fullWidth
                      items={[
                        { value: "main", label: mainRegionTabLabel },
                        { value: "panel", label: activePanelContent?.title ?? "" },
                      ]}
                      value={narrowActiveRegion}
                      // `ToggleGroup`'s single-select mode deselects on
                      // re-click of the already-active item (empty string)
                      // — this switch should always have exactly one side
                      // active, so an empty next value is ignored rather
                      // than passed through (same guard lyra-ui schedule-panel's
                      // own Day/Week `ToggleGroup` already uses).
                      onValueChange={(next) => {
                        if (next === "main" || next === "panel") setNarrowActiveRegion(next);
                      }}
                    />
                  </div>
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
              ) : showAllContacts && !activeInteraction ? (
                // ── All Contacts — standalone, detached view. Per explicit
                // follow-up request ("detach the contacts table from the
                // search panel and have it exist on its own"), this is a
                // 4th mutually-exclusive top-level view (see
                // `showAllContacts` state's own doc comment), independent
                // of the shared Search panel/`Draggable`/`activePanelKey`
                // machinery §134 originally used. `InteractionsListView` is
                // `&& !activeInteraction` — per a further follow-up ("keep
                // home page (all contacts) at the last state before
                // navigating away"), `showAllContacts` is no longer cleared
                // when an interaction starts, so this guard is what actually
                // lets the active-interaction branch above take priority
                // instead of this one (see `showAllContacts`'s own doc
                // comment for the full rationale).
                // mounted directly with NO wrapping scroll/padding div — it
                // manages its own internal scrolling and fills its parent
                // (confirmed via its own root className), same as how it's
                // already mounted inside the Search panel's Contacts tab.
                // The breadcrumb reads "Dashboard / All Contacts"; clicking
                // "Dashboard" returns to the Home dashboard view.
                <div key="all-contacts" className="flex flex-1 flex-col min-w-0 overflow-hidden animate-in fade-in-0 duration-200">
                  {showPageHeader && (
                    <PageHeader
                      title="All Contacts"
                      breadcrumb={{
                        label: "Dashboard",
                        onClick: () => {
                          setShowAllContacts(false);
                          setSelectedAllContactsRecord(null);
                        },
                      }}
                    />
                  )}
                  {/* Per explicit follow-up request ("below the dashboard /
                      all contacts page header at tabs for Contacts
                      (Active), Messages and Threads") — see
                      `allContactsTab`'s own doc comment above for why only
                      "Contacts" has real content so far. */}
                  <TabList className="px-4" overflowMenu>
                    {ALL_CONTACTS_TABS.map((label) => (
                      <Tab
                        key={label}
                        active={allContactsTab === label}
                        onClick={() => setAllContactsTab(label)}
                      >
                        {label}
                      </Tab>
                    ))}
                  </TabList>
                  {allContactsTab !== "Contacts" ? (
                    // Placeholder — see `allContactsTab`'s own doc comment.
                    <div className="flex-1 overflow-y-auto" />
                  ) : (
                  /* Body row: table + this view's OWN right-docked
                      `InteriorPanel` — a second, independent instance from
                      the dashboard's own (further below), since this whole
                      view is now a standalone container with nothing else
                      to share that docked slot with. Per explicit follow-up
                      request ("when one of the rows is clicked, open an
                      interior panel like the ones in My Contact History"),
                      a row click here no longer jumps straight into a live
                      assignment (`handleOpenInteractionRow`, still what
                      this panel's own footer button calls) — it opens this
                      summary first, same "Duration"/notes box + synthesized
                      Conversation section `ContactHistoryEntryDetail`
                      already renders for a My Contact History row (see
                      `selectedContactHistoryEntry`'s own doc comment further
                      up, and `buildContactHistoryEntryFromInteractionRecord`,
                      agent-next-gen-interactions-table.tsx, for how a table
                      row is adapted into that same shape). */
                  <div className="relative flex flex-1 min-h-0 overflow-hidden">
                    <InteractionsListView
                      onAddToast={addToast}
                      // Per explicit follow-up request ("when the contact
                      // row is selected show it as active and allow it to
                      // close the panel on toggle") — clicking the row
                      // that's ALREADY selected now closes the panel
                      // instead of just reopening the same one; clicking
                      // any other row still swaps to it as before.
                      // `activeRecordId` (below) is what makes that row
                      // render as active in the table itself — see its own
                      // doc comment (agent-next-gen-interactions-table.tsx).
                      onOpenInteraction={(record) =>
                        setSelectedAllContactsRecord((prev) => (prev?.id === record.id ? null : record))
                      }
                      activeRecordId={selectedAllContactsRecord?.id ?? null}
                    />
                    {showInteriorPanel && (
                      <InteriorPanel
                        side="right"
                        open={Boolean(selectedAllContactsRecord)}
                        headerTitle={selectedAllContactsRecord?.customerName}
                        headerSubhead={selectedAllContactsRecord?.skill}
                        onClose={() => setSelectedAllContactsRecord(null)}
                        // `PanelRightClose` — matches the "closing a docked
                        // right-side panel" glyph used elsewhere (see
                        // `agent-next-gen-customer-info-panel.tsx`'s own
                        // `InteriorPanel` closeIcon) — instead of
                        // `ContainerHeader`'s generic default `X`.
                        closeIcon={<PanelRightClose className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />}
                        // Same mutually-exclusive Redial/Re-open convention
                        // `selectedContactHistoryEntry`'s own footer already
                        // uses (voice-only gets "Redial") — both just call
                        // `handleOpenInteractionRow`, the one handler this
                        // table's rows have always used to actually open a
                        // live assignment, then close this summary panel.
                        footer={
                          selectedAllContactsRecord ? (
                            selectedAllContactsRecord.type === "voice" ? (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  handleOpenInteractionRow(selectedAllContactsRecord);
                                  setSelectedAllContactsRecord(null);
                                }}
                              >
                                <PhoneOutgoing className="h-3.5 w-3.5" strokeWidth={1.5} />
                                Redial
                              </Button>
                            ) : (
                              <Button
                                onClick={() => {
                                  handleOpenInteractionRow(selectedAllContactsRecord);
                                  setSelectedAllContactsRecord(null);
                                }}
                              >
                                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                                Takeover Assignment
                              </Button>
                            )
                          ) : undefined
                        }
                      >
                        {selectedAllContactsRecord && (
                          <ContactHistoryEntryDetail
                            entry={buildContactHistoryEntryFromInteractionRecord(selectedAllContactsRecord)}
                          />
                        )}
                      </InteriorPanel>
                    )}
                  </div>
                  )}
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
                    <>
                    {/* ── Record header ──
                        `PageHeader` is back (per explicit follow-up
                        request — it had been removed entirely in favor of
                        just this row's own tab bar; see this file's git
                        history for that earlier removal's own reasoning),
                        now as its own row ABOVE the channel tabs instead of
                        the tabs being this whole area's only content.
                        Title/subtitle show the customer's name/id
                        (`recordId`) directly again — no longer only
                        reachable via the Customer Information panel's own
                        header — with an "Active"/"Closed" status badge
                        alongside, mirroring `activeInteraction.closed`.

                        `actions` holds the header-level buttons, per
                        explicit request: at full width, one small outline
                        icon button PER channel this contact can still add
                        (Call/Email/SMS/…, via `getAvailableChannels` below)
                        instead of a single combined "Add Channel" trigger —
                        each one is still the exact same `OutboundAddButton`
                        every other "+" in this app uses (`getHeaderAction`,
                        create-new.tsx), just locked to one channel via its
                        new `initialChannel` option (skips straight to the
                        phone/skill picker, no redundant "Select Channel"
                        step) and wearing that channel's own icon via
                        `icon` instead of the default "+". Below the
                        `recordHeaderWidth < 768` breakpoint, this whole row
                        collapses down to the single combined "+" trigger
                        instead (the original, unrestricted `getHeaderAction`
                        call — every channel back in one "Select Channel"
                        picker) — there isn't room for one button per
                        channel once the header itself gets this tight.
                        Customer Information is deliberately LAST in
                        `actions` — a plain flex row, so whichever child
                        renders last just naturally lands at the far right
                        of it, no extra positioning prop needed.

                        Customer Information collapses to icon-only at the
                        SAME `recordHeaderWidth < 768` breakpoint (per
                        explicit follow-up request) — drops its "Customer
                        Information" label down to a bare id-card glyph
                        exactly when the channel buttons above collapse to
                        their own single icon trigger, so the whole row
                        changes shape together instead of one side
                        collapsing before the other.
                        `ref={recordHeaderRef}` — a dedicated measurement of
                        THIS header's own width (see that ref's own doc
                        comment for why `sidePanelContainerWidth` stopped
                        being a safe stand-in for it once this button
                        started rendering unconditionally, not just while
                        the docked panel is closed). */}
                    <PageHeader
                      ref={recordHeaderRef}
                      // Per explicit follow-up request: this record header
                      // sits directly above the session row
                      // (`TranscriptSessionSeparator`/the channel tab row),
                      // which already draws its own `border-b` right
                      // underneath — this header's own default border just
                      // doubled that into two parallel lines with an odd
                      // gap between them. `compact` shrinks the row from
                      // the default `min-h-[68px]`/`py-4` down to
                      // `min-h-[54px]` with the bottom padding dropped, so
                      // the whole thing reads as one tightly-packed header
                      // instead of two stacked bordered rows (see both
                      // props' own doc comments, page-header.tsx).
                      bordered={false}
                      compact
                      // Per explicit request ("add an icon indicating
                      // whether the interaction is an agent or a customer
                      // to the left of the name"): `Headphones` for
                      // `activeInteractionIsAgentCall` (defined above —
                      // the same "is this interaction's own `id` one of
                      // `OUTBOUND_AGENTS`'s ids" check that already gates
                      // Customer Information/the status chip for agent-
                      // to-agent calls), `User` otherwise. Matches the
                      // exact glyphs the New Outbound "Choose group"
                      // Select already shows for these two categories
                      // (`agentCategoryIcon`/`customerCategoryIcon`,
                      // agent-next-gen-outbound-data.tsx) so the same icon
                      // means the same thing in both places.
                      //
                      // Per explicit follow-up request ("use the avatar
                      // variant in a circle and remove the divider"):
                      // wrapped in `Icon` (icon.tsx) with `shape="circle"`
                      // — a colored circle avatar shell rather than a bare
                      // glyph, matching lyra-ui's own `PageHeader` "Record
                      // Header (Circle Avatar, No Divider)" story
                      // (PageHeader.stories.tsx). Once the icon is a
                      // self-contained circle like this, the divider
                      // `icon` renders by default between itself and the
                      // title just doubles up on separation the circle's
                      // own background already provides — dropped via
                      // `iconDivider={false}` (see that prop's own doc
                      // comment, page-header.tsx).
                      //
                      // `background` is driven by `activeInteractionIsAgentCall`
                      // per a further explicit follow-up ("use a different
                      // accent color for customer vs. agent avatar") —
                      // "active" (blue) for an agent call, "shell" (neutral
                      // gray) for a real customer. Not new colors: these are
                      // the EXACT SAME `Icon` `background` values —
                      // `agentCategoryLeadingIcon`/`customerCategoryLeadingIcon`
                      // (agent-next-gen-outbound-data.tsx) already build by
                      // hand for the New Outbound picker's own "Agents"/
                      // "Customers" category rows (`bg-lyra-bg-active-subtle`/
                      // `text-lyra-fg-active-strong` and `bg-lyra-bg-surface-
                      // shell`/`text-lyra-fg-secondary` respectively — see
                      // that file's own doc comment on the category color
                      // pairing) — so the record header now reads as the
                      // same category-to-color mapping the picker already
                      // established, not a one-off purple used for both.
                      icon={
                        <Icon
                          icon={activeInteractionIsAgentCall ? Headphones : User}
                          background={activeInteractionIsAgentCall ? "active" : "shell"}
                          shape="circle"
                          size="md"
                        />
                      }
                      iconDivider={false}
                      title={activeInteraction.customerName ?? "Customer"}
                      // Per explicit follow-up request (mockup's own 4
                      // states — even State 2/4, with the full tab row
                      // showing, still read the ACTIVE tab's own "{icon}
                      // {Channel label} | {Draft/date}" subtitle, e.g.
                      // "Email | Draft" — not the plain customer-ID text):
                      // this is now UNCONDITIONAL, every customer
                      // interaction, regardless of `showChannelTabRow`/
                      // channel count. Previously gated on
                      // `!showChannelTabRow` (back when that const meant
                      // "unknown contact," not "channel count") — now that
                      // it's channel-count-based, gating this on it too
                      // would have made the subtitle flip back to the
                      // plain customer ID the moment a second channel
                      // opened, which the mockup explicitly does NOT want.
                      // Same "{icon} {Channel label} | {date/time or
                      // Draft}" format Agent Workspace 2.0 always shows
                      // (AgentNextGenPage.tsx — see `CHANNEL_TYPE_META`/
                      // `resolveActiveChannelDateTimeLabel`'s own doc
                      // comments above for where each half comes from).
                      // `undefined` (not a bare channel label with nothing
                      // after it) whenever either half is missing —
                      // `PageHeader`'s own `{subtitle && ...}` guard
                      // (page-header.tsx) then skips the subtitle row
                      // entirely, same fallback 2.0 uses. Falls back to the
                      // plain customer ID only when there's genuinely no
                      // active channel to describe (shouldn't normally
                      // happen while `activeInteraction` is set, but keeps
                      // this defensive rather than rendering nothing).
                      //
                      // Per a later explicit follow-up request: once 2+
                      // channels are open (`showChannelTabRow`), the single
                      // active tab's own "{icon} {label} | {date}" line
                      // above stops answering the question that actually
                      // matters with several channels live at once — this
                      // branch takes over instead, reading "{N} channels
                      // open | Last Customer Response: {date/time}" (count =
                      // `activeInteraction.threads.length`, matching
                      // `showChannelTabRow`'s own threshold/definition; see
                      // `resolveInteractionLastCustomerResponseLabel`'s own
                      // doc comment for how that timestamp is resolved
                      // across every thread, not just the active one). If
                      // NO thread has a qualifying response yet, the
                      // trailing clause is simply omitted rather than
                      // printing a broken "Last Customer Response:" with
                      // nothing after it.
                      subtitle={
                        // See `SHOW_RECORD_HEADER_SUBTITLE`'s own doc
                        // comment above — hidden per explicit request, the
                        // rest of this ternary untouched underneath.
                        !SHOW_RECORD_HEADER_SUBTITLE ? undefined :
                        showChannelTabRow && activeInteraction.threads.length >= 2 ? (
                          <span className="truncate">
                            {activeInteraction.threads.length} channels open
                            {lastCustomerResponseLabel ? ` | Last Customer Response: ${lastCustomerResponseLabel}` : ""}
                          </span>
                        ) : activeChannelType && activeChannelDateTime ? (
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="shrink-0 text-lyra-fg-secondary" aria-hidden="true">
                              {CHANNEL_TYPE_META[activeChannelType].icon}
                            </span>
                            <span className="truncate">
                              {CHANNEL_TYPE_META[activeChannelType].label} | {activeChannelDateTime}
                            </span>
                          </span>
                        ) : (
                          activeInteraction.customerId
                        )
                      }
                      // "Online" (was "Active" — renamed per explicit
                      // request, same underlying signal) specifically (not
                      // "Closed", which is a definite, real state regardless
                      // of channel) is only shown for chat — per explicit
                      // request, every other channel type has no way to
                      // actually tell whether the customer is still there
                      // (a call could've been dropped, an SMS/WhatsApp/
                      // email thread has no presence signal at all), so
                      // labeling those "Online" overclaims a certainty this
                      // app doesn't have.
                      // Follow-up request ("leave the active badge visible
                      // if the agent switches between chat/other channels"):
                      // this reads `hasOpenChatThread` (does the interaction
                      // have a chat thread open ANYWHERE) rather than
                      // `activeChannelType === "chat"` (is chat the
                      // currently-selected tab), so switching to another
                      // open channel's tab no longer hides the badge.
                      // `badge={undefined}` renders nothing at all (see
                      // `PageHeader`'s own `{badge && <Badge>...}` guard,
                      // page-header.tsx) rather than an empty pill.
                      badge={activeInteraction.closed ? "Closed" : hasOpenChatThread ? "Online" : undefined}
                      badgeColor={activeInteraction.closed ? "slate" : "green"}
                      actions={
                        <>
                          {/* Per explicit follow-up request ("let's update
                              the channel controls to always be in the
                              session row - even if there is only one
                              channel open (no tabs) - moving them around is
                              confusing"): the record-header icon-button
                              cluster that used to render here whenever
                              `!showChannelTabRow` (Consult/Transfer,
                              Outcome, kebab, status chip) is gone — this
                              cluster now lives permanently in the session
                              row instead (`InteractionTranscript`'s
                              `showSessionActionCluster`, further down),
                              regardless of channel count. */}
                          {/* Per explicit follow-up request: the per-channel
                              Add Channel icon row (and the custom ad-hoc "+"
                              popup, `AddChannelAdHocButton`) that used to sit
                              next to the customer's name are gone — back to
                              a single combined "+" trigger (lyra-ui's own
                              stock `OutboundAddButton` flow: Select Channel
                              radios, Select Phone/Outbound Skill, Start
                              Interaction — no `initialChannel` lock), the
                              same call this used for its old narrow-width
                              (<768px) `titleSuffix` fallback, now used
                              unconditionally and moved here into `actions`,
                              immediately left of Customer Information —
                              always rendered regardless of
                              `showChannelTabRow`/channel count, unlike the
                              cluster above it.
                              Per explicit follow-up request ("add the '+' to
                              the unknown interactions in premium and
                              advanced"): `getHeaderAction` returns `null` —
                              no button at all — for any interaction id it
                              can't resolve to a contact in `contactsById`
                              (the combined `outboundConfig.groups` +
                              `contact-history` group built above), which is
                              exactly the state a genuinely ad-hoc/unknown
                              interaction is in (no real `CREATE_NEW_
                              CUSTOMERS` record, and never routed through
                              `handleRedial`/`handleReopenContactHistoryEntry`'s
                              own synthetic-id registration). `?? (...)`
                              falls back to `AddChannelAdHocButton` — the
                              exact same directory-independent "Enter Email
                              Or Phone Number" popup Agent Workspace 2.0 uses
                              for every single one of ITS interactions (see
                              that button's own doc comment) — feeding
                              `handleAddAdHocChannel` (above) instead. Known
                              customers still get the richer stock picker
                              exactly as before; only genuinely unknown ones
                              fall through to the simpler ad-hoc field. */}
                          {SHOW_ADD_CHANNEL_HEADER_BUTTON && (getHeaderAction(
                            activeInteraction.id,
                            "h-8 w-8 px-0 bg-lyra-bg-primary text-lyra-fg-on-primary hover:bg-lyra-state-hover-primary active:bg-lyra-state-pressed-primary",
                            { label: "Add Channel", showLabel: false }
                          ) ?? (
                            <AddChannelAdHocButton
                              onLaunch={handleAddAdHocChannel}
                              className="h-8 w-8 px-0 bg-lyra-bg-primary text-lyra-fg-on-primary hover:bg-lyra-state-hover-primary active:bg-lyra-state-pressed-primary"
                            />
                          ))}
                          {/* Same hover-preview `Popover` + toggle `Button`
                              this row used to have before the tab row (see
                              git history). Per explicit follow-up request,
                              hidden entirely again while the panel is
                              DOCKED and open (`effectiveSidePanelPinned &&
                              sidePanelOpen`) — with the real panel visibly
                              open right there beside it, a redundant toggle
                              sitting in the header just added clutter. Kept
                              on screen, though, while the panel is open but
                              only as a FLOATING overlay (unpinned — see
                              `effectiveSidePanelPinned`'s own doc comment):
                              an overlay doesn't push the layout over the way
                              the docked panel does, so there's no adjacent
                              "Customer Information" surface already visibly
                              open to make this button feel redundant next
                              to. `animate-in fade-in-0 duration-200` (below,
                              on the `Button` itself) — same reveal treatment
                              every other conditionally-mounted piece of this
                              page already gets (the interaction/dashboard/
                              settings content columns, the docked panel
                              itself — see those call sites) — replaces the
                              instant pop-in a plain conditional render would
                              otherwise produce the moment the panel closes.
                              `openCustomerInfoPreview`'s own guard already
                              refuses to open this preview while
                              `sidePanelOpen` is true (see that function's
                              own doc comment), and `handleSidePanelIconToggle`
                              already TOGGLES `sidePanelOpen` rather than
                              only ever opening it — so this same click
                              handler correctly closes the panel too
                              whenever this button is on screen (floating +
                              open) rather than only ever opening it. */}
                          {/* Per explicit request: an agent-to-agent call
                              has no real customer record behind it —
                              `activeInteractionIsAgentCall` (above) hides
                              this toggle/hover-preview outright, same as it
                              hides the docked panel itself further down,
                              rather than falling back to the Detail-only
                              tab set an "unknown contact" interaction still
                              gets. */}
                          {!activeInteractionIsAgentCall && !(effectiveSidePanelPinned && sidePanelOpen) && (
                          <Popover
                            open={customerInfoPreviewOpen && !sidePanelOpen}
                            onOpenChange={setCustomerInfoPreviewOpen}
                            placement="bottom"
                            align="end"
                            showArrow={false}
                            bodyPadding={false}
                            className="border-0 bg-transparent p-0 shadow-none"
                            onOpenAutoFocus={(e) => e.preventDefault()}
                            onCloseAutoFocus={(e) => e.preventDefault()}
                            // `CustomerInfoHoverPreview` below renders its
                            // own `TabList overflowMenu` ("8 More"), whose
                            // dropdown portals straight to `document.body`
                            // — outside this Popover's own content subtree
                            // — same as every Radix Popper-based primitive.
                            // Radix's own outside-interaction detection has
                            // no way to know that dropdown "belongs" to
                            // this popover, so clicking one of its overflow
                            // tabs registered as an interaction outside
                            // *this* popover's content and closed the whole
                            // preview out from under it — confirmed live.
                            // Same fix as `InteractionNavItem`'s own nested
                            // kebab-menu guard (interaction-nav-item.tsx):
                            // tabs.tsx's overflow portal is now marked with
                            // the same `data-radix-popper-content-wrapper`
                            // attribute every genuine Radix Popper Content
                            // gets, so this one `closest()` check catches
                            // both real Radix overlays and this hand-rolled
                            // one.
                            onInteractOutside={(e) => {
                              if ((e.target as Element)?.closest?.("[data-radix-popper-content-wrapper]")) {
                                e.preventDefault();
                              }
                            }}
                            content={
                              <CustomerInfoHoverPreview
                                customerName={activeInteraction.customerName}
                                recordId={activeInteraction.customerId}
                                channels={activeInteraction.threads}
                                startedFresh={activeInteraction.startedFresh}
                                // Per explicit request: this hover preview
                                // must show the SAME information the
                                // docked open panel does — was hardcoded
                                // to the full `AGENT_WORKSPACE_CUSTOMER_-
                                // PANEL_TABS` regardless of customer
                                // identity, unlike the docked panel's own
                                // `tabs` (below), which already restricts
                                // to Detail-only for an unknown-contact
                                // interaction. Now mirrors that exact same
                                // condition.
                                tabs={activeInteractionIsRealCustomer ? AGENT_WORKSPACE_CUSTOMER_PANEL_TABS : (["Detail"] as const)}
                                onMouseEnter={openCustomerInfoPreview}
                                onMouseLeave={scheduleCloseCustomerInfoPreview}
                                onAddToast={addToast}
                                recordDraft={activeCustomerRecordDraft}
                                overviewEditing={activeCustomerOverviewEditing}
                                onOverviewEditingChange={setActiveCustomerOverviewEditing}
                                onStartInteraction={(contact, channel, phone, skillId) =>
                                  handleStartCall({ contact, channel, phone, skillId })
                                }
                                // Same `matchState` object passed to the
                                // docked panel below (see that call site's
                                // own doc comment) — per explicit request,
                                // this hover preview must show the exact
                                // same customer-matching UI for an
                                // unknown-contact interaction, not the old
                                // generic Overview tabs.
                                matchState={
                                  activeInteractionIsRealCustomer
                                    ? undefined
                                    : {
                                        step: customerMatchStep,
                                        query: customerMatchQuery,
                                        onQueryChange: setCustomerMatchQuery,
                                        possibleMatches: possibleCustomerMatches,
                                        searchResults: customerSearchResults,
                                        onLinkRecord: handleLinkCustomerRecord,
                                        onStartCreate: handleStartCreateCustomer,
                                        onBackToSearch: handleBackToCustomerSearch,
                                        onSaveNewCustomer: handleSaveNewCustomer,
                                      }
                                }
                              />
                            }
                          >
                            <Button
                              variant="outline"
                              size="md"
                              // Collapses to icon-only below 768px — now
                              // measured off the header itself
                              // (`recordHeaderRef`/`recordHeaderWidth`, see
                              // that ref's own doc comment), not
                              // `sidePanelContainerWidth` (stopped being an
                              // accurate stand-in once this button started
                              // rendering unconditionally, docked panel
                              // open or closed).
                              //
                              // `PANEL_BUTTON_SELECTED_CLASS` while
                              // `sidePanelOpen` — same "active" treatment
                              // (`bg-lyra-bg-active-moderate` +
                              // `text-lyra-fg-active-strong`) `PanelPinButton`/
                              // `LeftNav`/`Tabs`/the AppHeader panel buttons
                              // already use elsewhere (see that constant's
                              // own doc comment), not a plain hover tint —
                              // per explicit request, this button now shows
                              // it's the one that opened the docked panel,
                              // the same way those already do for theirs.
                              // Last in `cn()` so it overrides the plain
                              // `outline` variant's own resting background/
                              // text color while open. `animate-in fade-in-0
                              // duration-200` — see this block's own doc
                              // comment above for why.
                              className={cn(
                                "shrink-0 animate-in fade-in-0 duration-200",
                                recordHeaderWidth < 768 && "w-8 gap-0 px-0",
                                sidePanelOpen && PANEL_BUTTON_SELECTED_CLASS
                              )}
                              aria-pressed={sidePanelOpen}
                              onClick={handleSidePanelIconToggle}
                              onMouseEnter={openCustomerInfoPreview}
                              onMouseLeave={scheduleCloseCustomerInfoPreview}
                              onFocus={openCustomerInfoPreview}
                              onBlur={scheduleCloseCustomerInfoPreview}
                              // Dynamic since this button is an open/close
                              // TOGGLE whenever it's actually on screen
                              // (floating + open, or closed) rather than
                              // only ever an "open" trigger —
                              // `sidePanelToggleLabel` (a static override
                              // prop, defaults to "Customer Information")
                              // only ever covers the "open" half of that on
                              // its own.
                              aria-label={
                                sidePanelOpen
                                  ? "Close Customer Information"
                                  : sidePanelToggleLabel ?? "Open Customer Information"
                              }
                            >
                              {/* `IdCard` — per explicit request, was the
                                  plain `User` silhouette; a badge/id-card
                                  glyph reads more specifically as "customer
                                  record" than a generic person icon does. */}
                              <IdCard className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                              {recordHeaderWidth >= 768 && <span>Customer Information</span>}
                            </Button>
                          </Popover>
                          )}
                        </>
                      }
                    />
                    {/* This row's own collapse threshold is driven by
                        `sidePanelContainerWidth` (declared above, alongside
                        `containerRef`) rather than a dedicated measurement of
                        this row — see that state's own doc comment for why
                        it's already an accurate stand-in whenever this row is
                        actually on screen.
                        `min-w-0` — without it, this row's own children (the
                        TabList's un-wrapped tab labels especially) can force
                        its ACTUAL rendered box wider than the real available
                        space (a flex item's default `min-width: auto`
                        "automatic minimum size" floor), so `getBoundingClientRect()`
                        just reports that inflated size back — a real layout
                        bug independent of how the width is measured, so this
                        is needed here regardless of the `@container`-vs-
                        `ResizeObserver` approach. */}
                    {/* Per explicit request: hidden entirely for a brand-new
                        outbound assignment NOT associated with a real customer
                        record (`!showChannelTabRow` — see that const's own doc
                        comment above) — the record header's own icon-button
                        cluster (rendered above, in `actions`) takes over its
                        six actions instead, same substitution Agent Workspace
                        2.0 always makes. An interaction WITH a real customer
                        record keeps this row exactly as before. */}
                    {/* Per explicit follow-up request ("if only one channel
                        is open do not display tabs - only show tabs when
                        more than one channel is open") — reverses §40's own
                        change (`showChannelTabRow` widened to `!!activeInteraction`
                        so a single-channel interaction still showed its own
                        one-tab row). That widening is now narrowed back down
                        just at this render site, ANDing in the same
                        `activeInteraction.threads.length >= 2` check the
                        record-header subtitle ternary already uses on its
                        own (below) — `showChannelTabRow` itself is left
                        untouched since nothing else reading it needs to
                        change (see that const's own doc comment). */}
                    {showChannelTabRow && activeInteraction.threads.length >= 2 && (
                    <div className="flex min-w-0 border-b border-lyra-border-subtle bg-lyra-bg-surface-base px-3">
                      {/* Now just the channel `TabList` on its own — the
                          Customer Information toggle icon/divider that used
                          to sit before it (and the "+" Add Channel button
                          that used to sit after it) both moved up into the
                          new `PageHeader` above, per explicit request. Kept
                          as a `flex min-w-0` wrapper (not a plain block) so
                          `TabList`'s own `self-stretch` below still has a
                          flex context to size against.
                          `border-b-0` — cancels TabList's own default
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
                      {/* `growToFillRow` — even as this row's only child now
                          (the icon button/divider/"+" button that used to
                          flank it moved up into `PageHeader`, above), a bare
                          `TabList` still sizes to its own near-content-less
                          width by default rather than claiming the row's
                          full available space, which reads as narrow enough
                          to collapse the `overflowMenu` breakpoint early
                          even with plenty of real room available — see that
                          prop's own doc comment in tabs.tsx. `className`'s
                          own `flex-1 min-w-0` still lands on the inner tab
                          row itself (unrelated, unaffected by this prop). */}
                      {/* `overflowBreakpoint="compact"` — per explicit
                          follow-up report: the default "wide" mode
                          collapses via a fixed CSS `@container (max-width:
                          400px)` query on this `TabList`'s own wrapper
                          (tabs.tsx), a pixel threshold with no relationship
                          to whatever ELSE is sharing this row (the Customer
                          Information toggle button, its own separate
                          `recordHeaderWidth < 768` icon-only breakpoint,
                          now up in `PageHeader` above this row rather than
                          sharing it directly) — once that button's own
                          threshold meant this row could never actually get
                          much narrower than ~768px, the tabs' still-fixed
                          400px trigger point produced scroll/chevron
                          behavior that read as arbitrary, disconnected from
                          anything actually changing on screen. "compact"
                          mode (tabs.tsx) collapses off a real measurement
                          instead — a hidden clone's true unconstrained
                          content width vs. this wrapper's actual rendered
                          width (`compactMeasureRef`/`compactWrapRef`) — so
                          it only ever reacts to the tabs themselves
                          genuinely running out of room, at whatever width
                          that happens to be, rather than a second,
                          unrelated fixed number. Also never scrolls at all
                          (stretches ≤2 tabs, `compactStretch`; collapses to
                          "active tab + N More" at 3+, `collapsedRowEl`) —
                          in keeping with this row's tabs already dropping
                          the chevron/scroll treatment entirely for the
                          common 1-tab case (`hasScrollableOverflow`,
                          tabs.tsx). */}
                      {/* `tabPaddingX="3"` — per explicit follow-up request
                          ("update the tab padding... so the tabs left align
                          better"): `TabList` normally forces `px-5` onto
                          every tab regardless of `Tab`'s own smaller `px-3`
                          base (tabs.tsx) — scoped to THIS `TabList` only via
                          the prop rather than changing that shared default,
                          which would have rippled into every other
                          `TabList` in the app (Customer Information panel
                          tabs, Dashboard tabs, etc. — see that prop's own
                          doc comment). Lines this row's first tab up
                          flush(er) with the record header's own tighter
                          insets above it. */}
                      <TabList
                        overflowMenu
                        overflowBreakpoint="compact"
                        growToFillRow
                        tabPaddingX="3"
                        className="flex-1 min-w-0 self-stretch border-b-0"
                      >
                        {activeInteraction.threads.map((c) => {
                          const key = c.id ?? c.type;
                          // Same `${interactionId}:${channelKey}` scheme the
                          // LeftNav's own `ChannelRow` and the transcript's
                          // `TranscriptSessionSeparator` already key their
                          // own Outcome popovers with — see
                          // `outcomeDraftSource`'s own doc comment above for
                          // why each trigger needs its own `source` tag
                          // ("tab" here) alongside this shared key.
                          const outcomeKey = `${activeInteraction.id}:${key}`;
                          // Same "brand-new outbound thread" signal the
                          // LeftNav card loop derives (`isNewOutboundThread`,
                          // above) — this channel's OWN `c.startedFresh` (see
                          // `Thread.startedFresh`'s own doc comment for why
                          // per-Thread, not `activeInteraction.startedFresh`),
                          // AND-ed with "the customer hasn't replied yet" so
                          // the lockdown lifts the moment this becomes a real
                          // conversation. See that const's own doc comment
                          // for the full reasoning.
                          const isNewOutboundThread =
                            !!c.startedFresh && c.lastCustomerMessageTick === undefined;
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
                              // Same "Open" fallback the Outcome
                              // popover's own `resolution` field below
                              // already uses whenever `channelStatuses[c.id]`
                              // hasn't been explicitly set yet — one shared
                              // default rather than a second, different one
                              // just for this tooltip line. A channel with
                              // no status set yet is a fresh, untouched
                              // thread, not one that's already resolved.
                              statusLabel={activeInteraction.threadStatuses?.[c.id] ?? "Open"}
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
                              // The current Contact id for this Thread — the
                              // most recent reopen's own `contactId` if this
                              // Thread has ever been reopened, its base
                              // `contactId` otherwise. See `Thread.contactId`'s
                              // own doc comment for the full reasoning (this
                              // replaced the old, removed `Thread.
                              // interactionId` — a redundant, separately-
                              // generated digit for what a reader would
                              // reasonably assume was the same as a Contact's
                              // own id).
                              interactionId={c.reopenedContacts?.[c.reopenedContacts.length - 1]?.contactId ?? c.contactId}
                              active={
                                !isHistoryConversationView &&
                                (activeInteraction.currentThreadId ?? activeInteraction.threads[activeInteraction.threads.length - 1]?.id) === key
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
                              // status reads "Closed" OR "Resolved" (see
                              // `Interaction.channelStatuses`'s own
                              // doc comment for why status is tracked per-
                              // channel, and `slaSuppressed`'s own doc
                              // comment, LeftNav render above, for why
                              // "Resolved" gets the same SLA-timer treatment
                              // as "Closed" here WITHOUT the read-only
                              // lockdown "Closed" also gets — `showMenu`
                              // below stays keyed on "Closed" alone) — per
                              // explicit follow-up, a resolved/closed
                              // channel's tab resets to its plain neutral
                              // look regardless of how the SLA clock reads,
                              // since there's no reply pending on something
                              // that's already been wrapped up or closed
                              // out.
                              awaitingResponse={
                                activeInteraction.threadStatuses?.[c.id] !== "Closed" &&
                                activeInteraction.threadStatuses?.[c.id] !== "Resolved" &&
                                (c.awaitingResponse ?? false)
                              }
                              awaitingSeverity={
                                activeInteraction.threadStatuses?.[c.id] !== "Closed" &&
                                activeInteraction.threadStatuses?.[c.id] !== "Resolved" &&
                                c.awaitingResponse
                                  ? getAwaitingSeverity(clockTick - (c.lastCustomerMessageTick ?? c.startTick))
                                  : undefined
                              }
                              onClick={() => {
                                setHistoryConversationTab((t) => (t && t.active ? { ...t, active: false } : t));
                                handleChannelSelect(activeInteraction.id, key);
                              }}
                              onDismiss={() => {
                                if (activeInteraction.threads.length > 1) handleDismissChannel(activeInteraction.id, c);
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
                              // here. See `Interaction.closed`'s own
                              // doc comment for the full picture. Also
                              // false for a brand-new outbound thread
                              // (`isNewOutboundThread`, above) — per
                              // explicit request, same close-only collapse
                              // as the LeftNav card's own kebab.
                              showMenu={
                                !activeInteraction.closed &&
                                activeInteraction.threadStatuses?.[c.id] !== "Closed" &&
                                !isNewOutboundThread
                              }
                              // Per explicit follow-up request: the
                              // `showMenu={false}` fallback above reads as a
                              // red trash icon/"Delete Draft" for a genuine,
                              // never-launched draft's tab specifically
                              // (`isNewOutboundThread`), NOT for an
                              // already-closed channel/interaction's tab —
                              // that still gets the plain neutral "×"/"Close
                              // {type}" treatment (`ChannelTabProps.
                              // removeVariant`'s own default). See that
                              // prop's own doc comment, channel-row.tsx.
                              removeVariant={isNewOutboundThread ? "delete-draft" : "close"}
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
                                // "Open", not "Resolved" — untouched status means fresh thread.
                                resolution: activeInteraction.threadStatuses?.[c.id] ?? "Open",
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
                    </div>
                    )}
                    </>
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
                      explicit request (later renamed "Contacts" — see
                      `CUSTOMER_PANEL_TABS`), so this is unconditional
                      again.) */}
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
                            notice. See `Interaction.closed`'s own doc
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
                            popover (see `Interaction.channelStatuses`'s own
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
                            (`undefined`) isn't. Also gated on "Resolved",
                            not just "Closed"/`activeInteraction.closed` —
                            per explicit request, a resolved channel stops
                            counting toward SLA (this banner included)
                            without being closed out: `activeChannel.
                            awaitingResponse` itself is never cleared by a
                            status change (see `handleInteractionStatusChange`'s
                            own doc comment — it only ever writes
                            `threadStatuses`), so without this explicit
                            check the banner could still fire for a channel
                            that was awaiting right up until the agent
                            marked it Resolved. */}
                        {!activeInteraction.closed &&
                          activeChannelStatus !== "Closed" &&
                          activeChannelStatus !== "Resolved" &&
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
                          // The active Thread's own base Contact id — falls
                          // back to the Customer ID only for the handful of
                          // non-outbound-originated flows whose Thread never
                          // set `contactId` (see that field's own doc
                          // comment on `Thread`) — a real Contact id is
                          // always preferred when one exists.
                          contactId={activeChannel?.contactId ?? activeInteraction.customerId}
                          skillLabel={activeChannel?.preview}
                          // Per-Thread — see `Thread.startedFresh`'s own doc
                          // comment for why this reads the ACTIVE channel's
                          // own flag, not `activeInteraction.startedFresh`.
                          isFreshLaunch={!!activeChannel?.startedFresh}
                          // Per explicit request: mirrors `isFreshLaunch`'s
                          // own gating just above — see AgentNextGenPage.tsx's
                          // identical wiring for the full reasoning. Per
                          // explicit follow-up bug fix: also passes
                          // `activeInteractionIsRealCustomer` (above) so a
                          // contact with no backing `CREATE_NEW_CUSTOMERS`/
                          // `createdCustomerRecords` entry never gets a
                          // fabricated "already been working with Agent X"
                          // — a genuinely brand-new contact reads as a
                          // plain first contact instead. Per a later
                          // explicit request, the same "Contact Overview"
                          // now also feeds a "Journey Summary" card
                          // (lyra-ui's `ContactOverview`, its own
                          // `journeySummary` prop) — the same deterministic
                          // recap the former Copilot tab used to show
                          // (`buildCopilotSummary`, agent-next-gen-customer-
                          // info-panel.tsx) before Copilot itself was
                          // hidden there; this is that content's new home,
                          // gated on the same real-customer check for the
                          // same "no fabricated history for a genuinely new
                          // contact" reasoning.
                          // Per explicit follow-up request ("remove contact
                          // overview from all contacts without customer
                          // association") — see AgentNextGenPage.tsx's
                          // identical gate for the full reasoning: the whole
                          // block, not just the fabricated `previousAgent`/
                          // `snapshot` fields, is gated on
                          // `activeInteractionIsRealCustomer`. Per a later
                          // explicit request, no longer ALSO gated on
                          // `activeChannel?.startedFresh` — see
                          // AgentNextGenPage.tsx's identical follow-up gate
                          // for the full reasoning (a real customer's
                          // Contact Overview now shows for an existing-
                          // conversation/transfer pickup too, just
                          // repositioned by `InteractionTranscript`'s own
                          // `isFreshLaunch` check).
                          contactOverview={
                            activeInteractionIsRealCustomer
                              ? {
                                  ...buildContactOverviewInfo(activeInteraction.id, activeInteractionIsRealCustomer),
                                  journeySummary: buildCopilotSummary(activeInteraction.customerName, activeInteraction.customerId).journeySummary,
                                }
                              : undefined
                          }
                          // "View customer info" jumps this page's docked
                          // Customer Information panel to its Overview tab
                          // — see AgentNextGenPage.tsx's identical wiring
                          // for the full reasoning, including why there's
                          // no `onViewInteractionHistory` here (this page's
                          // panel tabs never include "Contacts" either,
                          // whether the interaction is a real customer or
                          // not — see the `tabs` prop at this page's own
                          // `CustomerInformationSidePanel` call site).
                          onViewCustomerInfo={() => focusCustomerPanelTab("Overview")}
                          // Turns the Contact Overview's "already been
                          // working with Agent X" name/id into a Call/Chat
                          // popover link — see AgentNextGenPage.tsx's
                          // identical wiring for the full reasoning
                          // (`previousAgent` has no real backing directory
                          // entry, so Chat reuses the Agent Chat panel and
                          // Voice surfaces a toast instead of a real call).
                          onLaunchPreviousAgentInteraction={(channel) => {
                            if (channel === "chat") {
                              handlePanelButtonClick("conversations")();
                              return;
                            }
                            const agent = buildContactOverviewInfo(
                              activeInteraction.id,
                              activeInteractionIsRealCustomer
                            ).previousAgent;
                            addToast({
                              variant: "success",
                              title: "Calling",
                              message: agent ? `Calling ${agent.name} (${agent.agentId})…` : "Calling…",
                              duration: 4000,
                            });
                          }}
                          // Per explicit request/follow-up clarification —
                          // see `activeChannelIsNewOutboundThread`'s own
                          // doc comment above for the full reasoning.
                          isNewThread={activeChannelIsNewOutboundThread}
                          // Per explicit follow-up request ("let's update
                          // the channel controls to always be in the
                          // session row - even if there is only one channel
                          // open (no tabs) - moving them around is
                          // confusing"): was `showChannelTabRow` — this
                          // cluster used to relocate up into the record
                          // header whenever there was only 1 channel open
                          // and only live here once a 2nd channel made the
                          // real tab row appear. Now always on — this
                          // session row is the single, permanent home for
                          // these controls regardless of channel count; the
                          // header's own now-removed copy is gone (see the
                          // record-header `actions` call site above).
                          showSessionActionCluster
                          reopenedContacts={activeChannel?.reopenedContacts}
                          liveMessages={activeInteraction.liveMessages?.[activeChannelKey] ?? []}
                          // See `customerTyping`'s own doc comment above —
                          // scoped to whichever channel is ACTIVE right now,
                          // same reasoning `applyToChannel` itself already
                          // uses for `channelKeyAtSend`.
                          isCustomerTyping={!!customerTyping[`${activeInteraction.id}:${activeChannelKey}`]}
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
                                  if (activeInteraction.threads.length > 1) {
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
                  // Per explicit request, clicking a row in this (Agent
                  // Workspace 2.0's own, non-"With Desk") Customers table no
                  // longer opens `CustomerRowInfoPanel` — a no-op. The panel
                  // itself, `selectedCustomerRow`, and `openRowId` below are
                  // all left in place unchanged (still driven by other
                  // sources of the same shared state, e.g. the Search
                  // panel's own Customers sub-tab — see `searchContent`'s
                  // own `onRowClick` further up) — this only disables the
                  // click affordance on THIS table's own rows.
                  onRowClick={() => {}}
                  searchQuery={customerSearchQuery}
                  onSearchChange={setCustomerSearchQuery}
                  sortKey={customerSortKey}
                  sortDir={customerSortDir}
                  onSort={handleCustomerSort}
                  sortedRows={customerSortedRows}
                  openRowId={selectedCustomerRow?.contactNumber ?? null}
                  // Per explicit request (with screenshots) — leading
                  // overlapping channel-icon stack instead of the "Channels"
                  // column, Premium/Advanced only. See `leadingChannelStack`'s
                  // own doc comment (agent-next-gen-customers-table.tsx).
                  leadingChannelStack
                  // Per explicit request ("add a blank column header and if
                  // a record is open as an assignment or as a tab add an
                  // eye icon"), Premium/Advanced only — a row is "open" if
                  // it has a live left-nav assignment card (`interactions`,
                  // matched on `Interaction.customerId`, the same id space
                  // as `row.contactNumber` — see `isRowOpen`'s own doc
                  // comment, agent-next-gen-customers-table.tsx). This tier
                  // has no customer full-screen tabs (`openCustomerTabs` is
                  // a Premium-only feature — see AgentWorkspace2WithDeskPage.
                  // tsx's own call site), so that half of the check simply
                  // doesn't apply here.
                  isRowOpen={(row) => interactions.some((i) => i.customerId === row.contactNumber)}
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
                  tabs={AGENT_WORKSPACE_CUSTOMER_PANEL_TABS}
                  onAddToast={addToast}
                  // Per explicit request ("hide the next/prev in the
                  // customer info cards for advanced and premium in the
                  // customer table view") — see `hidePrevNext`'s own doc
                  // comment (agent-next-gen-customer-info-panel.tsx).
                  hidePrevNext
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
                // `key`s above. "Interactions" no longer has its own
                // branch here — that content moved to the Search right
                // panel (see `searchContent`'s own doc comment), so this
                // page's `activeDeskTab` union no longer offers it at all.
                <div key={activeDeskTab} className="flex flex-1 items-center justify-center p-4 animate-in fade-in-0 duration-200">
                  <p className="lyra-body-md text-lyra-fg-disabled text-center">Coming soon</p>
                </div>
              ) : (
                <>
                <div key={activeDeskTab} className="flex flex-1 flex-col min-w-0 overflow-y-auto px-6 py-6 animate-in fade-in-0 duration-200">
                  <div className="w-full max-w-[1200px] mx-auto lyra-container-grid-wrap">
                    {showPageHeader && (
                      // Dashboard header — per explicit request ("go back
                      // to the version of the home page that does NOT
                      // have a home page header"), moved back OUT of the
                      // fixed, non-scrolling top slot and into the
                      // scrollable dashboard body instead — mirrors the
                      // identical change made to 2.0 (`AgentNextGenPage.tsx`
                      // §129, which has the full rationale, including the
                      // historical `-mx-6 mb-6`/`bordered={false}`/
                      // `titleSize="2xl"` wrapper this reuses) and Premium
                      // (`AgentWorkspace2WithDeskPage.tsx`, same §129
                      // follow-up).
                      //
                      // Title switched from "Agent {first} {last}" to a
                      // plain "Hello {first name}" greeting. Subtitle
                      // ("User Name: {id}") is unchanged. The tri-state
                      // Connect Agent Leg/Connecting.../Connection Lag
                      // Time block that used to sit under the Personal
                      // Queue chip in `actions` is removed entirely —
                      // `actions` now holds only the chip.
                      <div className="-mx-6 mb-6">
                        <PageHeader
                          title={`Hello ${CURRENT_AGENT_FIRST_NAME}`}
                          subtitle={`User Name: ${CURRENT_AGENT_ID}`}
                          bordered={false}
                          titleSize="2xl"
                          actions={
                            <Tooltip content="Toggle Assignment Panel" placement="bottom" asLabel>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setNavOpen((v) => !v)}
                                className={cn(
                                  "h-6 shrink-0 gap-0.5 rounded-lyra-md px-2 lyra-body-md-emphasis",
                                  hasBreachedSlaAssignment
                                    ? "bg-lyra-status-critical-subtle text-lyra-status-critical-strong hover:bg-lyra-status-critical-subtle hover:opacity-80"
                                    : interactions.length > 0
                                    ? "bg-lyra-status-warning-subtle text-lyra-status-warning-strong hover:bg-lyra-status-warning-subtle hover:opacity-80"
                                    : "bg-lyra-status-success-subtle text-lyra-status-success-strong hover:bg-lyra-status-success-subtle hover:opacity-80"
                                )}
                              >
                                My Assignment Queue: {interactions.length > 0 ? interactions.length : "Empty"}
                                {hasBreachedSlaAssignment && (
                                  <CircleAlert className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                                )}
                                <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                              </Button>
                            </Tooltip>
                          }
                        />
                      </div>
                    )}
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
                      onSelect={(id) => {
                        // Same "only one job in this shared docked slot at a
                        // time" rule as the Contact History row's own
                        // `onSelectEntry` above, the other direction — a
                        // queue widget click while a Contact History entry's
                        // summary is showing needs to actually swap the
                        // panel over, not leave the old entry's content
                        // sitting underneath a now-mismatched queue header.
                        setSelectedContactHistoryEntry(null);
                        setSelectedQueueId(id);
                      }}
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
                        onSelectEntry={(entry) => {
                          // Clicking the row that's ALREADY selected closes
                          // the panel instead of re-opening it on itself —
                          // same "click the already-selected one to toggle
                          // it off" behavior `DashboardQueue`'s own
                          // `selectedId`/`onSelect` pair documents for the
                          // queue widgets above.
                          if (entry.id === selectedContactHistoryEntry?.id) {
                            setSelectedContactHistoryEntry(null);
                            return;
                          }
                          // Deselect the OTHER two jobs this shared interior
                          // panel slot can show — only one is ever relevant
                          // at a time, same "selectedQueueId set takes
                          // priority" convention that panel's own doc
                          // comment already documents.
                          setSelectedQueueId(null);
                          setInteriorPanelOpen(false);
                          setSelectedContactHistoryEntry(entry);
                        }}
                        selectedEntryId={selectedContactHistoryEntry?.id ?? null}
                        historyByRange={contactHistoryByRange}
                        onOpenAllContacts={handleOpenAllContacts}
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
                    // Reuses this one docked slot for THREE different jobs
                    // — the pre-existing "Case Details" form, the queue
                    // drill-down, and (per explicit request)
                    // `selectedContactHistoryEntry`'s own Contact History
                    // row summary — rather than stacking a second right-side
                    // panel, since only one detail view is ever relevant at
                    // a time. `selectedQueueId` set takes priority over
                    // `selectedContactHistoryEntry`, which in turn takes
                    // priority over the plain `interiorPanelOpen` "Case
                    // Details" default — same priority order in the open
                    // condition, header, content, and footer below.
                    open={interiorPanelOpen || Boolean(selectedQueueId) || Boolean(selectedContactHistoryEntry)}
                    headerTitle={
                      selectedQueueId
                        ? latestContacts.find((c) => c.id === selectedQueueId)?.name ?? "Queue"
                        : selectedContactHistoryEntry
                        ? selectedContactHistoryEntry.name
                        : "Case Details"
                    }
                    // "{n} Skills" for the queue drill-down (the same count
                    // as that queue widget's own Skills metric, derived from
                    // this exact `queueSubItems[selectedQueueId]` list) or,
                    // per explicit follow-up request, the routing skill name
                    // for a Contact History entry (previously the case ID —
                    // `headerTitle` above already shows the customer's real
                    // name, so this now surfaces a second, distinct fact
                    // about the contact instead).
                    headerSubhead={
                      selectedQueueId
                        ? `${(queueSubItems[selectedQueueId] ?? []).length} Skills`
                        : selectedContactHistoryEntry?.skillName
                    }
                    onClose={() => {
                      setInteriorPanelOpen(false);
                      setSelectedQueueId(null);
                      setSelectedContactHistoryEntry(null);
                    }}
                    // `PanelRightClose` — same "closing a docked right-side
                    // panel" glyph as this panel's sibling instance above,
                    // instead of `ContainerHeader`'s generic default `X`.
                    closeIcon={<PanelRightClose className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />}
                    // Redial/Re-open — per explicit request, these now live
                    // here (the summary panel) instead of directly on the
                    // Contact History row; either one reopens the contact as
                    // a live assignment in the left nav (the row's own
                    // previous click behavior — see `handleRedial`/
                    // `handleReopenContactHistoryEntry`'s own doc comments),
                    // then closes this panel since there's nothing left here
                    // to look at once that's happened. Mutually exclusive by
                    // channel type, per explicit request — a voice contact
                    // (`entry.redial`) only ever gets "Redial" (starting a
                    // literal fresh call is the only thing "reopening" a
                    // call can mean), never "Re-open" alongside it; every
                    // other channel type only ever gets "Re-open" (nothing
                    // to "redial" on a chat/SMS/email/WhatsApp contact).
                    footer={
                      selectedContactHistoryEntry ? (
                        selectedContactHistoryEntry.redial ? (
                          <Button
                            variant="outline"
                            onClick={() => {
                              handleRedial(selectedContactHistoryEntry);
                              setSelectedContactHistoryEntry(null);
                            }}
                          >
                            <PhoneOutgoing className="h-3.5 w-3.5" strokeWidth={1.5} />
                            Redial
                          </Button>
                        ) : (
                          <Button
                            onClick={() => {
                              handleReopenContactHistoryEntry(selectedContactHistoryEntry);
                              setSelectedContactHistoryEntry(null);
                            }}
                          >
                            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                            Takeover Assignment
                          </Button>
                        )
                      ) : undefined
                    }
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
                    ) : selectedContactHistoryEntry ? (
                      <ContactHistoryEntryDetail entry={selectedContactHistoryEntry} />
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
                  // See the docked variant's own matching wrapper (above)
                  // for why "search" skips this wrapper entirely.
                  (activePanelKey === "search" ? (
                    activePanelContent.headerContent
                  ) : (
                    <div className="shrink-0 px-4 pb-3 border-b border-lyra-border-subtle">
                      {activePanelContent.headerContent}
                    </div>
                  ))
                )}
                {/* Per explicit request ("... fade in when transitioning" —
                    see the docked variant's own matching wrapper above for
                    the full doc comment): `key={activePanelKey}` forces a
                    remount on every app switch so `animate-in fade-in-0`
                    replays each time. */}
                <div key={activePanelKey} className="flex flex-col flex-1 min-h-0 animate-in fade-in-0 duration-200">
                  {activePanelContent.body}
                </div>
              </div>
            )}

              </div>
              {/* Customer Information now docks on the RIGHT of the main
                  content column (per explicit request — was on the left) —
                  this block itself is unchanged from its old position
                  (still this exact same conditional/wrapper/`SidePanel`
                  usage), just moved to render AFTER the content column
                  instead of before it, so it's the row's LAST flex child
                  instead of its first. `SidePanel`'s own `side="right"`
                  prop (set on the `SidePanel` inside
                  `CustomerInformationSidePanel` itself, not here) is what
                  actually flips its border/resize-handle/slide-direction to
                  match — this DOM move alone only changes which edge of the
                  ROW it renders against. Per explicit request, also gated
                  on `!activeInteractionIsAgentCall` — an agent-to-agent
                  call hides this docked panel outright (see that const's
                  own doc comment above), not just its Detail-only
                  "unknown contact" fallback. */}
              {!activeInteractionIsAgentCall && showPanelToggle && activeInteraction && (
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
                // values. Setting `z-[5]` explicitly on this wrapper (a
                // flex item of the `flex flex-1 overflow-hidden min-h-0`
                // row above — z-index applies to flex items without
                // needing `position` set) restores the exact same tier
                // this whole subtree occupied before the wrapper was
                // introduced.
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
                  recordId={activeInteraction.customerId}
                  channels={activeInteraction.threads}
                  startedFresh={activeInteraction.startedFresh}
                  // Per explicit request: a brand-new outbound assignment
                  // NOT associated with a real customer record shows ONLY
                  // the Detail tab (no Overview/Copilot/Notes/etc.) — for
                  // its whole lifetime, based purely on customer identity
                  // (`activeInteractionIsRealCustomer`, see that const's own
                  // doc comment above). An interaction WITH a real customer
                  // record keeps this tier's normal reduced tab set
                  // (`AGENT_WORKSPACE_CUSTOMER_PANEL_TABS` — unlike
                  // Premium, this tier never used the full `CUSTOMER_PANEL_TABS`
                  // set here, so that's what "real customer" keeps, not the
                  // full set).
                  tabs={activeInteractionIsRealCustomer ? AGENT_WORKSPACE_CUSTOMER_PANEL_TABS : (["Detail"] as const)}
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
                  onAddToast={addToast}
                  recordDraft={activeCustomerRecordDraft}
                  overviewEditing={activeCustomerOverviewEditing}
                  onOverviewEditingChange={setActiveCustomerOverviewEditing}
                  // The old "only open the customer information
                  // automatically if a NEW message appears in the copilot
                  // window" behavior (`onCopilotFirstAvailable`) is gone
                  // along with Copilot itself — see `CustomerInformationSidePanel`'s
                  // own doc comment (agent-next-gen-customer-info-panel.tsx)
                  // for the "stop launching copilot - hide it completely"
                  // fix this prop was removed as part of.
                  onStartInteraction={(contact, channel, phone, skillId) =>
                    handleStartCall({ contact, channel, phone, skillId })
                  }
                  focusTabOverride={customerPanelFocusTab}
                  // Per explicit request: an unknown-contact interaction
                  // (`!activeInteractionIsRealCustomer` — same signal
                  // `tabs` above already keys off) gets the customer-
                  // matching UI (search/possible-matches/create-new)
                  // instead of its normal tabs+body — see `matchState`'s
                  // own doc comment (agent-next-gen-customer-info-
                  // panel.tsx) for what each piece does. `undefined` for a
                  // real-customer interaction, same as every OTHER
                  // consumer of this component always passes.
                  matchState={
                    activeInteractionIsRealCustomer
                      ? undefined
                      : {
                          step: customerMatchStep,
                          query: customerMatchQuery,
                          onQueryChange: setCustomerMatchQuery,
                          possibleMatches: possibleCustomerMatches,
                          searchResults: customerSearchResults,
                          onLinkRecord: handleLinkCustomerRecord,
                          onStartCreate: handleStartCreateCustomer,
                          onBackToSearch: handleBackToCustomerSearch,
                          onSaveNewCustomer: handleSaveNewCustomer,
                        }
                  }
                />
                </div>
              )}
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
            child, just above) takes over instead.

            `dockedPanelRenderWidth` (below), not the raw `panelWidth`
            state, drives this block's own two `width` styles —
            `maxDockedWidthForMainFloor` (computed once, alongside
            `sharedPanel` above, so `Draggable`'s own `maxWidth` prop there
            can use the exact same boundary) is `containerRef`'s own
            `min-w-[374px]` floor's other half: without SOMETHING here
            actively shrinking to make room, that floor has nowhere to
            borrow space from on its own — once this panel's width plus
            that floor plus LeftNav's own width exceed what
            `bodyContainerWidth` actually has, plain CSS has no way to
            shrink one flex sibling to free up room for another's min-width,
            so the ROW just grows past the viewport instead (confirmed live
            as the actual failure mode of an earlier, simpler attempt at
            this same min-width — and, separately, of an even earlier
            version of THIS fix that only capped the render width while
            NOT actively dragging, which still let a live drag visually run
            the panel off the right edge of the screen; feeding the same
            boundary into `Draggable`'s own `maxWidth` above closes that
            gap too, so this now applies unconditionally, drag or not).
            `panelWidth` itself (the drag-resized value `Draggable`'s own
            `onWidthChange` writes) is left untouched everywhere else —
            float-mode sizing, `Draggable`'s own `defaultWidth`, the
            reset-on-close effect, etc. — so this only clamps what actually
            PAINTS while docked; the size the agent actually dragged to is
            still exactly what they get back the moment there's room for it
            again (window widened, LeftNav collapsed, panel re-opened after
            being closed). */}
        {panelVariant === "docked" && !isCombinedPanelMode && !panelFullScreen && (() => {
          const dockedPanelRenderWidth = Math.min(panelWidth, maxDockedWidthForMainFloor);
          return (
        <div className="flex h-full pb-3" style={{
            width: panelState === "open" ? dockedPanelRenderWidth : 0,
            height: "100%",
            marginRight: panelState === "open" ? 12 : 0,
            overflow: "hidden",
            flexShrink: 0,
            transition: panelIsResizing ? "none" : "width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}>
            <div
              className="flex flex-col h-full animate-in fade-in-0 duration-150"
              style={{
                width: dockedPanelRenderWidth,
                height: "100%",
                display: panelState === "open" ? "flex" : "none",
              }}
            >
              {sharedPanel}
            </div>
        </div>
          );
        })()}

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
          // Uses AgentWelcomeMessage's own default "Start Unavailable" label
          // (no secondaryLabel override — see CLAUDE.md's lyra-ui rules).
          // Per explicit follow-up request, reverted from a prior app-only
          // "Start Offline" override back to this default. Still calls
          // handleStartUnavailable, which sets the agent's real AgentStatus
          // to "unavailable" — lyra-ui's AgentStatus type has no distinct
          // "offline" value (dropped "offline" a while back, see
          // handleStartUnavailable's own doc comment above).
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
      {/* `z-[9999]` — same top-most tier `AppHeader`'s own menus reserve
          (see the floated-panel `zIndex: 40` cap's own doc comment a few
          hundred lines up) — was `z-50`, which sat comfortably above a
          normal docked/full-screen `CustomerInformationSidePanel` (`z-[5]`/
          `z-[9]`) but still lost to it visually once confirmed live (a
          save-confirmation toast peeking out from BEHIND the panel's own
          edit-mode content, not floating above it) — per explicit request,
          a toast should never be hidden behind ANY panel, so this jumps
          straight to the same reserved top tier menus use rather than
          guessing at some smaller number still under whatever the panel's
          own effective stacking context turns out to be. */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
        {/* Only once there's more than one toast actually stacked up —
            with just one (or zero) on screen, its own "×" is already the
            one-click way to clear it; this chip only earns its place once
            dismissing them one at a time would actually be tedious. */}
        {/* Counts the dedicated agent-leg toast (below) alongside the plain
            `toasts` list — it's not part of that array (see
            `agentLegDisconnectedToastOpen`'s own doc comment above), but it
            still visually stacks with everything else here, so the chip's
            "is it worth a one-click clear-everything" threshold needs to
            count it too. */}
        {toasts.length + (agentLegDisconnectedToastOpen ? 1 : 0) > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              dismissAllToasts();
              // Not phased through `forceClosed`/a delayed removal the way
              // `dismissAllToasts` staggers the plain `toasts` list's own
              // exit animation — same accepted "immediate, unanimated
              // close" this toast's own "Connect" button already does (see
              // `handleConnectAgentLeg`), just triggered from "Dismiss All"
              // instead.
              setAgentLegDisconnectedToastOpen(false);
            }}
            className="rounded-full bg-lyra-bg-surface-overlay shadow-lg"
          >
            Dismiss All
          </Button>
        )}
        <ToastContainer className="static bottom-auto right-auto z-auto">
          {toasts.map((t) => (
            <Toast
              key={t.id}
              variant={t.variant}
              title={t.title}
              duration={t.duration}
              // Set by `dismissAllToasts` (toast.tsx) on every toast at
              // once, so clicking "Dismiss All" plays every toast's own
              // exit animation simultaneously instead of them vanishing
              // instantly — see `Toast`'s own `forceClosed` doc comment.
              forceClosed={t.closing}
              onDismiss={() => dismissToast(t.id)}
            >
              {t.message}
            </Toast>
          ))}
          {/* Dedicated "Agent Leg Disconnected" toast (lyra-ui) — see
              `agentLegDisconnectedToastOpen`'s own doc comment above for why
              this lives outside the plain `toasts` list. Only mounted while
              actually open, same "presence controls mounting" idiom the
              `.map()` above already uses per-item. */}
          {agentLegDisconnectedToastOpen && (
            <AgentLegDisconnectedToast
              onConnect={handleConnectAgentLeg}
              onDismiss={() => setAgentLegDisconnectedToastOpen(false)}
            />
          )}
        </ToastContainer>
      </div>
    </div>
  );
}
