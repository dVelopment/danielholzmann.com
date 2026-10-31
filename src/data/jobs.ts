import {
  compareMonths,
  floorToDecade,
  type Month,
  yearsSince,
} from '../lib/experience';
import { buildMonth } from './build';

export interface Job {
  role: string;
  /** Role as worded on the printed CV, when it differs. */
  cvRole?: string;
  company: string;
  start: Month;
  /** Last month worked, inclusive; unset while ongoing. */
  end?: Month;
  /** Summary on the screen timeline and the printed CV; sized to fit the CV's one A4 page. */
  summary: string;
  /** Technologies and techniques used there, on screen and on the printed CV. */
  stack?: readonly string[];
}

/** Newest first, the order of the career timeline and the CV. */
export const jobs: readonly Job[] = [
  {
    role: 'Head of Engineering',
    company: 'Sitelevel.ai',
    start: { year: 2025, month: 3 },
    summary:
      'Leading engineering hands-on; building production-ready AI agents and agentic workflows with evals, guardrails and traceability, e.g. reasoning over financial reports whose numbers trace back to the source data. Agents in pilot with design partners on their real ERP data; ERP integrations, CI, DevOps and DX.',
    stack: [
      'Mastra',
      'TypeScript',
      'Rust',
      'MCP',
      'tool calling',
      'RAG',
      'guardrails',
      'evals',
      'GraphQL',
      'webhooks',
      'OAuth/OIDC',
      'RBAC',
      'Postgres',
      'Docker',
      'GitHub Actions',
    ],
  },
  {
    role: 'Principal Software Architect',
    company: 'Bond Vet',
    start: { year: 2018, month: 5 },
    end: { year: 2025, month: 2 },
    summary:
      'Led engineering hands-on for all websites and apps on the PIMS; LLM-based classification of NPS feedback; financial/KPI data warehouse; CI, DevOps, DX.',
    stack: [
      'TypeScript',
      'Node.js',
      'GraphQL',
      'webhooks',
      'MongoDB',
      'BigQuery',
      'AWS',
      'GCP',
      'CircleCI',
    ],
  },
  {
    role: 'Lead Developer',
    company: 'Veho Technologies',
    start: { year: 2017, month: 1 },
    end: { year: 2018, month: 3 },
    summary: 'Web, Android and iOS apps with Google Maps route planning.',
    stack: [
      'TypeScript',
      'Node.js',
      'GraphQL',
      'webhooks',
      'Google Maps SDK',
      'CircleCI',
    ],
  },
  {
    role: 'Lead Developer',
    company: 'atipso',
    start: { year: 2011, month: 2 },
    end: { year: 2016, month: 1 },
    summary: 'Consultant and technical lead as a freelancer.',
    stack: [
      'PHP',
      'JavaScript',
      'Node.js',
      'Meteor',
      'MongoDB',
      'webhooks',
      'Travis CI',
    ],
  },
  {
    role: 'Freelance',
    cvRole: 'Freelance Web Developer',
    company: 'danielholzmann.com',
    start: { year: 2006, month: 2 },
    summary: 'Web development, specialized in React and Node.js.',
    stack: [
      'TypeScript',
      'Node.js',
      'Bun',
      'PHP',
      'Python',
      'MongoDB',
      'Postgres',
      'MariaDB',
      'Docker',
    ],
  },
];

const [latestOngoing] = jobs
  .filter((job) => !job.end)
  .sort((a, b) => compareMonths(b.start, a.start));
if (!latestOngoing)
  throw new Error('jobs.ts: no ongoing job (one without `end`) for "now:"');

/** The ongoing job that started last. */
export const currentJob: Job = latestOngoing;

/** Full years from the earliest job start to `month`. */
export function careerYearsAt(month: Month): number {
  return Math.max(...jobs.map((job) => yearsSince(job.start, month)));
}

/** Career length in prose, in whole decades: `20`, then `30` from Feb 2036. The screen says "N+ years", the CV "over two decades". */
export const careerYears = floorToDecade(careerYearsAt(buildMonth));
