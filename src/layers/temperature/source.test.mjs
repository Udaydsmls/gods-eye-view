import assert from 'node:assert/strict';
import test from 'node:test';
import { createTemperatureSource, probeTileUrl } from './source.js';

const NOW = Date.parse('2026-09-21T06:00:00Z');

test('the probe URL carries the date in the path, where GIBS expects it', () => {
  const url = probeTileUrl('2026-09-06');
  // EPSG:3857 on purpose: the geographic matrix sets are not power-of-two
  // pyramids and Cesium mispositions them.
  assert.ok(url.includes('/wmts/epsg3857/best/'));
  assert.ok(
    url.includes(
      '/MODIS_Terra_L3_Land_Surface_Temp_8Day_Day/default/2026-09-06/GoogleMapsCompatible_Level7/',
    ),
  );
  assert.ok(url.endsWith('.png'));
});

test('the probe is a required dependency, not an optional default', async () => {
  // source.js is a portable export and may not reach browser globals, so the
  // image probe is injected rather than defaulted. Constructing without one is
  // a wiring mistake and must fail loudly instead of at first use.
  assert.throws(() => createTemperatureSource(), /tile availability probe/);
  assert.throws(
    () => createTemperatureSource({ probeImpl: 'nope' }),
    /tile availability probe/,
  );
});

test('the newest published period wins and older candidates are not probed', async () => {
  const tried = [];
  const source = createTemperatureSource({
    probeImpl: async (url) => {
      tried.push(url.match(/default\/([\d-]+)\//)[1]);
      return true;
    },
  });
  const resolved = await source.resolveDate({ now: NOW });
  assert.equal(resolved.date, '2026-09-14');
  assert.deepEqual(tried, ['2026-09-14']);
});

test('an unpublished period is skipped rather than rendered blank', async () => {
  // The newest period is routinely still processing, which is the common case:
  // GIBS 404s inside it, and a 404 without a CORS header is invisible to fetch,
  // so the probe is an image load and an unpublished date must be stepped over.
  const tried = [];
  const source = createTemperatureSource({
    probeImpl: async (url) => {
      const date = url.match(/default\/([\d-]+)\//)[1];
      tried.push(date);
      return date === '2026-09-06';
    },
  });
  const resolved = await source.resolveDate({ now: NOW });
  assert.equal(resolved.date, '2026-09-06');
  assert.equal(resolved.candidatesTried, 2);
  assert.deepEqual(tried, ['2026-09-14', '2026-09-06']);
});

test('an unreachable window reports unavailable rather than a fabricated date', async () => {
  const source = createTemperatureSource({ probeImpl: async () => false });
  await assert.rejects(source.resolveDate({ now: NOW, periods: 3 }), (error) => {
    assert.equal(error.failureReason, 'unavailable');
    assert.match(error.message, /No temperature composite reachable/);
    return true;
  });
});

test('every candidate is tried before giving up', async () => {
  let probes = 0;
  const source = createTemperatureSource({
    probeImpl: async () => {
      probes += 1;
      return false;
    },
  });
  await assert.rejects(source.resolveDate({ now: NOW, periods: 4 }));
  assert.equal(probes, 4);
});

test('cancellation is respected before any probe is spent', async () => {
  const controller = new AbortController();
  controller.abort();
  const source = createTemperatureSource({
    probeImpl: async () => {
      throw new Error('should not be reached');
    },
  });
  await assert.rejects(
    source.resolveDate({ now: NOW, signal: controller.signal }),
    { name: 'AbortError' },
  );
});

test('cancellation mid-walk stops before admitting a resolved date', async () => {
  const controller = new AbortController();
  const source = createTemperatureSource({
    probeImpl: async () => {
      controller.abort();
      return true;
    },
  });
  await assert.rejects(
    source.resolveDate({ now: NOW, signal: controller.signal }),
    { name: 'AbortError' },
  );
});
