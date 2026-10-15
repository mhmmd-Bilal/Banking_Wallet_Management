import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { requireActiveAccount } from '../middleware/requireActiveAccount.js';
import { financialLimiter } from '../middleware/rateLimiters.js';
import { requireIdempotencyKey, validate } from '../middleware/validate.js';
import { moneyBody, transferBody } from '../validators/transaction.validators.js';
import { transactionIdParam, transactionQuery } from '../validators/common.js';
import * as c from '../controllers/transactionController.js';

const router = Router();
router.use(authenticate, requireRole('USER'));

const financial = [financialLimiter, requireIdempotencyKey];
router.post('/deposit', ...financial, validate(moneyBody), requireActiveAccount, c.deposit);
router.post('/withdraw', ...financial, validate(moneyBody), requireActiveAccount, c.withdraw);
router.post('/transfer', ...financial, validate(transferBody), requireActiveAccount, c.transfer);

// '/my' must be declared before '/:id'
router.get('/my', validate(transactionQuery, 'query'), c.myTransactions);
router.get('/:id', validate(transactionIdParam, 'params'), c.myTransaction);
export default router;
