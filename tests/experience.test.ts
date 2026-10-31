import { describe, expect, test } from 'bun:test';
import { careerYearsAt, jobs } from '../src/data/jobs';
import { skills } from '../src/data/skills';
import {
  compareMonths,
  decadesInWords,
  durationLabel,
  floorToDecade,
  formatMonth,
  formatMonthNumeric,
  type Month,
  monthOf,
  type YearMonth,
  yearsLabel,
  yearsSince,
} from '../src/lib/experience';

// Unchecked on purpose, so tests can build invalid months too.
const ym = (year: number, month: number) => ({ year, month }) as YearMonth;

describe('yearsSince', () => {
  test('counts a year only once the start month comes round again', () => {
    expect(yearsSince(ym(2025, 5), ym(2026, 4))).toBe(0);
    expect(yearsSince(ym(2025, 5), ym(2026, 5))).toBe(1);
    expect(yearsSince(ym(2006, 2), ym(2026, 10))).toBe(20);
  });

  test('a bare year counts from January', () => {
    expect(yearsSince(2015, ym(2025, 12))).toBe(10);
    expect(yearsSince(2015, ym(2026, 1))).toBe(11);
  });

  test('is never negative', () => {
    expect(yearsSince(ym(2027, 1), ym(2026, 10))).toBe(0);
  });

  test('rejects malformed months', () => {
    const bad: Month[] = [
      ym(2025, 13),
      ym(2025, 0),
      ym(2025, 1.5),
      ym(25, 3),
      ym(Number.NaN, 3),
      20255,
      2025.5,
    ];
    for (const month of bad)
      expect(() => yearsSince(month, ym(2026, 1))).toThrow('invalid month');
    expect(() => yearsSince(ym(Number.NaN, 3), 2026)).toThrow(
      'invalid month: year NaN, month 3',
    );
  });
});

describe('yearsLabel', () => {
  test('caps at the given ceiling', () => {
    expect(yearsLabel(7, 10)).toBe('7 yrs');
    expect(yearsLabel(9, 10)).toBe('9 yrs');
    expect(yearsLabel(10, 10)).toBe('10+ yrs');
    expect(yearsLabel(14, 10)).toBe('10+ yrs');
    expect(yearsLabel(4, 5)).toBe('4 yrs');
    expect(yearsLabel(5, 5)).toBe('5+ yrs');
  });

  test('singular year and under a year', () => {
    expect(yearsLabel(1, 5)).toBe('1 yr');
    expect(yearsLabel(0, 5)).toBe('<1 yr');
  });
});

describe('floorToDecade', () => {
  test('rounds full years down to whole decades', () => {
    expect(floorToDecade(10)).toBe(10);
    expect(floorToDecade(11)).toBe(10);
    expect(floorToDecade(19)).toBe(10);
    expect(floorToDecade(20)).toBe(20);
    expect(floorToDecade(21)).toBe(20);
  });
});

describe('decadesInWords', () => {
  test('spells whole decades out for the CV', () => {
    expect(decadesInWords(10)).toBe('a decade');
    expect(decadesInWords(20)).toBe('two decades');
    expect(decadesInWords(30)).toBe('three decades');
    expect(decadesInWords(50)).toBe('five decades');
  });

  test('refuses counts it has no words for, so the build fails instead of printing nonsense', () => {
    for (const years of [0, 15, 60])
      expect(() => decadesInWords(years)).toThrow(`no words for ${years} years`);
  });
});

describe('durationLabel', () => {
  const duration = (company: string) => {
    const job = jobs.find((j) => j.company === company);
    if (!job?.end) throw new Error(`no ended job at ${company}`);
    return durationLabel(job.start, job.end);
  };

  test('counts first and last month of the designed jobs', () => {
    expect(duration('Bond Vet')).toBe('6 yrs 10 mos');
    expect(duration('Veho Technologies')).toBe('1 yr 3 mos');
    expect(duration('atipso')).toBe('5 yrs');
  });

  test('singular units and short jobs', () => {
    expect(durationLabel(ym(2020, 1), ym(2020, 1))).toBe('1 mo');
    expect(durationLabel(ym(2020, 1), ym(2021, 2))).toBe('1 yr 2 mos');
    expect(durationLabel(ym(2020, 12), ym(2021, 1))).toBe('2 mos');
    expect(durationLabel(2020, 2020)).toBe('1 mo');
  });

  test('rejects an end before the start', () => {
    expect(() => durationLabel(ym(2020, 2), ym(2020, 1))).toThrow();
  });
});

describe('content data', () => {
  test('every start and end month is valid and no job ends before it starts', () => {
    for (const { start } of skills)
      expect(() => formatMonth(start)).not.toThrow();
    for (const { start, end } of jobs)
      expect(() => durationLabel(start, end ?? start)).not.toThrow();
  });

  test('career years count full years since the earliest job (Feb 2006)', () => {
    expect(careerYearsAt(ym(2026, 10))).toBe(20);
    expect(careerYearsAt(ym(2027, 1))).toBe(20);
    expect(careerYearsAt(ym(2027, 2))).toBe(21);
  });
});

describe('formatting', () => {
  test('screen and CV month formats', () => {
    expect(formatMonth(ym(2025, 3))).toBe('Mar 2025');
    expect(formatMonth(2016)).toBe('Jan 2016');
    expect(formatMonth(ym(2018, 12))).toBe('Dec 2018');
    expect(formatMonthNumeric(ym(2025, 3))).toBe('03/2025');
    expect(formatMonthNumeric(ym(2018, 12))).toBe('12/2018');
  });

  test('monthOf takes the Vienna month, summer and winter time', () => {
    const at = (iso: string) => monthOf(new Date(iso));
    expect(at('2026-10-31T22:30:00Z')).toEqual(ym(2026, 10));
    expect(at('2026-10-31T23:30:00Z')).toEqual(ym(2026, 11));
    expect(at('2026-12-31T22:59:00Z')).toEqual(ym(2026, 12));
    expect(at('2026-12-31T23:00:00Z')).toEqual(ym(2027, 1));
    expect(at('2026-06-30T21:59:00Z')).toEqual(ym(2026, 6));
    expect(at('2026-06-30T22:00:00Z')).toEqual(ym(2026, 7));
  });

  test('compareMonths orders bare years as January', () => {
    expect(compareMonths(2016, ym(2016, 1))).toBe(0);
    expect(compareMonths(2016, ym(2016, 2))).toBeLessThan(0);
    expect(compareMonths(ym(2025, 5), 2025)).toBeGreaterThan(0);
  });
});
