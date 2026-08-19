// App menu items + "New Outbound" picker config — see
// agent-next-gen-shared-utils.ts and sibling agent-next-gen-*.ts(x) files
// for everything AgentNextGenPage.tsx itself no longer declares — split out
// once that file crossed Babel's 500KB code-generator threshold.
import { type Page, initialsFor, synthesizePhone, hashSeed, splitCustomerName } from "@/components/agent-next-gen-shared-utils";
import { CONTACT_HISTORY, type ContactHistoryEntry } from "@/components/agent-next-gen-contact-history";
import { type AppMenuGroup, type CreateNewOutboundConfig, type CreateNewOutboundContact, WhatsAppIcon } from "@nicecxone/lyra-ui";
import { CREATE_NEW_AGENTS } from "@nicecxone/lyra-ui/agents-data";
import { CREATE_NEW_CUSTOMERS } from "@nicecxone/lyra-ui/customers-data";
import type { ReactNode } from "react";
import { Phone, Mail, MessageSquare, MessageCircle, User, Headphones, Share2, Users, LayoutGrid } from "lucide-react";

/* ── Category icons ──
   Shared between the "New Outbound" picker's "Choose group" dropdown
   (`OUTBOUND_GROUPS`'s own `icon`, further down) and each individual
   contact row within it (`CreateNewContact.categoryIcon`, create-new.tsx) —
   one constant per category so both places can never drift to different
   icons for the same category. Declared as functions (not JSX constants)
   since a single React element instance can't be reused across multiple
   render sites (agents/teams/skills/customers are each mapped into many
   rows) — React warns/misbehaves reusing one element in multiple places in
   the tree, so each call site needs its own fresh element. */
const agentCategoryIcon = () => <Headphones className="h-4 w-4" strokeWidth={1.5} />;
const teamCategoryIcon = () => <Users className="h-4 w-4" strokeWidth={1.5} />;
const skillCategoryIcon = () => <Share2 className="h-4 w-4" strokeWidth={1.5} />;
const customerCategoryIcon = () => <User className="h-4 w-4" strokeWidth={1.5} />;
// Dial Pad's own icon — a grid glyph, matching the small ghost button's
// reference mockup and the same `LayoutGrid` glyph already used
// app-wide for grid/dashboard-style nav items (AgentNextGenPage.tsx,
// AgentWorkspace2WithDeskPage.tsx, AgentWorkspaceAdvancedPage.tsx,
// Sidebar.tsx). Unlike the four categories above, this one is never
// consumed by the "Choose group" dropdown's own icon slot (see
// `OUTBOUND_GROUPS`'s `dialpad` entry below — that group is filtered
// out of the Select entirely, create-new.tsx) — it's read by the Dial
// Pad ghost button instead (`dialpadGroup.icon`, same file), which
// falls back to a hardcoded `LayoutGrid` of its own if a consumer's
// dialpad-kind group has no icon set. Kept as its own function (not a
// shared JSX constant) for the same one-element-per-render-site reason
// as the four category icons above.
const dialpadCategoryIcon = () => <LayoutGrid className="h-4 w-4" strokeWidth={1.5} />;

/** Wraps a bare category icon in the same colored circle shell lyra-ui's
 *  own `ListItem` "With leading icon" story hand-builds for each of its
 *  demo rows (`h-9 w-9 rounded-full ... flex items-center justify-center
 *  ...`, ListItem.stories.tsx) — per explicit request, `CreateNewContact.
 *  categoryIcon` (create-new.tsx) reuses that exact treatment rather than
 *  a bare icon sitting inline with the contact's name. One color pair per
 *  category, each an existing token already used elsewhere in this app/
 *  design system (not invented for this): blue "active" for Agents, green
 *  "success" for Skills, purple "accent" for Teams (the same token
 *  `OUTBOUND_TEAMS`'s own `t1` avatar already uses, below), and neutral
 *  "surface shell" gray for Customers. */
function categoryLeadingIcon(icon: ReactNode, bgClassName: string, textClassName: string): ReactNode {
  return (
    <div className={`h-9 w-9 rounded-full ${bgClassName} flex items-center justify-center ${textClassName}`}>
      {icon}
    </div>
  );
}
const agentCategoryLeadingIcon = () =>
  categoryLeadingIcon(agentCategoryIcon(), "bg-lyra-bg-active-subtle", "text-lyra-fg-active-strong");
const teamCategoryLeadingIcon = () =>
  categoryLeadingIcon(teamCategoryIcon(), "bg-lyra-accent-purple-soft", "text-lyra-accent-purple-strong");
const skillCategoryLeadingIcon = () =>
  categoryLeadingIcon(skillCategoryIcon(), "bg-lyra-status-success-subtle", "text-lyra-status-success-strong");
const customerCategoryLeadingIcon = () =>
  categoryLeadingIcon(customerCategoryIcon(), "bg-lyra-bg-surface-shell", "text-lyra-fg-secondary");

/* ── App menu builder (needs onNavigate so built inside the component) ── */

// Renamed from "Agent Next Gen" (per explicit request) — still the active/
// first item, still the same underlying `"agent"` page (`AgentNextGenPage`,
// App.tsx) — only the label changed. "Agent Workspace Premium"/"Outbound
// Engagement"/"Login" were removed outright (not hidden — a full delete of
// their menu entries); their pages/routes themselves (`DesktopDesignsPage`/
// `OutboundEngagementPage`/`LoginPage`, App.tsx) are untouched and still
// reachable by hash URL, just no longer linked from this menu. "Agent
// Workspace 2.0 Advanced" (originally "Agent Workspace Advanced", renamed
// per explicit request — same underlying page/component/route, just the
// label changed; `AgentWorkspaceAdvancedPage.tsx`, its own
// `#/agent-advanced` route, App.tsx — another duplicate of
// `AgentNextGenPage.tsx`, per explicit request) is the second entry, per
// explicit request to place it there. "Agent Workspace 2.0 Premium"
// (originally "Agent Workspace 2.0 With Desk", later renamed per explicit
// request — same underlying page/component, just the label + route
// changed) was the original second entry and is now third — its own
// separate page (`AgentWorkspace2WithDeskPage.tsx`, its own
// `#/agent-premium` route, App.tsx) rather than reusing "Agent Workspace
// 2.0"'s `"agent"` page, per explicit request.
//
// `currentPage` decides which row shows the "active" (blue, non-clickable-
// looking) treatment — each call site passes its OWN page literal
// (`AgentNextGenPage.tsx` passes `"agent"`, `AgentWorkspaceAdvancedPage.tsx`
// passes `"agent-advanced"`, `AgentWorkspace2WithDeskPage.tsx` passes
// `"agent-with-desk"`), since each page component inherently knows which
// page it itself is; there's no need to thread that back down from
// `App.tsx`. Every row still gets an `onClick` (including the currently-
// active one, which just re-navigates to the same page — harmless) so
// clicking any row from ANY of the three pages always works, per explicit
// request ("allow the agent to click back to normal Agent Workspace 2.0").
export function buildAppMenuGroups(onNavigate: ((page: Page) => void) | undefined, currentPage: Page): AppMenuGroup[] {
  return [
    {
      items: [
        { label: "Agent Workspace 2.0", active: currentPage === "agent", onClick: () => onNavigate?.("agent") },
        {
          label: "Agent Workspace 2.0 Advanced",
          active: currentPage === "agent-advanced",
          onClick: () => onNavigate?.("agent-advanced"),
        },
        {
          label: "Agent Workspace 2.0 Premium",
          active: currentPage === "agent-with-desk",
          onClick: () => onNavigate?.("agent-with-desk"),
        },
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

export const OUTBOUND_AGENTS: NonNullable<CreateNewOutboundConfig["groups"][number]["contacts"]> = CREATE_NEW_AGENTS.map((a) => ({
  id: a.id,
  name: a.name,
  initials: initialsFor(a.name),
  subtitle: a.agentId,
  avatarClassName: a.avatarClassName,
  // Per explicit request: an agent is only reachable by Voice or Chat from
  // this picker — overrides whatever `CREATE_NEW_AGENTS` itself lists (that
  // fixture's `channels` models a full agent-center directory record, not
  // what's actually dialable agent-to-agent here). Voice proceeds as a
  // normal call (`handleStartCall`'s own agent-call branch, further down in
  // each page file, then hides Customer Information + the status Select for
  // that resulting interaction); Chat instead opens the existing "Agent
  // Chat" panel and never creates an interaction at all — see
  // `OUTBOUND_CONFIG.channelOptions`'s new `"chat"` entry below.
  channels: ["voice", "chat"],
  status: a.status,
  // Per explicit request: same headset icon the "Choose group" dropdown's
  // own "Agents" row uses (`OUTBOUND_GROUPS` below), now also shown to the
  // left of EACH agent's name — matters most in the "All"/favorites group,
  // which mixes agents/teams/skills/customers in one list with no group
  // heading between them (see `CreateNewContact.categoryIcon`'s own doc
  // comment, create-new.tsx).
  categoryIcon: agentCategoryLeadingIcon(),
  // Per explicit request: calling/chatting an agent skips the "Select
  // Phone"/"Outbound Skill" detail screen entirely and launches
  // immediately — an agent has no real per-contact address to choose
  // between the way a customer does. See `CreateNewOutboundContact.
  // quickLaunch`'s own doc comment (lyra-ui create-new.tsx).
  quickLaunch: true,
}));

export const OUTBOUND_CUSTOMERS: NonNullable<CreateNewOutboundConfig["groups"][number]["contacts"]> = CREATE_NEW_CUSTOMERS.map((c) => ({
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
  // See `OUTBOUND_AGENTS`'s own identical `categoryIcon` comment above.
  categoryIcon: customerCategoryLeadingIcon(),
}));

/** One `CreateNewOutboundContact` for a single hand-authored `CONTACT_HISTORY`
 *  row (agent-next-gen-contact-history.tsx), registered under `id` — see
 *  `CONTACT_HISTORY_OUTBOUND_CONTACTS`'s own doc comment below for why `id`
 *  is a parameter here rather than derived from `entry` directly. Same
 *  `initialsFor`/`synthesizePhone(hashSeed(...))`/`splitCustomerName`
 *  formulas `OUTBOUND_CUSTOMERS` above already uses, keyed off `entry.caseId`
 *  — the same value `handleReopenContactHistoryEntry`/`handleRedial`
 *  (AgentNextGenPage.tsx) set as the resulting card's own `recordId`, so a
 *  synthesized phone/email here agrees with `buildCustomerInfoFields`'s own
 *  synthesis for that same card (both key off the same seed). */
function contactHistoryOutboundContact(entry: ContactHistoryEntry, id: string): CreateNewOutboundContact {
  const { firstName, lastName } = splitCustomerName(entry.name);
  return {
    id,
    name: entry.name,
    initials: initialsFor(entry.name),
    subtitle: entry.caseId,
    avatarClassName: "bg-lyra-accent-slate-soft text-lyra-accent-slate-strong",
    channels: entry.channels ?? [],
    primaryPhone: {
      value: synthesizePhone(hashSeed(entry.caseId)),
      label: synthesizePhone(hashSeed(entry.caseId)),
    },
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    // Every `ContactHistoryEntry` represents a past CUSTOMER contact — see
    // `OUTBOUND_AGENTS`'s own identical `categoryIcon` comment above.
    categoryIcon: customerCategoryLeadingIcon(),
  };
}

/** Registers a `CreateNewOutboundContact` for every entry in `entries`, so
 *  `useOutboundAddButton`'s `contactsById` lookup (create-new.tsx) has
 *  something to find once one of them is reopened/redialed into a real
 *  assignment card — per explicit request: a `ContactHistoryEntry` with no
 *  real backing `CREATE_NEW_CUSTOMERS` record (the 5 hand-authored
 *  `CONTACT_HISTORY` rows, and any dismissed interaction that wasn't itself
 *  already `CREATE_NEW_CUSTOMERS`-backed — see `ContactHistoryEntry.
 *  customerId`'s own doc comment) has its reopened/redialed card's id fall
 *  back to a synthetic `history:${id}`/`redial:${id}` one
 *  (`handleReopenContactHistoryEntry`/`handleRedial`, AgentNextGenPage.tsx/
 *  AgentWorkspace2WithDeskPage.tsx) that, before this, matched nothing in
 *  `contactsById` at all — `getAvailableChannels`/`getHeaderAction` always
 *  came back empty for them, so the record header's own "+" (Add Channel)
 *  row silently showed nothing even for a customer with other channels
 *  genuinely on file (`entry.channels`). Confirmed via screenshot as a
 *  genuinely repeatable bug, not just a one-off for the 5 original rows: a
 *  freshly dismissed interaction gets logged as its own brand-new
 *  `ContactHistoryEntry` (`buildDismissedContactHistoryEntry`) with a fresh
 *  `id`, so reopening THAT row hit the exact same "nothing registered under
 *  this synthetic id" gap all over again — every call site now runs this
 *  over `dismissedContactHistory` too (state, so it has to be recomputed
 *  live, unlike `CONTACT_HISTORY_OUTBOUND_CONTACTS` below), not just the 5
 *  static rows, so newly-dismissed customers get the exact same treatment
 *  going forward instead of only the ones hand-authored ahead of time.
 *
 *  Every entry registered here is meant to sit in its OWN hidden group
 *  alongside `outboundConfig`'s real groups — same "findable via
 *  `contactsById` but not through the New Outbound picker's own group
 *  dropdown" treatment "Dial Pad" already gets, since these aren't real,
 *  dialable directory contacts an agent should be able to search up and
 *  call cold.
 *
 *  Two entries for a row that supports "Redial" (`entry.redial`) — one
 *  under EACH of the two synthetic ids that row's card could actually end
 *  up carrying, since which one applies depends on which button the agent
 *  clicked (Redial vs. Re-open), not something knowable ahead of time
 *  here; a row without Redial only ever produces the `history:` id. */
export function buildContactHistoryOutboundContacts(
  entries: ContactHistoryEntry[]
): NonNullable<CreateNewOutboundConfig["groups"][number]["contacts"]> {
  return entries.flatMap((entry) =>
    entry.redial
      ? [
          contactHistoryOutboundContact(entry, `redial:${entry.id}`),
          contactHistoryOutboundContact(entry, `history:${entry.id}`),
        ]
      : [contactHistoryOutboundContact(entry, `history:${entry.id}`)]
  );
}

/** The 5 hand-authored `CONTACT_HISTORY` rows' own contacts — static, since
 *  `CONTACT_HISTORY` itself never changes at runtime (unlike
 *  `dismissedContactHistory`, which every page's own `contactHistoryOutboundContacts`
 *  memo re-derives live via `buildContactHistoryOutboundContacts` above). */
export const CONTACT_HISTORY_OUTBOUND_CONTACTS: NonNullable<CreateNewOutboundConfig["groups"][number]["contacts"]> =
  buildContactHistoryOutboundContacts(CONTACT_HISTORY);

export const OUTBOUND_TEAMS: NonNullable<CreateNewOutboundConfig["groups"][number]["contacts"]> = [
  // See `OUTBOUND_AGENTS`'s own identical `categoryIcon` comment above.
  { id: "t1", name: "Billing Support",    initials: "BS", subtitle: "TEAM-04", avatarClassName: "bg-lyra-accent-purple-soft text-lyra-accent-purple-strong", channels: ["voice", "email"], categoryIcon: teamCategoryLeadingIcon() },
  { id: "t2", name: "Tier 2 Escalations", initials: "T2", subtitle: "TEAM-07", avatarClassName: "bg-lyra-accent-red-soft text-lyra-accent-red-strong",       channels: ["voice", "email"], categoryIcon: teamCategoryLeadingIcon() },
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
export const OUTBOUND_TEAM_MEMBERS: Record<string, NonNullable<CreateNewOutboundConfig["groups"][number]["contacts"]>> =
  Object.fromEntries(
    OUTBOUND_TEAMS.map((team: any, teamIndex: number) => [
      team.id,
      OUTBOUND_AGENTS.filter((_agent: any, agentIndex: number) => agentIndex % OUTBOUND_TEAMS.length === teamIndex),
    ])
  );

export const OUTBOUND_SKILLS: NonNullable<CreateNewOutboundConfig["groups"][number]["contacts"]> = [
  // See `OUTBOUND_AGENTS`'s own identical `categoryIcon`/`quickLaunch`
  // comments above — a skill queue has no real per-contact address to
  // choose either, so it gets the same immediate-launch treatment.
  { id: "s1", name: "Spanish Language",  initials: "ES", subtitle: "SKL-12", avatarClassName: "bg-lyra-accent-green-soft text-lyra-accent-green-strong", channels: ["voice", "email"], status: "available", queueCount: 4, waitTimeSeconds: 200, categoryIcon: skillCategoryLeadingIcon(), quickLaunch: true },
  { id: "s2", name: "Technical Support", initials: "TS", subtitle: "SKL-03", avatarClassName: "bg-lyra-accent-blue-soft text-lyra-accent-blue-strong",   channels: ["voice", "email"], status: "busy",      queueCount: 7, waitTimeSeconds: 95, categoryIcon: skillCategoryLeadingIcon(), quickLaunch: true },
];

// Every group the "New Outbound" flow could show — kept as its own named
// constant, separate from `OUTBOUND_CONFIG.groups` below, so any group can
// be hidden from the "Choose group" dropdown without deleting it: per
// explicit request ("hide it don't destroy it"), a hidden group's
// definition stays fully intact here, just filtered out (by id, via
// `HIDDEN_OUTBOUND_GROUP_IDS` below) before being handed to `CreateNew`.
// Restoring one later is a one-line revert (add/remove its id in that
// array), not re-authoring the group from scratch. "Dial Pad" (below) used
// to be this mechanism's only example — it's no longer hidden this way
// (see its own doc comment), but the mechanism itself stays in place for
// any future group that needs it.
export const OUTBOUND_GROUPS: CreateNewOutboundConfig["groups"] = [
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
  // Per explicit request: each group below gets a leading icon in the
  // "Choose group" dropdown (`CreateNewOutboundGroup.icon`, lyra-ui's
  // create-new.tsx), matched to what that group represents — a headset for
  // Agents (support), a people-group for Teams, a share/network glyph for
  // Skills, and a single person for Customers. `h-4 w-4` here is purely
  // defensive/self-documenting — `Select`'s own icon slot already forces
  // every option icon to that size (select.tsx) regardless of what's
  // authored on the element itself. "All" (above) intentionally has no
  // icon — it wasn't part of the requested set, and the plain "All" row
  // reads fine unadorned as the default/catch-all option. "Dial Pad"
  // (below) DOES have its own icon (`dialpadCategoryIcon`) despite never
  // reaching this same dropdown — see that group's own doc comment.
  { id: "agents", label: "Agents", contacts: OUTBOUND_AGENTS, icon: agentCategoryIcon() },
  { id: "teams", label: "Teams", contacts: OUTBOUND_TEAMS, icon: teamCategoryIcon() },
  { id: "skills", label: "Skills", contacts: OUTBOUND_SKILLS, icon: skillCategoryIcon() },
  { id: "customers", label: "Customers", contacts: OUTBOUND_CUSTOMERS, icon: customerCategoryIcon() },
  // No longer hidden via `HIDDEN_OUTBOUND_GROUP_IDS` (see that constant's
  // updated doc comment below) — per explicit follow-up request, this
  // group is reachable again, just via a small ghost button below the
  // "Choose group" Select instead of a dropdown entry. lyra-ui's own
  // create-new.tsx filters `kind === "dialpad"` out of the Select's
  // `options` specifically (not this array), so this group still flows
  // through to `outbound.groups` for that ghost button (and
  // `activeGroup`/`onQuickDial`/`handleQuickDial` below) to find, it just
  // never appears as a Select option. `icon` now set (`dialpadCategoryIcon`)
  // so the ghost button renders the same grid glyph the reference mockup
  // showed, reusing the group's own icon like every other group already
  // does rather than hardcoding one in create-new.tsx.
  { id: "dialpad", label: "Dial Pad", kind: "dialpad", icon: dialpadCategoryIcon() },
];

// Group ids hidden from the "New Outbound" filter dropdown without being
// removed from `OUTBOUND_GROUPS` above — see that constant's own doc
// comment for why. Add/remove ids here to hide/restore a group; the
// group's own definition never needs to change. Empty for now — "dialpad"
// was the only entry here, and per the most recent explicit request it's
// no longer hidden from `OUTBOUND_CONFIG.groups` (see that group's own
// updated doc comment above); it's excluded from the Select's own
// dropdown options a different way now (lyra-ui's create-new.tsx, keyed
// off `kind` rather than this array). Kept in place, not deleted, as the
// general-purpose "hide a group from the dropdown without deleting it"
// mechanism for any future group that needs it.
export const HIDDEN_OUTBOUND_GROUP_IDS: string[] = [];

export const OUTBOUND_CONFIG: CreateNewOutboundConfig = {
  outboundTitle: "New Outbound",
  groups: OUTBOUND_GROUPS.filter((g) => !HIDDEN_OUTBOUND_GROUP_IDS.includes(g.id)),
  // "all" (not "agents") — per explicit request, the New Outbound picker
  // now opens on the "All" filter (favorited contacts idle, full-database
  // search once typed) by default instead of Agents.
  defaultGroupId: "all",
  // One label for the whole flow, not per-group — per explicit
  // request/confirmed UX bug: search matches name/subtitle/phone/email
  // identically no matter which group filter is selected, so text that
  // changed per group (e.g. "Search Agents") falsely implied switching
  // the filter changed what the box searched for. Rendered as a real
  // `<label>` above the field, not placeholder text, per a further
  // explicit follow-up. See `CreateNewOutboundConfig.searchLabel`'s own
  // doc comment in create-new.tsx.
  searchLabel: "Enter phone, email or search term",
  // Per explicit request: the New Outbound picker's contact list isn't
  // ready to show yet — hide it (and its pagination footer) for every
  // group, leaving just the group dropdown ("Choose group" — Favorites/
  // Agents/Teams/Skills/Customers) and its search field visible above an
  // empty body. See `CreateNewOutboundConfig.hideContactList`'s own doc
  // comment in create-new.tsx. Remove this once the real list is ready.
  hideContactList: true,
  channelOptions: [
    { id: "voice",    label: "Call",     selectLabel: "Voice", icon: <Phone       className="h-5 w-5" strokeWidth={1.5} /> },
    // Per explicit request: agents' only other reachable channel besides
    // Voice — `MessageCircle`, matching `ChatChannelRow`/`CHANNEL_TYPE_META.
    // chat`'s own icon (lyra-ui channel-row.tsx) for the same channel type,
    // same reasoning `WhatsAppIcon`'s own swap-in above already documents.
    // No contact in any OTHER group lists "chat" among its own `channels`
    // (only `OUTBOUND_AGENTS`, above, does), so this option only ever
    // surfaces for an agent contact.
    { id: "chat",     label: "Chat",                           icon: <MessageCircle className="h-5 w-5" strokeWidth={1.5} /> },
    { id: "email",    label: "Email",                          icon: <Mail        className="h-5 w-5" strokeWidth={1.5} /> },
    { id: "sms",      label: "SMS",                            icon: <MessageSquare className="h-5 w-5" strokeWidth={1.5} /> },
    // `WhatsAppIcon` (lyra-ui's own real brand glyph, channel-row.tsx) — was
    // the generic Lucide `MessageCircle` bubble, a real mismatch confirmed
    // via screenshot: this channel's own icon here (the record header's
    // per-channel "Add Channel" buttons, and the "Select Channel" list, both
    // read their icon from this array) didn't match the one
    // `WhatsAppChannelRow`/`CHANNEL_TYPE_META.whatsapp` already used
    // everywhere else (the LeftNav's own channel chips, the record-header
    // tabs) for the exact same channel.
    { id: "whatsapp", label: "WhatsApp",                       icon: <WhatsAppIcon className="h-5 w-5" /> },
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
