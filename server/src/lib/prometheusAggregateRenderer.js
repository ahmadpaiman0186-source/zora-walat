/**
 * Renders Prometheus exposition from Redis hash (`redisMetricsAggregator`) + local rolling windows.
 */
import { env } from '../config/env.js';
import { fetchRedisMetricsHash } from './redisMetricsAggregator.js';

function escapeLabel(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * @param {Record<string, number>} counters
 * @param {object} windows from getOpsMetricsSnapshot().windows
 */
export function renderLocalCountersAndWindows(counters, windows) {
  const lines = [
    '# HELP zora_ops_counters Process-local counters since boot (single replica view).',
    '# TYPE zora_ops_counters gauge',
    `# zora_instance_info instance metadata.`,
    `zora_instance_info{instance_id="${escapeLabel(env.instanceId)}"} 1`,
  ];
  for (const [k, v] of Object.entries(counters)) {
    const name = String(k).replace(/[^a-zA-Z0-9_]/g, '_');
    if (!Number.isFinite(v)) continue;
    lines.push(`zora_ops_counters{name="${escapeLabel(name)}"} ${v}`);
  }
  lines.push(
    '# HELP zora_ops_window_failure_ratio Rolling window ratio (process-local).',
    '# TYPE zora_ops_window_failure_ratio gauge',
  );
  if (windows.paymentFailureRate != null) {
    lines.push(`zora_ops_window_failure_ratio{window="payment"} ${windows.paymentFailureRate}`);
  }
  if (windows.fulfillmentFailureRate != null) {
    lines.push(
      `zora_ops_window_failure_ratio{window="fulfillment"} ${windows.fulfillmentFailureRate}`,
    );
  }
  if (windows.pushFailureRate != null) {
    lines.push(`zora_ops_window_failure_ratio{window="push"} ${windows.pushFailureRate}`);
  }
  return `${lines.join('\n')}\n`;
}

/**
 * @param {Record<string, string>} redisHash
 * @param {object} windows
 */
export function renderRedisCountersPrometheus(redisHash, windows) {
  const lines = [
    '# HELP zora_cluster_counter_total Cluster-wide counters (Redis-backed; multi-replica safe).',
    '# TYPE zora_cluster_counter_total counter',
    `# zora_metrics_source_info{backend="redis",instance_id="${escapeLabel(env.instanceId)}"} 1`,
    `zora_metrics_source_info{backend="redis",instance_id="${escapeLabel(env.instanceId)}"} 1`,
  ];

  /** @type {Map<string, { buckets: Map<string, number>, sum?: number, count?: number }>} */
  const hist = new Map();

  for (const [field, raw] of Object.entries(redisHash)) {
    const v = Number(raw);
    if (!Number.isFinite(v)) continue;

    if (field.startsWith('c|')) {
      const name = field.slice(2);
      lines.push(
        `zora_cluster_counter_total{name="${escapeLabel(name)}",legacy_flat="true"} ${v}`,
      );
      continue;
    }

    if (field.startsWith('lc|')) {
      const rest = field.slice(3);
      const idx = rest.indexOf('|');
      const metric = idx === -1 ? rest : rest.slice(0, idx);
      const labelStr = idx === -1 ? '' : rest.slice(idx + 1);
      const labelPairs = parseLabelPairs(labelStr);
      const lbl = formatPromLabels(labelPairs);
      lines.push(`zora_cluster_counter_total{metric="${escapeLabel(metric)}"${lbl}} ${v}`);
      continue;
    }

    if (field.startsWith('hb|')) {
      const sub = field.slice(3);
      const leIdx = sub.lastIndexOf('|le=');
      if (leIdx === -1) continue;
      const head = sub.slice(0, leIdx);
      const le = sub.slice(leIdx + 4);
      const hp = head.split('|');
      const metric = hp[0];
      const labelCsv = hp.slice(1).join('|');
      const hkey = `${metric}|${labelCsv}`;
      if (!hist.has(hkey)) hist.set(hkey, { buckets: new Map(), sum: undefined, count: undefined });
      hist.get(hkey).buckets.set(le, v);
      continue;
    }

    if (field.startsWith('hs|')) {
      const sub = field.slice(3);
      const last = sub.lastIndexOf('|');
      if (last === -1) continue;
      const kindPart = sub.slice(last + 1);
      const head = sub.slice(0, last);
      const hp = head.split('|');
      const metric = hp[0];
      const labelCsv = hp.slice(1).join('|');
      const hkey = `${metric}|${labelCsv}`;
      if (!hist.has(hkey)) hist.set(hkey, { buckets: new Map(), sum: undefined, count: undefined });
      const h = hist.get(hkey);
      if (kindPart === 'sum') h.sum = v;
      else if (kindPart === 'count') h.count = v;
    }
  }

  for (const [key, h] of hist) {
    const pipe = key.indexOf('|');
    const metric = pipe === -1 ? key : key.slice(0, pipe);
    const labelCsv = pipe === -1 ? '' : key.slice(pipe + 1);
    const labelPairs = parseLabelPairs(labelCsv);
    const baseLbl = formatPromLabels(labelPairs);
    const sortedLe = [...h.buckets.keys()].sort((a, b) => {
      if (a === 'inf') return 1;
      if (b === 'inf') return -1;
      return Number(a) - Number(b);
    });
    for (const le of sortedLe) {
      const c = h.buckets.get(le);
      if (c == null) continue;
      lines.push(
        `${metric}_bucket{le="${escapeLabel(le)}"${baseLbl}} ${c}`,
      );
    }
    const sumLbl = formatPromBraces(labelPairs);
    if (h.sum != null) {
      lines.push(`${metric}_sum${sumLbl} ${h.sum}`);
    }
    if (h.count != null) {
      lines.push(`${metric}_count${sumLbl} ${h.count}`);
    }
  }

  lines.push(
    '# HELP zora_ops_window_failure_ratio Rolling window ratio (process-local; complement Redis).',
    '# TYPE zora_ops_window_failure_ratio gauge',
  );
  if (windows.paymentFailureRate != null) {
    lines.push(`zora_ops_window_failure_ratio{window="payment"} ${windows.paymentFailureRate}`);
  }
  if (windows.fulfillmentFailureRate != null) {
    lines.push(
      `zora_ops_window_failure_ratio{window="fulfillment"} ${windows.fulfillmentFailureRate}`,
    );
  }
  if (windows.pushFailureRate != null) {
    lines.push(`zora_ops_window_failure_ratio{window="push"} ${windows.pushFailureRate}`);
  }

  return `${lines.join('\n')}\n`;
}

function parseLabelPairs(s) {
  /** @type {Record<string, string>} */
  const out = {};
  if (!s.trim()) return out;
  for (const part of s.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function formatPromLabels(/** @type {Record<string, string>} */ pairs) {
  let s = '';
  for (const [k, v] of Object.entries(pairs)) {
    s += `,${k}="${escapeLabel(v)}"`;
  }
  return s;
}

function formatPromBraces(/** @type {Record<string, string>} */ pairs) {
  const inner = Object.entries(pairs)
    .map(([k, v]) => `${k}="${escapeLabel(v)}"`)
    .join(',');
  return inner ? `{${inner}}` : '';
}

/** @param {() => { counters: Record<string, number>, windows: object }} getSnapshot */
export async function buildPrometheusMetricsPayload(getSnapshot) {
  const snap = getSnapshot();
  if (!env.metricsRedisAggregation) {
    return renderLocalCountersAndWindows(snap.counters, snap.windows);
  }
  const redisHash = await fetchRedisMetricsHash();
  if (Object.keys(redisHash).length === 0) {
    return renderLocalCountersAndWindows(snap.counters, snap.windows);
  }
  return renderRedisCountersPrometheus(redisHash, snap.windows);
}
