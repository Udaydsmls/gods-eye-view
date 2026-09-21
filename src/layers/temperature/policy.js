export const LAYER_ID = 'surface-temperature';

/**
 * MODIS Terra daytime land-surface temperature, 8-day composite.
 *
 * The 8-day product, not the daily one. A single day from a single satellite is
 * swath-gapped and clear-sky-only, which on the globe reads as scattered
 * patches rather than a temperature field — measured on the same tile, the
 * daily image carried 23.5 kB against the composite's 42.5 kB. Compositing
 * fills the gaps at the cost of being an average over its window, which the
 * readout says.
 *
 * GIBS bakes the colour ramp into the PNG — cold blues through hot reds — so
 * the globe gets a real heat map without the client inventing a scale.
 */
export const GIBS_LAYER = 'MODIS_Terra_L3_Land_Surface_Temp_8Day_Day';

export const COMPOSITE_PERIOD_DAYS = 8;

export const GIBS_TILE_MATRIX_SET = 'GoogleMapsCompatible_Level7';

/**
 * Deepest level GoogleMapsCompatible_Level7 defines, read from the EPSG:3857
 * capabilities: levels 0..7, 1x1 through 128x128, 256 px tiles. Asking beyond
 * it answers 400 on every tile.
 */
export const GIBS_MAX_LEVEL = 7;

/**
 * How many composite periods back to try.
 *
 * GIBS answers a date inside an unpublished period with 404, and the newest
 * period is routinely still processing, so this has to cover more than one
 * period: three gives roughly three and a half weeks of slack.
 */
export const PERIOD_LOOKBACK = 3;

/** Deadline for one availability probe before it is treated as unavailable. */
export const PROBE_TIMEOUT_MS = 8000;

/** Probe tile used to decide whether a candidate date is published. */
export const PROBE_TILE = Object.freeze({ level: 2, row: 1, col: 2 });

export const DEFAULT_ALPHA = 0.7;

export const MIN_ALPHA = 0.1;

export const MAX_ALPHA = 1;

/**
 * The retrieval is a clear-sky land product: cloud and water carry no value and
 * arrive transparent. Say so rather than letting a gap read as "temperate".
 */
export const COVERAGE_NOTE =
  '8-day clear-sky land average; cloud-persistent areas and water carry no value';

/**
 * NASA's published colour map for this product, the document the layer's WMTS
 * capabilities entry points at. Note the name is the product family, not the
 * layer id. Fetched at first sample and parsed once; it is what makes a pixel
 * readable as a temperature rather than a guess.
 */
export const COLORMAP_URL =
  'https://gibs.earthdata.nasa.gov/colormaps/v1.0/MODIS_Land_Surface_Temp.xml';

/** Sampled tiles held in memory; a run of clicks in one area reuses one tile. */
export const SAMPLE_TILE_CACHE_MAX = 12;

/** Marker for the sampled point, distinct from the overlay it reads. */
export const SAMPLE_MARKER_COLOR = '#ffffff';
