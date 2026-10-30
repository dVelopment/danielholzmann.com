/** Build-time experience math on calendar months. Pure: no Astro, no clock. */

/** 1 = January … 12 = December. */
export type MonthNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface YearMonth {
  readonly year: number;
  readonly month: MonthNumber;
}

/** A calendar month, or a bare year meaning January of that year. */
export type Month = number | YearMonth;

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Validated year and month; throws unless the year is 1000–9999 and the month an integer 1–12, so bad input never renders. */
function toYearMonth(value: Month): YearMonth {
  const { year, month }: { year: number; month: number } =
    typeof value === 'number' ? { year: value, month: 1 } : value;
  if (
    !Number.isInteger(year) ||
    year < 1000 ||
    year > 9999 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  )
    throw new Error(`invalid month: year ${year}, month ${month}`);
  return { year, month: month as MonthNumber };
}

/** Months since year 0, for month arithmetic. */
function monthIndex(value: Month): number {
  const { year, month } = toYearMonth(value);
  return year * 12 + month - 1;
}

/** `1 yr` / `N yrs`, `1 mo` / `N mos`. */
function count(n: number, unit: 'yr' | 'mo'): string {
  return n === 1 ? `1 ${unit}` : `${n} ${unit}s`;
}

const VIENNA_MONTH = new Intl.DateTimeFormat('en', {
  timeZone: 'Europe/Vienna',
  year: 'numeric',
  month: 'numeric',
});

/** The calendar month of `date` in Vienna, e.g. the build month. */
export function monthOf(date: Date): YearMonth {
  const parts = VIENNA_MONTH.formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  return toYearMonth({ year, month } as YearMonth);
}

/** Sort comparator: negative when `a` is the earlier month. */
export function compareMonths(a: Month, b: Month): number {
  return monthIndex(a) - monthIndex(b);
}

/** Full years elapsed from `start` to `now`, rounded down and never negative. */
export function yearsSince(start: Month, now: Month): number {
  return Math.max(0, Math.floor((monthIndex(now) - monthIndex(start)) / 12));
}

/** `<1 yr`, `1 yr`, `N yrs`, or `cap+ yrs` once `years` reaches `cap`. */
export function yearsLabel(years: number, cap: number): string {
  if (years >= cap) return `${cap}+ yrs`;
  if (years < 1) return '<1 yr';
  return count(years, 'yr');
}

/** Length of a job counting both its first and last month: `6 yrs 10 mos`, `1 yr 3 mos`, `5 yrs`. */
export function durationLabel(start: Month, end: Month): string {
  const months = monthIndex(end) - monthIndex(start) + 1;
  if (months < 1)
    throw new Error(
      `job ends (${JSON.stringify(end)}) before it starts (${JSON.stringify(start)})`,
    );
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years) parts.push(count(years, 'yr'));
  if (rest) parts.push(count(rest, 'mo'));
  return parts.join(' ');
}

/** `Mar 2025`, as on screen. */
export function formatMonth(value: Month): string {
  const { year, month } = toYearMonth(value);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** `03/2025`, as on the printed CV. */
export function formatMonthNumeric(value: Month): string {
  const { year, month } = toYearMonth(value);
  return `${String(month).padStart(2, '0')}/${year}`;
}
