import { makeRateLimiter, clientKey } from './common/rate-limit.js';
import { coalesceProxyRequest, readResponseTextCapped } from './common/http.js';
import {
  AQ_MAX_CACHE_ENTRIES,
  AQ_MAX_RESPONSE_BYTES,
  AQ_MEMORY_TTL_MS,
  AQ_STALE_MS,
  AQ_UPSTREAM,
  AQ_UPSTREAM_TIMEOUT_MS,
  AQ_VARIABLES,
} from './air-quality/constants.js';
import {
  airQualityCacheKey,
  airQualityFailureReason,
  gridCells,
  quantizeAirQualityBox,
  resolveGridSide,
  validAirQualityBox,
} from './air-quality/grid.js';

/**
 * Open-Meteo asks for fair use rather than publishing a hard quota, and one
 * viewport here is one upstream call carrying up to 256 coordinates, so the
 * budget is deliberately modest.
 */
const _airQualityRateLimiter = makeRateLimiter({
  windowMs: 60_000,
  max: 40,
  globalMax: 150,
});

const _airQualityCache = new Map();
const _airQualityInFlight = new Map();

function trimCache() {
  while (_airQualityCache.size > AQ_MAX_CACHE_ENTRIES) {
    const oldest = _airQualityCache.keys().next().value;
    if (oldest === undefined) break;
    _airQualityCache.delete(oldest);
  }
}

function sendJson(res, status, payload, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': status === 200 ? 'public, max-age=900' : 'no-store',
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

async function fetchGrid(cells) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AQ_UPSTREAM_TIMEOUT_MS);
  const query = new URLSearchParams({
    latitude: cells.map((cell) => cell.latitude).join(','),
    longitude: cells.map((cell) => cell.longitude).join(','),
    current: AQ_VARIABLES.join(','),
  });
  try {
    const response = await fetch(`${AQ_UPSTREAM}?${query}`, {
      signal: controller.signal,
    });
    if (!response.ok)
      throw Object.assign(new Error(`Open-Meteo HTTP ${response.status}`), {
        airQualityReason:
          response.status === 429
            ? 'rate_limited'
            : response.status === 414
              ? 'query_failed'
              : 'query_failed',
      });
    const body = await readResponseTextCapped(response, AQ_MAX_RESPONSE_BYTES);
    const parsed = JSON.parse(body);
    // A single coordinate answers with an object; many answer with an array.
    // Normalizing here keeps the shape stable for every grid size.
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    if (error?.name === 'AbortError')
      throw Object.assign(new Error('Open-Meteo timed out'), {
        airQualityReason: 'timeout',
      });
    if (error?.code === 'RESPONSE_TOO_LARGE')
      throw Object.assign(new Error('Open-Meteo response exceeded the cap'), {
        airQualityReason: 'query_failed',
      });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function airQualityProxy() {
  async function refresh({ box, side, key }) {
    const cells = gridCells(box, side);
    const locations = await fetchGrid(cells);
    const readings = cells.map((cell, index) => {
      const current = locations[index]?.current || {};
      const aqi = Number(current.us_aqi);
      return {
        ...cell,
        // A cell with no index carries null rather than 0: "not modelled here"
        // and "clean air" must not render as the same colour.
        aqi: Number.isFinite(aqi) ? aqi : null,
        pm2_5: Number.isFinite(Number(current.pm2_5))
          ? Number(current.pm2_5)
          : null,
        pm10: Number.isFinite(Number(current.pm10))
          ? Number(current.pm10)
          : null,
        ozone: Number.isFinite(Number(current.ozone))
          ? Number(current.ozone)
          : null,
        no2: Number.isFinite(Number(current.nitrogen_dioxide))
          ? Number(current.nitrogen_dioxide)
          : null,
        so2: Number.isFinite(Number(current.sulphur_dioxide))
          ? Number(current.sulphur_dioxide)
          : null,
        co: Number.isFinite(Number(current.carbon_monoxide))
          ? Number(current.carbon_monoxide)
          : null,
        observedAt: current.time || null,
      };
    });
    const withValues = readings.filter((cell) => cell.aqi !== null);
    const payload = {
      cells: readings,
      side,
      box,
      modelledCells: withValues.length,
      retrievedAt: new Date().toISOString(),
      status: 'ready',
    };
    _airQualityCache.set(key, { payload, cachedAt: Date.now() });
    trimCache();
    return payload;
  }

  function install(middlewares) {
    middlewares.use('/api/air-quality/grid', async (req, res) => {
      if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'Method Not Allowed' });
        return;
      }
      if (!_airQualityRateLimiter(clientKey(req))) {
        res.writeHead(429, {
          'Content-Type': 'application/json',
          'Retry-After': '5',
        });
        res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
        return;
      }
      const url = new URL(req.url, 'http://localhost');
      const requested = validAirQualityBox(url.searchParams);
      if (!requested) {
        sendJson(res, 400, {
          error: 'A non-dateline bbox no larger than 40 degrees is required',
        });
        return;
      }
      const side = resolveGridSide(url.searchParams.get('side'));
      // Query the SNAPPED box so neighbouring views share one cache entry; an
      // outward snap always covers what was asked for.
      const box = quantizeAirQualityBox(requested);
      const key = airQualityCacheKey(box, side);
      const now = Date.now();
      const cached = _airQualityCache.get(key);
      if (cached && now - cached.cachedAt <= AQ_MEMORY_TTL_MS) {
        sendJson(
          res,
          200,
          { ...cached.payload, status: 'cached' },
          { 'X-Air-Quality': 'MEMORY' },
        );
        return;
      }
      const request = coalesceProxyRequest(_airQualityInFlight, key, () =>
        refresh({ box, side, key }),
      );
      try {
        const payload = await request.promise;
        sendJson(res, 200, payload, {
          'X-Air-Quality': request.shared ? 'INFLIGHT' : 'MISS',
        });
      } catch (error) {
        if (cached && now - cached.cachedAt <= AQ_STALE_MS) {
          sendJson(
            res,
            200,
            { ...cached.payload, status: 'stale' },
            { 'X-Air-Quality': 'STALE' },
          );
          return;
        }
        sendJson(res, 503, {
          error: 'Air quality model output is temporarily unavailable',
          reason: airQualityFailureReason(error),
        });
      }
    });
  }

  return {
    name: 'air-quality-proxy',
    configureServer(server) {
      install(server.middlewares);
    },
    configurePreviewServer(server) {
      install(server.middlewares);
    },
  };
}

export { airQualityProxy };

export {
  AQ_GRID_SIDE_DEFAULT,
  AQ_GRID_SIDE_MAX,
  AQ_VARIABLES,
} from './air-quality/constants.js';
export {
  airQualityCacheKey,
  airQualityFailureReason,
  gridCells,
  quantizeAirQualityBox,
  resolveGridSide,
  validAirQualityBox,
} from './air-quality/grid.js';
