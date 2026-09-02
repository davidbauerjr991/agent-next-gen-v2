import React, { useState, useRef, useLayoutEffect, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  AccordionHeadless,
  AccordionHeadlessItem,
  AccordionHeadlessContent,
  ContactOverview,
  type ContactOverviewInfo,
  ChatMessage,
  ActionIconButton,
  TagPicker,
  Tag,
  Button,
  Label,
  Tooltip,
  Popover,
  PanelHeader,
  WarningIconSolid,
  Menu,
  KebabMenuButton,
  Select,
  DispositionSelect,
  Textarea,
  Badge,
  QuickReplyVariableForm,
  QuickReplyMenu,
  type TagVariant,
  type TagPickerOption,
  type DispositionOption,
  type ChannelOutcomeConfig,
  type ChannelType,
  type QuickReplyField,
  type QuickReplyMenuItem,
  type MenuEntry,
} from "@nicecxone/lyra-ui";
import {
  Copy,
  User,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleCheck,
  UserX,
  ArrowDown,
  Paperclip,
  Bold,
  Italic,
  Smile,
  Zap,
  FileText,
  Send,
  FileDown,
  Languages,
  Trash2,
} from "lucide-react";
import {
  CURRENT_AGENT_FIRST_NAME,
  CURRENT_AGENT_LAST_NAME,
  initialsFor,
  quickReplyFieldDisplayValue,
} from "@/components/agent-next-gen-shared-utils";

/* ── Transcript + Composer ──
   Split out of AgentNextGenPage.tsx (which had grown past Babel's 500KB
   code-generator threshold — see that file's own top-of-file note): every
   message-bubble/session/transcript/composer piece that renders an
   interaction's actual conversation, plus the mock session/message data
   that seeds it. Genuinely self-contained — per a dependency-graph script
   run before the split, nothing here references any OTHER
   AgentNextGenPage-specific type/component/mock-data by name (only
   `agent-next-gen-shared-utils.ts`'s pure helpers) — so this file sits at
   the same "no incoming feature-file dependencies" tier as that one, just
   one level up. `AgentNextGenPage` itself imports `InteractionTranscript`/
   `InteractionComposer` (the two real render entry points) plus a handful
   of types/constants (`TranscriptMessage`, `OUTCOME_TAG_OPTIONS`, etc.)
   still referenced from its own outcome-popover/notification code. */

export interface TranscriptTag {
  id: string;
  label: string;
  variant: TagVariant;
}

export interface TranscriptMessage {
  id: string;
  sender: "customer" | "agent";
  name: string;
  initials: string;
  timestamp: string;
  text: string;
  tags?: TranscriptTag[];
}

/* Each `Contact` is one contact record within the interaction —
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
// `Contact.status` value not listed here, rather than throwing.
// Now covers every status the session-status popover offers (see
// `TRANSCRIPT_SESSION_STATUS_OPTIONS` just below) — "warning"/"info"/
// "purple"/"success"/"critical" read as orange/blue/purple/green/red, the
// same five hues that popover's own dot swatches use.
export const TRANSCRIPT_SESSION_STATUS_VARIANT: Record<string, TagVariant> = {
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
export const TRANSCRIPT_SESSION_STATUS_OPTIONS: { label: string; dotColor: string }[] = [
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
export const OUTCOME_TAG_OPTIONS: TagPickerOption[] = [
  { label: "Technical", variant: "info" },
  { label: "Account", variant: "purple" },
  { label: "Billing", variant: "warning" },
  { label: "General Support", variant: "teal" },
  { label: "VIP", variant: "critical" },
];

// Widened from 5 flat entries to 25, grouped into named sections
// (`category`) — real contact-center ACD/QM disposition-code vocabulary,
// per explicit request (own follow-up to the 15 agent-status "reason
// codes" stress test above: same idea, applied to the Outcome popover's
// Disposition field instead). `DispositionSelect` (disposition-select.tsx)
// is what actually renders these as collapsible sections with a
// per-row favorite star, replacing the flat searchable `Select` this field
// used before — see that component's own doc comment for why `Select`
// itself can't do sections. Category order here is section order there
// (first-seen, not alphabetical).
export const OUTCOME_DISPOSITION_OPTIONS: DispositionOption[] = [
  // Resolution
  { value: "Issue Resolved", label: "Issue Resolved", category: "Resolution" },
  { value: "First Contact Resolution", label: "First Contact Resolution", category: "Resolution" },
  { value: "Resolved - Self-Service", label: "Resolved - Self-Service", category: "Resolution" },
  { value: "Resolved - Knowledge Base Article", label: "Resolved - Knowledge Base Article", category: "Resolution" },
  // Escalation
  { value: "Escalated to Tier 2", label: "Escalated to Tier 2", category: "Escalation" },
  { value: "Escalated to Supervisor", label: "Escalated to Supervisor", category: "Escalation" },
  { value: "Escalated to Specialist Team", label: "Escalated to Specialist Team", category: "Escalation" },
  // Follow-Up
  { value: "Follow-Up Required", label: "Follow-Up Required", category: "Follow-Up" },
  { value: "Customer Callback Scheduled", label: "Customer Callback Scheduled", category: "Follow-Up" },
  { value: "Pending Customer Response", label: "Pending Customer Response", category: "Follow-Up" },
  { value: "Awaiting Parts / Inventory", label: "Awaiting Parts / Inventory", category: "Follow-Up" },
  // Transfer
  { value: "Transferred - Billing", label: "Transferred - Billing", category: "Transfer" },
  { value: "Transferred - Technical Support", label: "Transferred - Technical Support", category: "Transfer" },
  { value: "Transferred - Sales", label: "Transferred - Sales", category: "Transfer" },
  { value: "Transferred - Other Department", label: "Transferred - Other Department", category: "Transfer" },
  // No Resolution
  { value: "No Resolution", label: "No Resolution", category: "No Resolution" },
  { value: "Unable to Resolve", label: "Unable to Resolve", category: "No Resolution" },
  { value: "Duplicate Contact", label: "Duplicate Contact", category: "No Resolution" },
  { value: "Customer Disconnected", label: "Customer Disconnected", category: "No Resolution" },
  { value: "Abandoned Call", label: "Abandoned Call", category: "No Resolution" },
  // Account & Billing
  { value: "Billing Dispute Resolved", label: "Billing Dispute Resolved", category: "Account & Billing" },
  { value: "Refund Processed", label: "Refund Processed", category: "Account & Billing" },
  { value: "Account Information Updated", label: "Account Information Updated", category: "Account & Billing" },
  // Other
  { value: "Information Provided", label: "Information Provided", category: "Other" },
  { value: "Complaint Logged", label: "Complaint Logged", category: "Other" },
];

export const OUTCOME_DEFAULT_SUMMARY =
  "Interaction with davidbauerjr@gmail.com — customer concern reviewed and resolved. Agent provided clear guidance and confirmed next steps. Follow-up actions logged where applicable.";

/** Client/device metadata captured off a session's own originating client
 *  (OS/Browser/Language/Device Type/Application Type) — shown as a single
 *  "chat fingerprint" line in that session's `TranscriptSessionDetails`
 *  footer (per explicit request/reference screenshot). Optional on
 *  `Contact`; every channel now populates one (see the three
 *  `TRANSCRIPT_SESSION_FINGERPRINT*` consts right below — chat/SMS/WhatsApp
 *  share one shape, Voice and Email each get their own since "Browser"/
 *  "Application Type" mean something different for a WebRTC call or a
 *  webmail client than for a chat widget), so the footer now renders for
 *  every channel type rather than only text channels — per an explicit
 *  follow-up request after the original "text channels only" scoping. */
export interface TranscriptSessionFingerprint {
  os: string;
  browser: string;
  language: string;
  deviceType: string;
  applicationType: string;
}

// One shared, reused mock fingerprint per channel family (per the reference
// screenshot) rather than inventing slightly different device info per
// session — same "one plausible example, reused" pattern
// `OUTCOME_DEFAULT_SUMMARY` above already uses; there's no real per-session
// client telemetry anywhere in this app's data for it to vary by.
export const TRANSCRIPT_SESSION_FINGERPRINT: TranscriptSessionFingerprint = {
  os: "Windows 10",
  browser: "Edge v.150.0.0.0",
  language: "en-US",
  deviceType: "Desktop",
  applicationType: "Browser",
};

// Voice's own fingerprint — this app's Voice channel is a browser-based
// WebRTC call (not a plain PSTN handset), so a real OS/browser fingerprint
// still applies; "Application Type" reads "WebRTC Call" instead of "Browser"
// to reflect that it's the softphone leg of the browser session, not a
// regular page.
export const TRANSCRIPT_SESSION_FINGERPRINT_VOICE: TranscriptSessionFingerprint = {
  os: "macOS Sonoma",
  browser: "Chrome v.128.0.0.0",
  language: "en-US",
  deviceType: "Desktop",
  applicationType: "WebRTC Call",
};

// Email's own fingerprint — captured off the webmail client the customer
// replied from, hence "Application Type" reading "Webmail" rather than
// "Browser" (the browser row still names the specific webmail client).
export const TRANSCRIPT_SESSION_FINGERPRINT_EMAIL: TranscriptSessionFingerprint = {
  os: "Windows 11",
  browser: "Outlook Web Access",
  language: "en-US",
  deviceType: "Desktop",
  applicationType: "Webmail",
};

export interface Contact {
  id: string;
  contactId: string;
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

export const TRANSCRIPT_SESSIONS: Contact[] = [
  {
    id: "session-1",
    contactId: "CTX-20250722-08841",
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
    contactId: "CTX-20250723-09234",
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

// Voice's own session — see `Contact`'s own doc comment above for
// why `messages` is empty here. One closed/"Resolved" session is enough to
// show the separator + Session Details for a call, same as chat's own mock
// log demonstrates it for SMS/WhatsApp.
export const TRANSCRIPT_SESSIONS_VOICE: Contact[] = [
  {
    id: "session-voice-1",
    contactId: "CTX-20250718-04417",
    date: "July 18, 2025",
    startTime: "11:02 AM",
    endTime: "11:19 AM",
    channel: "Voice",
    skill: "Voice Support",
    agent: "John Smith",
    status: "Resolved",
    fingerprint: TRANSCRIPT_SESSION_FINGERPRINT_VOICE,
    messages: [],
  },
];

// Email's own session — same reasoning as `TRANSCRIPT_SESSIONS_VOICE` just
// above.
export const TRANSCRIPT_SESSIONS_EMAIL: Contact[] = [
  {
    id: "session-email-1",
    contactId: "CTX-20250719-05532",
    date: "July 19, 2025",
    startTime: "3:41 PM",
    endTime: "3:58 PM",
    channel: "Email",
    skill: "Email Support",
    agent: "John Smith",
    status: "Resolved",
    fingerprint: TRANSCRIPT_SESSION_FINGERPRINT_EMAIL,
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
export const CUSTOMER_AUTO_REPLY_POOL = [
  "Thanks, got it!",
  "Okay, that makes sense.",
  "Appreciate the quick response.",
  "Got it, thank you!",
  "Sounds good, thanks for the help.",
  "Perfect, that answers my question.",
];

/** Per explicit request ("when that quick reply is typed make sure Marcus
 *  responds with 'That's great! Thanks for the quick reply'"), the
 *  "Acknowledge" quick reply (`QUICK_REPLIES` above) gets its own scripted
 *  simulated-customer response instead of a random `CUSTOMER_AUTO_REPLY_POOL`
 *  pick — reads as a direct reaction to the agent's specific message rather
 *  than a generic one. Not actually Marcus-specific (the request's own
 *  screenshot just happened to be an interaction with a customer named
 *  Marcus Webb) — this applies to every simulated customer reply, in every
 *  interaction, on every tier, exactly like `CUSTOMER_AUTO_REPLY_POOL`
 *  itself already does. */
export const ACKNOWLEDGE_QUICK_REPLY_RESPONSE = "That's great! Thanks for the quick reply";

/** Resolves the canned simulated-customer reply text for a given
 *  `handleSendMessage` call — the single place all 3 tiers' own
 *  `window.setTimeout` simulated-reply callbacks should call instead of
 *  reading `CUSTOMER_AUTO_REPLY_POOL` directly, so the "Acknowledge" special
 *  case (and any future one like it) only needs to be taught here once. */
export function resolveCustomerAutoReply(agentMessageText: string): string {
  const acknowledgeTemplate = QUICK_REPLIES.find((reply) => reply.id === "acknowledge")?.template;
  if (acknowledgeTemplate && agentMessageText === acknowledgeTemplate) {
    return ACKNOWLEDGE_QUICK_REPLY_RESPONSE;
  }
  return CUSTOMER_AUTO_REPLY_POOL[Math.floor(Math.random() * CUSTOMER_AUTO_REPLY_POOL.length)];
}

// Expanded to 25 (per explicit request, to actually exercise TagPicker's
// scrollable checkbox list rather than a 5-row set that never needed to
// scroll) — a realistic support-conversation tag vocabulary, not filler:
// sentiment/feedback tags (Complain/Praise/...), the common request
// categories an agent would tag a message with (Billing/Refund/
// Cancellation/...), and a few urgency/risk markers (Escalation/Fraud
// Alert/Churn Risk). Still only `default`/`success`/`warning`/`critical`/
// `info`/`neutral` variants — see this file's own note above reserving
// `purple`/`teal`/`pink` for channel-type coloring.
export const QUICK_TAG_OPTIONS: Omit<TranscriptTag, "id">[] = [
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
   `InteractionTranscript` so it can be looped once per `Contact`
   instead of once for the whole (now session-grouped) transcript. Tag
   add/remove and the copy action are still owned by `InteractionTranscript`
   (tag state lives per-session there) — this component is just a thin
   wrapper over lyra-ui's own `ChatMessage`, taking the handlers/state
   `InteractionTranscript` already owns and threading them straight
   through. `ChatMessage` now owns the actual bubble/toolbar/tags markup
   (ported from what used to be hand-rolled directly in this function —
   the two were kept in sync by hand for a while, this replaces that with
   a real shared component) — see that component's own doc comment
   (chat-message.tsx, lyra-ui) for the one deliberate layout change it
   made along the way: the timestamp now sits before the name in the
   header row ("9:51 AM · John Smith") instead of its own line inside the
   bubble. This wrapper's own external prop shape is unchanged, so every
   existing call site below needed zero changes. */
export function TranscriptMessageBubble({
  message,
  tagPickerOpen,
  onTagPickerOpenChange,
  onAddTag,
  onRemoveTag,
  onClearTags,
  onCopy,
  narrow = false,
}: {
  message: TranscriptMessage;
  tagPickerOpen: boolean;
  onTagPickerOpenChange: (open: boolean) => void;
  onAddTag: (option: Omit<TranscriptTag, "id">) => void;
  onRemoveTag: (tagId: string) => void;
  onClearTags: () => void;
  onCopy: () => void;
  /** True below 400px of the transcript's own rendered width — see
   *  `InteractionTranscript`'s own `transcriptNarrow` state (its
   *  `ResizeObserver`) for how this is measured. Drops the sender avatar
   *  only — the bubble's own max-width (80%, full below 768px) is a
   *  SEPARATE breakpoint `ChatMessage` measures and applies entirely on
   *  its own (see that component's own doc comment, lyra-ui), not
   *  something this prop controls. */
  narrow?: boolean;
}) {
  return (
    <ChatMessage
      variant={message.sender}
      name={message.name}
      initials={message.initials}
      timestamp={message.timestamp}
      text={message.text}
      narrow={narrow}
      onCopy={onCopy}
      tagOptions={QUICK_TAG_OPTIONS}
      tags={message.tags}
      tagPickerOpen={tagPickerOpen}
      onTagPickerOpenChange={onTagPickerOpenChange}
      onAddTag={onAddTag}
      onRemoveTag={onRemoveTag}
      onClearTags={onClearTags}
    />
  );
}

/** "Customer is typing" bubble — shown in place of the next message while a
 *  simulated customer reply is pending (chat/SMS/WhatsApp only, per explicit
 *  request; see `InteractionTranscript`'s own `isCustomerTyping` doc comment
 *  for how the caller derives/times this). Deliberately built off
 *  `TranscriptMessageBubble`'s own customer-side markup rather than a new
 *  one-off shape — same avatar sizing/color (`bg-lyra-accent-green-soft`/
 *  `text-lyra-accent-green-strong`), same `rounded-lyra-lg ... rounded-tl-
 *  none bg-lyra-state-hover` bubble a real customer message renders in — so
 *  the indicator reads as "the next one of these bubbles is on its way," not
 *  a differently-styled system notice. `displayInitials` — the same real-
 *  customer-name substitution `InteractionTranscript` already applies to
 *  every actual customer message (see that component's own doc comment) —
 *  is threaded in here too, so the indicator's avatar matches whichever
 *  initials the customer's real messages are showing, not the hardcoded
 *  mock "C" placeholder.
 *  Three dots, `animate-bounce` (Tailwind's stock keyframe) with a staggered
 *  `animationDelay` per dot (0ms/150ms/300ms) — the standard "typing"
 *  cadence, rather than a bespoke keyframe just for this one usage. */
function TypingIndicator({
  initials,
  narrow = false,
  bubbleFullWidth = false,
}: {
  initials: string;
  narrow?: boolean;
  /** True below 768px of the transcript's own rendered width — matches the
   *  real message bubbles' own independent max-width breakpoint (see
   *  `ChatMessage`'s own doc comment, lyra-ui) so this bubble doesn't read
   *  as a different width than whichever real one follows it. A separate
   *  prop from `narrow` (400px, avatar only) — see
   *  `InteractionTranscript`'s own `transcriptBubbleFullWidth` state for
   *  how this is measured. */
  bubbleFullWidth?: boolean;
}) {
  return (
    <div className="flex flex-col items-start" aria-live="polite" aria-label="Customer is typing">
      <div className={cn("flex items-start gap-2", bubbleFullWidth ? "max-w-full" : "max-w-[80%]")}>
        {!narrow && (
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lyra-accent-green-soft text-lyra-accent-green-strong lyra-body-sm-emphasis"
            aria-hidden="true"
          >
            {initials}
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <div className="rounded-lyra-lg rounded-tl-none border border-transparent bg-lyra-state-hover px-4 py-3.5">
            <div className="flex items-center gap-1">
              {[0, 150, 300].map((delayMs) => (
                <span
                  key={delayMs}
                  className="block h-1.5 w-1.5 animate-bounce rounded-full bg-lyra-fg-secondary"
                  style={{ animationDelay: `${delayMs}ms` }}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
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
export function TranscriptSessionDetails({ session }: { session: Contact }) {
  const rows: Array<[string, string, string, string]> = [
    ["Contact ID", session.contactId, "Date", session.date],
    ["Start", session.startTime, "End", session.endTime],
    ["Channel", session.channel, "Skill", session.skill],
    ["Agent", session.agent, "Status", session.status],
  ];
  // "Chat fingerprint" footer (per explicit request/reference screenshot) —
  // `session.fingerprint` is populated for every channel now (see
  // `TranscriptSessionFingerprint`'s own doc comment), so this only reads
  // `undefined`/omits the footer for a session with no fingerprint data at
  // all (there currently isn't one, but the guard stays defensive).
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
    // Per explicit request, capped to 225px with its own internal scroll
    // once content overflows that. Scroll/height live on THIS outer div,
    // deliberately kept separate from the inner `lyra-form-grid-wrap` div
    // below (rather than merged onto one element) — `lyra-form-grid-wrap`
    // sets `container-type: inline-size` (lyra-tokens.css) to drive the
    // `.lyra-form-grid` two-column container-query breakpoints, and
    // combining that containment context with `overflow-y-auto`/
    // `max-height` on the SAME element was clipping the fingerprint
    // footer (the row after `.map`) even while scrolled — a container-type
    // element establishes its own containment/formatting context, which
    // doesn't play well stacked with scroll-clipping on that exact box.
    // Two plain, single-purpose boxes avoids the interaction entirely.
    <div className="max-h-[225px] overflow-y-auto rounded-lyra-md border border-lyra-border-subtle bg-lyra-bg-control-subtle">
      <div className="flex flex-col gap-3 p-4 lyra-form-grid-wrap">
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
          // Per explicit request: one single inline text flow, not the
          // two-per-row grid the fields above use — but wraps onto
          // additional lines rather than truncating to an ellipsis when it
          // doesn't fit on one line (an earlier version used `truncate`
          // here; per explicit follow-up request that hid fields when the
          // card narrowed, so this now just lets it wrap like normal text).
          // `border-t` sets this apart as the card's own footer, same
          // divider treatment `Popover`'s own footer slot elsewhere in this
          // file already uses between body content and a trailing row.
          <p className="border-t border-lyra-border-subtle pt-3 lyra-body-sm text-lyra-fg-secondary">
            {fingerprintFields.map(([label, value], i) => (
              <React.Fragment key={label}>
                {i > 0 && <span aria-hidden="true"> | </span>}
                <span className="lyra-body-sm-emphasis text-lyra-fg-default">{label}</span> {value}
              </React.Fragment>
            ))}
          </p>
        )}
      </div>
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

   Session Details' open/close is animated via lyra-ui's headless
   accordion building blocks (AccordionHeadless/-Item/-Content, see
   accordion.tsx) rather than the styled Accordion component — that component always renders its own trigger
   row (a full-width button with its own chevron) plus a border-b divider
   after every item, neither of which fits here: the real trigger is the
   "# CTX-..." pill button below, and this feature was explicitly built
   with no dividers. Reusing the bare building blocks keeps the actual
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
export function TransferIcon() {
  return (
    <span className="relative inline-flex h-4 w-4 items-center justify-center" aria-hidden="true">
      <User className="h-4 w-4" strokeWidth={1.5} />
      <ArrowUpRight className="absolute -right-1 -top-1 h-2.5 w-2.5" strokeWidth={2.5} />
    </span>
  );
}

/** Status pill + its Popover/Menu/"Close Contact?" confirm-view dropdown —
 *  extracted out of `TranscriptSessionSeparator`'s own status tag (below,
 *  which still uses this for its per-session row) so `AgentNextGenPage.tsx`'s
 *  record header can render the exact same control (Agent Workspace 2.0
 *  only — see that file's own `showChannelTabRow`/`showSessionActionCluster`
 *  doc comments) once the session row's own copy is hidden there, per
 *  explicit request, rather than hand-duplicating this ~100-line Popover a
 *  second time. Fully controlled, no state of its own — `menuOpen`/
 *  `menuView` (and their change handlers) are owned by whichever caller
 *  needs them: `InteractionTranscript`'s own per-session `statusMenuOpenId`/
 *  `statusMenuView` state for the session-row usage (only one status
 *  popover open across every session in a transcript at a time), a lone
 *  local `useState` pair for the header's single-instance usage. */
export function ChannelStatusTag({
  status,
  menuOpen,
  menuView,
  onMenuOpenChange,
  onSelectStatus,
  onConfirmClose,
  onCancelClose,
  disabled,
}: {
  status: string;
  menuOpen: boolean;
  menuView: "menu" | "confirm";
  onMenuOpenChange: (open: boolean) => void;
  /** A non-"Closed" status picked straight from the list — applies
   *  immediately and closes the popover. Picking "Closed" itself doesn't
   *  call this; see `onConfirmClose` below. */
  onSelectStatus: (status: string) => void;
  /** "Close" clicked on the confirm view — actually applies the "Closed"
   *  status and closes the popover. */
  onConfirmClose: () => void;
  /** "Cancel" clicked on the confirm view — closes the popover without
   *  changing anything. */
  onCancelClose: () => void;
  /** Locks the trigger once already "Closed" — same "no way back in from
   *  here" reasoning `TranscriptSessionSeparator`'s own `isClosed` doc
   *  comment covers. */
  disabled?: boolean;
}) {
  return (
    <Popover
      open={menuOpen}
      onOpenChange={onMenuOpenChange}
      placement="bottom"
      align="end"
      className="w-72"
      bodyPadding={menuView === "confirm"}
      header={
        menuView === "confirm" ? (
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
        menuView === "confirm" ? (
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
        menuView === "confirm" ? (
          <p className="pb-2 pt-1 lyra-body-md text-lyra-fg-secondary">
            Closing a contact cannot be undone. Are you sure you want to close this contact?
          </p>
        ) : (
          <Menu
            bare
            items={TRANSCRIPT_SESSION_STATUS_OPTIONS.map((option) => ({
              id: option.label,
              label: option.label,
              active: option.label === status,
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
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="h-auto shrink-0 rounded-full p-0 disabled:opacity-100"
      >
        <Tag
          label={status}
          variant={TRANSCRIPT_SESSION_STATUS_VARIANT[status] ?? "neutral"}
          shape="pill"
          trailingIcon={
            !disabled && (
              <ChevronDown
                className={cn("transition-transform", menuOpen && "rotate-180")}
                strokeWidth={1.5}
              />
            )
          }
        />
      </Button>
    </Popover>
  );
}

export function TranscriptSessionSeparator({
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
  isCurrentSession,
  showActionCluster = true,
  isNewThread = false,
  collapsed = false,
  onToggleCollapsed,
  compactHeader = false,
  hideFade = false,
}: {
  session: Contact;
  open: boolean;
  onToggle: () => void;
  /** This session's own message (chat bubble) count — shown as "{n}
   *  Messages | " right before "# contactId · date", same "Messages | #id"
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
   *  contactId · date" pill — per explicit request. Only meaningful/passed
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
   *  own `dimmed` prop is already built from (`Interaction.closed` OR
   *  this channel's own `threadStatuses` entry reading "Closed" — see that
   *  prop's own doc comment for the full picture). */
  channelClosed?: boolean;
  /** True only for the CURRENT session — `InteractionTranscript`'s own
   *  `lastSessionId` check, passed down rather than re-derived here. Per
   *  explicit request/bug report: `isClosed` below used to read THIS
   *  session's own `status` field ("Closed" or not) instead of this — a
   *  real, confirmed bug, since a Thread can accumulate more than one
   *  historical session whose own logged status was never literally
   *  "Closed" (e.g. two "Resolved" mock sessions stacked in
   *  `TRANSCRIPT_SESSIONS`), which showed as two simultaneously "open"
   *  looking rows, both with a seemingly-live Consult/Transfer + Outcome
   *  cluster. There should never be more than one non-Closed session in a
   *  Thread — only the current one is ever actually live — so `isClosed`
   *  now derives purely from POSITION (is this the current session, or
   *  not) rather than trusting each session's own possibly-stale `status`
   *  field. See `InteractionTranscript`'s own `getSessionStatus` for the
   *  matching fix on the DISPLAYED status label (every non-current session
   *  now always reads "Closed", regardless of what it was logged with). */
  isCurrentSession: boolean;
  /** Per explicit request (Agent Workspace 2.0 only — see
   *  `AgentNextGenPage.tsx`'s own `showSessionActionCluster` doc comment at
   *  its `InteractionTranscript` call site): once that record header grew
   *  its own icon-button cluster covering these exact same actions (plus a
   *  relocated copy of the status tag itself), this row's own copy became
   *  redundant. Defaults `true` (Premium/Advanced, and every other call
   *  site, keep the cluster exactly as before — only the one 2.0 call site
   *  threads `false` through). */
  showActionCluster?: boolean;
  /** True for a brand-new, agent-initiated OUTBOUND thread with no real
   *  history yet (`Interaction.startedFresh` — passed straight through
   *  from `InteractionTranscript`'s own prop of the same name; see that
   *  prop's own doc comment for the full "outbound vs. customer-initiated"
   *  reasoning). Per explicit request: a thread in this state hasn't
   *  earned Consult/Transfer, Outcome, or Unassign & Dismiss yet — there's
   *  no one to transfer to, no outcome to log, and nothing to unassign
   *  from — so all three are hidden here (current session only; a
   *  historical session already hides them via `isClosed`, `isNewThread`
   *  doesn't change that). The status tag stays (still meaningful — a
   *  fresh thread is genuinely "Open", not blank), and in place of the
   *  red Unassign & Dismiss button, a red trash-icon "Delete Draft" button
   *  takes over `onDismiss`'s wiring — same delete-draft markup lyra-ui's
   *  own `ChannelRow`/`ChannelTab` already fall back to once THEIR kebab is
   *  similarly hidden (`removable`/`removeVariant`/`showMenu`, channel-
   *  row.tsx), reused here for visual consistency across all three "new
   *  thread" surfaces.
   *  Per an explicit clarifying follow-up, only ever `true` for outbound —
   *  a new thread opened BY the customer keeps the full normal cluster,
   *  same as any other live thread with real history. Defaults `false`;
   *  every existing call site is unaffected until `InteractionTranscript`
   *  starts threading a real value through. */
  isNewThread?: boolean;
  /** Whether this CLOSED session's transcript content — this session's own
   *  message bubbles, rendered by `InteractionTranscript` as a sibling of
   *  this whole component, not a child of it — is currently collapsed
   *  away. Purely a display flag here: this component owns no message
   *  content itself, so `collapsed` only drives which icon
   *  (`ChevronsDownUp`/`ChevronsUpDown`) the collapse button next to the
   *  status tag shows; `InteractionTranscript` is what actually animates
   *  its own message-content wrapper open/shut off this same session's
   *  `collapsedSessionIds` entry. */
  collapsed?: boolean;
  /** Toggles `collapsed` for this session. Passing this is what renders the
   *  collapse icon at all, immediately right of the status tag — same
   *  "which direction does the next click applies" idiom lyra-ui's own
   *  `AssignmentsExpandCollapseAllButton` uses. Only ever shown for a
   *  session whose status reads "Closed" (`session.status`, via
   *  `InteractionTranscript`'s own `getSessionStatus`) — an in-progress
   *  session has nothing to collapse away yet. */
  onToggleCollapsed?: () => void;
  /** Per explicit request: below 768px of the transcript's own container
   *  width, the left-hand "{n} Messages | # contactId · date" cluster hides
   *  entirely, leaving only "View Details" + the expand/collapse chevron —
   *  the goal being to keep the right-hand action cluster (Consult/
   *  Transfer, Outcome, status tag, Unassign & Dismiss) pinned on the same
   *  row instead of wrapping onto its own line (`flex-wrap` on the row
   *  above) as the container narrows. `InteractionTranscript`'s own call
   *  site passes its already-measured `transcriptBubbleFullWidth` (see that
   *  state's own doc comment — the SAME `<768px` ResizeObserver reading
   *  the chat-bubble-width breakpoint already uses, off the same scroll
   *  container this row lives in) rather than this component measuring its
   *  own width a second time. Defaults `false` — every other call site (if
   *  any are ever added) keeps the full label. */
  compactHeader?: boolean;
  /** Suppresses this separator's own trailing bottom fade (see that div's
   *  doc comment just below for what it normally does). Only ever needed
   *  for a session whose FIRST piece of scrolling content underneath is
   *  the `ContactOverview` block (`InteractionTranscript`'s own
   *  `contactOverview` prop) — that block sits flush against this
   *  separator, so the fade's `-bottom-8` band was painting straight over
   *  its "Contact Overview" heading instead of just softening real
   *  message bubbles further down. Every other session (fade landing on
   *  actual messages, which is the whole point) leaves this `false`. */
  hideFade?: boolean;
}) {
  const isClosed = !isCurrentSession || !!channelClosed;
  // Local to the Outcome popover's own "Status" field — same "one popover
  // instance, two possible bodies (list vs. Closed confirm)" pattern this
  // component's own session-status pill dropdown already uses above
  // (`statusMenuView`), and the exact same shape `ChannelRow`'s Outcome
  // popover uses for its identical field (channel-row.tsx).
  const [outcomeResolutionMenuOpen, setOutcomeResolutionMenuOpen] = useState(false);
  const [outcomeResolutionMenuView, setOutcomeResolutionMenuView] = useState<"menu" | "confirm">("menu");
  return (
    <AccordionHeadless
      type="single"
      collapsible
      value={open ? session.id : ""}
      onValueChange={() => {}}
      // Per explicit follow-up request, un-reverting an earlier revert
      // ("dang - revert that last change - go back to full screen width"):
      // back to full-width again — the outer scroll wrapper (`Interaction
      // Transcript`'s own call site, see its doc comment) is unconstrained
      // (`w-full`, no max-width) once more, so this root carries its own
      // `px-6` directly again instead of inheriting a constrained parent's
      // inset. `px-6` lives HERE (not on a wrapping div) for the same
      // sticky-containing-block reasoning already established: a sticky
      // element's stickiness bounds are its own immediate parent's box — a
      // wrapper holding ONLY this separator has zero extra height to stick
      // through. This root stays a DIRECT sibling of the per-session
      // message content (both children of the same `<div key={session.id}>`,
      // which has real height) — that part was never touched by either the
      // revert or this un-revert.
      className="sticky top-0 z-[1] bg-lyra-bg-surface-base px-6"
    >
      {/* `border-b border-lyra-border-subtle` lives on this `Item`, not the
          sticky `Root` above (a first attempt there didn't render — see
          `Root`'s own comment history) and not the collapsed row `div`
          below (an intermediate attempt there put the border right after
          the row's text, ABOVE the expanded "Session Details" panel when
          open — per explicit follow-up request "put the border ... below
          the session information when it is open," it needed to sit below
          BOTH the collapsed row AND `Content` when expanded, i.e. at the
          bottom of the whole Item, not the row alone). */}
      <AccordionHeadlessItem value={session.id} className="border-b border-lyra-border-subtle">
        <div className="flex flex-wrap items-center justify-between gap-3 py-2">
          {/* Flat, left-aligned case info — no wrapping pill border/
              background and no flanking divider lines (per earlier design
              update matching the reference screenshot): plain inline
              content. The status tag itself sits at the far right (see the
              Consult/Transfer + Outcome cluster below). Customer name +
              channel address used to sit here too, ahead of "# contactId ·
              date" — per explicit follow-up request, dropped as redundant
              (not just hidden): both are already shown elsewhere for this
              same conversation (the record-header tab's own face/tooltip,
              the Customer Information panel), so repeating them on every
              single session row added noise without new information. This
              component no longer takes `customerName`/`channelAddress`
              props at all as a result — see `InteractionTranscript`'s own
              call site, which no longer passes them either. (A later
              follow-up briefly reinstated `customerName` here, conditional
              on the Customer Information panel being closed — once that
              panel permanently docked to the right of the page, the
              condition itself stopped applying, so this was dropped again
              for good rather than kept as another toggle.)

              `flex-wrap` on the row above — per explicit follow-up request,
              when the container narrows the Consult/Transfer + Outcome +
              status tag cluster should break onto its own line rather than
              clipping/overflowing (an earlier overflow-hidden/truncate
              attempt was the wrong read of the request — undone here). The
              right-hand cluster below lost its `ml-auto` for the same
              reason — it now left-aligns under this cluster once wrapped,
              rather than floating to the far right on its own line. */}
          <div className="flex flex-wrap items-center gap-1.5 lyra-body-sm text-lyra-fg-secondary">
            {/* "# contactId · date" + "View Details" + the expand/collapse
                chevron — per explicit request, stays a real, always-
                toggleable `Button` regardless of `isClosed`: a closed
                session's own Session Details can still be opened/collapsed
                to review it, same as an open one — only the status chip/
                composer/etc. actually lock down once closed, not this.
                (Previously swapped to plain, non-interactive text here once
                `isClosed` — that's been removed.)

                Per a later explicit request, "View Details" is now real,
                always-visible text (a link-styled span, `text-lyra-fg-link`
                — same token `DesktopDesignsPage.tsx`'s own inline text link
                uses) between the date and the chevron, not just a hover
                tooltip — the `Tooltip` that used to carry this exact same
                string on hover was removed as redundant once the text
                itself is always on-screen. The "{n} Messages | # contactId ·
                date" portion is now its own inner `span` (its own
                `inline-flex items-center gap-1.5` to keep that internal
                spacing once it's no longer a set of direct flex children of
                the outer `Button`) so it can be hidden as one unit via
                `compactHeader` (that prop's own doc comment) — leaving just
                "View Details" + the chevron once the container narrows
                below 768px, which is the whole point: less content on this
                side means the right-hand action cluster has room to stay on
                this same row instead of wrapping under it. */}
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
              <span className={cn("inline-flex items-center gap-1.5", compactHeader && "hidden")}>
                {/* Per explicit follow-up request ("add the channel type to
                    the summary row at the left (voice, sms, webchat, chat,
                    whatsapp, etc.)") — `session.channel` is already a real,
                    populated display label on every `Contact` this row ever
                    renders (`freshSessionChannelLabel`/the historical mock
                    arrays above all set it), so this just surfaces it rather
                    than adding a new field. Grouped inside this same
                    collapsible span (not a separate always-visible one) so
                    it hides together with the rest of this cluster under
                    `compactHeader`, same reasoning as every other piece
                    here. */}
                <span>{session.channel}</span>
                <span aria-hidden="true">|</span>
                {messageCount != null && (
                  <>
                    <span>{messageCount} Message{messageCount === 1 ? "" : "s"}</span>
                    <span aria-hidden="true">|</span>
                  </>
                )}
                <span aria-hidden="true">#</span>
                <span>{session.contactId}</span>
                <span aria-hidden="true">·</span>
                <span>{session.date}</span>
              </span>
              {/* Divider between the date cluster and "View Details" — same
                  plain "|" glyph this row already uses for the messageCount/
                  contactId divider above, for visual consistency. Hidden
                  together with the date cluster under `compactHeader`
                  (rather than its own separate condition) since it only
                  means anything as a separator BETWEEN two visible things —
                  once the date cluster hides, there's nothing left of "View
                  Details" for a leading divider to separate it from. */}
              {!compactHeader && <span aria-hidden="true">|</span>}
              <span className="text-lyra-fg-link hover:underline">View Details</span>
              {open ? (
                <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              )}
            </Button>
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
              — per explicit request, was `gap-0` (flush together). Per
              later explicit follow-up, this whole cluster (Transfer,
              Outcome, status chip, Unassign & Dismiss alike) is gated on
              `showActionCluster` — see that prop's own doc comment for the
              2.0-only reasoning. */}
          {showActionCluster && (
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
            {!isClosed && !isNewThread && (
              <Button variant="icon" size="icon-sm" title="Consult / Transfer" className="text-lyra-fg-secondary">
                <TransferIcon />
              </Button>
            )}
            {!isNewThread && (outcome && !isClosed ? (
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
                    <DispositionSelect
                      label="Disposition code"
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
            ))}
            {/* Kebab (Send/Download/Translate) — per explicit request
                (mockup's "Kebab Menu" callout), the same consolidated
                "More Options" trigger each page's own record-header cluster
                now renders (see those files' own header `actions` call
                sites) also belongs down here once it's THIS row, not the
                header, carrying the action cluster — i.e. once 2+ channels
                are open (`showActionCluster` true) and this is a live,
                non-draft session. Same `!isClosed && !isNewThread` gate as
                Consult/Transfer and Outcome right above — a closed session
                or a still-draft thread has nothing to send/download/
                translate yet either. 3 decorative, unwired items, same as
                every other copy of this menu in this app. */}
            {!isClosed && !isNewThread && (
              <KebabMenuButton
                ariaLabel="More Options"
                align="right"
                items={
                  [
                    {
                      id: "send-transcript",
                      label: "Send Transcript",
                      icon: <Send className="h-4 w-4" strokeWidth={1.5} />,
                      onClick: () => {},
                    },
                    {
                      id: "download-transcript",
                      label: "Download Transcript",
                      icon: <FileDown className="h-4 w-4" strokeWidth={1.5} />,
                      onClick: () => {},
                    },
                    {
                      id: "translate-messages",
                      label: "Translate Messages",
                      icon: <Languages className="h-4 w-4" strokeWidth={1.5} />,
                      onClick: () => {},
                    },
                  ] satisfies MenuEntry[]
                }
              />
            )}
            {/* Status tag — moved to the far right of the Consult/Transfer +
                Outcome cluster (was previously the leading element at the
                far left of this row) per explicit request. Same Popover/
                Menu/confirm-view behavior as before, just relocated —
                and, since a later request, extracted into its own
                `ChannelStatusTag` (above) so `AgentNextGenPage.tsx`'s
                record header can render the identical control once this
                row's own copy is hidden there (2.0 only).
                Per explicit follow-up request, also hidden for a brand-new
                outbound thread (`isNewThread`) — same reasoning as
                Consult/Transfer/Outcome/the kebab right above: a genuine,
                never-launched draft has no real status yet either, so this
                session row collapses down to ONLY the Delete Draft trash
                button (further below) once `isNewThread`, matching the
                mockup's 2+-channel draft state exactly. Previously this was
                the one piece of the cluster that stayed visible regardless
                of `isNewThread` — a real, confirmed bug fixed here
                alongside the header's own identical fix. */}
            {!isNewThread && (
              <ChannelStatusTag
                status={session.status}
                menuOpen={statusMenuOpen}
                menuView={statusMenuView}
                onMenuOpenChange={onStatusMenuOpenChange}
                onSelectStatus={onSelectStatus}
                onConfirmClose={onConfirmClose}
                onCancelClose={onCancelClose}
                disabled={isClosed}
              />
            )}
            {/* Collapse icon — immediately right of the status tag, only for
                a session that actually reads "Closed" and only once
                `onToggleCollapsed` is passed (a caller that doesn't support
                collapsing closed sessions just omits it, same "renders for
                real regardless of a handler, or omit the slot entirely"
                shape the rest of this cluster already uses). Collapses this
                session's own message content — animated, owned by
                `InteractionTranscript` — while this whole row stays put;
                see `onToggleCollapsed`'s own doc comment above. */}
            {session.status === "Closed" && onToggleCollapsed && (
              <Tooltip content={collapsed ? "Expand session" : "Collapse session"} placement="bottom">
                <Button
                  variant="icon"
                  size="icon-sm"
                  aria-label={collapsed ? "Expand session" : "Collapse session"}
                  aria-expanded={!collapsed}
                  className="text-lyra-fg-secondary"
                  onClick={onToggleCollapsed}
                >
                  {collapsed ? (
                    <ChevronsUpDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                  ) : (
                    <ChevronsDownUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )}
                </Button>
              </Tooltip>
            )}
            {/* Unassign & Dismiss — immediately right of the status tag, per
                explicit request. Same icon/action `ChannelTab`'s own kebab
                entry uses for this channel (see `onDismiss`'s own doc
                comment above for the exact scoping/wiring); only rendered
                at all for the current session, so there's no dead button on
                historical rows. `UserX` (not a warning/alert glyph) — per
                explicit correction, this isn't a warning; it just removes
                the agent from the assignment, and sharing `TriangleAlert`
                with the SLA-severity tab icon made the two easy to
                confuse at a glance.
                Per later explicit follow-up request, restyled from a plain
                neutral icon button to a labeled outline-critical `Button`
                — same reasoning/exact same composed classes as the
                record-header's own now-matching copy of this button
                (Agent Workspace 2.0's icon-button cluster,
                AgentNextGenPage.tsx — see that call site's own doc comment
                for why no named `outline`+`critical` `Button` variant
                exists to reach for instead). `size="sm"` (24px) — matches
                this row's OTHER buttons (`icon-sm`, also 24px), unlike the
                header's own copy which sizes up to `md` (32px) to match
                that row's taller buttons instead.
                Per a later explicit follow-up request ("use a ghost button
                error variant"): `variant="outline"` (bordered) →
                `variant="ghost"` with the `border-lyra-status-critical-
                strong`/`hover:border-lyra-status-critical-strong` classes
                dropped — same critical-red icon color and
                `hover:bg-lyra-status-critical-subtle`/`active:bg-lyra-
                status-critical-medium` background states as before, just
                borderless now. Exactly the same `outline` → `ghost`
                treatment the record-header's own copy of this button
                already got (there's still no named `ghost`+`critical`
                `Button` variant, so this remains composed via `className`
                the same way — see that call site's own doc comment,
                AgentNextGenPage.tsx).
                For a brand-new outbound thread (`isNewThread`), this real
                button is swapped for a red trash-icon "Delete Draft"
                button instead — per explicit request, since closing a
                genuine, untouched draft (no message sent yet) actually
                deletes it outright rather than just dismissing a live
                assignment (see `onDismiss`'s own caller for the matching
                "skip Contact History" branch that pairs with this).
                Per a later explicit follow-up request ("make the delete
                icons in the session rows ghost button error variants that
                say 'Delete Draft'"): `variant="icon"` (icon-only, label
                only in the `title` tooltip) → `variant="ghost"` with the
                label rendered as visible text alongside the icon — same
                `text-lyra-status-critical-strong`/`hover:bg-lyra-status-
                critical-subtle`/`active:bg-lyra-status-critical-medium`
                "ghost + critical" color treatment the Unassign & Dismiss
                button just below already uses (there's still no named
                `ghost`+`critical` `Button` variant, so this stays composed
                via `className`). `size="sm"` (24px, labeled) instead of
                `size="icon-sm"` (also 24px, but icon-only) — the row has
                room for it since this button fully replaces the rest of
                the cluster for a draft thread (see this branch's own
                `isNewThread` gating above). `title` dropped since the
                label is visible text now, not just a tooltip. This ONE
                session-row copy only, per the request's own wording — the
                LeftNav card kebab and record-header tab kebab's matching
                `removeVariant="delete-draft"` fallback (channel-row.tsx)
                intentionally kept their original icon-only treatment,
                since neither was mentioned and both are much tighter
                spaces (a card row / a tab) than this session row has. */}
            {isNewThread
              ? onDismiss && !isClosed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 shrink-0 text-lyra-status-critical-strong hover:bg-lyra-status-critical-subtle hover:text-lyra-status-critical-strong active:bg-lyra-status-critical-medium"
                    onClick={onDismiss}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    Delete Draft
                  </Button>
                )
              : onDismiss && !isClosed && (
                  // Per explicit follow-up request (applies wherever this
                  // button renders, across all 3 tiers — this component is
                  // shared): icon-only, no visible label, to take up less
                  // space in the row — dropped from `size="sm"` (24px,
                  // labeled) to `size="icon-sm"` (also 24px, so the row's
                  // own height/alignment is unaffected) with the label
                  // moved into `title`, which `Button` itself auto-wraps in
                  // a Tooltip + sets as `aria-label` for any `icon-*` size
                  // (see that prop's own doc comment, button.tsx) — same
                  // pattern the `isNewThread` close button just above
                  // already uses (`title="Close"`).
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Unassign & Dismiss"
                    className="shrink-0 text-lyra-status-critical-strong hover:bg-lyra-status-critical-subtle hover:text-lyra-status-critical-strong active:bg-lyra-status-critical-medium"
                    onClick={onDismiss}
                  >
                    <UserX className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </Button>
                )}
          </div>
          )}
        </div>
        <AccordionHeadlessContent>
          <div className="pb-4">
            <TranscriptSessionDetails session={session} />
          </div>
        </AccordionHeadlessContent>
      </AccordionHeadlessItem>
      {!hideFade && (
        <div
          className="pointer-events-none absolute inset-x-0 -bottom-8 h-8 bg-gradient-to-b from-lyra-bg-surface-base to-transparent"
          aria-hidden="true"
        />
      )}
    </AccordionHeadless>
  );
}

// `ContactOverview` and its `ContactOverviewInfo` type used to live here as
// a bespoke, hand-rolled block — promoted to lyra-ui (see this file's own
// import from "@nicecxone/lyra-ui" above) per explicit request, both so
// other consumers get the same component and so its expand/collapse gets a
// real height animation (built on the same Radix accordion primitive/
// `accordion-down`/`accordion-up` keyframes every other accordion in that
// package already uses) instead of this file's old plain conditional
// render. See that component's own doc comment (lyra-ui's
// contact-overview.tsx) for the full reasoning.

export function InteractionTranscript({
  channelType,
  customerName,
  contactId,
  skillLabel,
  isFreshLaunch,
  contactOverview,
  onViewCustomerInfo,
  onViewInteractionHistory,
  reopenedContacts,
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
  showSessionActionCluster = true,
  isNewThread = false,
  isCustomerTyping = false,
}: {
  /** Which channel's content to show — see this component's own doc
   *  comment above. Undefined (no active interaction/channel yet) renders
   *  the same as SMS/WhatsApp. */
  channelType?: ChannelType;
  /** Real customer name to substitute for every customer-sender message's
   *  hardcoded mock name in the SMS/WhatsApp transcript — see this
   *  component's own doc comment above. (Also briefly shown at the far
   *  left of every `TranscriptSessionSeparator` row alongside the active
   *  channel's own address, gated on the Customer Information panel being
   *  closed — dropped from there for good once that panel permanently
   *  docked to the right of the page, as redundant with it; this
   *  message-substitution use is unaffected.) */
  customerName?: string;
  /** The active channel's own BASE Contact id (`Thread.contactId`) — used
   *  as the synthetic "just launched" session's Contact ID (see
   *  `isFreshLaunch` below). Previously this reused the interaction's own
   *  CUSTOMER id instead (a real, shipped bug — Session Details' "Contact
   *  ID" field literally showed the Customer ID) — now a real, distinct
   *  per-Contact id, generated once at Thread-creation time. */
  contactId: string;
  /** The active channel's own skill preview (`Thread.preview`), if
   *  any — shown as the synthetic "just launched" session's Skill field. */
  skillLabel?: string;
  /** True only for an interaction whose card was just created this session
   *  (`Interaction.startedFresh` — see its own doc comment) — shows a
   *  single empty "Session Details" separator (today's date, no messages)
   *  for Chat/SMS/WhatsApp instead of the fixed mock chat log, since a
   *  brand-new text conversation genuinely has no history yet. Has no
   *  effect for Voice/Email — those always show their own fixed session
   *  (with its own placeholder "Coming Soon" body) regardless, since
   *  there's no "pre-existing conversation" for either to wrongly show in
   *  the first place. */
  isFreshLaunch: boolean;
  /**
   * When set, renders a `ContactOverview` block (see that component's own
   * doc comment) right at the top of the CURRENT session's message
   * content — the caller resolves this (prior-agent lookup, snapshot
   * text) and only passes it for a freshly-launched contact with actual
   * context worth surfacing; omit it (or pass `undefined`) for a genuinely
   * first-ever, no-history contact, same channels/`isFreshLaunch` already
   * gates the empty "Session Details" separator with — this is a SEPARATE
   * flag, though, not derived from `isFreshLaunch` in here, since not
   * every fresh launch has prior-agent/snapshot context to show (a
   * brand-new customer with zero history anywhere has nothing for this to
   * summarize).
   */
  contactOverview?: ContactOverviewInfo;
  /**
   * Forwarded straight through to the rendered `ContactOverview`'s own
   * `onViewCustomerInfo`/`onViewInteractionHistory` props (see either
   * one's own doc comment, contact-overview.tsx) — the caller (each page
   * file) opens its docked Customer Information panel and jumps it to the
   * Overview/Contacts tab respectively. `undefined` for either one hides
   * that specific link (same as `ContactOverview` itself does), which
   * naturally happens whenever `contactOverview` itself is unset too since
   * neither link means anything without a panel to jump.
   */
  onViewCustomerInfo?: () => void;
  onViewInteractionHistory?: () => void;
  /**
   * One entry per time this channel was reopened (via "Add Channel") while
   * closed — `Interaction`'s own `Thread.reopenedContacts`,
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
   * that field's own doc comment (on `Thread.reopenedContacts`) for
   * the full boundary reasoning.
   */
  reopenedContacts?: { id: string; date: string; startTime: string; messagesBeforeReopen: number; contactId: string }[];
  /**
   * Messages actually sent this session (`InteractionComposer`'s Send
   * button) plus the simulated customer reply that follows — this
   * interaction's own `Interaction.liveMessages`, passed straight
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
   * from `Interaction.threadStatuses[activeChannel.id]` (see that
   * field's own doc comment for why status has to be tracked per-channel,
   * up on `Interaction`, rather than purely in this component's own
   * state) and passes the single resolved value straight through. Only ever
   * applies to the LAST entry in `sessionsToRender` below (the "current"
   * session — the freshly-launched synthetic one, the shared mock log's
   * follow-up session, or Voice/Email's single session); every earlier/
   * historical session always reads "Closed" instead, unconditionally —
   * see `getSessionStatus`'s own doc comment.
   */
  currentStatus?: string;
  /** Fires whenever the agent changes the CURRENT session's status via the
   *  popover (a plain pick, or confirming "Close") — the caller writes this
   *  back onto the active channel's own entry in `Interaction.
   *  threadStatuses` (`handleInteractionStatusChange`, main component).
   *  Never fires for any other (historical) session — those are always
   *  locked/uneditable now (see `TranscriptSessionSeparator`'s own
   *  `isCurrentSession` doc comment), so there's nothing else to change. */
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
   * `Interaction.closed` (a reopened, fully-closed historical
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
  /** Per explicit request (Agent Workspace 2.0 only): once
   *  `AgentNextGenPage.tsx`'s own record header grew an icon-button cluster
   *  covering these same per-session actions (plus a relocated status
   *  chip), passed straight through to every `TranscriptSessionSeparator`
   *  below as `showActionCluster` — see that prop's own doc comment.
   *  Defaults `true` (every other call site keeps the session row's own
   *  copy). */
  showSessionActionCluster?: boolean;
  /** True for a brand-new, agent-initiated OUTBOUND thread with no real
   *  activity yet — the caller resolves this the same way as
   *  `isFreshLaunch` (`Interaction.startedFresh`), AND-ed with "the
   *  customer hasn't replied yet" (`Thread.lastCustomerMessageTick`) —
   *  same compound "still genuinely fresh, not just started-outbound"
   *  check `copilotAvailable` already uses (main component) — rather than
   *  reusing `isFreshLaunch` alone, since that flag stays `true` for the
   *  rest of the interaction's life even once real activity exists (it
   *  only controls whether the mock session log is skipped). Passed
   *  straight through to the CURRENT session's own
   *  `TranscriptSessionSeparator` as `isNewThread` — see that prop's own
   *  doc comment for the full reasoning/scoping. Defaults `false`; every
   *  existing call site is unaffected until the caller starts computing a
   *  real value. */
  isNewThread?: boolean;
  /** True while a simulated customer reply is pending on the ACTIVE channel
   *  (`handleSendMessage`'s 2.5s reply timeout, main component — set the
   *  instant the agent's own message is sent, cleared the moment the
   *  customer's reply actually lands) — renders a `TypingIndicator` bubble
   *  right after the live-message list of the CURRENT session (same
   *  `lastSessionId` scoping `outcomeOpen`/`showSessionActionCluster` use
   *  above; a typing indicator only ever makes sense for whichever
   *  conversation is actually live). Per explicit request, only meaningful
   *  for `isTextChannel` (chat/SMS/WhatsApp) — Voice has no message concept
   *  to "type," and Email's reply cadence isn't a live back-and-forth the
   *  way the other three are; the render check below gates on both. Defaults
   *  `false`; every existing call site is unaffected until the caller starts
   *  computing a real value. */
  isCustomerTyping?: boolean;
}) {
  // A freshly-launched Chat/SMS/WhatsApp interaction (see `isFreshLaunch`'s
  // own doc comment) shows just a single synthesized "Session Details"
  // separator (today's date, this Thread's own base contactId/skill) with no
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
  const baseSessionsToRender: Contact[] = isFreshTextLaunch
    ? [
        {
          id: "session-fresh",
          contactId,
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
  // `reopenedContacts`' own doc comment above. Same synthetic shape as
  // `session-fresh` above, just built from the reopen's own captured
  // date/time (`reopenedContacts` entries) instead of "now" and keyed by
  // that entry's own id rather than the fixed `"session-fresh"` one, so
  // several reopens on the same channel each render as their own distinct
  // row instead of colliding on id. Text channels only, same as
  // `isFreshTextLaunch` above — voice/email have no multi-session concept
  // to extend here (their `reopenedContacts` prop is always `undefined` in
  // practice, but `isTextChannel` guards this regardless).
  const reopenedSessionsToRender: Contact[] = isTextChannel
    ? (reopenedContacts ?? []).map((entry) => ({
        id: entry.id,
        contactId: entry.contactId,
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
  const sessionsToRender: Contact[] = [...baseSessionsToRender, ...reopenedSessionsToRender];
  // The "current" session for status purposes — see `currentStatus`/
  // `onCurrentStatusChange`'s own doc comments above. Now always the most
  // RECENT reopen (if any) rather than always `baseSessionsToRender`'s own
  // last entry — reopening should hand "current" over to the brand-new
  // session, not leave it pointed at the old closed one.
  const lastSessionId = sessionsToRender[sessionsToRender.length - 1]?.id;

  // Slices the one flat `liveMessages` array back into per-session chunks,
  // keyed by session id — per explicit correction, reopening a closed
  // channel must NOT wipe its prior messages; they need to keep rendering
  // (dimmed) under their ORIGINAL session, with only the messages sent
  // since the reopen landing under the new one. Each `reopenedContacts`
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
      (_, idx) => reopenedContacts?.[idx]?.messagesBeforeReopen ?? liveMessages.length
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

  // Which CLOSED sessions have their message content collapsed away — same
  // per-session `Set` shape as `openSessionIds` above (independent toggles,
  // not an exclusive accordion), but a separate flag entirely: `open`/
  // `toggleSession` only ever animate `TranscriptSessionDetails` itself,
  // while this animates this session's own message bubbles (rendered
  // further down, in this session's own per-session block) shut. Only a
  // session that reads "Closed" ever exposes the collapse icon that flips
  // this (`TranscriptSessionSeparator`'s own `onToggleCollapsed` doc
  // comment) — a still-open session's id never lands in this set.
  const [collapsedSessionIds, setCollapsedSessionIds] = useState<Set<string>>(new Set());

  const toggleSessionCollapsed = (sessionId: string) => {
    setCollapsedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  // Per explicit bug fix: a contact with more than one session (multiple
  // past, Closed threads plus the current one) used to load with EVERY
  // session's message content expanded — `collapsedSessionIds` started out
  // empty, so nothing was collapsed until an agent manually clicked one
  // shut. Every session but `lastSessionId` always reads "Closed"
  // (`getSessionStatus`, above), so on a genuinely fresh contact load
  // (`contactId` — this prop identifies the specific channel/thread being
  // viewed, not just the customer) every one of THOSE gets collapsed by
  // default here, leaving only the current session's own messages visible
  // — an agent can still re-expand any of them individually via
  // `toggleSessionCollapsed` same as before, this only changes the
  // starting state. Deliberately NOT included in the dependency array:
  // `sessionsToRender`/`lastSessionId` themselves — this should fire once
  // per contact load, not re-collapse a session the agent just re-expanded
  // simply because a live message arrived and re-triggered a re-render.
  useEffect(() => {
    setCollapsedSessionIds(
      new Set(sessionsToRender.filter((session) => session.id !== lastSessionId).map((session) => session.id))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  // The CURRENT session's status is `currentStatus`, a prop from
  // `Interaction` (see its own doc comment for why) — every OTHER
  // (historical) session in this Thread always reads "Closed", full stop,
  // regardless of whatever its own static `status` field says. Per
  // explicit bug report/fix: this used to fall back to each historical
  // session's own `status` (only forced to "Closed" when it had been
  // specifically superseded by a live reopen) — a real, confirmed bug,
  // since a Thread's fixed mock session data (`TRANSCRIPT_SESSIONS`/
  // `_VOICE`/`_EMAIL`) can have more than one entry that was never
  // authored as "Closed" (e.g. two consecutive "Resolved" rows), which
  // rendered as two simultaneously "open"-looking sessions in one Thread.
  // There should never be more than one non-Closed session in a Thread —
  // only the current one is ever actually live — so this is now a plain
  // position check with no other source to fall back to. The local
  // "freeze any historical session's status via its own popover" override
  // this used to support is gone along with it — see
  // `TranscriptSessionSeparator`'s own `isCurrentSession` doc comment:
  // a historical session's status pill is now always locked, so that
  // popover can never actually open to override anything in the first
  // place.
  const getSessionStatus = (session: Contact) =>
    session.id === lastSessionId ? currentStatus ?? session.status : "Closed";

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
  // status needs a confirm step first. Always routes to
  // `onCurrentStatusChange` (up onto `Interaction`) — per explicit
  // request/bug fix, only the CURRENT session's status pill is ever
  // unlocked at all now (`TranscriptSessionSeparator`'s own
  // `isCurrentSession`/`isClosed`, see that prop's doc comment), so this
  // is never actually reachable for any other (historical) session; no
  // `sessionId` parameter needed to branch on anymore.
  const selectSessionStatus = (status: string) => {
    if (status === "Closed") {
      setStatusMenuView("confirm");
      return;
    }
    onCurrentStatusChange(status);
    setStatusMenuOpenId(null);
  };

  const handleConfirmCloseSession = () => {
    onCurrentStatusChange("Closed");
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

  // Scroll container ref — see the `useLayoutEffect` further below (after
  // `isAtBottom` is declared, which it also resets) for the actual
  // scroll-to-latest-on-open/on-channel-switch behavior. Declared up here
  // since the `ResizeObserver` effect right below also needs it.
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Below 400px of this transcript's own rendered width: drop each
  // message's sender avatar (`transcriptNarrow`, threaded into each real
  // message bubble's own `narrow` prop as an override — see
  // `TranscriptMessageBubble`'s own doc comment). Below 768px: grow the
  // TYPING INDICATOR's own bubble to full width, matching the real message
  // bubbles' own independent 80%/full-width breakpoint — per explicit
  // request (`ChatMessage`, lyra-ui, self-measures that breakpoint
  // internally off its own root element and needs no prop from here; the
  // `TypingIndicator` below is still a local, un-ported component with no
  // measurement of its own, so it needs `transcriptBubbleFullWidth` handed
  // down explicitly to stay visually consistent with the real bubbles
  // beside it). Both measured directly off this same scroll container via
  // one shared `ResizeObserver`, same pattern `ScheduleToolbar`'s own
  // `containerRef`/`isWide`/`isCompact` already uses for its Add/Day/Week
  // collapse (SchedulePanel.tsx) — a CSS `@container` query here stopped
  // firing reliably for the agent live-testing it, even after several
  // rounds of review/hardening.
  const [transcriptNarrow, setTranscriptNarrow] = useState(false);
  const [transcriptBubbleFullWidth, setTranscriptBubbleFullWidth] = useState(false);
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const applyWidth = (width: number) => {
      setTranscriptNarrow(width < 400);
      setTranscriptBubbleFullWidth(width < 768);
    };
    applyWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => applyWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
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

  // Scroll to the latest message on open — every SMS/chat transcript should
  // land on the newest message (bottom of the last session) rather than the
  // very first one from potentially days ago. `useLayoutEffect` (not
  // `useEffect`) so this happens before the browser paints the first frame
  // — no visible flash of the top of the transcript before it jumps to the
  // bottom.
  // Depends on `contactId` — the ACTIVE channel's own base Contact id (see
  // that prop's own doc comment; unique per Thread, so it changes every
  // time the agent switches to a different channel tab) — not an empty
  // array. Per explicit bug report: `InteractionTranscript` is one long-
  // lived component instance for the whole interaction (never remounted as
  // the agent flips between its channel tabs — no `key` at the call site),
  // so an empty-deps effect only ever fired once, the very first time this
  // interaction's transcript opened. Every LATER channel switch left
  // `scrollContainerRef`'s raw `scrollTop` pixel value untouched while the
  // DOM underneath it was completely replaced with a different channel's
  // (usually differently-sized) content — the agent would land wherever
  // that stale pixel offset happened to fall in the new content, which
  // read as "goes to the top" for a multi-session chat/SMS thread far more
  // often than not. Re-running this on every `contactId` change re-lands on
  // the bottom every time, matching the original "land on open" intent but
  // now firing on every channel switch, not just the very first one.
  // `setIsAtBottom(true)` alongside it — same "as if they'd clicked Scroll
  // To Latest" reset `scrollToLatest`/the agent's-own-just-sent-message
  // branch below already do — so the "N new" chip/count (which otherwise
  // would've kept comparing against whatever channel was last read) starts
  // clean for the newly-viewed channel too.
  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setIsAtBottom(true);
  }, [contactId]);

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
    // `min-w-0` here — this ROOT div is a flex item of its own
    // `flex flex-1 flex-col min-w-0 overflow-hidden` parent (the record
    // body column, this component's own call site) and was missing
    // `min-w-0` itself. A flex item's default `min-width: auto` applies
    // the browser's "automatic minimum size" floor — the width of
    // whatever's widest UN-WRAPPABLE content anywhere in this subtree —
    // to ANY auto-sized box, not just main-axis flex-grow/shrink
    // distribution; a column-direction parent's cross-axis
    // `align-items: stretch` still respects that floor. Found while
    // chasing a reported width-collapse regression; a real, independent
    // correctness fix kept regardless of how `transcriptNarrow` below
    // ended up being measured.
    <div className="relative flex-1 min-h-0 min-w-0">
      <div
        ref={scrollContainerRef}
        onScroll={handleTranscriptScroll}
        className="h-full overflow-y-auto"
      >
        {/* Per explicit follow-up request, un-reverting the max-width-back
            change just above it ("dang - revert that last change - go back
            to full screen width"): back to full width again — no
            `max-w`/`mx-auto`/`px-6` on this outer wrapper. The
            `TranscriptSessionSeparator` row (the sticky "N Messages |
            #contactId · date" bar) renders edge-to-edge across the full
            scrollable width instead of being boxed into the same centered
            1024px column as the message bubbles below it — that row picked
            its own `px-6` back up directly on its root (see that
            component's own doc comment) since it no longer inherits an
            inset from this now-unconstrained parent. The 1024px-centered
            column lives on a new wrapper around just the message content,
            per session (see `sessionContentDimmed`'s own wrapper div
            further down) — message bubbles are unaffected visually, still
            centered at the same width as before; only the separator row
            above them is full width. Sticky-STACKING behavior is
            unaffected either way — `position: sticky` resolves against the
            nearest scrolling ancestor (the `overflow-y-auto` div above),
            not against this width constraint. */}
        <div className="w-full">
          {/* Per explicit request ("let's not have multiple threads in a
              chat anymore - simply hide the ones in the existing
              assignments"): only the CURRENT session (`lastSessionId`)
              ever renders here now — every historical session (a past
              `TRANSCRIPT_SESSIONS`/`_VOICE`/`_EMAIL` entry, or an earlier
              `reopenedContacts` entry) is filtered out of the scrollable
              transcript entirely, not just collapsed (the previous
              behavior — see `collapsedSessionIds`' own doc comment above,
              now dead code left in place rather than ripped out: reopening
              a channel still needs its own fresh `Contact` object with a
              new id for `currentStatus`/`onCurrentStatusChange` to attach
              to, and Contact History/session-count bookkeeping elsewhere
              still reads the full un-filtered `sessionsToRender`/
              `liveMessagesBySessionId`, so removing the underlying
              multi-session data model itself would be a much bigger,
              riskier change than what was actually asked for here — a
              purely visual hide). A single still-visible session with no
              other one to distinguish it from reads a little oddly with a
              full "N Messages | #contactId · date" separator bar of its
              own still on screen, but that bar is also this session's only
              home for its status pill/Consult/Transfer/Outcome/Unassign
              cluster, so it stays. */}
          {sessionsToRender
            .filter((session) => session.id === lastSessionId)
            .map((session) => {
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
            const sessionWithCurrentStatus: Contact = {
              ...session,
              status: getSessionStatus(session),
            };
            // Per explicit request: the session detail row itself
            // (`TranscriptSessionSeparator` — the sticky "customerName |
            // address | N Messages | #contactId · date" header, plus its
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
                {/* No wrapping div around this root — per explicit bug fix
                    ("not sticky at the top anymore"), this must stay a
                    DIRECT child of the per-session `<div key={session.id}>`
                    below, a sibling of the message content div further
                    down, so its containing block has real height to
                    "stick" through as the page scrolls. Its own `px-6` (and
                    full-width, no `max-w`) is applied directly on its root
                    className now instead — see that component's own doc
                    comment. */}
                <TranscriptSessionSeparator
                  // Per explicit bug fix — this separator's own trailing
                  // fade otherwise paints straight over the `ContactOverview`
                  // block's heading when it's the first thing rendered
                  // right underneath (see `hideFade`'s own doc comment).
                  hideFade={!!contactOverview && session.id === lastSessionId}
                  session={sessionWithCurrentStatus}
                  open={openSessionIds.has(session.id)}
                  onToggle={() => toggleSession(session.id)}
                  // Only a real, meaningful count for chat/SMS/WhatsApp —
                  // see this prop's own doc comment on `Contact
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
                  onSelectStatus={selectSessionStatus}
                  onConfirmClose={handleConfirmCloseSession}
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
                          // Per explicit bug fix — was `?? "Resolved"`: a
                          // channel with no status set yet (the common case
                          // for a just-launched thread, before the agent's
                          // ever touched the status pill) was reading as
                          // already wrapped up before anything happened.
                          // "Open" is the correct fallback for genuinely
                          // untouched status — matches the same options
                          // list's own first entry (`TRANSCRIPT_SESSION_STATUS_OPTIONS`).
                          resolution: currentStatus ?? "Open",
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
                  // is — reused as-is rather than re-derived, so the CURRENT
                  // session's own controls additionally lock down whenever
                  // the whole channel/interaction reads closed, in lockstep
                  // with the exact same condition that already fades this
                  // session's own message content and drives the "closed
                  // interaction"/"channel is closed" banners above.
                  channelClosed={dimmed}
                  // Per explicit bug fix — see `TranscriptSessionSeparator`'s
                  // own `isCurrentSession` doc comment for the full
                  // reasoning: `isClosed` there now derives from THIS
                  // (position), not `session.status`, so there's never more
                  // than one non-Closed-looking session in a Thread.
                  isCurrentSession={session.id === lastSessionId}
                  showActionCluster={showSessionActionCluster}
                  // Same "current session only" gate as `outcome`/
                  // `onDismiss` above — see this component's own
                  // `isNewThread` prop doc comment for how the caller
                  // resolves it.
                  isNewThread={session.id === lastSessionId && isNewThread}
                  collapsed={collapsedSessionIds.has(session.id)}
                  onToggleCollapsed={
                    sessionWithCurrentStatus.status === "Closed"
                      ? () => toggleSessionCollapsed(session.id)
                      : undefined
                  }
                  // Reuses the SAME `<768px` reading `transcriptBubbleFullWidth`
                  // already measures off this scroll container (see that
                  // state's own doc comment) rather than a second
                  // ResizeObserver — see `compactHeader`'s own doc comment
                  // on why 768px specifically, and what it does.
                  compactHeader={transcriptBubbleFullWidth}
                />
                {/* Everything below the separator (mock/live message
                    bubbles, the Voice/Email placeholder) is what actually
                    dims — see `sessionContentDimmed`'s own doc comment
                    above for why this moved off the whole per-session
                    wrapper. Plain wrapper div, not an ancestor of
                    `TranscriptSessionSeparator` above (a SIBLING of this
                    div, same as before) — so its own `sticky top-0` keeps
                    working exactly as already documented there.
                    `w-full max-w-[1024px] mx-auto px-6` — per the
                    un-revert back to full width (see the outer scroll
                    container's own doc comment above), the 1024px-centered
                    column moved back down onto THIS wrapper, around just
                    the message content — message bubbles are unaffected
                    visually, still centered at the same width and
                    alignment as before; only the separator row above them
                    is full width again.
                    `pb-9` (36px), LAST session only — per explicit follow-up
                    request ("increase the padding-bottom of the
                    conversation container... so the bottom comments are not
                    covered by the fade"): the composer's own soft fade
                    overlay (`-top-8 h-8`, 32px, see that div's own doc
                    comment further down) paints OVER the last ~32px of
                    whichever content is scrolled to the very bottom of the
                    transcript — with only the message blocks' own `py-4`
                    (16px) below the last bubble, the fade's 32px reached up
                    into the actual text of the last message once scrolled
                    all the way down. 36px (a touch more than the fade's own
                    32px) clears it with a little room to spare. Scoped to
                    `session.id === lastSessionId` specifically — every
                    OLDER session already has real content (this session's
                    own separator, or the next session's) sitting below it
                    in the scroll, so only the truly last block in the
                    document needs the extra clearance; adding it to every
                    session would just insert an oversized, unexplained gap
                    above each one's own separator instead. Whichever
                    sub-block actually renders last for this session (canned
                    `messages`, the Voice/Email placeholder, or live
                    messages — see the three blocks below) is covered
                    either way, since this padding lives on their shared
                    parent, not on any one of them individually. */}
                {/* Collapses this session's own message content (below)
                    away as one animated block whenever this session is in
                    `collapsedSessionIds` — same `data-[state=open]:animate-
                    accordion-down`/`data-[state=closed]:animate-accordion-up`
                    mechanism `TranscriptSessionSeparator`'s own Session
                    Details panel already uses, a wholly separate/independent
                    `AccordionHeadless` instance from that one (this session's
                    "Session Details" open/closed state and its "message
                    content collapsed" state are unrelated flags — see
                    `TranscriptSessionSeparator`'s own `collapsed` prop doc
                    comment). Wraps the div below rather than replacing it, so
                    every existing class on that div (the 1024px-centered
                    column, the dim/opacity transition, the last-session
                    `pb-9`) is untouched — this only adds a height animation
                    around it. Still a DOM descendant of the outer
                    `<div key={session.id}>` either way, so
                    `TranscriptSessionSeparator`'s own `sticky top-0` keeps
                    working exactly as already documented there (a fully
                    collapsed session legitimately has nothing left to stick
                    through, which is the correct behavior here). */}
                <AccordionHeadless
                  type="single"
                  collapsible
                  value={collapsedSessionIds.has(session.id) ? "" : session.id}
                  onValueChange={() => {}}
                >
                <AccordionHeadlessItem value={session.id} className="border-none">
                <AccordionHeadlessContent>
                <div
                  // `max-w-[1024px]` — per explicit request, narrowed down
                  // from the previous 1200px (see this wrapper's own
                  // top-of-block doc comment above for the full "why 1200px
                  // lives here at all" history). The composer's own matching
                  // wrapper (`InteractionComposer`, further down this file)
                  // is kept in sync at the same 1024px so the message column
                  // and the input box directly below it stay the same width.
                  className={cn(
                    "w-full max-w-[1024px] mx-auto px-6",
                    sessionContentDimmed && "opacity-50 transition-opacity",
                    session.id === lastSessionId && "pb-9"
                  )}
                >
                {/* Only on the CURRENT session — see `contactOverview`'s own
                    doc comment above; a reopened/historical session under
                    this same channel already has real messages of its own,
                    not a fresh-launch moment to summarize. */}
                {contactOverview && session.id === lastSessionId && (
                  <ContactOverview
                    customerName={displayName}
                    previousAgent={contactOverview.previousAgent}
                    snapshot={contactOverview.snapshot}
                    journeySummary={contactOverview.journeySummary}
                    onViewCustomerInfo={onViewCustomerInfo}
                    onViewInteractionHistory={onViewInteractionHistory}
                  />
                )}
                {messages.length > 0 && (
                  <div className="flex min-w-0 flex-col gap-5 py-4">
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
                        narrow={transcriptNarrow}
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
                    messages (see `Interaction.liveMessages`'s own doc
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
                  // Only the CURRENT session's own trailing edge — see
                  // `isCustomerTyping`'s own doc comment above for the full
                  // `lastSessionId`/`isTextChannel` scoping reasoning.
                  const showTypingIndicator = session.id === lastSessionId && isTextChannel && isCustomerTyping;
                  return (
                    (sessionLiveMessages.length > 0 || showTypingIndicator) && (
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
                            narrow={transcriptNarrow}
                          />
                        ))}
                        {showTypingIndicator && (
                          <TypingIndicator
                            initials={displayInitials}
                            narrow={transcriptNarrow}
                            bubbleFullWidth={transcriptBubbleFullWidth}
                          />
                        )}
                      </div>
                    )
                  );
                })()}
                </div>
                </AccordionHeadlessContent>
                </AccordionHeadlessItem>
                </AccordionHeadless>
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
export interface QuickReplyItem {
  /** The id typed after `QUICK_REPLY_TRIGGER_CHAR` to reach this item */
  id: string;
  title: string;
  /** May contain `{key}` tokens matching `fields[].key`, for a `rich` item */
  template: string;
  rich?: boolean;
  fields?: QuickReplyField[];
}

export const QUICK_REPLIES: QuickReplyItem[] = [
  { id: "greeting", title: "Greeting", template: "Thank you for contacting us. How can I assist you today?" },
  { id: "acknowledge", title: "Acknowledge", template: "Hello. Thank you for contacting us.  I would be happy to look into that for you." },
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

/** Fills a `rich` item's `template` from its current field values —
 *  `bracket` wraps each filled-in value in `[...]` (matching the reference
 *  mockup's own preview treatment, e.g. "Please allow [1–2] business
 *  days...") for the live preview shown while still editing; the final
 *  text actually inserted into the composer (`bracket: false`) has no
 *  brackets, since those were only ever a preview affordance marking which
 *  parts of the sentence came from a field. Plain (non-`rich`) items never
 *  reach this — their `template` has no `fields`/tokens to fill and is
 *  used as-is. */
export function fillQuickReplyTemplate(
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
export const QUICK_REPLY_TRIGGER_CHAR = "/";
export const QUICK_REPLY_TRIGGER_PATTERN = /\/(\w*)$/;
export function InteractionComposer({
  onSend,
  prefill,
  onPrefillConsumed,
}: {
  onSend: (text: string) => void;
  /** Populates the composer's own text WITHOUT sending it — per explicit
   *  request ("When one is clicked it should populate into the input but
   *  not send until the agent clicks send"), for Copilot's suggested-reply
   *  cards (currently only Marcus Webb's scripted scenario,
   *  `AgentWorkspace2WithDeskPage.tsx`). This component still owns its own
   *  `message` state (unchanged, uncontrolled) — `prefill` is a one-shot
   *  injection into that state via the `useEffect` below, not a switch to a
   *  fully controlled input: the agent can still freely edit/clear the
   *  populated text afterward like anything else they typed themselves.
   *  Left `undefined` by every OTHER caller (no behavior change for them). */
  prefill?: string;
  /** Fired the instant `prefill` is consumed (copied into `message`) — the
   *  caller's cue to reset its own `prefill` value back to `undefined`.
   *  Required so a SECOND, later `prefill` call can ever take effect at
   *  all: the effect below is keyed on `[prefill]`, so if the caller left
   *  its own prefill value sitting non-`undefined` after the first one
   *  landed, setting the exact same string again wouldn't change that
   *  dependency and the effect simply wouldn't refire. Resetting to
   *  `undefined` in between means every distinct suggestion the agent
   *  clicks — even if it happens to be identical text — reliably re-fires
   *  this effect. */
  onPrefillConsumed?: () => void;
}) {
  const [message, setMessage] = useState("");
  const canSend = message.trim().length > 0;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // See `prefill`'s own doc comment above for the full "why" — this just
  // performs the one-shot injection + focus, then immediately hands control
  // back to the caller to reset `prefill` to `undefined` again.
  useEffect(() => {
    if (prefill === undefined) return;
    setMessage(prefill);
    onPrefillConsumed?.();
    // The textarea's own auto-grow (further down this component, if any)
    // and caret placement both need the DOM to have actually committed
    // `message`'s new value first.
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      el?.focus();
      el?.setSelectionRange(prefill.length, prefill.length);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);
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
      {/* `max-w-[1024px]` — kept in sync with the message-column wrapper's
          own matching width above (per explicit request narrowing both from
          1200px), so the composer stays the same width as the transcript
          content sitting above it. */}
      <div className="w-full max-w-[1024px] mx-auto">
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