import { createAirQualityLayer } from '../../layers/airQuality/index.js';
import * as render from '../../renderGovernor.js';
import * as context from '../../data/contextStore.js';

/** Construct the air-quality layer using the application scene owners. */
export function createApplicationAirQuality({ source }) {
  return createAirQualityLayer({ source, services: { render, context } });
}
