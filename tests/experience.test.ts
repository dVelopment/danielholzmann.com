import { describe, expect, test } from 'bun:test';
import { careerYearsAt, jobs } from '../src/data/jobs';
import { skills } from '../src/data/skills';
import {
  compareMonths,
  durationLabel,
  formatMonth,
  formatMonthNumeric,
  monthOf,
  yearsLabel,
  yearsSince,
} from '../src/lib/experience';

describe('yearsSince', () => {
  test('counts a year only once the start month comes round again', () => {
    expect(yearsSince('2025-05', '2026-04')).toBe(0);
    expect(yearsSince('2025-05', '2026-05')).toBe(1);
    expect(yearsSince('2006-02', '2026-10')).toBe(20);
  });

  test('a bare year counts from January', () => {
    expect(yearsSince('2015', '2025-12')).toBe(10);
    expect(yearsSince('2015', '2026-01')).toBe(11);
  });

  test('is never negative', () => {
    expect(yearsSince('2027-01', '2026-10')).toBe(0);
  });

  test('rejects malformed months', () => {
    for (const month of ['2025-13', '2025-00', '2025-3', '25-03', 'May 2025'])
      expect(() => yearsSince(month as '2025', '2026-01')).toThrow(month);
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
    expect(durationLabel('2020-01', '2020-01')).toBe('1 mo');
    expect(durationLabel('2020-01', '2021-02')).toBe('1 yr 2 mos');
    expect(durationLabel('2020-12', '2021-01')).toBe('2 mos');
  });

  test('rejects an end before the start', () => {
    expect(() => durationLabel('2020-02', '2020-01')).toThrow();
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
    expect(careerYearsAt('2026-10')).toBe(20);
    expect(careerYearsAt('2027-01')).toBe(20);
    expect(careerYearsAt('2027-02')).toBe(21);
  });
});

describe('formatting', () => {
  test('screen and CV month formats', () => {
    expect(formatMonth('2025-03')).toBe('Mar 2025');
    expect(formatMonth('2016')).toBe('Jan 2016');
    expect(formatMonth('2018-12')).toBe('Dec 2018');
    expect(formatMonthNumeric('2025-03')).toBe('03/2025');
    expect(formatMonthNumeric('2018-12')).toBe('12/2018');
  });

  test('monthOf takes the Vienna month, summer and winter time', () => {
    expect(monthOf(new Date('2026-10-31T22:30:00Z'))).toBe('2026-10');
    expect(monthOf(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11');
    expect(monthOf(new Date('2026-12-31T22:59:00Z'))).toBe('2026-12');
    expect(monthOf(new Date('2026-12-31T23:00:00Z'))).toBe('2027-01');
    expect(monthOf(new Date('2026-06-30T21:59:00Z'))).toBe('2026-06');
    expect(monthOf(new Date('2026-06-30T22:00:00Z'))).toBe('2026-07');
  });

  test('compareMonths orders bare years as January', () => {
    expect(compareMonths('2016', '2016-01')).toBe(0);
    expect(compareMonths('2016', '2016-02')).toBeLessThan(0);
    expect(compareMonths('2025-05', '2025')).toBeGreaterThan(0);
  });
});
