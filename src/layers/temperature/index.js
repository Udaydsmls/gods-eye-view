import { createState } from './state.js';
import { createRendering } from './rendering.js';
import { createIngestion } from './ingestion.js';
import { createControls } from './controls.js';
import { createLifecycle } from './lifecycle.js';

/** Construct the surface-temperature overlay with a supplied composite source. */
export function createTemperatureLayer({ services, source }) {
  if (typeof source?.resolveDate !== 'function')
    throw new TypeError('A temperature composite source is required');
  const state = createState();
  const parts = {};
  const context = { state, services, parts, source };
  parts.rendering = createRendering(context);
  parts.ingestion = createIngestion(context);
  parts.controls = createControls(context);
  parts.lifecycle = createLifecycle(context);
  return Object.assign(
    {},
    parts.controls.methods,
    parts.lifecycle.methods,
    parts.ingestion.methods,
  );
}
export { createTemperatureSource } from './source.js';
