import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { profile } from './src/data/profile';

export default defineConfig({
  site: profile.siteUrl,
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
    // .devenv/profile links into the Nix store, whose macOS SDK headers
    // contain symlink loops (ncursesw ↔ ncurses) that flood the watcher.
    server: { watch: { ignored: ['**/.devenv/**', '**/.direnv/**'] } },
  },
});
