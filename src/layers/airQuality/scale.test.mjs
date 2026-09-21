import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aqiBand,
  aqiColor,
  aqiLabel,
  aqiLegend,
  summarizeGrid,
} from './scale.js';

test('band boundaries follow the published EPA categories inclusively', () => {
  assert.equal(aqiBand(0).label, 'Good');
  assert.equal(aqiBand(50).label, 'Good');
  assert.equal(aqiBand(51).label, 'Moderate');
  assert.equal(aqiBand(100).label, 'Moderate');
  assert.equal(aqiBand(101).label, 'Unhealthy for sensitive groups');
  assert.equal(aqiBand(200).label, 'Unhealthy');
  assert.equal(aqiBand(201).label, 'Very unhealthy');
  assert.equal(aqiBand(500).label, 'Hazardous');
});

test('an unmodelled cell is not coloured as clean air', () => {
  // A cell the model does not cover must not render as "Good": absent data and
  // good air are different claims, and the renderer skips a null colour.
  for (const missing of [null, undefined, Number.NaN, -1, 'x']) {
    assert.equal(aqiBand(missing), null);
    assert.equal(aqiColor(missing), null);
    assert.equal(aqiLabel(missing), 'Not modelled');
  }
});

test('colours come from the band table rather than being computed', () => {
  assert.equal(aqiColor(25), '#00e400');
  assert.equal(aqiColor(75), '#ffff00');
  assert.equal(aqiColor(350), '#7e0023');
});

test('a grid summary reports the worst band present, not an average', () => {
  const summary = summarizeGrid([
    { aqi: 20 },
    { aqi: 180 },
    { aqi: 45 },
    { aqi: null },
  ]);
  assert.equal(summary.peak, 180);
  assert.equal(summary.peakLabel, 'Unhealthy');
  // Averaging would report ~82 ("Moderate") and hide the unhealthy cell.
  assert.equal(summary.modelled, 3);
  assert.equal(summary.total, 4);
});

test('a grid with nothing modelled reports no peak instead of zero', () => {
  const summary = summarizeGrid([{ aqi: null }, { aqi: null }]);
  assert.equal(summary.peak, null);
  assert.equal(summary.peakLabel, 'Not modelled');
  assert.equal(summary.modelled, 0);
});

test('a malformed grid does not throw', () => {
  assert.equal(summarizeGrid(null).total, 0);
  assert.equal(summarizeGrid([null, undefined]).modelled, 0);
});

test('the legend lists only bands present, in published EPA order', () => {
  const legend = aqiLegend([
    { aqi: 180 },
    { aqi: 20 },
    { aqi: 30 },
    { aqi: null },
    { aqi: 75 },
  ]);
  // Sorted by band, not by count: a legend that reshuffles as the camera moves
  // cannot be learned.
  assert.deepEqual(
    legend.map((e) => e.label),
    ['0-50', '51-100', '151-200'],
  );
  assert.deepEqual(
    legend.map((e) => e.count),
    [2, 1, 1],
  );
  assert.equal(legend[0].color, '#00e400');
  assert.match(legend[2].blurb, /Unhealthy/);
});

test('an empty or unmodelled grid yields no legend rather than an empty key', () => {
  assert.deepEqual(aqiLegend([]), []);
  assert.deepEqual(aqiLegend([{ aqi: null }, { aqi: null }]), []);
  assert.deepEqual(aqiLegend(null), []);
});
