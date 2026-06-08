# L-83A — Approval gates

## Completed in this step

| Gate | Status |
|------|--------|
| L-83A plan + design gate (Ap786 only) | **THIS STEP** |
| Verdict | `CORE10-L83A-VERDICT-001: L83A_STAGING_ONLY_SHADOW_DIAGNOSTICS_PROBE_DESIGN_GATE_ONLY` |

## Future gates (not requested)

| # | Gate | Required phrase / action |
|---|------|--------------------------|
| G1 | Merge L-83A design PR | Operator GitHub review |
| G2 | Code-only implementation | `APPROVE L-83A CODE-ONLY STAGING SHADOW DIAGNOSTICS PROBE ROUTE IMPLEMENTATION` |
| G3 | Staging env enablement | Separate L-step — set `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED` + `ZW_API_DEPLOYMENT_TIER=staging` on staging project only |
| G4 | Controlled staging redeploy | Separate deploy approval — not combined with G2 without explicit operator phrase |
| G5 | Single staging HTTP probe | Separate evidence L-step — one POST with ops token; capture log line |
| G6 | L-83A implementation | **Must not** start in design gate |

## Explicitly not approved

- L-83A route implementation
- Staging HTTP call
- Vercel env inspection or mutation
- Production touch
- L-83 Approval #2 staging trigger under old codebase (superseded by L-83A track)

---

*End.*
