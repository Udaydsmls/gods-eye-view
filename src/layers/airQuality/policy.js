export const LAYER_ID = 'air-quality';

export const REQUEST_DEBOUNCE_MS = 700;

/**
 * Widest viewport a grid may cover. Far more generous than the vector layers
 * because the cost is one upstream call regardless of area — but past this the
 * cells are hundreds of kilometres across and the colour stops meaning
 * anything local.
 */
export const MAX_VIEWPORT_DEGREES = 40;

export const GRID_SIDE = 12;

/**
 * Deliberately light. The grid tiles the whole viewport, so a value that reads
 * well on a single cell becomes an opaque wash across the screen and hides the
 * basemap the colour is supposed to sit over.
 */
export const DEFAULT_ALPHA = 0.28;

export const MIN_ALPHA = 0.1;

export const MAX_ALPHA = 0.9;

/**
 * US EPA Air Quality Index categories, with the agency's own published band
 * colours. Colouring by value is legitimate here in a way it is not for a raw
 * concentration: the AQI *is* a published index whose bands and colours are
 * defined by the EPA, so the scale is cited rather than invented.
 */
export const AQI_BANDS = Object.freeze([
  Object.freeze({ max: 50, label: 'Good', color: '#00e400' }),
  Object.freeze({ max: 100, label: 'Moderate', color: '#ffff00' }),
  Object.freeze({
    max: 150,
    label: 'Unhealthy for sensitive groups',
    color: '#ff7e00',
  }),
  Object.freeze({ max: 200, label: 'Unhealthy', color: '#ff0000' }),
  Object.freeze({ max: 300, label: 'Very unhealthy', color: '#8f3f97' }),
  Object.freeze({ max: Infinity, label: 'Hazardous', color: '#7e0023' }),
]);

/**
 * The upstream is a CAMS forecast on an 11 km European / 45 km global grid, not
 * a station network. A cell is a modelled value for an area, not a measurement
 * of a street, and the readout says so.
 */
export const COVERAGE_NOTE =
  'Modelled CAMS forecast (11 km Europe, 45 km global), not station measurements';
