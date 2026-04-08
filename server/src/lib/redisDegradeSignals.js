/**
 * Redis client self-health counters — kept separate from `opsMetrics` to avoid import cycles
 * (`redisMetricsAggregator` → `redisClient` → must not import `opsMetrics`).
 */

let connectFailures = 0;
let commandFailures = 0;

export function recordRedisClientConnectFailure() {
  connectFailures += 1;
}

export function recordRedisCommandFailure() {
  commandFailures += 1;
}

export function getRedisDegradeCounters() {
  return {
    clientConnectFailures: connectFailures,
    commandFailures,
  };
}
