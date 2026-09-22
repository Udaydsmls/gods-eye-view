import { makeRateLimiter, clientKey } from './common/rate-limit.js';
import { coalesceProxyRequest, readResponseTextCapped } from './common/http.js';
import {
  AT_MAX_CACHE_ENTRIES,
  AT_MAX_RESPONSE_BYTES,
  AT_MEMORY_TTL_MS,
  AT_STALE_MS,
  AT_UPSTREAM,
  AT_UPSTREAM_TIMEOUT_MS,
  AT_VARIABLES,
} from './air-temperature/constants.js';
import {
  airTemperatureCacheKey,
  airTemperatureFailureReason,
  gridCells,
  quantizeAirTemperatureBox,
  resolveGridSide,
  validAirTemperatureBox,
} from './air-temperature/grid.js';

/**
 * Open-Meteo asks for fair use rather than publishing a hard quota, and one
 * viewport is one upstream call carrying up to 256 coordinates, so the budget
 * is deliberately modest.
 */
const _airTemperatureRateLimiter = makeRateLimiter({
  windowMs: 60_000,
  max: 40,
  globalMax: 150,
});

const _airTemperatureCache = new Map();
const _airTemperatureInFlight = new Map();

function trimCache() {
  while (_airTemperatureCache.size > AT_MAX_CACHE_ENTRIES) {
    const oldest = _airTemperatureCache.keys().next().value;
    if (oldest === undefined) break;
    _airTemperatureCache.delete(oldest);
  }
}

function sendJson(res, status, payload, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': status === 200 ? 'public, max-age=600' : 'no-store',
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function fetchGrid(cells) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AT_UPSTREAM_TIMEOUT_MS);
  const query = new URLSearchParams({
    latitude: cells.map((cell) => cell.latitude).join(','),
    longitude: cells.map((cell) => cell.longitude).join(','),
    current: AT_VARIABLES.join(','),
    timezone: 'UTC',
  });
  try {
    const response = await fetch(`${AT_UPSTREAM}?${query}`, {
      signal: controller.signal,
    });
    if (!response.ok)
      throw Object.assign(new Error(`Open-Meteo HTTP ${response.status}`), {
        airTemperatureReason:
          response.status === 429 ? 'rate_limited' : 'query_failed',
      });
    const body = await readResponseTextCapped(response, AT_MAX_RESPONSE_BYTES);
    const parsed = JSON.parse(body);
    // A single coordinate answers with an object; many answer with an array.
    // Normalizing here keeps the shape stable for every grid size.
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    if (error?.name === 'AbortError')
      throw Object.assign(new Error('Open-Meteo timed out'), {
        airTemperatureReason: 'timeout',
      });
    if (error?.code === 'RESPONSE_TOO_LARGE')
      throw Object.assign(new Error('Open-Meteo response exceeded the cap'), {
        airTemperatureReason: 'query_failed',
      });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function airTemperatureProxy() {
  async function refresh({ box, side, key }) {
    const cells = gridCells(box, side);
    const locations = await fetchGrid(cells);
    const readings = cells.map((cell, index) => {
      const location = locations[index] || {};
      const current = location.current || {};
      return {
        ...cell,
        // A cell with no value carries null rather than 0: 0 °C is a real
        // temperature and must not stand in for "not modelled here".
        temperatureC: finiteOrNull(current.temperature_2m),
        apparentC: finiteOrNull(current.apparent_temperature),
        humidity: finiteOrNull(current.relative_humidity_2m),
        windSpeed: finiteOrNull(current.wind_speed_10m),
        elevationM: finiteOrNull(location.elevation),
        observedAt: current.time || null,
      };
    });
    const modelled = readings.filter((cell) => cell.temperatureC !== null);
    const payload = {
      cells: readings,
      side,
      box,
      modelledCells: modelled.length,
      observedAt: modelled[0]?.observedAt || null,
      retrievedAt: new Date().toISOString(),
      status: 'ready',
    };
    _airTemperatureCache.set(key, { payload, cachedAt: Date.now() });
    trimCache();
    return payload;
  }

  function install(middlewares) {
    middlewares.use('/api/air-temperature/grid', async (req, res) => {
      if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'Method Not Allowed' });
        return;
      }
      if (!_airTemperatureRateLimiter(clientKey(req))) {
        res.writeHead(429, {
          'Content-Type': 'application/json',
          'Retry-After': '5',
        });
        res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
        return;
      }
      const url = new URL(req.url, 'http://localhost');
      const requested = validAirTemperatureBox(url.searchParams);
      if (!requested) {
        sendJson(res, 400, {
          error: 'A non-dateline bbox no larger than 60 degrees is required',
        });
        return;
      }
      const side = resolveGridSide(url.searchParams.get('side'));
      // Query the SNAPPED box so neighbouring views share one cache entry; an
      // outward snap always covers what was asked for.
      const box = quantizeAirTemperatureBox(requested);
      const key = airTemperatureCacheKey(box, side);
      const now = Date.now();
      const cached = _airTemperatureCache.get(key);
      if (cached && now - cached.cachedAt <= AT_MEMORY_TTL_MS) {
        sendJson(
          res,
          200,
          { ...cached.payload, status: 'cached' },
          { 'X-Air-Temperature': 'MEMORY' },
        );
        return;
      }
      const request = coalesceProxyRequest(_airTemperatureInFlight, key, () =>
        refresh({ box, side, key }),
      );
      try {
        const payload = await request.promise;
        sendJson(res, 200, payload, {
          'X-Air-Temperature': request.shared ? 'INFLIGHT' : 'MISS',
        });
      } catch (error) {
        if (cached && now - cached.cachedAt <= AT_STALE_MS) {
          sendJson(
            res,
            200,
            { ...cached.payload, status: 'stale' },
            { 'X-Air-Temperature': 'STALE' },
          );
          return;
        }
        sendJson(res, 503, {
          error: 'Air temperature model output is temporarily unavailable',
          reason: airTemperatureFailureReason(error),
        });
      }
    });
  }

  return {
    name: 'air-temperature-proxy',
    configureServer(server) {
      install(server.middlewares);
    },
    configurePreviewServer(server) {
      install(server.middlewares);
    },
  };
}

export { airTemperatureProxy };

export {
  AT_GRID_SIDE_DEFAULT,
  AT_GRID_SIDE_MAX,
  AT_VARIABLES,
} from './air-temperature/constants.js';
export {
  airTemperatureCacheKey,
  airTemperatureFailureReason,
  gridCells,
  quantizeAirTemperatureBox,
  resolveGridSide,
  validAirTemperatureBox,
} from './air-temperature/grid.js';
