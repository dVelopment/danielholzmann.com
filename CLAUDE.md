# CLAUDE.md

## Project Overview

Personal portfolio website for Daniel Holzmann (danielholzmann.com). A single-page CV/portfolio site showcasing professional experience, skills, and GitHub repositories.

## Tech Stack

- **Framework**: Gatsby v5.14+ (React-based static site generator)
- **UI**: React 18, styled-components 6
- **Data**: GitHub GraphQL API for repository display
- **Deployment**: Netlify (see `_redirects`, `gatsby-plugin-netlify`)
- **Node version**: 22 (see `.nvmrc`; provided by `devenv.nix`)

## Commands

```bash
npm run develop  # Start dev server (localhost:8000)
npm run build    # Production build
npm run clean    # Clean Gatsby cache
npm run format   # Format code with Prettier
```

## Project Structure

```
src/
├── components/     # React components (styled-components)
│   ├── about/      # Bio section
│   ├── header/     # Site header
│   ├── hero/       # Hero banner with avatar
│   ├── layout/     # Page layout wrapper
│   ├── repositories/  # GitHub repos display
│   ├── skills/     # Skills progress bars
│   ├── timeline/   # Work history timeline
│   └── styles/     # Global styles, CSS reset
├── images/         # Source images (processed by gatsby-plugin-image)
├── pages/          # Gatsby pages (index.js, 404.js)
data/
└── siteConfig.js   # Site configuration (bio, skills, jobs, social links)
static/
├── favicon/        # Favicon assets
└── images/         # Static images (avatar, cover)
```

## Configuration

All site content is configured in `data/siteConfig.js`:
- `authorDescription`: Bio text (HTML supported)
- `skills`: Array of skill names and proficiency levels
- `jobs`: Work history for timeline
- `social`: Social media links

## Environment Variables

Requires `GITHUB_TOKEN` for GitHub API access. Declared in `secretspec.toml`, resolved from 1Password (`my.1password.com`, vault `Freelancing`, item `GITHUB_TOKEN for danielholzmann.com`). The devenv secretspec integration (`devenv.yaml` → `secretspec`) resolves it on shell entry and `devenv.nix` exports it, so it is set everywhere inside `devenv shell`:

```bash
devenv shell -- npm run develop
devenv shell -- npm run build
npm run serve   # serves public/ on localhost:9000, no token needed
```

Agents must set `SECRETSPEC_REASON="<why>"` (secretspec's `require_reason` policy). The resolved token is written in plaintext to the gitignored `.devenv/shell-*.sh` cache.

The token is a fine-grained PAT. If it can't read the pinned repositories, `stargazers` returns `FORBIDDEN` and the build fails; "Repository access: Public repositories" (read-only) should cover it.

`gatsby-config.ts` still loads `.env.${NODE_ENV}` via dotenv as a fallback; Netlify provides `GITHUB_TOKEN` from its own environment settings.

## Developer Context

- Owner: Daniel Holzmann - full-stack developer with decades of experience
- Primary stack: React/Solid.js (frontend), Node.js/Rust (backend)
- Code style: Prettier configured (`.prettierrc`)
