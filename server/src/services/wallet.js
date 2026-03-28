import { config } from '../config.js';

const WALLET_PLATFORM = 'platform_commission';

export async function ensureWallets(prisma) {
  await prisma.wallet.upsert({
    where: { id: WALLET_PLATFORM },
    create: { id: WALLET_PLATFORM, balanceCents: 0 },
    update: {},
  });
}

/**
 * Credit platform commission (10% of captured Stripe amount by default).
 */
export async function creditCommission({
  prisma,
  stripePaymentId,
  commissionCents,
  metadata,
}) {
  if (commissionCents <= 0) return;

  await ensureWallets(prisma);

  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: WALLET_PLATFORM },
      data: { balanceCents: { increment: commissionCents } },
    }),
    prisma.ledgerEntry.create({
      data: {
        walletId: WALLET_PLATFORM,
        stripePaymentId,
        amountCents: commissionCents,
        direction: 'CREDIT',
        reason: 'STRIPE_TOPUP_COMMISSION',
        metadata: JSON.stringify({
          rate: config.commissionRate,
          ...metadata,
        }),
      },
    }),
  ]);
}
