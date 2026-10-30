import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { cvOrder, type Skill, skills } from '../src/data/skills';
import { type YearMonth, yearsSince } from '../src/lib/experience';
import { points, radar } from '../src/lib/radar';

const october2026: YearMonth = { year: 2026, month: 10 };
const axesAt = (now: YearMonth) =>
  skills.map((skill) => ({
    label: skill.radarLabel ?? [skill.name],
    years: yearsSince(skill.start, now),
  }));

/** Values the design was drawn with (JS/TS, Node.js, React, Solid.js, Rust, AI agents, Agentic, leadership). */
const designAxes = [5, 5, 5, 2, 2, 2, 2, 5].map((years) => ({
  label: ['x'] as const,
  years,
}));

describe('radar', () => {
  test('label anchors at an Oct 2026 build land on the design coordinates', () => {
    expect(radar(axesAt(october2026)).labels).toEqual([
      {
        x: 200,
        anchor: 'middle',
        lines: [{ y: 22, text: 'JavaScript / TypeScript' }],
      },
      { x: 326, anchor: 'start', lines: [{ y: 74, text: 'Node.js' }] },
      { x: 378, anchor: 'start', lines: [{ y: 205, text: 'React' }] },
      { x: 326, anchor: 'start', lines: [{ y: 340, text: 'Solid.js' }] },
      { x: 200, anchor: 'middle', lines: [{ y: 394, text: 'Rust' }] },
      { x: 74, anchor: 'end', lines: [{ y: 340, text: 'AI agents' }] },
      {
        x: 22,
        anchor: 'end',
        lines: [
          { y: 196, text: 'Agentic development' },
          { y: 215, text: 'workflows' },
        ],
      },
      {
        x: 74,
        anchor: 'end',
        lines: [
          { y: 64, text: 'Engineering' },
          { y: 83, text: 'leadership' },
        ],
      },
    ]);
  });

  test('rings, spokes and ring labels match the design', () => {
    const chart = radar(designAxes);
    expect(chart.rings.map(points)).toEqual([
      '200,168 222.6,177.4 232,200 222.6,222.6 200,232 177.4,222.6 168,200 177.4,177.4',
      '200,136 245.3,154.7 264,200 245.3,245.3 200,264 154.7,245.3 136,200 154.7,154.7',
      '200,104 267.9,132.1 296,200 267.9,267.9 200,296 132.1,267.9 104,200 132.1,132.1',
      '200,72 290.5,109.5 328,200 290.5,290.5 200,328 109.5,290.5 72,200 109.5,109.5',
      '200,40 313.1,86.9 360,200 313.1,313.1 200,360 86.9,313.1 40,200 86.9,86.9',
    ]);
    expect(points(chart.spokes)).toBe(
      '200,40 313.1,86.9 360,200 313.1,313.1 200,360 86.9,313.1 40,200 86.9,86.9',
    );
    expect(chart.ringLabels).toEqual([
      { x: 208, y: 165, text: '1y' },
      { x: 208, y: 133, text: '2y' },
      { x: 208, y: 101, text: '3y' },
      { x: 208, y: 69, text: '4y' },
      { x: 208, y: 37, text: '5+' },
    ]);
  });

  test('the data polygon caps values at 5 years', () => {
    expect(points(radar(designAxes).vertices)).toBe(
      '200,40 313.1,86.9 360,200 245.3,245.3 200,264 154.7,245.3 136,200 86.9,86.9',
    );
    // Oct 2026: Node.js has 14 years, drawn on the outer ring; Solid.js and Agentic one year.
    expect(points(radar(axesAt(october2026)).vertices)).toBe(
      '200,40 313.1,86.9 360,200 222.6,222.6 200,264 154.7,245.3 168,200 86.9,86.9',
    );
  });

  test('a different axis count still anchors labels outward', () => {
    const labels = radar(
      [1, 2, 3, 4].map((years) => ({ label: ['a', 'b'] as const, years })),
    ).labels;
    expect(labels.map(({ x, anchor }) => [x, anchor])).toEqual([
      [200, 'middle'],
      [378, 'start'],
      [200, 'middle'],
      [22, 'end'],
    ]);
    // Top label rests above the chart, the bottom one hangs below it.
    expect(labels[0].lines.map((l) => l.y)).toEqual([12, 31]);
    expect(labels[2].lines.map((l) => l.y)).toEqual([385, 404]);
  });
});

describe('cvOrder', () => {
  const names = (list: readonly Skill[]) => list.map((s) => s.name);
  const expected = [
    'Agentic development workflows',
    'AI agents',
    'Rust',
    'JavaScript / TypeScript',
    'Engineering leadership',
    'Solid.js',
    'React',
    'Node.js',
  ];

  test('puts featured skills first, newest start first, ties by name', () => {
    expect(names(cvOrder(skills))).toEqual(expected);
  });

  test('featured first even when older; ties on start month by name A→Z, whatever the input order', () => {
    // Mixed case on purpose: locale order puts "Agentic" before "AI agents", code points don't.
    const tied: Skill[] = [
      { name: 'b', start: 2020 },
      { name: 'AI agents', start: { year: 2020, month: 1 } },
      { name: 'Agentic', start: 2020 },
      { name: 'd', start: { year: 2020, month: 2 } },
      { name: 'z', start: 2019, featured: true },
    ];
    const expected = ['z', 'd', 'Agentic', 'AI agents', 'b'];
    expect(names(cvOrder(tied))).toEqual(expected);
    expect(names(cvOrder(tied.toReversed()))).toEqual(expected);
  });

  test('keeps the same order when the data is loaded at a later build month', () => {
    // fixed-clock.ts freezes the build clock, as in the later site build.
    const result = Bun.spawnSync(
      [
        process.execPath,
        '--preload',
        join(import.meta.dir, 'fixed-clock.ts'),
        '-e',
        `const { cvOrder, skills, leadershipYears } = await import(${JSON.stringify(join(import.meta.dir, '../src/data/skills.ts'))});
         console.log(JSON.stringify({ leadershipYears, order: cvOrder(skills).map((s) => s.name) }));`,
      ],
      { env: { ...process.env, FIXED_NOW: '2031-07-15T12:00:00Z' } },
    );
    expect(result.stderr.toString()).toBe('');
    expect(result.exitCode).toBe(0);
    const later = JSON.parse(result.stdout.toString());
    expect(later.leadershipYears).toBe(16); // proves the clock moved
    expect(later.order).toEqual(expected);
  });
});
