# HTTP rate limiting — local vs multi-instance



## Behavior



- **Default:** [`express-rate-limit`](https://github.com/express-rate-limit/express-rate-limit) uses an **in-memory** store (per Node process). Multiple app instances do **not** share counters.



- **Multi-instance (optional):** Set env **`RATE_LIMIT_USE_REDIS=true`** (literal) and **`REDIS_URL`**. On API startup, `server/bootstrap.js` connects a dedicated Redis client and wires [`rate-limit-redis`](https://github.com/express-rate-limit/rate-limit-redis) for **all** exported HTTP limiters in `src/middleware/rateLimits.js`. Key prefix: `rl:zora:<name>:`.



- **Failure semantics:** If Redis connection fails at boot, the process logs a warning and limiters **fall back to in-memory** (per process). No crash loop.



- **Tests:** `NODE_ENV=test` skips Redis init; all limiters stay in-memory.



- **In-process integration tests** that import `createApp()` without `bootstrap.js` always use **in-memory** buckets (see `docs/INTEGRATION_AND_E2E_TESTS.md`).



## Redis-backed limiters when `RATE_LIMIT_USE_REDIS=true`



All limiters below use `rateLimitWithOptionalRedis` and the listed prefix when Redis is enabled.



| Limiter | Prefix `rl:zora:…` | Role |

|---------|-------------------|------|

| `authLimiter` | `auth_15m:` | Auth endpoints |

| `stripeWebhookLimiter` | `stripe_webhook_15m:` | Webhook ingress |

| `checkoutAuthenticatedLimiter` | `checkout_auth_15m:` | Authenticated checkout |

| `ordersReadLimiter` | `orders_read_15m:` | Order list/detail reads |

| `authenticatedApiLimiter` | `authed_api_15m:` | Wallet/recharge router (authed) |

| `walletTopupLimiter` | `wallet_topup_15m:` | Wallet top-up 15m |

| `walletTopupPerMinuteLimiter` | `wallet_topup_1m:` | Wallet top-up 1m |

| `staffPrivilegedLimiter` | `staff_priv_15m:` | Staff/ops APIs |

| `phase1TruthReadLimiter` | `phase1_truth_15m:` | Phase 1 truth reads |

| `rechargeExecuteLimiter` | `recharge_execute_15m:` | Fulfillment execute |

| `catalogLimiter` | `catalog_15m_ip:` | Public catalog |

| `apiIpLimiter` | `api_ip_15m:` | Pre-auth wallet/recharge IP |

| `topupOrderCreateLimiter` | `topup_order_create_15m:` | Web top-up create |

| `topupOrderReadLimiter` | `topup_order_read_15m:` | Web top-up read |

| `topupOrderMarkPaidLimiter` | `topup_mark_paid_15m:` | Mark paid transitions |

| `topupPaymentIntentLimiter` | `topup_pi_15m:` | PaymentIntent create |

| `topupOrderSessionBurstLimiter` | `topup_sess_burst_15m:` | Session burst |

| `fulfillmentAdminMutationLimiter` | `admin_fulfill_mut_15m:` | Admin fulfillment mutations |

| `fulfillmentPerOrderLimiter` | `admin_fulfill_ord_15m:` | Per-order admin dispatch |



There are **no** remaining HTTP limiters in `rateLimits.js` that stay memory-only when Redis rate-limiting is enabled.



## Client-visible errors



Unchanged: wallet top-up limiters return **`code: wallet_topup_rate_limited`** / **`wallet_topup_per_minute_limited`**. Other bodies unchanged.



## Ops checklist — rollout visibility

1. Provision Redis reachable from all API replicas.
2. Set `REDIS_URL` and `RATE_LIMIT_USE_REDIS=true` (literal).
3. **Boot logs:** expect `rate_limit_store=redis effectiveHttpRateStore=redis redisKeyPrefixPattern=rl:zora:*`. If Redis connect fails: `rate_limit_store=memory_fallback` + `effectiveHttpRateStore=memory` (per-process buckets; fix Redis).
4. **`GET /ready`:** under `launchSubsystems.httpRateLimit` — `initMode` (`redis` \| `memory_default` \| `memory_fallback` \| `skipped_test_env`), `effectiveHttpRateStore` (`redis` \| `memory`), and `memoryFallbackReason` when fallback occurred.

**Not proven by `/ready`:** limiter correctness under production QPS; only **which store** the process selected at boot.

