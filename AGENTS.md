# AGENTS.md

## Project Overview

Personal portfolio website for Daniel Holzmann (danielholzmann.com). A single-page CV/portfolio site positioned around AI engineering: a terminal-style screen page that prints as a one-page A4 CV from the same DOM.

The designs in `design/` are the pixel and text source of truth, except where an ADR overrides them (ADR 0002: focus area wording, levels and order). Read `docs/adr/0001-astro-on-bun-single-dom-screen-and-print.md` before changing stack, styling, layout or the focus areas/jobs data model, and `docs/adr/0002-focus-areas-ranked-by-hand-set-focus-level.md` before changing how focus areas are ranked. Terms (focus area, focus level, experience) follow `GLOSSARY.md`. The rebuild is tracked in issue #28 (tickets #29–#33).

## Tech Stack

- **Framework**: Astro 7 with native `.astro` components only; no UI framework, no client-side hydration. Static output in `dist/`
- **Runtime**: Bun 1.4.2 only, no Node locally; the Nixpacks image keeps Node 22 (`NIXPACKS_NODE_VERSION`) solely to `npx` the pinned Bun. `bunfig.toml` sets `[run] bun = true`, so every `bun run` script (including Astro's `node`-shebang CLI) runs on Bun. `devenv.nix` provides Bun and runs `bun install --frozen-lockfile` on shell entry; a failure there is reported (✖) but the shell still opens
- **Styling**: Tailwind v4 via `@tailwindcss/vite`, scanning only `src/`. Design tokens are `@theme` variables in `src/styles/global.css` (screen and print palettes, `mono`/`sans` fonts), which also defines the `page` utility (the screen shell, and in print the CV's exact 210×297mm A4 canvas, which the design rounds to 794×1123px). Colors only via token utilities, no inline styles; arbitrary values only where they mirror a `design/` value. Exceptions: the computed focus-level bar width (`style` in `FocusAreas.astro`), the generated `:has()` rules in `FocusAreasHighlight.astro`, which use the token variables (`var(--color-accent)`), and Layout's `<noscript>` rule. `theme-color` in `Layout.astro` and the manifest must match `--color-background`. Print styling uses the `print:` variant: every visible element carries its screen classes plus `print:` overrides, so a change to one design needs a check of the other medium
- **Type checking**: TypeScript 7.1 (`tsc`) checks `.astro` files through `@astrojs/ts-content-mapper` (`contentMappers` in `tsconfig.json`, needs `--runExternalCode`)
- **Tests**: Bun's test runner, tests in `tests/`. The radar label and printed-CV fit checks drive Playwright's headless Chromium (`playwright` dev dependency); its browser comes from `bunx playwright install chromium` (devenv runs it on shell entry)
- **Deployment**: Dokploy with Nixpacks. `nixpacks.toml` installs and builds with `npx bun@1.4.2` because Nixpacks' bundled bun (1.2.10) can't parse `bun.lock` v2; bump that pin when upgrading local bun. Dokploy must serve `dist/`. The build needs no secrets, so a `GITHUB_TOKEN` left in Dokploy environments can be dropped

## Commands

```bash
bun run dev              # Dev server (localhost:4321)
bun run build            # Production build into dist/
bun run serve            # Preview dist/ on localhost:4321
bun run typecheck        # astro sync + tsc over .ts and .astro
bun test                 # Unit-tests the experience math, radar geometry and photo densities, builds the site (once now, once with tests/fixed-clock.ts freezing a later date), checks the output as screen and print show it, and drives headless Chromium (radar labels fit the viewBox, the CV fits the A4 canvas, one-page PDF)
bunx prettier --write .  # Format .ts/.json/.md/.css (`.prettierrc`; not a dependency; no Astro plugin, so .astro files are formatted by hand)
```

## Layout

- `src/layouts/Layout.astro`: document shell (the `.page` wrapper) and the head (SEO, Open Graph/Twitter, `rel="me"`, icons, manifest, fonts), plus a `<noscript>` rule hiding elements marked `data-js-only` (the print button); pages add head content through `<slot name="head" />`
- `src/components/`: one component per page section, each styled for screen and, with `print:`, as its part of the CV (Hero → CV header with the photo, About → profile, Career → experience, FocusAreas → CV focus area list, Footer → CV footer); `CvContact.astro`, `CvEducation.astro` and `CvLanguages.astro` (rendered only when `languages` is set) are print-only (`hidden print:flex`). `TextPair.astro` renders text worded differently per medium as a screen/print span pair, or plain text when both agree. `SectionHeading.astro` renders the designs' prompt headings (`## ` by default, `prompt="$ "` for the CV callout). `FocusAreas.astro` draws the radar and list; `FocusAreasHighlight.astro` (slotted into the head) generates the CSS-only `:has()` highlight that links each focus area's list item, radar label, spoke and dot through `data-focus-area`
- `src/pages/`: `index.astro` (start page) and `404.astro`. In `index.astro` the wrapper divs are `display: contents` on screen (DOM, visual and Tab order stay one); in print `<main>` is `display: contents` instead and the wrappers form the CV's two-column row of aside and main column
- `src/data/`: typed content. `profile.ts` (identity, the print-only `cvNameSuffix`, social links, education, languages, and `bareUrl` for links as the CV prints them), `jobs.ts` (career with CV role and summary, plus derived `currentJob` and `careerYears`), `focus-areas.ts` (per focus area a hand-set focus level 1–5, start month, CV/radar names; `focusAreas` is the hand-kept list order on screen and in print, `radarAxes` the radar's axis order; plus derived `leadershipYears` and the hover/focus and CV experience cap `DETAIL_CAP`), `build.ts` (the build month in Vienna time, which every number counts up to). Store start/end months, never year counts; focus levels are the only hand-set ranking
- `src/lib/experience.ts`: pure month math (`yearsSince`, `yearsLabel`, `durationLabel`, month formats). A `Month` is `{ year, month }` (month 1–12) or a bare year meaning January
- `src/lib/radar.ts`: pure radar geometry in the design's SVG coordinates (rings labelled `1`–`5`, spokes, data polygon from ring values, label anchors for any axis count, tuned to the design's eight)
- `src/lib/image.ts`: `fillableDensities`, the `srcset` densities a source fills without upscaling (the CV photo lists 2x/3x once the portrait covers 2×/3× its 112×140 box)
- `src/images/`: images processed by Astro's image pipeline (avatar)
- `public/`: static files served as-is (favicon, touch icon, manifest icons, `manifest.webmanifest`)
