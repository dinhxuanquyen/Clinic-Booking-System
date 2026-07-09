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

export function validatePasswordStrength(password, userInfo = {}) {
  const value = String(password || '');
  const normalizedPassword = normalize(value);

  if (value.length < 8) {
    return {
      valid: false,
      message: 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt'
    };
  }

  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return {
      valid: false,
      message: 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt'
    };
  }

  if (COMMON_PASSWORDS.has(normalizedPassword)) {
    return { valid: false, message: 'Mật khẩu quá phổ biến, vui lòng chọn mật khẩu mạnh hơn' };
  }

  if (/^\d+$/.test(value)) {
    return { valid: false, message: 'Mật khẩu không được chỉ gồm toàn số' };
  }

  if (/^(.)\1+$/.test(value)) {
    return { valid: false, message: 'Mật khẩu không được là chuỗi ký tự lặp đơn giản' };
  }

  const compactPassword = normalizedPassword.replace(/\s+/g, '');
  const token = personalTokens(userInfo).find((item) => compactPassword.includes(item));
  if (token) {
    return { valid: false, message: 'Mật khẩu không được chứa email, tên hoặc số điện thoại của bạn' };
  }

  return { valid: true, message: 'Mật khẩu hợp lệ' };
}
