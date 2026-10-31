import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { chromium, type Browser } from 'playwright';
import { imageMetadata } from 'astro/assets/utils';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  cappedYears,
  type Month,
  monthOf,
  yearsLabel,
  yearsSince,
} from '../src/lib/experience';
import { points, radar } from '../src/lib/radar';
import { jobs } from '../src/data/jobs';
import { profile, social } from '../src/data/profile';

// Builds the real site and checks what browsers, crawlers and link previews get.

type Tag = Record<string, string>;
/** `html` as built; `screen` and `print` without the elements that medium hides; `text` read from `screen`. */
type Page = {
  html: string;
  screen: string;
  print: string;
  tags: Tag[];
  text: Record<string, string>;
};

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

/**
 * The page as one medium shows it: `html` without the elements that medium hides. Screen drops Tailwind's
 * `hidden`. Print drops `print:hidden`, `hidden` unless `print:block`, `print:inline` or `print:flex` shows it
 * again, and `opacity-0` unless `print:opacity-100` (on screen, `opacity-0` text stays: screen readers get it).
 */
function view(html: string, medium: 'screen' | 'print') {
  return new HTMLRewriter()
    .on('[class]', {
      element(el) {
        const classes = el.getAttribute('class')!.split(/\s+/);
        const has = (name: string | RegExp) =>
          classes.some((c) =>
            typeof name === 'string' ? c === name : name.test(c),
          );
        const hidden =
          medium === 'screen'
            ? has('hidden')
            : has('print:hidden') ||
              (has('hidden') && !has(/^print:(block|inline|flex)$/)) ||
              (has('opacity-0') && !has('print:opacity-100'));
        if (hidden) el.remove();
      },
    })
    .transform(html);
}

/** Parses a built page: every meta/link tag, plus the whitespace-normalized screen text of TEXT_SELECTORS. */
async function page(path: string, dir = outDir): Promise<Page> {
  const html = await file(path, dir).text();
  const screen = view(html, 'screen');
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
  rewriter.transform(screen);
  for (const key in text) text[key] = normalize(text[key]);
  return { html, screen, print: view(html, 'print'), tags, text };
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

const texts = (html: string, selector: string) =>
  each(html, selector).map((m) => m.text);

/** Each skill list item as [name, capped label, detail label, bar style]. */
function skillRows(html: string) {
  const capped = texts(html, '#skills li [data-capped]');
  const detail = texts(html, '#skills li [data-detail]');
  const bars = each(html, '#skills li div[style]').map((m) => m.attrs.style);
  return texts(html, '#skills li > div > span:first-child').map((name, i) => [
    name,
    capped[i],
    detail[i],
    bars[i],
  ]);
}

/** The printed CV's skills as [name, years], in the order print shows them (CSS `order` from `--cv-order`). */
function printedSkills(print: string) {
  const names = texts(print, '#skills li > div > span:first-child');
  const years = texts(print, '#skills li [data-detail]');
  const order = each(print, '#skills li').map(({ attrs }) =>
    Number(attrs.style.match(/--cv-order:\s*(\d+)/)?.[1]),
  );
  expect(order.toSorted((a, b) => a - b)).toEqual(names.map((_, i) => i));
  return names
    .map((name, i) => ({ row: [name, years[i]], at: order[i] }))
    .toSorted((a, b) => a.at - b.at)
    .map(({ row }) => row);
}

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

  test('site stylesheet carries the terminal tokens, focus ring, A4 page and print links', async () => {
    expect(css).toContain('@page');
    expect(css).toMatch(/size:\s*A4/);
    // Keyboard focus: a 2px accent ring on screen.
    expect(css).toMatch(
      /:focus-visible\s*\{[^}]*outline-width:\s*2px[^}]*outline-color:\s*var\(--color-accent\)/,
    );
    // A skill item still focused when printing doesn't put the ring on the CV.
    expect(css).toMatch(
      /@media print\s*\{\s*:focus-visible\s*\{[^}]*outline-style:\s*none/,
    );
    // Printed links are underlined in ink, as in the CV design (the reset strips the underline).
    expect(css).toMatch(
      /@media print\s*\{\s*a\s*\{\s*color:\s*var\(--color-ink\);\s*text-decoration-line:\s*underline/,
    );
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
    expect(texts(home.screen, 'h2')).toEqual([
      '## skills --years',
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
    expect(texts(home.screen, '#about p')).toEqual([
      'I started coding for fun as a teenager — it grew into my main occupation. At 30, after years of autodidact training, I studied Software Engineering at the University of Applied Sciences Upper Austria in Hagenberg.',
      `${years}+ years of leading and supporting engineering teams. Today I build AI agents for production and work hands-on with coding agents in agentic development workflows.`,
    ]);
  });

  test('career timeline lists every job newest first, marking the current one', () => {
    expect(texts(home.screen, '#work li > p:first-of-type')).toEqual([
      'Mar 2025 — present',
      'May 2018 — 6 yrs 10 mos',
      'Jan 2017 — 1 yr 3 mos',
      'Feb 2011 — 5 yrs',
      'Feb 2006 — present',
    ]);
    expect(texts(home.screen, '#work h3')).toEqual([
      'Head of Engineering · Sitelevel.ai',
      'Principal Software Architect · Bond Vet',
      'Lead Developer · Veho Technologies',
      'Lead Developer · atipso',
      'Freelance · danielholzmann.com',
    ]);
    expect(texts(home.screen, '#work li > p:nth-of-type(2)')).toEqual(
      jobs.map((job) => job.summary),
    );
    const dots = each(home.screen, '#work li > span').map((s) =>
      s.attrs.class.split(' ').includes('bg-accent'),
    );
    expect(dots).toEqual([true, false, false, false, false]);
  });

  test('the print callout’s button is the only script and hides without JavaScript', () => {
    expect(texts(home.html, '#cv p')).toEqual([
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

  test('skills list the AI skills first, then the radar order, with capped and detailed years for the build month', () => {
    // Literal starts, so the test doesn't check the code against itself.
    const now = monthOf(new Date());
    const skillYears = (
      [
        ['JavaScript / TypeScript', 2016],
        ['Node.js', 2012],
        ['React', 2016],
        ['Solid.js', 2025],
        ['Rust', 2024],
        ['AI agents', 2024],
        ['Agentic development workflows', { year: 2025, month: 5 }],
        ['Engineering leadership', 2015],
      ] as [string, Month][]
    ).map(([name, start]) => [name, yearsSince(start, now)] as const);
    // List order: AI agents and Agentic lead; the rest follow the radar.
    const listOrder = [5, 6, 0, 1, 2, 3, 4, 7];
    expect(skillRows(home.screen)).toEqual(
      listOrder.map((i) => {
        const [name, years] = skillYears[i];
        return [
          name,
          yearsLabel(years, 5),
          yearsLabel(years, 10),
          `width: ${(Math.min(years, 5) / 5) * 100}%`,
        ];
      }),
    );
    const [radarImage] = each(home.html, '#skills svg');
    expect(radarImage.attrs.role).toBe('img');
    expect(radarImage.attrs['aria-label']).toBe(
      `Skill radar, years of experience capped at 5+: ${skillYears
        .map(([name, years]) => `${name} ${cappedYears(years, 5)}`)
        .join(', ')}`,
    );
    // Built polygon and vertex dots sit where the (design-checked) geometry puts these years.
    const vertices = radar(
      skillYears.map(([, years]) => ({ label: ['x'] as const, years })),
    ).vertices;
    expect(
      each(home.html, '#skills svg > polygon').map((p) => p.attrs.points),
    ).toEqual([points(vertices)]);
    expect(
      each(home.html, '#skills circle').map(({ attrs }) => ({
        x: Number(attrs.cx),
        y: Number(attrs.cy),
      })),
    ).toEqual([...vertices]);
    // Screen readers get the detailed value only: per item, just the capped label and the bar are hidden.
    expect(
      each(home.html, '#skills [aria-hidden]').map(({ attrs, text }) =>
        'data-capped' in attrs ? 'capped' : text || 'bar',
      ),
    ).toEqual(skillYears.flatMap(() => ['capped', 'bar']));
    for (const span of each(home.html, '#skills [data-detail]'))
      expect(span.attrs.class).not.toMatch(/\b(hidden|sr-only|invisible)\b/);
  });

  test('radar rings, ring labels and axis labels land on the design coordinates', () => {
    // Rings depend on the axis count only; radar.test.ts pins them against the design.
    const eightAxes = Array.from({ length: 8 }, () => ({
      label: ['x'] as const,
      years: 0,
    }));
    expect(
      each(home.html, '#skills svg > g > polygon').map((p) => p.attrs.points),
    ).toEqual(radar(eightAxes).rings.map(points));
    expect(
      each(home.html, '#skills svg text')
        .filter((t) => !('data-skill' in t.attrs))
        .map((t) => `${t.attrs.x},${t.attrs.y} ${t.text}`),
    ).toEqual([
      '208,165 1y',
      '208,133 2y',
      '208,101 3y',
      '208,69 4y',
      '208,37 5+',
    ]);
    expect(
      each(home.html, '#skills svg text[data-skill]').map(
        (t) => t.attrs['text-anchor'],
      ),
    ).toEqual([
      'middle',
      'start',
      'start',
      'start',
      'middle',
      'end',
      'end',
      'end',
    ]);
    // design/danielholzmann-terminal.html: one entry per label line.
    expect(
      each(home.html, '#skills svg tspan').map(
        (t) => `${t.attrs.x},${t.attrs.y} ${t.text}`,
      ),
    ).toEqual([
      '200,22 JavaScript / TypeScript',
      '326,74 Node.js',
      '378,205 React',
      '326,340 Solid.js',
      '200,394 Rust',
      '74,340 AI agents',
      '22,196 Agentic development',
      '22,215 workflows',
      '74,64 Engineering',
      '74,83 leadership',
    ]);
  });

  test('each skill’s list item, radar label, spoke and dot are linked by the head highlight rules', () => {
    const items = each(home.html, '#skills li');
    const indices = items.map((li) => li.attrs['data-skill']);
    expect(indices.toSorted()).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
    ]);
    // Each list item pairs with the radar label of the same skill, whatever the list order.
    const labels = each(home.html, '#skills svg text[data-skill]');
    const names = skillRows(home.screen).map(([name]) => name);
    expect(
      indices.map((i) =>
        labels
          .find((t) => t.attrs['data-skill'] === i)
          ?.text.replace(/\s/g, ''),
      ),
    ).toEqual(names.map((name) => name.replace(/\s/g, '')));
    for (const i of indices)
      for (const tag of ['li', 'text', 'line', 'circle'])
        expect(
          each(home.html, `#skills ${tag}[data-skill="${i}"]`),
        ).toHaveLength(1);
    const head = home.html.slice(0, home.html.indexOf('</head>'));
    const style = [...head.matchAll(/<style>([^<]*)<\/style>/g)]
      .map((m) => m[1])
      .find((css) => css.includes(':has('));
    // Hovering an item or label, or keyboard focus on an item (not a mouse click: :focus-visible),
    // lights that skill's label, spoke and dot and swaps its list item to the detail.
    const active = indices
      .toSorted()
      .map(
        (i) =>
          `#skills:has(:is(li,text)[data-skill="${i}"]:is(:hover,:focus-visible)) [data-skill="${i}"]`,
      )
      .join(',');
    expect(style).toBe(
      `text:is(${active}){fill:var(--color-accent)}` +
        `line:is(${active}){stroke:var(--color-accent)}` +
        `circle:is(${active}){opacity:1}` +
        `li:is(${active}) [data-capped]{opacity:0}` +
        `li:is(${active}) [data-detail]{opacity:1}`,
    );
    // The per-item fallback reveals on keyboard focus only, too.
    expect(home.html).not.toContain('group-focus:');
  });

  test('focus order follows the page: skip link, header (logo, nav), each skill item, print button, contact links', () => {
    // Only skill items carry tabindex, so Tab follows document order; the radar is not focusable.
    const skillItems = each(home.screen, '#skills li');
    expect(each(home.html, '[tabindex]').map((e) => e.attrs)).toEqual(
      skillItems.map((li) => li.attrs),
    );
    expect(skillItems.every((li) => li.attrs.tabindex === '0')).toBe(true);
    // The contact test pins what the #contact links are; here only their place in the order matters.
    // Print-only links (the CV contact) are display: none on screen, so they never take focus.
    expect(each(home.screen, 'a, button, [tabindex]')).toEqual([
      ...each(home.screen, 'a[href="#main"]'),
      ...each(home.screen, 'header a'),
      ...skillItems,
      ...each(home.screen, 'button'),
      ...each(home.screen, '#contact a'),
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

  describe('printed CV (the start page in print)', () => {
    test('one DOM for both media: one h1 and one skills section; the degree is in the printed h1 only', () => {
      expect(home.html.match(/<h1[\s>]/g)).toHaveLength(1);
      expect(home.html.match(/\sid="skills"/g)).toHaveLength(1);
      expect(texts(home.screen, 'h1')).toEqual(['Daniel Holzmann']);
      expect(texts(home.print, 'h1')).toEqual(['Daniel Holzmann, BSc']);
      for (const title of [
        home.text.title,
        meta(home, 'og:title'),
        meta(home, 'twitter:title'),
      ])
        expect(title).not.toContain('BSc');
    });

    test('header: photo, kicker, name and title, without the hero’s tagline and chips', () => {
      expect(texts(home.print, '#top p')).toEqual([
        '~/daniel_ · curriculum vitae',
        'AI Engineer & Full-Stack Developer',
      ]);
      // The screen kicker and the chips are gone (the tagline is excluded by the list above).
      for (const chip of ['location:', 'exp:', 'now:', 'whoami'])
        expect(texts(home.print, '#top').join()).not.toContain(chip);
      // On screen: the hero's kicker and tagline, without the CV's kicker or title line.
      expect(texts(home.screen, '#top p')).toEqual([
        '$ whoami',
        `${profile.title}. I build production-grade AI agents and ship software with agentic development workflows — coding agents, backed by ${yearsSince({ year: 2006, month: 2 }, monthOf(new Date()))}+ years of hands-on software engineering.`,
      ]);
    });

    test('the photo prints from crops of at most 3x the 112×140 box and never shows on screen', async () => {
      const images = each(home.html, 'img');
      expect(images).toHaveLength(1);
      expect(each(home.screen, 'img')).toEqual([]);
      expect(each(home.print, 'img')).toEqual(images);
      const [{ attrs }] = images;
      expect(attrs.alt).toBe(`Portrait of ${profile.name}`);
      // Hidden on screen, so it must not wait for scrolling into view to be there when printing.
      expect(attrs.loading).toBe('eager');
      expect([attrs.width, attrs.height]).toEqual(['112', '140']);
      const candidates = attrs.srcset
        .split(',')
        .map((c) => c.trim().split(/\s+/));
      // The 1200×1600 portrait fills the box three times over.
      expect(candidates.map(([, density]) => density)).toEqual([
        '1x',
        '2x',
        '3x',
      ]);
      for (const [url, density] of candidates) {
        await expectServed(url);
        const scale = Number.parseInt(density);
        const { width, height, format } = await imageMetadata(
          await file(url).bytes(),
        );
        expect({ width, height, format }).toEqual({
          width: 112 * scale,
          height: 140 * scale,
          format: 'webp',
        });
      }
    });

    test('sections in print order: aside (contact, skills, education), then profile and experience', () => {
      expect(texts(home.print, 'h2')).toEqual([
        '## contact',
        '## skills',
        '## education',
        '## profile',
        '## experience',
      ]);
    });

    test('contact lists the location, then mail, site, LinkedIn and GitHub as bare links', () => {
      expect(texts(home.print, '#cv-contact p')).toEqual([
        'Vienna, Austria',
        'daniel@danielholzmann.com',
        'danielholzmann.com',
        'linkedin.com/in/daniel-holzmann-bb35235b',
        'github.com/dVelopment',
      ]);
      expect(
        each(home.print, '#cv-contact a').map(({ attrs }) => attrs.href),
      ).toEqual([
        `mailto:${profile.email}`,
        profile.siteUrl,
        social.linkedin,
        social.github,
      ]);
    });

    test('skills in CV order with years capped at 10, then the note', () => {
      const now = monthOf(new Date());
      expect(printedSkills(home.print)).toEqual(
        (
          [
            ['Agentic dev workflows', { year: 2025, month: 5 }],
            ['AI agents', 2024],
            ['Rust', 2024],
            ['JavaScript / TypeScript', 2016],
            ['Engineering leadership', 2015],
            ['Solid.js', 2025],
            ['React', 2016],
            ['Node.js', 2012],
          ] as [string, Month][]
        ).map(([name, start]) => [
          name,
          yearsLabel(yearsSince(start, now), 10),
        ]),
      );
      expect(texts(home.print, '#skills p')).toEqual([
        'Years of hands-on experience',
      ]);
      expect(texts(home.screen, '#skills p')).toEqual([
        'scale: years of hands-on experience · max 5+',
      ]);
      // Print really reorders: every item carries the print variant that turns its --cv-order into `order`.
      expect(
        each(home.html, '#skills li').every(({ attrs }) =>
          attrs.class.split(' ').includes('print:order-(--cv-order)'),
        ),
      ).toBe(true);
      expect(css).toMatch(
        /\.print\\:order-\\\(--cv-order\\\)\s*\{\s*order:\s*var\(--cv-order\)/,
      );
    });

    test('education prints title, school and period · degree; no languages section while unset', () => {
      expect(texts(home.print, '#cv-education p')).toEqual([
        'Software Engineering',
        'University of Applied Sciences Upper Austria, Hagenberg',
        '2011 — 2015 · BSc in Engineering',
      ]);
      expect(each(home.html, '#cv-languages')).toEqual([]);
      expect(home.html).not.toMatch(/\[(YEAR|DEGREE|LANGUAGES)\]/);
    });

    test('profile counts exact career and leadership years up to the build month', () => {
      const now = monthOf(new Date());
      const career = yearsSince({ year: 2006, month: 2 }, now);
      const leadership = yearsSince(2015, now);
      expect(texts(home.print, '#about p')).toEqual([
        `Developer, AI engineer and engineering leader with ${career}+ years of hands-on software engineering and ${leadership}+ years of leading and supporting engineering teams. I build production-grade AI agents and ship software with agentic development workflows: coding agents take on much of the implementation, and I step in myself wherever it counts — architecture, the tricky parts, review, and the call on what goes to production.`,
      ]);
    });

    test('experience lists role · company, numeric month ranges and the CV summaries', () => {
      expect(texts(home.print, '#work h3')).toEqual([
        'Head of Engineering · Sitelevel.ai',
        'Principal Software Architect · Bond Vet',
        'Lead Developer · Veho Technologies',
        'Lead Developer · atipso',
        'Freelance Web Developer · danielholzmann.com',
      ]);
      expect(texts(home.print, '#work li > p:first-of-type')).toEqual([
        '03/2025 — present',
        '05/2018 — 02/2025',
        '01/2017 — 03/2018',
        '02/2011 — 01/2016',
        '02/2006 — present',
      ]);
      expect(texts(home.print, '#work li > p:nth-of-type(2)')).toEqual([
        'Leading and supporting the engineering team; building production-grade AI agents and agentic workflows.',
        'Led the engineering team; responsible for all in-house and client-facing websites and apps.',
        'Development of web, Android and iOS apps.',
        'Consultant and technical lead as a freelancer.',
        'Web development, specialized in React and Node.js.',
      ]);
    });

    test('footer prints the CV lines instead of the prompt', () => {
      expect(texts(home.print, 'footer span')).toEqual([
        '$ print danielholzmann.com --format=cv',
        'always current at danielholzmann.com',
      ]);
    });

    test('screen-only parts are left off: skip link, header nav, radar, bars, timeline dots, print callout and its button, screen contact', () => {
      for (const screenOnly of [
        'a[href="#main"]',
        'header',
        '#skills svg',
        '#skills [aria-hidden]',
        '#work li > span',
        '#cv',
        'button',
        '#contact',
      ]) {
        // Each selector matches the built page, so its absence in print means something.
        expect(each(home.html, screenOnly)).not.toEqual([]);
        expect(each(home.print, screenOnly)).toEqual([]);
      }
    });
  });
});

describe('printed CV in Chromium (Playwright)', () => {
  let server: Bun.Server<undefined>;
  let browser: Browser;
  beforeAll(async () => {
    server = Bun.serve({
      port: 0,
      async fetch(req) {
        const { pathname } = new URL(req.url);
        const served = file(
          pathname.endsWith('/') ? `${pathname}index.html` : pathname,
        );
        return (await served.exists())
          ? new Response(served)
          : new Response('not found', { status: 404 });
      },
    });
    browser = await chromium.launch();
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
    server?.stop(true);
  });

  /** The start page in print media, with the web fonts loaded so line breaks match a real print. */
  async function printPage() {
    const page = await browser.newPage({
      viewport: { width: 794, height: 1123 },
    });
    await page.emulateMedia({ media: 'print' });
    await page.goto(server.url.href, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    return page;
  }

  test('the CV fits its A4 canvas: nothing overflows the page or its box', async () => {
    const page = await printPage();
    const { scrollHeight, overflowing } = await page.evaluate(() => {
      const canvas = document.querySelector('.page')!;
      const bottom = canvas.getBoundingClientRect().bottom;
      return {
        scrollHeight: canvas.scrollHeight,
        // Visible elements reaching past the canvas, or layout boxes whose content spills out of them:
        // the columns shrink to the space above the footer, so a column grown too long overflows itself
        // first. Text elements are left out: a tight line height lets glyphs overhang by design.
        overflowing: [...canvas.querySelectorAll('*')]
          .filter((el) => {
            if (!el.checkVisibility()) return false;
            const spills =
              el.matches('div, section, ol, ul, li, footer') &&
              getComputedStyle(el).display !== 'contents' &&
              el.scrollHeight > el.clientHeight + 1;
            return spills || el.getBoundingClientRect().bottom > bottom + 0.5;
          })
          .map((el) => el.outerHTML.slice(0, 80)),
      };
    });
    expect(overflowing).toEqual([]);
    expect(scrollHeight).toBeLessThanOrEqual(1123);
    await page.close();
  });

  test('printing gives exactly one A4 page', async () => {
    const page = await printPage();
    const pdf = new TextDecoder('latin1').decode(
      await page.pdf({ preferCSSPageSize: true, printBackground: true }),
    );
    expect(pdf.match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
    // A4 in PDF points is 595.28 × 841.89; Chromium rounds the box to whole CSS pixels.
    const [width, height] = pdf
      .match(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/)!
      .slice(1)
      .map(Number);
    expect(width).toBeCloseTo(595.28, 0);
    expect(height).toBeCloseTo(841.89, 0);
    await page.close();
  });
});

describe('start page built at a later month', () => {
  let laterDir: string;
  let later: Page;
  beforeAll(async () => {
    laterDir = mkdtempSync(join(tmpdir(), 'site-build-later-'));
    build(laterDir, '2029-07-15T12:00:00Z');
    later = await page('index.html', laterDir);
  }, 60_000);

  afterAll(() => rmSync(laterDir, { recursive: true, force: true }));

  test('every derived number counts up to that month, none is typed in', () => {
    // Jul 2029: career since Feb 2006 = 23 full years, leadership since Jan 2015 = 14.
    for (const text of ['backed by 23+ years', 'exp: 23+ years'])
      expect(later.text['#top']).toContain(text);
    expect(meta(later, 'description')).toContain('23+ years');
    expect(later.text['#about']).toContain('14+ years of leading');
    expect(later.text.footer).toBe('daniel@portfolio:~$ © 2029');
    // Finished jobs keep their length; ongoing ones stay "present".
    expect(texts(later.screen, '#work li > p:first-of-type')).toEqual([
      'Mar 2025 — present',
      'May 2018 — 6 yrs 10 mos',
      'Jan 2017 — 1 yr 3 mos',
      'Feb 2011 — 5 yrs',
      'Feb 2006 — present',
    ]);
    // Skills pass their caps at different months; between them the detail is exact. Bars and radar stop at 5.
    expect(skillRows(later.screen)).toEqual([
      ['AI agents', '5+ yrs', '5 yrs', 'width: 100%'],
      ['Agentic development workflows', '4 yrs', '4 yrs', 'width: 80%'],
      ['JavaScript / TypeScript', '5+ yrs', '10+ yrs', 'width: 100%'],
      ['Node.js', '5+ yrs', '10+ yrs', 'width: 100%'],
      ['React', '5+ yrs', '10+ yrs', 'width: 100%'],
      ['Solid.js', '4 yrs', '4 yrs', 'width: 80%'],
      ['Rust', '5+ yrs', '5 yrs', 'width: 100%'],
      ['Engineering leadership', '5+ yrs', '10+ yrs', 'width: 100%'],
    ]);
    // Vertices on ring 4 for Solid.js and Agentic, on the outer ring for the rest; dots on the vertices.
    const polygon =
      '200,40 313.1,86.9 360,200 290.5,290.5 200,360 86.9,313.1 72,200 86.9,86.9';
    expect(
      each(later.html, '#skills svg > polygon').map((p) => p.attrs.points),
    ).toEqual([polygon]);
    expect(
      each(later.html, '#skills circle')
        .map(({ attrs }) => `${attrs.cx},${attrs.cy}`)
        .join(' '),
    ).toBe(polygon);
  });

  test('the printed CV counts up to that month too', () => {
    expect(texts(later.print, '#about p')[0]).toStartWith(
      'Developer, AI engineer and engineering leader with 23+ years of hands-on software engineering and 14+ years of leading',
    );
    // Under 10 years shows exactly; JS/TS, leadership, React and Node.js passed the 10 cap.
    expect(printedSkills(later.print)).toEqual([
      ['Agentic dev workflows', '4 yrs'],
      ['AI agents', '5 yrs'],
      ['Rust', '5 yrs'],
      ['JavaScript / TypeScript', '10+ yrs'],
      ['Engineering leadership', '10+ yrs'],
      ['Solid.js', '4 yrs'],
      ['React', '10+ yrs'],
      ['Node.js', '10+ yrs'],
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
