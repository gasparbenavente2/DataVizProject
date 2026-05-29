// Shared sentiment → color scale, used by the map, the avg-sentiment HUD and the legend.
// Dark navy (no/neutral coverage) → red (negative) or green (positive).
// The negative side ramps harder and reaches a deeper, more saturated red so that
// "worse" sentiment reads as visibly worse, not just slightly off-neutral.

// 0 so a tone of 0 is truly neutral (navy) — no red/green tint at the baseline.
export const COLOR_FLOOR = 0;
export const NO_COVERAGE = '#0d1b2e';

const lerp = (a: number, b: number, t: number) => Math.round(a + t * (b - a));

// Map a tone magnitude (>=0) to a 0..1 color intensity. Most countries sit within
// ±1, so we spend ~75% of the color range there (high contrast), then crawl from
// ±1 out to ±5 with the remaining 25% (compressed tails).
const BAND = 1;          // the high-contrast inner range, ±1
const TAIL = 4;          // how far past the band until full saturation (1 → 5)
function intensity(mag: number): number {
  const inner = Math.pow(Math.min(1, mag / BAND), 0.7);             // fast within the band
  const outer = Math.min(1, Math.max(0, (mag - BAND) / TAIL));      // slow beyond it
  const shape = 0.75 * inner + 0.25 * outer;
  return COLOR_FLOOR + (1 - COLOR_FLOOR) * shape;
}

export function sentimentColor(tone: number | null, count: number): string {
  if (count === 0 || tone === null) return NO_COVERAGE;
  const t = Math.max(-10, Math.min(10, tone));
  const ratio = intensity(Math.abs(t));

  if (t < 0) {
    // dark navy → deep crimson
    return `rgb(${lerp(13, 200, ratio)},${lerp(27, 18, ratio)},${lerp(46, 28, ratio)})`;
  }
  // dark navy → green
  return `rgb(${lerp(13, 34, ratio)},${lerp(27, 197, ratio)},${lerp(46, 94, ratio)})`;
}
