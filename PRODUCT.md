# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Runs in a browser and as an Electron kiosk wrapper on Windows; the design language is web.)

## Users

- **Congregants** in a synagogue who look at the board to know the zmanim, the next prayer time, the date, the parsha, and community notices. They glance at it, usually without touching it, and may stand anywhere from a wall TV across the room to a lobby screen a meter away.
- **The gabbai** (or whoever sets the board up) installs it, enters the shul's name and location, edits prayer times, yahrzeits and announcements, and picks which screens rotate. Done occasionally, at a computer or on the kiosk itself.

## Product Purpose

A general digital board that any synagogue can install and configure itself. It replaces the printed or hand-updated luach with accurate zmanim calculated from the shul's own location, prayer schedules, daily learning, yahrzeit reminders and community messages, shown on a screen that rotates on its own.

Success means a congregant can read the right time correctly from wherever they stand, and the gabbai can set it up once and trust it to run without attention.

## Positioning

Zmanim come from `kosher-zmanim` (KosherJava) using the shul's own latitude, longitude and elevation. Prayer times can be fixed or relative to zmanim (`sunset-18`, `plag+0`). Hebrew dates, parsha, daf yomi, omer and yahrzeits come from `@hebcal/core`. Everything runs locally with no backend or account.

## Operating Context

- A TV or large monitor, 16:9, often running full-screen kiosk mode (Electron), sometimes a browser tab.
- Viewing distance varies by shul: across the room at a wall TV, or close up in an entrance or lobby. Both must work.
- Rotates through screens automatically: Zmanim, Prayers, Date, Learning, Torah text, Week zmanim, Jerusalem compass, Omer (seasonal), Memorial, Announcements. Has a ticker and a countdown to the next prayer.
- Configured through a settings panel (keyboard `S` or ⚙). All settings live in browser `localStorage`.
- In the Electron kiosk there is no GPS or compass sensor, so location is entered manually or picked from a city list.

## Capabilities and Constraints

- Hebrew, full RTL. Nusach options: Ashkenaz, Sefard, Edot HaMizrach, Teiman, Chabad.
- Three display themes: dark, parchment (klaf), light.
- Shabbat and Yom Tov: the board must run unattended with no interaction required. Nothing essential may depend on touch, clicks or a person changing state during Shabbat.
- No backend, no network dependency for core zmanim.
- Halachic disclaimer: calculations should be checked against a local luach or rabbi; this is stated in the README.

## Brand Commitments

- **Halachic accuracy first.** Zmanim, dates and texts must never be shown wrong or ambiguously. Correctness and clarity always beat visual effect: labels must name the opinion (e.g. Magen Avraham / Gra, Geonim / Rabbeinu Tam) wherever the board shows one.
- **Shabbat-safe.** The board works entirely on its own once set up.
- The product name is לוח דיגיטלי / Luach Digitali (not marked as binding).

## Evidence on Hand

- A bank of short vocalized Torah texts with sources in `src/data/texts.ts` (Chumash, Tehillim, Mishlei, Pirkei Avot, Mishnah, Gemara, Halacha, Rambam, Rabbi Nachman, Mussar).
- No testimonials, installations or partner synagogues are recorded. Do not invent any.

## Product Principles

1. **Read correctly at a glance.** The most important time right now (next zman, next prayer) is the first thing anyone sees, at any viewing distance.
2. **Never ambiguous on halacha.** Every time states what it is, and by which opinion.
3. **Runs without hands.** Rotation, seasonal screens and daily changes happen on their own; Shabbat needs no interaction.
4. **Any shul, its own board.** Name, location, schedule and notices belong to the congregation configuring it; nothing is hardcoded to one community.
5. **Respectful of the space.** It hangs in a place of prayer: calm, dignified, never distracting during davening.

## Accessibility & Inclusion

- Readable from a distance and by older congregants: large type, strong contrast, no information carried by color alone.
- Full RTL with correct nikud rendering.
- Motion stays slow and calm; rotation timing must give enough time to read.
