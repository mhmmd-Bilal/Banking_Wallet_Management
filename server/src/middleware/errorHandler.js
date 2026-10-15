import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl.split('?')[0]}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = 500;
  let message = 'Something went wrong. Please try again later';
  let errors = [];

  if (err instanceof ApiError) {
    status = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = err.code === 'LIMIT_FILE_SIZE'
      ? `File too large (maximum ${env.maxUploadBytes / (1024 * 1024)} MB)`
      : 'Invalid file upload';
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    message = 'Request body too large';
  } else if (err?.code === 11000) {
    status = 409;
    message = 'A record with the same unique value already exists';
  } else if (err?.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier';
  } else if (err?.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
  }

  if (status >= 500 && !env.isTest) {
    // Log server-side only; never leak internals to the client.
    console.error(`[error] ${req.method} ${req.originalUrl} ->`, err?.stack || err);
  }
  res.status(status).json({ success: false, message, errors });
}
