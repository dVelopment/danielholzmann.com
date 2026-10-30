# danielholzmann.com

Daniel Holzmann's portfolio: a terminal-style page that prints as a one-page A4 CV. Built with [Astro](https://astro.build) on [Bun](https://bun.sh), styled with Tailwind v4, and shipped as static HTML. The start page needs no JavaScript; the 404 page uses one inline script to show the requested path.

## Develop

Needs Bun 1.4.2 (`devenv shell` provides it and installs dependencies). No Node, no secrets.

```sh
bun install --frozen-lockfile   # an older bun fails here instead of rewriting bun.lock
bun run dev        # http://localhost:4321
bun run build      # static site in dist/
bun run serve      # preview dist/
bun run typecheck
bun test
```

## Deploy

Dokploy builds with Nixpacks; `nixpacks.toml` installs and builds with pinned `bun@1.4.2`.

- Dokploy must serve `dist/` (Astro's output), not `public/`, which is a committed input directory.

## Content

Site identity and social links live in `src/data/profile.ts`. The designs in `design/` are the source of truth for layout and text; `docs/adr/` records the architecture decisions.
