// Contact History card (home tab, below Performance/Productivity) — see
// agent-next-gen-shared-utils.ts and sibling agent-next-gen-*.ts(x) files
// for everything AgentNextGenPage.tsx itself no longer declares — split out
// once that file crossed Babel's 500KB code-generator threshold.
import { useState, useMemo, type ComponentType } from "react";
import {
  type TagVariant,
  type ChannelType,
  Tooltip,
  Popover,
  RadioGroup,
  RadioGroupItem,
  Button,
  filterChipVariants,
  DashboardCard,
  Icon,
  SearchInput,
  Badge,
  Tag,
  Label,
  WhatsAppIcon,
} from "@nicecxone/lyra-ui";
import { CREATE_NEW_CUSTOMERS } from "@nicecxone/lyra-ui/customers-data";
import { type Interaction } from "@/components/agent-next-gen-interaction-dashboard";
import { formatElapsedTime, CURRENT_AGENT_NAME } from "@/components/agent-next-gen-shared-utils";
import { cn } from "@/lib/utils";
import {
  type LucideIcon,
  Phone,
  MessageCircle,
  MessageSquare,
  Mail,
  ChevronDown,
  MoreVertical,
  History,
  Inbox,
} from "lucide-react";

/* ── Contact History card (home tab, below Performance/Productivity) ──
   A recent-customer-contacts summary — name, resolution status, a one-line
   case summary, case ID, and (right-aligned) the channel + how long ago it
   happened, plus the handle time. The base 5 rows (`CONTACT_HISTORY`) are
   from a screenshot of exactly this content, so those values are that
   screenshot's own data, not derived from any other part of the app.
   Composed entirely from existing lyra-ui atoms — `DashboardCard` for the
   card shell (`headerActions` holding this card's own
   `ContactHistoryDateFilterChip` — a separate, 3-option "Today / Last 48
   Hours / Last 72 Hours" control, not the shared `DateFilterChip` the
   Performance/Productivity cards' headers use, since this card's range
   options and cumulative-window semantics are its own — see
   `ContactHistoryDateFilterValue`'s own doc comment for why), and `Badge`
   (`shape="circle" dot`) + plain text for the status indicator
   (critical=red/Escalated, info=blue/In Progress, success=green/Resolved,
   neutral=gray/New) — no hand-rolled badge/pill markup.

   Per explicit request: clicking a row no longer reopens the contact
   directly. It instead opens this same entry's summary
   (`ContactHistoryEntryDetail` below) in `AgentNextGenPage`'s shared
   right-docked `InteriorPanel` slot — the same panel type the home tab's
   Queue widgets already drill into (`selectedQueueId`), just a third job
   for that one slot (see that file's own doc comment on why one slot
   serves multiple jobs). "Redial" (voice contacts only, reusing the same
   `PhoneOutgoing` icon `InteractionRowActions`' kebab menu already uses for
   its own "Redial" action) and "Re-open" (reusing the same `RotateCcw` icon
   that same menu's own "Reopen" entry uses) now live as footer buttons on
   that panel instead of directly on the row — clicking either is what
   actually reopens the contact as a live assignment in the left nav (the
   row's own previous click behavior), read the summary first.

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
export type ContactHistoryStatusVariant = "critical" | "info" | "warning" | "success" | "neutral";

/** Maps a session status (`TRANSCRIPT_SESSION_STATUS_OPTIONS`' labels —
 *  Open/Pending/Escalated/Resolved/Closed) onto this card's own
 *  `ContactHistoryStatusVariant`, so `buildDismissedContactHistoryEntry`
 *  can log whatever status was actually last assigned to a dismissed
 *  interaction's primary channel (`Interaction.channelStatuses`) with a matching dot
 *  color, instead of a hardcoded "Resolved"/"success" regardless. "Closed"
 *  maps to "neutral" (gray) rather than reusing "critical" — a closed
 *  contact isn't a negative outcome the way "Escalated" is, and reusing red
 *  for both would read as if every closed row were also escalated. Falls
 *  back to "neutral" for any status not listed (defensive only — every
 *  value `TRANSCRIPT_SESSION_STATUS_OPTIONS` can actually produce is
 *  covered). */
export const SESSION_STATUS_TO_CONTACT_HISTORY_VARIANT: Record<string, ContactHistoryStatusVariant> = {
  Open: "warning",
  Pending: "info",
  Escalated: "critical",
  Resolved: "success",
  Closed: "neutral",
};

export interface ContactHistoryEntry {
  id: string;
  name: string;
  statusLabel: string;
  statusVariant: ContactHistoryStatusVariant;
  /** Voice contacts only — shows a "Redial" footer button (alongside
   *  "Re-open") on this entry's summary panel, see this file's own
   *  "Contact History card" doc comment above. */
  redial: boolean;
  description: string;
  caseId: string;
  /**
   * The routing skill this contact was handled under (e.g. "Technical
   * Support", "Billing") — per explicit follow-up, with a screenshot of the
   * Contact History card's row list: "instead of using the Customer ID in
   * the third row - use the Skill Name." `caseId` itself is untouched
   * (still the real customer-id lookup key everything from redial/reopen to
   * `agent-next-gen-case-database.ts` keys off — see that field's own doc
   * comment) — this is purely a second, display-only field for that one
   * row. Not one of `OUTBOUND_CONFIG.skillOptions`'s own option OBJECTS
   * (importing from agent-next-gen-outbound-data.tsx here would be
   * circular — that file already imports `ContactHistoryEntry`/
   * `CONTACT_HISTORY` from this one), just a plain string matching one of
   * that same picker's labels for cosmetic consistency with the rest of the
   * app's skill-routing vocabulary.
   */
  skillName: string;
  /**
   * This row's real originating channel — every `ChannelType` value is
   * possible here (voice/chat/sms/whatsapp/email), NOT a narrowed display
   * grouping. Previously this collapsed sms/whatsapp down into "chat" (via
   * a since-removed `contactHistoryChannelType` helper) — a real, shipped
   * bug: a dismissed SMS interaction's history row showed a "Chat" tag,
   * and reopening it rebuilt a literal `chat`-type `Thread` instead of an
   * `sms` one, which in turn left the real SMS channel un-flagged as
   * "already open" so it wrongly still showed as addable. Fixed per
   * explicit bug report — this field (and everything keyed by it —
   * `channelLabel`, `CONTACT_HISTORY_CHANNEL_ICON`/`_LABEL`/
   * `_TAG_VARIANT`, `CHANNEL_TYPE_ICON_COLOR_CLASS`) must always carry the
   * real channel type through losslessly.
   */
  channelType: ChannelType;
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
  /** Every OUTBOUND-startable channel this customer can be reached on —
   *  same field/purpose as `CreateNewOutboundContact.channels`, and, for
   *  the 5 hand-authored rows above with no real `customerId`, the ONLY
   *  place that data exists at all (a `CREATE_NEW_CUSTOMERS`-backed row
   *  gets this for free via that record's own `channels` field instead —
   *  see `buildContactHistoryOutboundContacts`, agent-next-gen-outbound-
   *  data.tsx, which is what actually reads this). Per explicit request:
   *  reopening/redialing one of these 5 rows used to leave the record
   *  header's "+" (Add Channel) row completely empty — `useOutboundAddButton`
   *  had no contact record to look up under `history:${id}`/`redial:${id}`
   *  (the synthetic ids these rows fall back to with no `customerId`), so
   *  `getAvailableChannels` always came back `[]` even for a customer who
   *  plainly has other channels on file. Voice/Chat/Email aren't
   *  necessarily included even when `channelType` is one of them — Chat in
   *  particular never is, since a website chat widget has no "start one
   *  outbound" concept for `useOutboundAddButton` to offer regardless of
   *  who the customer is (same reason `CUSTOMER_CHANNEL_ORDER`, agent-
   *  next-gen-customers-table.tsx, never includes "chat" either). */
  channels?: ChannelType[];
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
   * `Interaction.closed`: a closed interaction reopens read-only (an
   * inline "You are viewing a closed interaction." banner, no
   * `InteractionComposer`, no per-channel kebab actions) instead of a
   * normal, reply-able one. A plain boolean rather than checking
   * `statusLabel === "Closed"` by string — display text shouldn't double as
   * the thing behavior branches on. */
  closed?: boolean;
  /**
   * The `Interaction.interactionId` this row was logged from, when this
   * entry was built by `buildDismissedContactHistoryEntry` (i.e. "Unassign
   * & Dismiss" ended a real, live `Interaction`) — undefined for every
   * hand-authored `CONTACT_HISTORY`/`EXTENDED_CONTACT_HISTORY` row, since
   * those never existed as a live `Interaction` in the first place. Purely
   * a traceability breadcrumb (not read by any handler today): once an
   * `Interaction` ends, this is the only place its own id survives, so a
   * dismissed journey stays identifiable in history instead of being
   * discarded outright.
   */
  interactionId?: string;
  /**
   * This row's real email address, when known — populated for every
   * `CREATE_NEW_CUSTOMERS`-backed row (`customer.emailAddress`) and every
   * dismissed row whose primary `Thread` was itself an email channel
   * (`primaryChannel.addressLabel`/`.value`). Read by
   * `contactHistoryDisplayIdentity` (below) for `channelType === "email"`
   * rows once names are hidden — see that function's own doc comment for
   * why. Undefined wherever no real address is known, in which case that
   * function falls back to `name` rather than showing nothing.
   */
  email?: string;
  /**
   * This row's real phone number, when known — same populate/consume
   * pattern as `email` above, but for `channelType === "voice"`/`"sms"`
   * rows (`customer.firstPhone`, or the dismissed row's primary `Thread`
   * address).
   */
  phone?: string;
  /**
   * This row's real WhatsApp handle, when known — same pattern again, for
   * `channelType === "whatsapp"` rows. Synthesized as `@${name}` for
   * `CREATE_NEW_CUSTOMERS`-backed rows, matching lyra-ui's own
   * `resolveOutboundDetailField` convention (create-new.tsx) for a
   * contact with no dedicated `whatsappHandle`-style field on file yet.
   */
  whatsappHandle?: string;
}

/**
 * Per-`channelType` display identity for a Contact History row — real
 * reach-back address instead of the customer's name: WhatsApp shows the
 * row's `whatsappHandle`, Voice/SMS shows `phone`, Email shows `email`.
 * Chat still shows the customer's name (no separate "chat handle" concept
 * exists to show instead). Falls back to `name` wherever the specific
 * field this row would need isn't populated (e.g. a dismissed quick-dialed
 * row with no captured `Thread.value`), so a row never renders with no
 * identity at all.
 *
 * Two call sites, two different reasons: `ContactHistoryCard` uses this
 * only when its own `hideCustomerNames` prop is set (Agent Workspace 2.0
 * only — see that prop's doc comment) — masking real names entirely.
 * `ContactHistoryEntryDetail` uses this unconditionally, in every tier —
 * see that component's own doc comment — to avoid restating the name its
 * caller's `InteriorPanel` `headerTitle` already shows just above it.
 */
export function contactHistoryDisplayIdentity(entry: ContactHistoryEntry): string {
  if (entry.channelType === "chat") return entry.name;
  if (entry.channelType === "whatsapp") return entry.whatsappHandle ?? entry.name;
  if (entry.channelType === "email") return entry.email ?? entry.name;
  return entry.phone ?? entry.name;
}

/** One turn in a Contact History row's synthesized chat/SMS/WhatsApp
 *  message thread — see `buildContactHistoryMessages` below for where this
 *  gets built. Deliberately a separate, file-local type from
 *  `CustomerHistoryConversationMessage` (agent-next-gen-customer-info-
 *  panel.tsx) even though the shape is identical — importing it here would
 *  be circular (that file already imports `ContactHistoryStatusVariant`
 *  from this one). */
export interface ContactHistoryMessage {
  sender: "customer" | "agent";
  text: string;
  timestampDisplay: string;
}

// Per explicit follow-up request, with a screenshot of the summary panel:
// "please display the transcript/email body content/chat below the info
// box in the contact history interior panel." This app has no real
// backend/transcript data for any Contact History row (same caveat this
// file's own top-of-file doc comment already makes for its other dummy
// data), so what shows below the info box is synthesized rather than
// looked up — generic, plausible-reading content, not scripted to each
// row's own `description`, picked deterministically per row
// (`hashContactHistoryId`, not `Math.random()`) so the same row always
// renders the same content on every open.
//
// Per a further explicit follow-up on a voice row's own screenshot ("for
// voice can you have a fake transcript?"), voice rows get one too — a
// synthesized call transcript, same bubble UI as chat/SMS/WhatsApp's own
// message thread, just with call-appropriate pool wording and its own
// "Transcript" section label instead of "Conversation" (see
// `buildContactHistoryMessages`/`ContactHistoryEntryDetail` below). This
// supersedes an earlier version of this feature that deliberately left
// voice rows with nothing extra here, reasoning the info box's own "Call
// Notes" already covered a call's content — per this follow-up, that
// wasn't actually what "transcript" meant in the original request.
const CONTACT_HISTORY_CHAT_CUSTOMER_MESSAGE_POOL = [
  "Hi, I wanted to follow up on this.",
  "Thanks for taking a look — let me know what you find.",
  "Sorry, one more question before we wrap up.",
  "That makes sense, thank you for explaining!",
];
const CONTACT_HISTORY_CHAT_AGENT_MESSAGE_POOL = [
  "Of course — let me pull up your account.",
  "I can see that here now, one moment.",
  "You're all set. Is there anything else I can help with?",
  "Happy to help — have a great rest of your day!",
];

// Same idea as the chat pools above, worded to read as spoken dialogue
// rather than typed messages — a voice row's "Transcript" section picks
// from these instead (see `buildContactHistoryMessages` below).
const CONTACT_HISTORY_VOICE_CUSTOMER_MESSAGE_POOL = [
  "Hi, I'm calling about the issue on my account.",
  "Okay, that's right, thanks for confirming.",
  "Sorry, could you repeat that last part?",
  "Got it, that answers my question — thank you.",
];
const CONTACT_HISTORY_VOICE_AGENT_MESSAGE_POOL = [
  "Thanks for calling — can I get your name and verify a couple details first?",
  "Perfect, I have your account pulled up now.",
  "Sure, let me walk you through that again.",
  "You're all set. Is there anything else I can help you with today?",
];

// Fuller, generic paragraphs for the email "Body" section — deliberately
// distinct wording from `entry.description` (the info box's own short
// one-line summary, labeled "Email Summary"), so the two sections don't
// just repeat each other.
const CONTACT_HISTORY_EMAIL_BODY_POOL = [
  "Thanks for reaching out. I've reviewed your account and confirmed the details below — let me know if anything looks off and I'll follow up right away.",
  "Following up on our conversation — everything's been updated on our end. You should see the change reflected within the next billing cycle.",
  "Wanted to make sure you had this in writing for your records. Please reach back out if you have any other questions in the meantime.",
  "Thanks for your patience while we looked into this. Here's a summary of what we found and the steps we took to resolve it.",
];

/** Deterministic (`id`-keyed, not `Math.random()`) pool index — same "no
 *  real backend" dummy-data convention as the rest of this file's fixtures,
 *  kept local to this section since nothing else needs it. */
function hashContactHistoryId(id: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 999979;
  return Math.abs(hash) % mod;
}

/** The message thread shown below `ContactHistoryEntryDetail`'s info box
 *  for a voice/chat/SMS/WhatsApp row — 3-4 lines, alternating customer/
 *  agent, starting with the customer. Voice rows pick from the
 *  call-worded pools (`CONTACT_HISTORY_VOICE_*`); every other channel type
 *  here picks from the typed-message pools (`CONTACT_HISTORY_CHAT_*`). See
 *  the pools' own doc comment above for why none of this is case-specific.
 *  Times are synthesized too (no real captured timestamps exist for these
 *  rows), stepping forward a couple minutes per turn from a deterministic
 *  starting time. */
function buildContactHistoryMessages(entry: ContactHistoryEntry): ContactHistoryMessage[] {
  const count = 3 + hashContactHistoryId(entry.id, 2); // 3 or 4 turns
  const startHour = 9 + hashContactHistoryId(`${entry.id}-h`, 3); // 9-11
  const startMinute = hashContactHistoryId(`${entry.id}-m`, 60);
  const isVoice = entry.channelType === "voice";
  const customerPool = isVoice ? CONTACT_HISTORY_VOICE_CUSTOMER_MESSAGE_POOL : CONTACT_HISTORY_CHAT_CUSTOMER_MESSAGE_POOL;
  const agentPool = isVoice ? CONTACT_HISTORY_VOICE_AGENT_MESSAGE_POOL : CONTACT_HISTORY_CHAT_AGENT_MESSAGE_POOL;
  return Array.from({ length: count }, (_, i) => {
    const isCustomer = i % 2 === 0;
    const pool = isCustomer ? customerPool : agentPool;
    const totalMinutes = startMinute + i * 2;
    const hour = (startHour + Math.floor(totalMinutes / 60)) % 24;
    const minute = totalMinutes % 60;
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return {
      sender: isCustomer ? "customer" : "agent",
      text: pool[hashContactHistoryId(`${entry.id}-${i}`, pool.length)],
      timestampDisplay: `${displayHour}:${minute.toString().padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`,
    } satisfies ContactHistoryMessage;
  });
}

/** The "Body" text shown below `ContactHistoryEntryDetail`'s info box for
 *  an email row — see `CONTACT_HISTORY_EMAIL_BODY_POOL`'s own doc comment
 *  for why this is separate content from `entry.description`, not a reuse
 *  of it. */
function buildContactHistoryEmailBody(entry: ContactHistoryEntry): string {
  return CONTACT_HISTORY_EMAIL_BODY_POOL[hashContactHistoryId(entry.id, CONTACT_HISTORY_EMAIL_BODY_POOL.length)];
}

/** One read-only customer/agent bubble for `ContactHistoryEntryDetail`'s
 *  own synthesized message thread (chat/SMS/WhatsApp rows only) — same
 *  avatar/bubble/timestamp classes as
 *  `CustomerHistoryConversationMessageBubble` (agent-next-gen-customer-
 *  info-panel.tsx) for visual consistency between the two "read a past
 *  conversation" experiences in this app; redeclared locally rather than
 *  imported, to avoid the same circular import `ContactHistoryMessage`'s
 *  own doc comment describes. No hover toolbar (Copy/Add tag) — this is
 *  closed history, nothing to copy/tag in-progress. */
function ContactHistoryMessageBubble({ message }: { message: ContactHistoryMessage }) {
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

/** One turn in a voice row's synthesized call transcript
 *  (`ContactHistoryEntryDetail`'s own "Transcript" section, voice rows
 *  only) — per explicit follow-up, with a reference screenshot: a plain
 *  "Name  timestamp" header line (bold name, secondary-colored time) with
 *  the spoken line below it, stacked top-to-bottom for every turn
 *  regardless of speaker — NOT `ContactHistoryMessageBubble`'s own chat-
 *  style avatar/bubble/left-right layout, which the reference screenshot
 *  explicitly doesn't use for a call transcript. Speaker name is the real
 *  logged-in agent (`CURRENT_AGENT_NAME`, agent-next-gen-shared-utils.ts —
 *  matches the reference screenshot's own "John Smith") for an agent turn,
 *  this row's own customer name (`entry.name`) for a customer turn — not
 *  generic "Agent"/"Customer" labels. */
function ContactHistoryTranscriptLine({
  message,
  customerName,
}: {
  message: ContactHistoryMessage;
  customerName: string;
}) {
  const speakerName = message.sender === "customer" ? customerName : CURRENT_AGENT_NAME;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2">
        <span className="lyra-body-md-emphasis text-lyra-fg-default">{speakerName}</span>
        <span className="lyra-body-sm text-lyra-fg-secondary">{message.timestampDisplay}</span>
      </div>
      <p className="lyra-body-md text-lyra-fg-default">{message.text}</p>
    </div>
  );
}

export const CONTACT_HISTORY_CHANNEL_ICON: Record<
  ContactHistoryEntry["channelType"],
  LucideIcon | ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  voice:    Phone,
  chat:     MessageCircle,
  sms:      MessageSquare,
  whatsapp: WhatsAppIcon,
  email:    Mail,
};

export const CONTACT_HISTORY: ContactHistoryEntry[] = [
  {
    id: "ch1", name: "Nathan Cole", statusLabel: "Resolved", statusVariant: "success", redial: true,
    description: "Customer was locked out after 5 failed attempts. Verified identity via KBA, reset credentials, and confirmed access restored.",
    caseId: "CST-22841", skillName: "Technical Support", channelType: "voice", channelLabel: "Voice", timeAgo: "8m ago", duration: "8m 14s",
    channels: ["voice", "sms", "email"],
    phone: "(704) 555-0142", email: "nathan.cole@example.com", whatsappHandle: "@Nathan Cole",
  },
  {
    id: "ch2", name: "Priya Shah", statusLabel: "Resolved", statusVariant: "success", redial: false,
    description: "Duplicate charge dispute — $89.99 refund issued",
    caseId: "CST-30164", skillName: "Billing", channelType: "chat", channelLabel: "Chat", timeAgo: "34m ago", duration: "12m 02s",
    channels: ["email", "sms"],
    phone: "(415) 555-0178", email: "priya.shah@example.com", whatsappHandle: "@Priya Shah",
  },
  {
    id: "ch3", name: "Omar Farooq", statusLabel: "Resolved", statusVariant: "success", redial: false,
    description: "Plan upgrade confirmation & feature overview",
    caseId: "CST-16823", skillName: "Sales", channelType: "email", channelLabel: "Email", timeAgo: "2h ago", duration: "6m 30s",
    channels: ["email", "whatsapp"],
    phone: "(212) 555-0193", email: "omar.farooq@example.com", whatsappHandle: "@Omar Farooq",
  },
  {
    id: "ch4", name: "Lauren Briggs", statusLabel: "Escalated", statusVariant: "critical", redial: true,
    description: "Escalated fraud investigation — 4 suspicious transactions",
    caseId: "CST-27760", skillName: "Escalations", channelType: "voice", channelLabel: "Voice", timeAgo: "5h ago", duration: "22m 47s",
    channels: ["voice", "email"],
    phone: "(312) 555-0164", email: "lauren.briggs@example.com", whatsappHandle: "@Lauren Briggs",
  },
  {
    id: "ch5", name: "Mei Tanaka", statusLabel: "Resolved", statusVariant: "success", redial: false,
    description: "Shipping delay — expedited replacement dispatched",
    caseId: "CST-31045", skillName: "General Support", channelType: "chat", channelLabel: "Chat", timeAgo: "1d ago", duration: "9m 15s",
    channels: ["sms", "whatsapp", "email"],
    phone: "(206) 555-0157", email: "mei.tanaka@example.com", whatsappHandle: "@Mei Tanaka",
  },
];

export const CONTACT_HISTORY_CHANNEL_LABEL: Record<ContactHistoryEntry["channelType"], string> = {
  voice: "Voice",
  chat: "Chat",
  sms: "SMS",
  whatsapp: "WhatsApp",
  email: "Email",
};

/** Channel-type tag color — Voice/Email keep `Tag`'s fixed "purple"/"pink"
 *  accent variants (see CONTRIBUTING.md's "Channel type colors"
 *  convention); Chat/SMS/WhatsApp reuse lyra-ui's own established
 *  "teal"/"neutral"/"default" trio (`CHANNEL_TYPE_TAG_VARIANT`,
 *  channel-row.tsx) rather than a one-off mapping here, so a dismissed
 *  SMS/WhatsApp interaction's history tag reads distinctly from a Chat one
 *  the exact same way the record-header's own `ChannelTab` chips already
 *  do (see that file's own doc comment for why the three read as
 *  genuinely distinct channels, not one grouping). */
export const CONTACT_HISTORY_CHANNEL_TAG_VARIANT: Record<ContactHistoryEntry["channelType"], TagVariant> = {
  voice: "purple",
  chat: "teal",
  sms: "neutral",
  whatsapp: "default",
  email: "pink",
};

/** Same channel → color mapping as `CONTACT_HISTORY_CHANNEL_TAG_VARIANT`
 *  above, as plain icon-color classes instead of a `Tag` variant — for
 *  spots like `InteractionsTable`'s per-row type icon, where the channel
 *  indicator is a bare icon (no room for a pill in a 48px column) but
 *  should still tint consistently rather than sitting flat gray.
 *  SMS/WhatsApp reuse the same neutral/"active" text tones `Tag`'s own
 *  "neutral"/"default" variants render with (`tag.tsx`'s `tagVariants`)
 *  rather than inventing new accent hues those two variants don't have. */
export const CHANNEL_TYPE_ICON_COLOR_CLASS: Record<ContactHistoryEntry["channelType"], string> = {
  voice: "text-lyra-accent-purple-strong",
  chat: "text-lyra-accent-teal-strong",
  sms: "text-lyra-fg-secondary",
  whatsapp: "text-lyra-fg-active-strong",
  email: "text-lyra-accent-pink-strong",
};

/** Shared per-row content shape for every customer-derived (as opposed to
 *  hand-authored, like `CONTACT_HISTORY` above) Contact History row —
 *  everything except what's already on the `CREATE_NEW_CUSTOMERS` record
 *  itself (name/caseId) or derived from it (channelType/channelLabel/
 *  redial). */
export interface ContactHistoryTemplate {
  statusLabel: string;
  statusVariant: ContactHistoryStatusVariant;
  description: string;
  timeAgo: string;
  duration: string;
  skillName: string;
}

/** Builds a set of Contact History rows from real `CREATE_NEW_CUSTOMERS`
 *  fixture records — same "deterministic indexes, not `Math.random()`"
 *  convention as the rest of this file's dummy data. `customerIndexes[i]`
 *  pairs with `templates[i]`; `idPrefix` keeps each range's ids from
 *  colliding with another range's (e.g. "Today" vs. "Last 7 days" picking
 *  overlapping customer indexes would otherwise produce duplicate React
 *  keys if both ever rendered in the same list). */
export function buildContactHistoryFromCustomers(
  customerIndexes: number[],
  templates: ContactHistoryTemplate[],
  idPrefix: string
): ContactHistoryEntry[] {
  return customerIndexes.map((customerIndex, i) => {
    const customer = CREATE_NEW_CUSTOMERS[customerIndex];
    // Voice takes priority (it's what "Redial" needs — see `redial` below),
    // otherwise just the first channel this customer record happens to list
    // — a plain, lossless pick rather than the since-removed
    // `contactHistoryChannelType` helper's old "collapse every text channel
    // down into Chat" behavior (see `ContactHistoryEntry.channelType`'s own
    // doc comment for the real, shipped bug that caused).
    const channelType = customer.channels.includes("voice") ? "voice" : customer.channels[0] ?? "email";
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
      // `email`/`phone`/`whatsappHandle` — see `ContactHistoryEntry`'s own
      // doc comments for these three. `whatsappHandle` is synthesized as
      // `@${name}`, matching lyra-ui's own `resolveOutboundDetailField`
      // convention (create-new.tsx) for a contact with no dedicated
      // WhatsApp-handle field on file.
      email: customer.emailAddress,
      phone: customer.firstPhone,
      whatsappHandle: `@${customer.name}`,
      ...templates[i],
    };
  });
}

export function buildDismissedContactHistoryEntry(interaction: Interaction, clockTick: number): ContactHistoryEntry {
  // Voice takes priority (it's what "Redial" needs — see `redial` below)
  // when this interaction has a voice thread among its (rare, multi-
  // channel) open threads; otherwise whichever thread is actually current
  // — falling back to the first one — stands in as "primary." Either way,
  // `channelType` below is that thread's own REAL type, never collapsed —
  // see `ContactHistoryEntry.channelType`'s own doc comment for the real,
  // shipped bug a since-removed `contactHistoryChannelType` helper caused
  // by lumping sms/whatsapp into "chat" here (a dismissed SMS interaction's
  // history row showed a "Chat" tag, and reopening it rebuilt a literal
  // `chat`-type `Thread` instead of an `sms` one).
  const primaryChannel =
    interaction.threads.find((c) => c.type === "voice") ??
    interaction.threads.find((c) => c.id === interaction.currentThreadId) ??
    interaction.threads[0];
  const channelType = primaryChannel?.type ?? "chat";
  const earliestStart =
    interaction.threads.length > 0 ? Math.min(...interaction.threads.map((c) => c.startTick)) : clockTick;
  const statusLabel = interaction.threadStatuses?.[primaryChannel?.id ?? ""] ?? "Resolved";
  // The real captured address (email/phone/WhatsApp handle) this row's
  // primary Thread was opened on, if any — `addressLabel` (human-readable,
  // e.g. "(456) 383-3329") preferred over the raw `value` (e.g.
  // "+14563833329"), same preference `ChannelToggle`'s own face already
  // uses (see `Thread.addressLabel`'s own doc comment). Undefined for a
  // quick-dialed/redialed thread with no captured address at all — in
  // which case `contactHistoryDisplayIdentity` (above) falls back to
  // `name` rather than showing nothing.
  const channelAddress = primaryChannel?.addressLabel ?? primaryChannel?.value;
  // Nothing on `Interaction` tracks which skill it was originally routed
  // under (channels/threads carry no such field — see `Interaction`'s own
  // type), so a dismissed row falls back to this generic label rather than
  // guessing. Every other `ContactHistoryEntry` construction site (the
  // hand-authored rows above, `buildContactHistoryFromCustomers`'s
  // templates) has a real authored value instead. Declared as its own
  // constant (rather than inlined below) so `description`'s own dedupe
  // check just below can compare against the exact same string used for
  // the `skillName` field, per the follow-up doc comment on `description`.
  const skillName = "General Support";
  return {
    id: `dismissed-${interaction.id}-${Date.now()}`,
    name: interaction.customerName ?? "Customer",
    statusLabel,
    statusVariant: SESSION_STATUS_TO_CONTACT_HISTORY_VARIANT[statusLabel] ?? "success",
    redial: channelType === "voice",
    // Per explicit follow-up, with a screenshot of a dismissed dial-pad row
    // reading "General Support — resolved and dismissed by agent" (this
    // line) directly above a third line ALSO reading "General Support"
    // (`skillName`, just below): "remove the redundant skill in the
    // description." `primaryChannel.preview` is set to the real routing
    // skill's label for a skill/agent quick-dialed `Thread` (see
    // `Thread.preview`'s own call sites, e.g. `preview: skillLabel` at this
    // channel's creation) — when it happens to equal this row's own
    // (generic, hardcoded) `skillName` above, prefixing the description
    // with it is pure duplication of the very next line down. Only
    // suppressed in that exact case — a `preview` holding something
    // genuinely different (a real message snippet, a distinct skill name)
    // still shows normally, since that's actually new information.
    description:
      primaryChannel?.preview && primaryChannel.preview !== skillName
        ? `${primaryChannel.preview} — ${statusLabel.toLowerCase()} and dismissed by agent`
        : `${statusLabel} and dismissed by agent`,
    caseId: interaction.customerId,
    skillName,
    channelType,
    channelLabel: CONTACT_HISTORY_CHANNEL_LABEL[channelType],
    timeAgo: "Just now",
    duration: formatElapsedTime(clockTick - earliestStart),
    customerId: /^customer-\d+$/.test(interaction.id) ? interaction.id : undefined,
    // `ContactHistoryEntry.channels`'s own doc comment: for a row with no
    // real `customerId` (any interaction that isn't itself
    // `CREATE_NEW_CUSTOMERS`-backed — e.g. a redialed/quick-dialed number,
    // or one of the 5 hand-authored `CONTACT_HISTORY` rows reopened and
    // then dismissed again), this is the ONLY place
    // `buildContactHistoryOutboundContacts` has to learn which channels
    // this customer can be reached on at all — without it, a dismissed
    // interaction's own `CreateNewOutboundContact.channels` falls back to
    // `entry.channels ?? []`, an empty list, and the record header's "+"
    // (Add Channel) row goes back to showing NO buttons at all once
    // reopened a second time. Deduped (`Set`) since `interaction.channels`
    // can have more than one open channel of the same `type` (e.g. two SMS
    // threads on different numbers) — `CreateNewOutboundContact.channels`
    // only needs each type once, not one entry per open thread.
    channels: [...new Set(interaction.threads.map((c) => c.type))],
    interactionId: interaction.interactionId,
    // `email`/`phone`/`whatsappHandle` — see `ContactHistoryEntry`'s own
    // doc comments for these three. Only the one matching this row's real
    // `channelType` is populated from `channelAddress` above; the other two
    // stay undefined (`contactHistoryDisplayIdentity` never reads them for
    // a row of this type). WhatsApp falls back to a synthesized `@${name}`
    // handle (same convention `buildContactHistoryFromCustomers` and
    // lyra-ui's own `resolveOutboundDetailField` use) when no real captured
    // address exists for this thread.
    email: channelType === "email" ? channelAddress : undefined,
    phone: channelType === "voice" || channelType === "sms" ? channelAddress : undefined,
    whatsappHandle:
      channelType === "whatsapp" ? channelAddress ?? `@${interaction.customerName ?? "Customer"}` : undefined,
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
export const EXTENDED_CONTACT_HISTORY_CUSTOMER_INDEXES = [5, 12, 19, 26, 33];
export const EXTENDED_CONTACT_HISTORY_TEMPLATES: ContactHistoryTemplate[] = [
  { statusLabel: "Resolved", statusVariant: "success", description: "Password reset — identity verified via KBA, access restored", timeAgo: "1d ago", duration: "7m 40s", skillName: "Technical Support" },
  { statusLabel: "Resolved", statusVariant: "success", description: "Billing question — walked through recent charges, no refund needed", timeAgo: "1d ago", duration: "5m 18s", skillName: "Billing" },
  { statusLabel: "Escalated", statusVariant: "critical", description: "Product setup issue escalated to Tier 2 for configuration support", timeAgo: "2d ago", duration: "14m 05s", skillName: "Escalations" },
  { statusLabel: "Resolved", statusVariant: "success", description: "Subscription cancellation request — retention offer accepted", timeAgo: "2d ago", duration: "10m 52s", skillName: "Sales" },
  { statusLabel: "Resolved", statusVariant: "success", description: "Shipping delay follow-up — updated delivery window provided", timeAgo: "2d ago", duration: "4m 27s", skillName: "General Support" },
];
export const EXTENDED_CONTACT_HISTORY: ContactHistoryEntry[] = buildContactHistoryFromCustomers(
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
export type ContactHistoryDateFilterValue = "today" | "last48h" | "last72h";

export const CONTACT_HISTORY_DATE_FILTER_OPTIONS: { value: ContactHistoryDateFilterValue; label: string }[] = [
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
export function buildContactHistoryByRange(
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
export function ContactHistoryDateFilterChip({ onValueChange }: { onValueChange?: (value: ContactHistoryDateFilterValue) => void }) {
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

export function ContactHistoryCard({
  onSelectEntry,
  selectedEntryId,
  historyByRange,
  hideCustomerNames,
}: {
  /** Fired by clicking anywhere on a row — opens this entry's summary in
   *  `AgentNextGenPage`'s shared right-docked `InteriorPanel` slot (main
   *  component's own `selectedContactHistoryEntry` state), rather than
   *  reopening the contact directly. Redial/Re-open (this same entry's own
   *  actual reopen actions) now live as buttons on that panel — see this
   *  file's own "Contact History card" doc comment above. */
  onSelectEntry?: (entry: ContactHistoryEntry) => void;
  /** `selectedContactHistoryEntry?.id` (main component) — which row (if
   *  any) currently has its summary open in that shared panel, so that row
   *  can get a visibly selected treatment instead of looking identical to
   *  every unselected one while its own detail is on screen. Same
   *  `bg-lyra-status-info-subtle` "highlighted" swap `ChannelRow` already
   *  uses for its own selected-row state (channel-row.tsx), not a one-off
   *  style. */
  selectedEntryId?: string | null;
  /** Built by `buildContactHistoryByRange` (main component, via `useMemo`
   *  keyed on `dismissedContactHistory`) — passed down rather than read
   *  from a module-level constant, since "Today" is real, growing state
   *  (see this card's own doc comment above), not a fixed fixture. */
  historyByRange: Record<ContactHistoryDateFilterValue, ContactHistoryEntry[]>;
  /**
   * Per explicit request, Agent Workspace 2.0 only: rows show
   * `contactHistoryDisplayIdentity(entry)` (a real reach-back address —
   * phone for Voice/SMS, email for Email, the row's own WhatsApp handle
   * for WhatsApp — falling back to `name` for Chat, which has no separate
   * "handle" concept) in place of `entry.name`. Defaults to false/unset —
   * Agent Workspace 2.0 Premium/Advanced don't pass this, so both keep
   * showing real customer names exactly as before, per that same explicit
   * request ("keep as-is in advanced and premium").
   */
  hideCustomerNames?: boolean;
}) {
  const [dateFilter, setDateFilter] = useState<ContactHistoryDateFilterValue>("today");
  const [searchQuery, setSearchQuery] = useState("");
  const entries = historyByRange[dateFilter];

  // Filters the already date-ranged `entries` down to whatever matches the
  // search box — name, case ID, channel, or the one-line case summary, so
  // a query like "billing" or "CST-30164" both find their row. Case-
  // insensitive substring match, same convention as every other quick
  // search in this app (e.g. `DesktopDesignsPage`'s table toolbar).
  // `hideCustomerNames` also matches on whatever identity is actually
  // showing (`contactHistoryDisplayIdentity`) — a phone/email/handle
  // search should find its row even though `entry.name` itself is never
  // on screen in that mode.
  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) =>
      [
        entry.name,
        entry.description,
        entry.caseId,
        entry.channelLabel,
        ...(hideCustomerNames ? [contactHistoryDisplayIdentity(entry)] : []),
      ].some((field) => field.toLowerCase().includes(query))
    );
  }, [entries, searchQuery, hideCustomerNames]);

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
            const isSelected = entry.id === selectedEntryId;
            const displayName = hideCustomerNames ? contactHistoryDisplayIdentity(entry) : entry.name;
            return (
              <div
                key={entry.id}
                role={onSelectEntry ? "button" : undefined}
                tabIndex={onSelectEntry ? 0 : undefined}
                aria-current={isSelected ? "true" : undefined}
                onClick={() => onSelectEntry?.(entry)}
                onKeyDown={(e) => {
                  if (onSelectEntry && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onSelectEntry(entry);
                  }
                }}
                className={cn(
                  "flex items-start justify-between gap-4 px-4 py-4 transition-colors",
                  // Selected (this row's summary is the one currently open
                  // in the shared panel) — same `bg-lyra-status-info-subtle`
                  // swap `ChannelRow`'s own `highlighted` state uses
                  // (channel-row.tsx), in place of the plain hover tint.
                  isSelected ? "bg-lyra-status-info-subtle" : "hover:bg-lyra-state-hover",
                  onSelectEntry && "cursor-pointer",
                  i > 0 && "border-t border-lyra-border-subtle"
                )}
              >
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="lyra-body-md-emphasis text-lyra-fg-default">{displayName}</span>
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
                  </div>
                  <span className="lyra-body-md text-lyra-fg-secondary">{entry.description}</span>
                  {/* Per explicit follow-up, with a screenshot: this row
                      shows the routing skill instead of the customer id —
                      `entry.caseId` itself is untouched everywhere else
                      (redial/reopen, search, the summary panel's own
                      subhead) — this is purely a display swap for this one
                      line. See `skillName`'s own doc comment. */}
                  <span className="lyra-body-sm text-lyra-fg-secondary">{entry.skillName}</span>
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

/** Summary content shown in `AgentNextGenPage`'s shared right-docked
 *  `InteriorPanel` slot when a Contact History row is clicked (that file's
 *  own `selectedContactHistoryEntry` state) — same "one-line status ·
 *  handle · when" meta line, then a bordered card with Duration + a notes
 *  field, that the Customer Information panel's own past-session
 *  "Conversation" tab already uses for its voice entries
 *  (`CustomerHistoryConversationContent` in
 *  agent-next-gen-customer-info-panel.tsx), reused here for visual
 *  consistency between the two "read a past contact's summary" experiences
 *  in this app. Not imported from that file directly, to avoid a circular
 *  import (that file already imports `ContactHistoryStatusVariant` from
 *  this one) — this is a small enough shape to redeclare locally instead.
 *
 *  `ContactHistoryEntry` (this card's own, simpler data shape) has no
 *  separate message-thread/email-subject fields to branch its layout on
 *  the way that richer `CustomerHistorySessionEntry` type does, and no real
 *  captured Date/timestamp either — every channel type here just shows
 *  `duration` + `description` under one notes label ("Call Notes" for
 *  voice, matching that same convention's own wording; "Chat Summary"/
 *  "Email Summary" for the other two), and the meta line uses `timeAgo`
 *  (a relative string, e.g. "8m ago") in place of that other panel's real
 *  formatted timestamp.
 *
 *  Per explicit follow-up request, the meta line's middle segment is
 *  `contactHistoryDisplayIdentity(entry)` (phone/email/WhatsApp handle,
 *  falling back to name only for Chat/unpopulated fields — see that
 *  function's own doc comment), not `entry.name` — the panel's own
 *  `headerTitle` (this component's caller, `AgentNextGenPage.tsx` et al.)
 *  already shows the customer's real name immediately above this line, so
 *  repeating it here was pure duplication (a customer's name showing up
 *  twice back to back). Unlike `ContactHistoryCard`'s own identical-looking
 *  swap, this one isn't gated behind `hideCustomerNames` — it always shows
 *  the handle, in every tier, since the point here isn't masking a name but
 *  avoiding restating one already on screen.
 *
 *  Per a further explicit follow-up ("please display the transcript/email
 *  body content/chat below the info box"), a second section renders below
 *  the Duration/notes box: voice/chat/SMS/WhatsApp rows get a synthesized
 *  message thread (`buildContactHistoryMessages`), and email rows get a
 *  synthesized, longer "Body" (`buildContactHistoryEmailBody`) distinct
 *  from the info box's own short summary. See those builders' own doc
 *  comments for why none of this is case-specific.
 *
 *  Per one more explicit follow-up on a voice row's own screenshot ("for
 *  voice can you have a fake transcript?" — then, with a reference
 *  screenshot of the desired layout: "i would prefer the voice transcript
 *  formatting like this"), voice's own section is labeled "Transcript"
 *  (the other three stay "Conversation") and renders each turn with
 *  `ContactHistoryTranscriptLine` (bold name + timestamp, spoken line
 *  below — see that component's own doc comment) instead of
 *  `ContactHistoryMessageBubble`'s chat-bubble layout, matching that
 *  reference screenshot exactly. */
export function ContactHistoryEntryDetail({ entry }: { entry: ContactHistoryEntry }) {
  const notesLabel =
    entry.channelType === "voice" ? "Call Notes" : entry.channelType === "email" ? "Email Summary" : "Chat Summary";
  const displayIdentity = contactHistoryDisplayIdentity(entry);
  const isVoice = entry.channelType === "voice";
  const isMessageChannel =
    isVoice || entry.channelType === "chat" || entry.channelType === "sms" || entry.channelType === "whatsapp";
  return (
    <div className="flex flex-col gap-3 p-4">
      <span className="lyra-body-sm text-lyra-fg-secondary">
        {[entry.statusLabel, displayIdentity, entry.timeAgo].filter(Boolean).join(" · ")}
      </span>
      <div className="rounded-lyra-md border border-lyra-border-subtle bg-lyra-bg-control-subtle overflow-hidden flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1 min-w-0">
          <Label label="Duration" />
          <span className="lyra-body-md text-lyra-fg-default break-words">{entry.duration}</span>
        </div>
        <div className="flex flex-col gap-1">
          <Label label={notesLabel} />
          <p className="lyra-body-md text-lyra-fg-default">{entry.description}</p>
        </div>
      </div>
      {isMessageChannel ? (
        <div className="flex flex-col gap-2">
          <Label label={isVoice ? "Transcript" : "Conversation"} />
          <div className="rounded-lyra-md border border-lyra-border-subtle flex flex-col gap-4 p-4">
            {buildContactHistoryMessages(entry).map((message, i) =>
              isVoice ? (
                <ContactHistoryTranscriptLine key={i} message={message} customerName={entry.name} />
              ) : (
                <ContactHistoryMessageBubble key={i} message={message} />
              )
            )}
          </div>
        </div>
      ) : entry.channelType === "email" ? (
        <div className="rounded-lyra-md border border-lyra-border-subtle bg-lyra-bg-control-subtle overflow-hidden flex flex-col gap-1 p-4">
          <Label label="Body" />
          <p className="lyra-body-md text-lyra-fg-default">{buildContactHistoryEmailBody(entry)}</p>
        </div>
      ) : null}
    </div>
  );
}
