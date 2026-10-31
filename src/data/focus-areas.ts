import { type Month, yearsSince } from '../lib/experience';
import { buildMonth } from './build';

/** How much weight a focus area gets today; set by hand, independent of experience. */
export type FocusLevel = 1 | 2 | 3 | 4 | 5;

export interface FocusArea {
  name: string;
  /** Shorter name on the printed CV. */
  cvName?: string;
  /** Radar label split into lines, when one line is too wide. */
  radarLabel?: readonly [string, ...string[]];
  /** Month hands-on experience began; a bare year counts from January. */
  start: Month;
  level: FocusLevel;
}

const aiAgents: FocusArea = { name: 'AI agents', start: 2024, level: 5 };
const agentic: FocusArea = {
  name: 'Agentic development workflows',
  cvName: 'Agentic dev workflows',
  radarLabel: ['Agentic development', 'workflows'],
  start: { year: 2025, month: 5 },
  level: 5,
};
const typescript: FocusArea = {
  name: 'JavaScript / TypeScript',
  start: 2016,
  level: 4,
};
const rust: FocusArea = { name: 'Rust', start: 2024, level: 4 };
const leadership: FocusArea = {
  name: 'Engineering leadership',
  radarLabel: ['Engineering', 'leadership'],
  start: 2015,
  level: 4,
};
const integration: FocusArea = {
  name: 'System integration',
  radarLabel: ['System', 'integration'],
  start: 2006,
  level: 3,
};
const node: FocusArea = { name: 'Node.js', start: 2012, level: 3 };
const react: FocusArea = { name: 'React', start: 2016, level: 2 };

/** List order on screen and on the printed CV, kept by hand: highest focus level first. */
export const focusAreas: readonly FocusArea[] = [
  aiAgents,
  agentic,
  typescript,
  rust,
  leadership,
  integration,
  node,
  react,
];

/** Radar axis order, clockwise from the top; chosen so every label fits the design's radar. */
export const radarAxes: readonly FocusArea[] = [
  typescript,
  node,
  react,
  integration,
  rust,
  aiAgents,
  agentic,
  leadership,
];

/** Full years of leading teams, as in the about text ("N+ years"). */
export const leadershipYears = yearsSince(leadership.start, buildMonth);

/** Cap for the hover/focus experience and the printed CV (`10+ yrs`). */
export const DETAIL_CAP = 10;
