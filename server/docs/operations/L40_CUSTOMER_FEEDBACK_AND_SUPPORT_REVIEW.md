# L40 — Customer feedback and support review

## Feedback channels

| Channel | Owner | Typical latency | Notes |
|---------|-------|-----------------|-------|
| In-app / store reviews | Product + Support | varies | Export aggregates; no PII in shared decks |
| Email / helpdesk | Support | SLA per policy | Link tickets only |
| Social / community | Marketing / Trust | — | Escalate trust/safety themes |
| Internal sales / partners | AM | — | Qualitative signal |

## Support ticket taxonomy

Align tags with product areas, for example:

- **Payment / checkout** — card errors, 3DS, Stripe decline codes (redacted aggregates)
- **Fulfillment / delivery** — stuck “processing,” wrong amount, delay
- **Account / auth** — login, OTP, JWT/session
- **Trust / safety** — fraud suspicion, account takeover reports
- **UX / catalog** — confusion, wrong SKU, language
- **Refund / billing** — disputes, duplicate charge perception

## Transaction-linked feedback

- Where possible, link feedback to **order id suffix** + **time window** only in shared channels.
- Correlate with incident timeline to avoid mis-prioritizing outage noise.

## Complaint themes

- Weekly: top **5** themes by volume and **severity-weighted** impact.
- Tag “**money-path**” vs “**cosmetic**” for prioritization.

## UX friction themes

- Checkout steps, error copy clarity, retry behavior.
- Feed into product backlog with repro steps (no customer PII).

## Refund / dispute themes

- Map to `PHASE1_REFUND_AND_DISPUTE.md` categories.
- Flag **provider vs Stripe vs policy** root causes separately.

## Language / localization issues

- Mis-translated error strings, RTL/layout, currency display.
- Route to localization owner with screenshot (redact PII).

## Trust / safety concerns

- Scam reports, impersonation, child safety (if applicable).
- Escalate per internal trust policy; **do not** debate customers in public threads.

## Action prioritization

| Priority | Criteria |
|----------|----------|
| **P0** | Active money loss, security, widespread outage |
| **P1** | High-volume payment/fulfillment failure pattern |
| **P2** | UX debt with measurable drop-off |
| **P3** | Nice-to-have copy or cosmetic |

## Evidence retention rules

- Tickets: per company retention; **redact** exports for exec review.
- Do **not** store full card numbers, CVV, or webhook signing secrets in feedback databases.
- Audio/screenshots: access-controlled storage only.

## Related

- [L40_POST_SOFT_LAUNCH_LEARNING_LOOP.md](./L40_POST_SOFT_LAUNCH_LEARNING_LOOP.md)
- [L40_CORRECTIVE_ACTION_TRACKER.md](./L40_CORRECTIVE_ACTION_TRACKER.md)
