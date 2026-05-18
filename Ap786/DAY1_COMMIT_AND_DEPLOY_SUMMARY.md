# Day 1 — Commit and staging URL summary

## Staging (public)

| Role | URL |
|------|-----|
| Staging API (alias) | https://zora-walat-api-staging.vercel.app |

No deployment id or preview hostname is required for this evidence pack.

## Milestone commits (full hashes where cited)

| Role | Full SHA | Short | One-line subject |
|------|----------|-------|------------------|
| Operator status slim + debug | `014f666ab324097db11a45c94e479e6aebaaf337` | `014f666` | fix(server): slim staging operator status-check and debug state paths |
| Webhook PAID + `/success` slim | `57983768f6510a97a88414949ca8b585abaf268a` | `5798376` | fix(server): slim Stripe checkout webhook PAID path and /success return |

## Related recent chain (context only)

Phase 2 operator harness, slim checkout session creation, and auth slim paths are in the same branch history (see `L1_RELEASE_CONTROL_REPORT.md` last-10 table).

## Branch tip at evidence snapshot

`57983768f6510a97a88414949ca8b585abaf268a` on `fix/post-l40-slim-stripe-webhook-invalid-signature`, matching `origin`.
