# 4. The section is Skills again; the CV words its year counts

- Status: accepted
- Date: 2026-10-31
- Partly supersedes: [ADR 0002](0002-focus-areas-ranked-by-hand-set-focus-level.md) decision 1 (the skills section becomes Focus areas) and decision 3's `N+` wording for the printed profile

## Context

ADR 0002 renamed the skills section to Focus areas while the radar showed how much weight Daniel puts on each area. Since [ADR 0003](0003-radar-shows-skill-level-bars-show-experience.md) the radar shows skill level, so the heading `focus-areas --level` no longer matched what the section shows. Separately, `20+ years` reads like terminal shorthand in the CV's prose profile.

## Decision

1. **The section is Skills** (see `GLOSSARY.md`). The screen heading reads `skills --level`, the printed one `skills`, as in `design/` (`## skills`) apart from the flag.
2. **Code follows the term:** `src/data/skills.ts` (`Skill`, `skills`), `Skills.astro`, `SkillsHighlight.astro`, the section id `skills` and the `data-skill` attribute. The radar's accessible label starts "Skill radar".
3. **The printed profile words its counts.** Career years read "over {decades}" ("over two decades", "over three decades" from Feb 2036, via `decadesInWords`), leadership years "more than N years" ("more than 10 years", "more than 20 years" from 2035). Both still floor to whole decades. The screen (hero, `exp:` chip, About) and the meta description keep `N+ years`, as does `design/`'s CV, which this ADR overrides.
4. Everything else from ADR 0002 and ADR 0003 stays: hand-set skill level on the radar, years of experience on the rows, hand-kept order.

## Consequences

- One word for the thing on screen, in print, in code and in the glossary; "focus area" survives only in ADR 0002 and 0003, which keep their wording as history.
- Links to `#focus-areas` no longer resolve; the page itself never linked there.
