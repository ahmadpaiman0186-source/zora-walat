# L-49 — Capture approval phrase

**Gate:** L-49 filed only — phrase **not issued** in this session.

---

## Exact approval phrase for L-50

Manual read-only observability evidence capture is authorized **only** when this **exact** string is recorded in the approval log or session notes:

```
APPROVE L-50 MANUAL READ-ONLY OBSERVABILITY EVIDENCE CAPTURE ONLY
```

**Future L-50 requires the exact approval phrase: APPROVE L-50 MANUAL READ-ONLY OBSERVABILITY EVIDENCE CAPTURE ONLY.**

---

## Invalid variants (do NOT authorize L-50)

| Invalid example | Why invalid |
|-----------------|-------------|
| `approve l-50 capture` | Wrong casing / incomplete |
| `APPROVE L-50 CAPTURE` | Missing READ-ONLY OBSERVABILITY EVIDENCE |
| `APPROVE L-49 CAPTURE` | Wrong L-step |
| Verbal assent without exact phrase | Not bound to gate |

---

## What the phrase authorizes

| Authorized | Not authorized |
|------------|----------------|
| Human operator manual Better Stack + Vercel dashboard access (read-only) | Deploy, redeploy, config change |
| Redacted screenshot / attestation capture | DB, payment, webhook, provider mutation |
| Files placed in L-46 dropzone only | Readiness upgrade |
| Follow REQUIRED_EVIDENCE_MANIFEST.md | Agent automation without operator |

---

## What the phrase does NOT authorize

| Not authorized by L-50 phrase alone |
|---------------------------------------|
| L-47 retry intake (separate approval may be required) |
| Production-ready / real-money-ready / pilot-ready / global-launch-ready claim |
| Runtime Doctor apply / self-healing apply |
| Stripe replay, webhook probe, live transaction |

---

## Recording requirements

When phrase is issued (future):

| Field | Required |
|-------|----------|
| Exact phrase text | **YES** |
| Issuer name/role | **YES** |
| UTC timestamp | **YES** |
| Reference to this gate (L-49) | **YES** |

Store reference in session notes or Ap786 approval record — **not** in env files or secrets.

---

## L-49 status

| Field | Value |
|-------|-------|
| Phrase filed | **YES** |
| Phrase issued | **NO** |
| L-50 capture authorized | **NO** |

---

*End of capture approval phrase document.*
