import { describe, expect, test } from 'bun:test';
import { fillableDensities } from '../src/lib/image';

// The CV photo box: 112×140 CSS px.
const box = { width: 112, height: 140 };

describe('fillableDensities', () => {
  test('lists 1x, 2x and 3x once the source fills the box three times over', () => {
    expect(fillableDensities({ width: 336, height: 420 }, box)).toEqual([
      1, 2, 3,
    ]);
    expect(fillableDensities({ width: 2000, height: 3000 }, box)).toEqual([
      1, 2, 3,
    ]);
  });

  test('drops densities the source would have to be upscaled for, in either dimension', () => {
    expect(fillableDensities({ width: 335, height: 420 }, box)).toEqual([1, 2]);
    expect(fillableDensities({ width: 336, height: 419 }, box)).toEqual([1, 2]);
    expect(fillableDensities({ width: 224, height: 280 }, box)).toEqual([1, 2]);
    // A 200×200 source fills neither 224 wide nor 280 high.
    expect(fillableDensities({ width: 200, height: 200 }, box)).toEqual([1]);
  });

  test('keeps 1x for an undersized source, so the photo still renders', () => {
    expect(fillableDensities({ width: 50, height: 50 }, box)).toEqual([1]);
  });
});
