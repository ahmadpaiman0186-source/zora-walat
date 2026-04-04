import { Router } from 'express';
import { getAirtimeCatalog } from '../controllers/catalogController.js';

const router = Router();

/** GET /catalog/airtime?operator=roshan */
router.get('/airtime', getAirtimeCatalog);

export default router;
