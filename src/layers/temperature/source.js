import { candidatePeriods } from './dates.js';
import {
  GIBS_LAYER,
  GIBS_TILE_MATRIX_SET,
  PROBE_TILE,
  PERIOD_LOOKBACK,
} from './policy.js';

/** @param {string} date ISO composite date. @returns {string} Probe tile URL. */
export function probeTileUrl(date) {
  const { level, row, col } = PROBE_TILE;
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${GIBS_LAYER}/default/${date}/${GIBS_TILE_MATRIX_SET}/${level}/${row}/${col}.png`;
}

/**
 * Resolve the newest published composite period.
 *
 * GIBS answers a date inside an unpublished period with 404 rather than an
 * empty tile, so Cesium cannot discover this for us — an unpublished date
 * yields a silent, wholly blank overlay. One cheap tile probe per candidate
 * settles it before any provider is constructed.
 * @param {{probeImpl:Function}} options Injected tile probe; see ./probe.js for the
 *   browser implementation, which this module cannot hold because it is a
 *   portable export and may not touch browser globals.
 * @returns {{resolveDate:Function}} Temperature composite source.
 */
export function createTemperatureSource({ probeImpl } = {}) {
  if (typeof probeImpl !== 'function')
    throw new TypeError('A tile availability probe is required');
  return {
    async resolveDate({
      now = Date.now(),
      periods = PERIOD_LOOKBACK,
      signal,
    } = {}) {
      const candidates = candidatePeriods(now, periods);
      for (const date of candidates) {
        signal?.throwIfAborted();
        const available = await probeImpl(probeTileUrl(date), { signal });
        signal?.throwIfAborted();
        if (available)
          return { date, candidatesTried: candidates.indexOf(date) + 1 };
      }
      throw Object.assign(
        new Error(
          `No temperature composite reachable in the last ${candidates.length} periods`,
        ),
        { failureReason: 'unavailable' },
      );
    },
  };
}
