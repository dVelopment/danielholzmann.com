import { floorToDecade, type Month, yearsSince } from '../lib/experience';
import { buildMonth } from './build';

/** How well Daniel masters a focus area today; set by hand, independent of experience. One radar ring per level: keep in step with RADAR_RINGS. */
type SkillLevel = 1 | 2 | 3 | 4 | 5;

export interface FocusArea {
  name: string;
  /** Shorter name on the printed CV. */
  cvName?: string;
  /** Radar label split into lines, when one line is too wide. */
  radarLabel?: readonly [string, ...string[]];
  /** Month hands-on experience began; a bare year counts from January. */
  start: Month;
  level: SkillLevel;
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
  level: 5,
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
  level: 4,
};
const node: FocusArea = { name: 'Node.js', start: 2012, level: 5 };
const react: FocusArea = { name: 'React', start: 2016, level: 4 };
const solid: FocusArea = { name: 'Solid.js', start: 2025, level: 3 };

/** List order on screen and on the printed CV, kept by hand: highest skill level first. */
export const focusAreas: readonly FocusArea[] = [
  aiAgents,
  agentic,
  typescript,
  node,
  rust,
  leadership,
  integration,
  react,
  solid,
];

/** Radar axis order, clockwise from the top; chosen so every label fits the design's radar. */
export const radarAxes: readonly FocusArea[] = [
  typescript,
  node,
  react,
  solid,
  integration,
  rust,
  aiAgents,
  agentic,
  leadership,
];

/** Years of leading teams in prose ("N+ years"), in whole decades: `10+`, then `20+` from 2035. */
export const leadershipYears = floorToDecade(
  yearsSince(leadership.start, buildMonth),
);

/** Cap for the years on each list row and its bar, on screen and on the printed CV (`10+ yrs`). */
export const DETAIL_CAP = 10;
