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
    governorRequestRender('temperature-status');
  }

  /**
   * Resolve a published composite and attach it.
   *
   * Runs once on enable rather than per camera move: unlike the viewport-bound
   * vector layers, the overlay is a global tiled product and Cesium streams
   * whatever the camera needs. The only thing to discover is which date exists.
   * @returns {Promise<void>} Resolves once the overlay settles.
   */
  async function loadComposite() {
    if (!layerState.enabled || !layerState.viewer) return;
    layerState.abort?.abort();
    const requestAbort = new AbortController();
    layerState.abort = requestAbort;
    layerState.loading = true;
    setStatus('loading');
    try {
      const { date } = await source.resolveDate({
        signal: requestAbort.signal,
      });
      if (
        requestAbort.signal.aborted ||
        layerState.abort !== requestAbort ||
        !layerState.enabled
      )
        return;
      parts.rendering.attach(date);
      layerState.lastUpdate = Date.now();
      layerState.failureReason = null;
      setStatus('ready');
    } catch (error) {
      if (
        requestAbort.signal.aborted ||
        layerState.abort !== requestAbort ||
        !layerState.enabled ||
        error?.name === 'AbortError'
      )
        return;
      layerState.failureReason = error?.failureReason || 'unavailable';
      // No usable composite means no overlay: leaving a stale date attached
      // would show yesterday's heat as though it were current.
      parts.rendering.detach();
      setStatus(
        layerState.failureReason === 'empty' ? 'empty' : 'unavailable',
        error?.message || 'Surface temperature imagery unavailable',
      );
    } finally {
      if (layerState.abort === requestAbort) {
        layerState.abort = null;
        layerState.loading = false;
      }
    }
  }

  const methods = {
    update() {
      // Already showing a resolved composite; nothing to re-fetch per tick.
      if (layerState.imageryLayer && layerState.status === 'ready') return;
      return loadComposite();
    },
  };

  return { setStatus, loadComposite, methods };
}
