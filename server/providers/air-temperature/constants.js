/**
 * Grid side in cells. One request carries every cell's coordinate, so the
 * ceiling is URL length rather than cell count: measured against the live
 * service, 16x16 (256 points) answers at a 5.7 kB URL and 20x20 (400 points)
 * answers 414 URI Too Large.
 */
export const AT_GRID_SIDE_DEFAULT = 12;

export const AT_GRID_SIDE_MAX = 16;

export const AT_GRID_SIDE_MIN = 4;

export const AT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

/**
 * The upstream advances hourly, so a shorter TTL buys nothing but load. Short
 * enough that "current" stays current within the hour it claims.
 */
export const AT_MEMORY_TTL_MS = 15 * 60_000;

export const AT_STALE_MS = 3 * 60 * 60_000;

export const AT_MAX_CACHE_ENTRIES = 160;

/** Widest viewport a grid may cover before a cell stops meaning anything local. */
export const AT_MAX_BOX_DEGREES = 60;

export const AT_UPSTREAM = 'https://api.open-meteo.com/v1/forecast';

export const AT_UPSTREAM_TIMEOUT_MS = 20_000;

/**
 * Two-metre air temperature — the quantity people mean by "temperature", and
 * deliberately not land surface temperature, which runs tens of degrees hotter
 * in sun. Apparent temperature rides along so a cell can say how it feels as
 * well as what it measures.
 */
export const AT_VARIABLES = Object.freeze([
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'wind_speed_10m',
]);
