# L39 — Change approval matrix

Map **change types** to **evidence**, **approvers**, and **governance** flags. Adjust names to match your org RACI.

| Change type | Examples | Required evidence | Required approvers | Rollback requirement | Launch blocking | Emergency override allowed | Post-change review required |
|-------------|----------|-------------------|--------------------|----------------------|-----------------|----------------------------|-----------------------------|
| **Docs-only change** | L39/L25 markdown, runbook text | PR review, CI if repo requires | Eng lead (1) | N/A | No | Yes (still need PR) | Optional |
| **Runtime code change** | API behavior, non-money features | CI green, staging spot-check | Eng lead + peer reviewer | Deploy rollback / feature flag note | If touches money path indirectly | Yes with retro | Yes for prod |
| **Money-path change** | Checkout, fulfillment orchestration, pricing | CI + targeted staging + finance note | Eng lead + **Finance delegate** + peer | Rollback + reconciliation plan | **Yes** | Limited — see emergency policy | **Yes** |
| **Stripe / webhook change** | Handlers, signing, event types | Idempotency review, webhook test hooks | Eng + **Finance** + Security (if available) | Revert deploy + Stripe dashboard note | **Yes** | Break-glass + retro | **Yes** |
| **Reloadly / provider change** | Adapter, operator map, timeouts | Sandbox proof or doc signoff | Eng + Product/AM + Finance | Disable outbound / freeze SKU | **Yes** | Break-glass + retro | **Yes** |
| **DB / schema change** | Migrations, new constraints | Migration plan, backup pointer, dry-run | Eng + DBA/Platform + Finance if ledger | Forward-fix / restore playbook | **Yes** if ledger | Rare — exec + retro | **Yes** |
| **Env / secret change** | New API keys, feature flags in prod | Ticket, rotation plan, no values in ticket | Platform + Security | Revert secret version / flag | **Yes** | Break-glass + retro | **Yes** |
| **Infrastructure / DNS change** | Vercel, Neon routing, DNS cutover | Runbook, maintenance window | Platform + Security | DNS/edge rollback | **Yes** for traffic | With IC signoff + retro | **Yes** |
| **Observability / alert change** | New alerts, routing | Alert dry-run, noise check | SRE + Eng owner | Disable route / threshold | If masks money-path | Yes with retro | Medium |
| **Security / compliance change** | Auth hardening, policy gates | Security review artifact | Security + Eng | Revert deploy | **Yes** if weakens controls | Per emergency policy | **Yes** |
| **Emergency hotfix** | Sev0/Sev1 mitigation | Incident ticket, minimal test proof | **2 of:** Eng on-call, Security, Exec delegate | Rollback or forward-fix documented | N/A (already live) | **Defined in emergency policy** | **Mandatory retrospective** |
| **Public launch change** | Removing broad restrictions, marketing GA | Full readiness checklist signoff | Exec + Eng + Product + Finance + Security | Launch rollback / comms plan | **Yes** until signed | **No** convenience override | Post-launch review |

## Related

- [L39_RELEASE_GOVERNANCE_AND_CHANGE_APPROVAL_PLAN.md](./L39_RELEASE_GOVERNANCE_AND_CHANGE_APPROVAL_PLAN.md)
- [L39_EMERGENCY_CHANGE_POLICY.md](./L39_EMERGENCY_CHANGE_POLICY.md)
