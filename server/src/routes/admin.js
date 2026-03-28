import { Router } from 'express';
import { config } from '../config.js';

export function createAdminRouter({ prisma }) {
  const router = Router();

  router.get('/wallet', async (req, res) => {
    const key = req.get('x-admin-key');
    if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { id: 'platform_commission' },
    });

    const recent = await prisma.ledgerEntry.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    const orders = await prisma.topupOrder.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      commissionWalletCents: wallet?.balanceCents ?? 0,
      commissionRate: config.commissionRate,
      recentLedger: recent,
      recentOrders: orders,
    });
  });

  return router;
}
