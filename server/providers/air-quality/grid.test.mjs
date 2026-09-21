import assert from 'node:assert/strict';
import test from 'node:test';
import {
  airQualityCacheKey,
  airQualityFailureReason,
  gridCells,
  quantizeAirQualityBox,
  resolveGridSide,
  validAirQualityBox,
} from './grid.js';
import { AQ_GRID_SIDE_DEFAULT, AQ_GRID_SIDE_MAX } from './constants.js';

const params = (entries) => new URLSearchParams(entries);
const box = { south: 30, west: -98, north: 31, east: -97 };

test('viewport admission rejects unbounded, inverted and dateline-spanning boxes', () => {
  assert.deepEqual(
    validAirQualityBox(
      params({ south: '30', west: '-98', north: '31', east: '-97' }),
    ),
    box,
  );
  for (const invalid of [
    { south: '30', west: '-98', north: '31' },
    { south: '30', west: '-98', north: '29', east: '-97' },
    { south: '30', west: '-98', north: '31', east: '-99' },
    { south: '-91', west: '-98', north: '31', east: '-97' },
    { south: '-45', west: '-120', north: '45', east: '-20' },
    { south: '30', west: 'x', north: '31', east: '-97' },
  ])
    assert.equal(validAirQualityBox(params(invalid)), null);
});

test('the grid side is clamped to what one upstream URL can carry', () => {
  // Measured: 16x16 answers at a 5.5 kB URL; 20x20 answers 414 URI Too Large.
  assert.equal(resolveGridSide(null), AQ_GRID_SIDE_DEFAULT);
  assert.equal(resolveGridSide(''), AQ_GRID_SIDE_DEFAULT);
  assert.equal(resolveGridSide('nonsense'), AQ_GRID_SIDE_DEFAULT);
  assert.equal(resolveGridSide('40'), AQ_GRID_SIDE_MAX);
  assert.equal(resolveGridSide('1'), 4);
  assert.equal(resolveGridSide('10'), 10);
});

test('cells sample their own centre, not a corner', () => {
  // A cell is drawn as a rectangle and its colour stands for the whole
  // rectangle, so sampling a corner biases every cell toward a neighbour.
  const cells = gridCells(box, 2);
  assert.equal(cells.length, 4);
  const first = cells[0];
  assert.equal(first.south, 30);
  assert.equal(first.north, 30.5);
  assert.equal(first.latitude, 30.25);
  assert.equal(first.longitude, -97.75);
  assert.ok(first.latitude > first.south && first.latitude < first.north);
  assert.ok(first.longitude > first.west && first.longitude < first.east);
});

test('cells tile the box exactly, with no gap or overlap', () => {
  const side = 4;
  const cells = gridCells(box, side);
  assert.equal(cells.length, side * side);
  assert.equal(Math.min(...cells.map((c) => c.south)), box.south);
  assert.equal(Math.max(...cells.map((c) => c.north)), box.north);
  assert.equal(Math.min(...cells.map((c) => c.west)), box.west);
  assert.equal(Math.max(...cells.map((c) => c.east)), box.east);
});

test('quantizing snaps outward so a snapped box always covers the request', () => {
  const snapped = quantizeAirQualityBox({
    south: 30.11,
    west: -98.31,
    north: 30.89,
    east: -97.02,
  });
  assert.ok(snapped.south <= 30.11);
  assert.ok(snapped.west <= -98.31);
  assert.ok(snapped.north >= 30.89);
  assert.ok(snapped.east >= -97.02);
});

test('the cache key includes the grid side, so resolutions never collide', () => {
  assert.notEqual(airQualityCacheKey(box, 8), airQualityCacheKey(box, 12));
});

test('failure reasons are classified rather than passed through', () => {
  assert.equal(
    airQualityFailureReason({ airQualityReason: 'timeout' }),
    'timeout',
  );
  assert.equal(airQualityFailureReason(new Error('boom')), 'unavailable');
  assert.equal(
    airQualityFailureReason({ airQualityReason: 'something else' }),
    'unavailable',
  );
});
