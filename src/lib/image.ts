/** Build-time image sizing. Pure: no Astro. */

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** Highest `srcset` density offered (#28: 1x, 2x and 3x). */
const MAX_DENSITY = 3;

/**
 * Pixel densities (1x up to 3x) at which `source` fills `box` without upscaling, for a `srcset`.
 * 1x is always included, so an undersized source still renders; it is then scaled up by the browser.
 */
export function fillableDensities(source: Size, box: Size): number[] {
  const densities = [1];
  for (let d = 2; d <= MAX_DENSITY; d++) {
    if (box.width * d > source.width || box.height * d > source.height) break;
    densities.push(d);
  }
  return densities;
}
