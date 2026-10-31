import { describe, expect, test } from 'bun:test';
import { points, radar } from '../src/lib/radar';

/** Values the design was drawn with, one per axis clockwise from the top. */
const designAxes = [5, 5, 5, 2, 2, 2, 2, 5].map((value) => ({
  label: ['x'] as const,
  value,
}));

describe('radar', () => {
  test('label anchors of the eight focus area axes land on the design coordinates', () => {
    const labels = radar(
      (
        [
          ['JavaScript / TypeScript'],
          ['Node.js'],
          ['React'],
          ['System', 'integration'],
          ['Rust'],
          ['AI agents'],
          ['Agentic development', 'workflows'],
          ['Engineering', 'leadership'],
        ] as const
      ).map((label) => ({ label, value: 1 })),
    ).labels;
    expect(labels).toEqual([
      {
        x: 200,
        anchor: 'middle',
        lines: [{ y: 22, text: 'JavaScript / TypeScript' }],
      },
      { x: 326, anchor: 'start', lines: [{ y: 74, text: 'Node.js' }] },
      { x: 378, anchor: 'start', lines: [{ y: 205, text: 'React' }] },
      {
        x: 326,
        anchor: 'start',
        lines: [
          { y: 331, text: 'System' },
          { y: 350, text: 'integration' },
        ],
      },
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

  test('rings, spokes and ring labels match the design, ring labels reading the levels 1–5', () => {
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
      { x: 208, y: 165, text: '1' },
      { x: 208, y: 133, text: '2' },
      { x: 208, y: 101, text: '3' },
      { x: 208, y: 69, text: '4' },
      { x: 208, y: 37, text: '5' },
    ]);
  });

  test('each data polygon corner sits on the ring of its value', () => {
    expect(points(radar(designAxes).vertices)).toBe(
      '200,40 313.1,86.9 360,200 245.3,245.3 200,264 154.7,245.3 136,200 86.9,86.9',
    );
  });

  test('a different axis count still anchors labels outward', () => {
    const labels = radar(
      [1, 2, 3, 4].map((value) => ({ label: ['a', 'b'] as const, value })),
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
