import type { Month } from '../lib/experience';

export interface Skill {
  name: string;
  /** Shorter name on the printed CV. */
  cvName?: string;
  /** Radar label split into lines, when one line is too wide. */
  radarLabel?: readonly string[];
  /** Month hands-on experience began; a bare year counts from January. */
  start: Month;
  /** Focus skills, listed first on the printed CV. */
  featured?: boolean;
}

/** Radar axis order, clockwise from the top, and the order of the screen list. */
export const skills: readonly Skill[] = [
  { name: 'JavaScript / TypeScript', start: '2016', featured: true },
  { name: 'Node.js', start: '2012' },
  { name: 'React', start: '2016' },
  { name: 'Solid.js', start: '2025' },
  { name: 'Rust', start: '2024', featured: true },
  { name: 'AI agents', start: '2024', featured: true },
  {
    name: 'Agentic development workflows',
    cvName: 'Agentic dev workflows',
    radarLabel: ['Agentic development', 'workflows'],
    start: '2025-05',
    featured: true,
  },
  {
    name: 'Engineering leadership',
    radarLabel: ['Engineering', 'leadership'],
    start: '2015',
    featured: true,
  },
];
