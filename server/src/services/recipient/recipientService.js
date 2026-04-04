import { prisma } from '../../db.js';
import { HttpError } from '../../lib/httpError.js';
import {
  afghanNationalToE164,
  normalizeAfghanNational,
  validateAfghanMobileNational,
} from '../../lib/phone.js';

const DEFAULT_COUNTRY = 'AF';

/**
 * Resolve or create a recipient row from raw phone + operator (Afghan mobile, current product scope).
 * Binds destination identity to the authenticated user for audit and future provider reconciliation.
 */
export async function resolveRecipientFromBody(userId, body) {
  const phone = body?.phone;
  const operator = body?.operator;
  if (!phone || !operator) {
    throw new HttpError(400, 'phone and operator are required');
  }
  const national = normalizeAfghanNational(phone);
  if (!national) {
    throw new HttpError(400, 'Invalid phone');
  }
  const v = validateAfghanMobileNational(national);
  if (!v.ok) {
    throw new HttpError(400, v.error || 'Invalid phone');
  }
  const e164 = afghanNationalToE164(national);
  if (!e164) {
    throw new HttpError(400, 'Invalid phone');
  }
  const operatorKey = String(operator).trim();
  if (!operatorKey) {
    throw new HttpError(400, 'operator is required');
  }

  return prisma.recipient.upsert({
    where: {
      userId_e164: { userId, e164 },
    },
    create: {
      userId,
      e164,
      countryCode: DEFAULT_COUNTRY,
      operatorKey,
      verificationStatus: 'UNVERIFIED',
    },
    update: {
      operatorKey,
    },
  });
}
