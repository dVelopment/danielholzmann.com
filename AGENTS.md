# AGENTS.md

## Project Overview

Personal portfolio website for Daniel Holzmann (danielholzmann.com). A single-page CV/portfolio site showcasing professional experience, skills, and GitHub repositories, positioned around AI engineering.

On the `redesign` branch the site is being rebuilt as Astro on Bun to match the terminal screen page and print CV in `design/`; read `docs/adr/0001-astro-on-bun-single-dom-screen-and-print.md` before changing stack, styling, layout or the skills/jobs data model. Until that lands, the Gatsby setup below is what builds.

## Tech Stack

- **Framework**: Gatsby 5.16, TypeScript (`graphqlTypegen` writes `src/gatsby-types.d.ts`)
- **UI**: React 18, Tailwind CSS v3 via `gatsby-plugin-postcss` (`tailwind.config.js`, `src/styles/global.css`), `motion` for animation
- **Data**: GitHub GraphQL API (via `gatsby-source-graphql`) for the repositories card
- **Deployment**: Dokploy with Nixpacks; it detects Bun from `bun.lock` and runs `bun run build`. `nixpacks.toml` overrides the install phase with `npx bun@1.4.2 install --frozen-lockfile` because Nixpacks' bundled bun (1.2.10) can't parse `bun.lock` v2; bump that pin when upgrading local bun. Preview deployments have their own environment settings in Dokploy and need `GITHUB_TOKEN` set there too
- **Package manager**: Bun (`bun.lock`; npm is not used)
- **Node version**: 22 (see `.nvmrc`; provided by `devenv.nix`). Gatsby still runs on Node; Bun only installs and runs scripts

## Commands

```bash
bun run develop          # Start dev server (localhost:8000)
bun run build            # Production build
bun run clean            # Clean Gatsby cache
bun run typecheck        # tsc --noEmit
bunx prettier --write .  # Format (`.prettierrc`; prettier is not a dependency)
```

## Content

All site content lives in `src/data/siteConfig.ts`, typed by `src/types/siteConfig.ts`: bio (`authorDescription`, HTML allowed), `skills` (name + level), `jobs` (timeline) and `social` links. Components are in `src/components/` as a bento grid of cards.

## Environment Variables

Requires `GITHUB_TOKEN` for GitHub API access. Declared in `secretspec.toml`, resolved from 1Password (`my.1password.com`, vault `Freelancing`, item `GITHUB_TOKEN for danielholzmann.com`). The devenv secretspec integration (`devenv.yaml` → `secretspec`) resolves it on shell entry and `devenv.nix` exports it, so it is set everywhere inside `devenv shell`:

```bash
devenv shell -- bun run develop
devenv shell -- bun run build
bun run serve   # serves public/ on localhost:9000, no token needed
```

Agents must set `SECRETSPEC_REASON="<why>"` (secretspec's `require_reason` policy). The resolved token is written in plaintext to the gitignored `.devenv/shell-*.sh` cache.

The token is a fine-grained PAT. If it can't read the pinned repositories, `stargazers` returns `FORBIDDEN` and the build fails; "Repository access: Public repositories" (read-only) should cover it.

`gatsby-config.ts` still loads `.env.${NODE_ENV}` via dotenv as a fallback; in Dokploy, set `GITHUB_TOKEN` in the app's environment settings.

