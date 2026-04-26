import { ZodError } from 'zod';

import { env } from '../config/env.js';
import { AUTH_ERROR_CODE } from '../constants/authErrors.js';
import {
  loginBodySchema,
  logoutBodySchema,
  requestOtpBodySchema,
  refreshBodySchema,
  registerBodySchema,
  verifyOtpBodySchema,
} from '../validators/auth.js';
import {
  loginUser,
  logoutRefreshToken,
  refreshSession,
  registerUser,
  requestEmailOtp,
  verifyEmailOtp,
} from '../services/authService.js';
import { sendOTP } from '../../services/emailService.js';
import { riskClientIpKey } from '../services/risk/riskHttp.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';

function authValidationError(res, e) {
  if (e instanceof ZodError) {
    if (env.nodeEnv !== 'production') {
      return res.status(400).json({
        ...clientErrorBody('Invalid request body', AUTH_ERROR_CODE.VALIDATION_ERROR),
        details: e.flatten(),
      });
    }
    return res
      .status(400)
      .json(
        clientErrorBody('Invalid request body', AUTH_ERROR_CODE.VALIDATION_ERROR),
      );
  }
  throw e;
}

export async function postRegister(req, res) {
  console.log('REGISTER ENDPOINT HIT');
  let parsed;
  try {
    parsed = registerBodySchema.parse(req.body ?? {});
  } catch (e) {
    return authValidationError(res, e);
  }
  const out = await registerUser(parsed);
  return res.status(201).json(out);
}

export async function postLogin(req, res) {
  let parsed;
  try {
    parsed = loginBodySchema.parse(req.body ?? {});
  } catch (e) {
    return authValidationError(res, e);
  }
  const out = await loginUser(parsed);
  return res.json(out);
}

export async function postRefresh(req, res) {
  let parsed;
  try {
    parsed = refreshBodySchema.parse(req.body ?? {});
  } catch (e) {
    return authValidationError(res, e);
  }
  const out = await refreshSession(parsed.refreshToken);
  return res.json(out);
}

export async function postLogout(req, res) {
  let parsed;
  try {
    parsed = logoutBodySchema.parse(req.body ?? {});
  } catch (e) {
    return authValidationError(res, e);
  }
  await logoutRefreshToken(parsed.refreshToken);
  return res.json({ success: true, ok: true });
}

export async function getMe(req, res) {
  const u = req.user;
  if (!u) {
    return res
      .status(401)
      .json(
        clientErrorBody('Authentication required', AUTH_ERROR_CODE.AUTH_REQUIRED),
      );
  }
  return res.json({
    success: true,
    user: {
      id: u.id,
      email: u.email,
      role: u.role,
      emailVerified: Boolean(u.emailVerified),
    },
  });
}

export async function postRequestOtp(req, res) {
  let parsed;
  try {
    parsed = requestOtpBodySchema.parse(req.body ?? {});
  } catch (e) {
    return authValidationError(res, e);
  }

  const out = await requestEmailOtp(parsed, {
    sendOtp: sendOTP,
    clientIpKey: riskClientIpKey(req),
  });
  return res.status(200).json(out);
}

/** Same semantics as [postRequestOtp] — explicit client contract for “resend”. */
export const postResendOtp = postRequestOtp;

export async function postVerifyOtp(req, res) {
  let parsed;
  try {
    parsed = verifyOtpBodySchema.parse(req.body ?? {});
  } catch (e) {
    return authValidationError(res, e);
  }

  const out = await verifyEmailOtp(parsed, {
    clientIpKey: riskClientIpKey(req),
  });
  return res.status(200).json(out);
}
