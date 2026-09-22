import assert from 'node:assert/strict';
import test from 'node:test';
import {
  airTemperatureCacheKey,
  airTemperatureFailureReason,
  gridCells,
  quantizeAirTemperatureBox,
  resolveGridSide,
  validAirTemperatureBox,
} from './grid.js';
import { AT_GRID_SIDE_DEFAULT, AT_GRID_SIDE_MAX } from './constants.js';

const params = (entries) => new URLSearchParams(entries);
const box = { south: 30, west: -98, north: 31, east: -97 };

test('viewport admission rejects unbounded, inverted and oversized boxes', () => {
  assert.deepEqual(
    validAirTemperatureBox(
      params({ south: '30', west: '-98', north: '31', east: '-97' }),
    ),
    box,
  );
  for (const invalid of [
    { south: '30', west: '-98', north: '31' },
    { south: '30', west: '-98', north: '29', east: '-97' },
    { south: '-91', west: '-98', north: '31', east: '-97' },
    { south: '-80', west: '-170', north: '80', east: '170' },
    { south: '30', west: 'x', north: '31', east: '-97' },
  ])
    assert.equal(validAirTemperatureBox(params(invalid)), null);
});

test('the grid side is clamped to what one upstream URL can carry', () => {
  // Measured: 16x16 answers at a 5.7 kB URL; 20x20 answers 414 URI Too Large.
  assert.equal(resolveGridSide(null), AT_GRID_SIDE_DEFAULT);
  assert.equal(resolveGridSide(''), AT_GRID_SIDE_DEFAULT);
  assert.equal(resolveGridSide('nonsense'), AT_GRID_SIDE_DEFAULT);
  assert.equal(resolveGridSide('40'), AT_GRID_SIDE_MAX);
  assert.equal(resolveGridSide('1'), 4);
});

test('cells sample their own centre and tile the box exactly', () => {
  const cells = gridCells(box, 2);
  assert.equal(cells.length, 4);
  const first = cells[0];
  assert.ok(first.latitude > first.south && first.latitude < first.north);
  assert.ok(first.longitude > first.west && first.longitude < first.east);
  assert.equal(Math.min(...cells.map((c) => c.south)), box.south);
  assert.equal(Math.max(...cells.map((c) => c.north)), box.north);
});

test('quantizing snaps outward so a snapped box always covers the request', () => {
  const snapped = quantizeAirTemperatureBox({
    south: 30.11,
    west: -98.31,
    north: 30.89,
    east: -97.02,
  });
  assert.ok(snapped.south <= 30.11 && snapped.west <= -98.31);
  assert.ok(snapped.north >= 30.89 && snapped.east >= -97.02);
});

test('the cache key includes the grid side, so resolutions never collide', () => {
  assert.notEqual(airTemperatureCacheKey(box, 8), airTemperatureCacheKey(box, 12));
});

test('failure reasons are classified rather than passed through', () => {
  assert.equal(
    airTemperatureFailureReason({ airTemperatureReason: 'timeout' }),
    'timeout',
  );
  assert.equal(airTemperatureFailureReason(new Error('boom')), 'unavailable');
});
