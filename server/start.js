/**
 * Local/dev process entry.
 *
 * This file is intentionally separate from `server/index.js` because Vercel treats
 * `index.js` as a serverless function candidate for the project root.
 */
import './bootstrap.js';
import './src/index.js';
