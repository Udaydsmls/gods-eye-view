import * as Cesium from 'cesium';
import { LAYER_ID } from './policy.js';

export function createLifecycle({ state: layerState, services, parts }) {
  const { clearSelectedEntityContextForLayer } = services.context;

  const methods = {
    init(viewer) {
      layerState.viewer = viewer;
      layerState.dataSource = new Cesium.CustomDataSource('air-temperature');
      viewer.dataSources.add(layerState.dataSource);
      // The readout lives on its own data source so clearing a reading never
      // disturbs the grid beneath it.
      layerState.readoutDataSource = new Cesium.CustomDataSource(
        'air-temperature-readout',
      );
      viewer.dataSources.add(layerState.readoutDataSource);
      layerState.moveEndRemove = viewer.camera.moveEnd.addEventListener(
        parts.viewport.scheduleLoad,
      );
      parts.sampling.installInteraction(viewer);
    },

    enable() {
      layerState.enabled = true;
      layerState.dataSource.show = true;
      layerState.readoutDataSource.show = true;
      // DataLayerManager calls update() straight after enable(), which owns the
      // first grid request. Avoid racing it with a second aborting request.
    },

    disable() {
      layerState.enabled = false;
      parts.viewport.clearUnavailableRetry();
      clearTimeout(layerState.timer);
      layerState.abort?.abort();
      layerState.abort = null;
      layerState.loading = false;
      parts.sampling.clearReadout();
      if (layerState.dataSource) layerState.dataSource.show = false;
      if (layerState.readoutDataSource)
        layerState.readoutDataSource.show = false;
      clearSelectedEntityContextForLayer(LAYER_ID);
      layerState.failureReason = null;
      parts.ingestion.setStatus('idle');
    },

    destroy(viewer) {
      this.disable();
      layerState.moveEndRemove?.();
      layerState.moveEndRemove = null;
      layerState.clickHandler?.destroy();
      layerState.clickHandler = null;
      parts.rendering.clearRendered();
      if (viewer) {
        if (layerState.dataSource)
          viewer.dataSources.remove(layerState.dataSource, true);
        if (layerState.readoutDataSource)
          viewer.dataSources.remove(layerState.readoutDataSource, true);
      }
      layerState.dataSource = null;
      layerState.readoutDataSource = null;
    },
  };

  return { methods };
}
