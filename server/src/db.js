import './config/env.js';
import { PrismaClient, Prisma } from '@prisma/client';

export const prisma = new PrismaClient();
export { Prisma };
