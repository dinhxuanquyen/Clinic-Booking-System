import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { ApiError } from '../utils/apiError.js';

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxFileSize = 2 * 1024 * 1024;

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function createStorage(folder) {
  const uploadDirectory = path.resolve('uploads', folder);
  ensureDirectory(uploadDirectory);

  return multer.diskStorage({
    destination(req, file, callback) {
      callback(null, uploadDirectory);
    },
    filename(req, file, callback) {
      const extension = path.extname(file.originalname).toLowerCase();
      const random = Math.random().toString(16).slice(2, 10);
      callback(null, `${Date.now()}-${random}${extension}`);
    }
  });
}

function fileFilter(req, file, callback) {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(new ApiError(400, 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP'));
  }

  callback(null, true);
}

export function createImageUpload(folder) {
  return multer({
    storage: createStorage(folder),
    fileFilter,
    limits: { fileSize: maxFileSize }
  });
}

export function handleUploadError(error, req, res, next) {
  if (!error) return next();

  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return next(new ApiError(400, 'Ảnh không được vượt quá 2MB'));
  }

  return next(error);
}
