const COMMON_PASSWORDS = new Set([
  '123456',
  '12345678',
  'password',
  'admin123',
  'qwerty123',
  '11111111',
  'abc123456'
]);

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function personalTokens(userInfo = {}) {
  const tokens = [];
  const email = normalize(userInfo.email).split('@')[0];
  const phone = normalize(userInfo.phone).replace(/\D/g, '');
  const name = normalize(userInfo.name);

  if (email && email.length >= 3) tokens.push(email);
  if (phone && phone.length >= 4) tokens.push(phone);
  if (name) {
    tokens.push(name.replace(/\s+/g, ''));
    tokens.push(...name.split(/\s+/).filter((part) => part.length >= 3));
  }

  return [...new Set(tokens.filter(Boolean))];
}

export function getPasswordChecks(password, userInfo = {}) {
  const value = String(password || '');
  const normalizedPassword = normalize(value);
  const compactPassword = normalizedPassword.replace(/\s+/g, '');
  const hasPersonalInfo = personalTokens(userInfo).some((token) => compactPassword.includes(token));

  return [
    { key: 'length', label: 'Ít nhất 8 ký tự', valid: value.length >= 8 },
    { key: 'upper', label: 'Có chữ hoa', valid: /[A-Z]/.test(value) },
    { key: 'lower', label: 'Có chữ thường', valid: /[a-z]/.test(value) },
    { key: 'number', label: 'Có số', valid: /\d/.test(value) },
    { key: 'special', label: 'Có ký tự đặc biệt', valid: /[^A-Za-z0-9]/.test(value) },
    {
      key: 'personal',
      label: 'Không chứa thông tin cá nhân',
      valid:
        !hasPersonalInfo &&
        !COMMON_PASSWORDS.has(normalizedPassword) &&
        !/^\d+$/.test(value) &&
        !/^(.)\1+$/.test(value)
    }
  ];
}

export function validatePasswordStrength(password, userInfo = {}) {
  const checks = getPasswordChecks(password, userInfo);
  const valid = checks.every((item) => item.valid);

  if (!valid) {
    return {
      valid: false,
      message: 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
      checks
    };
  }

  return { valid: true, message: 'Mật khẩu hợp lệ', checks };
}

export function getPasswordStrength(password, userInfo = {}) {
  const checks = getPasswordChecks(password, userInfo);
  const passed = checks.filter((item) => item.valid).length;

  if (!password) return { label: 'Yếu', level: 'weak', score: 0, checks };
  if (passed <= 3) return { label: 'Yếu', level: 'weak', score: passed, checks };
  if (passed <= 5) return { label: 'Trung bình', level: 'medium', score: passed, checks };
  return { label: 'Mạnh', level: 'strong', score: passed, checks };
}
