import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { financialLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../middleware/validate.js';
import { openAccountBody } from '../validators/transaction.validators.js';
import * as c from '../controllers/accountController.js';

const router = Router();
router.use(authenticate, requireRole('USER'));
router.post('/', financialLimiter, validate(openAccountBody), c.openAccount);
router.get('/me', c.myAccount);
router.get('/me/balance', c.myBalance);
export default router;
