import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';
import Appointment from '../models/appointmentModel.js';
import Doctor from '../models/doctorModel.js';
import DoctorReview from '../models/doctorReviewModel.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createAuditLog } from '../utils/auditLogger.js';

const reviewPopulate = [
  { path: 'patientId', select: 'name avatar' },
  { path: 'doctorId', select: 'name avatar degree specialtyId clinicId ratingAverage ratingCount' },
  { path: 'clinicId', select: 'name clinicCode' },
  { path: 'specialtyId', select: 'name' },
  { path: 'appointmentId', select: 'date timeSlot status' }
];

export const createDoctorReviewRules = [
  body('appointmentId').isMongoId().withMessage('appointmentId is invalid'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Vui lòng chọn số sao từ 1 đến 5'),
  body('comment').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Nhận xét tối đa 1000 ký tự')
];

export const doctorReviewDoctorIdRule = [param('doctorId').isMongoId().withMessage('Doctor id is invalid')];
export const appointmentReviewRule = [param('appointmentId').isMongoId().withMessage('Appointment id is invalid')];
export const reviewIdRule = [param('id').isMongoId().withMessage('Review id is invalid')];
export const listDoctorReviewRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page is invalid'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit is invalid'),
  query('rating').optional().isInt({ min: 1, max: 5 }).withMessage('rating is invalid'),
  query('sort').optional().isIn(['newest', 'highest', 'lowest']).withMessage('sort is invalid')
];
export const updateReviewVisibilityRules = [
  body('isVisible').isBoolean().withMessage('isVisible must be boolean')
];

async function refreshDoctorRating(doctorId) {
  const normalizedDoctorId = new mongoose.Types.ObjectId(String(doctorId));
  const [summary] = await DoctorReview.aggregate([
    { $match: { doctorId: normalizedDoctorId, isVisible: true } },
    {
      $group: {
        _id: '$doctorId',
        average: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);

  await Doctor.findByIdAndUpdate(doctorId, {
    ratingAverage: summary ? Math.round(summary.average * 10) / 10 : 0,
    ratingCount: summary?.count || 0
  });
}

async function buildReviewSummary(doctorId) {
  const normalizedDoctorId = new mongoose.Types.ObjectId(String(doctorId));
  const rows = await DoctorReview.aggregate([
    { $match: { doctorId: normalizedDoctorId, isVisible: true } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    }
  ]);

  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let total = 0;
  let weighted = 0;

  rows.forEach((row) => {
    ratingDistribution[row._id] = row.count;
    total += row.count;
    weighted += row._id * row.count;
  });

  return {
    averageRating: total ? Math.round((weighted / total) * 10) / 10 : 0,
    ratingCount: total,
    ratingDistribution
  };
}

function assertReviewAccess(user, review) {
  if (user.role === 'admin') return;
  if (user.role === 'patient' && String(review.patientId?._id || review.patientId) === String(user._id)) return;
  if (user.role === 'doctor' && String(review.doctorId?._id || review.doctorId) === String(user.doctorId)) return;
  throw new ApiError(403, 'Bạn không có quyền xem đánh giá này');
}

export const createDoctorReview = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.body.appointmentId);
  if (!appointment) throw new ApiError(404, 'Không tìm thấy lịch hẹn');

  if (String(appointment.patientId) !== String(req.user._id)) {
    throw new ApiError(403, 'Bạn không có quyền đánh giá lịch hẹn này');
  }

  if (appointment.status !== 'completed') {
    throw new ApiError(400, 'Chỉ có thể đánh giá sau khi lịch khám đã hoàn thành');
  }

  if (!appointment.doctorId) {
    throw new ApiError(400, 'Lịch hẹn chưa có thông tin bác sĩ');
  }

  const existingReview = await DoctorReview.findOne({ appointmentId: appointment._id });
  if (existingReview) {
    throw new ApiError(409, 'Lịch hẹn này đã được đánh giá');
  }

  const review = await DoctorReview.create({
    appointmentId: appointment._id,
    doctorId: appointment.doctorId,
    patientId: appointment.patientId,
    clinicId: appointment.clinicId,
    specialtyId: appointment.specialtyId,
    rating: Number(req.body.rating),
    comment: String(req.body.comment || '').trim()
  });

  await refreshDoctorRating(appointment.doctorId);

  await createAuditLog({
    req,
    action: 'CREATE_DOCTOR_REVIEW',
    entityType: 'DoctorReview',
    entityId: review._id,
    entityName: `Review appointment ${appointment._id}`,
    description: `${req.user.name || 'Bệnh nhân'} đã đánh giá bác sĩ`,
    metadata: {
      appointmentId: String(appointment._id),
      doctorId: String(appointment.doctorId),
      rating: review.rating
    }
  });

  const populatedReview = await DoctorReview.findById(review._id).populate(reviewPopulate);

  res.status(201).json({
    success: true,
    message: 'Cảm ơn bạn đã đánh giá bác sĩ',
    data: populatedReview
  });
});

export const getDoctorReviews = asyncHandler(async (req, res) => {
  const doctorId = req.params.doctorId;
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 5);
  const filter = { doctorId, isVisible: true };
  if (req.query.rating) filter.rating = Number(req.query.rating);

  const sortMap = {
    newest: { createdAt: -1 },
    highest: { rating: -1, createdAt: -1 },
    lowest: { rating: 1, createdAt: -1 }
  };
  const sort = sortMap[req.query.sort] || sortMap.newest;

  const [summary, reviews, total] = await Promise.all([
    buildReviewSummary(doctorId),
    DoctorReview.find(filter)
      .populate(reviewPopulate)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    DoctorReview.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      summary,
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    }
  });
});

export const getMyDoctorReviews = asyncHandler(async (req, res) => {
  if (!req.user.doctorId) {
    throw new ApiError(400, 'Tài khoản bác sĩ chưa được liên kết hồ sơ bác sĩ');
  }

  const doctorId = req.user.doctorId;
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 6);
  const filter = { doctorId, isVisible: true };
  if (req.query.rating) filter.rating = Number(req.query.rating);

  const sortMap = {
    newest: { createdAt: -1 },
    highest: { rating: -1, createdAt: -1 },
    lowest: { rating: 1, createdAt: -1 }
  };
  const sort = sortMap[req.query.sort] || sortMap.newest;

  const [summary, reviews, total] = await Promise.all([
    buildReviewSummary(doctorId),
    DoctorReview.find(filter)
      .populate(reviewPopulate)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    DoctorReview.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      summary,
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    }
  });
});

export const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await DoctorReview.find({ patientId: req.user._id })
    .populate(reviewPopulate)
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: reviews
  });
});

export const getAppointmentReview = asyncHandler(async (req, res) => {
  const review = await DoctorReview.findOne({ appointmentId: req.params.appointmentId }).populate(reviewPopulate);
  if (!review) throw new ApiError(404, 'Lịch hẹn này chưa có đánh giá');

  assertReviewAccess(req.user, review);

  res.json({
    success: true,
    data: review
  });
});

export const updateReviewVisibility = asyncHandler(async (req, res) => {
  const review = await DoctorReview.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Không tìm thấy đánh giá');

  review.isVisible = Boolean(req.body.isVisible);
  await review.save();
  await refreshDoctorRating(review.doctorId);

  await createAuditLog({
    req,
    action: review.isVisible ? 'SHOW_DOCTOR_REVIEW' : 'HIDE_DOCTOR_REVIEW',
    entityType: 'DoctorReview',
    entityId: review._id,
    description: review.isVisible ? 'Admin đã hiển thị đánh giá bác sĩ' : 'Admin đã ẩn đánh giá bác sĩ',
    metadata: {
      doctorId: String(review.doctorId),
      appointmentId: String(review.appointmentId)
    }
  });

  res.json({
    success: true,
    message: review.isVisible ? 'Đã hiển thị đánh giá' : 'Đã ẩn đánh giá',
    data: review
  });
});
