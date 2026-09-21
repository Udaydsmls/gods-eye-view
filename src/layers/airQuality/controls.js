import { aqiLegend, summarizeGrid } from './scale.js';
import { AQI_BANDS, COVERAGE_NOTE, DEFAULT_ALPHA, LAYER_ID } from './policy.js';

export function createControls({ state: layerState, parts }) {
  const methods = {
    id: LAYER_ID,

    name: 'Air Quality',

    icon: '🌫️',

    source: 'Open-Meteo · CAMS air quality forecast',

    /** Camera-driven, like the other viewport-bounded layers. */
    updateInterval: 0,

    statsRefreshInterval: 1500,

    /** EPA legend bands, so a consumer renders the published scale, not a guess. */
    aqiBands: AQI_BANDS,

    defaultAlpha: DEFAULT_ALPHA,

    /**
     * The colour scale, rendered beside the map on this layer's row.
     *
     * A heat map is unreadable without its key: the cell colours mean nothing
     * until the AQI bands they stand for are on screen. Uses the manager's
     * existing row-controls contract, so no new panel is introduced.
     * @returns {{chips: Array<object>, legend: Array<object>}} Row controls.
     */
    getRowControls() {
      return { chips: [], legend: aqiLegend(layerState.cells) };
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
      if (layerState.loading) statusMessage = 'Sampling air quality grid…';
      else if (layerState.status === 'unavailable')
        statusMessage = layerState.error || 'Air quality model unavailable';
      else if (layerState.status === 'zoom-in')
        statusMessage = 'Zoom in to sample air quality';
      else if (layerState.status === 'idle')
        statusMessage = 'Air quality grid not loaded';
      else if (layerState.status === 'empty')
        statusMessage = 'Model covers no cell in this view';
      else if (layerState.stale) statusMessage = 'Showing cached model output';
      else statusMessage = `Peak US AQI ${summary.peak} · ${summary.peakLabel}`;
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
        /**
         * The worst band in view, not an average. Averaging a viewport hides
         * exactly the local peak an operator opened the layer to find.
         */
        peakAqi: summary.peak,
        peakBand: summary.peakLabel,
        opacity: layerState.alpha,
        coverage: COVERAGE_NOTE,
        statusMessage,
        loadingLabel: layerState.loading ? 'sampling air quality grid' : '',
      };
    },
  };

  return { methods };
}
