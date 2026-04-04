import { Router } from 'express';

import { prisma } from '../db.js';

const router = Router();

/** Liveness — process up (safe behind LB without hitting DB). */
router.get('/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ status: 'ok' });
});

/** Readiness — PostgreSQL reachable (use for rolling deploys / multi-instance). */
router.get('/ready', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ status: 'ready' });
  } catch {
    return res.status(503).json({ status: 'unavailable' });
  }
});

export default router;
