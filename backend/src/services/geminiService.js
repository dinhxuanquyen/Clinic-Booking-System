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

  if (/(\\btre em\\b|\\bbe\\b|\\bnhi\\b|con toi)/.test(symptoms)) {
    suggestedSpecialties = ['Nhi', ...suggestedSpecialties];
    summary = 'Vì triệu chứng liên quan trẻ em, bạn nên ưu tiên chuyên khoa Nhi để được đánh giá phù hợp theo độ tuổi.';
  }

  if (/(dau bung|tieu chay|non|buon non|day hoi|da day|tieu hoa)/.test(symptoms)) {
    suggestedSpecialties = ['Tiêu hóa', 'Nội tổng quát'];
    summary = 'Các triệu chứng tiêu hóa như đau bụng, tiêu chảy, buồn nôn hoặc khó chịu dạ dày nên được đánh giá bởi chuyên khoa Tiêu hóa hoặc Nội tổng quát.';
  }

  if (/(\\bda\\b|\\bngua\\b|phat ban|noi me day|di ung)/.test(symptoms)) {
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

function buildGeminiRequestBody(prompt) {
  return {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json'
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

async function callGeminiApi(prompt) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const response = await fetch(
    `${endpoint}?key=${encodeURIComponent(env.geminiApiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGeminiRequestBody(prompt))
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
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  console.info('[Gemini] raw response:', String(text || '').slice(0, 700));

  if (!text) {
    const error = new Error('Gemini returned empty response');
    error.retryable = true;
    throw error;
  }

  return extractJson(text);
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
      const parsed = await callGeminiApi(prompt);
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

export { GEMINI_MODEL, MEDICAL_DISCLAIMER, hasUsableGeminiKey, keyPrefix };
