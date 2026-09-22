import { requiredFiniteQueryNumber } from '../common/query.js';
import {
  AT_GRID_SIDE_DEFAULT,
  AT_GRID_SIDE_MAX,
  AT_GRID_SIDE_MIN,
  AT_MAX_BOX_DEGREES,
} from './constants.js';

/** Snap size for the shared cache grid, in degrees. */
const QUANTIZE_DEGREES = 0.5;

/**
 * Read a bounded, non-dateline viewport from request parameters.
 * @param {URLSearchParams} params Request query parameters.
 * @returns {?{south:number, west:number, north:number, east:number}} Box, or null when invalid.
 */
export function validAirTemperatureBox(params) {
  const south = requiredFiniteQueryNumber(params, 'south');
  const west = requiredFiniteQueryNumber(params, 'west');
  const north = requiredFiniteQueryNumber(params, 'north');
  const east = requiredFiniteQueryNumber(params, 'east');
  if (![south, west, north, east].every(Number.isFinite)) return null;
  if (south < -90 || north > 90 || west < -180 || east > 180) return null;
  if (north <= south || east <= west) return null;
  if (north - south > AT_MAX_BOX_DEGREES || east - west > AT_MAX_BOX_DEGREES)
    return null;
  return { south, west, north, east };
}

/** @param {?string} value Requested side. @returns {number} Clamped grid side. */
export function resolveGridSide(value) {
  if (value === null || value === undefined || String(value).trim() === '')
    return AT_GRID_SIDE_DEFAULT;
  const side = Number(value);
  if (!Number.isFinite(side)) return AT_GRID_SIDE_DEFAULT;
  return Math.min(
    AT_GRID_SIDE_MAX,
    Math.max(AT_GRID_SIDE_MIN, Math.round(side)),
  );
}

/**
 * Snap a viewport outward onto a shared grid so neighbouring views reuse one
 * cache entry. An outward snap always covers what was asked for.
 * @param {{south:number, west:number, north:number, east:number}} box Requested viewport.
 * @returns {{south:number, west:number, north:number, east:number}} Snapped viewport.
 */
export function quantizeAirTemperatureBox(box) {
  const floor = (v) => Math.floor(v / QUANTIZE_DEGREES) * QUANTIZE_DEGREES;
  const ceil = (v) => Math.ceil(v / QUANTIZE_DEGREES) * QUANTIZE_DEGREES;
  return {
    south: Math.max(-90, floor(box.south)),
    west: Math.max(-180, floor(box.west)),
    north: Math.min(90, ceil(box.north)),
    east: Math.min(180, ceil(box.east)),
  };
}

/** @param {object} box Viewport. @param {number} side Grid side. @returns {string} Cache key. */
export function airTemperatureCacheKey(box, side) {
  return [box.south, box.west, box.north, box.east]
    .map((v) => v.toFixed(2))
    .concat(String(side))
    .join(',');
}

/**
 * Cell centres for a grid covering the box.
 *
 * Samples cell CENTRES rather than corners: a cell is drawn as a rectangle and
 * its colour stands for the whole rectangle, so the sample belongs in the
 * middle of what it colours.
 * @param {{south:number, west:number, north:number, east:number}} box Viewport.
 * @param {number} side Cells per axis.
 * @returns {Array<object>} Cells with centre and bounds.
 */
export function gridCells(box, side) {
  const latStep = (box.north - box.south) / side;
  const lonStep = (box.east - box.west) / side;
  const cells = [];
  for (let row = 0; row < side; row += 1) {
    for (let col = 0; col < side; col += 1) {
      const south = box.south + row * latStep;
      const west = box.west + col * lonStep;
      cells.push({
        latitude: Number((south + latStep / 2).toFixed(4)),
        longitude: Number((west + lonStep / 2).toFixed(4)),
        south: Number(south.toFixed(4)),
        west: Number(west.toFixed(4)),
        north: Number((south + latStep).toFixed(4)),
        east: Number((west + lonStep).toFixed(4)),
      });
    }
  }
  return cells;
}

/** @param {?Error} error Upstream failure. @returns {string} Stable client reason code. */
export function airTemperatureFailureReason(error) {
  const reason = error?.airTemperatureReason;
  return ['rate_limited', 'timeout', 'query_failed'].includes(reason)
    ? reason
    : 'unavailable';
}
