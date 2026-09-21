import { freshnessLabel } from './dates.js';
import { temperatureLegend } from './scale.js';
import { COVERAGE_NOTE, DEFAULT_ALPHA, LAYER_ID } from './policy.js';

export function createControls({ state: layerState, services, parts }) {
  const methods = {
    id: LAYER_ID,

    name: 'Surface Temperature',

    icon: '🌡️',

    source: 'NASA GIBS · MODIS Terra land surface temperature',

    /** One resolved composite per enable; nothing to poll. */
    updateInterval: 0,

    statsRefreshInterval: 2000,

    defaultAlpha: DEFAULT_ALPHA,

    /**
     * The colour scale, rendered beside the map on this layer's row.
     *
     * A heat map is unreadable without its key: NASA bakes the ramp into the
     * tiles, so nothing on screen says what a colour means until the scale is
     * shown. Uses the manager's existing row-controls contract, so no new panel
     * is introduced.
     * @returns {{chips: Array<object>, legend: Array<object>}} Row controls.
     */
    getRowControls() {
      // Nothing is painted while no composite is attached, and a scale for an
      // absent overlay describes nothing.
      if (!layerState.imageryLayer) return { chips: [], legend: [] };
      return { chips: [], legend: temperatureLegend() };
    },

    /**
     * Set overlay opacity.
     * @param {number} value Requested opacity between MIN_ALPHA and MAX_ALPHA.
     * @returns {number} Applied opacity.
     */
    setOpacity(value) {
      return parts.rendering.setAlpha(value);
    },

    getOpacity() {
      return layerState.alpha;
    },

    getStats() {
      const now = Date.now();
      return {
        // An imagery overlay has no records. Report 1 while a composite is
        // attached so the panel row reads as active rather than as empty.
        count: layerState.imageryLayer ? 1 : 0,
        lastUpdate: layerState.lastUpdate,
        status: layerState.status,
        loading: layerState.loading,
        error: layerState.error,
        failureReason: layerState.failureReason,
        compositeDate: layerState.date,
        opacity: layerState.alpha,
        coverage: COVERAGE_NOTE,
        statusMessage: layerState.loading
          ? 'Resolving temperature composite…'
          : layerState.status === 'unavailable'
            ? layerState.error || 'NASA GIBS unavailable'
            : layerState.status === 'empty'
              ? 'No published composite in the last week'
              : layerState.status === 'idle'
                ? 'Temperature overlay off'
                : freshnessLabel(layerState.date, now),
        loadingLabel: layerState.loading
          ? 'resolving temperature composite'
          : '',
      };
    },
  };

  return { methods };
}
