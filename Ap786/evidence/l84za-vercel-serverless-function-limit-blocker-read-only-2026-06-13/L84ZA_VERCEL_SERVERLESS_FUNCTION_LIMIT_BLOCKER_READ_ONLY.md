# GLOBAL INTERNATIONAL REAL-PROOF STANDARD — Zora-Walat

NO L WITHOUT REAL PROOF  
NO FAKE PROOF  
NO MARKETING CLAIM WITHOUT MARKET PROOF  
NO MONEY CLAIM WITHOUT MONEY PROOF  
NO GLOBAL CLAIM WITHOUT GLOBAL ENGINEERING EVIDENCE  
REAL APP FOR GLOBAL REVENUE, NOT A DEMO

---

# L-84ZA — Vercel Serverless Function Limit Blocker Read-Only Investigation

Status: BLOCKER CONFIRMED  
Date: 2026-06-13  
Branch: evidence/l84za-vercel-serverless-function-limit-blocker-read-only-2026-06-13

## Scope

This gate records read-only investigation evidence for the Vercel zora-walat-api deployment failure observed on PR #232.

No Vercel mutation was performed.  
No redeploy was performed.  
No environment variable update was performed.  
No Stripe secret access occurred.  
No HTTP / L-84P validation was performed.  
No global launch readiness is claimed.

---

## Observed Vercel deployment error

Project: zora-walat-api

Observed error:

No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan. Create a team (Pro plan) to deploy more.

---

## Local API/function inventory

| Inventory | Count |
|---|---:|
| API_FILE_COUNT | 20 |
| NEXT_API_COUNT | 0 |
| SERVER_API_COUNT | 18 |
| ROOT_API_COUNT | 1 |

## Interpretation

The Vercel deployment blocker is not caused by Next.js app/api or pages/api routes.

The blocker is driven primarily by server/api, which currently contains 18 function-like files.

This exceeds the Vercel Hobby plan limit of 12 Serverless Functions.

---

## Configuration observations

server/vercel.json routes all traffic to:

/api/index.mjs

Root vercel.json uses:

framework: nextjs

Root vercel.json includes rewrite:

/webhooks/stripe -> /api/webhooks/stripe

These observations indicate that deployment target/project mapping and API function generation need a dedicated blocker-resolution gate before merge or runtime proof continues.

---

## Explicit non-actions

- Vercel project settings: NOT CHANGED
- Vercel environment variables: NOT CHANGED
- Redeploy: NOT PERFORMED
- Stripe secret access: NOT PERFORMED
- HTTP / L-84P validation: NOT PERFORMED
- PR #232 merge: NOT PERFORMED
- Global launch: NOT AUTHORIZED

---

## Required next gate

Open a separate resolution gate:

L-84ZB — Vercel Serverless Function Limit Resolution Plan

Required decision path:

1. Confirm whether zora-walat-api should deploy only server/api/index.mjs.
2. Confirm whether current Vercel project mapping is correct.
3. Decide whether API files should be consolidated behind one handler.
4. Decide whether non-production/staging-only endpoints should be excluded from production deployment.
5. Decide whether Pro plan/team upgrade is a business-required infrastructure decision.
6. Preserve rollback safety and no-secret exposure.

---

## Verdict

L-84ZA blocker investigation: BLOCKER CONFIRMED

Root blocker: zora-walat-api exceeds Vercel Hobby serverless function limit.

PR #232 merge: HOLD

L-84 final runtime proof: NOT CLAIMED

Real-money readiness: NOT CLAIMED

Global launch: NO-GO