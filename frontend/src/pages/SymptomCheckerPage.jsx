import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { FaCommentMedical, FaPaperPlane, FaPlusCircle, FaStethoscope } from '../components/icons/FaIcons.jsx';
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
  { value: 'low', label: 'Nhẹ', desc: 'Không ảnh hưởng nhiều sinh hoạt' },
  { value: 'medium', label: 'Trung bình', desc: 'Có ảnh hưởng sinh hoạt hằng ngày' },
  { value: 'high', label: 'Nặng', desc: 'Triệu chứng nghiêm trọng, cần chú ý' }
];

const welcomePrompts = [
  'Tôi bị sốt và đau đầu',
  'Tôi ho kéo dài nhiều ngày',
  'Tôi thường xuyên đau tức ngực',
  'Tôi chưa biết nên khám chuyên khoa nào'
];

const ASSISTANT_BOOKING_CONTEXT_KEY = 'bookingcare:symptom-assistant-context';
const ASSISTANT_CONVERSATIONS_KEY = 'bookingcare:symptom-assistant-conversations';
const MAX_SAVED_CONVERSATIONS = 12;

function apiErrorMessage(error) {
  return cleanDisplayText(
    error?.message,
    'Không thể phân tích triệu chứng lúc này. Vui lòng thử lại sau.'
  );
}

function messageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function entityId(value) {
  if (!value) return '';
  return typeof value === 'object' ? value._id || '' : String(value);
}

function buildSpecialtyName(item) {
  return cleanDisplayText(item?.specialtyName || item?.specialty?.name || '');
}

function buildSpecialtyDetailPath(item) {
  const specialtyId = entityId(item?.specialty?._id || item?.specialty);
  return specialtyId ? `/specialties/${specialtyId}` : '/specialties';
}

function buildDoctorsPath(item) {
  const params = new URLSearchParams();
  const specialtyName = buildSpecialtyName(item);
  if (specialtyName) params.set('specialty', specialtyName);
  params.set('source', 'symptom-assistant');
  return `/doctors${params.toString() ? `?${params.toString()}` : ''}`;
}

function loadSavedConversations() {
  try {
    const raw = window.localStorage.getItem(ASSISTANT_CONVERSATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item) => Array.isArray(item.messages)).slice(0, MAX_SAVED_CONVERSATIONS)
      : [];
  } catch {
    return [];
  }
}

function saveConversations(items) {
  try {
    window.localStorage.setItem(ASSISTANT_CONVERSATIONS_KEY, JSON.stringify(items.slice(0, MAX_SAVED_CONVERSATIONS)));
  } catch {
    // The assistant still works if browser storage is unavailable.
  }
}

function buildConversationTitle(messages, form) {
  const source = messages.find((message) => message.role === 'user')?.content || form.symptoms;
  return cleanDisplayText(source, 'Cuá»™c trÃ² chuyá»‡n má»›i').slice(0, 42);
}

function createUserMessage(content) {
  return {
    id: messageId(),
    role: 'user',
    content,
    createdAt: Date.now()
  };
}

function LoadingPulse() {
  return (
    <div className="sc-message assistant">
      <div className="sc-message-avatar"><FaCommentMedical size={15} /></div>
      <div className="sc-message-body">
        <div className="sc-message-bubble sc-typing-bubble">
          <span>Đang phân tích triệu chứng</span>
          <div className="sc-loading-dots">
            <i /><i /><i />
          </div>
        </div>
      </div>
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
    <section className="sc-answer-section">
      <h3>{cleanDisplayText(title)}</h3>
      <ul>
        {visibleItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  const sentAt = message.createdAt ? new Date(message.createdAt) : new Date();

  return (
    <div className={`sc-message ${isUser ? 'user' : 'assistant'}`}>
      {!isUser ? <div className="sc-message-avatar"><FaCommentMedical size={15} /></div> : null}
      <div className="sc-message-body">
        <div className="sc-message-bubble">
          <p>{cleanDisplayText(message.content)}</p>
        </div>
        <time>{sentAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</time>
      </div>
    </div>
  );
}

function RecommendationCard({ item, onFindDoctors }) {
  const specialty = item.specialty;
  const confidence = Number.isFinite(Number(item.confidence)) ? Number(item.confidence) : 60;
  const canFindDoctors = Boolean(buildSpecialtyName(item) || entityId(specialty));

  return (
    <article className={`sc-specialty-chip-card priority-${item.priority || 'medium'} ${canFindDoctors ? '' : 'unavailable'}`}>
      <div>
        <strong>{cleanDisplayText(item.specialtyName || specialty?.name || 'Chuyên khoa phù hợp')}</strong>
        <span>{Math.max(0, Math.min(100, Math.round(confidence)))}% phù hợp</span>
      </div>
      <p>{cleanDisplayText(item.reason || item.bookingMessage || item.bookingHint)}</p>
      {!!item.matchingSymptoms?.length && (
        <div className="sc-match-tags">
          {item.matchingSymptoms.slice(0, 3).map((symptom) => (
            <span key={symptom}>{cleanDisplayText(symptom)}</span>
          ))}
        </div>
      )}
      <button
        type="button"
        disabled={!canFindDoctors}
        onClick={() => onFindDoctors(item)}
      >
        {canFindDoctors ? 'Tìm bác sĩ phù hợp' : 'Chưa hỗ trợ'}
      </button>
    </article>
  );
}

function AssistantAnswerPanel({ data, urgency, onFindDoctors }) {
  if (!data) return null;
  const primaryRecommendation = data.recommendations?.[0];
  const specialtyPath = primaryRecommendation ? buildSpecialtyDetailPath(primaryRecommendation) : '/specialties';

  return (
    <div className="sc-answer-panel">
      {data.isFallback ? (
        <div className="sc-fallback-notice">
          <span>i</span>
          <div>
            <strong>Đang dùng gợi ý cơ bản</strong>
            <p>Hệ thống vẫn trả về dữ liệu tham khảo để bạn đặt lịch phù hợp.</p>
          </div>
        </div>
      ) : null}

      <UrgencyCard urgency={urgency} action={data.safety?.recommendedAction} />

      {data.summary ? (
        <section className="sc-answer-section">
          <h3>Nhận định ban đầu</h3>
          <p>{cleanDisplayText(data.summary)}</p>
        </section>
      ) : null}

      <section className="sc-answer-section sc-specialty-answer">
        <div className="sc-answer-section-head">
          <h3>Chuyên khoa gợi ý</h3>
          <Link to={specialtyPath}>Xem chuyên khoa</Link>
        </div>
        <div className="sc-specialty-answer-grid">
          {(data.recommendations || []).map((item, index) => (
            <RecommendationCard
              key={`${item.specialtyName || item.specialty?.name || 'specialty'}-${index}`}
              item={item}
              onFindDoctors={onFindDoctors}
            />
          ))}
        </div>
      </section>

      <div className="sc-answer-two-col">
        <GuidanceList title="Dấu hiệu cần theo dõi" items={data.possibleCauses} />
        <GuidanceList title="Khuyến nghị tiếp theo" items={[...(data.nextSteps || []), ...(data.careGuidance || [])]} />
      </div>

      {!!data.safety?.warningSigns?.length && (
        <section className="sc-answer-section warning">
          <h3>Dấu hiệu cần chú ý</h3>
          <ul>
            {data.safety.warningSigns.map((item) => (
              <li key={item}>{cleanDisplayText(item)}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="sc-answer-disclaimer">{cleanDisplayText(data.disclaimer)}</p>
    </div>
  );
}

export default function SymptomCheckerPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [conversationId, setConversationId] = useState(() => messageId());
  const [conversations, setConversations] = useState(() => loadSavedConversations());
  const [form, setForm] = useState(initialForm);
  const [messages, setMessages] = useState([]);
  const [assistantData, setAssistantData] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const chatEndRef = useRef(null);

  const urgency = useMemo(
    () => urgencyMeta[assistantData?.safety?.urgencyLevel] || urgencyMeta.medium,
    [assistantData]
  );

  const conversationTitle = useMemo(() => {
    return buildConversationTitle(messages, form);
  }, [form.symptoms, messages]);

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    if (!messages.length) return;

    const snapshot = {
      id: conversationId,
      title: conversationTitle,
      form,
      messages,
      assistantData,
      updatedAt: Date.now()
    };

    setConversations((current) => [
      snapshot,
      ...current.filter((item) => item.id !== conversationId)
    ].slice(0, MAX_SAVED_CONVERSATIONS));
  }, [assistantData, conversationId, conversationTitle, form, messages]);

  useEffect(() => {
    if (messages.length || loading) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, loading, assistantData]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function findDoctorsForSpecialty(item) {
    const specialty = item?.specialty;

    try {
      window.sessionStorage.setItem(ASSISTANT_BOOKING_CONTEXT_KEY, JSON.stringify({
        source: 'symptom-assistant',
        specialtyId: entityId(specialty),
        clinicId: entityId(specialty?.clinicId),
        specialtyName: buildSpecialtyName(item),
        clinicName: specialty?.clinicName || '',
        summary: assistantData?.summary || '',
        reason: item?.reason || '',
        symptoms: assistantData?.updatedContext?.symptoms || form.symptoms || '',
        urgencyLevel: assistantData?.safety?.urgencyLevel || ''
      }));
    } catch {
      // Navigation still works if session storage is unavailable.
    }

    navigate(buildDoctorsPath(item));
  }

  function buildRequestBody(nextMessages, latestMessage = '') {
    const context = assistantData?.updatedContext || {};
    return {
      symptoms: context.symptoms || form.symptoms.trim() || latestMessage || undefined,
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
          content: assistantMessage,
          createdAt: Date.now()
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

  async function sendMessage(content) {
    const normalizedContent = cleanDisplayText(content).trim();
    if (!normalizedContent || loading) return;

    const nextMessages = [
      ...messages,
      createUserMessage(normalizedContent)
    ];

    if (!messages.length) {
      setForm((current) => ({ ...current, symptoms: normalizedContent }));
      setAssistantData(null);
    }

    setChatInput('');
    setMessages(nextMessages);
    await askAssistant(nextMessages, normalizedContent);
  }

  async function submit(event) {
    event.preventDefault();
    const content = messages.length ? chatInput : form.symptoms;

    if (content.trim().length < 8) {
      toast.warning('Vui lòng mô tả triệu chứng rõ hơn, ít nhất 8 ký tự.');
      return;
    }

    await sendMessage(content);
  }

  async function sendFollowUp(event, preset = '') {
    event?.preventDefault();
    const content = (preset || chatInput).trim();
    if (!content || loading) return;
    await sendMessage(content);
  }

  function startNewConversation() {
    setConversationId(messageId());
    setForm(initialForm);
    setMessages([]);
    setAssistantData(null);
    setChatInput('');
    setDetailsOpen(false);
  }

  function clearConversations() {
    setConversations([]);
    startNewConversation();
  }

  function openConversation(item) {
    if (!item || loading) return;
    setConversationId(item.id || messageId());
    setForm({ ...initialForm, ...(item.form || {}) });
    setMessages(Array.isArray(item.messages) ? item.messages : []);
    setAssistantData(item.assistantData || null);
    setChatInput('');
    setDetailsOpen(false);
  }

  return (
    <main className="sc-modern-page">
      <section className="sc-modern-hero">
        <div className="sc-modern-hero-banner">
          <img src="/symptom-checker-banner.webp" alt="Trợ lý AI tư vấn triệu chứng BookingCare Mini" />
        </div>

        <div className="sc-modern-intro-card">
          <div className="sc-modern-hero-copy">
            <span className="sc-modern-eyebrow">Tư vấn triệu chứng</span>
            <h1>Tra cứu triệu chứng và tìm chuyên khoa phù hợp</h1>
            <p>
              Mô tả tình trạng bạn đang gặp, trợ lý sẽ giúp định hướng chuyên khoa và cơ sở
              phù hợp để bạn đặt lịch khám.
            </p>
            <div className="sc-modern-badge">
              AI hỗ trợ định hướng • Không thay thế chẩn đoán của bác sĩ
            </div>
          </div>
          <div className="sc-modern-intro-stat">
            <strong><FaStethoscope size={22} /></strong>
            <div>
              <span>hỗ trợ định hướng</span>
              <p>Gợi ý chuyên khoa và bước đặt lịch phù hợp.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sc-modern-layout" aria-label="Trợ lý tư vấn triệu chứng">
        <aside className="sc-modern-sidebar" aria-label="Cuộc trò chuyện">
          <div className="sc-sidebar-title">
            <strong>Cuộc trò chuyện</strong>
            <button type="button" onClick={clearConversations}>Xóa tất cả</button>
          </div>

          <button className="sc-new-chat-btn" type="button" onClick={startNewConversation} disabled={loading}>
            <span><FaPlusCircle size={13} /></span>
            Cuộc trò chuyện mới
          </button>

          <div className="sc-recent-block">
            <span>Gần đây</span>
            <div className="sc-history-list">
              {conversations.length ? conversations.map((item) => (
                <button
                  className={item.id === conversationId ? 'active' : ''}
                  key={item.id}
                  type="button"
                  onClick={() => openConversation(item)}
                  disabled={loading}
                >
                  <span>{cleanDisplayText(item.title, 'Cuộc trò chuyện')}</span>
                  <time>
                    {item.updatedAt
                      ? new Date(item.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </time>
                </button>
              )) : (
                <p className="sc-history-empty">Chưa có cuộc trò chuyện nào.</p>
              )}
            </div>
          </div>

          <p className="sc-sidebar-note">
            Lịch sử được lưu trên trình duyệt này và có thể mở lại khi bạn quay lại trang tư vấn.
          </p>
        </aside>

        <section className="sc-modern-chat-card">
          <header className="sc-modern-chat-header">
            <div className="sc-chat-title-group">
              <span className="sc-chat-ai-icon"><FaCommentMedical size={18} /></span>
              <div>
                <h2>Trợ lý sức khỏe</h2>
                <p>Định hướng triệu chứng và chuyên khoa</p>
              </div>
            </div>
            <span className="sc-chat-status">Đang hoạt động</span>
          </header>

          <div className="sc-modern-message-list">
            {!messages.length && !loading ? (
              <div className="sc-modern-welcome">
                <span className="sc-chat-ai-icon large"><FaStethoscope size={24} /></span>
                <h2>Xin chào, tôi là Trợ lý sức khỏe BookingCare Mini</h2>
                <p>
                  Tôi có thể giúp bạn phân tích triệu chứng ban đầu và gợi ý chuyên khoa phù hợp.
                </p>
                <div className="sc-modern-suggestions">
                  {welcomePrompts.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => sendMessage(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="sc-modern-message-stack">
                {messages.map((message) => (
                  <ChatBubble key={message.id} message={message} />
                ))}
                {loading ? <LoadingPulse /> : null}
                {!loading ? (
                  <AssistantAnswerPanel data={assistantData} urgency={urgency} onFindDoctors={findDoctorsForSpecialty} />
                ) : null}
              </div>
            )}

            {!!assistantData?.followUpQuestions?.length && !loading ? (
              <div className="sc-followup-dock">
                <strong>Trợ lý muốn làm rõ thêm</strong>
                {assistantData.followUpQuestions.map((item) => (
                  <div className="sc-followup-line" key={item.id || item.question}>
                    <p>{cleanDisplayText(item.question)}</p>
                    {!!item.choices?.length && (
                      <div>
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
            ) : null}

            {!!assistantData?.quickReplies?.length && !loading ? (
              <div className="sc-quick-replies">
                {assistantData.quickReplies.map((reply) => (
                  <button
                    type="button"
                    key={reply}
                    onClick={(event) => sendFollowUp(event, reply)}
                  >
                    {cleanDisplayText(reply)}
                  </button>
                ))}
              </div>
            ) : null}

            <div ref={chatEndRef} />
          </div>

          <form className="sc-modern-composer" onSubmit={submit}>
            <div className={`sc-context-fields ${detailsOpen ? 'open' : ''}`}>
              <input
                min="0"
                max="120"
                type="number"
                value={form.age}
                onChange={(event) => update('age', event.target.value)}
                placeholder="Tuổi"
              />
              <select value={form.gender} onChange={(event) => update('gender', event.target.value)}>
                <option value="">Giới tính</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
              <input
                value={form.duration}
                onChange={(event) => update('duration', event.target.value)}
                placeholder="Thời gian bị"
              />
              <select value={form.severity} onChange={(event) => update('severity', event.target.value)}>
                {severityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="sc-modern-composer-main">
              <button
                className="sc-context-toggle"
                type="button"
                onClick={() => setDetailsOpen((current) => !current)}
                aria-label="Bổ sung thông tin nền"
              >
                <FaPlusCircle size={16} />
              </button>
              <textarea
                rows="1"
                value={messages.length ? chatInput : form.symptoms}
                onChange={(event) => {
                  if (messages.length) {
                    setChatInput(event.target.value);
                  } else {
                    update('symptoms', event.target.value);
                  }
                }}
                placeholder="Mô tả triệu chứng của bạn..."
                disabled={loading}
              />
              <button className="sc-send-btn" type="submit" disabled={loading || !(messages.length ? chatInput : form.symptoms).trim()}>
                <FaPaperPlane size={14} />
                <span>Gửi</span>
              </button>
            </div>
            <p>Thông tin chỉ mang tính tham khảo, không thay thế chẩn đoán hoặc thăm khám trực tiếp.</p>
          </form>
        </section>
      </section>
    </main>
  );
}
