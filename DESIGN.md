---
name: Luach Digitali
description: A synagogue's printed luach, alive on a screen — zmanim, tefillot and learning, read from across the room.
colors:
  night-ink: "#0a0e1a"
  night-deep: "#111a2e"
  night-surface: "#18233d"
  candle-gold: "#d4af7a"
  candle-gold-bright: "#f0d9a8"
  candle-gold-deep: "#b8914f"
  parchment-ink: "#f4ecd8"
  slate-dim: "#b9c2d6"
  slate-faint: "#7f8aa3"
  now-green: "#6fcf97"
  festival-amber: "#f2994a"
  klaf-ground: "#e9dcc0"
  klaf-surface: "#fbf3df"
  klaf-ink: "#2b2112"
  klaf-gold: "#9a6b24"
  klaf-now-green: "#1d6a3d"
  klaf-festival-amber: "#964307"
  day-ground: "#eef1f7"
  day-surface: "#ffffff"
  day-ink: "#16203a"
  day-gold: "#a9802f"
  day-now-green: "#16703e"
  day-festival-amber: "#a04609"
  scrim-night: "rgba(5, 8, 16, 0.72)"
typography:
  display:
    fontFamily: "Heebo, system-ui, sans-serif"
    fontSize: "clamp(34px, 4.4vw, 72px)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.01em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Frank Ruhl Libre, Noto Rashi Hebrew, Georgia, serif"
    fontSize: "clamp(22px, 2.6vw, 44px)"
    fontWeight: 700
  title:
    fontFamily: "Frank Ruhl Libre, Noto Rashi Hebrew, Georgia, serif"
    fontSize: "clamp(18px, 1.8vw, 30px)"
    fontWeight: 700
  body:
    fontFamily: "Heebo, system-ui, sans-serif"
    fontSize: "clamp(16px, 1.5vw, 26px)"
    fontWeight: 400
    lineHeight: 1.5
  scripture:
    fontFamily: "Frank Ruhl Libre, Noto Rashi Hebrew, Georgia, serif"
    fontSize: "clamp(26px, 3.4vw, 56px)"
    fontWeight: 500
    lineHeight: 1.55
  label:
    fontFamily: "Heebo, system-ui, sans-serif"
    fontSize: "clamp(12px, 1.1vw, 18px)"
    fontWeight: 400
rounded:
  sm: "10px"
  md: "12px"
  lg: "22px"
  pill: "999px"
spacing:
  gutter: "clamp(10px, 1.4vh, 22px)"
  frame: "clamp(12px, 1.8vh, 28px)"
  card: "clamp(14px, 1.6vw, 26px)"
components:
  glass-card:
    backgroundColor: "rgba(24, 35, 61, 0.55)"
    rounded: "{rounded.lg}"
    padding: "{spacing.card}"
  chip-gold:
    backgroundColor: "rgba(212, 175, 122, 0.16)"
    textColor: "{colors.candle-gold-bright}"
    rounded: "{rounded.pill}"
    padding: "4px 14px"
  next-tefillah:
    backgroundColor: "rgba(212, 175, 122, 0.24)"
    textColor: "{colors.candle-gold-bright}"
    rounded: "{rounded.lg}"
    padding: "clamp(12px, 1.4vw, 22px) clamp(20px, 2.2vw, 36px)"
  button-primary:
    backgroundColor: "{colors.candle-gold-bright}"
    textColor: "{colors.night-surface}"
    rounded: "{rounded.md}"
    padding: "11px 32px"
  button-ghost:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.candle-gold-bright}"
    rounded: "{rounded.md}"
    padding: "11px"
  input:
    backgroundColor: "{colors.night-ink}"
    textColor: "{colors.parchment-ink}"
    rounded: "{rounded.sm}"
    padding: "11px 14px"
  ctrl-button:
    backgroundColor: "rgba(24, 35, 61, 0.55)"
    textColor: "{colors.candle-gold-bright}"
    rounded: "{rounded.md}"
    size: "46px"
---

# Design System: Luach Digitali

## Overview

**Creative North Star: "The Living Luach"**

The board is the printed synagogue luach that once hung by the door, now keeping time on its own. It keeps the authority of the printed calendar: ordered columns, dotted leaders running from each zman's name to its time, serif Hebrew headings, nothing ambiguous. On top of that it keeps time live: the next zman is highlighted, the clock ticks, a countdown runs to the next tefillah, and the screens rotate without anyone touching them.

Density is that of a reference sheet, scaled for distance. Every size is fluid (`clamp()` tied to viewport width or height), because the same layout must work on a 75" wall TV read from the back row and on a lobby monitor read from a meter away. The look sits in three equivalent themes: **Night** (deep navy, candle gold), **Klaf** (warm parchment, brown-gold ink) and **Day** (cool white, muted gold). Every theme uses the same tokens under different values; no screen may assume one theme.

Ornament is restrained and comes from the content: Hebrew serif lettering, gold hairlines and dotted leaders. There are no emoji or pictogram section marks; the few icons (kiosk controls, delete, yahrzeit flame) are drawn SVG in one stroke weight. The look serves reading. Where correctness and effect pull in different directions, correctness wins.

**Key Characteristics:**
- Fluid, distance-first type scale; everything sized with `clamp()`.
- Frosted-glass cards on a dark gradient ground, with gold hairline borders.
- Gold is the one voice; green means "now", amber means "festival/memorial". Both are re-tuned per theme.
- The next tefillah, not the clock, is the largest time on the board.
- The board goes still during tefillah (quiet mode).
- Serif Hebrew (Frank Ruhl Libre) for names and headings; Heebo for times and labels.
- Tabular numerals on every time.
- Three themes that swap token values, never layouts.

## Colors

A candlelit night palette: ink-dark navy grounds, one warm gold accent, and two meaning-bearing signal colors.

### Primary
- **Candle Gold** (`candle-gold`): borders of chips, section accents, focus rings, ticker tag. The structural accent.
- **Candle Gold Bright** (`candle-gold-bright`): the highlight text: shul name, screen titles, the next zman, key values (Omer count, compass bearing). The brightest thing on screen points to what matters right now.
- **Candle Gold Deep** (`candle-gold-deep`): the ticker label background and the start of the primary button's gradient.

### Secondary
- **Now Green** (`now-green`): the currently relevant tefillah (`.prayer-row.hot`), the countdown digits, the Omer screen. Means "this is happening now / today".

### Tertiary
- **Festival Amber** (`festival-amber`): Yom Tov badge, yahrzeit-today cards, destructive actions in settings (reset, delete hover). Means "special day" on the board and "careful" in settings.

### Neutral
- **Night Ink** (`night-ink`): page ground, input fields, text on gold buttons.
- **Night Deep** / **Night Surface** (`night-deep`, `night-surface`): gradient mid-tone and raised surfaces (active tab, chips, secondary buttons).
- **Parchment Ink** (`parchment-ink`): primary text, warm off-white rather than pure white.
- **Slate Dim** (`slate-dim`): labels (zman names, card labels, location line).
- **Slate Faint** (`slate-faint`): hints, empty states, footer.
- **Gold Hairline** (`rgba(212, 175, 122, 0.22)`, CSS `--line`): every border, divider and dotted leader.

### Washes
All tints come from tokens via `color-mix(in srgb, var(--gold|--good|--warn) N%, transparent)` (`--wash-gold` 16%, `--wash-gold-strong` 24%, `--wash-good` 15%, `--wash-warn` 14%), so they read on every theme. No hard-coded rgba tints.

### Theme values
- **Klaf:** ground `klaf-ground`, surface `klaf-surface`, ink `klaf-ink`, gold `klaf-gold`, green `klaf-now-green`, amber `klaf-festival-amber`; note that in Klaf `--gold-bright` is *darker* (`#7a5115`) than `--gold`, because "bright" means "most prominent", not "lightest".
- **Day:** ground `day-ground`, surface `day-surface`, ink `day-ink`, gold `day-gold` (bright `#8a6413`), green `day-now-green`, amber `day-festival-amber`.
- Every signal and faint-ink pair is at least 4.5:1 on both ground and surface in all three themes.

### Named Rules
**The One Candle Rule.** Gold is the only decorative accent. Green and amber are never decoration; each carries one fixed meaning (now / special day).

**The Bright-Means-Prominent Rule.** Always use `--gold-bright` for the most important value, never a hard-coded light gold. In Klaf and Day it resolves darker, which keeps contrast.

## Typography

**Display Font:** Heebo (with system-ui, sans-serif) for clock, times, numerals
**Heading / Scripture Font:** Frank Ruhl Libre (with Noto Rashi Hebrew, Georgia, serif)
**Body / Label Font:** Heebo

**Character:** Frank Ruhl Libre brings the classical Hebrew printing tradition of a siddur or luach. Heebo is a clean, legible modern Hebrew sans that keeps numbers crisp at distance.

### Hierarchy
- **Display** (Heebo 800, `clamp(34px, 4.4vw, 72px)`, 1): the header clock in solid ink (never gradient text), with static faint seconds beside it. The next-tefillah time (Heebo 900, up to 64px, gold) is just below it in size. The Omer count goes to `clamp(80px, 12vw, 200px)`.
- **Headline** (Frank Ruhl 700, `clamp(22px, 2.6vw, 44px)`): screen titles, shul name, Hebrew date hero (900, up to 84px).
- **Title** (Frank Ruhl 700, `clamp(18px, 1.8vw, 30px)`): column and card heads (zmanim columns, prayer cards).
- **Scripture** (Frank Ruhl 500, `clamp(26px, 3.4vw, 56px)`, 1.55): vocalized Torah texts and divrei torah; line-height is open for nikud.
- **Body** (Heebo 400, `clamp(16px, 1.5vw, 26px)`): zman rows, prayer rows, announcements.
- **Label** (Heebo 400, `clamp(12px, 1.1vw, 18px)`): location, day of week, small captions.

### Named Rules
**The Tabular Time Rule.** Every clock or time value uses `font-variant-numeric: tabular-nums` and weight 700 or above, so columns of times align and stay legible across the room.

**The Name-the-Opinion Rule.** Every zman that depends on a shita carries it as a small faint tag after the label (16.1°, מג״א, גר״א, 8.5°, ר״ת 72 דק׳). Shabbat and Yom Tov times carry their rule (20 דק׳ לפני השקיעה, שקיעה + 30 דק׳).

**The Serif-for-Names Rule.** Names of things (screens, tefillot, parsha, the shul, people remembered) are serif; times, counts and UI labels are sans.

## Layout

A fixed full-viewport frame (`100vh`, overflow hidden, no page scroll) in four rows: **header** (shul / clock / Hebrew date in a `1fr auto 1fr` grid), **stage** (the rotating screen), **strip** (rotation status, screen dots and faint kiosk controls, never over content), and **bottom bar** (next-tefillah hero, next-zman card, ticker). Below 1100px the next-zman card drops out. Outer padding is `clamp(12px, 1.8vh, 28px)`, row gap `clamp(10px, 1.4vh, 22px)`. Optimized for 16:9.

Screens fill the stage as flex columns: a title row, then a grid that takes the remaining height (`flex: 1; min-height: 0`). Typical grids are three equal columns (zmanim, learning), `auto-fit minmax(260–320px)` card grids (prayers, announcements), or a `1.3fr 1fr` hero + side split (date). Lists distribute rows with `justify-content: space-around` so the screen is filled at any height.

RTL throughout; times are aligned to the left (the line's end) via `text-align: left`.

Below 760px wide everything collapses to a single column; this is a fallback, not a target.

**The Fill-the-Frame Rule.** A board screen never scrolls on the TV. Content scales into the stage; only the settings panel and long memorial lists may scroll.

## Elevation & Depth

Layered glass. Cards are translucent navy (`--bg-glass`) with `backdrop-filter: blur(14px)`, a gold hairline border and a deep ambient shadow, floating over a ground made of a diagonal navy gradient lit by two soft radial glows (gold top-right, faint green bottom-left). Highlight cards (Shabbat, Text, Omer, yahrzeit) add a 160° tint gradient of their signal color into the glass.

### Holy-Place Backdrop
Under the whole board, a photograph of a holy place (`public/places/`, credits in `src/data/places.json`) replaces the plain ground. It is chosen by the calendar (holiday → its place, Shabbat → the parsha's place alternating with Tzfat, the Hurva and the Kotel, weekdays → all places with the parsha's every third change), changes every few minutes with a 3.5 s crossfade, and never changes during tefillah. A vertical veil of `--bg-0` (heavier at top and bottom, where the clock and next tefillah sit) and a denser `--bg-glass` keep every time at full contrast; Klaf tints the photo sepia. The place name, the reason ("פרשת …", the holiday) and the photographer's credit sit at the start of the strip.

### Shadow Vocabulary
- **Ambient lift** (`0 24px 60px rgba(0,0,0,0.45)`; Klaf `0 20px 50px rgba(90,70,30,0.22)`; Day `0 20px 50px rgba(40,60,110,0.14)`): every `.glass` card.
- **Kotel glow** (`drop-shadow(0 0 10px rgba(212,175,122,0.6))`): only the centre glyph of the compass.

**The Single Plane Rule.** All cards sit at the same elevation. Hierarchy comes from tint, gold text and size, not from stacking shadows.

## Shapes

Generously rounded, soft cards (22px), smaller controls rounded at 10–12px, and full pills for badges, chips and the screen dots. Borders are always 1px gold hairlines (2px on selected theme options). Dotted leaders (`2px dotted`) connect zman names to their times, a direct quote from the printed luach. Dashed hairlines separate memorial list rows and mark "add" buttons.

## Components

### Glass Card
The basic surface for all board content.
- **Corner Style:** 22px (`rounded.lg`)
- **Background:** `--bg-glass` with 14px backdrop blur; optional signal-tinted 160° gradient.
- **Border:** 1px `--line`.
- **Internal Padding:** `clamp(14px, 1.6vw, 26px)`, up to `clamp(28px, 4vw, 70px)` on hero cards.

### Zman Row (signature)
Label in Slate Dim → dotted gold leader → bold tabular time. The upcoming zman (`.next`) gets a gold gradient wash from the start side, a 12px radius and Candle Gold Bright on both label and time.

### Prayer Row
Name and time spread across the row. The current/next tefillah (`.hot`) washes green and turns both texts Now Green.

### Chips / Badges
- **Style:** pill, 14–16% gold fill, 1px gold border, bright gold bold text (header holiday chip, date badges, text category).
- **Variants:** `yomtov` amber, `omer` green; same structure, signal color swapped.

### Next-Tefillah Hero + Next Zman + Ticker (signature)
The largest time on the board. A strong gold-wash card holds:
- a label: "התפילה הבאה", or "מחר" after the day's last tefillah;
- the serif name;
- the time in gold at weight 900;
- a calm countdown ("בעוד 2 ש׳ ו־14 דק׳") with digits in Now Green; seconds appear only in the last 10 minutes.

Beside it, a smaller **next zman** card shows the label, its opinion tag and the time in gold. Then the ticker: a solid gold-bright tag with surface-colored text, followed by two copies of the text sliding at a constant reading speed so the loop is seamless. In quiet mode the ticker becomes a static line naming the tefillah.

### Next Tag
A small pill after a label that says "הבא", "הבאה" or "היום" in text, so a highlighted row never depends on color alone. Gold wash by default; green wash for the next tefillah.

### Quiet Mode
From 2 minutes before each shacharit, mincha and arvit until its approximate end:
- `data-quiet` on the root stops every animation and transition;
- the ticker turns static;
- rotation slows to at least 60 s per screen.

`prefers-reduced-motion` always gets the same stillness.

### Buttons
- **Primary** (`done-btn`): 12px radius, solid `--gold-bright` with `--bg-2` text, weight 800. Hover: `brightness(1.08)`.
- **Outline** (`gps-btn`): surface fill, 1px gold border, gold-bright text.
- **Ghost / Add:** Night Surface fill, dashed gold border, bright gold text; hover adds a 10% gold fill.
- **Destructive:** transparent with amber border and text.
- **Kiosk controls** (`ctrl-btn`): 40px glass tiles with drawn SVG icons, placed in the strip at the end opposite the status. 18% opacity at rest; full on hover or focus-within.

### Inputs / Fields
- **Style:** Night Ink fill, 1px hairline, 10px radius, `11px 14px` padding, 16px text.
- **Focus:** a 2px gold-bright focus-visible ring plus a gold border. The global `:focus-visible` ring, `::selection` and caret are themed.
- **Invalid:** an amber border and an inline amber message under the field (e.g. an unreadable prayer time).
- **Checkboxes / range:** native, `accent-color: var(--gold)`.

### Navigation
- **Screen dots:** 12px pill dots, hairline fill with deep-gold border; active dot stretches to 34px and turns Candle Gold Bright.
- **Settings tabs:** top-rounded (12px) tabs; active tab takes the Night Surface fill, a hairline border and bright gold text.

## Do's and Don'ts

### Do:
- **Do** size every board element with `clamp()` so it reads at both wall-TV and lobby distance.
- **Do** use `tabular-nums` and weight ≥700 on every time.
- **Do** reach for `--gold-bright` for the one most important value on a screen.
- **Do** keep the zman label → dotted leader → time pattern for any list of times.
- **Do** test every new screen in all three themes (Night, Klaf, Day).
- **Do** keep motion slow: screens enter with a 0.7s `fadeUp` that starts at 40% opacity, text fades in over 1s, and the yahrzeit flame glows over a 4s cycle. Everything stops in quiet mode.
- **Do** derive every tint from a token with `color-mix`.

### Don't:
- **Don't** use Now Green or Festival Amber as decoration; they mean "now" and "special day".
- **Don't** hard-code navy or light-gold hex values in components; go through the CSS variables so themes keep working.
- **Don't** let a board screen scroll or overflow the stage.
- **Don't** use emoji or Unicode glyphs as icons, and don't use gradient text.
- **Don't** pulse or blink anything on a 1 s cycle.
- **Don't** put essential information behind hover or touch; the board must work with no interaction (Shabbat).
