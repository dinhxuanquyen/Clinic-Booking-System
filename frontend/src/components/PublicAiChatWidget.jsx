import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api/client.js';
import { FaCommentMedical, FaPaperPlane, FaPlusCircle, FaStethoscope } from './icons/FaIcons.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { cleanDisplayText } from '../utils/textEncoding.js';

const STORAGE_KEY = 'bookingcare:public-ai-widget-messages';
const MAX_STORED_MESSAGES = 18;
const MAX_REQUEST_MESSAGES = 8;
const MAX_MESSAGE_LENGTH = 900;

const starterPrompts = [
  'Tôi bị ho kéo dài',
  'Tôi đau đầu và chóng mặt',
  'Tôi chưa biết nên khám chuyên khoa nào'
];

function messageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createMessage(role, content, extra = {}) {
  return {
    id: messageId(),
    role,
    content: cleanDisplayText(content).trim(),
    createdAt: Date.now(),
    ...extra
  };
}

function loadMessages() {
  if (typeof window === 'undefined') return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed
          .filter((message) => ['user', 'assistant'].includes(message.role) && message.content)
          .slice(-MAX_STORED_MESSAGES)
      : [];
  } catch {
    return [];
  }
}

function saveMessages(messages) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
  } catch {
    // The widget still works if browser storage is unavailable.
  }
}

function requestText(value, maxLength = MAX_MESSAGE_LENGTH) {
  const text = cleanDisplayText(value).trim();
  return text ? text.slice(0, maxLength) : undefined;
}

function buildRequestBody(messages, latestMessage) {
  const latest = requestText(latestMessage);
  const firstUserMessage = messages.find((message) => message.role === 'user')?.content;

  return {
    symptoms: requestText(firstUserMessage || latest, 1600),
    latestMessage: latest,
    messages: messages
      .slice(-MAX_REQUEST_MESSAGES)
      .map((message) => ({
        role: message.role,
        content: requestText(message.content)
      }))
      .filter((message) => message.content)
  };
}

function WidgetLogo() {
  return (
    <span className="ai-widget-logo-mark" aria-hidden="true">
      <img src="/ai-assistant-logo.webp" alt="" />
    </span>
  );
}

function MessageBubble({ message }) {
  const time = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <article className={`ai-widget-message ${message.role}`}>
      {message.role === 'assistant' ? (
        <span className="ai-widget-message-avatar">
          <FaCommentMedical size={13} />
        </span>
      ) : null}
      <div>
        <div className="ai-widget-bubble">
          <p>{cleanDisplayText(message.content)}</p>
        </div>
        <time>{time}</time>
      </div>
    </article>
  );
}

export default function PublicAiChatWidget() {
  const location = useLocation();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState(() => loadMessages());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [assistantData, setAssistantData] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const requestInFlightRef = useRef(false);

  const hiddenOnRoute = location.pathname === '/symptom-checker';
  const followUpChips = useMemo(() => {
    const questions = Array.isArray(assistantData?.followUpQuestions)
      ? assistantData.followUpQuestions.flatMap((item) => item.choices || [])
      : [];
    const quickReplies = Array.isArray(assistantData?.quickReplies) ? assistantData.quickReplies : [];
    return [...questions, ...quickReplies].map((item) => cleanDisplayText(item)).filter(Boolean).slice(0, 6);
  }, [assistantData]);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [open, messages, loading, followUpChips]);

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        setExpanded(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (hiddenOnRoute) return null;

  function resetConversation() {
    setMessages([]);
    setAssistantData(null);
    setInput('');
  }

  async function sendMessage(content) {
    const normalized = requestText(content);
    if (!normalized || loading || requestInFlightRef.current) return;

    const nextMessages = [...messages, createMessage('user', normalized)];
    setInput('');
    setMessages(nextMessages);
    setLoading(true);
    requestInFlightRef.current = true;

    try {
      const payload = await api('/ai/symptom-assistant', {
        method: 'POST',
        body: JSON.stringify(buildRequestBody(nextMessages, normalized))
      });
      const data = payload.data || {};
      const assistantMessage = cleanDisplayText(
        data.assistantMessage,
        'Mình đã ghi nhận thông tin và sẽ giúp bạn định hướng bước tiếp theo.'
      );

      setAssistantData(data);
      setMessages([
        ...nextMessages,
        createMessage('assistant', assistantMessage, { analysis: data })
      ]);

      if (payload.isFallback || data.isFallback) {
        toast.info('Trợ lý đang dùng gợi ý cơ bản để hỗ trợ nhanh.');
      }
    } catch (error) {
      toast.error(cleanDisplayText(error?.message, 'Trợ lý AI chưa thể phản hồi lúc này.'));
      setMessages(nextMessages);
    } finally {
      requestInFlightRef.current = false;
      setLoading(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    sendMessage(input);
  }

  function handleInputKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <section className={`ai-widget ${open ? 'open' : ''} ${expanded ? 'expanded' : ''}`} aria-label="Trợ lý AI BookingCare Mini">
      {open ? (
        <div className="ai-widget-panel">
          <header className="ai-widget-header">
            <button
              type="button"
              className="ai-widget-icon-button"
              onClick={() => setExpanded((current) => !current)}
              aria-label={expanded ? 'Thu gọn trợ lý AI' : 'Mở rộng trợ lý AI'}
            >
              {expanded ? '−' : '↗'}
            </button>
            <WidgetLogo />
            <div>
              <span>Trò chuyện cùng</span>
              <strong>BookingCare Mini AI</strong>
            </div>
            <button
              type="button"
              className="ai-widget-icon-button"
              onClick={() => {
                setOpen(false);
                setExpanded(false);
              }}
              aria-label="Đóng trợ lý AI"
            >
              ×
            </button>
          </header>

          <div className="ai-widget-body" ref={listRef}>
            {!messages.length ? (
              <div className="ai-widget-welcome">
                <span className="ai-widget-welcome-icon"><FaStethoscope size={22} /></span>
                <h2>Xin chào, tôi có thể hỗ trợ bạn nhanh trước khi đặt lịch.</h2>
                <p>
                  Bạn có thể hỏi về triệu chứng, chuyên khoa phù hợp, hoặc bước tiếp theo khi cần khám.
                </p>
                <div className="ai-widget-starters">
                  {starterPrompts.map((prompt) => (
                    <button type="button" key={prompt} onClick={() => sendMessage(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => <MessageBubble key={message.id} message={message} />)
            )}

            {loading ? (
              <article className="ai-widget-message assistant">
                <span className="ai-widget-message-avatar">
                  <FaCommentMedical size={13} />
                </span>
                <div className="ai-widget-bubble ai-widget-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </article>
            ) : null}

            {!!followUpChips.length && !loading ? (
              <div className="ai-widget-followups">
                {followUpChips.map((chip, index) => (
                  <button type="button" key={`${chip}-${index}`} onClick={() => sendMessage(chip)}>
                    {chip}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="ai-widget-links">
            <Link to="/symptom-checker">Tư vấn đầy đủ</Link>
            <Link to="/booking">Đặt lịch khám</Link>
            <button type="button" onClick={resetConversation} disabled={loading || !messages.length}>
              Làm mới
            </button>
          </div>

          <form className="ai-widget-composer" onSubmit={submit}>
            <textarea
              ref={inputRef}
              rows="1"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Nhập tin nhắn của bạn..."
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Gửi tin nhắn">
              <FaPaperPlane size={16} />
            </button>
          </form>
          <p className="ai-widget-disclaimer">
            Thông tin chỉ mang tính tham khảo, không thay thế chẩn đoán hoặc thăm khám trực tiếp.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        className="ai-widget-launcher"
        onClick={() => setOpen((current) => !current)}
        aria-label="Mở trợ lý AI BookingCare Mini"
      >
        <WidgetLogo />
        <span className="ai-widget-launcher-copy">
          <strong>AI</strong>
          <small>Hỏi nhanh</small>
        </span>
        <span className="ai-widget-alert" aria-hidden="true" />
        <FaPlusCircle className="ai-widget-launcher-icon" size={18} />
      </button>
    </section>
  );
}
