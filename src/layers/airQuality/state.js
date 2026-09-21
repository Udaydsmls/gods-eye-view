import { DEFAULT_ALPHA, GRID_SIDE } from './policy.js';

export function createState() {
  return {
    viewer: null,
    dataSource: null,
    enabled: false,
    cells: [],
    side: GRID_SIDE,
    alpha: DEFAULT_ALPHA,
    modelledCells: 0,
    lastUpdate: null,
    status: 'idle',
    error: null,
    stale: false,
    loading: false,
    abort: null,
    failureReason: null,
    retryTimer: null,
    retryDelayMs: 0,
    retryAt: 0,
    moveEndRemove: null,
    timer: null,
  };
}
