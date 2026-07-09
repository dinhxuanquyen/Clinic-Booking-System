import { useMemo, useRef, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { cleanDisplayText } from '../utils/textEncoding.js';

const initialForm = {
  symptoms: '',
  age: '',
  gender: '',
  duration: '',
  severity: 'medium'
};

const urgencyMeta = {
  low: {
    label: 'Có thể đặt lịch khám thông thường',
    icon: '✅',
    className: 'low',
    color: 'var(--color-success)',
    bg: 'var(--color-success-light)'
  },
  medium: {
    label: 'Nên đặt lịch khám sớm',
    icon: '⚠️',
    className: 'medium',
    color: '#D97706',
    bg: '#FEF3C7'
  },
  high: {
    label: 'Cần được đánh giá khẩn cấp',
    icon: '🚨',
    className: 'high',
    color: 'var(--color-danger)',
    bg: 'var(--color-danger-light)'
  }
};

const severityOptions = [
  { value: 'low', label: 'Nhẹ', desc: 'Triệu chứng nhẹ, không ảnh hưởng sinh hoạt' },
  { value: 'medium', label: 'Trung bình', desc: 'Ảnh hưởng đến sinh hoạt hàng ngày' },
  { value: 'high', label: 'Nặng', desc: 'Triệu chứng nghiêm trọng, cần chú ý' }
];

function apiErrorMessage(error) {
  return cleanDisplayText(error?.message, 'Không thể phân tích triệu chứng lúc này. Vui lòng thử lại sau.');
}

function LoadingPulse() {
  return (
    <div className="sc-loading-state">
      <div className="sc-loading-brain">🧠</div>
      <div className="sc-loading-dots">
        <span /><span /><span />
      </div>
      <p>AI đang phân tích triệu chứng của bạn...</p>
      <small>Thường mất 5–15 giây</small>
    </div>
  );
}

function UrgencyCard({ urgency }) {
  return (
    <div className="sc-urgency-card" style={{ '--urgency-color': urgency.color, '--urgency-bg': urgency.bg }}>
      <span className="sc-urgency-icon">{urgency.icon}</span>
      <div>
        <span className="sc-urgency-level">Mức độ cần khám</span>
        <strong className="sc-urgency-label">{urgency.label}</strong>
      </div>
    </div>
  );
}

export default function SymptomCheckerPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);

  const urgency = useMemo(() => urgencyMeta[result?.urgencyLevel] || urgencyMeta.medium, [result]);

  // Auto-scroll to results when they arrive
  useEffect(() => {
    if (result && resultRef.current) {
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [result]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function bookWithSpecialty(item) {
    const params = new URLSearchParams();
    if (item?._id) params.set('specialtyId', item._id);
    navigate(`/booking${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async function submit(event) {
    event.preventDefault();
    if (form.symptoms.trim().length < 8) {
      toast.warning('Vui lòng mô tả triệu chứng rõ hơn (ít nhất 8 ký tự)');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const payload = await api('/ai/symptom-checker', {
        method: 'POST',
        body: JSON.stringify({
          symptoms: form.symptoms.trim(),
          age: form.age || undefined,
          gender: form.gender || undefined,
          duration: form.duration.trim() || undefined,
          severity: form.severity || undefined
        })
      });
      setResult(payload.data);
      if (payload.isFallback || payload.data?.isFallback) {
        toast.info('Đang sử dụng gợi ý cơ bản. Thử lại sau để nhận phân tích AI chính xác hơn.');
      } else if (payload.data?.urgencyLevel === 'high') {
        toast.warning('Có dấu hiệu cần được đánh giá khẩn cấp. Vui lòng đến cơ sở y tế nếu triệu chứng nặng.');
      } else {
        toast.success('Đã phân tích triệu chứng bằng AI');
      }
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="sc-page">
      {/* ── Hero Banner ── */}
      <section className="sc-hero">
        <div className="container">
          <div className="sc-hero-inner">
            <div className="sc-hero-badge">
              <span>🤖</span> AI Symptom Checker
            </div>
            <h1>Chưa biết nên khám khoa nào?</h1>
            <p>
              Mô tả triệu chứng để AI phân tích và gợi ý chuyên khoa phù hợp.
              Kết quả chỉ mang tính tham khảo — không thay thế khám bác sĩ.
            </p>
            <div className="sc-hero-chips">
              <span>⚡ Phân tích tức thì</span>
              <span>🔒 Bảo mật tuyệt đối</span>
              <span>🆓 Miễn phí hoàn toàn</span>
            </div>
          </div>
        </div>
      </section>

      <div className="container sc-container">
        <div className="sc-layout">

          {/* ── LEFT: INPUT FORM ── */}
          <aside className="sc-form-panel">
            <div className="sc-form-card">
              <div className="sc-form-card-header">
                <h2>Mô tả triệu chứng</h2>
                <p>Càng chi tiết, kết quả càng chính xác</p>
              </div>

              <form onSubmit={submit}>
                {/* Main symptoms textarea */}
                <div className="sc-field">
                  <label className="sc-field-label" htmlFor="sc-symptoms">
                    Triệu chứng bạn đang gặp <span className="sc-required">*</span>
                  </label>
                  <textarea
                    id="sc-symptoms"
                    className="sc-textarea"
                    rows="5"
                    value={form.symptoms}
                    onChange={(event) => update('symptoms', event.target.value)}
                    placeholder="Ví dụ: Tôi bị đau họng, sốt nhẹ 2 ngày, ho khan và mệt mỏi. Đau đầu nhẹ vào buổi sáng..."
                  />
                  <div className="sc-char-count">{form.symptoms.length} ký tự</div>
                </div>

                {/* Info grid */}
                <div className="sc-info-grid">
                  <div className="sc-field">
                    <label className="sc-field-label" htmlFor="sc-age">Tuổi</label>
                    <input
                      id="sc-age"
                      className="sc-input"
                      min="0" max="120"
                      type="number"
                      value={form.age}
                      onChange={(event) => update('age', event.target.value)}
                      placeholder="Ví dụ: 28"
                    />
                  </div>
                  <div className="sc-field">
                    <label className="sc-field-label" htmlFor="sc-gender">Giới tính</label>
                    <select
                      id="sc-gender"
                      className="sc-select"
                      value={form.gender}
                      onChange={(event) => update('gender', event.target.value)}
                    >
                      <option value="">Không muốn cung cấp</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div className="sc-field">
                    <label className="sc-field-label" htmlFor="sc-duration">Thời gian bị</label>
                    <input
                      id="sc-duration"
                      className="sc-input"
                      value={form.duration}
                      onChange={(event) => update('duration', event.target.value)}
                      placeholder="Ví dụ: 2 ngày"
                    />
                  </div>
                </div>

                {/* Severity selector */}
                <div className="sc-field">
                  <span className="sc-field-label">Mức độ triệu chứng</span>
                  <div className="sc-severity-group">
                    {severityOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`sc-severity-btn ${form.severity === opt.value ? 'active' : ''}`}
                        onClick={() => update('severity', opt.value)}
                      >
                        <strong>{opt.label}</strong>
                        <span>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  className="sc-submit-btn"
                  type="submit"
                  disabled={loading || form.symptoms.trim().length < 8}
                >
                  {loading ? (
                    <>
                      <span className="sc-btn-spinner" />
                      Đang phân tích...
                    </>
                  ) : (
                    <>🔍 Phân tích triệu chứng</>
                  )}
                </button>
              </form>

              {/* Disclaimer */}
              <div className="sc-disclaimer-box">
                <strong>⚕️ Lưu ý y tế quan trọng</strong>
                <p>
                  Công cụ này không chẩn đoán bệnh, không kê thuốc và không thay thế
                  thăm khám trực tiếp với bác sĩ. Nếu có triệu chứng nặng, hãy đến
                  cơ sở y tế ngay.
                </p>
              </div>
            </div>
          </aside>

          {/* ── RIGHT: RESULT PANEL ── */}
          <section className="sc-result-panel" ref={resultRef}>
            {loading ? (
              <LoadingPulse />
            ) : !result ? (
              <div className="sc-empty-result">
                <div className="sc-empty-icon">🩺</div>
                <h2>Kết quả phân tích sẽ hiển thị tại đây</h2>
                <p>Mô tả triệu chứng càng cụ thể càng tốt: vị trí đau, thời gian xuất hiện, mức độ và triệu chứng đi kèm.</p>
                <div className="sc-tips-list">
                  <div className="sc-tip-item">💡 <span><strong>Gợi ý:</strong> Nêu rõ vị trí đau (ngực, bụng, đầu...)</span></div>
                  <div className="sc-tip-item">💡 <span><strong>Gợi ý:</strong> Mô tả triệu chứng đi kèm (sốt, mệt...)</span></div>
                  <div className="sc-tip-item">💡 <span><strong>Gợi ý:</strong> Cho biết triệu chứng kéo dài bao lâu</span></div>
                </div>
              </div>
            ) : (
              <div className="sc-result-content">
                {/* Header bar */}
                <div className="sc-result-topbar">
                  <span className="sc-result-eyebrow">Kết quả tham khảo AI</span>
                  <button
                    className="sc-reset-btn"
                    type="button"
                    onClick={() => { setResult(null); setForm(initialForm); }}
                  >
                    Phân tích lại
                  </button>
                </div>

                {result.isFallback && (
                  <div className="sc-fallback-notice">
                    <span>ℹ️</span>
                    <div>
                      <strong>Đang dùng gợi ý cơ bản</strong>
                      <p>Để nhận phân tích AI chính xác hơn, vui lòng thử lại sau ít phút.</p>
                    </div>
                  </div>
                )}

                {/* Urgency card */}
                <UrgencyCard urgency={urgency} />

                {/* Summary */}
                <div className="sc-result-card">
                  <div className="sc-result-card-title">
                    <span>📋</span> Tóm tắt phân tích
                  </div>
                  <p className="sc-result-card-body">{cleanDisplayText(result.summary)}</p>
                </div>

                {/* Specialties */}
                <div className="sc-result-card">
                  <div className="sc-result-card-title">
                    <span>🔬</span> Chuyên khoa gợi ý
                  </div>
                  <p className="sc-specialty-guidance">
                    AI chỉ hỗ trợ định hướng chuyên khoa. Gói khám/dịch vụ cụ thể sẽ được bác sĩ tư vấn khi thăm khám.
                  </p>
                  {(result.matchedSpecialties || []).length ? (
                    <div className="sc-specialty-cards">
                      {result.matchedSpecialties.map((item) => (
                        <div className="sc-specialty-card" key={item._id}>
                          <div className="sc-specialty-info">
                            <strong className="sc-specialty-name">{item.name}</strong>
                            <span className="sc-specialty-clinic">{item.clinicName || 'Cơ sở phù hợp'}</span>
                          </div>
                          <button
                            className="sc-book-btn"
                            type="button"
                            onClick={() => bookWithSpecialty(item)}
                          >
                            Đặt lịch với chuyên khoa này
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (result.suggestedSpecialties || []).length ? (
                    <div className="sc-specialty-tags">
                      {result.suggestedSpecialties.map((item) => (
                        <span className="sc-specialty-tag" key={item}>{item}</span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>Không có gợi ý chuyên khoa cụ thể.</p>
                  )}
                </div>

                {/* Warning signs */}
                {!!result.warningSigns?.length && (
                  <div className="sc-result-card sc-warning-card">
                    <div className="sc-result-card-title">
                      <span>⚠️</span> Dấu hiệu cần chú ý
                    </div>
                    <ul className="sc-warning-list">
                      {result.warningSigns.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Questions for doctor */}
                {(result.questionsForDoctor || []).length > 0 && (
                  <div className="sc-result-card">
                    <div className="sc-result-card-title">
                      <span>💬</span> Câu hỏi nên hỏi bác sĩ
                    </div>
                    <ul className="sc-question-list">
                      {result.questionsForDoctor.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Disclaimer */}
                {result.disclaimer && (
                  <div className="sc-result-disclaimer">
                    <span>📌</span>
                    <p>{cleanDisplayText(result.disclaimer)}</p>
                  </div>
                )}

                {/* Booking CTA */}
                <div className="sc-booking-cta">
                  <div>
                    <strong>Sẵn sàng đặt lịch khám?</strong>
                    <p>Đặt lịch với bác sĩ chuyên khoa ngay hôm nay</p>
                  </div>
                  <Link className="sc-booking-cta-btn" to="/booking">
                    Đặt lịch khám →
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
