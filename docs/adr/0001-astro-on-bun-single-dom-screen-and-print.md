# 1. Astro on Bun, one DOM for screen and print, build-time experience numbers

- Status: accepted; partly superseded by [ADR 0002](0002-focus-areas-ranked-by-hand-set-focus-level.md): decision 3's CSS-`order` clause, and decision 5's per-surface caps, stored fields and exact leadership count in prose
- Date: 2026-10-30
- Spec: [#28](https://github.com/dVelopment/danielholzmann.com/issues/28), tickets #29–#33

## Context

The start page is being rebuilt to match two designs in `design/`: a terminal-style screen page and a one-page A4 print CV. The Gatsby site built in minutes, mostly because of a GitHub GraphQL source that needed a 1Password-backed token. The new design has no repositories section. The page is static but Gatsby ships a React runtime. Skill levels and job durations were hard-coded and went stale.

## Decision

1. **Astro with `.astro` components replaces Gatsby, running on the Bun runtime.** `bunfig.toml` sets `[run] bun = true`, so `astro` runs on Bun despite its `node` shebang. Deployment installs and builds with a pinned bun, not Nixpacks' bundled one. Node, the GitHub GraphQL source, `GITHUB_TOKEN`/secretspec and the dead Universal Analytics tag are removed.
2. **Tailwind v4 with theme tokens replaces inline styles.** Components translate the designs' inline styles into utilities on the tokens. Colors in SVG use classes, not presentation attributes.
3. **Screen and print share one HTML page and one DOM tree.** Shared sections are restyled with `print:` variants. Wrappers are `display: contents` on screen and become the CV's two-column layout in print. Content that exists in only one design is a medium-only node. Where wording differs, a screen/print span pair keeps both texts verbatim. DOM order equals screen visual and Tab order. Print reorders skills via CSS `order`.
4. **No JavaScript is required.** The only script is an inline `onclick="window.print()"` on the print button, which a `<noscript>` style hides. The skill list ↔ radar highlight is CSS-only (`:hover`, `:focus-visible`, `:has()`).
5. **Experience numbers are computed at build time from start months.** Skills store a name and a start month; jobs store start and end months. Years are the full years elapsed since the start month (a year-only start counts from January), with no further rounding. Career and leadership counts in prose use the exact full years (`20+`, `11+`). Skills are capped per surface: radar, bars and the list's default label show `1`–`4` or `5+` years; hover/focus on screen and the print CV show up to `10+` years, with values in between (`7 yrs`, `9 yrs`) shown exactly. A regular rebuild (e.g. monthly) keeps the numbers current.

## Consequences

- Builds take seconds and need no secrets, so preview deployments need no token either.
- Build output moves from `public/` to `dist/`. The Dokploy app must serve `dist/`, and `public/` becomes a committed static-asset input dir.
- Numbers are only as fresh as the last build. Scheduling a periodic rebuild is outside this repo.
- Every visible element carries both screen and `print:` classes, so changing one design requires checking the other medium.
- Browsers without `:has()` lose the list ↔ radar link but keep the per-item hover reveal.
