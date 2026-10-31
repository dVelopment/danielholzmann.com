# 2. Focus areas ranked by a hand-set focus level

- Status: accepted
- Date: 2026-10-31
- Spec: [#39](https://github.com/dVelopment/danielholzmann.com/issues/39), ticket [#40](https://github.com/dVelopment/danielholzmann.com/issues/40)
- Partly supersedes: [ADR 0001](0001-astro-on-bun-single-dom-screen-and-print.md) decision 3's "print reorders skills via CSS `order`" clause, and decision 5's per-surface caps, stored fields and exact leadership count in prose (focus areas also store a hand-set level; experience and its `10+` cap stay)

## Context

The skills radar, bars and list labels showed years of experience, capped at `5+`. That put Node.js, React and leadership on the outer ring and AI agents and agentic development workflows, the work Daniel wants to be hired for today, inside it, because they are only a year or two old. Visitors read the radar as "what this person does", so it told the wrong story. The printed CV sorted skills by a computed rule (featured first, newest start first), reordered from the screen list with CSS `order`.

## Decision

1. **The skills section becomes Focus areas** (see `GLOSSARY.md`). Code, ids, data attributes and component names use focus area, focus level and experience.
2. **Each focus area has a hand-set focus level from 1 to 5.** The radar value, the bar width (level ÷ 5) and the list's default label (`N/5`) show the focus level. Ring labels read `1`–`5`; the screen caption reads "scale: focus level · 1–5"; the radar's accessible label lists each focus area with its level.
3. **Experience stays computed.** Each focus area keeps its start month; years are counted to the build month as in ADR 0001 decision 5 and shown, capped at `10+`, on hover and keyboard focus on screen and on every printed row. Leadership years in the about and profile text use the same cap, so they read `10+`; career years stay exact. No year count is typed by hand.
4. **One hand-kept list order serves screen and print.** The `featured` flag and the computed CV sort are gone; print keeps the DOM order, so nothing is reordered with CSS `order`. The printed note reads "Ordered by focus · years of hands-on experience". The radar axis order stays separate, chosen so every label fits the radar's viewBox.

## Consequences

- Levels express intent and never move on their own: a later build changes the years shown, not the radar, bars, `N/5` labels or order. Changing emphasis is a data edit in `src/data/focus-areas.ts`.
- Screen and print tell the same story in the same order; ties are resolved by the hand-kept order, not by a sort rule.
- Screen readers hear each list item as name, "focus level N of 5" and the experience; the visual `N/5` and the bar are hidden from them.
- Whoever adds or renames a focus area also places it in the radar order so its label fits; a Playwright test checks every radar label against the viewBox.
- Where the wording, levels or order differ from `design/` (heading, caption, ring labels, `N/5` labels and bars, print order and note, System integration in place of Solid.js), this ADR wins; the design files are not updated.
