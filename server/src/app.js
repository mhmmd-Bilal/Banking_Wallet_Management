import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { csrfGuard } from './middleware/csrfGuard.js';
import { globalLimiter } from './middleware/rateLimiters.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

export function createApp() {
  const app = express();
  if (env.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({ origin: env.clientUrl, credentials: true, allowedHeaders: ['Content-Type', 'Idempotency-Key', 'X-Requested-With'] }));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());
  app.use('/api', globalLimiter, csrfGuard);

  app.get('/api/health', (req, res) => res.json({ success: true, message: 'OK', data: {} }));
  app.use('/api/auth', authRoutes);
  app.use('/api/accounts', accountRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
