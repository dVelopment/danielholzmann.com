# AGENTS.md

## Project Overview

Personal portfolio website for Daniel Holzmann (danielholzmann.com). A single-page CV/portfolio site showcasing professional experience, skills, and GitHub repositories, positioned around AI engineering.

On the `redesign` branch the site is being rebuilt as Astro on Bun to match the terminal screen page and print CV in `design/`; read `docs/adr/0001-astro-on-bun-single-dom-screen-and-print.md` before changing stack, styling, layout or the skills/jobs data model. Until that lands, the Gatsby setup below is what builds.

## Tech Stack

- **Framework**: Gatsby 5.16, TypeScript (`graphqlTypegen` writes `src/gatsby-types.d.ts`)
- **UI**: React 18, Tailwind CSS v3 via `gatsby-plugin-postcss` (`tailwind.config.js`, `src/styles/global.css`), `motion` for animation
- **Deployment**: Dokploy with Nixpacks; it detects Bun from `bun.lock` and runs `bun run build`. `nixpacks.toml` overrides the install phase with `npx bun@1.4.2 install --frozen-lockfile` because Nixpacks' bundled bun (1.2.10) can't parse `bun.lock` v2; bump that pin when upgrading local bun
- **Package manager**: Bun (`bun.lock`; npm is not used)
- **Node version**: 22 (see `.nvmrc`; provided by `devenv.nix`). Gatsby still runs on Node; Bun only installs and runs scripts

## Commands

```bash
bun run develop          # Start dev server (localhost:8000)
bun run build            # Production build
bun run clean            # Clean Gatsby cache
bun run typecheck        # tsc --noEmit
bunx prettier --write .  # Format (`.prettierrc`; prettier is not a dependency)
bun run serve            # Serve public/ on localhost:9000
```

## Content

All site content lives in `src/data/siteConfig.ts`, typed by `src/types/siteConfig.ts`: bio (`authorDescription`, HTML allowed), `skills` (name + level), `jobs` (timeline) and `social` links. Components are in `src/components/` as a bento grid of cards.

