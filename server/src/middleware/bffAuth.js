import { config } from '../config.js';

export function bffAuth(req, res, next) {
  if (!config.bffApiKey) return next();
  const key = req.get('x-api-key');
  if (key !== config.bffApiKey) {
    return res.status(401).json({ error: 'Invalid or missing X-Api-Key' });
  }
  return next();
}
