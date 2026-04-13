/**
 * Local/dev process entry.
 *
 * This file is intentionally separate from `server/index.js` because Vercel treats
 * `index.js` as a serverless function candidate for the project root.
 */
import './src/runtime/registerApiRuntime.js';
import './bootstrap.js';
import { startApiRuntime } from './src/index.js';

startApiRuntime();
