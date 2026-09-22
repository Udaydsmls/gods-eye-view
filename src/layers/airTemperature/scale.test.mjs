import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatTemperature,
  summarizeGrid,
  temperatureBand,
  temperatureColor,
  temperatureLegend,
} from './scale.js';

test('band boundaries are inclusive at the top of each band', () => {
  assert.equal(temperatureBand(-30).label, '≤ -20');
  assert.equal(temperatureBand(-20).label, '≤ -20');
  assert.equal(temperatureBand(-19.9).label, '-20 to -10');
  assert.equal(temperatureBand(0).label, '-10 to 0');
  assert.equal(temperatureBand(0.1).label, '0 to 10');
  assert.equal(temperatureBand(45).label, '≥ 40');
});

test('zero degrees is a real temperature, not a missing value', () => {
  // The freezing band must not double as "no data": 0 C is a reading.
  assert.ok(temperatureBand(0));
  assert.ok(temperatureColor(0));
  assert.equal(formatTemperature(0), '0.0 °C');
});

test('a missing value has no band and says so', () => {
  for (const missing of [null, undefined, Number.NaN, 'x']) {
    assert.equal(temperatureBand(missing), null);
    assert.equal(temperatureColor(missing), null);
    assert.equal(formatTemperature(missing), 'Not modelled');
  }
});

test('the legend lists only bands present, in scale order, with degree bounds', () => {
  const legend = temperatureLegend([
    { temperatureC: 35 },
    { temperatureC: -25 },
    { temperatureC: 5 },
    { temperatureC: 34 },
    { temperatureC: null },
  ]);
  assert.deepEqual(
    legend.map((e) => e.label),
    ['≤ -20°', '0 to 10°', '30 to 40°'],
  );
  assert.deepEqual(
    legend.map((e) => e.count),
    [1, 1, 2],
  );
  // The ramp is a presentation choice, so labels carry numbers, not words.
  for (const entry of legend) assert.match(entry.label, /-?\d/);
});

test('an unmodelled grid yields no legend rather than an empty key', () => {
  assert.deepEqual(temperatureLegend([]), []);
  assert.deepEqual(temperatureLegend([{ temperatureC: null }]), []);
  assert.deepEqual(temperatureLegend(null), []);
});

test('the summary reports both extremes, not a mean', () => {
  const summary = summarizeGrid([
    { temperatureC: 14 },
    { temperatureC: 36.2 },
    { temperatureC: 22 },
    { temperatureC: null },
  ]);
  assert.equal(summary.min, 14);
  assert.equal(summary.max, 36.2);
  assert.equal(summary.modelled, 3);
  assert.equal(summary.total, 4);
});

test('a grid with nothing modelled reports no extremes instead of zero', () => {
  const summary = summarizeGrid([{ temperatureC: null }]);
  assert.equal(summary.min, null);
  assert.equal(summary.max, null);
  assert.equal(summarizeGrid(null).total, 0);
});
