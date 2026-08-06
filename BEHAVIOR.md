# BEHAVIOR.md — Conditional Logic Reference

Every behavioral rule in this prototype, stated as **WHEN condition → behavior**, with its source (`functionOrVariable`, ~approximate line in `src/components/AgentNextGenPage.tsx` unless another file is named). Line numbers drift as the file grows — grep the source name, not the number.

**Maintenance**: when you add or change conditional behavior, update the matching rule here (or add one) in the same commit. This file is the "what is supposed to happen" contract; the code is the "how."

---

## 1. Routing & top-level navigation

- WHEN hash is `#/agent` → Desk page (`AgentNextGenPage`); `#/agentworkspacepremium` → agent-workspace; `#/outboundengagement` → outbound; anything else (incl. empty) → `LoginPage` (`pageFromHash`, App.tsx ~L22)
- WHEN `navigate(page)` is called → `history.pushState`; browser `popstate` re-derives the page from the hash (`useHashRouter`, App.tsx ~L30)
- WHEN page === "agent" → Desk renders its own header/LeftNav; the shared Header/Sidebar/AiPanel shell is used only for outbound/agent-workspace (App.tsx ~L311)
- Desk content column is a 3-way exclusive switch: WHEN `showSettings` → Settings; ELSE WHEN `activeInteraction` → interaction record view; ELSE → dashboard (~L11993–12556)
- WHEN Settings rail item clicked → `setShowSettings(true)` + `switchActiveInteraction(null)`; Home → `switchActiveInteraction(null)` + `setShowSettings(false)` (~L11497)
- WHEN any `activeInteractionId` becomes truthy → `setShowSettings(false)` (~L8972)
- Home rail item `active` only WHEN `!hasActiveInteraction && !showSettings`; Settings active WHEN `showSettings` (`buildNavItems`, ~L767)
- WHEN switching branches → each remounts via `key` (`"settings"`, `interaction-${id}`, `"dashboard"`) so the entrance fade replays (~L12014)
- WHEN AgentProfile "Log Out" clicked → `onNavigate("login")` (~L11477)

## 2. Interactions & assignments — creation and merging

- WHEN CreateNew "Start Interaction" fires and no card exists for the contact → new card appended, `currentChannelId = newChannel.id`, `startedFresh: true`, `recordId = contact.subtitle ?? generateCaseId()` (`handleStartCall`, ~L9726)
- WHEN the same contact already has a card AND the same channel type+address exists → that channel row is REPLACED in place (timer restarts, its `channelStatuses` entry cleared); `liveMessages` deliberately kept (~L9759)
- WHEN the same contact, same channel type, but a DIFFERENT address → a NEW channel row is added alongside (two SMS threads on different numbers are separate conversations) (~L9752)
- WHEN the channel existed with `channelStatuses[id] === "Closed"` → treated as a reopen: `reopenedSessions` entry pushed with `messagesBeforeReopen` so prior messages stay visible (dimmed) under their own session (`isReopenOfClosedChannel`, ~L9684)
- WHEN any channel is started/restarted → it always becomes `currentChannelId` (~L9765)
- WHEN quick dial is used → card id `quickdial:<number>`, single literal `"voice"` channel; re-dial wholesale-replaces `channels` and resets `channelStatuses`/`liveMessages` (`handleQuickDial`, ~L9858)
- WHEN Redial on a Contact History row → id `entry.customerId ?? redial:<id>`; same wholesale replace; carries the real customer name; synthetic ids get no "+" Add Channel button (`handleRedial`, ~L9924)
- WHEN a Contact History ROW (not Redial) is clicked → reopens that past interaction: single channel of `entry.channelType`, `closed = entry.closed`, `channelStatuses = {id: entry.statusLabel}`, `liveMessages` cleared, `startedFresh` unset (`handleReopenContactHistoryEntry`, ~L9987)
- WHEN a channel/address is currently open for a contact → that exact address is disabled in CreateNew's channel/address pickers; Voice is blocked by TYPE (no per-address concept); a "Closed" channel no longer counts as open and can be reselected to reopen (`outboundConfig`, ~L10297)
- WHEN a launched interaction is genuinely new → Customer Information opens per `lastSidePanelOpenChoice.current`; an existing card's panel state is left as the agent left it (~L9798)
- `messageCount` is `undefined` for voice, `0` for digital channels (~L9740s)

## 3. Channel selection & sync

- WHEN a nav-card channel row OR a header ChannelTab is clicked → both call `handleChannelSelect(interactionId, channelKey)`, writing `interaction.currentChannelId` — that single field drives the card highlight, the active tab, and the transcript's `liveMessages[activeChannelKey]` (~L10127, L11776, L12316)
- WHEN nothing is explicitly current → the LAST channel in `channels` is the fallback everywhere (card, tab bar, `handleSendMessage`) (~L11707)
- WHEN a card (not a channel row) is clicked → `switchActiveInteraction(id)` plus a direct `setPanelFullScreen(false)` (clicking the already-active card changes no state, so the reset effect wouldn't fire) (~L11734)
- WHEN the currently-selected channel is dismissed → "current" passes to the new last remaining channel (`handleDismissChannel`, ~L10119)

## 4. Awaiting-response & SLA

- WHEN the agent sends a message → that channel's `awaitingResponse` set false immediately (`handleSendMessage`, ~L10210)
- WHEN the simulated customer reply lands (2500ms later) → `awaitingResponse: true` and `lastCustomerMessageTick = clockTick` on the channel captured AT SEND TIME (`channelKeyAtSend`), so switching tabs mid-wait can't misattribute the reply (~L10164)
- WHEN any open channel on a card awaits → card-level `awaitingResponse` true; severity uses the OLDEST wait among awaiting channels (`cardAwaitingChannels`, ~L11696)
- WHEN a channel's status is "Closed" → its awaiting state/severity forced off (row and tab) (`effectiveAwaitingResponse`, ~L11591)
- Severity: wait ≥ `AWAITING_CRITICAL_SECONDS` → critical (red); ≥ warning threshold → warning (amber); else success (green = just responded) (`getAwaitingSeverity`, ~L740)
- WHEN active-channel severity is warning/critical AND neither interaction nor channel is closed → SLA InlineNotification ("nearing SLA breach" / "breached SLA time") (~L12474)

## 5. Timers

- Shared 1s `clockTick` interval drives all interaction timers (~L8922); the agent-status timer is a separate clock
- Channel `startTick` = tick at creation → per-channel elapsed = time since opened; WHEN awaiting → reads `clockTick − lastCustomerMessageTick` instead (~L11567)
- Card elapsed = awaiting-time if any channel awaits, else time since the OLDEST open channel started (~L11685)
- WHEN every channel on a card is closed → elapsed renders empty (counter disappears rather than freezing) (~L11740)
- WHEN agent status changes → status timer resets to 0 (`handleStatusChange`, ~L9642)

## 6. Interaction switching & state persistence

- WHEN `activeInteractionId` or `showSettings` changes → shared panel fullscreen exits (~L9115)
- WHEN switching away from an assignment → its Customer Information `{open, fullScreen}` is snapshotted per-id (`sidePanelStateByAssignmentId`) and restored on return; a never-seen id gets `fullScreen: false` and `sidePanelOpen` left to the call site (`switchActiveInteraction`, ~L9520)
- WHEN a card is dismissed → its snapshot entry is deleted (~L10084)
- WHEN switching to a DIFFERENT interaction → content column (`key=interaction-${id}`) and side-panel wrapper (`key=side-panel-${id}`) remount: panel tab resets to Overview, `selectedHistoryIndex` → null. Navigating Home/Settings and back to the SAME interaction preserves them (~L12068, L11838, L7511)
- `liveMessages` persist across switches (stored on `ActiveInteraction`, not component state) (~L588)
- `interactions`, `deskTabOrder`, `activeDeskTab`, notifications persist across Home/Settings navigation (component stays mounted)

## 7. Closing, outcomes & read-only

- WHEN "Unassign & Dismiss" on a card with ONE open channel → logs a Contact History entry, success toast, removes the interaction, deletes its panel snapshot, hands active to `remaining[0]` (`handleDismissInteraction`, ~L10050)
- WHEN more than one channel is open → `handleDismissChannel` removes only that channel (matched by `id ?? type`, never type alone) and does NOT log history (the interaction isn't over) (~L10095)
- Dismissal logging: `statusLabel` = primary channel's last status, default "Resolved"; duration = `clockTick − earliestStart`; `closed` deliberately unset so the row reopens reply-able (~L2076)
- Status popover: non-"Closed" statuses apply immediately; "Closed" swaps to a "Close Contact?" confirm body first; reopening the popover always starts on the list view, never a stale confirm (`selectSessionStatus`/`handleStatusMenuOpenChange`, ~L4982–5026)
- Outcome popover: 3 entry points (ChannelRow kebab, transcript separator, ChannelTab kebab) share one draft (`outcomeDraftKey = interactionId:channelKey` + `outcomeDraftSource`); the draft resets on open; Approve & Save / Cancel only close — except Resolution, which writes through to `channelStatuses` (~L8699)
- WHEN `activeInteraction.closed` → full read-only: banner "You are viewing a closed interaction.", composer hidden, channel kebabs/menus hidden, transcript dimmed (~L12433)
- WHEN only the active channel is "Closed" → "This channel is closed. Reopen it to continue" banner; that channel's composer hides; other channels stay usable (~L12448)
- WHEN channel type is email or voice → composer hidden regardless (~L12546)

## 8. Contact History (dashboard) vs Customer History (panel tab)

- Contact History "Today" starts EMPTY; it fills only as the agent dismisses assignments (`dismissedContactHistory`) (~L1795)
- Ranges are cumulative supersets: last48h adds 5 hand-authored rows; last72h adds 5 more built from `CREATE_NEW_CUSTOMERS` (`buildContactHistoryByRange`, ~L2156; default `"today"`)
- Search filters name/description/caseId/channelLabel, case-insensitive (~L2250)
- Customer History (panel "Interactions" tab): 8 entries DETERMINISTICALLY SYNTHESIZED per customer, most-recent-first, stepping back 2–47h per entry (`buildCustomerHistoryEntries`, ~L6452); no `recordId` → tab renders nothing (~L7482)
- Its date filter defaults to `"last30"` because synthesized entries reach ~16 days back — "Last 7 days" would hide most history; Clear-all returns to `last30` (~L6578)
- Detail-panel chevrons walk the FULL UNFILTERED entries array (filtered rows keep their original index) (~L6674, `handleHistoryNav` ~L7528)
- WHEN the session detail panel opens → it lands on the **Conversation** tab (not Details); the active tab is NOT reset when chevroning between sessions — an agent scanning back through sessions keeps whichever tab they chose (`CustomerHistorySessionDetailPanel`, `useState(indexOf("Conversation"))`, no reset effect)
- WHEN the Conversation tab renders → a one-line outcome header (`statusLabel · agentName · timestampDisplay`) sits above the thread, so "how did that end?" lookups can finish without reading messages
- WHEN Overview's "Latest Interaction" accordion renders in the REAL side panel (not the hover preview) and history entries exist → an "Open Conversation" ghost button deep-links to the Interactions tab with the newest session's detail already open (`onSelectTab` + `setSelectedHistoryIndex(0)`)
- WHEN a session detail OPENS while the panel is not fullscreen → the panel auto-enters fullscreen (readable width); WHEN that detail CLOSES and fullscreen was auto-entered → fullscreen exits. Fires only on open/close transitions — an agent who manually exits fullscreen mid-read is not fought back into it, and a manually-chosen fullscreen is never auto-exited (`prevHistoryDetailOpenRef`/`autoEnteredFullScreenRef` in `CustomerInformationPanelBody`)
- WHEN a new/different interaction becomes active → panel remounts: Overview first, no lingering history selection (~L11866)

## 9. Header app panel (single shared slot)

- WHEN a panel icon is clicked while the panel is closed → variant forced `"docked"`, panel opens (first open is never a float) (`handlePanelButtonClick`, ~L10824)
- WHEN open and the clicked key === `activePanelKey` → panel closes; WHEN a different key → only content swaps (no resize/reposition/re-animate) (~L10825)
- Only ONE shared panel exists (`activePanelKey`); there is no multi-panel z-order competition (~L10503)
- Open: float anchor computed once, height = `min(windowHeight − containerTop − 8, 860)`, recomputed on resize (`computePanelHeight`, ~L9625)
- Close: 150ms closing state, fullscreen forced off (~L10444)
- Dock: current rect captured for later undock; width resets unconditionally to `SHARED_PANEL_DEFAULT_WIDTH` (~L10522)
- Float: `position: fixed; zIndex: 40` — deliberately below header menus' `z-[9999]`; float gets shadow + 80%-opacity blur background, docked is opaque full-height (~L10583, L11089)
- Fullscreen: overlay `absolute … z-[9]` inside the content container (LeftNav + AppHeader stay visible; above Customer Info `z-[5]`, below LeftNav toggle `z-10`); both Draggable wrappers unmount; enter = double-rAF fade/scale, exit = 180ms delay (~L11195, L10473)
- Fullscreen "Undock" → width 1024, computed height, variant float (~L10555); fullscreen X closes the panel entirely (~L11245)
- Resize bounds: width 280–1024, minHeight 400; width transition disabled while resizing (~L11068)

## 10. Header icon row & "View All Apps"

- WHEN the gap between AppName and the icon row < 16px → hide the farthest-left pinned icon; WHEN gap > 84px → reveal one (hysteresis prevents flapping) (~L11012)
- `showHeaderIcon = pinned && !responsivelyHidden` (~L11057)
- Defaults: `notif`, `conversations`, `search` pinned; others unpinned (~L9198)
- `customers`/`accounts`/`tickets`/`wem` are hidden from the kebab menu (`HIDDEN_FROM_APPS_MENU`) — unpinning them makes them unreachable (~L10899)
- One `useColumnReorder(panelOrder)` instance drives BOTH the header icons and the kebab rows (drag either surface, same order) (~L10878)
- WHEN the notifications icon isn't shown → the unread count moves onto the kebab badge (never shown twice) (~L11459)
- Active key gets the blue selected treatment on both surfaces (~L10910); kebab rows use `closeOnSelect: false` (~L10911)
- WHEN `windowWidth < 760` → compact AppName + AppMenu header (~L9596)

## 11. Left nav

- WHEN `bodyContainerWidth < 768` (ResizeObserver on the nav+content row, NOT the viewport) → `overlay={true}` hover-to-open mode; if expanded, auto-collapses (~L9157, L9599)
- Starting/reopening an assignment does NOT auto-expand the rail (removed on purpose) (~L9647)
- WHEN collapsed and a card has exactly ONE open channel → `CollapsedChannelBadge` overlays the tile corner (skipped at 2+ channels — the card's own count badge takes over); warning/critical severity replaces the channel accent with solid warning/destructive + alert glyph (~L11791; CollapsedChannelBadge.tsx ~L160)
- In overlay mode, `expanded={navOpen}` is passed directly to `CreateNew`/caption/cards (LeftNav's `injectExpanded` can't reach wrapped children) (~L9814)
- Non-Desk shell (App.tsx): viewport < 1280 → sidebar overlay + auto-collapse, persisting `lyra_sidebar_open=false` (App.tsx ~L224)

## 12. Customer Information panel & hover preview

- The person-icon toggle renders only while the panel is closed AND an interaction is active; its grid track animates in 100ms after the panel finishes closing; hide edge is instant (~L9414, L12148)
- WHEN content width < 768 → panel forced UNPINNED (floats as overlay); `sidePanelOpen` is not force-changed (~L9341)
- WHEN content width ≤ 425 and open → fullscreen forced ON (one-way: widening doesn't force it off) (~L9359)
- WHEN content width ≤ 350 → fullscreen toggle hidden; crossing back above 350 restores the button AND exits fullscreen (~L9379)
- Hover: pinned → hover does nothing either direction; unpinned → hover-in opens instantly, hover-out closes after 300ms; while resizing, mouse-leave is unwired (drag past the edge can't close it) (~L9430)
- Header close: closes + exits fullscreen + records `lastSidePanelOpenChoice=false`; pin state untouched (`handleSidePanelClose`, ~L9446)
- Icon toggle click: always toggles (never a no-op), records the choice, closes/cancels the hover preview (`handleSidePanelIconToggle`, ~L9550)
- Hover preview popover: opens instantly on trigger hover/focus, closes 150ms after leaving trigger AND content (gap-crossing safe); `onOpenAutoFocus`/`onCloseAutoFocus` prevented (the flash-loop guard); forced closed when the active interaction changes (~L9571, L12220, L9582)
- Panel remounts per assignment (`key=side-panel-${id}`) → fade-in instead of width-slide; wrapper carries explicit `z-[5]` because `animate-in` creates a stacking context that would otherwise lose to the content column (~L11912, L11880)
- Width: starts 340, max 425; pinned state and width are GLOBAL across assignments (only open/fullscreen snapshot per-assignment) (~L9295, L9520)

## 13. Interior panels

- Customer History session detail: opens on card click (`selectedHistoryIndex`); `z-[3]` — above the list, below Customer Info's `z-[5]` (both would otherwise collide at `z-[5]`) (~L6983, L7905)
- Below InteriorPanel's ~1024px internal threshold it overlays the list; at ≥1024 it docks inline side-by-side (~L7869)
- Chevrons: `hasPrevious/hasNext` bound to the entries array; `activeTab` resets on every `entry.id` change (~L7910, L6978)
- Customers table: row click opens `CustomerRowInfoPanel`; clicking the already-open row CLOSES it; chevrons walk the filtered+sorted rows; tab resets keyed on `contactNumber`; measured width < 480 collapses header actions into a kebab (~L12705, L8852, L8373)
- Dashboard: queue-card click opens the ONE shared right InteriorPanel (`selectedQueueId` takes priority over the Case Details content); close clears both flags (~L12828)

## 14. Responsive thresholds (consolidated)

| Threshold | Measured on | Effect |
|---|---|---|
| < 1280px | viewport (App.tsx shell) | sidebar overlay + auto-collapse (non-Desk pages) |
| < 768px | nav+content row width | LeftNav overlay mode; nav auto-collapse; enables combined-panel mode |
| combined mode | `isNavNarrow && panelOpen && docked` | docked panel merges with main region into ONE two-tab container; icon click switches to the panel tab; undock exits combined mode (~L10811) |
| < 768px | content container | Customer Info forced unpinned overlay |
| ≤ 425px | content container | Customer Info forced fullscreen (one-way) |
| ≤ 350px | content container | fullscreen toggle hidden; crossing up exits fullscreen |
| < 760px | viewport | compact AppName + AppMenu header |
| < 480px | CustomerRowInfoPanel width | header actions collapse to kebab |
| ~1024px | InteriorPanel internal | overlay vs inline docking |
| < 16px / > 84px | AppName↔icons gap | hide / reveal header icons (hysteresis) |
| < 400px (CSS) | `lyra-transcript-wrap` container | transcript avatar collapse |
| < 480px (CSS) | filter-chip container | filter chips go icon-only |
| 768px | SchedulePanel toolbar | one-row vs two-row toolbar |

## 15. Notifications

- Click behavior by type: `new-case`/`escalation` → open/create assignment + mark read; `new-agent-chat` → switch shared panel to Agent Chat + mark read (no assignment); `new-chat`/`missed-call` → mark read only (~L10682)
- Assignment resolution: customer id = `CREATE_NEW_CUSTOMERS[Number(id) % length].id` (deterministic — re-clicks hit the same card); channel = `NOTIFICATION_CHANNEL[id] ?? "email"`; existing card → channels wholesale-replaced, name preserved; new card → `customerName = subtitle`, `startedFresh` NOT set (full mock history shows) (~L10608)
- Titles derive from channel: `New ${noun}` / `Escalation - ${noun}`; sms/whatsapp/chat all read "Chat", voice "Call" (~L1061)
- Unread badge = count of `!read`; moves to the kebab when the bell icon is hidden; Mark-all sets read, Clear-all empties, per-row dismiss filters (~L10936, L10669)

## 16. Agent status & welcome

- Initial: `unavailable` + welcome modal (not dismissible by backdrop or Escape); "Go Available"/"Start Unavailable" both set status and reset the timer (~L8977, L10418, L13086)
- Status change always resets the status timer; ticks 1s, formats HH:MM:SS (~L9642)
- Dark mode: initialized from `<html data-theme>`; toggle writes it back (~L8981)
- Welcome modal backdrop uses `color-mix()` on the shell token so it follows the theme (~L13081)
- `hideConnectedApps` omits that status-menu row; `onHelpClick` adds a Help row (~L11483)

## 17. CreateNew / New Outbound

- Default group `"all"` (favorites-style: idle shows starred, typing widens); `dialpad` group filtered out via `HIDDEN_OUTBOUND_GROUP_IDS` (quick-dial UI unreachable; handlers still wired) (~L290)
- `hideContactList: true` — group dropdown + search only (~L346)
- Trigger click → search input focused (rAF + 50ms) with `autocomplete="off"` (~L9827)
- Customers-tab channel popover: Start blocked unless skill set AND an unused address remains; channels with no remaining address disabled; each open resets channel to default and clears skill (~L2628)
- `OutboundAddButton` is self-contained — `useOutboundAddButton` must receive `{...outboundConfig, onStartCall: handleStartCall}` or Start only console-logs (~L10393)
- Escape: steps back one level in CreateNew; closes the composer quick-reply menu; the welcome modal ignores it

## 18. Screen Pop

- Default `"salesforce"`; salesforce/zendesk render `MockLoginCard` variants; all other apps → "Nothing here yet."; the app Select lives in `headerContent` so it never scrolls (~L9176, L10729)

## 19. Dashboard

- Contact-history date filter: Today (default) / Last 48 Hours / Last 72 Hours — cumulative ranges (see §8)
- Performance cards' DateFilterChip: Today (default) / Yesterday / Last 7 days / Custom → Custom reveals a DateRangePicker (~L1495)
- Customers list stays MOUNTED when its tab is inactive (`absolute inset-0 opacity-0 inert`) — state survives tab switches; accounts/tickets/wem show "Coming soon" (~L12686)

## 20. Composer

- Send enabled only when trimmed message is non-empty (~L5631)
- Hidden when: interaction closed, active channel "Closed", or channel type email/voice (~L12546)
- Send → append to `liveMessages[channelKeyAtSend]`, clear that channel's awaiting; canned customer reply lands 2500ms later on the SAME captured key with `awaitingResponse: true` (~L10151)
- `/`-prefixed token opens the quick-reply menu; arrows/Enter/Escape handled in `handleComposerKeyDown` (~L5628)

## 21. Transcript

- Session separators are `sticky top-0 z-[1]`; a separator's session block must contain its own messages (incl. live ones) or a fresh session has ~zero height and unsticks; a `container-type` ancestor between separator and scroller breaks stickiness (~L4183, L5308)
- Sessions expand independently (`openSessionIds` is a Set) (~L4937)
- Only the CURRENT session (`lastSessionId`) has a working status popover routed to the interaction; older sessions use local overrides and get no Outcome popover / dismiss button (~L5000, L4147)
- Transcript dismiss: >1 channel removes just the channel; otherwise the whole interaction (~L12527)
- Voice/email with no messages → "Coming Soon" placeholder (~L5359)
- Per-message actions appear on hover/focus-within, forced visible while that message's tag picker is open; tag picker is multi-select and deliberately stays open; one open picker at a time (~L3866, L5042)
- Mount scrolls to bottom ONCE (layout effect, empty deps); "N new" chip appears only when scrolled away from bottom (~L5097)
- Closed interaction or closed channel → transcript `dimmed` (~L12498)
