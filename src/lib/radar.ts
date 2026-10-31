/**
 * Radar chart geometry in the design's SVG coordinates (viewBox `-170 0 640 410`). Pure: no Astro, no clock.
 * Axes run clockwise from the top; values are ring numbers, 0 to RADAR_RINGS.
 */

export const RADAR_CENTER = 200;
/** SVG units per ring: ring `n` sits at `n * RADAR_UNIT` from the center. */
export const RADAR_UNIT = 32;
/** Ring count; rings are labelled `1` to RADAR_RINGS. */
export const RADAR_RINGS = 5;

/** Distance from the center to an axis label's anchor point. */
const LABEL_RADIUS = 178;
/** Baseline distance between the lines of a multi-line label. */
const LINE_HEIGHT = 19;
// Baseline below the anchor point, so the 15px axis labels (font size set in FocusAreas.astro) sit level with,
// or clear below, the chart.
const DROP_LEVEL = 5;
const DROP_BELOW_SIDE = 14;
const DROP_BELOW = 16;
// Ring labels sit right of the top spoke, just above their ring.
const RING_LABEL_X = 8;
const RING_LABEL_RISE = 3;
/** Direction components smaller than this count as zero (cos 90° is 6e-17, not 0). */
const EPSILON = 1e-9;

export interface RadarAxis {
  /** Label lines, top to bottom; at least one. */
  readonly label: readonly [string, ...string[]];
  /** Ring the data polygon reaches on this axis, 0 to RADAR_RINGS. */
  readonly value: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface AxisLabel {
  readonly x: number;
  readonly anchor: 'start' | 'middle' | 'end';
  /** One baseline per label line. */
  readonly lines: readonly { readonly y: number; readonly text: string }[];
}

export interface Radar {
  /** Rings from the innermost to the outer one. */
  readonly rings: readonly (readonly Point[])[];
  readonly ringLabels: readonly (Point & { readonly text: string })[];
  /** Outer end of each axis spoke. */
  readonly spokes: readonly Point[];
  /** Data polygon corners, one per axis. */
  readonly vertices: readonly Point[];
  readonly labels: readonly AxisLabel[];
}

/** One decimal, as in the design. */
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Unit direction of axis `i` of `n`, clockwise from the top: `dx` right, `dy` down. */
function direction(i: number, n: number) {
  const angle = (2 * Math.PI * i) / n;
  const snap = (v: number) => (Math.abs(v) < EPSILON ? 0 : v);
  return { dx: snap(Math.sin(angle)), dy: snap(-Math.cos(angle)) };
}

function pointAt(i: number, n: number, radius: number): Point {
  const { dx, dy } = direction(i, n);
  return {
    x: round1(RADAR_CENTER + dx * radius),
    y: round1(RADAR_CENTER + dy * radius),
  };
}

/** Single-line baseline below the anchor point: a label above the center rests on it, a level one centers on it, a lower one hangs below. */
function labelDrop(dx: number, dy: number): number {
  if (dy < 0) return 0;
  if (dy === 0) return DROP_LEVEL;
  if (dx === 0) return DROP_BELOW;
  return DROP_BELOW_SIDE;
}

/**
 * Left/right labels anchor on the side facing away from the chart, top/bottom ones centered.
 * Lines of a multi-line label are centered on the single-line baseline (tuned for side axes: a second line on
 * the top axis overlaps the top ring label, three or more on the bottom axis run past the viewBox); a
 * half-pixel tie goes up above the center and down otherwise.
 */
function axisLabel(i: number, n: number, lines: readonly string[]): AxisLabel {
  const { dx, dy } = direction(i, n);
  let anchor: AxisLabel['anchor'] = 'middle';
  if (dx > 0) anchor = 'start';
  else if (dx < 0) anchor = 'end';
  const baseline = Math.round(
    RADAR_CENTER + dy * LABEL_RADIUS + labelDrop(dx, dy),
  );
  const tie = dy < 0 ? Math.floor : Math.ceil;
  return {
    x: Math.round(RADAR_CENTER + dx * LABEL_RADIUS),
    anchor,
    lines: lines.map((text, line) => ({
      y: tie(baseline + (line - (lines.length - 1) / 2) * LINE_HEIGHT),
      text,
    })),
  };
}

export function radar(axes: readonly RadarAxis[]): Radar {
  const n = axes.length;
  if (n < 3) throw new Error(`a radar needs at least 3 axes, got ${n}`);
  const indices = axes.map((_, i) => i);
  const levels = Array.from({ length: RADAR_RINGS }, (_, k) => k + 1);
  return {
    rings: levels.map((level) =>
      indices.map((i) => pointAt(i, n, level * RADAR_UNIT)),
    ),
    ringLabels: levels.map((level) => ({
      x: RADAR_CENTER + RING_LABEL_X,
      y: RADAR_CENTER - level * RADAR_UNIT - RING_LABEL_RISE,
      text: `${level}`,
    })),
    spokes: indices.map((i) => pointAt(i, n, RADAR_RINGS * RADAR_UNIT)),
    vertices: axes.map(({ value }, i) => pointAt(i, n, value * RADAR_UNIT)),
    labels: axes.map(({ label }, i) => axisLabel(i, n, label)),
  };
}

/** SVG `points` attribute. */
export const points = (corners: readonly Point[]) =>
  corners.map(({ x, y }) => `${x},${y}`).join(' ');
