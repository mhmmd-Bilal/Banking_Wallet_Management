import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { objectIdParam } from '../validators/common.js';
import { paginationQuery } from '../validators/admin.validators.js';
import * as c from '../controllers/notificationController.js';

const router = Router();
router.use(authenticate, requireRole('USER'));
router.get('/', validate(paginationQuery, 'query'), c.list);
router.get('/unread-count', c.unread);
router.patch('/:id/read', validate(objectIdParam, 'params'), c.read);
export default router;
