import { useEffect, useMemo, useRef, useState } from 'react';
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
    icon: 'OK',
    color: 'var(--color-success)',
    bg: 'var(--color-success-light)'
  },
  medium: {
    label: 'Nên đặt lịch khám sớm',
    icon: '!',
    color: '#d97706',
    bg: '#fef3c7'
  },
  high: {
    label: 'Cần được đánh giá khẩn cấp',
    icon: '!!',
    color: 'var(--color-danger)',
    bg: 'var(--color-danger-light)'
  }
};

const severityOptions = [
  { value: 'low', label: 'Nhẹ', desc: 'Triệu chứng nhẹ, không ảnh hưởng sinh hoạt' },
  { value: 'medium', label: 'Trung bình', desc: 'Ảnh hưởng đến sinh hoạt hằng ngày' },
  { value: 'high', label: 'Nặng', desc: 'Triệu chứng nghiêm trọng, cần chú ý' }
];

const emptySuggestions = [
  'Nêu rõ vị trí đau, thời gian xuất hiện và mức độ',
  'Mô tả triệu chứng đi kèm như sốt, mệt, khó thở',
  'Cho biết triệu chứng đang tăng, giảm hay tái phát'
];

const ASSISTANT_BOOKING_CONTEXT_KEY = 'bookingcare:symptom-assistant-context';

function apiErrorMessage(error) {
  return cleanDisplayText(
    error?.message,
    'Không thể phân tích triệu chứng lúc này. Vui lòng thử lại sau.'
  );
}

function messageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function LoadingPulse() {
  return (
    <div className="sc-loading-state sc-assistant-loading">
      <div className="sc-loading-brain">AI</div>
      <div className="sc-loading-dots">
        <span /><span /><span />
      </div>
      <p>Trợ lý đang phân tích và sắp xếp gợi ý phù hợp...</p>
      <small>Thường mất 5-15 giây</small>
    </div>
  );
}

function UrgencyCard({ urgency, action }) {
  return (
    <div className="sc-urgency-card" style={{ '--urgency-color': urgency.color, '--urgency-bg': urgency.bg }}>
      <span className="sc-urgency-icon">{urgency.icon}</span>
      <div>
        <span className="sc-urgency-level">Mức độ cần khám</span>
        <strong className="sc-urgency-label">{urgency.label}</strong>
        {action ? <p className="sc-urgency-action">{cleanDisplayText(action)}</p> : null}
      </div>
    </div>
  );
}

function GuidanceList({ title, items }) {
  const visibleItems = Array.isArray(items)
    ? items.map((item) => cleanDisplayText(item)).filter(Boolean).slice(0, 4)
    : [];

  if (!visibleItems.length) return null;

  return (
    <div className="sc-result-card sc-guidance-card">
      <div className="sc-result-card-title">{cleanDisplayText(title)}</div>
      <ul className="sc-guidance-list">
        {visibleItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ChatBubble({ message }) {
  return (
    <div className={`sc-chat-row ${message.role === 'user' ? 'user' : 'assistant'}`}>
      <div className="sc-chat-avatar">{message.role === 'user' ? 'B' : 'AI'}</div>
      <div className="sc-chat-bubble">
        <p>{cleanDisplayText(message.content)}</p>
      </div>
    </div>
  );
}

function RecommendationCard({ item, onBook }) {
  const specialty = item.specialty;
  const confidence = Number.isFinite(Number(item.confidence)) ? Number(item.confidence) : 60;
  const canBook = Boolean(item.canBook && specialty?._id);

  return (
    <article className={`sc-recommendation-card priority-${item.priority || 'medium'} ${canBook ? '' : 'unavailable'}`}>
      <div className="sc-recommendation-head">
        <div>
          <strong>{cleanDisplayText(item.specialtyName || specialty?.name || 'Chuyên khoa phù hợp')}</strong>
          <span>{cleanDisplayText(specialty?.clinicName || 'Hệ thống sẽ gợi ý cơ sở phù hợp khi đặt lịch')}</span>
        </div>
        <div className="sc-confidence">
          <b>{Math.max(0, Math.min(100, Math.round(confidence)))}</b>
          <span>phù hợp</span>
        </div>
      </div>

      <p className="sc-recommendation-reason">{cleanDisplayText(item.reason)}</p>

      {!!item.matchingSymptoms?.length && (
        <div className="sc-match-tags">
          {item.matchingSymptoms.map((symptom) => (
            <span key={symptom}>{cleanDisplayText(symptom)}</span>
          ))}
        </div>
      )}

      <div className="sc-recommendation-actions">
        <small>{cleanDisplayText(item.bookingMessage || item.bookingHint)}</small>
        <button
          type="button"
          className="sc-book-btn"
          disabled={!canBook}
          onClick={() => onBook(item)}
        >
          {canBook ? 'Đặt lịch' : 'Chưa hỗ trợ'}
        </button>
      </div>
    </article>
  );
}

export default function SymptomCheckerPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(initialForm);
  const [messages, setMessages] = useState([]);
  const [assistantData, setAssistantData] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const resultRef = useRef(null);
  const chatEndRef = useRef(null);

  const urgency = useMemo(
    () => urgencyMeta[assistantData?.safety?.urgencyLevel] || urgencyMeta.medium,
    [assistantData]
  );

  useEffect(() => {
    if ((assistantData || loading) && resultRef.current) {
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  }, [assistantData, loading]);

  useEffect(() => {
    if (messages.length || loading) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, loading]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function bookWithSpecialty(item) {
    const specialty = item?.specialty;
    const params = new URLSearchParams();
    if (specialty?.clinicId) params.set('clinicId', specialty.clinicId);
    if (specialty?._id) params.set('specialtyId', specialty._id);
    params.set('source', 'symptom-assistant');

    try {
      window.sessionStorage.setItem(ASSISTANT_BOOKING_CONTEXT_KEY, JSON.stringify({
        source: 'symptom-assistant',
        specialtyId: specialty?._id || '',
        clinicId: specialty?.clinicId || '',
        specialtyName: item?.specialtyName || specialty?.name || '',
        clinicName: specialty?.clinicName || '',
        summary: assistantData?.summary || '',
        reason: item?.reason || '',
        symptoms: form.symptoms || assistantData?.updatedContext?.symptoms || '',
        urgencyLevel: assistantData?.safety?.urgencyLevel || ''
      }));
    } catch {
      // Booking still works from query params if session storage is unavailable.
    }

    navigate(`/booking${params.toString() ? `?${params.toString()}` : ''}`);
  }

  function buildRequestBody(nextMessages, latestMessage = '') {
    const context = assistantData?.updatedContext || {};
    return {
      symptoms: form.symptoms.trim() || context.symptoms || undefined,
      latestMessage: latestMessage || undefined,
      age: form.age || context.age || undefined,
      gender: form.gender || context.gender || undefined,
      duration: form.duration.trim() || context.duration || undefined,
      severity: form.severity || context.severity || undefined,
      messages: nextMessages.map((message) => ({
        role: message.role,
        content: message.content
      }))
    };
  }

  async function askAssistant(nextMessages, latestMessage = '') {
    setLoading(true);
    try {
      const payload = await api('/ai/symptom-assistant', {
        method: 'POST',
        body: JSON.stringify(buildRequestBody(nextMessages, latestMessage))
      });

      const data = payload.data || {};
      const assistantMessage = cleanDisplayText(
        data.assistantMessage,
        'Mình đã phân tích mô tả của bạn và gợi ý các chuyên khoa phù hợp.'
      );

      setAssistantData(data);
      setMessages([
        ...nextMessages,
        {
          id: messageId(),
          role: 'assistant',
          content: assistantMessage
        }
      ]);

      if (payload.isFallback || data.isFallback) {
        toast.info('Đang dùng gợi ý cơ bản. Kết quả vẫn có thể dùng để định hướng đặt lịch.');
      } else if (data.safety?.urgencyLevel === 'high') {
        toast.warning('Có dấu hiệu cần được đánh giá khẩn cấp. Hãy đến cơ sở y tế nếu triệu chứng nặng.');
      } else {
        toast.success('Trợ lý AI đã cập nhật gợi ý chuyên khoa.');
      }
    } catch (error) {
      toast.error(apiErrorMessage(error));
      setMessages(nextMessages);
    } finally {
      setLoading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (form.symptoms.trim().length < 8) {
      toast.warning('Vui lòng mô tả triệu chứng rõ hơn, ít nhất 8 ký tự.');
      return;
    }

    const firstMessage = {
      id: messageId(),
      role: 'user',
      content: form.symptoms.trim()
    };

    setAssistantData(null);
    setMessages([firstMessage]);
    await askAssistant([firstMessage], form.symptoms.trim());
  }

  async function sendFollowUp(event, preset = '') {
    event?.preventDefault();
    const content = (preset || chatInput).trim();
    if (!content || loading) return;

    const nextMessages = [
      ...messages,
      {
        id: messageId(),
        role: 'user',
        content
      }
    ];
    setChatInput('');
    setMessages(nextMessages);
    await askAssistant(nextMessages, content);
  }

  function resetAssistant() {
    setForm(initialForm);
    setMessages([]);
    setAssistantData(null);
    setChatInput('');
  }

  return (
    <main className="sc-page">
      <section className="sc-hero">
        <div className="container">
          <div className="sc-hero-inner">
            <div className="sc-hero-badge">
              <span>AI</span> Trợ lý triệu chứng
            </div>
            <h1>Chưa biết nên khám khoa nào?</h1>
            <p>
              Mô tả triệu chứng để trợ lý AI hỏi tiếp, tóm tắt thông tin và gợi ý
              chuyên khoa phù hợp. Kết quả chỉ mang tính tham khảo.
            </p>
            <div className="sc-hero-chips">
              <span>Phân tích nhiều lượt</span>
              <span>Hỏi tiếp thông minh</span>
              <span>Gợi ý đặt lịch</span>
            </div>
          </div>
        </div>
      </section>

      <div className="container sc-container">
        <div className="sc-layout">
          <aside className="sc-form-panel">
            <div className="sc-form-card">
              <div className="sc-form-card-header">
                <h2>Thông tin ban đầu</h2>
                <p>Càng rõ bối cảnh, trợ lý gợi ý càng sát hơn</p>
              </div>

              <form onSubmit={submit}>
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
                    placeholder="Ví dụ: Tôi bị đau họng, sốt nhẹ 2 ngày, ho khan và mệt mỏi..."
                  />
                  <div className="sc-char-count">{form.symptoms.length} ký tự</div>
                </div>

                <div className="sc-info-grid">
                  <div className="sc-field">
                    <label className="sc-field-label" htmlFor="sc-age">Tuổi</label>
                    <input
                      id="sc-age"
                      className="sc-input"
                      min="0"
                      max="120"
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
                  {loading && !messages.length ? (
                    <>
                      <span className="sc-btn-spinner" />
                      Đang khởi tạo...
                    </>
                  ) : (
                    <>Bắt đầu tư vấn AI</>
                  )}
                </button>
              </form>

              <div className="sc-disclaimer-box">
                <strong>Lưu ý y tế quan trọng</strong>
                <p>
                  Trợ lý này không chẩn đoán bệnh, không kê thuốc và không thay thế
                  thăm khám trực tiếp. Nếu có triệu chứng nặng, hãy đến cơ sở y tế ngay.
                </p>
              </div>
            </div>
          </aside>

          <section className="sc-result-panel" ref={resultRef}>
            <div className="sc-assistant-shell">
              <div className="sc-assistant-header">
                <div>
                  <span className="sc-result-eyebrow">Trợ lý định hướng chuyên khoa</span>
                  <h2>Phòng tư vấn AI</h2>
                </div>
                <button className="sc-reset-btn" type="button" onClick={resetAssistant}>
                  Làm mới
                </button>
              </div>

              {!messages.length && !loading ? (
                <div className="sc-empty-result sc-assistant-empty">
                  <div className="sc-empty-icon">AI</div>
                  <h2>Bắt đầu bằng mô tả triệu chứng của bạn</h2>
                  <p>
                    Trợ lý sẽ hỏi tiếp khi thiếu thông tin, sau đó gợi ý nhiều
                    chuyên khoa kèm lý do và mức độ ưu tiên.
                  </p>
                  <div className="sc-tips-list">
                    {emptySuggestions.map((item) => (
                      <div className="sc-tip-item" key={item}>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="sc-assistant-grid">
                  <div className="sc-chat-card">
                    <div className="sc-chat-transcript" aria-live="polite">
                      {messages.map((message) => (
                        <ChatBubble key={message.id} message={message} />
                      ))}
                      {loading ? <LoadingPulse /> : null}
                      <div className="sc-chat-end" ref={chatEndRef} />
                    </div>

                    {!!assistantData?.followUpQuestions?.length && (
                      <div className="sc-followup-block">
                        <span className="sc-mini-label">Trợ lý cần làm rõ thêm</span>
                        {assistantData.followUpQuestions.map((item) => (
                          <div className="sc-followup-question" key={item.id || item.question}>
                            <strong>{cleanDisplayText(item.question)}</strong>
                            {!!item.choices?.length && (
                              <div className="sc-followup-choices">
                                {item.choices.map((choice) => (
                                  <button
                                    key={choice}
                                    type="button"
                                    onClick={(event) => sendFollowUp(event, choice)}
                                    disabled={loading}
                                  >
                                    {cleanDisplayText(choice)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {!!assistantData?.quickReplies?.length && (
                      <div className="sc-quick-replies">
                        {assistantData.quickReplies.map((reply) => (
                          <button
                            type="button"
                            key={reply}
                            onClick={(event) => sendFollowUp(event, reply)}
                            disabled={loading}
                          >
                            {cleanDisplayText(reply)}
                          </button>
                        ))}
                      </div>
                    )}

                    <form className="sc-chat-input-row" onSubmit={sendFollowUp}>
                      <input
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        placeholder="Trả lời tiếp hoặc bổ sung triệu chứng..."
                        disabled={loading || !messages.length}
                      />
                      <button type="submit" disabled={loading || !chatInput.trim()}>
                        Gửi
                      </button>
                    </form>
                  </div>

                  <aside className="sc-insight-card">
                    {assistantData ? (
                      <>
                        {assistantData.isFallback && (
                          <div className="sc-fallback-notice">
                            <span>i</span>
                            <div>
                              <strong>Đang dùng gợi ý cơ bản</strong>
                              <p>Hệ thống vẫn trả về dữ liệu tham khảo để bạn đặt lịch phù hợp.</p>
                            </div>
                          </div>
                        )}

                        <UrgencyCard
                          urgency={urgency}
                          action={assistantData.safety?.recommendedAction}
                        />

                        <div className="sc-result-card">
                          <div className="sc-result-card-title">Tóm tắt</div>
                          <p className="sc-result-card-body">{cleanDisplayText(assistantData.summary)}</p>
                        </div>

                        <GuidanceList
                          title="Có thể liên quan"
                          items={assistantData.possibleCauses}
                        />

                        <GuidanceList
                          title="Nên làm tiếp theo"
                          items={[...(assistantData.nextSteps || []), ...(assistantData.careGuidance || [])]}
                        />

                        <div className="sc-result-card">
                          <div className="sc-result-card-title">Chuyên khoa gợi ý</div>
                          <div className="sc-recommendation-list">
                            {(assistantData.recommendations || []).map((item, index) => (
                              <RecommendationCard
                                key={`${item.specialtyName}-${index}`}
                                item={item}
                                onBook={bookWithSpecialty}
                              />
                            ))}
                          </div>
                        </div>

                        {!!assistantData.safety?.warningSigns?.length && (
                          <div className="sc-result-card sc-warning-card">
                            <div className="sc-result-card-title">Dấu hiệu cần chú ý</div>
                            <ul className="sc-warning-list">
                              {assistantData.safety.warningSigns.map((item) => (
                                <li key={item}>{cleanDisplayText(item)}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="sc-result-disclaimer">
                          <span>!</span>
                          <p>{cleanDisplayText(assistantData.disclaimer)}</p>
                        </div>

                        <div className="sc-booking-cta">
                          <div>
                            <strong>Sẵn sàng đặt lịch?</strong>
                            <p>Chọn chuyên khoa phù hợp hoặc đặt lịch trực tiếp.</p>
                          </div>
                          <Link className="sc-booking-cta-btn" to="/booking">
                            Đặt lịch khám
                          </Link>
                        </div>
                      </>
                    ) : (
                      <div className="sc-insight-placeholder">
                        <span>AI</span>
                        <strong>Bảng gợi ý sẽ hiển thị tại đây</strong>
                        <p>Sau khi phân tích, bạn sẽ thấy mức độ cần khám, chuyên khoa phù hợp và câu hỏi tiếp theo.</p>
                      </div>
                    )}
                  </aside>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
