/**
 * Integration tests use the same rule as `npm run db:migrate:integration`:
 * if `TEST_DATABASE_URL` is non-empty it becomes `DATABASE_URL` for the process — that DB must be fully migrated.
 *
 * Preload:
 *   node --import ./test/integrations/preloadTestDatabaseUrl.mjs --test ...
 */
import { applyIntegrationTestDatabaseEnv } from './testDatabaseResolution.mjs';

applyIntegrationTestDatabaseEnv();
