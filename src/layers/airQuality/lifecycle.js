import * as Cesium from 'cesium';
import { LAYER_ID } from './policy.js';

export function createLifecycle({ state: layerState, services, parts }) {
  const { clearSelectedEntityContextForLayer } = services.context;

  const methods = {
    init(viewer) {
      layerState.viewer = viewer;
      layerState.dataSource = new Cesium.CustomDataSource('air-quality');
      viewer.dataSources.add(layerState.dataSource);
      layerState.moveEndRemove = viewer.camera.moveEnd.addEventListener(
        parts.viewport.scheduleLoad,
      );
    },

    enable() {
      layerState.enabled = true;
      layerState.dataSource.show = true;
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
      if (layerState.dataSource) layerState.dataSource.show = false;
      clearSelectedEntityContextForLayer(LAYER_ID);
      layerState.failureReason = null;
      parts.ingestion.setStatus('idle');
    },

    destroy(viewer) {
      this.disable();
      layerState.moveEndRemove?.();
      layerState.moveEndRemove = null;
      parts.rendering.clearRendered();
      if (layerState.dataSource && viewer)
        viewer.dataSources.remove(layerState.dataSource, true);
      layerState.dataSource = null;
    },
  };

  return { methods };
}
