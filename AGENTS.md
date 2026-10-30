# AGENTS.md

## Project Overview

Personal portfolio website for Daniel Holzmann (danielholzmann.com). A single-page CV/portfolio site positioned around AI engineering: a terminal-style screen page that prints as a one-page A4 CV from the same DOM.

The designs in `design/` are the pixel and text source of truth. Read `docs/adr/0001-astro-on-bun-single-dom-screen-and-print.md` before changing stack, styling, layout or the skills/jobs data model. The rebuild is tracked in issue #28 (tickets #29–#33).

## Tech Stack

- **Framework**: Astro 7 with native `.astro` components only; no UI framework, no client-side hydration. Static output in `dist/`
- **Runtime**: Bun 1.4.2 only, no Node locally; the Nixpacks image keeps Node 22 (`NIXPACKS_NODE_VERSION`) solely to `npx` the pinned Bun. `bunfig.toml` sets `[run] bun = true`, so every `bun run` script (including Astro's `node`-shebang CLI) runs on Bun. `devenv.nix` provides Bun and runs `bun install --frozen-lockfile` on shell entry; a failure there is reported (✖) but the shell still opens
- **Styling**: Tailwind v4 via `@tailwindcss/vite`, scanning only `src/`. Design tokens are `@theme` variables in `src/styles/global.css` (screen and print palettes, `mono`/`sans` fonts). Colors only via token utilities, no inline styles; arbitrary values only where they mirror a `design/` value. `theme-color` in `Layout.astro` and the manifest must match `--color-background`. Print styling uses the `print:` variant
- **Type checking**: TypeScript 7.1 (`tsc`) checks `.astro` files through `@astrojs/ts-content-mapper` (`contentMappers` in `tsconfig.json`, needs `--runExternalCode`)
- **Tests**: Bun's test runner, tests in `tests/`
- **Deployment**: Dokploy with Nixpacks. `nixpacks.toml` installs and builds with `npx bun@1.4.2` because Nixpacks' bundled bun (1.2.10) can't parse `bun.lock` v2; bump that pin when upgrading local bun. Dokploy must serve `dist/`. The build needs no secrets, so a `GITHUB_TOKEN` left in Dokploy environments can be dropped

## Commands

```bash
bun run dev              # Dev server (localhost:4321)
bun run build            # Production build into dist/
bun run serve            # Preview dist/ on localhost:4321
bun run typecheck        # astro sync + tsc over .ts and .astro
bun test                 # Unit-tests the experience math, builds the site and checks the output
bunx prettier --write .  # Format .ts/.json/.md/.css (`.prettierrc`; not a dependency; no Astro plugin, so .astro files are formatted by hand)
```

## Layout

- `src/layouts/Layout.astro`: document shell and the full head (SEO, Open Graph/Twitter, `rel="me"`, icons, manifest, fonts)
- `src/components/`: one component per page section; `SectionHeading.astro` renders the designs' `## …` headings
- `src/pages/`: `index.astro` (start page) and `404.astro`
- `src/data/`: typed content. `profile.ts` (identity, social links, education, languages), `jobs.ts` (career, plus derived `currentJob` and `careerYears`), `skills.ts` (start month, CV/radar names, featured flag), `build.ts` (the build month in Vienna time, which every number counts up to). Store start/end months only; no year count is ever typed by hand
- `src/lib/experience.ts`: pure month math (`yearsSince`, `yearsLabel`, `durationLabel`, month formats). Months are `YYYY-MM` or `YYYY` (January)
- `src/images/`: images processed by Astro's image pipeline (avatar)
- `public/`: static files served as-is (favicon, touch icon, manifest icons, `manifest.webmanifest`)
