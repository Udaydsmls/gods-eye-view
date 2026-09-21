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
  };
}
