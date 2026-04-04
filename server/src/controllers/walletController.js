import { env } from '../config/env.js';
import * as userWalletService from '../services/wallet/userWalletService.js';

export async function getBalance(req, res) {
  const state = await userWalletService.getWalletState(req.user.id);
  return res.json(state);
}

export async function postTopup(req, res) {
  try {
    const amount = req.body?.amount ?? req.body?.amountUsd;
    const nextState = await userWalletService.topup(req.user.id, amount);
    return res.json({ ok: true, ...nextState });
  } catch (err) {
    const msg =
      env.nodeEnv === 'production'
        ? 'Invalid request'
        : err.message || 'Topup failed';
    return res.status(400).json({ error: msg });
  }
}
