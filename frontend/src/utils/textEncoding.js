const MOJIBAKE_PATTERN = /(?:\u00c3|\u00c2|\u00c4|\u00c5|\u00c6|\u00d0|\u00d1|\u00e1\u00ba|\u00e1\u00bb|\u00e0\u00b8|\u00e2\u20ac|\u00f0\u0178|\ufffd|[\u0080-\u009f])/;
const REPLACEMENT_PATTERN = /\ufffd/g;
const LOSSY_QUESTION_PATTERN = /[A-Za-zÀ-ỹ]\?[A-Za-zÀ-ỹ]|^\?[A-Za-zÀ-ỹ]|[A-Za-zÀ-ỹ]\?$/;
const MOJIBAKE_RUN_PATTERN = /[\u0080-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2018-\u201e\u2020-\u2026\u2030\u2039\u203a\u20ac\u2122][A-Za-z0-9\u0080-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2018-\u201e\u2020-\u2026\u2030\u2039\u203a\u20ac\u2122_-]*/g;

const WINDOWS_1252_SPECIAL_BYTES = new Map([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f]
]);

const PHRASE_REPAIRS = [
  {
    pattern: /(?:Đ|\u00c4.|D)?(?:ã|\u00c3\u00a3)?.{0,8}g.{0,4}i.{0,6}y.{0,4}u.{0,6}c.{0,6}u.{0,8}h.{0,4}y.{0,8}l.{0,4}ch\.?\s*Vui.{0,8}l.{0,4}ng.{0,8}ch.{0,4}ph.{0,4}ng.{0,8}kh.{0,4}m.{0,8}x.{0,4}c.{0,8}nh.{0,4}n\.?/i,
    replacement: 'Đã gửi yêu cầu hủy lịch. Vui lòng chờ phòng khám xác nhận.'
  },
  {
    pattern: /C.{0,3}l.{0,4}ch.{0,4}kh.{0,4}m.{0,4}m.{0,4}i/i,
    replacement: 'Có lịch khám mới'
  },
  {
    pattern: /L.{0,4}ch.{0,4}h.{0,4}n.{0,8}(?:đ|\u00c4.).{0,4}(?:đ|\u00c4.).{0,8}c.{0,4}x.{0,4}c.{0,4}nh.{0,4}n/i,
    replacement: 'Lịch hẹn đã được xác nhận'
  },
  {
    pattern: /H.{0,4}s.{0,4}kh.{0,4}m.{0,4}b.{0,4}nh.{0,8}(?:đ|\u00c4.).{0,4}(?:đ|\u00c4.).{0,8}c.{0,4}c.{0,4}p.{0,4}nh.{0,4}t/i,
    replacement: 'Hồ sơ khám bệnh đã được cập nhật'
  }
];

const TOKEN_REPAIRS = [
  [/\bL\?ch\b/g, 'Lịch'],
  [/\bl\?ch\b/g, 'lịch'],
  [/\bB\?nh\b/g, 'Bệnh'],
  [/\bb\?nh\b/g, 'bệnh'],
  [/\bKh\?m\b/g, 'Khám'],
  [/\bkh\?m\b/g, 'khám'],
  [/\bG\?i\b/g, 'Gửi'],
  [/\bg\?i\b/g, 'gửi'],
  [/\by\?u\b/g, 'yêu'],
  [/\bc\?\?u\b/g, 'cầu'],
  [/\bh\?y\b/g, 'hủy'],
  [/\bch\?\b/g, 'chờ'],
  [/\bx\?c\b/g, 'xác'],
  [/\bnh\?n\b/g, 'nhận'],
  [/\bm\?i\b/g, 'mới'],
  [/\bđ\?\?c\b/g, 'được'],
  [/\b\u00c4\u2018\?\?c\b/g, 'được'],
  [/\bc\?p\b/g, 'cập'],
  [/\bnh\?t\b/g, 'nhật'],
  [/\bQuy\?n\b/g, 'Quyền'],
  [/\bQu\?c\b/g, 'Quốc'],
  [/\?\u1ecbnh\b/g, 'Định'],
  [/\?inh\b/g, 'Đinh'],
  [/\bB\?c s(?:ĩ|i)\b/g, 'Bác sĩ'],
  [/\bb\?c s(?:ĩ|i)\b/g, 'bác sĩ'],
  [/\bph\?ng\b/g, 'phòng'],
  [/\bv\?i\b/g, 'với'],
  [/\bng\?y\b/g, 'ngày'],
  [/\bkhung gi\?\b/g, 'khung giờ'],
  [/\u00c4\u0090/g, 'Đ'],
  [/\u00c4\u2018/g, 'đ']
];

function toWindows1252Bytes(value) {
  return Uint8Array.from(Array.from(value), (character) => {
    const codePoint = character.codePointAt(0);
    if (codePoint <= 0xff) return codePoint;
    return WINDOWS_1252_SPECIAL_BYTES.get(codePoint) ?? 0x3f;
  });
}

function decodeAsUtf8(value) {
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(toWindows1252Bytes(value));
  } catch {
    return value;
  }
}

function mojibakeScore(value) {
  if (!value) return 0;
  const markers = value.match(MOJIBAKE_PATTERN)?.length || 0;
  const replacement = (value.match(REPLACEMENT_PATTERN)?.length || 0) * 12;
  const lossyQuestions = (value.match(LOSSY_QUESTION_PATTERN)?.length || 0) * 8;
  return markers * 10 + replacement + lossyQuestions;
}

function decodeMojibakeRuns(value) {
  return value.replace(MOJIBAKE_RUN_PATTERN, (run) => {
    if (!MOJIBAKE_PATTERN.test(run)) return run;
    const decoded = decodeAsUtf8(run);
    return mojibakeScore(decoded) < mojibakeScore(run) ? decoded : run;
  });
}

function repairCommonVietnameseText(value) {
  let repaired = value;

  PHRASE_REPAIRS.forEach(({ pattern, replacement }) => {
    repaired = repaired.replace(pattern, replacement);
  });

  TOKEN_REPAIRS.forEach(([pattern, replacement]) => {
    repaired = repaired.replace(pattern, replacement);
  });

  return repaired;
}

export function cleanDisplayText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const original = String(value);
  if (!original) return fallback;

  if (!MOJIBAKE_PATTERN.test(original) && !LOSSY_QUESTION_PATTERN.test(original)) {
    return repairCommonVietnameseText(original);
  }

  const candidates = [original, decodeMojibakeRuns(original), decodeAsUtf8(original)];
  let current = candidates[1];

  for (let index = 0; index < 2; index += 1) {
    current = decodeMojibakeRuns(current);
    candidates.push(current);
    if (!MOJIBAKE_PATTERN.test(current)) break;
  }

  const best = candidates.reduce((bestCandidate, candidate) => (
    mojibakeScore(candidate) < mojibakeScore(bestCandidate) ? candidate : bestCandidate
  ), original);

  return repairCommonVietnameseText(best);
}

export function cleanDisplayObject(value) {
  if (Array.isArray(value)) return value.map((item) => cleanDisplayObject(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cleanDisplayObject(item)])
    );
  }
  if (typeof value === 'string') return cleanDisplayText(value);
  return value;
}
