import * as Cesium from 'cesium';
import { isPointerFree } from '../../data/inputOwnership.js';
import { formatStop } from './colormap.js';
import { freshnessLabel } from './dates.js';
import { SAMPLE_MARKER_COLOR } from './policy.js';

/**
 * Click-to-read for the temperature overlay.
 *
 * The overlay is imagery, so there is no entity to pick and nothing on screen
 * says what a colour means at a given spot. This turns a click into a reading
 * of the published product at that point.
 */
export function createSampling({ state: layerState, services, parts, source }) {
  const { governorRequestRender } = services.render;

  function clearReadout() {
    if (layerState.sampleDataSource?.entities)
      layerState.sampleDataSource.entities.removeAll();
    layerState.sample = null;
    governorRequestRender('temperature-sample-clear');
  }

  /**
   * The headline for a sample: the reading itself, or why there is none.
   * @param {object} sample Sample outcome.
   * @returns {string} Card title.
   */
  function readoutTitle(sample) {
    if (sample.outcome === 'measured') return formatStop(sample.stop);
    if (sample.outcome === 'no-value') return 'No clear-sky value';
    if (sample.outcome === 'no-tile') return 'No tile for this point';
    if (sample.outcome === 'outside-projection')
      return 'Outside the projection';
    return 'Sample unavailable';
  }

  /**
   * Context under the headline — never the reading again.
   *
   * Every line qualifies the number rather than repeating it: what quantity it
   * is, how coarse the pixel is, and which composite it came from. A reader who
   * takes the figure without those three has the wrong idea of it.
   * @param {object} sample Sample outcome.
   * @returns {Array<string>} Card body lines.
   */
  function readoutLines(sample) {
    const lines = [];
    // The window itself is named on the freshness line below; this line only
    // has to say which quantity the number is, because land surface temperature
    // and air temperature differ by tens of degrees in sun.
    if (sample.outcome === 'measured') lines.push('land surface temperature');
    // Cloud, water, or outside the retrieval. Saying so is the whole point: a
    // gap here is not a mild temperature.
    else if (sample.outcome === 'no-value')
      lines.push('cloud, water or unretrieved');
    if (sample.resolutionM)
      lines.push(`~${Math.round(sample.resolutionM / 100) / 10} km pixel`);
    lines.push(freshnessLabel(layerState.date, Date.now()));
    return lines;
  }

  function renderReadout(sample) {
    if (!layerState.sampleDataSource) return;
    layerState.sampleDataSource.entities.removeAll();
    const position = Cesium.Cartesian3.fromDegrees(
      sample.longitude,
      sample.latitude,
    );
    const title = readoutTitle(sample);
    const body = readoutLines(sample);
    const width = Math.max(title.length, ...body.map((line) => line.length));
    layerState.sampleDataSource.entities.add({
      id: 'temperature-sample',
      position,
      point: {
        pixelSize: 11,
        color: Cesium.Color.fromCssColorString(SAMPLE_MARKER_COLOR),
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
    governorRequestRender('temperature-sample');
  }

  /**
   * Sample the composite under a screen position.
   * @param {Cesium.Cartesian2} position Screen position.
   * @returns {Promise<void>} Resolves once the readout settles.
   */
  async function sampleAt(position) {
    const viewer = layerState.viewer;
    if (!viewer || !layerState.enabled || !layerState.date) return;
    // Read the globe surface, not an entity: a click on another layer's marker
    // is that layer's click, and the ellipsoid pick is what "this point on the
    // ground" means.
    const cartesian = viewer.camera.pickEllipsoid(
      position,
      viewer.scene.globe.ellipsoid,
    );
    if (!cartesian) return;
    const carto = Cesium.Cartographic.fromCartesian(cartesian);
    const latitude = Cesium.Math.toDegrees(carto.latitude);
    const longitude = Cesium.Math.toDegrees(carto.longitude);
    layerState.sampleAbort?.abort();
    const requestAbort = new AbortController();
    layerState.sampleAbort = requestAbort;
    layerState.sampling = true;
    governorRequestRender('temperature-sampling');
    try {
      const sample = await source.sample({
        latitude,
        longitude,
        date: layerState.date,
        signal: requestAbort.signal,
      });
      if (
        requestAbort.signal.aborted ||
        layerState.sampleAbort !== requestAbort ||
        !layerState.enabled
      )
        return;
      layerState.sample = sample;
      renderReadout(sample);
    } catch (error) {
      if (
        requestAbort.signal.aborted ||
        layerState.sampleAbort !== requestAbort ||
        !layerState.enabled ||
        error?.name === 'AbortError'
      )
        return;
      layerState.sample = { outcome: 'error', latitude, longitude };
      renderReadout(layerState.sample);
    } finally {
      if (layerState.sampleAbort === requestAbort) {
        layerState.sampleAbort = null;
        layerState.sampling = false;
      }
    }
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
      void sampleAt(click.position);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  return {
    installInteraction,
    sampleAt,
    clearReadout,
    readoutTitle,
    readoutLines,
  };
}
