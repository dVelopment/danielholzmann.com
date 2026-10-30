import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { monthOf, yearsSince } from '../src/lib/experience';
import { jobs } from '../src/data/jobs';
import { profile, social } from '../src/data/profile';

// Builds the real site and checks what browsers, crawlers and link previews get.

type Tag = Record<string, string>;
type Page = { html: string; tags: Tag[]; text: Record<string, string> };

const TEXT_SELECTORS = [
  'title',
  'h1',
  'main',
  'main a[href="/"]',
  '#requested-path',
  '#top',
  '#about',
  'footer',
];

let outDir: string;

const file = (path: string, dir = outDir) => Bun.file(join(dir, path));

/**
 * Builds the site into `dir` with the bun running the tests, not whichever bun is first on PATH.
 * With `fixedNow` (ISO date), tests/fixed-clock.ts freezes the clock so the build counts up to that
 * month. That build calls Astro's CLI directly: `bun --preload … run build` doesn't reach the script.
 */
function build(dir: string, fixedNow?: string) {
  const command = fixedNow
    ? [
        process.execPath,
        '--preload',
        join(import.meta.dir, 'fixed-clock.ts'),
        join(import.meta.dir, '../node_modules/astro/bin/astro.mjs'),
        'build',
      ]
    : [process.execPath, 'run', 'build'];
  const result = Bun.spawnSync([...command, '--outDir', dir], {
    stderr: 'pipe',
    env: fixedNow ? { ...process.env, FIXED_NOW: fixedNow } : process.env,
  });
  if (result.exitCode !== 0)
    throw new Error(`build failed:\n${result.stdout}\n${result.stderr}`);
}

// HTMLRewriter hands out text and attribute values with entities still encoded.
const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
};
const decode = (raw: string) =>
  raw.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ENTITIES[e]);

const attributes = (el: HTMLRewriterTypes.Element): Tag =>
  Object.fromEntries([...el.attributes].map(([k, v]) => [k, decode(v)]));
const normalize = (raw: string) => decode(raw).replace(/\s+/g, ' ').trim();

/** Parses a built page: every meta/link tag, plus the whitespace-normalized text of TEXT_SELECTORS. */
async function page(path: string, dir = outDir): Promise<Page> {
  const html = await file(path, dir).text();
  const tags: Tag[] = [];
  const text: Record<string, string> = {};
  const rewriter = new HTMLRewriter().on('meta, link', {
    element(el) {
      tags.push(attributes(el));
    },
  });
  for (const selector of TEXT_SELECTORS) {
    rewriter.on(selector, {
      text(chunk) {
        text[selector] = (text[selector] ?? '') + chunk.text;
      },
    });
  }
  rewriter.transform(html);
  for (const key in text) text[key] = normalize(text[key]);
  return { html, tags, text };
}

/** Every element matching `selector`, in document order, with its attributes and normalized text. Matches must not nest. */
function each(html: string, selector: string) {
  const found: { attrs: Tag; text: string }[] = [];
  new HTMLRewriter()
    .on(selector, {
      element(el) {
        found.push({ attrs: attributes(el), text: '' });
      },
      text(chunk) {
        found[found.length - 1].text += chunk.text;
      },
    })
    .transform(html);
  for (const f of found) f.text = normalize(f.text);
  return found;
}

const meta = (p: Page, key: string) =>
  p.tags.find((t) => t.name === key || t.property === key)?.content;
const links = (p: Page, rel: string) =>
  p.tags.filter((t) => t.rel === rel).map((t) => t.href);

/** Asserts a root-relative or same-site absolute URL is served from the build output. */
async function expectServed(url: string) {
  const { pathname, origin } = new URL(url, profile.siteUrl);
  expect(origin).toBe(profile.siteUrl);
  expect(await file(pathname).exists()).toBe(true);
}

beforeAll(() => {
  outDir = mkdtempSync(join(tmpdir(), 'site-build-'));
  build(outDir);
}, 60_000);

afterAll(() => rmSync(outDir, { recursive: true, force: true }));

describe('start page', () => {
  let home: Page;
  let css: string;
  beforeAll(async () => {
    home = await page('index.html');
    const [href] = links(home, 'stylesheet').filter((h) => h.startsWith('/'));
    expect(href).toBeDefined();
    await expectServed(href);
    css = await file(href).text();
  });

  test('title, description, keywords and canonical describe the site', () => {
    expect(home.text.title).toBe(`${profile.name} — ${profile.title}`);
    expect(meta(home, 'description')).toBe(profile.description);
    expect(meta(home, 'keywords')).toBe(profile.keywords.join(', '));
    expect(links(home, 'canonical')).toEqual([`${profile.siteUrl}/`]);
  });

  test('Open Graph and Twitter cards point at a served absolute image', async () => {
    for (const key of ['og:title', 'twitter:title'])
      expect(meta(home, key)).toBe(home.text.title);
    for (const key of ['og:description', 'twitter:description'])
      expect(meta(home, key)).toBe(profile.description);
    expect(meta(home, 'og:url')).toBe(`${profile.siteUrl}/`);
    expect(meta(home, 'twitter:card')).toBe('summary');

    const image = meta(home, 'og:image')!;
    expect(image).toStartWith(`${profile.siteUrl}/`);
    expect(meta(home, 'twitter:image')).toBe(image);
    await expectServed(image);
  });

  test('rel=me links verify Mastodon, Gravatar and GitHub', () => {
    expect(links(home, 'me').sort()).toEqual(
      [social.mastodon, social.gravatar, social.github].sort(),
    );
  });

  test('SVG favicon, touch icon and manifest are linked and served', async () => {
    const favicon = home.tags.find((t) => t.rel === 'icon');
    expect(favicon?.type).toBe('image/svg+xml');
    for (const href of [
      favicon!.href,
      ...links(home, 'apple-touch-icon'),
      ...links(home, 'manifest'),
    ])
      await expectServed(href);
    expect(links(home, 'apple-touch-icon')).toHaveLength(1);
    expect(links(home, 'manifest')).toHaveLength(1);
  });

  test('manifest is valid JSON whose icons are served', async () => {
    const manifest = await file('manifest.webmanifest').json();
    expect(manifest.start_url).toBe('/');
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) await expectServed(icon.src);
  });

  test('site stylesheet carries the terminal tokens, focus ring and A4 page', async () => {
    expect(css).toContain('@page');
    expect(css).toMatch(/size:\s*A4/);
    expect(css).toContain(':focus-visible');
    const background = css.match(/--color-background:\s*(#[0-9a-f]{6})/i)?.[1];
    expect(background).toBeDefined();

    // Browser chrome and installed-app colors match the page background.
    const manifest = await file('manifest.webmanifest').json();
    for (const color of [
      meta(home, 'theme-color'),
      manifest.theme_color,
      manifest.background_color,
    ])
      expect(color?.toLowerCase()).toBe(background!.toLowerCase());
  });

  test('every class on the built pages has a rule in the stylesheet', async () => {
    // Guards Tailwind's source scanning: a class it never saw ships without CSS.
    const html = home.html + (await file('404.html').text());
    const classes = new Set(
      [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)),
    );
    const hasRule = (name: string) => {
      const selector = `.${name.replace(/[^\w-]/g, '\\$&')}`;
      // Not followed by a name character, so `flex` isn't satisfied by `.flex-col`.
      const pattern = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`${pattern}(?![\\w\\\\-])`).test(css);
    };
    expect(classes.size).toBeGreaterThan(10);
    expect([...classes].filter((name) => !hasRule(name))).toEqual([]);
  });

  test('loads the design fonts and weights from Google Fonts', () => {
    const fonts = links(home, 'stylesheet').find((href) =>
      href.startsWith('https://fonts.googleapis.com/css2'),
    );
    expect(fonts).toBeDefined();
    expect(new URL(fonts!).searchParams.getAll('family')).toEqual([
      'JetBrains Mono:wght@400;500;700',
      'Inter:wght@400;500;600;700',
    ]);
  });

  test('section headings follow the design, in page order', () => {
    expect(each(home.html, 'h2').map((h) => h.text)).toEqual([
      '## about',
      '## git log --career',
      '$ print --format=cv',
      '## connect',
    ]);
  });

  test('about prints both paragraphs, counting leadership years up to the build month', () => {
    // A literal, not `leadershipYears`, so the test doesn't check the code against itself:
    // leadership starts with the "Engineering leadership" skill (2015, i.e. Jan 2015).
    const years = yearsSince(2015, monthOf(new Date()));
    expect(each(home.html, '#about p').map((p) => p.text)).toEqual([
      'I started coding for fun as a teenager — it grew into my main occupation. At 30, after years of autodidact training, I studied Software Engineering at the University of Applied Sciences Upper Austria in Hagenberg.',
      `${years}+ years of leading and supporting engineering teams. Today I build AI agents for production and work hands-on with coding agents in agentic development workflows.`,
    ]);
  });

  test('career timeline lists every job newest first, marking the current one', () => {
    expect(
      each(home.html, '#work li > p:first-of-type').map((p) => p.text),
    ).toEqual([
      'Mar 2025 — present',
      'May 2018 — 6 yrs 10 mos',
      'Jan 2017 — 1 yr 3 mos',
      'Feb 2011 — 5 yrs',
      'Feb 2006 — present',
    ]);
    expect(each(home.html, '#work h3').map((h) => h.text)).toEqual([
      'Head of Engineering · Sitelevel.ai',
      'Principal Software Architect · Bond Vet',
      'Lead Developer · Veho Technologies',
      'Lead Developer · atipso',
      'Freelance · danielholzmann.com',
    ]);
    expect(
      each(home.html, '#work li > p:nth-of-type(2)').map((p) => p.text),
    ).toEqual(jobs.map((job) => job.summary));
    const dots = each(home.html, '#work li > span').map((s) =>
      s.attrs.class.split(' ').includes('bg-accent'),
    );
    expect(dots).toEqual([true, false, false, false, false]);
  });

  test('the print callout’s button is the only script and hides without JavaScript', () => {
    expect(each(home.html, '#cv p').map((p) => p.text)).toEqual([
      'Need a classic CV for HR? Just print this page — a print stylesheet recompiles it into a one-page résumé. No PDF to download: the PDF is a build artifact.',
    ]);
    expect(home.html.match(/onclick=/g)).toEqual(['onclick=']);
    const buttons = each(home.html, 'button');
    expect(buttons).toHaveLength(1);
    const [button] = buttons;
    expect(button.text).toBe('./print-cv');
    expect(button.attrs.onclick).toBe('window.print()');
    // Only the button disappears without JavaScript; the callout text stays.
    expect(each(home.html, '[data-js-only]')).toEqual([button]);
    const head = home.html.slice(0, home.html.indexOf('</head>'));
    expect(head).toMatch(
      /<noscript>\s*<style[^>]*>\s*\[data-js-only\]\s*\{\s*display:\s*none;?\s*\}\s*<\/style>\s*<\/noscript>/,
    );
  });

  test('contact offers mail and the social profiles', () => {
    expect(
      each(home.html, '#contact a').map(({ attrs, text }) => [
        attrs.href,
        text,
      ]),
    ).toEqual([
      [`mailto:${profile.email}`, `${profile.email}_`],
      [social.github, './github'],
      [social.linkedin, './linkedin'],
      [social.mastodon, './mastodon'],
    ]);
  });

  test('every in-page link targets an element on the page', () => {
    const ids = new Set(
      [...home.html.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]),
    );
    const targets = each(home.html, 'a[href^="#"]').map((a) =>
      a.attrs.href.slice(1),
    );
    expect(targets).toEqual(
      expect.arrayContaining(['main', 'top', 'about', 'work', 'contact', 'cv']),
    );
    expect(targets.filter((id) => !ids.has(id))).toEqual([]);
  });

  test('focus order ends with the print button, then the contact links', () => {
    // No tabindex on the page, so Tab follows document order.
    expect(home.html).not.toContain('tabindex');
    // The contact test pins what the #contact links are; here only their place in the order matters.
    expect(each(home.html, 'a, button').slice(-5)).toEqual([
      ...each(home.html, 'button'),
      ...each(home.html, '#contact a'),
    ]);
  });

  test('hero and footer count up to the build month', () => {
    const now = new Date();
    // Career starts with the earliest job (Feb 2006); the current role is the latest ongoing one.
    const years = yearsSince({ year: 2006, month: 2 }, monthOf(now));
    // Compressed HTML drops whitespace between blocks, so check each block's text.
    for (const text of [
      `backed by ${years}+ years of hands-on software engineering.`,
      `exp: ${years}+ years`,
      'now: Head of Engineering @ Sitelevel.ai',
    ])
      expect(home.text['#top']).toContain(text);
    expect(meta(home, 'description')).toContain(`${years}+ years`);
    expect(home.text.footer).toBe(`daniel@portfolio:~$ © ${monthOf(now).year}`);
  });

  test('the first link skips to the main landmark', () => {
    const body = home.html.slice(home.html.indexOf('<body'));
    expect(body.match(/<a [^>]*href="([^"]*)"/)?.[1]).toBe('#main');
    expect(body).toMatch(/<main [^>]*id="main"/);
  });

  test('ships no <script> elements', () => {
    expect(home.html).not.toContain('<script');
  });
});

describe('start page built at a later month', () => {
  let laterDir: string;
  let later: Page;
  beforeAll(async () => {
    laterDir = mkdtempSync(join(tmpdir(), 'site-build-later-'));
    build(laterDir, '2031-07-15T12:00:00Z');
    later = await page('index.html', laterDir);
  }, 60_000);

  afterAll(() => rmSync(laterDir, { recursive: true, force: true }));

  test('every derived number counts up to that month, none is typed in', () => {
    // Jul 2031: career since Feb 2006 = 25 full years, leadership since Jan 2015 = 16.
    for (const text of ['backed by 25+ years', 'exp: 25+ years'])
      expect(later.text['#top']).toContain(text);
    expect(meta(later, 'description')).toContain('25+ years');
    expect(later.text['#about']).toContain('16+ years of leading');
    expect(later.text.footer).toBe('daniel@portfolio:~$ © 2031');
    // Finished jobs keep their length; ongoing ones stay "present".
    expect(
      each(later.html, '#work li > p:first-of-type').map((p) => p.text),
    ).toEqual([
      'Mar 2025 — present',
      'May 2018 — 6 yrs 10 mos',
      'Jan 2017 — 1 yr 3 mos',
      'Feb 2011 — 5 yrs',
      'Feb 2006 — present',
    ]);
  });
});

describe('404 page', () => {
  let notFound: Page;
  beforeAll(async () => {
    notFound = await page('404.html');
  });

  test('shows the terminal error with a placeholder path and a way home', () => {
    expect(notFound.text.title).toBe('404 — page not found');
    // Compressed HTML drops whitespace between blocks, so match the sequence, not the spacing.
    expect(notFound.text.main).toMatch(
      /^\$ cd this-page\s*404\s*error: page_not_found/,
    );
    expect(notFound.text['#requested-path']).toBe('this-page');
    expect(notFound.text.h1).toBe('error: page_not_found');
    expect(notFound.text['main a[href="/"]']).toBe('cd ~');
  });

  test('ships exactly one script, which shows the requested path decoded where valid', () => {
    const scripts = [
      ...notFound.html.matchAll(/<script>([\s\S]*?)<\/script>/g),
    ];
    expect(notFound.html.match(/<script/g)).toHaveLength(1);
    expect(scripts).toHaveLength(1);
    const script = scripts[0][1];
    const shown = (pathname: string) => {
      const el = { textContent: 'this-page' };
      const document = {
        getElementById: (id: string) => (id === 'requested-path' ? el : null),
      };
      new Function('location', 'document', script)({ pathname }, document);
      return el.textContent;
    };
    expect(shown('/%C3%BCber/x')).toBe('/über/x');
    expect(shown('/a%2Fb')).toBe('/a%2Fb');
    expect(shown('/bad%E0%A4%A')).toBe('/bad%E0%A4%A');
  });

  test('is noindex without canonical or og:url, and absent from the sitemap', async () => {
    expect(meta(notFound, 'robots')).toBe('noindex');
    expect(links(notFound, 'canonical')).toEqual([]);
    expect(meta(notFound, 'og:url')).toBeUndefined();
    const sitemap = await file('sitemap-0.xml').text();
    expect(sitemap).toContain(`<loc>${profile.siteUrl}/</loc>`);
    expect(sitemap).not.toContain('404');
  });
});
