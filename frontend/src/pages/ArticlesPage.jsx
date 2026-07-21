import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import PageSkeleton from '../components/PageSkeleton.jsx';
import { cleanDisplayText } from '../utils/textEncoding.js';

const categories = [
  'Tất cả',
  'Hướng dẫn khám bệnh',
  'Sức khỏe tổng quát',
  'Nhi khoa',
  'Tim mạch',
  'Da liễu',
  'Tai Mũi Họng',
  'Cơ xương khớp',
  'Dinh dưỡng'
];

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN').format(new Date(value));
}

function normalize(value) {
  return cleanDisplayText(value).toLowerCase();
}

function ArticleCard({ article, featured = false }) {
  const title = cleanDisplayText(article.title, 'Bài viết y tế');
  const category = cleanDisplayText(article.category, 'Sức khỏe');
  const summary = cleanDisplayText(article.summary, 'Thông tin tham khảo từ đội ngũ chuyên môn.');

  return (
    <article className={`article-card ${featured ? 'featured' : ''}`}>
      <Link to={`/articles/${article.slug}`} className={`article-card-image ${article.coverImage ? '' : 'placeholder'}`}>
        {article.coverImage ? <img src={article.coverImage} alt={title} /> : <span>Cẩm nang</span>}
      </Link>
      <div className="article-card-body">
        <div className="article-card-topline">
          <span className="article-category-badge">{category}</span>
          {featured && <span className="article-featured-badge">Nổi bật</span>}
        </div>
        <h2><Link to={`/articles/${article.slug}`}>{title}</Link></h2>
        <p>{summary}</p>
        <div className="article-card-meta">
          <span>{cleanDisplayText(article.authorId?.name, 'Clinic Booking')}</span>
          <span>{formatDate(article.publishedAt || article.createdAt)}</span>
          <span>{article.viewCount || 0} lượt xem</span>
        </div>
        <Link className="article-read-link" to={`/articles/${article.slug}`}>Đọc bài viết</Link>
      </div>
    </article>
  );
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api('/articles', { params: { limit: 50 } })
      .then((payload) => {
        if (!active) return;
        setArticles(payload.data?.articles || []);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Không thể tải bài viết');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const visibleArticles = useMemo(() => {
    const keyword = normalize(search.trim());
    return articles.filter((article) => {
      const articleCategory = cleanDisplayText(article.category);
      const matchesCategory = category === 'Tất cả' || articleCategory === category;
      const haystack = normalize([article.title, article.summary, article.category, ...(article.tags || [])].join(' '));
      return matchesCategory && (!keyword || haystack.includes(keyword));
    });
  }, [articles, category, search]);

  const featuredArticles = visibleArticles.filter((article) => article.isFeatured).slice(0, 3);
  const normalArticles = visibleArticles.filter((article) => !featuredArticles.some((featured) => featured._id === article._id));

  if (loading) return <PageSkeleton minHeight="560px" />;

  return (
    <div className="public-page articles-page">
      <section className="articles-hero-banner" aria-label="Cẩm nang sức khỏe">
        <img
          className="articles-hero-image"
          src="/articles-health-banner.webp"
          alt=""
          aria-hidden="true"
        />
      </section>

      <section className="articles-hero">
        <div>
          <span className="eyebrow">Cẩm nang sức khỏe</span>
          <h1>Kiến thức y tế dễ hiểu cho người bệnh</h1>
          <p>Hướng dẫn khám bệnh, chăm sóc sức khỏe và nhận biết dấu hiệu cần đi khám từ đội ngũ chuyên môn.</p>
        </div>
        <div className="articles-hero-panel">
          <strong>{articles.length}</strong>
          <span>bài viết tham khảo</span>
          <small>Nội dung chỉ hỗ trợ định hướng, không thay thế thăm khám với bác sĩ.</small>
        </div>
      </section>

      <section className="articles-filter-card">
        <input
          className="form-control"
          placeholder="Tìm bài viết, bệnh lý, chuyên khoa..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="article-category-chips">
          {categories.map((item) => (
            <button
              className={category === item ? 'active' : ''}
              key={item}
              type="button"
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {error && <div className="alert alert-danger">{error}</div>}

      {!error && visibleArticles.length === 0 && (
        <EmptyState
          icon="📚"
          title="Chưa có bài viết phù hợp"
          description="Bạn có thể thử từ khóa khác hoặc chọn lại chủ đề."
        />
      )}

      {!error && featuredArticles.length > 0 && (
        <section className="articles-section">
          <div className="articles-section-head">
            <div>
              <span className="eyebrow">Nổi bật</span>
              <h2>Bài viết được quan tâm</h2>
            </div>
          </div>
          <div className="article-featured-grid">
            {featuredArticles.map((article) => <ArticleCard article={article} featured key={article._id} />)}
          </div>
        </section>
      )}

      {!error && normalArticles.length > 0 && (
        <section className="articles-section">
          <div className="articles-section-head">
            <div>
              <span className="eyebrow">Tất cả bài viết</span>
              <h2>Cẩm nang mới nhất</h2>
            </div>
          </div>
          <div className="article-grid">
            {normalArticles.map((article) => <ArticleCard article={article} key={article._id} />)}
          </div>
        </section>
      )}
    </div>
  );
}
