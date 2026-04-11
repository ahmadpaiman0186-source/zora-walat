import { ZodError } from 'zod';

import { env } from '../config/env.js';
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

function badRequest(res) {
  return res.status(400).json({
    error: env.nodeEnv === 'production' ? 'Invalid request' : 'Invalid request body',
  });
}

export async function postRegister(req, res) {
  let parsed;
  try {
    parsed = registerBodySchema.parse(req.body ?? {});
  } catch (e) {
    if (e instanceof ZodError) {
      if (env.nodeEnv !== 'production') {
        return res.status(400).json({
          error: 'Invalid request body',
          details: e.flatten(),
        });
      }
      return badRequest(res);
    }
    throw e;
  }
  const out = await registerUser(parsed);
  return res.status(201).json(out);
}

export async function postLogin(req, res) {
  let parsed;
  try {
    parsed = loginBodySchema.parse(req.body ?? {});
  } catch (e) {
    if (e instanceof ZodError) {
      if (env.nodeEnv !== 'production') {
        return res.status(400).json({
          error: 'Invalid request body',
          details: e.flatten(),
        });
      }
      return badRequest(res);
    }
    throw e;
  }
  const out = await loginUser(parsed);
  return res.json(out);
}

export async function postRefresh(req, res) {
  let parsed;
  try {
    parsed = refreshBodySchema.parse(req.body ?? {});
  } catch (e) {
    if (e instanceof ZodError) {
      if (env.nodeEnv !== 'production') {
        return res.status(400).json({
          error: 'Invalid request body',
          details: e.flatten(),
        });
      }
      return badRequest(res);
    }
    throw e;
  }
  const out = await refreshSession(parsed.refreshToken);
  return res.json(out);
}

export async function postLogout(req, res) {
  let parsed;
  try {
    parsed = logoutBodySchema.parse(req.body ?? {});
  } catch (e) {
    if (e instanceof ZodError) {
      if (env.nodeEnv !== 'production') {
        return res.status(400).json({
          error: 'Invalid request body',
          details: e.flatten(),
        });
      }
      return badRequest(res);
    }
    throw e;
  }
  await logoutRefreshToken(parsed.refreshToken);
  return res.json({ ok: true });
}

export async function getMe(req, res) {
  const u = req.user;
  if (!u) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  return res.json({
    user: { id: u.id, email: u.email, role: u.role },
  });
}

export async function postRequestOtp(req, res) {
  let parsed;
  try {
    parsed = requestOtpBodySchema.parse(req.body ?? {});
  } catch (e) {
    if (e instanceof ZodError) {
      if (env.nodeEnv !== 'production') {
        return res.status(400).json({
          error: 'Invalid request body',
          details: e.flatten(),
        });
      }
      return badRequest(res);
    }
    throw e;
  }

  const out = await requestEmailOtp(parsed, { sendOtp: sendOTP });
  return res.status(200).json(out);
}

export async function postVerifyOtp(req, res) {
  let parsed;
  try {
    parsed = verifyOtpBodySchema.parse(req.body ?? {});
  } catch (e) {
    if (e instanceof ZodError) {
      if (env.nodeEnv !== 'production') {
        return res.status(400).json({
          error: 'Invalid request body',
          details: e.flatten(),
        });
      }
      return badRequest(res);
    }
    throw e;
  }

  const out = await verifyEmailOtp(parsed);
  return res.status(200).json(out);
}
