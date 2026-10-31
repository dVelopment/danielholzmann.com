# 4. The section is Skills again

- Status: accepted
- Date: 2026-10-31
- Partly supersedes: [ADR 0002](0002-focus-areas-ranked-by-hand-set-focus-level.md) decision 1 (the skills section becomes Focus areas)

## Context

ADR 0002 renamed the skills section to Focus areas while the radar showed how much weight Daniel puts on each area. Since [ADR 0003](0003-radar-shows-skill-level-bars-show-experience.md) the radar shows skill level, so the heading `focus-areas --level` no longer matched what the section shows.

## Decision

1. **The section is Skills** (see `GLOSSARY.md`). The screen heading reads `skills --level`, the printed one `skills`, as in `design/` (`## skills`) apart from the flag.
2. **Code follows the term:** `src/data/skills.ts` (`Skill`, `skills`), `Skills.astro`, `SkillsHighlight.astro`, the section id `skills` and the `data-skill` attribute. The radar's accessible label starts "Skill radar".
3. Everything else from ADR 0002 and ADR 0003 stays: hand-set skill level on the radar, years of experience on the rows, hand-kept order.

## Consequences

- One word for the thing on screen, in print, in code and in the glossary; "focus area" survives only in ADR 0002 and 0003, which keep their wording as history.
- Links to `#focus-areas` no longer resolve; the page itself never linked there.
