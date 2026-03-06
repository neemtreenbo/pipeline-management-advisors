# Premium Minimalist Style Guide (shadcn)

Project Theme
Premium Minimalist
Inspired by Apple, Linear, Notion

Tech Stack
React
Tailwind
shadcn/ui
Lucide Icons

---

# 1. Color System

Define colors in tailwind.config.ts

colors: {
  background: "#FFFFFF",
  foreground: "#111111",

  muted: "#F8F8F8",
  mutedForeground: "#6B6B6B",

  border: "#E5E5E5",
  input: "#E5E5E5",

  primary: "#111111",
  primaryForeground: "#FFFFFF",

  accent: "#0A84FF",
  accentForeground: "#FFFFFF",

  success: "#30D158",
  warning: "#FF9F0A",
  destructive: "#FF453A"
}

Design rule:

90% Neutral  
8% Content  
2% Accent

Accent color should only appear on actions.

---

# 2. Typography

Font stack:

font-family:
Inter,
system-ui,
-apple-system,
Segoe UI,
Roboto,
sans-serif

Tailwind config:

fontFamily: {
  sans: ["Inter", "system-ui"]
}

Type scale:

H1 — 28px — 600  
H2 — 22px — 600  
H3 — 18px — 600  
Body — 15px — 400  
Caption — 13px — 400

Rules:

Avoid heavy bold text  
Use weight sparingly

---

# 3. Spacing System

Use 8px grid

1 = 4px  
2 = 8px  
3 = 12px  
4 = 16px  
6 = 24px  
8 = 32px  
12 = 48px

Standard layout spacing:

Card padding: 16px  
Section spacing: 32px  
Page margin: 48px

Whitespace creates the premium feel.

---

# 4. Component Rules (shadcn)

Cards

Use the shadcn Card component with minimal styling.

rounded-xl  
border  
shadow-sm  
bg-white

Example:

className="rounded-xl border shadow-sm"

Avoid heavy shadows.

---

Buttons

Primary button

bg-black  
text-white  
hover:bg-zinc-800  
rounded-lg

Secondary button

border  
bg-white  
hover:bg-zinc-50

Ghost button

hover:bg-zinc-100

Rule:

Only ONE primary button per screen.

---

Inputs

Standard height

h-10  
rounded-lg  
border

Focus style

focus:ring-2  
focus:ring-blue-500

Avoid strong outlines.

---

Tables

Use shadcn Table with minimal styling.

Rules:

No vertical borders  
Light row hover

hover:bg-muted

---

Icons

Library: Lucide

Sizes:

16px  
20px  
24px

Rules:

Icons support actions  
Never decorate

---

# 5. Motion

Keep motion subtle.

duration-150  
ease-out

Use motion only for:

hover states  
drag interactions  
modal open

Avoid flashy animation.

---

# 6. Layout Structure

Mobile first.

Mobile layout

Header  
Content  
Bottom Navigation

Desktop layout

Sidebar  
Main Content  
Optional Right Panel

Max content width

1200px

---

# 7. Navigation Design

Sidebar style

minimal  
icon + label  
hover highlight

Active item

bg-muted  
font-medium

Avoid:

heavy colors  
thick highlights

---

# 8. Accent Color Palette

A shared set of seven muted accent colors used across pipeline stages,
client source badges, and any future color-coded UI.

Defined in `src/lib/colors.ts` — always import from there.

| Name   | Light HSL              | Dark HSL               |
|--------|------------------------|------------------------|
| Blue   | hsl(210, 60%, 72%)     | hsl(210, 50%, 45%)     |
| Cyan   | hsl(185, 50%, 62%)     | hsl(185, 40%, 40%)     |
| Teal   | hsl(160, 45%, 58%)     | hsl(160, 35%, 38%)     |
| Gold   | hsl(45, 65%, 62%)      | hsl(45, 50%, 42%)      |
| Orange | hsl(28, 60%, 62%)      | hsl(28, 45%, 42%)      |
| Purple | hsl(280, 40%, 65%)     | hsl(280, 30%, 42%)     |
| Green  | hsl(142, 45%, 55%)     | hsl(142, 35%, 38%)     |

Pipeline stage mapping:

Opportunity → Blue
Contacted → Cyan
Engaged → Teal
Schedule To Present → Gold
Proposal Presented → Orange
Decision Pending → Purple
Closed → Green

Client source mapping:

Referral → Green
Family → Teal
Friends → Cyan
Social Media → Purple
Website → Orange
Cold Call → Gold
Event → Gold
Other → Cyan

Usage:

```ts
import { ACCENT_PALETTE, getAccentBg, STAGE_COLORS, SOURCE_COLORS } from '@/lib/colors'

// Resolve theme-aware color
const bg = getAccentBg(ACCENT_PALETTE.blue, isDark)

// Domain-specific
const stageBg = getAccentBg(STAGE_COLORS['Opportunity'], isDark)
const sourceBg = getAccentBg(SOURCE_COLORS['referral'], isDark)
```

Applied via inline `style={{ backgroundColor }}` with `text-white/90` for text.

Rules:

Never hardcode HSL accent values in components — use the palette.
When adding a new domain color map, reference `ACCENT_PALETTE` entries.

---

# 9. Kanban Board Style

Pipeline cards

rounded-xl  
border  
bg-white  
shadow-sm  
p-3

Column style

bg-muted/40  
rounded-xl  
p-3

Drag feedback

opacity 0.8  
scale 1.02

---

# 10. Notes Editor

Notes should feel like a clean document.

Rules:

wide text area  
large line height  
minimal UI chrome

Focus mode preferred.

---

# 11. Visual Philosophy

Less UI  
More Content

Every screen should feel:

calm  
focused  
premium

Remove anything unnecessary.

---

# 12. Things to Avoid

too many colors  
heavy gradients  
large shadows  
loud icons  
cluttered dashboards

Minimalism requires discipline.

---

# 13. Recommended Layout for This App

Sidebar

Dashboard  
Clients  
Pipeline  
Notes  
Tasks

Main Content

Active page

Optional Right Panel

Activity  
Recent Notes  
Tasks

The UI should feel similar to:

Notion  
Linear  
Todoist

Focus on speed, clarity, and calm interface.