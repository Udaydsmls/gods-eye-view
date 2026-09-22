import * as Cesium from 'cesium';
import { isPointerFree } from '../../data/inputOwnership.js';
import { formatTemperature } from './scale.js';

/**
 * Click-to-read for the air-temperature grid.
 *
 * Unlike the land-surface overlay, which has to invert a colour map to recover
 * a value, every cell here already carries the number the model produced. The
 * click only has to find which cell was hit, so the reading is exact rather
 * than reconstructed.
 */
export function createSampling({ state: layerState, services, parts }) {
  const { governorRequestRender } = services.render;

  /** @param {number} latitude Degrees north. @param {number} longitude Degrees east. @returns {?object} Cell under the point. */
  function cellAt(latitude, longitude) {
    return (
      layerState.cells.find(
        (cell) =>
          latitude >= cell.south &&
          latitude <= cell.north &&
          longitude >= cell.west &&
          longitude <= cell.east,
      ) || null
    );
  }

  function clearReadout() {
    if (layerState.readoutDataSource?.entities)
      layerState.readoutDataSource.entities.removeAll();
    const had = Boolean(layerState.selectedCell);
    layerState.selectedCell = null;
    if (had) parts.rendering.renderCells();
    governorRequestRender('air-temperature-readout-clear');
  }

  /**
   * Context lines under the reading.
   *
   * Everything here qualifies the number: what it is, how it feels, how big the
   * sampled area is, and when the model says it is for.
   * @param {object} cell Selected cell.
   * @returns {Array<string>} Card body lines.
   */
  function readoutLines(cell) {
    const lines = ['2 m air temperature'];
    if (Number.isFinite(cell.apparentC))
      lines.push(`feels like ${cell.apparentC.toFixed(1)} °C`);
    const extras = [];
    if (Number.isFinite(cell.humidity)) extras.push(`${cell.humidity}% RH`);
    if (Number.isFinite(cell.windSpeed))
      extras.push(`${cell.windSpeed} km/h wind`);
    if (extras.length) lines.push(extras.join(' · '));
    if (Number.isFinite(cell.elevationM))
      lines.push(`model elevation ${Math.round(cell.elevationM)} m`);
    const spanKm = Math.round((cell.north - cell.south) * 111);
    if (spanKm > 0) lines.push(`~${spanKm} km cell`);
    if (cell.observedAt) lines.push(`${cell.observedAt}Z`);
    return lines;
  }

  function renderReadout(cell) {
    if (!layerState.readoutDataSource) return;
    layerState.readoutDataSource.entities.removeAll();
    const title = formatTemperature(cell.temperatureC);
    const body = readoutLines(cell);
    const width = Math.max(title.length, ...body.map((line) => line.length));
    layerState.readoutDataSource.entities.add({
      id: 'air-temperature-readout',
      position: Cesium.Cartesian3.fromDegrees(cell.longitude, cell.latitude),
      point: {
        pixelSize: 11,
        color: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK.withAlpha(0.85),
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: [title, '─'.repeat(width), ...body].join('\n'),
        font: '11px "JetBrains Mono", "SF Mono", monospace',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        pixelOffset: new Cesium.Cartesian2(14, 0),
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString(
          'rgba(12, 12, 20, 0.88)',
        ),
        backgroundPadding: new Cesium.Cartesian2(10, 8),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    governorRequestRender('air-temperature-readout');
  }

  /**
   * Read the cell under a screen position.
   * @param {Cesium.Cartesian2} position Screen position.
   * @returns {void}
   */
  function sampleAt(position) {
    const viewer = layerState.viewer;
    if (!viewer || !layerState.enabled) return;
    const cartesian = viewer.camera.pickEllipsoid(
      position,
      viewer.scene.globe.ellipsoid,
    );
    if (!cartesian) return;
    const carto = Cesium.Cartographic.fromCartesian(cartesian);
    const cell = cellAt(
      Cesium.Math.toDegrees(carto.latitude),
      Cesium.Math.toDegrees(carto.longitude),
    );
    // Clicking outside the loaded grid, or on a cell the model has no value
    // for, clears rather than showing a stale reading somewhere else.
    if (!cell || !Number.isFinite(cell.temperatureC)) {
      clearReadout();
      return;
    }
    layerState.selectedCell = cell;
    renderReadout(cell);
    parts.rendering.renderCells();
  }

  function installInteraction(viewer) {
    if (layerState.clickHandler) return;
    layerState.clickHandler = new Cesium.ScreenSpaceEventHandler(
      viewer.scene.canvas,
    );
    layerState.clickHandler.setInputAction((click) => {
      // A drawing tool or another owner may hold the pointer lease.
      if (!isPointerFree()) return;
      if (!layerState.enabled) return;
      sampleAt(click.position);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  return { installInteraction, sampleAt, cellAt, clearReadout, readoutLines };
}
