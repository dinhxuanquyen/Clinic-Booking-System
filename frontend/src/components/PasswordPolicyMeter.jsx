import { getPasswordStrength } from '../utils/passwordPolicy.js';

export default function PasswordPolicyMeter({ password, userInfo, className = '' }) {
  const strength = getPasswordStrength(password, userInfo);

  return (
    <div className={`password-policy-meter password-policy-${strength.level} ${className}`.trim()}>
      <div className="password-strength-row">
        <span>Độ mạnh mật khẩu</span>
        <strong>{strength.label}</strong>
      </div>
      <div className="password-strength-track" aria-hidden="true">
        <span style={{ width: `${Math.max((strength.score / 6) * 100, password ? 14 : 0)}%` }} />
      </div>
      <ul className="password-policy-checklist">
        {strength.checks.map((item) => (
          <li className={item.valid ? 'valid' : 'invalid'} key={item.key}>
            <span>{item.valid ? '✓' : '•'}</span>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
