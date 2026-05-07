/**
 * Bull Board UI for BullMQ (Phase 1 fulfillment + DLQ). Mounted only when the queue is enabled + Redis.
 * Protected by {@link requireAdminIpAllowlist} + {@link requireAdminSecret} (same as webtop admin control).
 */

import { Router } from 'express';

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { getPhase1FulfillmentDeadLetterQueue } from '../queues/phase1FulfillmentDeadLetterQueue.js';
import { getPhase1FulfillmentQueue } from '../queues/phase1FulfillmentQueue.js';
import { requireAdminIpAllowlist } from '../middleware/adminIpAllowlist.js';
import { requireAdminSecret } from '../middleware/adminSecretAuth.js';

/**
 * @param {import('express').Express} app
 */
export function mountBullBoardIfConfigured(app) {
  const primary = getPhase1FulfillmentQueue();
  if (!primary) {
    return;
  }

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const queues = [new BullMQAdapter(primary)];
  const dlq = getPhase1FulfillmentDeadLetterQueue();
  if (dlq) {
    queues.push(new BullMQAdapter(dlq));
  }

  createBullBoard({
    queues,
    serverAdapter,
  });

  const router = Router();
  router.use(requireAdminIpAllowlist);
  router.use(requireAdminSecret);
  router.use(serverAdapter.getRouter());

  app.use('/admin/queues', router);
}
