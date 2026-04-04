import { z } from 'zod';

export const registerBodySchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(10).max(128),
  })
  .strict();

export const loginBodySchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(128),
  })
  .strict();

export const refreshBodySchema = z
  .object({
    refreshToken: z.string().min(20).max(1024),
  })
  .strict();

export const logoutBodySchema = refreshBodySchema;
