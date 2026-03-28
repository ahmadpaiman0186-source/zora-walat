import './config.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PrismaClient, Prisma } = require('@prisma/client');

export const prisma = new PrismaClient();
export { Prisma };
