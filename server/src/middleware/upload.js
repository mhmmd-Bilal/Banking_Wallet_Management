import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];

// Memory storage: the file is only written to disk after validation and magic-byte checks.
export const uploadIdentityDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1, fields: 20, fieldSize: 10 * 1024 },
  fileFilter(req, file, cb) {
    if (file.fieldname !== 'identityDocument') return cb(new ApiError(400, 'Unexpected file field'));
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new ApiError(400, 'Only PDF, JPG, JPEG and PNG files are allowed'));
    }
    return cb(null, true);
  },
}).single('identityDocument');
