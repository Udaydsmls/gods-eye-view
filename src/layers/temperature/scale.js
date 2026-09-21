/**
 * Representative stops from NASA's published colour map for this product,
 * fetched from
 * `https://gibs.earthdata.nasa.gov/colormaps/v1.0/MODIS_Land_Surface_Temp.xml`
 * (the colour map the layer's WMTS capabilities entry points at) and sampled on
 * 2026-09-21.
 *
 * The full map has 252 stops from 200 K to 350 K, which is far more than a row
 * legend can show, so these are the nearest published stop to each round value.
 * The colours are NASA's, read off that document rather than approximated —
 * a legend whose swatches do not match the tiles is worse than no legend.
 *
 * `units="K"` in the source document; the labels are Celsius because that is
 * what the operator reads, and the conversion is exact.
 */
export const TEMPERATURE_STOPS = Object.freeze([
  Object.freeze({ kelvin: 200, color: 'rgb(197,0,255)' }),
  Object.freeze({ kelvin: 225, color: 'rgb(29,0,255)' }),
  Object.freeze({ kelvin: 250, color: 'rgb(0,179,255)' }),
  Object.freeze({ kelvin: 273.15, color: 'rgb(91,255,43)' }),
  Object.freeze({ kelvin: 290, color: 'rgb(197,255,0)' }),
  Object.freeze({ kelvin: 310, color: 'rgb(255,205,0)' }),
  Object.freeze({ kelvin: 330, color: 'rgb(255,100,0)' }),
  Object.freeze({ kelvin: 350, color: 'rgb(255,1,0)' }),
]);

const ZERO_CELSIUS_K = 273.15;

/** @param {number} kelvin Absolute temperature. @returns {number} Degrees Celsius. */
export function kelvinToCelsius(kelvin) {
  return kelvin - ZERO_CELSIUS_K;
}

/**
 * The colour scale for the layer row.
 *
 * Entries carry no count: this is a continuous ramp, not a tally of records,
 * and the ends are labelled as bounds because the product clamps everything
 * below 200 K and above 350 K into its first and last stop.
 * @returns {Array<{label:string, color:string, blurb:string}>} Legend entries.
 */
export function temperatureLegend() {
  const last = TEMPERATURE_STOPS.length - 1;
  return TEMPERATURE_STOPS.map((stop, index) => {
    const celsius = Math.round(kelvinToCelsius(stop.kelvin));
    const bound = index === 0 ? '≤ ' : index === last ? '≥ ' : '';
    return {
      label: `${bound}${celsius}°`,
      color: stop.color,
      blurb: `${bound}${celsius} °C (${stop.kelvin} K) — NASA MODIS land surface temperature scale`,
    };
  });
}
