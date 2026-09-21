import { COMPOSITE_PERIOD_DAYS, PERIOD_LOOKBACK } from './policy.js';

const DAY_MS = 86_400_000;

/** @param {number} epochMs Instant. @returns {string} UTC calendar date, `YYYY-MM-DD`. */
export function utcDate(epochMs) {
  return new Date(epochMs).toISOString().slice(0, 10);
}

/** @param {string} date ISO date. @returns {number} 1-based day of the year. */
export function dayOfYear(date) {
  const parsed = new Date(`${date}T00:00:00Z`);
  const yearStart = Date.UTC(parsed.getUTCFullYear(), 0, 1);
  return Math.round((parsed.getTime() - yearStart) / DAY_MS) + 1;
}

/**
 * The start date of the composite period containing `date`.
 *
 * MODIS 8-day periods are numbered from day-of-year 1 and **restart every
 * January**, so the grid is not a simple multiple of eight days since epoch —
 * the last period of a year is short. Computing the start from the day of the
 * year is what keeps December and early January correct.
 * @param {string} date Any ISO date inside the wanted period.
 * @returns {string} ISO date of that period's first day.
 */
export function periodStart(date) {
  const year = Number(date.slice(0, 4));
  const index = Math.floor((dayOfYear(date) - 1) / COMPOSITE_PERIOD_DAYS);
  return utcDate(Date.UTC(year, 0, 1) + index * COMPOSITE_PERIOD_DAYS * DAY_MS);
}

/**
 * Candidate period start dates, newest first.
 *
 * GIBS answers a date inside an unpublished period with 404, and the newest
 * period is routinely still processing, so the walk has to reach back several
 * periods rather than several days.
 * @param {number} now Current instant in epoch milliseconds.
 * @param {number} periods How many periods back to offer.
 * @returns {Array<string>} Period start dates, newest first.
 */
export function candidatePeriods(now, periods = PERIOD_LOOKBACK) {
  const count = Math.max(1, Math.floor(periods));
  const seen = new Set();
  const dates = [];
  for (
    let back = 0;
    dates.length < count &&
    back < count * COMPOSITE_PERIOD_DAYS + COMPOSITE_PERIOD_DAYS;
    back += 1
  ) {
    const start = periodStart(utcDate(now - back * DAY_MS));
    if (seen.has(start)) continue;
    seen.add(start);
    dates.push(start);
  }
  return dates;
}

/** @param {string} date ISO date. @param {number} now Instant. @returns {number} Whole days behind now. */
export function dateAgeDays(date, now) {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return Math.max(0, Math.round((now - parsed) / DAY_MS));
}

/**
 * Freshness for the layer readout.
 *
 * Names the period start rather than "today", because an 8-day composite is an
 * average over its window — reporting it as a current reading would overstate
 * what the pixel means.
 * @param {?string} date Resolved period start.
 * @param {number} now Instant.
 * @returns {string} Freshness label.
 */
export function freshnessLabel(date, now) {
  if (!date) return 'no composite resolved';
  const age = dateAgeDays(date, now);
  if (!Number.isFinite(age)) return date;
  return `${COMPOSITE_PERIOD_DAYS}-day composite from ${date} · ${age}d old`;
}
