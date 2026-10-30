/**
 * Build-time experience math on calendar months. Pure: no Astro, no clock.
 * A month is written `YYYY-MM`; a bare `YYYY` means January of that year.
 */
type MonthNumber =
  | '01'
  | '02'
  | '03'
  | '04'
  | '05'
  | '06'
  | '07'
  | '08'
  | '09'
  | '10'
  | '11'
  | '12';
/** Checks the month part only; `parseMonth` also rejects years that aren't 4 digits. */
export type Month = `${number}-${MonthNumber}` | `${number}`;

const MONTH_PATTERN = /^(\d{4})(?:-(0[1-9]|1[0-2]))?$/;
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

/** Year and 1-based month; throws on anything but `YYYY` or `YYYY-MM`, so bad input never renders. */
function parseMonth(month: Month): { year: number; month: number } {
  const match = MONTH_PATTERN.exec(month);
  if (!match)
    throw new Error(`invalid month "${month}", expected YYYY or YYYY-MM`);
  return { year: Number(match[1]), month: Number(match[2] ?? 1) };
}

/** Months since year 0, for month arithmetic. */
function monthIndex(value: Month): number {
  const { year, month } = parseMonth(value);
  return year * 12 + month - 1;
}

/** `1 yr` / `N yrs`, `1 mo` / `N mos`. */
function count(n: number, unit: 'yr' | 'mo'): string {
  return n === 1 ? `1 ${unit}` : `${n} ${unit}s`;
}

// en-CA formats a year and month as `YYYY-MM`.
const VIENNA_MONTH = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Vienna',
  year: 'numeric',
  month: '2-digit',
});

/** The calendar month of `date` in Vienna, e.g. the build month. */
export function monthOf(date: Date): Month {
  return VIENNA_MONTH.format(date) as Month;
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
    throw new Error(`job ends (${end}) before it starts (${start})`);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years) parts.push(count(years, 'yr'));
  if (rest) parts.push(count(rest, 'mo'));
  return parts.join(' ');
}

/** `Mar 2025`, as on screen. */
export function formatMonth(month: Month): string {
  const { year, month: number } = parseMonth(month);
  return `${MONTH_NAMES[number - 1]} ${year}`;
}

/** `03/2025`, as on the printed CV. */
export function formatMonthNumeric(month: Month): string {
  const { year, month: number } = parseMonth(month);
  return `${String(number).padStart(2, '0')}/${year}`;
}
