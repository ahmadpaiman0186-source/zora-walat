import { Router } from 'express';
import {
  getAirtimeCatalog,
  getSenderCountriesCatalog,
} from '../controllers/catalogController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/** GET /catalog/sender-countries */
router.get('/sender-countries', asyncHandler(getSenderCountriesCatalog));

/** GET /catalog/airtime?operator=roshan */
router.get('/airtime', getAirtimeCatalog);

export default router;
