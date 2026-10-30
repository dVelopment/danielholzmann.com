import { compareMonths, type Month, yearsSince } from '../lib/experience';
import { buildMonth } from './build';

export interface Job {
  role: string;
  /** Role as worded on the printed CV, when it differs. */
  cvRole?: string;
  company: string;
  start: Month;
  /** Last month worked, inclusive; unset while ongoing. */
  end?: Month;
  /** One-liner on the screen timeline. */
  summary: string;
  /** One-liner on the printed CV. */
  cvSummary: string;
}

/** Newest first, the order of the career timeline and the CV. */
export const jobs: readonly Job[] = [
  {
    role: 'Head of Engineering',
    company: 'Sitelevel.ai',
    start: '2025-03',
    summary:
      'Leading engineering and building production-grade AI agents and agentic workflows.',
    cvSummary:
      'Leading and supporting the engineering team; building production-grade AI agents and agentic workflows.',
  },
  {
    role: 'Principal Software Architect',
    company: 'Bond Vet',
    start: '2018-05',
    end: '2025-02',
    summary:
      'Led the engineering team; all in-house and client-facing websites and apps.',
    cvSummary:
      'Led the engineering team; responsible for all in-house and client-facing websites and apps.',
  },
  {
    role: 'Lead Developer',
    company: 'Veho Technologies',
    start: '2017-01',
    end: '2018-03',
    summary: 'Web, Android and iOS apps.',
    cvSummary: 'Development of web, Android and iOS apps.',
  },
  {
    role: 'Lead Developer',
    company: 'atipso',
    start: '2011-02',
    end: '2016-01',
    summary: 'Consultant and technical lead as a freelancer.',
    cvSummary: 'Consultant and technical lead as a freelancer.',
  },
  {
    role: 'Freelance',
    cvRole: 'Freelance Web Developer',
    company: 'danielholzmann.com',
    start: '2006-02',
    summary: 'Web development, specialized in React and Node.js.',
    cvSummary: 'Web development, specialized in React and Node.js.',
  },
];

const [latestOngoing] = jobs
  .filter((job) => !job.end)
  .sort((a, b) => compareMonths(b.start, a.start));
if (!latestOngoing)
  throw new Error('jobs.ts: no ongoing job (one without `end`) for "now:"');

/** The ongoing job that started last. */
export const currentJob: Job = latestOngoing;

/** Full years from the earliest job start to `month`: the career length in prose ("N+ years"). */
export function careerYearsAt(month: Month): number {
  return Math.max(...jobs.map((job) => yearsSince(job.start, month)));
}

export const careerYears = careerYearsAt(buildMonth);
