// Shared sentiment → color scale, used by the map, the avg-sentiment HUD and the legend.
// Dark navy (no/neutral coverage) → red (negative) or green (positive).
// The negative side ramps harder and reaches a deeper, more saturated red so that
// "worse" sentiment reads as visibly worse, not just slightly off-neutral.

export const COLOR_FLOOR = 0.25; // minimum intensity for any country with coverage
export const NO_COVERAGE = '#0d1b2e';

const lerp = (a: number, b: number, t: number) => Math.round(a + t * (b - a));

export function sentimentColor(tone: number | null, count: number): string {
  if (count === 0 || tone === null) return NO_COVERAGE;
  const t = Math.max(-10, Math.min(10, tone));

  if (t < 0) {
    // -5 (and below) saturates; pow < 1 makes mild negatives already clearly red.
    const norm = Math.min(1, -t / 5);
    const ratio = COLOR_FLOOR + (1 - COLOR_FLOOR) * Math.pow(norm, 0.6);
    // dark navy → deep crimson
    const r = lerp(13, 200, ratio);
    const g = lerp(27, 18, ratio);
    const b = lerp(46, 28, ratio);
    return `rgb(${r},${g},${b})`;
  }

  const norm = Math.min(1, t / 6);
  const ratio = COLOR_FLOOR + (1 - COLOR_FLOOR) * Math.pow(norm, 0.75);
  // dark navy → green
  const r = lerp(13, 34, ratio);
  const g = lerp(27, 197, ratio);
  const b = lerp(46, 94, ratio);
  return `rgb(${r},${g},${b})`;
}
