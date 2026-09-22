import { TEMPERATURE_BANDS } from './policy.js';

/**
 * The band a temperature falls in.
 *
 * Returns null for a missing value rather than the first band: 0 °C is a real
 * temperature, so "not modelled" must not collapse into the freezing band.
 * @param {?number} celsius Air temperature.
 * @returns {?{maxC:number, label:string, color:string}} Band, or null.
 */
export function temperatureBand(celsius) {
  if (!Number.isFinite(celsius)) return null;
  return TEMPERATURE_BANDS.find((band) => celsius <= band.maxC) || null;
}

/** @param {?number} celsius Air temperature. @returns {?string} Band colour, or null. */
export function temperatureColor(celsius) {
  return temperatureBand(celsius)?.color ?? null;
}

/**
 * Format a temperature for a readout.
 *
 * One decimal, which is the precision the upstream reports. A missing value
 * says so rather than printing a dash that could be read as zero.
 * @param {?number} celsius Air temperature.
 * @returns {string} Display text.
 */
export function formatTemperature(celsius) {
  if (!Number.isFinite(celsius)) return 'Not modelled';
  return `${celsius.toFixed(1)} °C`;
}

/**
 * Per-band cell tally for the layer-row legend.
 *
 * Only bands present are returned, in scale order. The labels carry the actual
 * degree bounds because this ramp is a presentation choice rather than a
 * published standard — the reader has to be able to check a colour against a
 * number.
 * @param {Array<object>} cells Grid cells.
 * @returns {Array<{label:string, color:string, count:number, blurb:string}>} Legend entries.
 */
export function temperatureLegend(cells) {
  const list = Array.isArray(cells) ? cells : [];
  const counts = new Map();
  for (const cell of list) {
    const band = temperatureBand(cell?.temperatureC);
    if (!band) continue;
    counts.set(band.label, (counts.get(band.label) || 0) + 1);
  }
  const entries = [];
  for (const band of TEMPERATURE_BANDS) {
    const count = counts.get(band.label) || 0;
    if (!count) continue;
    entries.push({
      label: `${band.label}°`,
      color: band.color,
      count,
      blurb: `${band.label} °C — ${count} cells in view`,
    });
  }
  return entries;
}

/**
 * Summarise a grid for the panel readout.
 *
 * Reports the extremes rather than a mean: an average over a viewport hides the
 * hot and cold ends, which are the parts worth looking at.
 * @param {Array<object>} cells Grid cells.
 * @returns {{modelled:number, total:number, min:?number, max:?number}} Summary.
 */
export function summarizeGrid(cells) {
  const list = Array.isArray(cells) ? cells : [];
  const values = list
    .map((cell) => cell?.temperatureC)
    .filter((value) => Number.isFinite(value));
  return {
    modelled: values.length,
    total: list.length,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
  };
}
