import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { objectIdParam, reportQuery, transactionIdParam, transactionQuery } from '../validators/common.js';
import { adminUserQuery, paginationQuery } from '../validators/admin.validators.js';
import { uploadIdentityDocument } from '../middleware/upload.js';
import { adminCreateCustomerSchema } from '../validators/auth.validators.js';
import * as c from '../controllers/adminController.js';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

router.get('/users', validate(adminUserQuery, 'query'), c.users);
router.post('/users', uploadIdentityDocument, validate(adminCreateCustomerSchema), c.createCustomer);
router.get('/users/pending', validate(paginationQuery, 'query'), c.pendingUsers); // before '/users/:id'
router.get('/users/:id', validate(objectIdParam, 'params'), c.userDetail);
router.get('/users/:id/document', validate(objectIdParam, 'params'), c.userDocument);
router.patch('/users/:id/verify', validate(objectIdParam, 'params'), c.verify);
router.patch('/accounts/:id/freeze', validate(objectIdParam, 'params'), c.freeze);
router.patch('/accounts/:id/unfreeze', validate(objectIdParam, 'params'), c.unfreeze);
router.get('/transactions', validate(transactionQuery, 'query'), c.transactions);
router.get('/transactions/:id', validate(transactionIdParam, 'params'), c.transactionDetail);
router.get('/reports', validate(reportQuery, 'query'), c.reports);
export default router;
