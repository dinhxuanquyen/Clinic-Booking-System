import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { createImageUpload, handleUploadError } from '../middleware/uploadMiddleware.js';
import { ApiError } from '../utils/apiError.js';

const router = express.Router();

function uploadImage(folder, successMessage = 'Upload ảnh thành công') {
  const upload = createImageUpload(folder);

  return [
    authMiddleware,
    roleMiddleware('admin'),
    (req, res, next) => {
      upload.single('image')(req, res, (error) => {
        if (error) return handleUploadError(error, req, res, next);
        return next();
      });
    },
    (req, res, next) => {
      if (!req.file) {
        return next(new ApiError(400, 'Vui lòng chọn ảnh để upload'));
      }

      res.status(201).json({
        success: true,
        message: successMessage,
        data: {
          url: `/uploads/${folder}/${req.file.filename}`
        }
      });
    }
  ];
}

function uploadImages(folder, successMessage = 'Upload ảnh thành công') {
  const upload = createImageUpload(folder);

  return [
    authMiddleware,
    roleMiddleware('admin'),
    (req, res, next) => {
      upload.array('images', 10)(req, res, (error) => {
        if (error) return handleUploadError(error, req, res, next);
        return next();
      });
    },
    (req, res, next) => {
      if (!req.files?.length) {
        return next(new ApiError(400, 'Vui lòng chọn ảnh để upload'));
      }

      res.status(201).json({
        success: true,
        message: successMessage,
        data: {
          urls: req.files.map((file) => `/uploads/${folder}/${file.filename}`)
        }
      });
    }
  ];
}

function uploadUserAvatar() {
  const folder = 'users';
  const upload = createImageUpload(folder);

  return [
    authMiddleware,
    (req, res, next) => {
      upload.single('image')(req, res, (error) => {
        if (error) return handleUploadError(error, req, res, next);
        return next();
      });
    },
    (req, res, next) => {
      if (!req.file) {
        return next(new ApiError(400, 'Vui lòng chọn ảnh để upload'));
      }

      res.status(201).json({
        success: true,
        message: 'Upload avatar thành công',
        data: {
          url: `/uploads/${folder}/${req.file.filename}`
        }
      });
    }
  ];
}

router.post('/clinic-image', uploadImage('clinics'));
router.post('/clinic-images', uploadImages('clinics'));
router.post('/doctor-avatar', uploadImage('doctors'));
router.post('/specialty-image', uploadImage('specialties', 'Upload ảnh chuyên khoa thành công'));
router.post('/package-image', uploadImage('service-packages', 'Upload ảnh gói khám thành công'));
router.post('/user-avatar', uploadUserAvatar());

export default router;
