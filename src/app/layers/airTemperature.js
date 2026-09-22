import { createAirTemperatureLayer } from '../../layers/airTemperature/index.js';
import * as render from '../../renderGovernor.js';
import * as context from '../../data/contextStore.js';

/** Construct the air-temperature layer using the application scene owners. */
export function createApplicationAirTemperature({ source }) {
  return createAirTemperatureLayer({ source, services: { render, context } });
}
