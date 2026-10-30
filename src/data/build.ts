import { monthOf } from '../lib/experience';

/** Captured once per build: every experience number on the site counts up to this month. */
export const buildMonth = monthOf(new Date());
export const buildYear = Number(buildMonth.slice(0, 4));
