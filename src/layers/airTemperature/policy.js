export const LAYER_ID = 'air-temperature';

export const REQUEST_DEBOUNCE_MS = 700;

/**
 * Widest viewport a grid may cover. Generous because the cost is one upstream
 * call regardless of area, but past this a cell spans a continent-scale band
 * and its colour stops meaning anything local.
 */
export const MAX_VIEWPORT_DEGREES = 60;

export const GRID_SIDE = 12;

export const DEFAULT_ALPHA = 0.4;

export const MIN_ALPHA = 0.1;

export const MAX_ALPHA = 0.9;

/**
 * Colour ramp for two-metre air temperature, in degrees Celsius.
 *
 * Unlike the AQI bands (a published EPA scale) or the land-surface overlay
 * (NASA's own ramp baked into the tiles), there is no standard colour scale for
 * air temperature — **this one is a presentation choice made here**. That is
 * why the legend carries the actual numbers rather than words: the colours are
 * an encoding the reader can check against the scale, not an authority.
 *
 * Blue below freezing through red at heat-wave temperatures, with the break at
 * 0 °C on a colour boundary so freezing is legible at a glance.
 */
export const TEMPERATURE_BANDS = Object.freeze([
  Object.freeze({ maxC: -20, label: '≤ -20', color: '#5b2c8f' }),
  Object.freeze({ maxC: -10, label: '-20 to -10', color: '#3b4cc0' }),
  Object.freeze({ maxC: 0, label: '-10 to 0', color: '#6f9bd8' }),
  Object.freeze({ maxC: 10, label: '0 to 10', color: '#a8cfe8' }),
  Object.freeze({ maxC: 20, label: '10 to 20', color: '#f2e6a0' }),
  Object.freeze({ maxC: 30, label: '20 to 30', color: '#f0b05a' }),
  Object.freeze({ maxC: 40, label: '30 to 40', color: '#dd6b3f' }),
  Object.freeze({ maxC: Infinity, label: '≥ 40', color: '#9e1b1b' }),
]);

export const DEFAULT_COLOR = '#9ca6b0';

/**
 * Two-metre air temperature from a forecast model, not a station reading and
 * not the ground. Stated because the difference from land surface temperature
 * is tens of degrees in sun, and because a model covers cloud and ocean where a
 * satellite retrieval has nothing.
 */
export const COVERAGE_NOTE =
  'Modelled 2 m air temperature, not a station reading and not ground temperature';
