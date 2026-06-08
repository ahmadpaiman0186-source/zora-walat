# L-83A — Risk register

| ID | Risk | Severity | Mitigation (design) | Status |
|----|------|----------|---------------------|--------|
| R1 | Probe enabled on production project | Critical | Dual gate: probe flag + `ZW_API_DEPLOYMENT_TIER=staging`; 404 fail closed | OPEN — design only |
| R2 | Operator mistakes staging env on prod | Critical | Separate Vercel project; pre-deploy checklist in future L-step | OPEN |
| R3 | HTTP body carries Stripe payload | High | Reject non-empty body; fixed fixture only | Mitigated in design |
| R4 | Accidental fulfillment scheduling | Critical | Import boundary + static tests; no shared webhook route code | Mitigated in design |
| R5 | DB mutation via shared middleware | High | Thin route; no money-path middleware | Mitigated in design |
| R6 | Secret leakage in logs | High | Reuse L-80 envelope + leak fixtures | Mitigated in design |
| R7 | False claim of L-74 closure | High | Non-claims doc; synthetic probe only | Mitigated in design |
| R8 | Refactoring webhook hook (Option C) | Medium | Rejected — use isolated adapter | Closed |
| R9 | NODE_ENV-only staging detection | High | Explicit tier env; Vercel staging uses production NODE_ENV | Mitigated in design |
| R10 | Probe used as load test spam | Medium | apiIpLimiter + ops token | OPEN |

## Stop conditions (abort implementation approval)

- Any design revision requires Stripe replay
- Any design revision requires DB write
- Any design revision exposes route on production without 404 fail closed
- Any artifact claims FULLY_PROVEN or production readiness
- Any artifact claims L-74 closed

---

*End.*
