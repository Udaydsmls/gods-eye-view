import { GRID_SIDE, MAX_VIEWPORT_DEGREES } from './policy.js';

function validBox(box) {
  const { south, west, north, east } = box || {};
  return (
    [south, west, north, east].every(Number.isFinite) &&
    south >= -90 &&
    north <= 90 &&
    west >= -180 &&
    east <= 180 &&
    north > south &&
    east > west &&
    north - south <= MAX_VIEWPORT_DEGREES &&
    east - west <= MAX_VIEWPORT_DEGREES
  );
}

/**
 * Read a modelled air-quality grid for a viewport.
 *
 * A malformed snapshot throws rather than resolving empty: "the upstream
 * answered with nothing recognisable" and "the model covers nothing here" are
 * different facts and the layer states them differently.
 * @param {{fetchImpl?:Function}} options Injected transport.
 * @returns {{getGrid:Function}} Air-quality source.
 */
export function createAirQualitySource({
  fetchImpl = (...args) => globalThis.fetch(...args),
} = {}) {
  return {
    async getGrid(box, { side = GRID_SIDE, signal } = {}) {
      if (!validBox(box))
        throw new TypeError('A bounded air-quality viewport is required');
      signal?.throwIfAborted();
      const query = new URLSearchParams({
        south: box.south.toFixed(4),
        west: box.west.toFixed(4),
        north: box.north.toFixed(4),
        east: box.east.toFixed(4),
        side: String(side),
      });
      const response = await fetchImpl(`/api/air-quality/grid?${query}`, {
        signal,
      });
      const body = await response.json();
      signal?.throwIfAborted();
      if (!response.ok)
        throw Object.assign(
          new Error(body?.error || `Air quality feed HTTP ${response.status}`),
          {
            failureReason: ['rate_limited', 'timeout', 'query_failed'].includes(
              body?.reason,
            )
              ? body.reason
              : 'unavailable',
          },
        );
      if (!Array.isArray(body?.cells))
        throw new Error('Malformed air-quality grid snapshot');
      return {
        cells: body.cells,
        side: Number(body.side) || side,
        modelledCells: Number(body.modelledCells) || 0,
        status: body.status,
        retrievedAt: body.retrievedAt || null,
      };
    },
  };
}
