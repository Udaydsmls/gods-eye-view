import { createGibsImagery } from '../../maps/imagery.js';
import {
  GIBS_LAYER,
  GIBS_MAX_LEVEL,
  GIBS_TILE_MATRIX_SET,
  MAX_ALPHA,
  MIN_ALPHA,
} from './policy.js';

export function createRendering({ state: layerState, services, parts }) {
  const { governorRequestRender } = services.render;

  /**
   * Attach the overlay above the basemap.
   *
   * `addImageryProvider` appends, and MapSourceController inserts its basemap
   * at index 0 and only ever removes its own layer — so this overlay survives a
   * basemap switch and always composites on top of whichever stack is active.
   * @param {string} date Resolved composite date.
   * @returns {void}
   */

  function attach(date) {
    detach();
    if (!layerState.viewer) return;
    const provider = createGibsImagery({
      layer: GIBS_LAYER,
      date,
      tileMatrixSet: GIBS_TILE_MATRIX_SET,
      maximumLevel: GIBS_MAX_LEVEL,
    });
    layerState.imageryLayer =
      layerState.viewer.imageryLayers.addImageryProvider(provider);
    layerState.imageryLayer.alpha = layerState.alpha;
    layerState.date = date;
    // A reading belongs to the composite it was taken from. Dropping it on
    // attach stops yesterday's number sitting over today's imagery.
    parts.sampling.clearReadout();
    governorRequestRender('temperature-attach');
  }

  function detach() {
    if (!layerState.imageryLayer) return;
    // Destroy the layer with it; leaving the provider alive keeps its tile
    // requests in flight after the operator switched the layer off.
    layerState.viewer?.imageryLayers?.remove(layerState.imageryLayer, true);
    layerState.imageryLayer = null;
    layerState.date = null;
    governorRequestRender('temperature-detach');
  }

  /** @param {number} value Requested opacity. @returns {number} Applied opacity. */

  function setAlpha(value) {
    const alpha = Math.min(
      MAX_ALPHA,
      Math.max(MIN_ALPHA, Number.isFinite(value) ? value : layerState.alpha),
    );
    layerState.alpha = alpha;
    if (layerState.imageryLayer) layerState.imageryLayer.alpha = alpha;
    governorRequestRender('temperature-alpha');
    return alpha;
  }

  return { attach, detach, setAlpha };
}
