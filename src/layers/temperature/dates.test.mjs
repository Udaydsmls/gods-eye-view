import assert from 'node:assert/strict';
import test from 'node:test';
import {
  candidatePeriods,
  dateAgeDays,
  dayOfYear,
  freshnessLabel,
  periodEnd,
  periodStart,
  utcDate,
} from './dates.js';

const NOW = Date.parse('2026-09-21T06:00:00Z');

test('day of year is 1-based and UTC', () => {
  assert.equal(dayOfYear('2026-01-01'), 1);
  assert.equal(dayOfYear('2026-09-21'), 264);
  assert.equal(dayOfYear('2026-12-31'), 365);
});

test('a period start is the containing MODIS 8-day window, not a rounded date', () => {
  // Verified against the live service: 2026-09-06 (day 249) answers 200 and is
  // the start of the window that contains 2026-09-12.
  assert.equal(periodStart('2026-09-06'), '2026-09-06');
  assert.equal(periodStart('2026-09-12'), '2026-09-06');
  assert.equal(periodStart('2026-09-13'), '2026-09-06');
  assert.equal(periodStart('2026-09-14'), '2026-09-14');
});

test('periods restart every January instead of running on an epoch multiple', () => {
  // The last window of a year is short. Treating the grid as "every 8 days
  // since epoch" silently shifts every date after new year.
  assert.equal(periodStart('2026-01-01'), '2026-01-01');
  assert.equal(periodStart('2026-01-08'), '2026-01-01');
  assert.equal(periodStart('2026-01-09'), '2026-01-09');
  assert.equal(periodStart('2026-12-31'), '2026-12-27');
  assert.equal(periodStart('2027-01-02'), '2027-01-01');
});

test('candidates are distinct period starts, newest first', () => {
  const periods = candidatePeriods(NOW, 3);
  assert.deepEqual(periods, ['2026-09-14', '2026-09-06', '2026-08-29']);
  assert.equal(new Set(periods).size, periods.length);
});

test('the lookback is always at least one period', () => {
  assert.equal(candidatePeriods(NOW, 0).length, 1);
  assert.equal(candidatePeriods(NOW, -3).length, 1);
});

test('dates are computed in UTC, not the host timezone', () => {
  assert.equal(utcDate(Date.parse('2026-09-21T23:30:00Z')), '2026-09-21');
  assert.equal(utcDate(Date.parse('2026-09-21T00:30:00Z')), '2026-09-21');
});

test('a period covers eight days, and December is clamped to the year end', () => {
  assert.equal(periodEnd('2026-09-06'), '2026-09-13');
  assert.equal(periodEnd('2026-01-01'), '2026-01-08');
  // The final window of a year is short; letting it run on would claim to
  // cover days that belong to the next year's first period.
  assert.equal(periodEnd('2026-12-27'), '2026-12-31');
});

test('freshness reports the age of the newest day, not of the window start', () => {
  // Measured against the live service on 2026-09-21: the window starting
  // 09-14 was not yet published, so 09-06 was newest. Its start is 15 days
  // back but its most recent observation is only 8, and reporting the start
  // overstated staleness by the whole window.
  const label = freshnessLabel('2026-09-06', NOW);
  assert.match(label, /2026-09-06 to 2026-09-13/);
  assert.match(label, /newest 8d old/);
  assert.ok(!label.includes('15d'));
  assert.ok(!label.includes('16d'));
});

test('freshness says so when nothing resolved', () => {
  assert.equal(freshnessLabel(null, NOW), 'no composite resolved');
  assert.ok(Number.isNaN(dateAgeDays('not-a-date', NOW)));
});
