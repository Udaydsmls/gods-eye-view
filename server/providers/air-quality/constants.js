/**
 * Grid side length in cells. A request is one Open-Meteo call carrying every
 * cell's coordinate, so the ceiling is the URL length, not the cell count:
 * measured against the live service, 16x16 (256 points) answers in about
 * 0.7 s at a 5.5 kB URL and 20x20 (400 points) answers 414 URI Too Large.
 */
export const AQ_GRID_SIDE_DEFAULT = 12;

export const AQ_GRID_SIDE_MAX = 16;

export const AQ_GRID_SIDE_MIN = 4;

export const AQ_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

/**
 * The upstream is a CAMS forecast on an hourly step, so a shorter TTL buys
 * nothing but load. 11 km over Europe, 45 km globally.
 */
export const AQ_MEMORY_TTL_MS = 30 * 60_000;

export const AQ_STALE_MS = 6 * 60 * 60_000;

export const AQ_MAX_CACHE_ENTRIES = 160;

/** Widest viewport a grid may cover; past this the cells stop meaning anything. */
export const AQ_MAX_BOX_DEGREES = 40;

export const AQ_UPSTREAM =
  'https://air-quality-api.open-meteo.com/v1/air-quality';

export const AQ_UPSTREAM_TIMEOUT_MS = 20_000;

/**
 * Pollutants requested per cell. `us_aqi` is the index the colour scale uses;
 * the component concentrations back the readout so a cell can say what drove
 * its number rather than only showing the composite.
 */
export const AQ_VARIABLES = Object.freeze([
  'us_aqi',
  'pm2_5',
  'pm10',
  'ozone',
  'nitrogen_dioxide',
  'sulphur_dioxide',
  'carbon_monoxide',
]);
