import {
  formatTemperature,
  summarizeGrid,
  temperatureLegend,
} from './scale.js';
import {
  COVERAGE_NOTE,
  DEFAULT_ALPHA,
  LAYER_ID,
  TEMPERATURE_BANDS,
} from './policy.js';

export function createControls({ state: layerState, parts }) {
  const methods = {
    id: LAYER_ID,

    name: 'Air Temperature',

    icon: '🌡️',

    source: 'Open-Meteo · 2 m air temperature',

    /** Camera-driven, like the other viewport-bounded layers. */
    updateInterval: 0,

    statsRefreshInterval: 1500,

    temperatureBands: TEMPERATURE_BANDS,

    defaultAlpha: DEFAULT_ALPHA,

    /**
     * The colour scale, rendered beside the map on this layer's row.
     *
     * The labels carry degree bounds rather than words because this ramp is a
     * presentation choice made here, not a published standard — the reader has
     * to be able to check a colour against a number.
     * @returns {{chips: Array<object>, legend: Array<object>}} Row controls.
     */
    getRowControls() {
      return { chips: [], legend: temperatureLegend(layerState.cells) };
    },

    setOpacity(value) {
      return parts.rendering.setAlpha(value);
    },

    getOpacity() {
      return layerState.alpha;
    },

    getStats() {
      const summary = summarizeGrid(layerState.cells);
      let statusMessage;
      if (layerState.loading) statusMessage = 'Sampling air temperature…';
      else if (layerState.status === 'unavailable')
        statusMessage = layerState.error || 'Air temperature unavailable';
      else if (layerState.status === 'zoom-in')
        statusMessage = 'Zoom in to sample air temperature';
      else if (layerState.status === 'idle')
        statusMessage = 'Air temperature grid not loaded';
      else if (layerState.status === 'empty')
        statusMessage = 'Model covers no cell in this view';
      else if (layerState.stale) statusMessage = 'Showing cached model output';
      else
        statusMessage = `${formatTemperature(summary.min)} to ${formatTemperature(summary.max)} in view`;
      return {
        // Modelled cells, not the grid total: an unmodelled cell is not a datum.
        count: summary.modelled,
        lastUpdate: layerState.lastUpdate,
        status: layerState.status,
        stale: layerState.stale,
        loading: layerState.loading,
        error: layerState.error,
        failureReason: layerState.failureReason,
        retryAt: layerState.retryAt,
        retrying: layerState.loading && Boolean(layerState.failureReason),
        gridSide: layerState.side,
        /** Extremes, not a mean: an average hides the ends worth looking at. */
        minC: summary.min,
        maxC: summary.max,
        observedAt: layerState.observedAt,
        opacity: layerState.alpha,
        coverage: COVERAGE_NOTE,
        statusMessage,
        loadingLabel: layerState.loading ? 'sampling air temperature' : '',
      };
    },
  };

  return { methods };
}
