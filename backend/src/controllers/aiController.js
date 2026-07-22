import { body } from 'express-validator';
import Specialty from '../models/specialtyModel.js';
import { analyzeSymptomAssistant, analyzeSymptoms } from '../services/geminiService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';

export const symptomCheckerRules = [
  body('symptoms').trim().isLength({ min: 8, max: 2000 }).withMessage('Vui lòng mô tả triệu chứng rõ hơn'),
  body('age').optional({ checkFalsy: true }).isInt({ min: 0, max: 120 }).withMessage('Tuổi không hợp lệ'),
  body('gender').optional({ checkFalsy: true }).trim(),
  body('duration').optional({ checkFalsy: true }).trim().isLength({ max: 200 }).withMessage('Thời gian bị quá dài'),
  body('severity').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Mức độ không hợp lệ')
];

export const symptomAssistantRules = [
  body('symptoms').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }).withMessage('Mô tả triệu chứng quá dài'),
  body('latestMessage').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }).withMessage('Tin nhắn quá dài'),
  body('age').optional({ checkFalsy: true }).isInt({ min: 0, max: 120 }).withMessage('Tuổi không hợp lệ'),
  body('gender').optional({ checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('Giới tính không hợp lệ'),
  body('duration').optional({ checkFalsy: true }).trim().isLength({ max: 200 }).withMessage('Thời gian bị quá dài'),
  body('severity').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Mức độ không hợp lệ'),
  body('messages').optional().isArray({ max: 12 }).withMessage('Lịch sử hội thoại không hợp lệ'),
  body('messages.*.role').optional({ checkFalsy: true }).isIn(['user', 'assistant']).withMessage('Vai trò tin nhắn không hợp lệ'),
  body('messages.*.content').optional({ checkFalsy: true }).trim().isLength({ max: 1200 }).withMessage('Nội dung tin nhắn quá dài')
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

function isDentalSuggestion(value) {
  return /(rang|nha khoa|loi|tooth|dental)/.test(normalizeText(value));
}

function bookingMessageForRecommendation(item, matchedSpecialty) {
  if (matchedSpecialty?._id) {
    return 'Có thể đặt lịch trực tiếp với chuyên khoa phù hợp trong hệ thống.';
  }

  if (isDentalSuggestion(item.specialtyName || item.name)) {
    return 'Hệ thống hiện chưa có lịch Răng hàm mặt/Nha khoa. Bạn vẫn nên khám nha khoa nếu đau kéo dài, sưng, sốt hoặc có mủ.';
  }

  return 'Hệ thống chưa có lịch phù hợp cho chuyên khoa này. Bạn có thể đặt lịch Nội tổng quát để được định hướng thêm.';
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

async function mapRecommendations(recommendations) {
  const mappedSpecialties = await mapSpecialties(
    recommendations.map((item) => item.specialtyName || item.name).filter(Boolean)
  );

  return recommendations.map((item) => {
    const matchedSpecialty = mappedSpecialties.find((specialty) => (
      specialty.matchedFrom === item.specialtyName ||
      specialtyScore(item.specialtyName, specialty.name) >= 20
    ));

    return {
      ...item,
      specialty: matchedSpecialty || null,
      canBook: Boolean(matchedSpecialty?._id),
      bookingStatus: matchedSpecialty?._id ? 'available' : 'unavailable',
      bookingMessage: bookingMessageForRecommendation(item, matchedSpecialty)
    };
  });
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

export const analyzeSymptomAssistantController = asyncHandler(async (req, res) => {
  const symptoms = req.body.symptoms?.trim();
  const latestMessage = req.body.latestMessage?.trim();
  const messages = Array.isArray(req.body.messages) ? req.body.messages : [];

  if (!symptoms && !latestMessage && !messages.length) {
    throw new ApiError(422, 'Vui lòng nhập triệu chứng hoặc câu hỏi cần tư vấn');
  }

  const analysis = await analyzeSymptomAssistant({
    symptoms,
    latestMessage,
    messages,
    age: req.body.age,
    gender: req.body.gender,
    duration: req.body.duration,
    severity: req.body.severity
  });

  const recommendations = await mapRecommendations(analysis.recommendations || []);
  const matchedSpecialties = recommendations
    .map((item) => item.specialty)
    .filter(Boolean)
    .filter((item, index, array) => array.findIndex((current) => String(current._id) === String(item._id)) === index);

  const message = analysis.isFallback
    ? fallbackMessage(analysis)
    : 'Trợ lý AI đã phân tích triệu chứng thành công';

  const clientData = analysis.isFallback
    ? sanitizeFallbackForClient(analysis)
    : analysis;

  res.json({
    success: !analysis.isFallback,
    isFallback: Boolean(analysis.isFallback),
    message,
    data: {
      ...clientData,
      recommendations,
      matchedSpecialties
    }
  });
});
