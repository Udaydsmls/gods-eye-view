import { DEFAULT_ALPHA } from './policy.js';

export function createState() {
  return {
    viewer: null,
    enabled: false,
    /** Cesium ImageryLayer this layer owns, or null while not rendered. */
    imageryLayer: null,
    /** Resolved composite date the rendered overlay is showing. */
    date: null,
    alpha: DEFAULT_ALPHA,
    status: 'idle',
    error: null,
    loading: false,
    lastUpdate: null,
    failureReason: null,
    abort: null,
    /**
     * Click-to-read state. The readout lives on its own data source so
     * clearing a reading never disturbs the imagery overlay, and its abort
     * controller is separate so a new click supersedes only the previous
     * sample, not the composite resolution.
     */
    sampleDataSource: null,
    sample: null,
    sampling: false,
    sampleAbort: null,
    clickHandler: null,
  };
}
