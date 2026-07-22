import { env } from '../config/env.js';

const MEDICAL_DISCLAIMER =
  'Thông tin này chỉ mang tính tham khảo, không phải chẩn đoán y khoa, không thay thế bác sĩ và không dùng để tự kê thuốc. Nếu triệu chứng nặng hoặc có dấu hiệu nguy hiểm, hãy đến cơ sở y tế/cấp cứu ngay.';
const GEMINI_MODEL = env.geminiModel || 'gemini-3.5-flash';
const MAX_RETRIES = 2;

const DEFAULT_RESULT = {
  summary: 'Hệ thống đã ghi nhận mô tả triệu chứng của bạn và gợi ý một số hướng thăm khám phù hợp.',
  suggestedSpecialties: ['Nội tổng quát'],
  urgencyLevel: 'medium',
  warningSigns: [],
  questionsForDoctor: [
    'Triệu chứng bắt đầu từ khi nào và diễn tiến ra sao?',
    'Bạn có bệnh nền, dị ứng thuốc hoặc đang dùng thuốc gì không?',
    'Triệu chứng có yếu tố nào làm nặng hơn hoặc giảm đi không?'
  ],
  disclaimer: MEDICAL_DISCLAIMER
};

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function stripCodeFence(text) {
  return String(text || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

/**
 * Attempt to repair truncated JSON from Gemini.
 * Gemini sometimes cuts off output mid-string, leaving unclosed brackets.
 * This function tries increasingly aggressive strategies to recover valid JSON.
 */
function repairTruncatedJson(text) {
  let cleaned = text.trim();

  // Strip trailing comma before attempting closure
  cleaned = cleaned.replace(/,\s*$/, '');

  // If it ends with an incomplete string value (no closing quote), close it
  // Detect: ..."some text without closing quote
  const lastQuote = cleaned.lastIndexOf('"');
  const afterLastQuote = cleaned.slice(lastQuote + 1).trim();
  if (lastQuote > 0 && !/^[\s\]\},:]/.test(afterLastQuote) && afterLastQuote.length > 0) {
    // Truncated inside a string value — close the string
    cleaned += '"';
  }

  // Count open brackets and braces to determine what needs closing
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escapeNext = false;

  for (const char of cleaned) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') openBraces++;
    if (char === '}') openBraces--;
    if (char === '[') openBrackets++;
    if (char === ']') openBrackets--;
  }

  // If we're still inside a string, close it
  if (inString) {
    cleaned += '"';
  }

  // Strip any trailing comma before closing
  cleaned = cleaned.replace(/,\s*$/, '');

  // Close unclosed brackets and braces
  while (openBrackets > 0) {
    cleaned += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    cleaned += '}';
    openBraces--;
  }

  return cleaned;
}

function extractJson(text) {
  const cleaned = stripCodeFence(text);

  // Strategy 1: Direct parse
  try {
    return JSON.parse(cleaned);
  } catch { /* continue */ }

  // Strategy 2: Extract outermost { ... }
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(cleaned.slice(first, last + 1));
    } catch { /* continue */ }
  }

  // Strategy 3: Repair truncated JSON (Gemini sometimes cuts off mid-response)
  const fragment = first >= 0 ? cleaned.slice(first) : cleaned;
  const repaired = repairTruncatedJson(fragment);
  try {
    return JSON.parse(repaired);
  } catch { /* continue */ }

  throw new Error('Gemini response is not valid JSON');
}

function keyPrefix() {
  return env.geminiApiKey ? `${env.geminiApiKey.slice(0, 6)}...` : '';
}

function hasUsableGeminiKey() {
  return String(env.geminiApiKey || '').trim().length > 20;
}

function fallbackWithReason(input, reason, message) {
  return {
    ...buildFallbackAnalysis(input),
    aiAvailable: false,
    isFallback: true,
    fallbackReason: reason,
    aiErrorMessage: message
  };
}

function sanitizeResult(value) {
  const result = value && typeof value === 'object' ? value : {};
  const urgency = ['low', 'medium', 'high'].includes(result.urgencyLevel) ? result.urgencyLevel : 'medium';

  return {
    summary: String(result.summary || DEFAULT_RESULT.summary).trim(),
    suggestedSpecialties: Array.isArray(result.suggestedSpecialties)
      ? result.suggestedSpecialties.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5)
      : DEFAULT_RESULT.suggestedSpecialties,
    urgencyLevel: urgency,
    warningSigns: Array.isArray(result.warningSigns)
      ? result.warningSigns.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8)
      : [],
    questionsForDoctor: Array.isArray(result.questionsForDoctor)
      ? result.questionsForDoctor.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8)
      : DEFAULT_RESULT.questionsForDoctor,
    disclaimer: MEDICAL_DISCLAIMER
  };
}

function buildFallbackAnalysis(input) {
  const symptoms = normalizeText(input.symptoms);
  const warningSigns = [];
  let urgencyLevel = 'medium';
  let suggestedSpecialties = ['Nội tổng quát'];
  let summary = 'Dựa trên mô tả, bạn nên đặt lịch khám với chuyên khoa phù hợp để bác sĩ thăm khám trực tiếp và đưa ra kết luận.';

  if (/(dau rang|sau rang|e buot rang|rang ham|loi|nha khoa|viem loi|chay mau chan rang)/.test(symptoms)) {
    suggestedSpecialties = ['Răng hàm mặt'];
    urgencyLevel = 'medium';
    summary = 'Các triệu chứng liên quan răng miệng như đau răng, ê buốt hoặc sâu răng nên được bác sĩ Răng hàm mặt thăm khám để đánh giá nguyên nhân.';
    warningSigns.push('Nếu đau dữ dội, sưng mặt, sốt hoặc có mủ quanh răng, bạn nên đi khám sớm.');
  } else if (/(dau hong|ho|sot|nghet mui|so mui|chay mui|viem hong|amidan|tai|mui)/.test(symptoms)) {
    suggestedSpecialties = ['Tai mũi họng', 'Nội tổng quát'];
    urgencyLevel = symptoms.includes('sot cao') ? 'medium' : 'low';
    summary = 'Triệu chứng vùng họng, mũi hoặc hô hấp trên phù hợp để trao đổi với chuyên khoa Tai mũi họng.';
  }

  if (/(tre em|\bbe\b|\bnhi\b|con toi)/.test(symptoms)) {
    suggestedSpecialties = ['Nhi', ...suggestedSpecialties];
    summary = 'Vì triệu chứng liên quan trẻ em, bạn nên ưu tiên chuyên khoa Nhi để được đánh giá phù hợp theo độ tuổi.';
  }

  if (/(dau bung|tieu chay|non|buon non|day hoi|da day|tieu hoa)/.test(symptoms)) {
    suggestedSpecialties = ['Tiêu hóa', 'Nội tổng quát'];
    summary = 'Các triệu chứng tiêu hóa như đau bụng, tiêu chảy, buồn nôn hoặc khó chịu dạ dày nên được đánh giá bởi chuyên khoa Tiêu hóa hoặc Nội tổng quát.';
  }

  if (/(\bda\b|\bngua\b|phat ban|noi me day|di ung)/.test(symptoms)) {
    suggestedSpecialties = ['Da liễu', 'Dị ứng miễn dịch'];
    summary = 'Triệu chứng ngứa, phát ban, nổi mề đay hoặc dị ứng phù hợp để thăm khám Da liễu hoặc Dị ứng miễn dịch.';
  }

  if (/(nga xe|tai nan|chan thuong|sung|bam tim|dau chan|dau tay|dau goi|dau vai|bong gan|gay xuong|khong cu dong duoc)/.test(symptoms)) {
    suggestedSpecialties = ['Cơ xương khớp', 'Chấn thương chỉnh hình'];
    urgencyLevel = 'medium';
    summary = 'Sau va chạm hoặc ngã xe kèm sưng đau, bạn nên khám Cơ xương khớp hoặc Chấn thương chỉnh hình để kiểm tra tổn thương.';
    warningSigns.push('Nếu sưng to nhanh, đau nhiều, biến dạng chi, không cử động được, tê bì hoặc chảy máu nhiều, hãy đi cấp cứu.');
  }

  if (/(dau nguc|kho tho|ngat|tim dap nhanh|te nua nguoi|meo mieng|noi kho|co giat|dau nguc du doi|sot cao)/.test(symptoms)) {
    urgencyLevel = 'high';
    suggestedSpecialties = ['Cấp cứu', 'Tim mạch', 'Nội tổng quát'];
    summary = 'Mô tả có dấu hiệu cần được đánh giá y tế khẩn cấp, đặc biệt nếu đau ngực, khó thở, ngất hoặc sốt cao kéo dài.';
    warningSigns.push('Đau ngực dữ dội, khó thở, ngất, yếu liệt, nói khó, co giật hoặc sốt cao là dấu hiệu cần đi cấp cứu/cơ sở y tế ngay.');
  }

  const severity = normalizeText(input.severity);
  if (severity.includes('nang') || severity.includes('rat')) {
    urgencyLevel = urgencyLevel === 'high' ? 'high' : 'medium';
  }

  return sanitizeResult({
    summary,
    suggestedSpecialties: [...new Set(suggestedSpecialties)],
    urgencyLevel,
    warningSigns,
    questionsForDoctor: DEFAULT_RESULT.questionsForDoctor,
    disclaimer: MEDICAL_DISCLAIMER
  });
}

function buildPrompt(input) {
  return `Bạn là trợ lý hỗ trợ định hướng đặt lịch khám cho hệ thống Clinic Booking.

Nhiệm vụ:
- Tóm tắt triệu chứng bằng tiếng Việt dễ hiểu (ngắn gọn, tối đa 2 câu).
- Gợi ý tối đa 3 chuyên khoa phù hợp nhất.
- Đánh giá mức độ cần đi khám: low, medium hoặc high.
- Liệt kê tối đa 4 dấu hiệu cảnh báo nguy hiểm (nếu có).
- Liệt kê tối đa 4 câu hỏi nên hỏi bác sĩ.

Quy tắc bắt buộc:
- Không chẩn đoán chắc chắn.
- Không kê thuốc.
- Không thay thế bác sĩ.
- Luôn nhắc thông tin chỉ mang tính tham khảo.
- TRẢ VỀ JSON HỢP LỆ DUY NHẤT. KHÔNG markdown, KHÔNG giải thích, KHÔNG code block.
- Giữ mỗi chuỗi ngắn gọn (mỗi mục tối đa 80 ký tự) để tránh response bị cắt.

Schema JSON bắt buộc:
{"summary":"string","suggestedSpecialties":["string"],"urgencyLevel":"low|medium|high","warningSigns":["string"],"questionsForDoctor":["string"],"disclaimer":"string"}

Thông tin người dùng:
- Triệu chứng: ${input.symptoms || ''}
- Tuổi: ${input.age || 'không rõ'}
- Giới tính: ${input.gender || 'không rõ'}
- Thời gian bị: ${input.duration || 'không rõ'}
- Mức độ: ${input.severity || 'không rõ'}`;
}

function stringArraySchema(maxItems) {
  return {
    type: 'array',
    items: { type: 'string' },
    maxItems
  };
}

const BASIC_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    suggestedSpecialties: stringArraySchema(3),
    urgencyLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
    warningSigns: stringArraySchema(4),
    questionsForDoctor: stringArraySchema(4),
    disclaimer: { type: 'string' }
  },
  required: ['summary', 'suggestedSpecialties', 'urgencyLevel', 'warningSigns', 'questionsForDoctor']
};

const ASSISTANT_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    assistantMessage: { type: 'string' },
    summary: { type: 'string' },
    possibleCauses: stringArraySchema(5),
    careGuidance: stringArraySchema(6),
    nextSteps: stringArraySchema(5),
    recommendations: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          specialtyName: { type: 'string' },
          reason: { type: 'string' },
          confidence: { type: 'integer', minimum: 0, maximum: 100 },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          matchingSymptoms: stringArraySchema(4),
          bookingHint: { type: 'string' }
        },
        required: ['specialtyName', 'reason', 'confidence', 'priority', 'matchingSymptoms', 'bookingHint']
      }
    },
    followUpQuestions: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          question: { type: 'string' },
          choices: stringArraySchema(4)
        },
        required: ['id', 'question', 'choices']
      }
    },
    quickReplies: stringArraySchema(4),
    safety: {
      type: 'object',
      additionalProperties: false,
      properties: {
        urgencyLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
        warningSigns: stringArraySchema(5),
        recommendedAction: { type: 'string' }
      },
      required: ['urgencyLevel', 'warningSigns', 'recommendedAction']
    },
    updatedContext: {
      type: 'object',
      additionalProperties: false,
      properties: {
        symptoms: { type: 'string' },
        age: { type: 'string' },
        gender: { type: 'string' },
        duration: { type: 'string' },
        severity: { type: 'string' },
        notes: stringArraySchema(6)
      },
      required: ['symptoms', 'age', 'gender', 'duration', 'severity', 'notes']
    },
    disclaimer: { type: 'string' }
  },
  required: [
    'assistantMessage',
    'summary',
    'possibleCauses',
    'careGuidance',
    'nextSteps',
    'recommendations',
    'followUpQuestions',
    'quickReplies',
    'safety',
    'updatedContext'
  ]
};

function buildGeminiRequestBody(prompt, maxOutputTokens = 1024, responseSchema = BASIC_RESPONSE_SCHEMA) {
  return {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens,
      responseFormat: {
        text: {
          mimeType: 'application/json',
          schema: responseSchema
        }
      }
    }
  };
}

function classifyHttpError(status, errorText) {
  let reason = 'gemini_http_error';
  let message = `Gemini trả HTTP ${status}.`;
  try {
    const errorJson = JSON.parse(errorText);
    const googleMessage = errorJson?.error?.message || '';
    message = googleMessage || message;
    if (/API key not valid|API_KEY_INVALID|invalid/i.test(googleMessage)) reason = 'invalid_api_key';
    if (/PERMISSION_DENIED|permission|forbidden/i.test(googleMessage)) reason = 'permission_denied';
    if (/not found|model/i.test(googleMessage)) reason = 'invalid_model';
    if (/quota|exceeded|rate/i.test(googleMessage)) reason = 'quota_exceeded';
  } catch {
    if (status === 404) reason = 'invalid_model';
    if (status === 401) reason = 'invalid_api_key';
    if (status === 403) reason = 'permission_denied';
    if (status === 429) reason = 'quota_exceeded';
  }
  return { reason, message };
}

async function callGeminiApi(prompt, options = {}) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const response = await fetch(
    `${endpoint}?key=${encodeURIComponent(env.geminiApiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGeminiRequestBody(
        prompt,
        options.maxOutputTokens,
        options.responseSchema
      ))
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.warn('[Gemini] error response:', errorText.slice(0, 500));
    const { reason, message } = classifyHttpError(response.status, errorText);
    const error = new Error(message);
    error.fallbackReason = reason;
    error.retryable = response.status >= 500 || response.status === 429;
    throw error;
  }

  const payload = await response.json();
  const candidate = payload?.candidates?.[0];
  const text = candidate?.content?.parts
    ?.map((part) => part?.text || '')
    .join('');
  console.info('[Gemini] raw response:', String(text || '').slice(0, 700));

  if (!text) {
    const error = new Error('Gemini returned empty response');
    error.retryable = true;
    throw error;
  }

  return extractJson(text);
}

const DEFAULT_ASSISTANT_RESULT = {
  assistantMessage:
    'Mình đã ghi nhận triệu chứng của bạn và gợi ý một số chuyên khoa phù hợp để đặt lịch khám. Thông tin này chỉ mang tính tham khảo, không thay thế bác sĩ.',
  summary: DEFAULT_RESULT.summary,
  possibleCauses: [
    'Triệu chứng cần được bác sĩ thăm khám để xác định nguyên nhân.',
    'Kết quả này chỉ giúp định hướng bước tiếp theo, không phải chẩn đoán.'
  ],
  careGuidance: [
    'Theo dõi mức độ, thời gian xuất hiện và triệu chứng đi kèm.',
    'Không tự dùng thuốc kê đơn hoặc kháng sinh khi chưa có chỉ định.'
  ],
  nextSteps: [
    'Chuẩn bị thông tin về thời điểm bắt đầu, vị trí triệu chứng và yếu tố làm nặng hơn.',
    'Đặt lịch khám nếu triệu chứng kéo dài, tăng lên hoặc ảnh hưởng sinh hoạt.'
  ],
  recommendations: [
    {
      specialtyName: 'Nội tổng quát',
      reason: 'Phù hợp để đánh giá ban đầu khi triệu chứng chưa đủ rõ.',
      confidence: 60,
      priority: 'medium',
      matchingSymptoms: [],
      bookingHint: 'Có thể đặt lịch khám sớm để được bác sĩ tư vấn trực tiếp.'
    }
  ],
  followUpQuestions: [
    {
      id: 'duration',
      question: 'Triệu chứng đã kéo dài bao lâu?',
      choices: ['Dưới 24 giờ', '2-3 ngày', 'Trên 1 tuần']
    },
    {
      id: 'red_flags',
      question: 'Bạn có khó thở, đau ngực, ngất hoặc sốt cao không?',
      choices: ['Không có', 'Có một dấu hiệu', 'Không chắc']
    }
  ],
  quickReplies: ['Đặt lịch khám', 'Tôi muốn bổ sung triệu chứng', 'Có dấu hiệu nặng'],
  safety: {
    urgencyLevel: 'medium',
    warningSigns: [],
    recommendedAction: 'Theo dõi triệu chứng và đặt lịch khám nếu triệu chứng kéo dài hoặc nặng hơn.'
  },
  updatedContext: {},
  disclaimer: MEDICAL_DISCLAIMER
};

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 60;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function sanitizeStringArray(value, maxItems = 6) {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, maxItems)
    : [];
}

const CLINICAL_SIGNAL_PATTERNS = [
  /\b(kho ngu|mat ngu|ngu khong ngon|roi loan giac ngu|thuc giac)\b/,
  /\b(dau rang|nhuc rang|sau rang|e buot rang|viem loi|sung loi|nha khoa)\b/,
  /\b(dau hong|viem hong|nghet mui|so mui|chay mui|dau tai|viem tai|amidan)\b/,
  /\b(ho|sot)\b/,
  /\b(dau bung|tieu chay|buon non|non|day hoi|da day|tieu hoa)\b/,
  /\b(ngua|phat ban|noi me day|di ung|mun|viem da|noi man)\b/,
  /\b(dau dau|chong mat|dau nua dau|te bi|run tay)\b/,
  /\b(dau nguc|kho tho|hoi hop|tim dap nhanh|ngat)\b/,
  /\b(nga xe|tai nan|chan thuong|bam tim|dau chan|dau tay|dau goi|dau vai|bong gan|gay xuong)\b/
];

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function isContextualReply(text) {
  if (!text) return false;
  return /\b(khong co|khong sot|co sot|co dau|co kho tho|duoi 24 gio|2-3 ngay|tren 1 tuan|moi xuat hien|dang nang hon|nhe|trung binh|nang)\b/.test(text)
    || (/^(co|khong|duoi|tren|khoang|tu)\b/.test(text) && text.length <= 70);
}

function resolveAssistantContext(input) {
  const baseSymptoms = String(input?.symptoms || '').trim();
  const latestMessage = String(input?.latestMessage || '').trim();
  const normalizedLatest = normalizeText(latestMessage);
  const latestHasClinicalSignal = matchesAny(normalizedLatest, CLINICAL_SIGNAL_PATTERNS);
  const latestOverridesContext = Boolean(
    latestMessage && latestHasClinicalSignal && !isContextualReply(normalizedLatest)
  );
  const currentSymptoms = latestOverridesContext
    ? latestMessage
    : baseSymptoms || latestMessage;

  return {
    currentSymptoms,
    latestOverridesContext,
    classificationText: latestOverridesContext
      ? normalizedLatest
      : normalizeText(`${baseSymptoms} ${latestMessage}`)
  };
}

function sanitizeAssistantResult(value, input) {
  const result = value && typeof value === 'object' ? value : {};
  const resolvedContext = resolveAssistantContext(input);
  const safety = result.safety && typeof result.safety === 'object' ? result.safety : {};
  const urgencyLevel = ['low', 'medium', 'high'].includes(safety.urgencyLevel)
    ? safety.urgencyLevel
    : ['low', 'medium', 'high'].includes(result.urgencyLevel)
      ? result.urgencyLevel
      : 'medium';

  const rawRecommendations = Array.isArray(result.recommendations)
    ? result.recommendations
    : Array.isArray(result.suggestedSpecialties)
      ? result.suggestedSpecialties.map((item) => ({ specialtyName: item }))
      : DEFAULT_ASSISTANT_RESULT.recommendations;

  const recommendations = rawRecommendations
    .map((item) => {
      const recommendation = item && typeof item === 'object' ? item : { specialtyName: item };
      const priority = ['low', 'medium', 'high'].includes(recommendation.priority)
        ? recommendation.priority
        : urgencyLevel;

      return {
        specialtyName: String(recommendation.specialtyName || recommendation.name || '').trim(),
        reason: String(recommendation.reason || 'Phù hợp với nhóm triệu chứng bạn mô tả.').trim(),
        confidence: clampConfidence(recommendation.confidence),
        priority,
        matchingSymptoms: sanitizeStringArray(recommendation.matchingSymptoms, 5),
        bookingHint: String(recommendation.bookingHint || 'Có thể đặt lịch với chuyên khoa này để được thăm khám trực tiếp.').trim()
      };
    })
    .filter((item) => item.specialtyName)
    .slice(0, 6);

  const followUpQuestions = Array.isArray(result.followUpQuestions)
    ? result.followUpQuestions
        .map((item, index) => {
          const question = item && typeof item === 'object' ? item : { question: item };
          return {
            id: String(question.id || `follow_up_${index + 1}`).trim(),
            question: String(question.question || '').trim(),
            choices: sanitizeStringArray(question.choices, 4)
          };
        })
        .filter((item) => item.question)
        .slice(0, 4)
    : DEFAULT_ASSISTANT_RESULT.followUpQuestions;

  const updatedContext = result.updatedContext && typeof result.updatedContext === 'object'
    ? {
        symptoms: String(
          resolvedContext.latestOverridesContext
            ? resolvedContext.currentSymptoms
            : result.updatedContext.symptoms || resolvedContext.currentSymptoms
        ).trim(),
        age: result.updatedContext.age || input.age || '',
        gender: result.updatedContext.gender || input.gender || '',
        duration: String(result.updatedContext.duration || input.duration || '').trim(),
        severity: String(result.updatedContext.severity || input.severity || '').trim(),
        notes: sanitizeStringArray(result.updatedContext.notes, 8)
      }
    : {
        symptoms: resolvedContext.currentSymptoms,
        age: input.age || '',
        gender: input.gender || '',
        duration: String(input.duration || '').trim(),
        severity: String(input.severity || '').trim(),
        notes: []
      };

  const possibleCauses = sanitizeStringArray(result.possibleCauses, 6);
  const careGuidance = sanitizeStringArray(result.careGuidance || result.safeCareGuidance, 8);
  const nextSteps = sanitizeStringArray(result.nextSteps, 6);

  return {
    assistantMessage: String(result.assistantMessage || DEFAULT_ASSISTANT_RESULT.assistantMessage).trim(),
    summary: String(result.summary || DEFAULT_ASSISTANT_RESULT.summary).trim(),
    possibleCauses: possibleCauses.length ? possibleCauses : DEFAULT_ASSISTANT_RESULT.possibleCauses,
    careGuidance: careGuidance.length ? careGuidance : DEFAULT_ASSISTANT_RESULT.careGuidance,
    nextSteps: nextSteps.length ? nextSteps : DEFAULT_ASSISTANT_RESULT.nextSteps,
    recommendations: recommendations.length ? recommendations : DEFAULT_ASSISTANT_RESULT.recommendations,
    followUpQuestions,
    quickReplies: sanitizeStringArray(result.quickReplies, 5).length
      ? sanitizeStringArray(result.quickReplies, 5)
      : DEFAULT_ASSISTANT_RESULT.quickReplies,
    safety: {
      urgencyLevel,
      warningSigns: sanitizeStringArray(safety.warningSigns || result.warningSigns, 8),
      recommendedAction: String(safety.recommendedAction || DEFAULT_ASSISTANT_RESULT.safety.recommendedAction).trim()
    },
    updatedContext,
    disclaimer: MEDICAL_DISCLAIMER
  };
}

function addRecommendation(list, specialtyName, reason, confidence, priority, matchingSymptoms = [], bookingHint = '') {
  if (list.some((item) => normalizeText(item.specialtyName) === normalizeText(specialtyName))) return;
  list.push({
    specialtyName,
    reason,
    confidence,
    priority,
    matchingSymptoms,
    bookingHint: bookingHint || 'Nên đặt lịch để bác sĩ đánh giá trực tiếp và tư vấn hướng xử trí phù hợp.'
  });
}

function buildAssistantFallbackAnalysis(input) {
  const resolvedContext = resolveAssistantContext(input);
  const symptoms = resolvedContext.classificationText;
  const recommendations = [];
  const warningSigns = [];
  const possibleCauses = [];
  const careGuidance = [];
  const nextSteps = [];
  let followUpQuestions = null;
  let quickReplies = null;
  let urgencyLevel = 'medium';
  let summary = 'Hệ thống đã ghi nhận mô tả triệu chứng và gợi ý hướng khám phù hợp dựa trên từ khóa.';
  let assistantMessage = 'Mình đã ghi nhận mô tả của bạn. Hãy cho biết thêm thời gian xuất hiện và triệu chứng đi kèm để mình định hướng sát hơn.';

  if (/(dau nguc|kho tho|ngat|te nua nguoi|meo mieng|noi kho|co giat|sot cao|dau du doi)/.test(symptoms)) {
    urgencyLevel = 'high';
    summary = 'Mô tả có dấu hiệu cần được nhân viên y tế đánh giá sớm, đặc biệt nếu triệu chứng đang tăng nhanh.';
    warningSigns.push('Đau ngực, khó thở, ngất, yếu liệt, nói khó, co giật hoặc sốt cao là dấu hiệu cần đi khám/cấp cứu ngay.');
    addRecommendation(recommendations, 'Cấp cứu', 'Có dấu hiệu cảnh báo cần được đánh giá khẩn cấp.', 92, 'high', ['dấu hiệu nặng']);
    addRecommendation(recommendations, 'Tim mạch', 'Phù hợp khi có đau ngực, khó thở hoặc hồi hộp.', 82, 'high', ['đau ngực', 'khó thở']);
    possibleCauses.push('Có dấu hiệu cần được đánh giá y tế khẩn cấp.');
    careGuidance.push('Không chờ đợi tại nhà nếu có khó thở, ngất, yếu liệt hoặc đau ngực dữ dội.');
    nextSteps.push('Đến cơ sở y tế hoặc cấp cứu ngay nếu triệu chứng đang nặng lên.');
    assistantMessage = 'Mô tả của bạn có dấu hiệu cần được nhân viên y tế đánh giá sớm. Nếu triệu chứng đang xảy ra hoặc tăng nhanh, hãy đến cơ sở y tế/cấp cứu ngay.';
  }

  const hasSleepSymptoms = /\b(kho ngu|mat ngu|ngu khong ngon|roi loan giac ngu|thuc giac nhieu|kho vao giac)\b/.test(symptoms);
  const hasDentalSymptoms = /\b(dau rang|nhuc rang|sau rang|e buot rang|rang ham|nha khoa|viem loi|chay mau chan rang|sung loi|sung mat|ap xe rang|mu rang)\b/.test(symptoms);

  if (urgencyLevel !== 'high' && hasSleepSymptoms) {
    urgencyLevel = 'low';
    summary = 'Khó ngủ mới xuất hiện thường có thể liên quan căng thẳng, thói quen sinh hoạt hoặc môi trường ngủ; cần theo dõi thời gian kéo dài và mức độ ảnh hưởng ban ngày.';
    assistantMessage = 'Nếu bạn mới khó ngủ một đêm, trước mắt hãy giữ giờ ngủ và giờ thức cố định, tránh cà phê hoặc trà đặc từ buổi chiều, hạn chế rượu và màn hình sát giờ ngủ. Đừng cố nằm quá lâu khi chưa buồn ngủ; hãy thư giãn nhẹ và quay lại giường khi thấy buồn ngủ.';
    addRecommendation(
      recommendations,
      'Nội tổng quát',
      'Phù hợp để đánh giá ban đầu nếu mất ngủ kéo dài, tái diễn hoặc ảnh hưởng rõ đến sinh hoạt ban ngày.',
      78,
      'low',
      ['khó ngủ'],
      'Nên đặt lịch nếu khó ngủ kéo dài trên 2 tuần, tái diễn thường xuyên hoặc gây mệt mỏi nhiều ban ngày.'
    );
    addRecommendation(
      recommendations,
      'Tâm lý - Tâm thần',
      'Phù hợp khi khó ngủ đi kèm căng thẳng, lo âu, tâm trạng giảm hoặc suy nghĩ lặp lại.',
      72,
      'low',
      ['khó ngủ', 'căng thẳng'],
      'Có thể tìm chuyên gia phù hợp nếu mất ngủ liên quan rõ đến lo âu hoặc thay đổi tâm trạng.'
    );
    possibleCauses.push(
      'Căng thẳng, lo âu hoặc thay đổi lịch sinh hoạt.',
      'Caffeine, rượu, nicotine, màn hình hoặc vận động quá muộn.',
      'Môi trường ngủ ồn, sáng, nóng hoặc không thoải mái.'
    );
    careGuidance.push(
      'Giữ giờ thức dậy ổn định mỗi ngày và chỉ lên giường khi buồn ngủ.',
      'Tránh caffeine từ buổi chiều, hạn chế rượu và bữa ăn lớn sát giờ ngủ.',
      'Giảm ánh sáng, màn hình và công việc căng thẳng trong khoảng một giờ trước khi ngủ.'
    );
    nextSteps.push(
      'Theo dõi số đêm khó ngủ, tổng thời gian ngủ và mức độ buồn ngủ ban ngày trong 1-2 tuần.',
      'Đi khám nếu tình trạng kéo dài trên 2 tuần, tái diễn nhiều hoặc ảnh hưởng công việc và sinh hoạt.'
    );
    followUpQuestions = [
      {
        id: 'sleep_duration',
        question: 'Bạn khó ngủ từ khi nào và tình trạng này xảy ra bao nhiêu đêm mỗi tuần?',
        choices: ['Mới một đêm', 'Dưới 2 tuần', 'Trên 2 tuần', 'Gần như mỗi đêm']
      },
      {
        id: 'sleep_context',
        question: 'Gần đây bạn có căng thẳng, dùng caffeine buổi chiều hoặc buồn ngủ nhiều ban ngày không?',
        choices: ['Không có', 'Có căng thẳng', 'Có dùng caffeine', 'Buồn ngủ ban ngày']
      }
    ];
    quickReplies = ['Mới bị một đêm', 'Tôi đang căng thẳng', 'Tình trạng kéo dài trên 2 tuần'];
  } else if (urgencyLevel !== 'high' && hasDentalSymptoms) {
    const hasDentalWarning = /(sung mat|sung loi|sot|co mu|mu rang|ap xe|kho nuot|kho tho|dau du doi|dau tang nhanh)/.test(symptoms);
    urgencyLevel = hasDentalWarning ? 'high' : urgencyLevel;
    summary = hasDentalWarning
      ? 'Đau răng kèm sưng, sốt, mủ hoặc đau tăng nhanh cần được khám Răng hàm mặt/Nha khoa sớm để kiểm tra nhiễm trùng hoặc biến chứng.'
      : 'Đau răng kéo dài vài ngày thường nên được khám Răng hàm mặt/Nha khoa để tìm nguyên nhân như sâu răng, viêm lợi hoặc viêm quanh răng.';
    addRecommendation(
      recommendations,
      'Răng hàm mặt',
      'Phù hợp nhất với đau răng, ê buốt, sâu răng, viêm lợi hoặc sưng vùng răng miệng.',
      94,
      hasDentalWarning ? 'high' : 'medium',
      ['đau răng', 'răng miệng'],
      'Nên đặt lịch Răng hàm mặt/Nha khoa. Nếu hệ thống chưa có chuyên khoa này, hãy liên hệ cơ sở nha khoa phù hợp.'
    );
    possibleCauses.push(
      'Có thể liên quan sâu răng, viêm tủy răng, viêm lợi hoặc viêm quanh răng.',
      'Đau khi nhai, ê buốt nóng lạnh hoặc sưng lợi là thông tin quan trọng cho bác sĩ.'
    );
    careGuidance.push(
      'Giữ vệ sinh răng miệng nhẹ nhàng, tránh nhai bên răng đau và tránh đồ quá nóng/lạnh nếu gây ê buốt.',
      'Không tự dùng kháng sinh hoặc thuốc kê đơn khi chưa được bác sĩ chỉ định.',
      'Theo dõi sưng mặt, sốt, mủ quanh răng, đau tăng nhanh hoặc khó nuốt.'
    );
    nextSteps.push(
      'Ưu tiên khám Răng hàm mặt/Nha khoa, nhất là khi đau kéo dài trên 1-2 ngày hoặc ảnh hưởng ăn uống.',
      'Chuẩn bị thông tin: răng đau ở vị trí nào, đau âm ỉ hay đau nhói, có ê buốt/sưng/sốt không.'
    );
    if (hasDentalWarning) {
      warningSigns.push('Sưng mặt, sốt, có mủ quanh răng, khó nuốt, khó thở hoặc đau dữ dội là dấu hiệu cần đi khám ngay.');
    }
    followUpQuestions = [
      {
        id: 'tooth_location',
        question: 'Răng đau ở vị trí nào và đau âm ỉ hay đau nhói từng cơn?',
        choices: ['Răng hàm', 'Răng cửa', 'Đau nhói', 'Đau âm ỉ']
      },
      {
        id: 'dental_red_flags',
        question: 'Bạn có sưng lợi/mặt, sốt, mủ quanh răng hoặc đau tăng khi nhai không?',
        choices: ['Không có', 'Có sưng', 'Có sốt/mủ', 'Đau khi nhai']
      }
    ];
    quickReplies = ['Có sưng mặt hoặc sốt', 'Đau tăng khi nhai', 'Tôi muốn đặt lịch nha khoa'];
  }

  const hasRespiratorySymptoms = /\b(dau hong|ho|sot|nghet mui|so mui|chay mui|viem hong|amidan|dau tai|viem tai)\b/.test(symptoms);
  if (urgencyLevel !== 'high' && !hasSleepSymptoms && !hasDentalSymptoms && hasRespiratorySymptoms) {
    addRecommendation(recommendations, 'Tai mũi họng', 'Phù hợp với triệu chứng họng, mũi, tai hoặc ho kéo dài.', 84, urgencyLevel, ['đau họng', 'ho', 'nghẹt mũi']);
    summary = 'Các triệu chứng vùng tai mũi họng nên được thăm khám nếu kéo dài, tái phát hoặc kèm sốt.';
    assistantMessage = 'Bạn nên nghỉ ngơi, uống đủ nước ấm và theo dõi nhiệt độ cùng diễn tiến ho, đau họng hoặc nghẹt mũi. Nếu triệu chứng kéo dài, sốt cao, khó thở hoặc nặng dần, hãy đi khám sớm.';
  }

  if (/(tre em|\bbe\b|\bnhi\b|con toi|be nha)/.test(symptoms)) {
    addRecommendation(recommendations, 'Nhi', 'Người bệnh là trẻ em nên ưu tiên chuyên khoa Nhi để đánh giá theo độ tuổi.', 88, urgencyLevel, ['trẻ em']);
  }

  if (urgencyLevel !== 'high' && !hasSleepSymptoms && /\b(dau bung|tieu chay|non|buon non|day hoi|da day|tieu hoa)\b/.test(symptoms)) {
    addRecommendation(recommendations, 'Tiêu hóa', 'Phù hợp với đau bụng, nôn, tiêu chảy hoặc khó chịu dạ dày.', 86, urgencyLevel, ['đau bụng', 'tiêu chảy', 'buồn nôn']);
    summary = 'Triệu chứng tiêu hóa cần được đánh giá nếu kéo dài, mất nước, đau tăng hoặc có sốt.';
  }

  if (urgencyLevel !== 'high' && !hasSleepSymptoms && /\b(ngua|phat ban|noi me day|di ung|mun|viem da|noi man)\b/.test(symptoms)) {
    addRecommendation(recommendations, 'Da liễu', 'Phù hợp với ngứa, phát ban, mẩn đỏ hoặc các vấn đề về da.', 84, urgencyLevel, ['ngứa', 'phát ban']);
  }

  if (urgencyLevel !== 'high' && !hasSleepSymptoms && /\b(nga xe|tai nan|chan thuong|sung|bam tim|dau chan|dau tay|dau goi|dau vai|bong gan|gay xuong)\b/.test(symptoms)) {
    addRecommendation(recommendations, 'Cơ xương khớp', 'Phù hợp khi có đau, sưng hoặc hạn chế vận động sau va chạm.', 82, 'medium', ['đau', 'sưng']);
    warningSigns.push('Nếu biến dạng chi, không cử động được, tê bì hoặc đau tăng nhanh, nên đi khám ngay.');
  }

  if (!recommendations.length) {
    addRecommendation(recommendations, 'Nội tổng quát', 'Phù hợp để đánh giá ban đầu khi triệu chứng chưa đủ rõ.', 62, urgencyLevel);
    possibleCauses.push('Thông tin hiện chưa đủ đặc hiệu để xác định nhóm chuyên khoa hẹp.');
    careGuidance.push('Theo dõi diễn tiến, mức độ ảnh hưởng sinh hoạt và các triệu chứng đi kèm.');
    nextSteps.push('Có thể khám Nội tổng quát để được đánh giá ban đầu và chuyển chuyên khoa nếu cần.');
    assistantMessage = 'Mô tả hiện chưa đủ để chọn một chuyên khoa hẹp. Bạn hãy cho biết triệu chứng chính, vị trí, thời điểm bắt đầu và mức độ ảnh hưởng để mình định hướng chính xác hơn.';
  }

  if (normalizeText(input.severity).includes('high')) {
    urgencyLevel = urgencyLevel === 'high' ? 'high' : 'medium';
  }

  return sanitizeAssistantResult({
    assistantMessage,
    summary,
    possibleCauses,
    careGuidance,
    nextSteps,
    recommendations,
    followUpQuestions: followUpQuestions || [
      {
        id: 'duration',
        question: 'Triệu chứng đã kéo dài bao lâu và có nặng hơn theo thời gian không?',
        choices: ['Mới xuất hiện', '2-3 ngày', 'Trên 1 tuần', 'Đang nặng hơn']
      },
      {
        id: 'associated_symptoms',
        question: 'Bạn có triệu chứng đi kèm như sốt, khó thở, đau nhiều hoặc mệt lả không?',
        choices: ['Không có', 'Có sốt', 'Có đau nhiều', 'Có khó thở']
      }
    ],
    quickReplies: quickReplies || ['Tôi muốn bổ sung triệu chứng', 'Đặt lịch với chuyên khoa phù hợp', 'Tôi có dấu hiệu nặng'],
    safety: {
      urgencyLevel,
      warningSigns,
      recommendedAction: urgencyLevel === 'high'
        ? 'Nếu triệu chứng đang nặng hoặc có dấu hiệu nguy hiểm, hãy đến cơ sở y tế/cấp cứu ngay.'
        : 'Bạn có thể đặt lịch khám phù hợp và theo dõi thêm nếu triệu chứng thay đổi.'
    },
    updatedContext: {
      symptoms: resolvedContext.currentSymptoms,
      age: input.age || '',
      gender: input.gender || '',
      duration: input.duration || '',
      severity: input.severity || '',
      notes: sanitizeStringArray(input.messages?.map((item) => item.content), 8)
    }
  }, input);
}

function buildAssistantPrompt(input) {
  const messages = Array.isArray(input.messages)
    ? input.messages
        .slice(-8)
        .map((message) => {
          const role = message?.role === 'assistant' ? 'assistant' : 'user';
          return `${role}: ${String(message?.content || '').slice(0, 600)}`;
        })
        .join('\n')
    : '';

  return `Bạn là trợ lý AI định hướng chuyên khoa cho hệ thống BookingCare Mini.

Mục tiêu:
- Hỗ trợ người dùng mô tả triệu chứng qua nhiều lượt hỏi đáp.
- Trả lời trực tiếp nhu cầu trong tin nhắn mới nhất trước: giải thích hướng xử trí an toàn, dấu hiệu cần chú ý và bước tiếp theo.
- Gợi ý nhiều chuyên khoa phù hợp hơn, có lý do và mức độ phù hợp.
- Hỏi tiếp tối đa 3 câu nếu thiếu thông tin quan trọng.
- Chỉ định hướng đặt lịch khám, không chẩn đoán chắc chắn, không kê thuốc.
- Nếu có dấu hiệu nguy hiểm, ưu tiên cảnh báo đi cơ sở y tế/cấp cứu.

Quy tắc an toàn:
- Không thay thế bác sĩ.
- Không đưa kết luận bệnh chắc chắn.
- Không kê thuốc hoặc liều dùng.
- Không làm người dùng trì hoãn cấp cứu khi có dấu hiệu nặng.
- Trả về JSON hợp lệ duy nhất, không markdown, không code block.
- Mỗi chuỗi ngắn gọn, rõ ràng, tiếng Việt tự nhiên.
- Tin nhắn mới nhất có mức ưu tiên cao nhất. Nếu người dùng nêu triệu chứng hoặc chủ đề mới, phải cập nhật updatedContext.symptoms và không tái sử dụng nhận định/chuyên khoa của chủ đề cũ.
- Nếu tin nhắn mới chỉ là câu trả lời ngắn cho câu hỏi trước (ví dụ: "2-3 ngày", "không sốt"), hãy kết hợp với triệu chứng đang có trong ngữ cảnh.
- Không gợi ý chuyên khoa không liên quan. Với đau răng/răng/lợi/nha khoa, ưu tiên Răng hàm mặt hoặc Nha khoa; không gợi ý Cơ xương khớp trừ khi có chấn thương hàm/xương rõ ràng.
- Với khó ngủ hoặc mất ngủ, phải trả lời hướng vệ sinh giấc ngủ phù hợp; không suy diễn thành ho hoặc bệnh Tai mũi họng nếu không có triệu chứng hô hấp rõ ràng.
- Nếu hệ thống chưa có chuyên khoa phù hợp, vẫn trả lời hướng xử trí và ghi bookingHint rằng hiện chưa hỗ trợ đặt lịch chuyên khoa đó.

Schema JSON bắt buộc:
{
  "assistantMessage":"string",
  "summary":"string",
  "possibleCauses":["string"],
  "careGuidance":["string"],
  "nextSteps":["string"],
  "recommendations":[
    {
      "specialtyName":"string",
      "reason":"string",
      "confidence":0,
      "priority":"low|medium|high",
      "matchingSymptoms":["string"],
      "bookingHint":"string"
    }
  ],
  "followUpQuestions":[
    {"id":"string","question":"string","choices":["string"]}
  ],
  "quickReplies":["string"],
  "safety":{
    "urgencyLevel":"low|medium|high",
    "warningSigns":["string"],
    "recommendedAction":"string"
  },
  "updatedContext":{
    "symptoms":"string",
    "age":"string",
    "gender":"string",
    "duration":"string",
    "severity":"string",
    "notes":["string"]
  },
  "disclaimer":"string"
}

Thông tin ban đầu:
- Triệu chứng: ${input.symptoms || ''}
- Tuổi: ${input.age || 'không rõ'}
- Giới tính: ${input.gender || 'không rõ'}
- Thời gian bị: ${input.duration || 'không rõ'}
- Mức độ: ${input.severity || 'không rõ'}
- Tin nhắn mới nhất: ${input.latestMessage || ''}

Lịch sử hội thoại gần đây:
${messages || 'Chưa có'}`;
}

function assistantFallbackWithReason(input, reason, message) {
  return {
    ...buildAssistantFallbackAnalysis(input),
    aiAvailable: false,
    isFallback: true,
    fallbackReason: reason,
    aiErrorMessage: message
  };
}

export async function analyzeSymptomAssistant(input) {
  const safeInput = {
    symptoms: String(input?.symptoms || '').trim(),
    age: input?.age,
    gender: input?.gender,
    duration: String(input?.duration || '').trim(),
    severity: String(input?.severity || '').trim(),
    latestMessage: String(input?.latestMessage || '').trim(),
    messages: Array.isArray(input?.messages)
      ? input.messages
          .map((message) => ({
            role: message?.role === 'assistant' ? 'assistant' : 'user',
            content: String(message?.content || '').trim()
          }))
          .filter((message) => message.content)
          .slice(-10)
      : []
  };

  if (!hasUsableGeminiKey()) {
    return assistantFallbackWithReason(
      safeInput,
      'missing_api_key',
      'Chưa cấu hình GEMINI_API_KEY hợp lệ trong backend/.env.'
    );
  }

  const prompt = buildAssistantPrompt(safeInput);
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.info(`[Gemini Assistant] attempt ${attempt}/${MAX_RETRIES}`);
      const parsed = await callGeminiApi(prompt, {
        maxOutputTokens: 3072,
        responseSchema: ASSISTANT_RESPONSE_SCHEMA
      });
      return {
        ...sanitizeAssistantResult(parsed, safeInput),
        aiAvailable: true,
        isFallback: false
      };
    } catch (error) {
      lastError = error;
      const isJsonError = /JSON|parse|truncat/i.test(error.message || '');
      const isRetryable = error.retryable || isJsonError;
      console.warn(`[Gemini Assistant] attempt ${attempt} failed:`, error.message);

      if (!isRetryable || attempt >= MAX_RETRIES) break;
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }
  }

  return assistantFallbackWithReason(
    safeInput,
    lastError?.fallbackReason || 'network_or_parse_error',
    lastError?.message || 'Không thể kết nối hoặc phân tích phản hồi từ Gemini.'
  );
}

export async function analyzeSymptoms(input) {
  const safeInput = {
    symptoms: String(input?.symptoms || '').trim(),
    age: input?.age,
    gender: input?.gender,
    duration: String(input?.duration || '').trim(),
    severity: String(input?.severity || '').trim()
  };

  const hasGeminiKey = Boolean(env.geminiApiKey);
  console.info('[Gemini] API key configured:', hasGeminiKey);
  if (hasGeminiKey) console.info('[Gemini] key prefix:', keyPrefix());
  console.info('[Gemini] model:', GEMINI_MODEL);

  if (!hasGeminiKey || !hasUsableGeminiKey()) {
    return fallbackWithReason(
      safeInput,
      'missing_api_key',
      'Chưa cấu hình GEMINI_API_KEY hợp lệ trong backend/.env.'
    );
  }

  const prompt = buildPrompt(safeInput);
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.info(`[Gemini] attempt ${attempt}/${MAX_RETRIES}`);
      const parsed = await callGeminiApi(prompt, { responseSchema: BASIC_RESPONSE_SCHEMA });
      return {
        ...sanitizeResult(parsed),
        aiAvailable: true,
        isFallback: false
      };
    } catch (error) {
      lastError = error;
      const isJsonError = /JSON|parse|truncat/i.test(error.message || '');
      const isRetryable = error.retryable || isJsonError;

      if (isJsonError) {
        console.warn(`[Gemini] attempt ${attempt} JSON parse failed:`, error.message);
      } else {
        console.warn(`[Gemini] attempt ${attempt} failed:`, error.message);
      }

      if (!isRetryable || attempt >= MAX_RETRIES) {
        break;
      }

      // Brief delay before retry (200ms * attempt)
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }
  }

  console.warn('[Gemini] all attempts exhausted, using fallback');
  return fallbackWithReason(
    safeInput,
    lastError?.fallbackReason || 'network_or_parse_error',
    lastError?.message || 'Không thể kết nối hoặc phân tích phản hồi từ Gemini.'
  );
}

export {
  GEMINI_MODEL,
  MEDICAL_DISCLAIMER,
  buildAssistantFallbackAnalysis,
  hasUsableGeminiKey,
  keyPrefix,
  resolveAssistantContext
};
