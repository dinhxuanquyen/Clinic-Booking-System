import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { ApiError } from '../utils/apiError.js';

const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
const defaultMaxFileSize = 2 * 1024 * 1024;

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

function createFileFilter(allowedMimeTypes, message) {
  return (req, file, callback) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(new ApiError(400, message));
    }

    callback(null, true);
  };
}

export function createFileUpload(folder, options = {}) {
  const allowedMimeTypes = options.allowedMimeTypes || imageMimeTypes;
  const maxFileSize = options.maxFileSize || defaultMaxFileSize;
  const message = options.message || 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP';

  return multer({
    storage: createStorage(folder),
    fileFilter: createFileFilter(allowedMimeTypes, message),
    limits: { fileSize: maxFileSize }
  });
}

export function createImageUpload(folder) {
  return createFileUpload(folder, {
    allowedMimeTypes: imageMimeTypes,
    maxFileSize: defaultMaxFileSize,
    message: 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP'
  });
}

export function handleUploadError(error, req, res, next) {
  if (!error) return next();

  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return next(new ApiError(400, 'Tệp tải lên vượt quá dung lượng cho phép'));
  }

  return next(error);
}
