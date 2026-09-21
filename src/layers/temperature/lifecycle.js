export function createLifecycle({ state: layerState, services, parts }) {
  const methods = {
    init(viewer) {
      layerState.viewer = viewer;
    },

    enable() {
      layerState.enabled = true;
      // DataLayerManager calls update() straight after enable(), which owns the
      // first composite resolution. Avoid racing it with a second request.
    },

    disable() {
      layerState.enabled = false;
      layerState.abort?.abort();
      layerState.abort = null;
      layerState.loading = false;
      parts.rendering.detach();
      layerState.failureReason = null;
      parts.ingestion.setStatus('idle');
    },

    destroy() {
      this.disable();
      layerState.viewer = null;
    },
  };

  return { methods };
}
