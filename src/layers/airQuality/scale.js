import { AQI_BANDS } from './policy.js';

/**
 * The EPA band an index value falls in.
 *
 * Returns null for a null index rather than the first band: a cell the model
 * does not cover must not render as "Good".
 * @param {?number} aqi US AQI value.
 * @returns {?{max:number, label:string, color:string}} Band, or null.
 */
export function aqiBand(aqi) {
  if (!Number.isFinite(aqi) || aqi < 0) return null;
  return AQI_BANDS.find((band) => aqi <= band.max) || null;
}

/** @param {?number} aqi US AQI value. @returns {?string} Band colour, or null. */
export function aqiColor(aqi) {
  return aqiBand(aqi)?.color ?? null;
}

/** @param {?number} aqi US AQI value. @returns {string} Band label. */
export function aqiLabel(aqi) {
  return aqiBand(aqi)?.label ?? 'Not modelled';
}

/**
 * Summarize a grid for the panel readout.
 *
 * Reports the worst band present alongside the count, because an average over a
 * viewport hides exactly the local peak an operator is looking for.
 * @param {Array<object>} cells Grid cells.
 * @returns {{modelled:number, total:number, peak:?number, peakLabel:string}} Summary.
 */
export function summarizeGrid(cells) {
  const list = Array.isArray(cells) ? cells : [];
  const values = list
    .map((cell) => cell?.aqi)
    .filter((aqi) => Number.isFinite(aqi));
  const peak = values.length ? Math.max(...values) : null;
  return {
    modelled: values.length,
    total: list.length,
    peak,
    peakLabel: aqiLabel(peak),
  };
}

/**
 * Per-band cell tally for the layer-row legend.
 *
 * Only bands actually present are returned, so the scale beside the map shows
 * what is in view rather than a fixed six-swatch key that is mostly empty. The
 * order follows AQI_BANDS, which is the published EPA order — a legend sorted
 * by count would reshuffle as the camera moves and stop being learnable.
 * @param {Array<object>} cells Grid cells.
 * @returns {Array<{label:string, color:string, count:number, blurb:string}>} Legend entries.
 */
export function aqiLegend(cells) {
  const list = Array.isArray(cells) ? cells : [];
  const counts = new Map();
  for (const cell of list) {
    const band = aqiBand(cell?.aqi);
    if (!band) continue;
    counts.set(band.label, (counts.get(band.label) || 0) + 1);
  }
  const entries = [];
  let floor = 0;
  for (const band of AQI_BANDS) {
    const count = counts.get(band.label) || 0;
    const range = band.max === Infinity ? `${floor}+` : `${floor}-${band.max}`;
    floor = band.max + 1;
    if (!count) continue;
    entries.push({
      label: `${range}`,
      color: band.color,
      count,
      blurb: `US AQI ${range} — ${band.label} (${count} cells in view)`,
    });
  }
  return entries;
}
