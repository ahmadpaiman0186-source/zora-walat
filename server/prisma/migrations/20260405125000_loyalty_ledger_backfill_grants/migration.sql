-- Idempotent backfill: LoyaltyPointsGrant (family_loyalty) and ReferralLoyaltyBonus (referral_program) exist by now.

INSERT INTO "LoyaltyLedger" ("id", "userId", "source", "sourceId", "amount", "type", "createdAt")
SELECT
    'll_chk_' || g."paymentCheckoutId",
    g."userId",
    'checkout_grant',
    'checkout_grant:' || g."paymentCheckoutId",
    g."points",
    'CREDIT',
    g."createdAt"
FROM "LoyaltyPointsGrant" g
ON CONFLICT ("sourceId") DO NOTHING;

INSERT INTO "LoyaltyLedger" ("id", "userId", "source", "sourceId", "amount", "type", "createdAt")
SELECT
    'll_rb_' || b."referralId",
    b."userId",
    'referral_bonus',
    'referral_bonus:' || b."referralId",
    b."points",
    'CREDIT',
    b."createdAt"
FROM "ReferralLoyaltyBonus" b
ON CONFLICT ("sourceId") DO NOTHING;
