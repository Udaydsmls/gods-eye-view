import { createState } from './state.js';
import { createRendering } from './rendering.js';
import { createSampling } from './sampling.js';
import { createIngestion } from './ingestion.js';
import { createViewport } from './viewport.js';
import { createControls } from './controls.js';
import { createLifecycle } from './lifecycle.js';

/** Construct the air-temperature grid layer with a supplied model source. */
export function createAirTemperatureLayer({ services, source }) {
  if (typeof source?.getGrid !== 'function')
    throw new TypeError('An air-temperature source is required');
  const state = createState();
  const parts = {};
  const context = { state, services, parts, source };
  parts.rendering = createRendering(context);
  parts.sampling = createSampling(context);
  parts.ingestion = createIngestion(context);
  parts.viewport = createViewport(context);
  parts.controls = createControls(context);
  parts.lifecycle = createLifecycle(context);
  return Object.assign(
    {},
    parts.controls.methods,
    parts.lifecycle.methods,
    parts.ingestion.methods,
    { airTemperatureRetryDelayMs: parts.viewport.airTemperatureRetryDelayMs },
  );
}
export { createAirTemperatureSource } from './source.js';
