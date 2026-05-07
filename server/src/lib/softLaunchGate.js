/**
 * Soft-launch GO/NO-GO manual checklist (operator confirmation — not automated here).
 * Runner: `npm --prefix server run soft-launch:gate` → `scripts/soft-launch-gate.mjs`.
 */

/** @typedef {{ id: string, label: string, domain: 'payment' | 'fulfillment' | 'security' | 'infra' | 'ops' }} SoftLaunchManualItem */

/** @type {SoftLaunchManualItem[]} */
export const SOFT_LAUNCH_MANUAL_CHECKLIST = [
  {
    id: 'stripe_live_keys_rotated',
    label: 'Stripe live keys rotated; publishable keys match account; old keys revoked in Dashboard',
    domain: 'payment',
  },
  {
    id: 'stripe_live_webhook_secret',
    label: 'Live-mode Stripe webhook signing secret (whsec_…) set for production endpoint; matches active Dashboard endpoint',
    domain: 'payment',
  },
  {
    id: 'reloadly_operator_ids_verified',
    label: 'Reloadly real operator IDs verified in Dashboard (Afghanistan: mtn, roshan, afghanwireless, etisalat, salaam)',
    domain: 'fulfillment',
  },
  {
    id: 'reloadly_outbound_off_until_approval',
    label: 'PHASE1_FULFILLMENT_OUTBOUND_ENABLED remains false until final operator sign-off (then enable deliberately)',
    domain: 'fulfillment',
  },
  {
    id: 'restricted_regions_tested',
    label: 'Restricted / sanctioned region controls manually tested on staging or canary (dial + country probes)',
    domain: 'security',
  },
  {
    id: 'monitoring_alerts_enabled',
    label: 'Monitoring and alerts enabled (metrics scrape, logs, error budgets, on-call path)',
    domain: 'infra',
  },
  {
    id: 'rollback_plan_written',
    label: 'Rollback plan written and agreed (flags, revert, Stripe/Reloadly freeze, comms)',
    domain: 'ops',
  },
];

export const SOFT_LAUNCH_GATE_SCHEMA = 'zora.soft_launch_gate.v1';
export const SOFT_LAUNCH_GATE_VERSION = 1;
