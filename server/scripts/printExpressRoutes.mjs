/**
 * Prints METHOD + path for every route on the app.
 * Run: node scripts/printExpressRoutes.mjs
 */
import { createApp } from '../src/app.js';
import { collectRouteLines } from '../src/lib/expressRouteInventory.js';

const app = createApp();
const lines = collectRouteLines(app).sort();
for (const line of lines) {
  console.log(line);
}
console.error(`[printExpressRoutes] total ${lines.length} route method entries`);
