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
