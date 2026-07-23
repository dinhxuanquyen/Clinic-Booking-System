import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAssistantFallbackAnalysis,
  buildGeminiRequestBody,
  isRetryableGeminiError,
  resolveAssistantContext
} from './geminiService.js';

function specialtyNames(result) {
  return result.recommendations.map((item) => item.specialtyName);
}

test('khó ngủ được trả lời theo nhóm giấc ngủ, không bị nhận nhầm thành ho', () => {
  const result = buildAssistantFallbackAnalysis({
    symptoms: 'đêm qua tôi bị khó ngủ',
    latestMessage: 'nên làm gì khi bị khó ngủ'
  });

  assert.match(result.assistantMessage, /giờ ngủ|cà phê|màn hình/i);
  assert.match(result.summary, /khó ngủ/i);
  assert.equal(specialtyNames(result).includes('Tai mũi họng'), false);
  assert.equal(result.safety.urgencyLevel, 'low');
});

test('tin nhắn có triệu chứng mới thay thế chủ đề cũ', () => {
  const context = resolveAssistantContext({
    symptoms: 'Tôi bị ho và nghẹt mũi',
    latestMessage: 'Đêm qua tôi bị khó ngủ'
  });
  const result = buildAssistantFallbackAnalysis({
    symptoms: 'Tôi bị ho và nghẹt mũi',
    latestMessage: 'Đêm qua tôi bị khó ngủ'
  });

  assert.equal(context.currentSymptoms, 'Đêm qua tôi bị khó ngủ');
  assert.equal(context.latestOverridesContext, true);
  assert.equal(specialtyNames(result).includes('Tai mũi họng'), false);
  assert.match(result.updatedContext.symptoms, /khó ngủ/i);
});

test('câu trả lời ngắn tiếp tục dùng triệu chứng đang có', () => {
  const context = resolveAssistantContext({
    symptoms: 'Tôi bị khó ngủ',
    latestMessage: '2-3 ngày'
  });
  const result = buildAssistantFallbackAnalysis({
    symptoms: 'Tôi bị khó ngủ',
    latestMessage: '2-3 ngày'
  });

  assert.equal(context.currentSymptoms, 'Tôi bị khó ngủ');
  assert.equal(context.latestOverridesContext, false);
  assert.match(result.summary, /khó ngủ/i);
});

test('triệu chứng hô hấp rõ ràng vẫn gợi ý Tai mũi họng', () => {
  const result = buildAssistantFallbackAnalysis({
    symptoms: 'Tôi ho và nghẹt mũi hai ngày',
    latestMessage: 'Tôi ho và nghẹt mũi hai ngày'
  });

  assert.equal(specialtyNames(result).includes('Tai mũi họng'), true);
  assert.match(result.assistantMessage, /uống đủ nước|theo dõi/i);
});

test('dấu hiệu nguy hiểm luôn ưu tiên cảnh báo khẩn cấp', () => {
  const result = buildAssistantFallbackAnalysis({
    symptoms: 'Tôi đau ngực và khó thở',
    latestMessage: 'Tôi đau ngực và khó thở'
  });

  assert.equal(result.safety.urgencyLevel, 'high');
  assert.equal(specialtyNames(result).includes('Cấp cứu'), true);
  assert.match(result.assistantMessage, /cấp cứu/i);
});

test('Gemini JSON mode dùng responseMimeType và responseJsonSchema đúng cấu trúc REST', () => {
  const requestBody = buildGeminiRequestBody('Trả về JSON', 256, {
    type: 'object',
    properties: {
      answer: { type: 'string' }
    },
    required: ['answer']
  });

  assert.equal(requestBody.generationConfig.responseMimeType, 'application/json');
  assert.deepEqual(requestBody.generationConfig.responseJsonSchema, {
    type: 'object',
    properties: {
      answer: { type: 'string' }
    },
    required: ['answer']
  });
  assert.equal('responseFormat' in requestBody.generationConfig, false);
});

test('Gemini HTTP 400 chứa application/json không bị retry như lỗi parse JSON', () => {
  const error = new Error('Invalid value at generation_config.response_format.text.mime_type, "application/json"');
  error.fallbackReason = 'gemini_http_error';
  error.retryable = false;

  assert.equal(isRetryableGeminiError(error), false);
});
