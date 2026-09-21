import * as Cesium from 'cesium';

export function createLifecycle({ state: layerState, services, parts }) {
  const methods = {
    init(viewer) {
      layerState.viewer = viewer;
      layerState.sampleDataSource = new Cesium.CustomDataSource(
        'surface-temperature-sample',
      );
      viewer.dataSources.add(layerState.sampleDataSource);
      parts.sampling.installInteraction(viewer);
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
      layerState.sampleAbort?.abort();
      layerState.sampleAbort = null;
      layerState.sampling = false;
      layerState.loading = false;
      parts.sampling.clearReadout();
      parts.rendering.detach();
      layerState.failureReason = null;
      parts.ingestion.setStatus('idle');
    },

    destroy(viewer) {
      this.disable();
      layerState.clickHandler?.destroy();
      layerState.clickHandler = null;
      if (layerState.sampleDataSource && viewer)
        viewer.dataSources.remove(layerState.sampleDataSource, true);
      layerState.sampleDataSource = null;
      layerState.viewer = null;
    },
  };

  return { methods };
}
