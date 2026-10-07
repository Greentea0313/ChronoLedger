# ChronoLedger UI Design Sheet

- **Document:** UI Design Sheet
- **Source:** ChronoLedger Software Requirements Specification (SRS) v1.0
- **SRS status:** Design phase approved
- **UI scope:** Authentication, Dashboard, Spending, Statistics, Games, Subscriptions, Wallets, Settings, Admin
- **Primary desktop pattern:** Calendar-first workspace + right detail sidebar
- **Mobile adaptation:** Bottom sheet for selected-date/detail content
- **Notation:**
  - `[SRS]` = directly supported by the SRS
  - `[PROPOSED]` = visual/UI design decision introduced by this sheet because the SRS does not prescribe the presentation

> **Source boundary:** Functional behavior, state names, restrictions, and business rules in this sheet are derived from SRS v1.0. Colors, typography, spacing, component dimensions, information hierarchy, and exact interaction composition are UI design proposals unless the SRS explicitly specifies them.

---

## 1. Design Principles

### 1.1 Calendar-first interaction model `[SRS + PROPOSED]`

The primary desktop workspace is organized as:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL HEADER                                                                │
├─────────────────────────────────────────────────────────────┬────────────────┤
│                                                             │                │
│                         CALENDAR                            │ DETAIL SIDEBAR │
│                                                             │                │
│                                                             │                │
│                                                             │                │
└─────────────────────────────────────────────────────────────┴────────────────┘
```

- Calendar tiles are intentionally lightweight.
- Day-level detail is exposed through the right sidebar on desktop.
- On mobile, the same detail information becomes a bottom sheet.
- Deeper actions use modal/form surfaces rather than overloading calendar tiles.

### 1.2 Calendar tile information budget `[SRS]`

A calendar tile may display only:

- Game icon
- Schedule banner
- One memo dot regardless of memo count

The tile must **not** display amount or a general spending list. Detail belongs in the desktop sidebar or mobile bottom sheet. (FR-020)

### 1.3 Financial information hierarchy `[PROPOSED]`

Use a consistent hierarchy:

```text
Calendar signal
    ↓
Selected-day detail
    ↓
Spending detail
    ↓
Confirmation / edit / refund modal
```

This keeps the calendar visually clean while still allowing full transaction detail.

### 1.4 State-first UI `[SRS + PROPOSED]`

Spending state is visible and action availability is derived from the SRS state machine:

```text
PLANNED
 ├─ 결제 확정 ───────────→ CONFIRMED
 └─ 예정 취소 ───────────→ CANCELLED / PLANNED_CANCEL
                                  │
                                  └─ 복구 ───────→ PLANNED

CANCELLED / TEMPLATE_DEACTIVATION
 └─ 복구 (template active) ───────→ PLANNED

CONFIRMED
 └─ 결제 환불 ───────────→ CANCELLED / PAYMENT_REFUND
```

`PAYMENT_REFUND` cannot be restored. (FR-031, FR-032, core state transitions)

### 1.5 Online / offline boundary `[SRS]`

- Online: normal read/write behavior.
- Offline with valid session: cached read-only behavior.
- Offline writes are disabled; writes are not queued.
- Session expiration hides personal cached information.
- On online return, unresolved expired planned spending must be re-queried and handled before interactive calendar use. (FR-060~063, NFR-006)

---

# 2. Global Layout System

## 2.1 Desktop shell `[PROPOSED]`

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Brand │ Primary Nav │ Month / Context │ Budget Status │ Sync │ Account       │
├───────┴──────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                     Page Content Area                                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Suggested shell regions

| Region | Purpose | Notes |
|---|---|---|
| Brand | Product identity | ChronoLedger |
| Primary Nav | Dashboard / Spending / Statistics / Games / Subscriptions / Wallets | Hide Admin from non-admin users |
| Context Actions | Page-specific | Month navigation on Dashboard |
| Status | Budget / sync / offline state | Compact, persistent |
| Account | Settings / logout | No personal data in signed-out state |

## 2.2 Desktop width model `[PROPOSED]`

```text
Viewport
┌──────────────────────────────────────────────────────────────┐
│ 24px outer padding                                           │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Main content                                   │ Sidebar│ │
│ │                                                  340px  │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

Suggested baseline:

- Content gutter: 24px
- Grid gap: 16px
- Sidebar: 320–360px
- Card radius: 12px
- Control height: 40px
- Large action height: 48px

These values are UI proposals, not SRS requirements.

## 2.3 Mobile shell `[PROPOSED + SRS]`

```text
┌───────────────────────┐
│ Header                │
├───────────────────────┤
│                       │
│      Calendar         │
│                       │
│                       │
├───────────────────────┤
│ Bottom navigation     │
└───────────────────────┘

Selected date:

┌───────────────────────┐
│     ───────           │
│  10월 6일             │
│  Schedule              │
│  Spending              │
│  Memo                   │
│  Actions                │
└───────────────────────┘
```

The selected-date desktop sidebar maps to a mobile bottom sheet. (FR-020)

---

# 3. Design Tokens

> All values in this section are `[PROPOSED]` unless explicitly noted otherwise. SRS defines semantic states such as budget warning/risk and spending statuses, but does not prescribe visual tokens.

## 3.1 Color tokens

### Dark theme

| Token | Value | Usage |
|---|---|---|
| `color.bg` | `#0F1115` | App background |
| `color.surface` | `#171A21` | Sidebar/card surfaces |
| `color.surface-2` | `#1F2430` | Nested surfaces, input backgrounds |
| `color.border` | `#2A2F3A` | Dividers, borders |
| `color.text-primary` | `#F5F7FA` | Primary text |
| `color.text-secondary` | `#B3BBC8` | Secondary labels |
| `color.text-muted` | `#A0A9B8` | Tertiary text |
| `color.control-border` | `#707A8C` | Interactive control outlines |

### Action / status

| Token | Value | Usage |
|---|---|---|
| `color.primary` | `#7C8CFF` | Primary actions, selected controls |
| `color.primary-hover` | `#91A0FF` | Hover |
| `color.on-primary` | `#101426` | Text/icons on dark-theme primary actions |
| `color.success` | `#4CD6A5` | Positive confirmation, confirmed state |
| `color.warning` | `#F5B942` | Budget >= 80% warning |
| `color.danger` | `#FF7478` | Budget > 100%, destructive action |
| `color.info` | `#65A9FF` | Informational / planned state |

### Light theme

| Token | Value | Usage |
|---|---|---|
| `color.bg` | `#F5F7FA` | App background |
| `color.surface` | `#FFFFFF` | Cards and panels |
| `color.surface-2` | `#F0F2F6` | Nested surfaces and inputs |
| `color.border` | `#D8DDE7` | Subtle dividers and card borders |
| `color.control-border` | `#848FA2` | Interactive control outlines |
| `color.text-primary` | `#171A21` | Primary text |
| `color.text-secondary` | `#495264` | Secondary labels |
| `color.text-muted` | `#5D6675` | Tertiary text |
| `color.primary` | `#5365D4` | Primary actions and selected controls |
| `color.primary-hover` | `#4052C0` | Hover |
| `color.on-primary` | `#FFFFFF` | Text/icons on light-theme primary actions |
| `color.info` | `#175EA8` | Informational / planned state |
| `color.success` | `#08764F` | Confirmed state |
| `color.warning` | `#805300` | Budget >= 80% warning |
| `color.danger` | `#B4232F` | Budget > 100%, destructive action |
| `state.planned.background` | `#E8F2FC` | Planned-state label background |
| `state.confirmed.background` | `#E6F5EF` | Confirmed-state label background |
| `state.warning.background` | `#FFF4D8` | Budget-warning label background |
| `state.danger.background` | `#FCEBED` | Refund/destructive label background |

The light palette uses a cool-neutral canvas, white surfaces, dark navy text, and indigo actions. Contrast ratios verified for primary/secondary/muted text on white surfaces are 17.41:1, 7.85:1, and 5.80:1; white text on the primary action is 5.02:1. Planned, confirmed, warning, and danger text on their light status backgrounds are 5.79:1, 5.03:1, 6.08:1, and 5.66:1. Dark status labels range from 5.57:1 to 7.74:1, and the dark primary-action label is 6.13:1. Interactive control outlines have at least 3.04:1 contrast against their base surfaces; decorative borders remain intentionally softer.

### Spending / schedule semantics

| Token | Suggested usage |
|---|---|
| `state.planned` | Info/blue family |
| `state.confirmed` | Success/green family |
| `state.cancelled` | Neutral/gray family |
| `state.refund` | Danger/red family |
| `schedule.version` | Accent family A |
| `schedule.pickup` | Accent family B |

## 3.2 Typography

**Font:** A2Z self-hosted WOFF2 family (100–900), with a system font fallback. The creator identifies it as SIL Open Font License 1.1 (OFL), which permits web embedding and redistribution with software. The project keeps the copyright notice and full OFL text alongside the font files.

License references: [A2Z creator's font page](https://freesentation.blog/a2z) and [Noonnu's A2Z listing and usage FAQ](https://noonnu.cc/font_page/1778).

| Token | Size | Weight | Usage |
|---|---:|---:|---|
| `type.display` | 28px | 700 | Large summary number |
| `type.page-title` | 22px | 700 | Page title |
| `type.section` | 17px | 600 | Section heading |
| `type.body` | 15px | 400 | Body |
| `type.body-medium` | 15px | 500 | Emphasis |
| `type.caption` | 12px | 400 | Metadata |
| `type.button` | 14px | 600 | Button label |
| `type.number` | 20–28px | 700 | Currency/stat values |

## 3.3 Spacing

Base unit: 4px `[PROPOSED]`

```text
4   8   12   16   20   24   32   40   48   64
```

Recommended usage:

- 4px: icon/text micro-gap
- 8px: control internal gap
- 12px: compact card padding
- 16px: default component gap
- 24px: section/page padding
- 32px: major section separation
- 40–48px: large modal/page separation

## 3.4 Shape and elevation

| Token | Value |
|---|---|
| `radius.sm` | 6px |
| `radius.md` | 10px |
| `radius.lg` | 12px |
| `radius.xl` | 16px |
| `radius.pill` | 999px |
| `shadow.card.dark` | 0 4px 16px rgba(0,0,0,0.18) |
| `shadow.card.light` | 0 4px 16px rgba(27,35,52,0.08) |
| `shadow.modal` | 0 20px 60px rgba(0,0,0,0.32) |
| `shadow.modal.light` | 0 20px 60px rgba(27,35,52,0.16) |

## 3.5 Layout tokens

| Token | Value |
|---|---:|
| `layout.sidebar.desktop` | 340px |
| `layout.content-max` | 1440px |
| `layout.page-gutter` | 24px |
| `control.height.sm` | 32px |
| `control.height.md` | 40px |
| `control.height.lg` | 48px |
| `icon.sm` | 16px |
| `icon.md` | 20px |
| `icon.lg` | 24px |

## 3.6 Motion tokens

Recommended restrained motion `[PROPOSED]`:

| Token | Duration | Usage |
|---|---:|---|
| `motion.fast` | 120ms | Hover/focus |
| `motion.base` | 180ms | Sidebar/card state |
| `motion.slow` | 240ms | Modal/bottom-sheet entrance |

Avoid decorative animation that competes with calendar information.

---

# 4. Core Components

## 4.1 Calendar Tile

```text
┌────────────────┐
│  06            │
│                │
│  [Game Icon]   │
│  █ PICKUP      │
│             •  │
└────────────────┘
```

States:

- `default`
- `today`
- `selected`
- `outside-month`
- `disabled`
- `offline-readonly`

Rules `[SRS]`:

- Do not show amount.
- Do not show general spending list.
- Show at most one memo dot regardless of memo count.
- Fit the full game icon inside its square area without cropping `[DECIDED]`.

## 4.2 Schedule Banner

```text
┌────────────────────────────┐
│ GAME A      PICKUP         │
│ 10/04 — 10/10              │
└────────────────────────────┘
```

Variants:

- VERSION
- PICKUP

## 4.3 Spending Card

```text
┌────────────────────────────┐
│ [PLANNED]                  │
│ Game A Package             │
│                            │
│ ₩30,000                    │
│ Target 2026-10-06          │
│                            │
│ [Confirm] [예정 취소]      │
└────────────────────────────┘
```

Action availability must follow spending state rules.

## 4.4 Budget Status

```text
Safe
██████████░░░░  63%

Warning
████████████░░  82%

Risk
████████████████ 105%
```

Thresholds `[SRS]`:

- >= 80%: warning
- > 100%: risk
- Applied budget = 0: no percentage warning / no overspend confirmation

## 4.5 Status Badge

```text
[ PLANNED ]
[ CONFIRMED ]
[ 예정 취소 ]
[ REFUNDED ]
```

Use the exact user-facing action label **“예정 취소”** for planned cancellation.

## 4.6 Empty State

```text
┌─────────────────────────────┐
│           □                 │
│   No items for this view    │
│   Add or select something   │
└─────────────────────────────┘
```

Empty-state copy should explain what the user can do next.

## 4.7 Confirmation Modal

```text
┌─────────────────────────────────┐
│ Confirm action                  ×│
├─────────────────────────────────┤
│ Short summary                   │
│                                   │
│ [Secondary]        [Primary]    │
└─────────────────────────────────┘
```

Used for:

- Payment confirmation
- Refund
- Planned cancellation
- Restore
- Budget-overrun confirmation where applicable

## 4.8 Toast / inline feedback

Use for completed, non-blocking operations:

```text
✓ Saved successfully
```

For blocked business rules, prefer inline or modal error explanation rather than a generic failure toast.

## 4.9 Offline Banner

```text
┌─────────────────────────────────────────────────────┐
│ Offline · Cached data only · Editing is disabled   │
└─────────────────────────────────────────────────────┘
```

## 4.10 Authentication Form `[SRS + PROPOSED]`

- Keep the sign-in page in the existing dark theme until the app-wide theme switch is implemented across authenticated screens.
- Use a centered brand introduction and form surface, followed by labeled email and password fields.
- Stack the email sign-in and account-creation actions; separate Google sign-in as an alternate action.
- Preserve the existing email, registration, and Google authentication handlers. These presentation choices do not change authentication behavior (FR-005).
- Use at least 44px input targets and retain visible labels independent of placeholder text.

---

# 5. Dashboard

## 5.1 Purpose

Primary calendar-centric workspace connecting:

- Calendar
- Game/schedule signals
- Selected-date details
- Planned spending
- Confirmed spending
- Memo details
- Budget status

The Dashboard shows the calendar and budget summary values without a mini monthly chart. Monthly trend charts belong on Statistics `[DECIDED]`.

## 5.2 Desktop wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ChronoLedger │ Dashboard │ Spending │ Statistics │ ... │ Budget │ Sync │ Me │
├─────────────────────────────────────────────────────────────┬────────────────┤
│                                                             │                │
│ October 2026                                  [Today]       │ 10월 6일        │
│                                                             │                │
│  Mon   Tue   Wed   Thu   Fri   Sat   Sun                    │ Schedule       │
│ ┌────┬────┬────┬────┬────┬────┬────┐                      │ ┌────────────┐ │
│ │    │    │ 1  │ 2  │ 3  │ 4  │ 5  │                      │ │ Game A     │ │
│ │    │    │ 🎮 │ ▰  │ 🎮 │    │ •  │                      │ │ VERSION    │ │
│ ├────┼────┼────┼────┼────┼────┼────┤                      │ └────────────┘ │
│ │ 6  │ 7  │ 8  │ 9  │ 10 │ 11 │ 12 │                      │                │
│ │ 🎮 │    │ •  │    │ ▰  │ 🎮 │    │                      │ Planned         │
│ │ •  │    │    │    │    │    │    │                      │ ┌────────────┐ │
│ ├────┼────┼────┼────┼────┼────┼────┤                      │ │ ₩30,000    │ │
│ │ 13 │ 14 │ 15 │ 16 │ 17 │ 18 │ 19 │                      │ │ [PLANNED]  │ │
│ │    │ 🎮 │    │ ▰  │    │    │ •  │                      │ └────────────┘ │
│ └────┴────┴────┴────┴────┴────┴────┘                      │                │
│                                                             │ Confirmed      │
│ Budget  ₩300,000      Expected ₩248,000                    │ ...            │
│ Status  Warning (82%)                                      │                │
│                                                             │ Memo           │
│                                                             │ • Note 1       │
│                                                             │                │
│                                                             │ [Add memo]     │
└─────────────────────────────────────────────────────────────┴────────────────┘
```

## 5.3 Dashboard sidebar layout

```text
Sidebar
│
├─ Date header
│  ├─ Full date
│  └─ Close / selection controls
│
├─ Schedule section
│  ├─ Schedule card(s)
│  └─ Game link/icon
│
├─ Planned spending
│  ├─ Planned spending card(s)
│  └─ Actions
│
├─ Confirmed spending
│  ├─ Confirmed record(s)
│  └─ Refund action where allowed
│
└─ Memo section
   ├─ Memo list
   └─ Add/edit controls
```

## 5.4 Dashboard states

### Default

Calendar is interactive and no date is selected.

### Selected date

Selected tile is highlighted and sidebar shows that date's details.

### Empty date

Sidebar shows date + empty sections rather than a blank panel.

### Offline

Calendar can show cached data. Writes are disabled and an offline banner is visible.

### Expired planned spending gate

If online and unresolved expired planned spending exists:

```text
┌────────────────────────────────────┐
│ Unresolved planned spending        │
├────────────────────────────────────┤
│ 2026-10-02  Game A  ₩30,000        │
│                                    │
│ [결제 확정] [예정 취소]             │
│ [다음 일정으로 이동]                │
│                                    │
│ 1 / 3 resolved                     │
└────────────────────────────────────┘
```

The modal remains blocking until all unresolved items are handled. (FR-061)

### Budget warning / risk

Apply the state based on monthly expected consumption and applied budget.

---

# 6. Spending

## 6.1 Purpose

Provide a structured financial view for planned, confirmed, cancelled, and refunded spending without making the calendar carry transaction detail.

## 6.2 Main wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Spending                                                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│ [All] [Planned] [Confirmed] [Cancelled]        Search       Date ▾           │
│                                                                              │
│ Month summary                                                               │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────────────────────┐ │
│ │ Planned    │ │ Confirmed  │ │ Cancelled  │ │ Budget / Expected         │ │
│ │ ₩...       │ │ ₩...       │ │ ₩...       │ │ ₩... / ₩...               │ │
│ └────────────┘ └────────────┘ └────────────┘ └───────────────────────────┘ │
│                                                                              │
│ Date       Game        Item              Status       Amount       Actions   │
│ ──────────────────────────────────────────────────────────────────────────── │
│ 10/06      Game A      Package           PLANNED      ₩30,000     ...       │
│ 10/04      Game B      Bundle            CONFIRMED    ₩24,000     ...       │
│ 10/02      Game A      Ticket            CANCELLED    ₩18,000     Restore   │
└──────────────────────────────────────────────────────────────────────────────┘
```

Use a table-first list on desktop and date-grouped cards on mobile `[DECIDED]`.

## 6.3 Spending detail panel

```text
┌──────────────────────────────┐
│ Game A Package            ×  │
├──────────────────────────────┤
│ Status: PLANNED              │
│ Target: 2026-10-06           │
│ Original: ₩30,000            │
│                              │
│ Schedule: Game A / PICKUP    │
│ Template: Monthly             │
│                              │
│ [결제 확정] [예정 취소]       │
└──────────────────────────────┘
```

## 6.4 Payment confirmation wireframe

```text
┌────────────────────────────────────────┐
│ Confirm payment                         │
├────────────────────────────────────────┤
│ Original price          ₩30,000         │
│ Discount               -₩2,000          │
│ Point discount         -₩1,000          │
│ ──────────────────────────────────────  │
│ Final amount            ₩27,000         │
│                                        │
│ Payment method                         │
│ ○ WALLET   ● GOOGLE PLAY   ○ GALAXY   │
│                                        │
│ Points                                 │
│ Quantity [100] P   Discount [₩1,000]  │
│                                        │
│ Deduct from asset       [ ON ]         │
│ Payment date             [2026-10-06] │
│                                        │
│ [Cancel]                 [Confirm]     │
└────────────────────────────────────────┘
```

### UI rules traced to SRS

- Final amount is derived from original price and discount fields and is server-validated. (FR-040)
- Payment methods are WALLET, GOOGLE_PLAY, GALAXY_STORE. (FR-040)
- Future KST payment dates are rejected. (FR-040)
- Point quantity and point discount are separate inputs. (FR-041)
- WALLET may use a separately selected point platform. (FR-041)
- Store payment uses that store's configured earning rate for expected earned points. (FR-042)
- Today's payment toggle defaults on; past records default off, but the user can change it. (FR-040)

## 6.5 Cancel / restore states

### Planned cancellation

```text
[PLANNED]

Action: [예정 취소]
```

After cancellation:

```text
[CANCELLED]
Reason: PLANNED_CANCEL
Action: [복구]
```

### Template deactivation cancellation

```text
[CANCELLED]
Reason: TEMPLATE_DEACTIVATION

Restore available only when the owning template is active.
```

### Payment refund

```text
[CANCELLED]
Reason: PAYMENT_REFUND

[복구]  ← not shown
```

---

# 7. Statistics

## 7.1 Purpose

Provide analytical views of spending and budget behavior without modifying the underlying transaction state.

The SRS explicitly defines budget attribution and expected-consumption warning behavior, but does not prescribe a specific chart library or a fixed statistics information architecture. The following layout is therefore `[PROPOSED]` and must be implemented consistently with the SRS attribution rules.

## 7.2 Statistics wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Statistics                     [Month ▼] [Range ▼]                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐ │
│ │ Budget       │ │ Expected     │ │ Confirmed    │ │ Usage                │ │
│ │ ₩300,000     │ │ ₩248,000     │ │ ₩192,000     │ │ 82%                  │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └─────────────────────┘ │
│                                                                              │
│ Spending trend                                                              │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │                         monthly vertical bars                            │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ By game                              By payment method                      │
│ ┌──────────────────────────────┐     ┌──────────────────────────────────┐  │
│ │ Game A     ███████           │     │ Wallet       █████              │  │
│ │ Game B     █████             │     │ Google Play  ███████            │  │
│ │ Game C     ██                │     │ Galaxy       ███                │  │
│ └──────────────────────────────┘     └──────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

Use vertical bars for the monthly trend and horizontal bars for game/payment-method categories `[DECIDED]`. Select the chart library during implementation.

## 7.3 Statistics semantics

Use a single, explicit period selector. The same budget attribution rules must be used everywhere:

- Confirmed spending: payment/target date month.
- Planned schedule-linked spending: month containing the schedule end date.
- Planned spending without schedule: target-date month.
- Cancelled items excluded from budget aggregation. (FR-021)
- Confirmed spending remains included in consumption statistics regardless of `deduct_from_asset`. (FR-021)

## 7.4 Zero-budget state

```text
Budget
₩0

Expected spending
₩248,000

No percentage warning / over-budget confirmation
```

The UI must not imply a percentage warning when applied budget is zero. (FR-022)

---

# 8. Games

## 8.1 Purpose

Manage the user's subscribed game list and game-specific icon customization while keeping the public game catalog separate from user-owned customization.

## 8.2 Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ My Games                                               [+ Add Game]         │
├──────────────────────────────────────────────────────────────────────────────┤
│ Search games...                                                             │
│                                                                              │
│ ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────┐ │
│ │ [ICON] Game A        │  │ [ICON] Game B        │  │ [ICON] Game C      │ │
│ │ 3 schedules          │  │ 1 schedule           │  │ 0 schedules        │ │
│ │ [Open] [⋯]           │  │ [Open] [⋯]           │  │ [Open] [⋯]         │ │
│ └──────────────────────┘  └──────────────────────┘  └────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 8.3 Game detail / subscription relation

```text
┌───────────────────────────────┐
│ [Custom Icon] Game A          │
├───────────────────────────────┤
│ My subscription: ON           │
│ Upcoming schedules: 3         │
│                               │
│ Icon                           │
│ [Replace icon] [Remove icon]  │
│                               │
│ [Remove from My Games]        │
└───────────────────────────────┘
```

Rules `[SRS]`:

- Custom icons are private Storage objects owned by the user. (FR-070)
- Supported source formats: PNG/JPG/JPEG/WebP, max 5 MiB.
- Output: 256×256 WebP, max 100 KiB.
- No public URL.
- Removing a game from the user's list deletes the associated custom icon Storage object before completion. (FR-072)

## 8.4 Icon upload state UI

```text
Idle
┌─────────────────────┐
│     Upload icon     │
│     5 MiB max       │
└─────────────────────┘

Uploading
┌─────────────────────┐
│ ███████░░░░  70%    │
│ Processing...       │
└─────────────────────┘

Error
┌─────────────────────┐
│ File not supported  │
│ [Choose another]    │
└─────────────────────┘

Success
┌─────────────────────┐
│ ✓ Icon updated      │
└─────────────────────┘
```

## 8.5 Game proposal flow

General users propose game/schedule additions or edits. They are stored as request records and require admin approval before public data changes. (FR-011)

```text
My Games
   ↓
[Suggest change]
   ↓
Request form
   ↓
Pending request
   ↓
Admin approval / rejection
   ↓
Public catalog update (if approved)
```

---

# 9. Subscriptions

## 9.1 Purpose

Manage recurring spending templates without physical deletion.

## 9.2 Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Subscriptions                                              [+ New]          │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Active] [Inactive]                                                         │
│                                                                              │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ Game A Pass                                  ACTIVE                    │ │
│ │ Monthly · Billing day 15 · ₩9,900                                      │ │
│ │ Next generated target: 2026-10-15                                     │ │
│ │                                                                        │ │
│ │ [Edit] [Deactivate]                                                   │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ Game B Pass                                  INACTIVE                  │ │
│ │ Monthly · Billing day 31 · ₩19,900                                    │ │
│ │                                                                        │ │
│ │ [Edit] [Activate]                                                     │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 9.3 Subscription editor

```text
┌──────────────────────────────────────┐
│ Subscription                    ×    │
├──────────────────────────────────────┤
│ Game             [Game A ▼]          │
│ Amount           [₩ 9,900]           │
│ Billing cycle    [Monthly ▼]         │
│ Billing day      [15]                │
│ Start / metadata ...                  │
│                                      │
│ Status             [ACTIVE]          │
│                                      │
│ [Cancel]          [Save changes]     │
└──────────────────────────────────────┘
```

## 9.4 Generated-spending behavior

On calendar entry, active templates may lazily generate the current month's planned spending. The UI should not expose this as a manual “generate” action. (FR-050)

Important state messages:

- Already generated: no duplicate row.
- Cancelled current cycle: not auto-regenerated.
- Inactive template: no new cycle generated.
- Deactivation cancels already-generated unpaid planned rows using `TEMPLATE_DEACTIVATION` rather than deleting them. (FR-052)

## 9.5 Delete behavior

Do not show a physical delete action for subscription templates. Use:

```text
ACTIVE → [Deactivate]
INACTIVE → [Activate]
```

Physical deletion is disallowed. (FR-053)

---

# 10. Wallets

## 10.1 Purpose

Manage Google Play / Galaxy Store wallet balances, levels/rates, and manual balance adjustments.

## 10.2 Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Store Wallets                                                                │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────┐  ┌──────────────────────────────────┐  │
│ │ Google Play                     │  │ Galaxy Store                    │  │
│ │                                │  │                                  │  │
│ │ Balance          ₩120,000      │  │ Balance            ₩80,000       │  │
│ │ Tier             GOLD          │  │ Earn rate           1.20%        │  │
│ │ Earn rate        0.13%         │  │                                  │  │
│ │                                │  │                                  │  │
│ │ [Adjust balance]               │  │ [Adjust balance]                 │  │
│ │ [Edit earn rate]               │  │ [Edit earn rate]                 │  │
│ └─────────────────────────────────┘  └──────────────────────────────────┘  │
│                                                                              │
│ Transaction ledger                                                          │
│ ──────────────────────────────────────────────────────────────────────────── │
│ Date        Type              Change           Balance                       │
│ 10/05       EARN              +27              120,000                       │
│ 10/03       MANUAL_ADJUST     +5,000           119,973                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 10.3 Google Play tier control

Allowed levels are fixed by SRS:

- BRONZE 0.10%
- SILVER 0.11%
- GOLD 0.13%
- PLATINUM 0.16%
- DIAMOND 0.20%

The UI should therefore use a constrained select, not freeform text input. (FR-045)

## 10.4 Galaxy Store earn-rate control

Use a number/percentage field constrained to 0–100%. (FR-045)

## 10.5 Balance adjustment modal

```text
┌────────────────────────────────────┐
│ Adjust wallet balance              │
├────────────────────────────────────┤
│ Wallet: Google Play               │
│ Current balance: ₩120,000         │
│                                    │
│ Target balance                     │
│ [ 125000 ]                         │
│                                    │
│ Resulting change: +₩5,000         │
│                                    │
│ [Cancel]            [Apply]        │
└────────────────────────────────────┘
```

The UI should frame this as **target balance**, not arbitrary ledger editing. Server RPC prevents a negative resulting balance and records the delta as `MANUAL_ADJUST`. (FR-043)

---

# 11. Settings

## 11.1 Purpose

Manage account-level finance defaults and account/session actions.

## 11.2 Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Settings                                                                     │
├──────────────────────┬───────────────────────────────────────────────────────┤
│ Finance              │ Finance                                               │
│ Account              │                                                       │
│ Security / Session   │ Total asset                                           │
│                      │ [ ₩ 0 ]                                               │
│                      │                                                       │
│                      │ Default budget                                        │
│                      │ [ ₩ 0 ]                                               │
│                      │                                                       │
│                      │ Monthly budget                                        │
│                      │ [ October 2026 ] [ ₩ 300,000 ]                        │
│                      │                                                       │
│                      │ [Save]                                                │
├──────────────────────┼───────────────────────────────────────────────────────┤
│ Account              │ Email                                                 │
│                      │ Google OAuth                                          │
│                      │ [Log out]                                             │
│                      │                                                       │
│                      │ Danger zone                                           │
│                      │ [Delete account]                                      │
└──────────────────────┴───────────────────────────────────────────────────────┘
```

## 11.3 Finance form rules

- Total assets: integer KRW, negative values allowed. (FR-004)
- Default and monthly budgets: integer KRW >= 0. (FR-004)
- If a monthly budget is absent or zero, default budget applies. (FR-002)
- Initial account creation does not require an onboarding flow. (FR-001)

## 11.4 Account deletion flow

Account deletion is a destructive, explicitly confirmed operation.

```text
Settings
  ↓
[Delete account]
  ↓
Warning modal
  ↓
[Type/confirm action]  [Cancel]
  ↓
Server-side account deletion
  ↓
Completion screen
```

The completion state must not be shown until personal Storage objects are also cleaned up. (FR-003)

## 11.5 Signed-out state

After logout/session expiry:

```text
┌────────────────────────────────────┐
│ Session expired                    │
│                                    │
│ Your personal data is hidden.      │
│ Sign in again to continue.         │
│                                    │
│ [Sign in]                          │
└────────────────────────────────────┘
```

No personal data or cached personal data is shown in the signed-out state. (FR-005, NFR-006)

---

# 12. Admin

## 12.1 Access model `[SRS]`

Admin access is derived server-side from JWT `app_metadata.role=admin`. The client must not be able to grant itself admin privileges. (Section 2)

## 12.2 Admin shell

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Admin Console                                              [Account]         │
├───────────────────┬──────────────────────────────────────────────────────────┤
│ Overview           │                                                          │
│ Games              │                       Page Content                       │
│ Schedules          │                                                          │
│ Requests           │                                                          │
└───────────────────┴──────────────────────────────────────────────────────────┘
```

## 12.3 Games admin

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Public Games                                               [+ New Game]     │
├──────────────────────────────────────────────────────────────────────────────┤
│ Search...                                                                     │
│                                                                              │
│ Game              Active    Schedules    Actions                             │
│ Game A            Yes       12           Edit   Disable                       │
│ Game B            Yes       8            Edit   Disable                       │
│ Game C            No        0            Edit   Enable                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 12.4 Schedule admin

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Public Schedules                                         [+ New Schedule]   │
├──────────────────────────────────────────────────────────────────────────────┤
│ Game      Type       Start       End         Actions                         │
│ Game A    VERSION    10/01       10/07       Edit                            │
│ Game A    PICKUP     10/04       10/10       Edit                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

Constraints `[SRS]`:

- Only VERSION and PICKUP.
- End date cannot be before start date. (FR-010)
- When a schedule date changes, linked planned spending dates synchronize.
- Confirmed payment records do not move. (FR-012)

## 12.5 Schedule edit warning

```text
┌────────────────────────────────────────────┐
│ Update schedule dates                     │
├────────────────────────────────────────────┤
│ This change will update linked PLANNED     │
│ spending dates. CONFIRMED records remain  │
│ unchanged.                                 │
│                                            │
│ [Cancel]                    [Update]       │
└────────────────────────────────────────────┘
```

This warning directly communicates FR-012 to the administrator.

## 12.6 Request moderation

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Requests                                                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Pending] [Approved] [Rejected]      Search                                   │
│                                                                              │
│ Requester    Target        Change               Status      Actions           │
│ user123      Game A        Add schedule         Pending     Review             │
│ user456      Game B        Edit icon/catalog    Pending     Review             │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 12.7 Request review panel

```text
┌───────────────────────────────────────┐
│ Request #1023                      ×  │
├───────────────────────────────────────┤
│ Requester: user123                    │
│ Target: Game A                        │
│ Change: Add PICKUP schedule           │
│                                       │
│ Proposed values                       │
│ Start: 10/04                          │
│ End:   10/10                          │
│                                       │
│ [Reject]                 [Approve]    │
└───────────────────────────────────────┘
```

Approval should visually communicate that the state transition and public data update are one administrative action. FR-011 requires the request state transition and catalog/schedule reflection to be atomic.

---

# 13. Cross-page State UI Matrix

| State | Dashboard | Spending | Statistics | Games | Subscriptions | Wallets | Settings | Admin |
|---|---|---|---|---|---|---|---|---|
| Loading | Skeleton calendar/sidebar | Skeleton rows | Chart skeleton | Card skeleton | Row skeleton | Card skeleton | Form skeleton | Table skeleton |
| Empty | Empty date/sidebar | No spending | No data period | No subscribed games | No templates | Zero/empty ledger | Normal defaults | No requests |
| Error | Inline error + retry | Inline error + retry | Inline error + retry | Inline error + retry | Inline error + retry | Inline error + retry | Inline error | Inline error |
| Offline | Cached read-only | Read-only/cache | Read-only/cache | Read-only/cache | Read-only/cache | Read-only/cache | Writes disabled | Admin write unavailable |
| Session expired | Hide personal data | Hide personal data | Hide personal data | Hide personal data | Hide personal data | Hide personal data | Sign-in state | Sign-in state |
| Permission denied | N/A / auth gate | N/A / ownership | N/A | User/admin split | Owner only | Owner only | Owner only | Admin only |

---

# 14. Interaction Rules

## 14.1 Focus and keyboard

`[PROPOSED]`

- Every interactive element must have a visible focus state.
- Modal focus is trapped until closed.
- Escape closes non-blocking modal surfaces.
- Blocking expired-spending modal cannot be dismissed online until all required items are resolved.

## 14.2 Destructive actions

Use the danger token only for destructive intent:

- Account deletion
- Refund confirmation
- Planned cancellation confirmation where a destructive emphasis is needed
- Removing a user's game subscription/custom icon

Avoid red for ordinary “planned” state labels.

## 14.3 Amount formatting

`[SRS]`

- Currency: integer KRW.
- UI should display locale-style grouping, e.g. `₩30,000`.
- Do not introduce currency conversion UI; currency conversion is outside scope. (Section 5)

## 14.4 Date semantics

`[SRS]`

- KST / Asia/Seoul is the business date basis.
- Scheduled/target dates are DATE values.
- Stored timestamps are UTC TIMESTAMPTZ.

The UI should avoid presenting ambiguous date/time strings around payment validation.

---

# 15. Dashboard-to-Action Flow Map

```text
Calendar day
    │
    ├── View schedule ──────────────→ Schedule detail
    │
    ├── View planned spending ──────→ Spending detail
    │                                  │
    │                                  ├→ Confirm payment
    │                                  │      └→ Payment modal
    │                                  │
    │                                  └→ 예정 취소
    │                                         └→ Confirm modal
    │
    └── View memo ─────────────────→ Memo detail
                                       │
                                       ├→ Add
                                       ├→ Edit
                                       └→ Delete
```

Expired planned spending inserts a mandatory gate before normal calendar interaction when online.

---

# 16. Responsive Mapping

| Desktop | Mobile |
|---|---|
| Right detail sidebar | Bottom sheet |
| Hover tooltips | Tap affordances |
| Multi-column statistics | Single-column stacked cards |
| Table | Card/list rows |
| Persistent sidebar nav | Bottom navigation / compact drawer |
| Wide calendar | Month grid with same tile semantics |
| Modal | Full-width sheet or modal |

The underlying information model should remain the same; only the container/presentation changes.

---

# 17. Accessibility / Usability Baseline

`[PROPOSED]`

- Do not rely on color alone for spending states; pair color with text badges.
- Use clear action labels, especially “예정 취소”.
- Provide textual labels for schedule types VERSION and PICKUP.
- Ensure icon-only controls have accessible names.
- Keep monetary values visually aligned for scanning.
- Keep touch targets at least 44px on mobile.
- Do not use decorative game imagery as the only source of meaning.

---

# 18. UI Requirements Traceability Matrix

| UI area | SRS requirement(s) | UI consequence |
|---|---|---|
| Calendar tile | FR-020 | Only game icon / schedule banner / memo dot |
| Budget status | FR-022 | 80% warning, >100% risk; no percentage warning at zero budget |
| Schedule detail | FR-010~012 | VERSION/PICKUP only; schedule-date update warning |
| Planned cancellation | FR-031 | Exact action label “예정 취소” |
| Restore | FR-032 | Only allowed cancellation kinds are restorable |
| Payment modal | FR-040~044 | Payment method, discounts, points, asset deduction, refund |
| Subscription list | FR-050~053 | Auto generation; deactivate instead of delete |
| Expired spending | FR-060~063 | Blocking online resolution modal; offline dismissible/read-only |
| Game icons | FR-070~072 | Private upload/processing/removal state |
| Memo | FR-071~072 | One dot on tile; full content in detail |
| Wallets | FR-041~045 | Store-specific point controls and manual adjustment |
| Settings | FR-002~005 | Budget/asset/account controls |
| Admin games/schedules | FR-010~012 | Direct public management |
| Admin requests | FR-011 | Review / approve / reject flow |
| Auth/session | FR-005, NFR-006 | Signed-out state hides personal data |
| Ownership/security | NFR-001~006 | No client-side privilege assumptions; robust error states |

---

# 19. Design QA Checklist

## Dashboard

- [ ] Calendar tile does not show amount.
- [ ] Calendar tile does not show general spending list.
- [ ] Memo tile indicator is exactly one dot.
- [ ] Selected date opens right-side detail panel.
- [ ] Online expired planned-spending gate blocks calendar interaction until resolved.
- [ ] Offline mode shows cached data and disables writes.

## Spending

- [ ] All spending state labels are visible and consistent.
- [ ] “예정 취소” is used instead of generic “취소” for planned cancellation.
- [ ] Payment confirmation exposes only valid payment methods.
- [ ] Future payment dates are rejected.
- [ ] Refund UI does not offer restoration.

## Statistics

- [ ] Budget attribution follows SRS rules.
- [ ] Cancelled spending is excluded from budget aggregation.
- [ ] Confirmed spending remains included regardless of asset deduction.
- [ ] Zero-budget state does not display a percentage warning.

## Games

- [ ] Custom icon is treated as private user data.
- [ ] Supported source file constraints are communicated.
- [ ] Game removal handles icon cleanup.
- [ ] Proposal flow is distinct from direct public catalog mutation.

## Subscriptions

- [ ] No physical-delete button is exposed.
- [ ] Deactivation communicates cancellation of unpaid generated rows.
- [ ] Reactivation does not imply automatic restoration of cancelled cycles.

## Wallets

- [ ] Google Play tier options are constrained.
- [ ] Galaxy earn rate is constrained to 0–100%.
- [ ] Manual balance adjustment is target-balance based.

## Settings

- [ ] Asset accepts negative values.
- [ ] Budgets reject negative values.
- [ ] Monthly zero/absent budget falls back to default budget.
- [ ] Account deletion is clearly destructive and separately confirmed.
- [ ] Signed-out state hides personal data.

## Admin

- [ ] Admin UI is inaccessible to ordinary users.
- [ ] Schedule types are constrained to VERSION/PICKUP.
- [ ] Schedule date changes warn about linked planned-spending date synchronization.
- [ ] Confirmed payments are explicitly shown as unchanged by schedule-date edits.
- [ ] Request approval/rejection is clearly separate from user-side proposal creation.

---

# 20. Open Design Decisions

The following presentation decisions have been made without changing SRS behavior:

- Dashboard: calendar and budget summary values only; no mini monthly chart.
- Spending: table-first on desktop and date-grouped cards on mobile.
- Calendar game icons: fit the full icon without cropping.
- Statistics: monthly vertical bars and horizontal bars for game/payment-method categories.
- Desktop navigation: top horizontal navigation. Mobile navigation: four primary tabs plus More.
- Responsive behavior: desktop two-column layout at 1100px and above; calendar with a detail bottom sheet at 768–1099px; mobile shell, bottom navigation, and detail bottom sheet at 767px and below.
- Layout and control baselines: 4px spacing unit, 16px component gap, 24px page gutter, 340px desktop detail panel, 1440px maximum content width, 12px card radius, 40px standard controls, 48px primary actions, and 44px minimum mobile touch targets.
- Motion: restrained 120ms hover/focus, 180ms panel, and 240ms modal/bottom-sheet transitions, with reduced-motion support.

The following remain open before the visual system is finalized:

1. Exact chart library selection (implementation-time decision).
2. Detailed keyboard/screen-reader validation and any component-specific contrast checks during product implementation.

User-confirmed visual decisions:

- Typography: body 15px, supporting text 12px, section heading 17px, page title 22px, and key numbers 20–28px. A2Z is self-hosted for the preview and web app with all nine weights and an OFL 1.1 notice.
- Theme: use the current dark palette as the basis and support a cool-neutral light theme with accessible indigo and semantic colors.
- Elevation: restrained card shadows, with a clearly stronger modal shadow.
- Empty states: concise contextual message plus a relevant next-action button.
- Secondary feedback: concise, neutral result messages; explain errors and available recovery actions. Keep blocked business rules inline or in a confirmation surface, not as generic toasts.

Preserve the functional requirements and business rules already fixed in SRS v1.0.

---

# 21. Recommended Screen Inventory

| Screen ID | Screen | Primary purpose |
|---|---|---|
| D-01 | Dashboard | Calendar + selected-date detail |
| S-01 | Spending | Spending list/filter |
| S-02 | Spending Detail | Transaction detail |
| S-03 | Payment Confirmation | Confirm payment |
| S-04 | Refund Confirmation | Confirm refund |
| ST-01 | Statistics | Budget/spending analytics |
| G-01 | My Games | User game list |
| G-02 | Game Detail | Game subscription/icon/detail |
| G-03 | Game Proposal | Suggest game/schedule change |
| SU-01 | Subscriptions | Recurring templates |
| SU-02 | Subscription Editor | Add/edit/deactivate template |
| W-01 | Wallets | Store wallet overview |
| W-02 | Wallet Adjustment | Target balance correction |
| SET-01 | Settings | Finance/account settings |
| SET-02 | Account Deletion | Destructive account flow |
| A-01 | Admin Dashboard | Admin overview |
| A-02 | Admin Games | Public game catalog management |
| A-03 | Admin Schedules | Public schedule management |
| A-04 | Admin Requests | Proposal moderation |
| A-05 | Request Review | Approve/reject request |

---

# 22. Final UI Architecture Summary

```text
                           CHRONOLEDGER
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
         Calendar-first                       Navigation
              │                                   │
       ┌──────┴──────┐              ┌────────────┼──────────────┐
       │             │              │            │              │
   Calendar      Detail Sidebar   Spending   Statistics       Admin
       │             │
       │        ┌────┼────────────┐
       │        │    │            │
   game icon  schedule spending   memo
                  │    │
                  │    ├──── PLANNED
                  │    ├──── CONFIRMED
                  │    ├──── CANCELLED
                  │    └──── REFUND
                  │
                  └──── modal actions

Supporting domains:
Games ─────── custom icon + user game list + proposals
Subscriptions ─ recurring templates
Wallets ───── store balances + point settings + ledger
Settings ──── asset + budget + account
```

The design deliberately keeps the **calendar visually sparse**, moves detailed financial information into the **right sidebar**, and reserves **modals/forms** for state-changing actions. This makes the UI directly compatible with the SRS's calendar rules, spending state machine, budget thresholds, recurring spending behavior, offline boundary, and admin approval workflow.

---

## Appendix A. SRS Reference Map

- SRS purpose/scope and platform: Section 1
- Roles and authorization: Section 2
- Date/currency/status terminology: Section 3
- Functional requirements: Section 4
- Client/services/time/money environment: Section 5
- Non-functional requirements: Section 6
- State transitions: Section 7
- Error behavior: Section 8
- Acceptance/verification: Section 9
- Traceability: Section 10

---

## Appendix B. UI Translation Application (V1-ko)

- **Target artifact:** `docs/design-v1-ko.html`
- **Rule:** `ChronoLedger`, `PICKUP`, `VERSION`은 번역하지 않고 원문 유지. 나머지 일반 UI 명칭은 한국어 번역 적용.
- **Status date:** 2026-10-06

| # | UI area | Original (V1) | V1-ko | Translation applied? |
|---|---|---|---|---|
| 1 | Brand | ChronoLedger | ChronoLedger | N - 원문 유지 |
| 2 | Nav | Dashboard | 대시보드 | Y |
| 3 | Nav | Spending | 지출 | Y |
| 4 | Nav | Statistics | 통계 | Y |
| 5 | Nav | Games | 게임 | Y |
| 6 | Nav | Subscriptions | 구독 | Y |
| 7 | Nav | Wallets | 지갑 | Y |
| 8 | Header | Budget / Warning 82% | 예산 / 경고 82% | Y |
| 9 | Header | Sync / Me | 동기화 / 내 계정 | Y |
| 10 | Calendar | October 2026 / Today | 2026년 10월 / 오늘 | Y |
| 11 | Calendar | Mon/Tue/Wed/Thu/Fri/Sat/Sun | 월/화/수/목/금/토/일 | Y |
| 12 | Banner | VERSION | VERSION | N - 원문 유지 |
| 13 | Banner | PICKUP | PICKUP | N - 원문 유지 |
| 14 | Summary | Expected | 예상 지출 | Y |
| 15 | Summary | Status: Warning | 상태: 경고 | Y |
| 16 | Sidebar | Selected-date detail | 선택일 상세 | Y |
| 17 | Sidebar | Schedule | 일정 | Y |
| 18 | Sidebar | Planned / PLANNED | 예정 지출 / 예정 | Y |
| 19 | Sidebar | Target | 목표일 | Y |
| 20 | Sidebar | Confirmed / CONFIRMED | 확정 지출 / 확정 | Y |
| 21 | Sidebar | Memo / Add memo | 메모 / 메모 추가 | Y |
| 22 | Action | 결제 확정 / 예정 취소 / 환불 | 결제 확정 / 예정 취소 / 환불 | N/A - SRS 원문 그대로 |
