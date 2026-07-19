import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import PageSkeleton from '../components/PageSkeleton.jsx';
import { cleanDisplayText } from '../utils/textEncoding.js';

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(value));
}

function getArticleAuthorName(article) {
  const name = cleanDisplayText(article?.authorId?.name, '').trim();
  if (!name) return 'Đội ngũ Clinic Booking';

  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalized.includes('quan tri he thong') || normalized.includes('admin')) {
    return 'Đội ngũ Clinic Booking';
  }

  return name;
}

function parseArticleContent(content) {
  const blocks = [];
  const lines = String(content || '').split(/\r?\n/);
  let paragraph = [];
  let list = [];

  const flushParagraph = () => {
    const text = paragraph.join(' ').trim();
    if (text) blocks.push({ type: 'paragraph', text });
    paragraph = [];
  };

  const flushList = () => {
    if (list.length) blocks.push({ type: 'list', items: list });
    list = [];
  };

  for (const rawLine of lines) {
    const line = cleanDisplayText(rawLine).trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line === '---') {
      flushParagraph();
      flushList();
      blocks.push({ type: 'divider' });
      continue;
    }

    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', text: line.replace(/^##\s+/, '') });
      continue;
    }

    if (line.startsWith('- ')) {
      flushParagraph();
      list.push(line.replace(/^-\s+/, ''));
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function ArticleBody({ content }) {
  const blocks = useMemo(() => parseArticleContent(content), [content]);

  return (
    <div className="article-detail-content">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === 'heading') return <h2 key={key}>{block.text}</h2>;
        if (block.type === 'list') {
          return (
            <ul key={key}>
              {block.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          );
        }
        if (block.type === 'divider') return <hr key={key} />;

        const isDisclaimer = block.text.includes('chỉ mang tính tham khảo') || block.text.includes('không thay thế');
        return (
          <p key={key} className={isDisclaimer ? 'article-disclaimer' : undefined}>
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

function ArticleMiniCard({ article }) {
  return (
    <Link className="article-related-card" to={`/articles/${article.slug}`}>
      <span className="article-category-badge">{cleanDisplayText(article.category, 'Sức khỏe')}</span>
      <h3>{cleanDisplayText(article.title, 'Bài viết y tế')}</h3>
      <p>{cleanDisplayText(article.summary, 'Thông tin tham khảo từ đội ngũ chuyên môn.')}</p>
      <small>{formatDate(article.publishedAt || article.createdAt)}</small>
    </Link>
  );
}

export default function ArticleDetailPage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api(`/articles/${slug}`)
      .then((payload) => {
        if (!active) return;
        setArticle(payload.data?.article || null);
        setRelatedArticles(payload.data?.relatedArticles || []);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Không tìm thấy bài viết');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) return <PageSkeleton minHeight="560px" />;

  if (error || !article) {
    return (
      <div className="public-page article-detail-page">
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <h3 className="empty-state-title">Không tìm thấy bài viết</h3>
          <p className="empty-state-desc">{error || 'Bài viết không tồn tại hoặc đã bị ẩn.'}</p>
          <Link className="btn btn-primary" to="/articles">Quay lại cẩm nang</Link>
        </div>
      </div>
    );
  }

  const title = cleanDisplayText(article.title, 'Bài viết y tế');
  const summary = cleanDisplayText(article.summary, 'Thông tin tham khảo từ đội ngũ chuyên môn.');
  const category = cleanDisplayText(article.category, 'Sức khỏe');

  return (
    <div className="public-page article-detail-page">
      <article className="article-detail-card">
        <header className="article-detail-header">
          <div>
            <span className="article-category-badge">{category}</span>
            <h1>{title}</h1>
            <p>{summary}</p>
            <div className="article-detail-meta">
              <span>{getArticleAuthorName(article)}</span>
              <span>{formatDate(article.publishedAt || article.createdAt)}</span>
              <span>{article.viewCount || 0} lượt xem</span>
            </div>
          </div>
        </header>

        {article.coverImage && (
          <div className="article-detail-cover">
            <img src={article.coverImage} alt={title} />
          </div>
        )}

        <ArticleBody content={article.content} />

        <footer className="article-detail-footer">
          {article.tags?.length > 0 && (
            <div className="article-tags">
              {article.tags.map((tag) => <span key={tag}>{cleanDisplayText(tag)}</span>)}
            </div>
          )}

          <div className="article-detail-cta">
            <div>
              <strong>Cần bác sĩ tư vấn trực tiếp?</strong>
              <p>Đặt lịch khám để được đánh giá tình trạng cụ thể và nhận hướng dẫn phù hợp.</p>
            </div>
            <div>
              <Link className="btn btn-primary rounded-pill" to="/booking">Đặt lịch khám</Link>
              {article.specialtyId?._id ? (
                <Link className="btn btn-outline-primary rounded-pill" to={`/booking?specialtyId=${article.specialtyId._id}`}>
                  Tìm bác sĩ chuyên khoa
                </Link>
              ) : (
                <Link className="btn btn-outline-primary rounded-pill" to="/doctors">Tìm bác sĩ liên quan</Link>
              )}
            </div>
          </div>
        </footer>
      </article>

      {relatedArticles.length > 0 && (
        <section className="articles-section">
          <div className="articles-section-head">
            <div>
              <span className="eyebrow">Gợi ý đọc thêm</span>
              <h2>Bài viết liên quan</h2>
            </div>
          </div>
          <div className="article-related-grid">
            {relatedArticles.map((item) => <ArticleMiniCard article={item} key={item._id} />)}
          </div>
        </section>
      )}
    </div>
  );
}
