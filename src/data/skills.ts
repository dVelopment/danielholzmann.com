import { floorToDecade, type Month, yearsSince } from '../lib/experience';
import { buildMonth } from './build';

/** How well Daniel masters a skill today; set by hand, independent of experience. One radar ring per level: keep in step with RADAR_RINGS. */
type SkillLevel = 1 | 2 | 3 | 4 | 5;

export interface Skill {
  name: string;
  /** Shorter name on the printed CV. */
  cvName?: string;
  /** Radar label split into lines, when one line is too wide. */
  radarLabel?: readonly [string, ...string[]];
  /** Month hands-on experience began; a bare year counts from January. */
  start: Month;
  /** Month hands-on experience ended, for a skill no longer in use; experience counts up to it instead of the build month. */
  end?: Month;
  level: SkillLevel;
}

const aiAgents: Skill = { name: 'AI agents', start: 2024, level: 4 };
const agentic: Skill = {
  name: 'Agentic development workflows',
  cvName: 'Agentic dev workflows',
  radarLabel: ['Agentic development', 'workflows'],
  start: { year: 2025, month: 5 },
  level: 4,
};
const typescript: Skill = {
  name: 'JavaScript / TypeScript',
  start: 2016,
  level: 5,
};
const rust: Skill = { name: 'Rust', start: 2024, level: 4 };
const leadership: Skill = {
  name: 'Engineering leadership',
  radarLabel: ['Engineering', 'leadership'],
  start: 2015,
  level: 4,
};
const integration: Skill = {
  name: 'System integration',
  radarLabel: ['System', 'integration'],
  start: 2006,
  level: 5,
};
const node: Skill = { name: 'Node.js', start: 2012, level: 5 };
const react: Skill = { name: 'React', start: 2016, level: 4 };
const solid: Skill = { name: 'Solid.js', start: 2025, level: 3 };
const python: Skill = { name: 'Python', start: 2011, end: 2014, level: 1 };

/** List order on screen and on the printed CV, kept by hand: the AI skills first, the rest by highest skill level. */
export const skills: readonly Skill[] = [
  aiAgents,
  agentic,
  typescript,
  node,
  integration,
  rust,
  leadership,
  react,
  solid,
  python,
];

/** Radar axis order, clockwise from the top; chosen so every label fits the design's radar. */
export const radarAxes: readonly Skill[] = [
  typescript,
  node,
  react,
  solid,
  python,
  integration,
  rust,
  aiAgents,
  agentic,
  leadership,
];

/** Years of leading teams in prose, in whole decades: `10`, then `20` from 2035. The screen says "N+ years", the CV "more than N years". */
export const leadershipYears = floorToDecade(
  yearsSince(leadership.start, buildMonth),
);

/** Full years of hands-on experience in `skill` at the build month, or up to its end month. */
export const skillYears = (skill: Skill): number =>
  yearsSince(skill.start, skill.end ?? buildMonth);

/** Cap for the years on each list row and its bar, on screen and on the printed CV (`10+ yrs`). */
export const DETAIL_CAP = 10;
