# 5. The AI skills lead the skills list, whatever their level; the CV prints tighter

- Status: accepted
- Date: 2026-10-31
- Partly supersedes: [ADR 0003](0003-radar-shows-skill-level-bars-show-experience.md) decision 5's "highest skill level first" and decision 3's printed note "Ordered by skill level · years of hands-on experience"

## Context

AI agents and Agentic development workflows had skill level 5 after one and two years of hands-on work, which read as overstated. Lowered to 4, "highest skill level first" would push them below JavaScript / TypeScript and Node.js, yet they are what the site is positioned around. Separately, longer stacks (RAG, webhooks, OAuth/OIDC, RBAC) and a longer Sitelevel summary grew the CV's main column by about 100px past its A4 page, which had no room to spare.

## Decision

1. **AI agents and Agentic development workflows have skill level 4; System integration has 5.**
2. **They stay first in the hand-kept list order**, on screen and in print; the other skills follow, highest skill level first.
3. **The printed note reads "Ordered by focus · years of hands-on experience"**, since the order no longer follows skill level alone.
4. **A skill no longer in use stores an end month**, and its experience counts up to that month instead of the build month. Python (2011–2014, skill level 1) is the first: listed last, on the radar after Solid.js (ten axes), and in the freelance job's stack.
5. **The CV keeps its content and prints tighter:** page padding top/bottom 40/32px (was 56/48), gap below the header 14px (was 28px plus 8px margin), header bottom padding 16px (was 32px), column gaps 14px (was 26px), gap between jobs 6px (was 14px) and inside a job 2px (was 3px), profile line height 1.55 (was 1.6).

## Consequences

- The list order is not a sort by skill level; the radar still shows each skill's level.
- Where the print note or the print spacing differ from `design/`, this ADR wins; the design files are not updated.
- The main column keeps about 9px of slack; the next addition to the CV needs a cut instead.
