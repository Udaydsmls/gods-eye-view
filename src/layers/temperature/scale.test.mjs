import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TEMPERATURE_STOPS,
  kelvinToCelsius,
  temperatureLegend,
} from './scale.js';

test('the stops span the published product range', () => {
  // NASA's colour map for this layer runs 200 K to 350 K; anything outside is
  // clamped into the end stops, which the labels have to say.
  assert.equal(TEMPERATURE_STOPS[0].kelvin, 200);
  assert.equal(TEMPERATURE_STOPS.at(-1).kelvin, 350);
  const kelvins = TEMPERATURE_STOPS.map((s) => s.kelvin);
  assert.deepEqual(kelvins, [...kelvins].sort((a, b) => a - b));
});

test('Kelvin converts exactly, so the labels are not approximations', () => {
  assert.equal(kelvinToCelsius(273.15), 0);
  assert.equal(Math.round(kelvinToCelsius(200)), -73);
  assert.equal(Math.round(kelvinToCelsius(350)), 77);
});

test('the legend labels its ends as bounds and carries no count', () => {
  const legend = temperatureLegend();
  assert.equal(legend.length, TEMPERATURE_STOPS.length);
  assert.ok(legend[0].label.startsWith('≤'));
  assert.ok(legend.at(-1).label.startsWith('≥'));
  assert.equal(legend[3].label, '0°');
  // A colour ramp is not a tally; the row renderer omits the count when absent.
  for (const entry of legend) assert.equal(entry.count, undefined);
});

test('swatch colours are the published ones, not recomputed', () => {
  const legend = temperatureLegend();
  assert.equal(legend[0].color, 'rgb(197,0,255)');
  assert.equal(legend[3].color, 'rgb(91,255,43)');
  assert.equal(legend.at(-1).color, 'rgb(255,1,0)');
  for (const entry of legend) assert.match(entry.color, /^rgb\(\d+,\d+,\d+\)$/);
});
