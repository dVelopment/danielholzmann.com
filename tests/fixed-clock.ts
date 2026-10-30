// Test-only preload (`bun --preload`): freezes the current time at $FIXED_NOW, so
// tests/site.test.ts can build the site as if at another month. `new Date()`, `Date()`
// and `Date.now()` see the frozen time; dates built from arguments and `instanceof Date`
// behave as usual. Formatting with no date (`Intl.DateTimeFormat().format()`) still sees the real clock.
const RealDate = Date;
const fixed = new RealDate(process.env.FIXED_NOW ?? '').getTime();
if (Number.isNaN(fixed))
  throw new Error('fixed-clock.ts: set FIXED_NOW to an ISO date');

globalThis.Date = new Proxy(RealDate, {
  construct: (target, args, newTarget) =>
    Reflect.construct(target, args.length ? args : [fixed], newTarget),
  apply: () => new RealDate(fixed).toString(),
  get: (target, key, receiver) =>
    key === 'now' ? () => fixed : Reflect.get(target, key, receiver),
});
