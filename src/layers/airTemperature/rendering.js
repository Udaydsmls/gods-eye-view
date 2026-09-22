import * as Cesium from 'cesium';
import { formatTemperature, temperatureColor } from './scale.js';
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

  /** @param {object} cell Grid cell. @returns {string} Stable entity id. */
  function cellId(cell) {
    return `at:${cell.south.toFixed(3)},${cell.west.toFixed(3)}`;
  }

  /**
   * Paint the grid as ground-clamped rectangles.
   *
   * Cells the model has no value for are skipped entirely: an absent rectangle
   * is honest, whereas a grey one invites reading it as a temperature.
   * @returns {void}
   */
  function renderCells() {
    governorRequestRender('air-temperature-render');
    clearRendered();
    if (!layerState.dataSource) return;
    for (const cell of layerState.cells) {
      const color = temperatureColor(cell.temperatureC);
      if (!color) continue;
      const id = cellId(cell);
      const selected =
        layerState.selectedCell && cellId(layerState.selectedCell) === id;
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
          // Outline every cell, brighter on the selected one, so the grid reads
          // as a set of sampled areas rather than an undifferentiated wash.
          outline: true,
          outlineColor: selected
            ? Cesium.Color.WHITE
            : Cesium.Color.fromCssColorString(color).withAlpha(
                Math.min(1, layerState.alpha * 2.2),
              ),
          outlineWidth: selected ? 2 : 1,
          classificationType: Cesium.ClassificationType.BOTH,
        },
      });
      registerEntityContext(entity, {
        id,
        layerId: LAYER_ID,
        layerName: 'Air Temperature',
        source: 'Open-Meteo · 2 m air temperature',
        label: formatTemperature(cell.temperatureC),
        latitude: cell.latitude,
        longitude: cell.longitude,
        properties: {
          temperatureC: cell.temperatureC,
          apparentC: cell.apparentC,
          humidity: cell.humidity,
          windSpeed: cell.windSpeed,
          elevationM: cell.elevationM,
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
    // Repaint rather than mutating each material: the rectangles are rebuilt on
    // every grid anyway, so one path owns their appearance.
    renderCells();
    return alpha;
  }

  return { clearRendered, renderCells, setAlpha, cellId };
}
