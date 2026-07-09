import { body } from 'express-validator';
import Specialty from '../models/specialtyModel.js';
import Clinic from '../models/clinicModel.js';
import { analyzeSymptoms } from '../services/geminiService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';

export const symptomCheckerRules = [
  body('symptoms').trim().isLength({ min: 8, max: 2000 }).withMessage('Vui lòng mô tả triệu chứng rõ hơn'),
  body('age').optional({ checkFalsy: true }).isInt({ min: 0, max: 120 }).withMessage('Tuổi không hợp lệ'),
  body('gender').optional({ checkFalsy: true }).trim(),
  body('duration').optional({ checkFalsy: true }).trim().isLength({ max: 200 }).withMessage('Thời gian bị quá dài'),
  body('severity').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Mức độ không hợp lệ')
];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function specialtyScore(suggestion, specialtyName) {
  const left = normalizeText(suggestion);
  const right = normalizeText(specialtyName);
  if (!left || !right) return 0;
  if (left === right) return 100;
  if (right.includes(left) || left.includes(right)) return 80;

  const leftTokens = new Set(left.split(/\s+/).filter(Boolean));
  const rightTokens = right.split(/\s+/).filter(Boolean);
  return rightTokens.reduce((score, token) => score + (leftTokens.has(token) ? 20 : 0), 0);
}

async function mapSpecialties(suggestions) {
  const specialties = await Specialty.find({ isActive: { $ne: false } })
    .populate({ path: 'clinicId', select: 'name clinicCode address isActive' })
    .lean();

  const mapped = [];
  const seen = new Set();

  suggestions.forEach((suggestion) => {
    const matches = specialties
      .map((specialty) => ({
        specialty,
        score: specialtyScore(suggestion, specialty.name)
      }))
      .filter((item) => item.score >= 20 && item.specialty.clinicId?.isActive !== false)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    matches.forEach(({ specialty }) => {
      const key = String(specialty._id);
      if (seen.has(key)) return;
      seen.add(key);
      mapped.push({
        _id: specialty._id,
        name: specialty.name,
        clinicId: specialty.clinicId?._id || specialty.clinicId,
        clinicName: specialty.clinicId?.name || '',
        clinicCode: specialty.clinicId?.clinicCode || '',
        matchedFrom: suggestion
      });
    });
  });

  return mapped;
}

function fallbackMessage(analysis) {
  const messages = {
    missing_api_key: 'Trợ lý AI hiện chưa được kích hoạt. Hệ thống đang sử dụng gợi ý cơ bản dựa trên từ khóa.',
    invalid_api_key: 'Trợ lý AI tạm thời không khả dụng. Hệ thống đang sử dụng gợi ý cơ bản.',
    permission_denied: 'Trợ lý AI tạm thời không khả dụng. Hệ thống đang sử dụng gợi ý cơ bản.',
    invalid_model: 'Trợ lý AI tạm thời không khả dụng. Hệ thống đang sử dụng gợi ý cơ bản.',
    quota_exceeded: 'Trợ lý AI đang tạm quá tải. Hệ thống đang sử dụng gợi ý cơ bản, vui lòng thử lại sau ít phút.',
    network_or_parse_error: 'Trợ lý AI tạm thời gián đoạn. Hệ thống đang sử dụng gợi ý cơ bản dựa trên triệu chứng của bạn.'
  };
  return messages[analysis.fallbackReason] || 'Trợ lý AI tạm thời không khả dụng. Hệ thống đang sử dụng gợi ý cơ bản dựa trên triệu chứng của bạn.';
}

function sanitizeFallbackForClient(analysis) {
  const sanitized = { ...analysis };
  // Never expose raw error messages to users
  delete sanitized.aiErrorMessage;
  delete sanitized.fallbackReason;
  return sanitized;
}

export const analyzeSymptomsController = asyncHandler(async (req, res) => {
  const symptoms = req.body.symptoms?.trim();
  if (!symptoms) {
    throw new ApiError(422, 'Vui lòng nhập triệu chứng cần tư vấn');
  }

  const analysis = await analyzeSymptoms({
    symptoms,
    age: req.body.age,
    gender: req.body.gender,
    duration: req.body.duration,
    severity: req.body.severity
  });
  const matchedSpecialties = await mapSpecialties(analysis.suggestedSpecialties || []);

  const message = analysis.isFallback
    ? fallbackMessage(analysis)
    : 'Phân tích triệu chứng thành công';

  const clientData = analysis.isFallback
    ? sanitizeFallbackForClient(analysis)
    : analysis;

  res.json({
    success: !analysis.isFallback,
    isFallback: Boolean(analysis.isFallback),
    message,
    data: {
      ...clientData,
      matchedSpecialties
    }
  });
});

