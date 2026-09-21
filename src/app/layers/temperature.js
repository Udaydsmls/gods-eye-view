import { createTemperatureLayer } from '../../layers/temperature/index.js';
import * as render from '../../renderGovernor.js';

/** Wire the surface-temperature overlay to the application render governor. */
export function createApplicationTemperature({ source }) {
  return createTemperatureLayer({ source, services: { render } });
}
