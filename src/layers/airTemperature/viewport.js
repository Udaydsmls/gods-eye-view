import * as Cesium from 'cesium';
import { MAX_VIEWPORT_DEGREES, REQUEST_DEBOUNCE_MS } from './policy.js';

export function createViewport({ state: layerState, parts }) {
  function viewportBox(viewer) {
    const rectangle = viewer?.camera?.computeViewRectangle(
      viewer.scene.globe.ellipsoid,
    );
    if (!rectangle) return null;
    const south = Cesium.Math.toDegrees(rectangle.south);
    const north = Cesium.Math.toDegrees(rectangle.north);
    const west = Cesium.Math.toDegrees(rectangle.west);
    const east = Cesium.Math.toDegrees(rectangle.east);
    if (
      !Number.isFinite(south + north + west + east) ||
      east <= west ||
      north - south > MAX_VIEWPORT_DEGREES ||
      east - west > MAX_VIEWPORT_DEGREES
    )
      return null;
    return { south, west, north, east };
  }

  /** Backoff for the unavailable-state retry: 30 s doubling to 240 s. */
  function airTemperatureRetryDelayMs(prevDelayMs) {
    const RETRY_MIN_MS = 30000;
    const RETRY_CEIL_MS = 240000;
    if (!Number.isFinite(prevDelayMs) || prevDelayMs <= 0) return RETRY_MIN_MS;
    return Math.min(prevDelayMs * 2, RETRY_CEIL_MS);
  }

  function scheduleUnavailableRetry() {
    if (!layerState.enabled) return;
    clearTimeout(layerState.retryTimer);
    layerState.retryDelayMs = airTemperatureRetryDelayMs(
      layerState.retryDelayMs,
    );
    layerState.retryAt = Date.now() + layerState.retryDelayMs;
    layerState.retryTimer = setTimeout(() => {
      layerState.retryTimer = null;
      layerState.retryAt = 0;
      if (layerState.enabled && !layerState.loading) parts.ingestion.loadGrid();
    }, layerState.retryDelayMs);
  }

  function clearUnavailableRetry({ resetBackoff = true } = {}) {
    clearTimeout(layerState.retryTimer);
    layerState.retryTimer = null;
    layerState.retryAt = 0;
    if (resetBackoff) layerState.retryDelayMs = 0;
  }

  function scheduleLoad() {
    if (!layerState.enabled) return;
    clearUnavailableRetry({ resetBackoff: false });
    clearTimeout(layerState.timer);
    layerState.timer = setTimeout(() => {
      parts.ingestion.loadGrid();
    }, REQUEST_DEBOUNCE_MS);
  }

  return {
    viewportBox,
    airTemperatureRetryDelayMs,
    scheduleUnavailableRetry,
    clearUnavailableRetry,
    scheduleLoad,
  };
}
