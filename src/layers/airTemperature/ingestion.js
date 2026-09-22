import { GRID_SIDE } from './policy.js';

export function createIngestion({
  state: layerState,
  services,
  parts,
  source,
}) {
  const { governorRequestRender } = services.render;

  function setStatus(status, error = null) {
    if (layerState.status === status && layerState.error === error) return;
    layerState.status = status;
    layerState.error = error;
    governorRequestRender('air-temperature-status');
  }

  async function loadGrid() {
    if (!layerState.enabled || !layerState.viewer) return;
    const box = parts.viewport.viewportBox(layerState.viewer);
    // Guidance, not a fault: the view is unbounded, or wider than a grid whose
    // cells would still mean something locally.
    if (!box) {
      layerState.abort?.abort();
      layerState.abort = null;
      layerState.loading = false;
      parts.viewport.clearUnavailableRetry();
      setStatus('zoom-in');
      return;
    }
    layerState.abort?.abort();
    const requestAbort = new AbortController();
    layerState.abort = requestAbort;
    layerState.loading = true;
    parts.viewport.clearUnavailableRetry({ resetBackoff: false });
    setStatus('loading');
    try {
      const payload = await source.getGrid(box, {
        side: GRID_SIDE,
        signal: requestAbort.signal,
      });
      if (
        requestAbort.signal.aborted ||
        layerState.abort !== requestAbort ||
        !layerState.enabled
      )
        return;
      layerState.cells = payload.cells;
      layerState.side = payload.side;
      layerState.modelledCells = payload.modelledCells;
      layerState.observedAt = payload.observedAt;
      layerState.lastUpdate = Date.now();
      layerState.stale = payload.status === 'stale';
      layerState.failureReason = null;
      // A reading belongs to the grid it was taken from; a new grid retires it.
      parts.sampling.clearReadout();
      parts.viewport.clearUnavailableRetry();
      setStatus(
        payload.modelledCells
          ? layerState.stale
            ? 'stale'
            : 'ready'
          : 'empty',
        payload.status === 'stale' ? 'Serving cached model output' : null,
      );
      parts.rendering.renderCells();
    } catch (error) {
      if (
        requestAbort.signal.aborted ||
        layerState.abort !== requestAbort ||
        !layerState.enabled ||
        error?.name === 'AbortError'
      )
        return;
      layerState.failureReason = error?.failureReason || 'unavailable';
      setStatus('unavailable', error?.message || 'Air temperature unavailable');
      parts.viewport.scheduleUnavailableRetry();
    } finally {
      // An older aborted request must not clear a newer request's busy state.
      if (layerState.abort === requestAbort) {
        layerState.abort = null;
        layerState.loading = false;
      }
    }
  }

  const methods = {
    update() {
      return loadGrid();
    },
  };

  return { setStatus, loadGrid, methods };
}
