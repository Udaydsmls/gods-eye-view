import { createState } from './state.js';
import { createRendering } from './rendering.js';
import { createIngestion } from './ingestion.js';
import { createViewport } from './viewport.js';
import { createControls } from './controls.js';
import { createLifecycle } from './lifecycle.js';

/** Construct the air-quality grid layer with a supplied model source. */
export function createAirQualityLayer({ services, source }) {
  if (typeof source?.getGrid !== 'function')
    throw new TypeError('An air-quality source is required');
  const state = createState();
  const parts = {};
  const context = { state, services, parts, source };
  parts.rendering = createRendering(context);
  parts.ingestion = createIngestion(context);
  parts.viewport = createViewport(context);
  parts.controls = createControls(context);
  parts.lifecycle = createLifecycle(context);
  return Object.assign(
    {},
    parts.controls.methods,
    parts.lifecycle.methods,
    parts.ingestion.methods,
    { airQualityRetryDelayMs: parts.viewport.airQualityRetryDelayMs },
  );
}
export { createAirQualitySource } from './source.js';
