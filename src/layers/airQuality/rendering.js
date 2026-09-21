import * as Cesium from 'cesium';
import { aqiColor, aqiLabel } from './scale.js';
import { LAYER_ID, MAX_ALPHA, MIN_ALPHA } from './policy.js';

export function createRendering({ state: layerState, services, parts }) {
  const { governorRequestRender } = services.render;
  const { removeEntityContextsForLayer, registerEntityContext } =
    services.context;

  function clearRendered() {
    if (layerState.dataSource?.entities)
      layerState.dataSource.entities.removeAll();
    removeEntityContextsForLayer(LAYER_ID);
  }

  /**
   * Paint the grid as ground-clamped rectangles.
   *
   * `ClassificationType.BOTH` drapes each cell onto terrain and 3D tiles alike,
   * so the field reads as a layer over the world rather than a sheet floating
   * above it. Cells the model does not cover are skipped entirely — an absent
   * rectangle is honest, whereas a grey one invites reading it as a value.
   * @returns {void}
   */
  function renderCells() {
    governorRequestRender('air-quality-render');
    clearRendered();
    if (!layerState.dataSource) return;
    for (const cell of layerState.cells) {
      const color = aqiColor(cell.aqi);
      if (!color) continue;
      const id = `aq:${cell.south.toFixed(3)},${cell.west.toFixed(3)}`;
      const entity = layerState.dataSource.entities.add({
        id,
        rectangle: {
          coordinates: Cesium.Rectangle.fromDegrees(
            cell.west,
            cell.south,
            cell.east,
            cell.north,
          ),
          material: Cesium.Color.fromCssColorString(color).withAlpha(
            layerState.alpha,
          ),
          // Outline every cell. Without it, adjacent cells in the same band
          // merge into one undifferentiated field and the grid stops reading as
          // a set of sampled areas — which is what it is.
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(color).withAlpha(
            Math.min(1, layerState.alpha * 2.2),
          ),
          outlineWidth: 1,
          classificationType: Cesium.ClassificationType.BOTH,
        },
      });
      registerEntityContext(entity, {
        id,
        layerId: LAYER_ID,
        layerName: 'Air Quality',
        source: 'Open-Meteo · CAMS air quality forecast',
        label: `US AQI ${cell.aqi} · ${aqiLabel(cell.aqi)}`,
        latitude: cell.latitude,
        longitude: cell.longitude,
        properties: {
          usAqi: cell.aqi,
          band: aqiLabel(cell.aqi),
          pm25: cell.pm2_5,
          pm10: cell.pm10,
          ozone: cell.ozone,
          no2: cell.no2,
          so2: cell.so2,
          co: cell.co,
          observedAt: cell.observedAt,
        },
      });
    }
  }

  /** @param {number} value Requested opacity. @returns {number} Applied opacity. */
  function setAlpha(value) {
    const alpha = Math.min(
      MAX_ALPHA,
      Math.max(MIN_ALPHA, Number.isFinite(value) ? value : layerState.alpha),
    );
    if (alpha === layerState.alpha) return alpha;
    layerState.alpha = alpha;
    // Repaint rather than mutating each material: the rectangles are rebuilt
    // on every grid anyway, so one path owns their appearance.
    renderCells();
    return alpha;
  }

  return { clearRendered, renderCells, setAlpha };
}
