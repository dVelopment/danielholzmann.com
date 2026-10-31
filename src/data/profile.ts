import { careerYears } from './jobs';

export interface Profile {
  name: string;
  /** Appended to the name on the printed CV only; nothing rendered when unset. */
  cvNameSuffix?: string;
  title: string;
  location: string;
  email: string;
  siteUrl: string;
  description: string;
  keywords: readonly string[];
}

/** Site identity: feeds `site` in astro.config.ts, the page head and page content. */
export const profile: Profile = {
  name: 'Daniel Holzmann',
  cvNameSuffix: ', BSc',
  title: 'AI Engineer & Full-Stack Developer',
  location: 'Vienna, Austria',
  email: 'daniel@danielholzmann.com',
  siteUrl: 'https://danielholzmann.com',
  description: `Daniel Holzmann, AI engineer and full-stack developer: production-grade AI agents, agentic development workflows and ${careerYears}+ years of hands-on software engineering.`,
  keywords: [
    'daniel holzmann',
    'ai engineer',
    'ai agents',
    'agentic workflows',
    'full-stack developer',
  ],
};

export const social = {
  github: 'https://github.com/dVelopment',
  linkedin: 'https://www.linkedin.com/in/daniel-holzmann-bb35235b',
  mastodon: 'https://wien.rocks/@dVelopment',
  gravatar: 'https://gravatar.com/h2online',
};

/** A link as the printed CV shows it: `https://www.linkedin.com/in/x` → `linkedin.com/in/x`. */
export function bareUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '');
}

export interface Education {
  title: string;
  school: string;
  /** e.g. `2009 — 2012`; left off the CV when unset. */
  period?: string;
  /** e.g. `BSc`; left off the CV when unset. */
  degree?: string;
}

export const education: readonly Education[] = [
  {
    title: 'Software Engineering',
    school: 'University of Applied Sciences Upper Austria, Hagenberg',
    period: '2011 — 2015',
    degree: 'BSc in Engineering',
  },
];

/** Languages for the printed CV, e.g. `German (native), English (fluent)`; no section when unset. */
export const languages: string | undefined = undefined;
