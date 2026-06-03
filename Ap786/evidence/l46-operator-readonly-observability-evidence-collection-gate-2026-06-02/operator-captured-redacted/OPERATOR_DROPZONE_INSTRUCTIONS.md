# Operator dropzone instructions

**Audience:** Human operator (not agent automation unless separately authorized)
**Dropzone path:** `Ap786/evidence/l46-operator-readonly-observability-evidence-collection-gate-2026-06-02/operator-captured-redacted/`

---

## Before you capture

1. Obtain explicit approval phrase for read-only capture session (L-46 protocol).
2. Confirm **read-only mode** — you will not change configs, deploy, or mutate production state.
3. Review [REDACTION_POLICY.md](../REDACTION_POLICY.md) and [REDACTION_BEFORE_COMMIT_CHECKLIST.md](./REDACTION_BEFORE_COMMIT_CHECKLIST.md).
4. Close unrelated browser tabs containing secrets or PII.

---

## Capture sources (read-only)

| Source | What to capture |
|--------|-----------------|
| Better Stack | Uptime monitor details, availability table, alert routing/channel, incident/ack screen if available |
| Vercel | Production deployment status, production logs read-only query |
| Production | Frontend health/availability, API health/availability |
| Observability | Money-path dashboard if available |
| SRE/Ops | Sign-off note or screenshot referencing L-45 matrix rows |

**Do not** use staging/sandbox as production proof.

---

## Redact before save

Redact locally **before** copying files into this dropzone:

- Tokens, secrets, API keys, webhook signing secrets
- Auth headers, raw credentials
- User PII, customer/order/payment identifiers
- Sensitive raw log lines
- Personal emails unless essential for proof

---

## Save to dropzone

1. Use **exact filenames** from [REQUIRED_EVIDENCE_MANIFEST.md](./REQUIRED_EVIDENCE_MANIFEST.md).
2. Place only redacted `.png`, `.jpg`, `.jpeg`, `.pdf`, `.md`, or `.txt` files here.
3. Copy [NO_MUTATION_ATTESTATION_TEMPLATE.md](./NO_MUTATION_ATTESTATION_TEMPLATE.md) → complete → save as `NO-MUTATION-ATTESTATION-001.md`.
4. Complete [REDACTION_BEFORE_COMMIT_CHECKLIST.md](./REDACTION_BEFORE_COMMIT_CHECKLIST.md) → save summary as `REDACTION-VERIFICATION-001.md`.

---

## After staging

1. Do **not** claim production-ready or launch-ready posture.
2. Request **L-47 retry intake** or **L-49** with explicit approval phrase.
3. Intake will inspect local files only — no live dashboard access by automation.

---

## Forbidden during capture

| Forbidden |
|-----------|
| Deploy / redeploy |
| Alert rule or monitor create/edit/delete |
| Env/secret view, print, rotate, edit for capture |
| DB, payment, order, wallet, provider, webhook mutation |
| Runtime Doctor `--apply` / self-healing apply |
| Committing unredacted artifacts |

---

*L-48 filed this dropzone only. Capture is operator responsibility in a separate authorized session.*
