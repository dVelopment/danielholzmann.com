import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { chromium, type Browser } from 'playwright';
import { imageMetadata } from 'astro/assets/utils';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  type Month,
  monthOf,
  yearsLabel,
  yearsSince,
} from '../src/lib/experience';
import { points, radar } from '../src/lib/radar';
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
 * `hidden`. Print drops `print:hidden`, and `hidden` unless `print:block`, `print:inline` or `print:flex` shows it
 * again.
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
              (has('hidden') && !has(/^print:(block|inline|flex)$/));
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

/**
 * The agreed skills in list order: name, CV name, skill level, start and, for a skill no longer in use, end.
 * Literals, so the tests don't check the code against itself.
 */
const SKILLS: [string, string, number, Month, Month?][] = [
  ['AI agents', 'AI agents', 4, 2024],
  [
    'Agentic development workflows',
    'Agentic dev workflows',
    4,
    { year: 2025, month: 5 },
  ],
  ['JavaScript / TypeScript', 'JavaScript / TypeScript', 5, 2016],
  ['Node.js', 'Node.js', 5, 2012],
  ['System integration', 'System integration', 5, 2006],
  ['Rust', 'Rust', 4, 2024],
  ['Engineering leadership', 'Engineering leadership', 4, 2015],
  ['React', 'React', 4, 2016],
  ['Solid.js', 'Solid.js', 3, 2025],
  ['Python', 'Python', 1, 2011, 2014],
];
/** Each skill's whole years of experience at the build month, or up to its end. */
const BUILD_YEARS = SKILLS.map(([, , , start, end]) =>
  yearsSince(start, end ?? monthOf(new Date())),
);
/** Each skill's experience label at the build month, capped at 10. */
const BUILD_EXPERIENCE = BUILD_YEARS.map((years) => yearsLabel(years, 10));
/** Data polygon of the levels in radar order (JS/TS 5, Node.js 5, React 4, Solid.js 3, Python 1, System integration 5, Rust 4, AI agents 4, Agentic 4, leadership 4). */
const LEVEL_POLYGON =
  '200,40 294,70.6 321.7,160.4 291.3,229.7 218.8,225.9 200,360 124.8,303.6 78.3,239.6 78.3,160.4 124.8,96.4';

const NAMES = '#skills li > div > span:first-child';

/** Each skill list item as [name, experience label, bar style]. */
function skillRows(html: string) {
  const experience = texts(html, '#skills li [data-experience]');
  const bars = each(html, '#skills li div[style]').map((m) => m.attrs.style);
  return texts(html, NAMES).map((name, i) => [name, experience[i], bars[i]]);
}

/** The printed CV's skills as [name, years], in document order: print doesn't reorder them. */
function printedSkills(print: string) {
  return skillRows(print).map(([name, experience]) => [name, experience]);
}

/** The radar's data polygon and its vertex dots, each as an SVG points string. */
function radarShape(html: string) {
  return {
    polygon: each(html, '#skills svg > polygon').map((p) => p.attrs.points),
    dots: each(html, '#skills circle')
      .map(({ attrs }) => `${attrs.cx},${attrs.cy}`)
      .join(' '),
  };
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
      '## skills --level',
      '## about',
      '## git log --career',
      '$ print --format=cv',
      '## connect',
    ]);
  });

  test('about prints both paragraphs, leadership years in whole decades', () => {
    expect(texts(home.screen, '#about p')).toEqual([
      'I started coding for fun as a teenager — it grew into my main occupation. At 30, after years of autodidact training, I studied Software Engineering at the University of Applied Sciences Upper Austria in Hagenberg.',
      '10+ years of leading and supporting engineering teams — always hands-on, always writing code myself. Today I build AI agents and agentic workflows for production and connect them with modern web apps and (legacy) systems. I help teams put coding agents to productive use without compromising on code quality.',
      "At heart, I'm still a tinkerer.",
    ]);
  });

  /** Each job's summary, the same on screen and in print. */
  const SUMMARIES = [
    'Founding engineer; leading engineering hands-on: production-ready AI agents and agentic workflows with evals, guardrails and traceability, e.g. reasoning over financial reports traced to source data. In pilot with design partners on real ERP data; ERP integrations, CI, DevOps, DX.',
    'Founding engineer; led engineering hands-on for all websites and apps on the PIMS; LLM-based classification of NPS feedback; financial/KPI data warehouse; CI, DevOps, DX.',
    'Founding engineer; web, Android and iOS apps with route planning.',
    'Consultant and technical lead as a freelancer.',
    'Web development, specialized in React and Node.js.',
  ];

  /** Each job's stack line, the same on screen and in print. */
  const STACKS = [
    'stack: Mastra · TypeScript · Rust · MCP · tool calling · RAG · guardrails · evals · GraphQL · webhooks · OAuth/OIDC · RBAC · Postgres · Docker · GitHub Actions',
    'stack: TypeScript · Node.js · GraphQL · webhooks · MongoDB · BigQuery · AWS · GCP · CircleCI',
    'stack: TypeScript · Node.js · GraphQL · webhooks · Google Maps SDK · CircleCI',
    'stack: PHP · JavaScript · Node.js · Meteor · MongoDB · webhooks · Travis CI',
    'stack: TypeScript · Node.js · Bun · PHP · Python · MongoDB · Postgres · MariaDB · Docker',
  ];

  test('career timeline lists every job newest first, marking the current one', () => {
    expect(texts(home.screen, '#work li > p:first-of-type')).toEqual([
      'Mar 2025 — present',
      'May 2018 — 6 yrs 10 mos',
      'Jan 2017 — 1 yr 3 mos',
      'Jan 2011 — 5 yrs 2 mos',
      'Feb 2006 — 11 yrs',
    ]);
    expect(texts(home.screen, '#work h3')).toEqual([
      'Head of Engineering · Sitelevel.ai',
      'Principal Software Architect · Bond Vet',
      'Lead Developer · Veho Technologies',
      'Lead Developer · atipso',
      'Freelance · danielholzmann.com',
    ]);
    expect(texts(home.screen, '#work li > p:nth-of-type(2)')).toEqual(
      SUMMARIES,
    );
    expect(texts(home.screen, '#work li > p:nth-of-type(3)')).toEqual(STACKS);
    const dots = each(home.screen, '#work li > span').map((s) =>
      s.attrs.class.split(' ').includes('bg-accent'),
    );
    expect(dots).toEqual([true, false, false, false, false]);
  });

  test('the print callout’s button is the only script and hides without JavaScript', () => {
    expect(texts(home.html, '#cv p')).toEqual([
      'Need a classic CV for HR? Just print this page — a print stylesheet recompiles it into a one-page résumé.',
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
    // A bare `#` is the document's top (the section nav's `↑ top`), not an element.
    expect(targets.filter((id) => id && !ids.has(id))).toEqual([]);
  });

  test('skills list in the agreed order with years and experience bars for the build month', () => {
    expect(skillRows(home.screen)).toEqual(
      SKILLS.map(([name], i) => [
        name,
        BUILD_EXPERIENCE[i],
        `width: ${Math.min(BUILD_YEARS[i], 10) * 10}%`,
      ]),
    );
    const [radarImage] = each(home.html, '#skills svg');
    expect(radarImage.attrs.role).toBe('img');
    // HTMLRewriter lowercases attribute names.
    expect(radarImage.attrs.viewbox).toBe('-170 0 640 410');
    expect(radarImage.attrs['aria-label']).toBe(
      'Skill radar, skill level out of 5: JavaScript / TypeScript 5, Node.js 5, React 4, Solid.js 3, Python 1, System integration 5, Rust 4, AI agents 4, Agentic development workflows 4, Engineering leadership 4',
    );
    expect(texts(home.screen, '#skills p > span')).toEqual([
      'radar: skill level · 1–5',
      'bars: years of experience',
    ]);
    // Polygon and vertex dots sit on the ring of each level.
    expect(radarShape(home.html)).toEqual({
      polygon: [LEVEL_POLYGON],
      dots: LEVEL_POLYGON,
    });
    // Screen readers skip the bar, and hear name, skill level and experience instead.
    expect(
      each(home.html, '#skills [aria-hidden]').map(({ text }) => text || 'bar'),
    ).toEqual(SKILLS.map(() => 'bar'));
    const spoken = new HTMLRewriter()
      .on('[aria-hidden="true"]', {
        element(el) {
          el.remove();
        },
      })
      .transform(home.screen);
    expect(texts(spoken, '#skills li')).toEqual(
      SKILLS.map(
        ([name, , level], i) =>
          `${name} skill level ${level} of 5, ${BUILD_EXPERIENCE[i]}`,
      ),
    );
    for (const span of each(home.html, '#skills [data-experience]'))
      expect(span.attrs.class).not.toMatch(/\b(hidden|sr-only|invisible)\b/);
  });

  test('radar rings, ring labels and axis labels land on the coordinates computed from the design geometry', () => {
    // Rings depend on the axis count only; radar.test.ts pins them against the design.
    const tenAxes = Array.from({ length: 10 }, () => ({
      label: ['x'] as const,
      value: 0,
    }));
    expect(
      each(home.html, '#skills svg > g > polygon').map((p) => p.attrs.points),
    ).toEqual(radar(tenAxes).rings.map(points));
    expect(
      each(home.html, '#skills svg text')
        .filter((t) => !('data-skill' in t.attrs))
        .map((t) => `${t.attrs.x},${t.attrs.y} ${t.text}`),
    ).toEqual(['208,165 1', '208,133 2', '208,101 3', '208,69 4', '208,37 5']);
    expect(
      each(home.html, '#skills svg text[data-skill]').map(
        (t) => t.attrs['text-anchor'],
      ),
    ).toEqual([
      'middle',
      'start',
      'start',
      'start',
      'start',
      'middle',
      'end',
      'end',
      'end',
      'end',
    ]);
    // 10 axes: computed from the design's radius and drops; Python after Solid.js.
    expect(
      each(home.html, '#skills svg tspan').map(
        (t) => `${t.attrs.x},${t.attrs.y} ${t.text}`,
      ),
    ).toEqual([
      '200,22 JavaScript / TypeScript',
      '305,56 Node.js',
      '369,145 React',
      '369,269 Solid.js',
      '305,358 Python',
      '200,385 System',
      '200,404 integration',
      '95,358 Rust',
      '31,269 AI agents',
      '31,135 Agentic development',
      '31,154 workflows',
      '95,46 Engineering',
      '95,65 leadership',
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
      '8',
      '9',
    ]);
    // Each list item pairs with the radar label of the same skill, whatever the list order.
    const labels = each(home.html, '#skills svg text[data-skill]');
    const names = texts(home.screen, NAMES);
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
    // Each index's dot sits on that axis's level vertex and its spoke ends on that axis's outer ring.
    const vertices = LEVEL_POLYGON.split(' ');
    const spokeEnds =
      '200,40 294,70.6 352.2,150.6 352.2,249.4 294,329.4 200,360 106,329.4 47.8,249.4 47.8,150.6 106,70.6'.split(
        ' ',
      );
    for (const i of indices) {
      const [dot] = each(home.html, `#skills circle[data-skill="${i}"]`);
      const [spoke] = each(home.html, `#skills line[data-skill="${i}"]`);
      expect(`${dot.attrs.cx},${dot.attrs.cy}`).toBe(vertices[Number(i)]);
      expect(`${spoke.attrs.x2},${spoke.attrs.y2}`).toBe(spokeEnds[Number(i)]);
    }
    const head = home.html.slice(0, home.html.indexOf('</head>'));
    const style = [...head.matchAll(/<style>([^<]*)<\/style>/g)]
      .map((m) => m[1])
      .find((css) => css.includes(':has('));
    // Hovering an item or label, or keyboard focus on an item (not a mouse click: :focus-visible),
    // lights that skill's label, spoke and dot and turns its list item's years accent.
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
        `li:is(${active}) [data-experience]{color:var(--color-accent)}`,
    );
    // The per-item fallback lights on keyboard focus only, too.
    expect(home.html).not.toContain('group-focus:');
  });

  test('focus order follows the page: skip link, header (logo, nav), each skill item, print button, contact links, section nav', () => {
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
      ...each(home.screen, 'nav[aria-label="Sections"] a'),
    ]);
  });

  test('hero and footer count up to the build month, career in whole decades', () => {
    const now = new Date();
    // Career starts with the earliest job (Feb 2006): 20 full years from Feb 2026 until Feb 2036.
    // Compressed HTML drops whitespace between blocks, so check each block's text.
    for (const text of [
      'backed by 20+ years of hands-on software engineering.',
      'exp: 20+ years',
      'now: Head of Engineering @ Sitelevel.ai',
    ])
      expect(home.text['#top']).toContain(text);
    expect(meta(home, 'description')).toContain('20+ years');
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
        `${profile.title}. I build production-ready AI agents and ship software with agentic development workflows — coding agents, backed by 20+ years of hands-on software engineering.`,
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

    test('sections in print order: aside (contact, skills, education, languages), then profile and experience', () => {
      expect(texts(home.print, 'h2')).toEqual([
        '## contact',
        '## skills',
        '## education',
        '## languages',
        '## profile',
        '## main experience',
      ]);
    });

    test('contact lists the location, then mail, phone, site, LinkedIn and GitHub as bare links, each with a decorative icon', () => {
      expect(texts(home.print, '#cv-contact p')).toEqual([
        'Vienna, Austria',
        'daniel@danielholzmann.com',
        '+43 699 / 1749 1000',
        'danielholzmann.com',
        'linkedin.com/in/daniel-holzmann-bb35235b',
        'github.com/dVelopment',
      ]);
      expect(
        each(home.print, '#cv-contact a').map(({ attrs }) => attrs.href),
      ).toEqual([
        `mailto:${profile.email}`,
        'tel:+4369917491000',
        profile.siteUrl,
        social.linkedin,
        social.github,
      ]);
      const icons = each(home.print, '#cv-contact p > svg');
      expect(icons).toHaveLength(6);
      for (const { attrs } of icons) expect(attrs['aria-hidden']).toBe('true');
    });

    test('skills in the screen order with years capped at 10, then the note', () => {
      expect(printedSkills(home.print)).toEqual(
        SKILLS.map(([, cvName], i) => [cvName, BUILD_EXPERIENCE[i]]),
      );
      expect(texts(home.print, '#skills p')).toEqual([
        'Ordered by focus · years of hands-on experience',
      ]);
      // Print keeps the DOM order: no item is reordered with CSS `order`.
      for (const { attrs } of each(home.html, '#skills li')) {
        expect(attrs.style).toBeUndefined();
        expect(attrs.class).not.toMatch(/(^|\s)(print:)?order-/);
      }
    });

    test('education prints title, school and period · degree, then the languages', () => {
      expect(texts(home.print, '#cv-education p')).toEqual([
        'Software Engineering',
        'University of Applied Sciences Upper Austria, Hagenberg',
        '2011 — 2015 · BSc in Engineering',
      ]);
      expect(texts(home.print, '#cv-languages p')).toEqual([
        'German (native), English (business fluent)',
      ]);
      expect(home.html).not.toMatch(/\[(YEAR|DEGREE|LANGUAGES)\]/);
    });

    test('profile words career and leadership years in whole decades', () => {
      expect(texts(home.print, '#about p')).toEqual([
        "AI engineer building production-ready agents and agentic workflows that solve real problems. This is backed by over two decades of hands-on full-stack engineering. Through more than 10 years of leading engineering teams, I have always kept writing code myself. I like to get the most out of what's already there: connecting agents, modern web apps and legacy systems. I help teams put coding agents to productive use without compromising on code quality, while staying in control: writing code where it matters, set the architecture, review, and decide what goes to production.",
      ]);
    });

    test('experience lists role · company, numeric month ranges, the summaries and the stacks', () => {
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
        '01/2011 — 02/2016',
        '02/2006 — 01/2017',
      ]);
      expect(texts(home.print, '#work li > p:nth-of-type(2)')).toEqual(
        SUMMARIES,
      );
      expect(texts(home.print, '#work li > p:nth-of-type(3)')).toEqual(STACKS);
    });

    test('footer prints the CV lines instead of the prompt', () => {
      expect(texts(home.print, 'footer span')).toEqual([
        '$ print danielholzmann.com --format=cv',
        'always current at danielholzmann.com',
      ]);
    });

    test('screen-only parts are left off: skip link, header nav, section nav, radar, bars, timeline dots, print callout and its button, screen contact', () => {
      for (const screenOnly of [
        'a[href="#main"]',
        'header',
        'nav[aria-label="Sections"]',
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

describe('the start page in Chromium (Playwright)', () => {
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

  /** The start page in a medium, with the web fonts loaded so text measures as it renders. */
  async function openPage(
    media: 'screen' | 'print',
    viewport = { width: 794, height: 1123 },
  ) {
    const page = await browser.newPage({ viewport });
    await page.emulateMedia({ media });
    await page.goto(server.url.href, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    return page;
  }

  const PHONE = { width: 390, height: 844 };
  const DESKTOP = { width: 1280, height: 800 };

  test('the skills legend is two whole phrases on a phone, one line on a desktop', async () => {
    for (const [viewport, lines] of [
      [PHONE, ['radar: skill level · 1–5', 'bars: years of experience']],
      [DESKTOP, ['radar: skill level · 1–5 · bars: years of experience']],
    ] as const) {
      const page = await openPage('screen', viewport);
      // Group the legend's visible text into rendered lines by the top edge of each part's line boxes (a
      // Range's rects; the spans are flex items, whose own box is one rect however many lines they take).
      const rendered = await page.evaluate(() => {
        const byTop = new Map<number, string[]>();
        for (const span of document.querySelectorAll('#skills p > span')) {
          if (!span.checkVisibility()) continue;
          const range = document.createRange();
          range.selectNodeContents(span);
          // Separate text nodes on one line give separate rects with the same top.
          const tops = new Set(
            [...range.getClientRects()].map((r) => Math.round(r.top)),
          );
          if (tops.size !== 1) return [`${span.textContent} wraps`];
          const [top] = tops;
          byTop.set(top, [...(byTop.get(top) ?? []), span.textContent!]);
        }
        return [...byTop.values()].map((parts) => parts.join(' '));
      });
      expect(rendered).toEqual([...lines]);
      await page.close();
    }
  });

  test('the section nav appears once scrolled, fits the viewport, jumps to sections and back to the top, clears the footer, and stays shown while keyboard-focused', async () => {
    for (const viewport of [PHONE, DESKTOP]) {
      const page = await openPage('screen', viewport);
      const nav = page.locator('nav[aria-label="Sections"]');
      // At the top the header nav is in view, so the floating one is hidden and out of the Tab order.
      expect(await nav.isVisible()).toBe(false);
      await page.mouse.wheel(0, 600);
      // The scroll timeline restyles on the next frame; waitFor fails the test if the state never comes.
      await nav.waitFor({ state: 'visible', timeout: 2000 });
      const box = (await nav.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

      await nav.getByRole('link', { name: 'work' }).click();
      await page.waitForFunction(
        () =>
          Math.abs(
            document.querySelector('#work')!.getBoundingClientRect().top,
          ) < 1,
      );
      // At the very bottom the pill must not cover the footer text.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const covered = await page.evaluate(() => {
        const pill = document
          .querySelector('nav[aria-label="Sections"]')!
          .getBoundingClientRect();
        return [...document.querySelectorAll('footer span')]
          .filter((el) => el.checkVisibility())
          .map((el) => el.getBoundingClientRect())
          .some(
            (r) =>
              r.bottom > pill.top &&
              r.top < pill.bottom &&
              r.right > pill.left &&
              r.left < pill.right,
          );
      });
      expect(covered).toBe(false);

      await nav.getByRole('link', { name: 'top' }).click();
      await page.waitForFunction(() => window.scrollY === 0);
      await nav.waitFor({ state: 'hidden', timeout: 2000 });

      // Back to the top by keyboard: the focused link stays visible instead of fading out under its ring.
      await page.mouse.wheel(0, 600);
      const top = nav.getByRole('link', { name: 'top' });
      await top.waitFor({ state: 'visible', timeout: 2000 });
      await top.focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => window.scrollY === 0);
      expect(
        await top.evaluate(
          (a) =>
            a.matches(':focus-visible') &&
            a.checkVisibility({
              opacityProperty: true,
              visibilityProperty: true,
            }),
        ),
      ).toBe(true);
      await top.blur();
      await nav.waitFor({ state: 'hidden', timeout: 2000 });
      await page.close();
    }
  });

  test('every radar label fits inside the radar’s viewBox', async () => {
    const page = await openPage('screen');
    const outside = await page.evaluate(() => {
      const svg = document.querySelector<SVGSVGElement>('#skills svg')!;
      const box = svg.viewBox.baseVal;
      return [...svg.querySelectorAll<SVGTextElement>('text')]
        .filter((text) => {
          const { x, y, width, height } = text.getBBox();
          return (
            x < box.x ||
            y < box.y ||
            x + width > box.x + box.width ||
            y + height > box.y + box.height
          );
        })
        .map((text) => text.textContent);
    });
    expect(outside).toEqual([]);
    await page.close();
  });

  test('keyboard focus on an item or hovering its radar label turns its years accent and lights its radar label and dot, but not on paper', async () => {
    const page = await openPage('screen');
    // Per item: years and radar label against the accent (the dots' fill), then the dot's opacity.
    const states = () =>
      page.evaluate(() => {
        const accent = getComputedStyle(
          document.querySelector('#skills circle')!,
        ).fill;
        return [...document.querySelectorAll('#skills li')].map((li) => {
          const axis = li.getAttribute('data-skill');
          const years = getComputedStyle(
            li.querySelector('[data-experience]')!,
          ).color;
          const label = getComputedStyle(
            document.querySelector(`#skills text[data-skill="${axis}"]`)!,
          ).fill;
          const dot = getComputedStyle(
            document.querySelector(`#skills circle[data-skill="${axis}"]`)!,
          ).opacity;
          return `${years === accent ? 'accent' : 'plain'} ${label === accent ? 'lit' : 'unlit'} ${dot}`;
        });
      });
    const onlySystemIntegration = Array.from({ length: 10 }, (_, i) =>
      i === 4 ? 'accent lit 1' : 'plain unlit 0',
    );
    expect(await states()).toEqual(Array(10).fill('plain unlit 0'));
    // Tab from Node.js onto System integration.
    await page.locator('#skills li').nth(3).focus();
    await page.keyboard.press('Tab');
    expect(await states()).toEqual(onlySystemIntegration);
    // Printed while still focused: the years keep the CV's muted ink (`ink-muted`), like every other row.
    await page.emulateMedia({ media: 'print' });
    const printed = await page.evaluate(() =>
      [...document.querySelectorAll('#skills [data-experience]')].map(
        (el) => getComputedStyle(el).color,
      ),
    );
    expect(printed).toEqual(Array(10).fill('rgb(78, 89, 82)'));
    await page.emulateMedia({ media: 'screen' });
    // Hovering System integration's radar label lights its list item too.
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    expect(await states()).toEqual(Array(10).fill('plain unlit 0'));
    await page.hover('#skills text[data-skill="5"]');
    expect(await states()).toEqual(onlySystemIntegration);
    await page.close();
  });

  test('the CV fits its A4 canvas: nothing overflows the page or its box', async () => {
    const page = await openPage('print');
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
    const page = await openPage('print');
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
    build(laterDir, '2036-07-15T12:00:00Z');
    later = await page('index.html', laterDir);
  }, 60_000);

  afterAll(() => rmSync(laterDir, { recursive: true, force: true }));

  test('every derived number counts up to that month, none is typed in', () => {
    // Jul 2036: career since Feb 2006 = 30 full years, leadership since Jan 2015 = 21 → 20+.
    for (const text of ['backed by 30+ years', 'exp: 30+ years'])
      expect(later.text['#top']).toContain(text);
    expect(meta(later, 'description')).toContain('30+ years');
    expect(texts(later.screen, '#about p')[1]).toStartWith(
      '20+ years of leading and supporting engineering teams',
    );
    expect(later.text.footer).toBe('daniel@portfolio:~$ © 2036');
    // Finished jobs keep their length; ongoing ones stay "present".
    expect(texts(later.screen, '#work li > p:first-of-type')).toEqual([
      'Mar 2025 — present',
      'May 2018 — 6 yrs 10 mos',
      'Jan 2017 — 1 yr 3 mos',
      'Jan 2011 — 5 yrs 2 mos',
      'Feb 2006 — 11 yrs',
    ]);
    // Every ongoing experience has passed the 10 cap: full bars; Python stays at its 2011–2014 years; order and the radar stay put.
    expect(skillRows(later.screen)).toEqual([
      ['AI agents', '10+ yrs', 'width: 100%'],
      ['Agentic development workflows', '10+ yrs', 'width: 100%'],
      ['JavaScript / TypeScript', '10+ yrs', 'width: 100%'],
      ['Node.js', '10+ yrs', 'width: 100%'],
      ['System integration', '10+ yrs', 'width: 100%'],
      ['Rust', '10+ yrs', 'width: 100%'],
      ['Engineering leadership', '10+ yrs', 'width: 100%'],
      ['React', '10+ yrs', 'width: 100%'],
      ['Solid.js', '10+ yrs', 'width: 100%'],
      ['Python', '3 yrs', 'width: 30%'],
    ]);
    expect(radarShape(later.html)).toEqual({
      polygon: [LEVEL_POLYGON],
      dots: LEVEL_POLYGON,
    });
  });

  test('the printed CV counts up to that month too', () => {
    expect(texts(later.print, '#about p')[0]).toStartWith(
      'AI engineer building production-ready agents and agentic workflows that solve real problems. This is backed by over three decades of hands-on full-stack engineering. Through more than 20 years of leading engineering teams',
    );
    expect(printedSkills(later.print)).toEqual([
      ['AI agents', '10+ yrs'],
      ['Agentic dev workflows', '10+ yrs'],
      ['JavaScript / TypeScript', '10+ yrs'],
      ['Node.js', '10+ yrs'],
      ['System integration', '10+ yrs'],
      ['Rust', '10+ yrs'],
      ['Engineering leadership', '10+ yrs'],
      ['React', '10+ yrs'],
      ['Solid.js', '10+ yrs'],
      ['Python', '3 yrs'],
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
