import { AUTH_ERROR_CODE } from '../constants/authErrors.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';
import {
  getReferralHistoryPayload,
  getReferralMePayload,
} from '../services/referral/referralUserApiService.js';

export async function getReferralMe(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res
      .status(401)
      .json(
        clientErrorBody('Authentication required', AUTH_ERROR_CODE.AUTH_REQUIRED),
      );
  }
  const payload = await getReferralMePayload(userId);
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(payload);
}

export async function getReferralHistory(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res
      .status(401)
      .json(
        clientErrorBody('Authentication required', AUTH_ERROR_CODE.AUTH_REQUIRED),
      );
  }
  const payload = await getReferralHistoryPayload(userId);
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(payload);
}
