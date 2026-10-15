import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import { uploadIdentityDocument } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validators/auth.validators.js';
import * as c from '../controllers/authController.js';

const router = Router();
router.post('/register', authLimiter, uploadIdentityDocument, validate(registerSchema), c.register);
router.post('/login', authLimiter, validate(loginSchema), c.login);
router.post('/logout', c.logout);
router.get('/me', authenticate, c.me);
export default router;
