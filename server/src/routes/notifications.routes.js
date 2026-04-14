import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db.js';
import { staffApiErrorBody } from '../lib/staffApiError.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

const registerBody = z.object({
  token: z.string().min(20).max(4096),
  platform: z.enum(['android', 'ios', 'web']),
});

/**
 * `POST /api/notifications/devices` — register FCM token for signed-in user (upsert by token uniqueness).
 */
router.post('/devices', requireAuth, async (req, res) => {
  const parsed = registerBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(staffApiErrorBody('Invalid body', 400));
  }
  const { token, platform } = parsed.data;
  const userId = req.user.id;

  await prisma.pushDevice.upsert({
    where: { fcmToken: token },
    create: { userId, fcmToken: token, platform },
    update: { userId, platform },
  });

  return res.status(204).send();
});

/**
 * `DELETE /api/notifications/devices` — remove this device token (logout / token rotation).
 */
router.delete('/devices', requireAuth, async (req, res) => {
  const parsed = registerBody.pick({ token: true }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(staffApiErrorBody('Invalid body', 400));
  }
  await prisma.pushDevice.deleteMany({
    where: { fcmToken: parsed.data.token, userId: req.user.id },
  });
  return res.status(204).send();
});

/**
 * `GET /api/notifications/inbox?limit=50` — server inbox for sync (newest first).
 */
router.get('/inbox', requireAuth, async (req, res) => {
  const lim = Math.min(
    100,
    Math.max(1, parseInt(String(req.query.limit ?? '40'), 10) || 40),
  );
  const rows = await prisma.userNotification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: lim,
    select: {
      id: true,
      category: true,
      title: true,
      body: true,
      payloadJson: true,
      createdAt: true,
      readAt: true,
      dedupeKey: true,
    },
  });

  return res.json({
    items: rows.map((r) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      body: r.body,
      payload: r.payloadJson,
      createdAtMs: r.createdAt.getTime(),
      read: r.readAt != null,
      dedupeKey: r.dedupeKey,
      serverRevision: r.createdAt.getTime(),
    })),
  });
});

/**
 * `POST /api/notifications/inbox/:id/read` — mark server row read (optional client sync).
 */
router.post('/inbox/:id/read', requireAuth, async (req, res) => {
  const id = String(req.params.id ?? '').trim();
  if (!id) {
    return res.status(400).json(staffApiErrorBody('Invalid id', 400));
  }
  const u = await prisma.userNotification.updateMany({
    where: { id, userId: req.user.id },
    data: { readAt: new Date() },
  });
  if (u.count === 0) {
    return res.status(404).json(staffApiErrorBody('Not found', 404));
  }
  return res.status(204).send();
});

export default router;
