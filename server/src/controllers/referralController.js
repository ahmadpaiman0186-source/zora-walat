import {
  getReferralHistoryPayload,
  getReferralMePayload,
} from '../services/referral/referralUserApiService.js';

export async function getReferralMe(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const payload = await getReferralMePayload(userId);
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(payload);
}

export async function getReferralHistory(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const payload = await getReferralHistoryPayload(userId);
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(payload);
}
