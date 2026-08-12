# Login Screen & Welcome Modal — Behavior Spec

Handoff doc for the development team. Covers the Login screen (`LoginCard`) and the post-login Welcome modal (`AgentWelcomeMessage` inside `Modal`) in `agent-next-gen-v2`. No screenshots are included (sandbox couldn't render the app — see note at the end); every visual detail below is instead described precisely enough (copy, layout, colors-by-token, exact timings) to verify against the running app or reconstruct from scratch.

**Source files**
- `src/components/LoginPage.tsx` (app-level wrapper, `agent-next-gen-v2`)
- `src/App.tsx` (routing — `agent-next-gen-v2`)
- `../lyra-ui/src/components/login-card.tsx` (`LoginCard` — the real component)
- `../lyra-ui/src/components/agent-welcome-message.tsx` (`AgentWelcomeMessage`)
- `../lyra-ui/src/components/modal.tsx` (`Modal` — Radix Dialog wrapper)
- `src/components/AgentNextGenPage.tsx` (welcome modal's call site + state, lines ~723, ~2290–2302, ~5260–5285)
- `src/components/agent-next-gen-interaction-dashboard.tsx` (line 727, `WELCOME_MODAL_LAST_LOGIN` constant)

---

## 1. Login Screen

### 1.1 Entry point

Root route (`""` / empty hash) — it's the app's home page. `App.tsx`'s hash router renders `<LoginPage onNavigate={setPage} />` whenever `page === "login"`, which is the default before any hash is present. `LoginPage` is a thin wrapper:

```
<div class="flex h-screen w-screen items-center justify-center bg-lyra-bg-surface-shell p-6 animate-in fade-in-0 duration-500">
  <LoginCard onLaunch={() => onNavigate("agent")} />
</div>
```

The page itself fades in over **500ms** on mount (Tailwind `animate-in fade-in-0 duration-500`, default ease). `LoginCard` is centered in the viewport, full-bleed background using the `lyra-bg-surface-shell` token.

### 1.2 Layout / composition

`LoginCard` renders as a **360px-wide** `Container variant="modal"` (`bg-lyra-bg-surface-overlay`, `border-lyra-border-subtle`, `shadow-xl`) with a header (app icon + "Agent Next Gen" title) and body:

1. A shaded panel (`bg-lyra-bg-surface-container-subtle`) containing:
   - **Phone Setup** — a required radio group, 3 options
   - A separator
   - **Dark/Light mode toggle** button (ghost variant)
   - Conditionally: Phone Number field, or Station ID field
2. **Launch** button (primary, full width, size `lg`)
3. **Save Preferences** checkbox
4. Conditionally (only while launching): a "Compiling Experience" progress block

### 1.3 States

#### State A — Default (on load)
- Phone Setup defaults to **"Integrated Soft Phone"** (first radio option).
- No extra fields shown (no Phone Number / Station ID panel).
- **Launch button is enabled immediately** — the default option requires no additional input, so `isFormValid` is `true` on mount with zero interaction.
- Dark/Light toggle reflects whatever theme is currently active on `<html data-theme>` at mount time (see §1.5).
- Button label: **"Launch Agent Next Gen"**.

#### State B — "Phone Number" selected
- A `PhoneInput` field ("Enter Phone Number") slides/fades open beneath a new separator (see §1.4 for the exact animation).
- Country selector is hidden (`hideCountrySelector`) — always **United States (+1)**, mask `(###) ###-####`, requires exactly **10 digits**.
- Launch button stays **disabled** until the number is exactly 10 digits.
- **Error state**: `PhoneInput` tracks its own "touched" flag, set on the field's first `blur`. Once touched, if the digit count doesn't match the US mask, the field shows a red border/focus ring and an inline message below it: **"Enter a valid United States number (10 digits). Example: (555) 555-5555."** Same touched-on-blur pattern as the Station ID field in State C.

#### State C — "Station ID" selected
- An `Input` field ("Enter Station ID") slides/fades open in place of the phone field.
- Launch button is **disabled** until the value exactly equals the mock valid ID, `"12345"`.
- **Error state**: once the field has been blurred (`onBlur`) at least once, if the current value ≠ `"12345"`, the field shows a red-bordered error state with the message **"Invalid Station ID"** beneath it. The error does not appear before the first blur (i.e., typing an invalid value and never leaving the field shows no error — only disables Launch).

#### State D — Field values persist across switching
Switching Phone Setup options does **not** clear the other fields' values — `phone` and `stationId` are independent state. Switching back to a previously-filled option restores whatever was typed. Validation only gates on whichever option is *currently* selected (`isPhoneValid`/`isStationIdValid` both short-circuit to `true` when their field isn't the active one).

#### State E — Launching (Compiling Experience)
Triggered by clicking **Launch** while the form is valid (`handleLaunch` — no-ops if invalid or already launching). On entry:
- Every field/radio/checkbox/dark-mode-toggle in the card becomes `disabled` (all still visible, just inert).
- Launch button label changes to **"Launching Agent Next Gen…"** and the button becomes disabled (prevents double-submit).
- A "Compiling Experience" panel opens below the Save Preferences checkbox (see §1.4 animation) showing 3 sequential steps, built from `AIProcess`/`ConversationMessage`, always rendered expanded:
  1. **Authenticating Agent**
  2. **Checking Connection**
  3. **Loading Queue**

  Each step shows one of 4 icon/status treatments (from `AIProcess`'s `StepIcon`):
  | Status | Icon | Badge color |
  |---|---|---|
  | pending | clock | neutral/gray ("shell") |
  | active | spinning loader | blue ("active") |
  | done | checkmark | green ("success") |

  Steps progress **one at a time, in order** — see §1.4 for exact timing. There is no way to cancel a launch in progress.

#### State F — Fully launched (card exits)
Once all 3 steps complete, the whole card fades to `opacity: 0` (see §1.4), then `onLaunch()` fires — which in this app navigates to the Agent Workspace (Desk) page (`onNavigate("agent")`), immediately mounting `AgentNextGenPage` and its own Welcome modal (§2). The Login screen itself is unmounted at that point (route change), so there's no persistent "success" state to see on the Login screen itself.

### 1.4 Animation documentation

| Element | Trigger | Timing | Notes |
|---|---|---|---|
| Whole Login page fade-in | Mount | 500ms, Tailwind default ease | `animate-in fade-in-0 duration-500` |
| Card opacity fade-out | Launch sequence completes | 400ms ease-out (`CARD_FADE_DURATION`) | `transition-opacity ease-out`, fires **500ms after** the 3rd step completes |
| Phone Number panel reveal/hide | Selecting/deselecting "Phone Number" | Container height: 300ms ease-out (CSS grid-rows trick, since `height: auto` can't be transitioned directly); separator opacity: 200ms, 100ms delay; field opacity+translateY: 200ms, 200ms delay | Reveal is staggered: container grows first, then separator fades in, then the field itself fades/slides in (`-translate-y-1` → `translate-y-0`) |
| Station ID panel reveal/hide | Selecting/deselecting "Station ID" | Identical timing/stagger to Phone Number panel above | Same grid-rows + staggered opacity technique |
| Compiling Experience panel reveal | Launch clicked | Container height: 300ms ease-out; inner content opacity: 200ms, 150ms delay | Opens directly beneath the Save Preferences checkbox |
| Step 1 → "active" | Launch clicked (t = 0) | Immediate | "Authenticating Agent" starts as `active` the instant launch begins |
| Step 1 → "done", Step 2 → "active" | t = 700ms | — | `STEP_DURATION = 700ms` |
| Step 2 → "done", Step 3 → "active" | t = 1,400ms | — | |
| Step 3 → "done" | t = 2,100ms | — | |
| Card starts fading out | t = 2,600ms | — | 500ms pause after the last step completes, before the 400ms fade begins |
| `onLaunch()` fires (navigation) | t = 3,000ms | — | i.e., exactly 3 seconds after clicking Launch, end-to-end, assuming the form was already valid |

All of the above timers are `setTimeout`-driven (`STEP_DURATION`/`CARD_FADE_DURATION` constants in `login-card.tsx`) and are cleared on unmount, so navigating away mid-launch cancels the rest of the sequence cleanly (no orphaned timers/state updates).

### 1.5 Input field requirements

| Field | Type | Required when | Validation rule | Error UX |
|---|---|---|---|---|
| Phone Setup | Radio (3 options: Integrated Soft Phone / Phone Number / Station ID) | Always — always has a value (defaults to Integrated Soft Phone) | N/A — just a selector | N/A |
| Phone Number | `PhoneInput`, US only, country selector hidden | Only when Phone Setup = "Phone Number" | Exactly 10 digits (mask `(###) ###-####`); library auto-formats as typed | "Enter a valid United States number (10 digits). Example: (555) 555-5555." shown below the field, red border/focus ring — appears after first blur if still incomplete (this is `PhoneInput`'s own built-in validation, not something `LoginCard` adds) |
| Station ID | `Input`, free text | Only when Phone Setup = "Station ID" | Must exactly equal the hardcoded mock value `"12345"` (this is demo/mock data, not a real backend check) | "Invalid Station ID" shown below the field, but only after the field has been blurred once and the value is still wrong |
| Save Preferences | Checkbox | Never | None — always optional | N/A. **Currently a no-op**: the checked state is tracked in local React state but nothing reads it — it doesn't persist any preference today. Flag to design/PM if this needs real wiring. |
| Dark/Light mode toggle | Button (not a form field, but affects state) | N/A | N/A | Toggles a **global** `data-theme` attribute on `<html>` (not scoped to the card) — this persists through navigation into the rest of the app (SPA, no reload) but is **not saved anywhere** (no cookie/localStorage), so a hard page refresh resets it to whatever the browser/OS default resolves to. |

**Overall Launch-button gating:** `isFormValid = isPhoneValid && isStationIdValid`, where each of those two automatically resolves to `true` whenever that field isn't the currently-selected Phone Setup option. Launch is also disabled while `launching` is `true` (prevents double-submission).

---

## 2. Welcome Modal

### 2.1 Entry point / trigger

Appears automatically every time `AgentNextGenPage` (the Agent Workspace / Desk page) mounts — i.e., on first navigating there from Login, or any time it's re-mounted (navigating away to another page and back). **There is no persistence** (no cookie/localStorage/session flag) suppressing repeat views — `showWelcomeModal` is a plain `useState(true)` local to the component, so it always starts `true` on mount. There's no prop to control this from a parent either.

### 2.2 Composition

Rendered via lyra-ui's `Modal` (Radix Dialog under the hood — portaled, focus-trapped) wrapping `AgentWelcomeMessage` (passed `bare` so it renders just its inner content, since `Modal` already supplies the card chrome — avoids nesting two card surfaces).

```
<Modal variant="light" open={showWelcomeModal} onClose={...} closeOnBackdropClick={false} ariaTitle="Good morning, John Smith">
  <AgentWelcomeMessage bare icon={appIcon} title="Good morning, John Smith" lastLogin="Today at 8:42 AM"
    onPrimaryClick={handleGoAvailable} secondaryLabel="Start Offline" onSecondaryClick={handleStartUnavailable} />
</Modal>
```

`secondaryLabel="Start Offline"` is an explicit override at this call site — `AgentWelcomeMessage`'s own shared default is still `"Start Unavailable"` (unchanged in lyra-ui, so other consumers of the component are unaffected). The click handler is still named/wired `handleStartUnavailable`, and still sets the agent's real status to `"unavailable"` — see the note in §2.6.

Card is **420px wide**, same `Container variant="modal"` surface as the Login card (`bg-lyra-bg-surface-overlay`, `shadow-xl`).

**Content, top to bottom:**
1. App icon (32×32) + greeting heading + "Last login: {value}" subline
2. *(Currently omitted — see §2.5)* an info box slot for skills/teammates-online summary
3. Separator
4. Two full-width buttons side by side: **"Go Available"** (primary/filled) and **"Start Offline"** (outline)

### 2.3 States

#### State A — Open (the only visible state)
Modal is open, backdrop dims/blurs the dashboard behind it. This is effectively the *only* state a user sees — there's no loading/error/success variant of this modal; it's a static, one-shot choice screen.

#### State B — Closed via "Go Available"
`handleGoAvailable`: sets the agent's status to **Available** (`handleStatusChange("available")`, which also resets the "time in current status" counter to 0) and closes the modal (`setShowWelcomeModal(false)`).

#### State C — Closed via "Start Offline"
`handleStartUnavailable`: sets status to **Unavailable** (same as the default/starting status — see §2.6) and closes the modal. (Button label reads "Start Offline"; the handler name and the underlying `AgentStatus` value are both still "Unavailable" — see §2.6.)

There is no third way to close it — see §2.4.

### 2.4 Animation documentation

| Element | Trigger | Timing |
|---|---|---|
| Backdrop fade in/out | Modal open/close | Tailwind default (`animate-in`/`animate-out` + `fade-in-0`/`fade-out-0`), **150ms**, default easing — no custom duration is set on `Modal`'s backdrop or content |
| Card fade in/out | Modal open/close | Same 150ms fade, tied to the same Radix `data-state` transition on `Dialog.Content` |
| Backdrop color/blur | Static (not animated) | `variant="light"` = white-tinted, `backdrop-blur-sm`; this app overrides the fixed white tint with a theme-aware `color-mix()` background (still using the base token colors) so the backdrop matches dark mode too, while keeping the blur |

No entrance/exit slide or scale — just a straight opacity cross-fade for both the backdrop and the card, at Tailwind's default 150ms.

### 2.5 Content notes

- **Greeting text is hardcoded to "Good morning"** regardless of actual time of day — `` `Good morning, ${CURRENT_AGENT_FIRST_NAME} ${CURRENT_AGENT_LAST_NAME}` `` is a literal string in the JSX. This is worth flagging: elsewhere in the app (the Desk header) there's an existing time-aware `getGreetingPeriod()` helper (Good morning/afternoon/evening) that this modal does **not** use. Confirm with design whether the welcome modal should also be time-aware, or if "Good morning" is intentionally the fixed on-shift-start greeting.
- Agent name is hardcoded mock data: **"John Smith"** (`CURRENT_AGENT_NAME`, split into first/last).
- "Last login" value is hardcoded mock data: **"Today at 8:42 AM"** (`WELCOME_MODAL_LAST_LOGIN`) — not computed from any real session/login timestamp.
- The info-box slot (`AgentWelcomeMessage`'s `children`) — meant to show things like current skills count / teammates online / available — is **currently not passed at all**, so that section (and its accompanying separator) doesn't render. The underlying data constants (`AGENT_SKILLS_COUNT`, `TEAMMATES_ONLINE_COUNT`, `TEAMMATES_AVAILABLE_COUNT`) still exist in the codebase, commented out, specifically so this can be restored easily later — see `agent-next-gen-interaction-dashboard.tsx` near `WELCOME_MODAL_LAST_LOGIN`.

### 2.6 Behavioral notes

- **Not dismissible except via the two buttons** — `closeOnBackdropClick={false}` disables both backdrop-click dismissal and Escape-key dismissal (the two are tied together in `Modal`'s implementation). This is a deliberate "forced choice" pattern — the agent must pick a status before the dashboard becomes usable.
- Agent status defaults to **Unavailable** on mount (before the modal is even answered) — so choosing "Start Offline" is a no-op state-wise (it's already the default); it just closes the modal.
- **Label vs. actual status — read carefully:** lyra-ui's `AgentStatus` type no longer has a distinct "Offline" value (only Available/Unavailable — "offline" was dropped from the type a while back). The button's visible label was renamed from "Start Unavailable" to **"Start Offline"** per explicit request, but this is a **label-only change**: clicking it still calls `handleStatusChange("unavailable")`, so the agent's actual status after clicking is `"unavailable"`, not a real `"offline"` value (no such value exists to set). If a true "Offline" status is needed later, that's a separate `AgentStatus`/backend change, not something this button rename alone provides.
- Both choices reset the agent's "time in current status" counter to 0, in addition to setting the status itself.

---

## 3. Open items for the dev team

1. **Save Preferences checkbox (Login screen)** is present and toggleable but not wired to anything — confirm intended behavior before treating it as "done."
2. **Welcome modal greeting is always "Good morning"**, not time-of-day aware, unlike the Desk header's own greeting logic elsewhere in the app. Confirm this is intentional.
3. **Station ID and "valid" phone number are both hardcoded mock values** (`"12345"`; any 10-digit US number), not backed by a real auth/lookup service — expected for this prototype stage, flagging so it isn't mistaken for real validation when wiring a backend.
4. **Dark mode toggle set on the Login screen isn't persisted** (no cookie/localStorage) — confirm whether it should be, consistent with how the app already persists e.g. the left-nav's open/closed state via a cookie (`lyra_sidebar_open` in `App.tsx`).
5. **Welcome modal's info box (skills/teammates online) is currently hidden** — data plumbing already exists commented out in code if/when it should be restored.
6. **"Start Offline" button sets `AgentStatus` to `"unavailable"`, not a distinct "offline" value** (none exists in the current `AgentStatus` type) — this was a deliberate label-only rename per explicit request. If product/design actually wants a real, separate Offline status (e.g. shown differently elsewhere in the app, like the agent-profile status pill), that needs its own follow-up — this change doesn't add one.

---

## 4. Note on screenshots

Automated screenshot capture wasn't possible in this pass: the sandbox this documentation was generated in is ARM64 with no root access, is missing one system library (`libXdamage.so.1`) required to launch a headless browser, and the Ubuntu package mirror needed to install it is blocked by the sandbox's network allowlist. The Claude in Chrome browser extension (which would have let screenshots be captured from a real, connected browser instead) wasn't connected either. Per your direction, this doc proceeds as a written-only spec — every visual detail above (copy, layout order, colors by design token, exact animation durations/easings, validation rules) is described precisely enough to verify directly against the running app, or to hand to design for real screenshots/a Figma pass if still needed.
