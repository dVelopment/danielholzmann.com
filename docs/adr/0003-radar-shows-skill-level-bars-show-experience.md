# 3. The radar shows skill level, the bars show experience

- Status: accepted
- Date: 2026-10-31
- Partly supersedes: [ADR 0002](0002-focus-areas-ranked-by-hand-set-focus-level.md) decision 1's "focus level" term, decisions 2–4 (what the level means, the bar width, the `N/5` label and its hover swap, the print note), its consequences on fixed bars and the spoken "focus level N of 5", and its "System integration in place of Solid.js"; [ADR 0001](0001-astro-on-bun-single-dom-screen-and-print.md)'s per-item hover reveal, now a hover accent

## Context

ADR 0002 gave each focus area a hand-set focus level and showed it three times: as the radar value, as the bar width and as the list's `N/5` label. The radar and the bars told the same story twice, and on screen experience only showed on hover or keyboard focus. The level also read better as how well Daniel masters an area than as how much weight he puts on it.

## Decision

1. **The level means skill level** (see `GLOSSARY.md`): how well Daniel masters a focus area today, set by hand from 1 to 5, independent of experience. Code, captions and accessible text say skill level; the section stays Focus areas and its heading `focus-areas --level`.
2. **Only the radar shows the skill level.** Ring labels read `1`–`5`; the screen caption reads "radar: skill level · 1–5 · bars: years of experience"; the radar's accessible label lists each focus area with its skill level.
3. **Each list row shows experience.** Its label always shows the years (`N yrs`, capped at `10+ yrs`), and its bar is `min(years, 10) ÷ 10` wide. There is no `N/5` label and no hover swap. Hovering a row or giving it keyboard focus, or hovering its radar label, turns the row's years accent and lights the radar label, spoke and dot. The printed note reads "Ordered by skill level · years of hands-on experience".
4. **Solid.js is back** as a ninth focus area (start 2025, skill level 3), on the radar after React. System integration stays.
5. **The list order stays hand-kept**, highest skill level first, on screen and in print.

## Consequences

- Bars grow with later builds; once every focus area reaches 10 years, all bars are full. The radar and the order still never move on their own.
- Screen readers hear each list item as name, "skill level N of 5" and the years; the bar is hidden from them.
- The radar has nine axes. The label geometry in `src/lib/radar.ts` is tuned to the design's eight; a Playwright test checks every one of the nine labels against the viewBox.
- Where the caption, bars, labels, print note or the ninth axis differ from `design/`, this ADR wins; the design files are not updated.
