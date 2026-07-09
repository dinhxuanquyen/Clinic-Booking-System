import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { cleanDisplayText } from '../utils/textEncoding.js';

const defaultForm = {
  title: '',
  summary: '',
  content: '',
  coverImage: '',
  category: 'Sức khỏe tổng quát',
  specialtyId: '',
  tags: '',
  status: 'published'
};

const statusLabels = {
  draft: 'Bản nháp',
  published: 'Đã xuất bản',
  hidden: 'Đã ẩn'
};

function formatDate(value) {
  if (!value) return 'Chưa xuất bản';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(value));
}

function toTextList(value) {
  return Array.isArray(value) ? value.join(', ') : String(value || '');
}

function toArray(value) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function DoctorArticlesPage() {
  const toast = useToast();
  const [articles, setArticles] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState('');

  async function loadArticles() {
    setLoading(true);
    try {
      const payload = await api('/doctor/articles');
      setArticles(payload.data || []);
    } catch (error) {
      toast.error(error.message || 'Không tải được bài viết');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArticles();
    api('/specialties')
      .then((payload) => setSpecialties(payload.data || []))
      .catch(() => setSpecialties([]));
  }, []);

  const visibleArticles = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    if (!needle) return articles;
    return articles.filter((item) => (
      [item.title, item.summary, item.category, ...(item.tags || [])]
        .some((value) => cleanDisplayText(value).toLowerCase().includes(needle))
    ));
  }, [articles, keyword]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setEditing(null);
    setForm(defaultForm);
  }

  function editArticle(article) {
    setEditing(article);
    setForm({
      title: cleanDisplayText(article.title),
      summary: cleanDisplayText(article.summary),
      content: cleanDisplayText(article.content),
      coverImage: article.coverImage || '',
      category: cleanDisplayText(article.category, 'Sức khỏe tổng quát'),
      specialtyId: article.specialtyId?._id || article.specialtyId || '',
      tags: toTextList(article.tags),
      status: article.status || 'published'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.warning('Vui lòng nhập tiêu đề bài viết');
      return;
    }
    if (!form.content.trim()) {
      toast.warning('Vui lòng nhập nội dung bài viết');
      return;
    }

    setSaving(true);
    try {
      const body = {
        ...form,
        summary: form.summary.trim(),
        specialtyId: form.specialtyId || null,
        tags: toArray(form.tags)
      };
      const url = editing ? `/doctor/articles/${editing._id}` : '/doctor/articles';
      await api(url, {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(body)
      });
      toast.success(editing ? 'Đã cập nhật bài viết' : 'Đã tạo bài viết');
      resetForm();
      await loadArticles();
    } catch (error) {
      toast.error(error.message || 'Không lưu được bài viết');
    } finally {
      setSaving(false);
    }
  }

  async function deleteArticle(article) {
    if (!window.confirm(`Xóa bài viết "${cleanDisplayText(article.title)}"?`)) return;
    try {
      await api(`/doctor/articles/${article._id}`, { method: 'DELETE' });
      toast.success('Đã xóa bài viết');
      await loadArticles();
      if (editing?._id === article._id) resetForm();
    } catch (error) {
      toast.error(error.message || 'Không xóa được bài viết');
    }
  }

  return (
    <div className="doctor-page article-admin-page">
      <div className="doctor-page-header">
        <div className="doctor-page-header-main">
          <p className="doctor-page-eyebrow">Cẩm nang sức khỏe</p>
          <h1 className="doctor-page-title">Bài viết của tôi</h1>
          <p className="doctor-page-subtitle">Chia sẻ kiến thức y tế, hướng dẫn chuẩn bị khám và thông tin chuyên khoa cho bệnh nhân.</p>
        </div>
      </div>

      <form className="doctor-content-card article-admin-form-card" onSubmit={submit}>
        <div className="article-admin-form-head">
          <div>
            <h2>{editing ? 'Cập nhật bài viết' : 'Tạo bài viết mới'}</h2>
            <p>Bài viết xuất bản sẽ hiển thị tại trang Cẩm nang công khai.</p>
          </div>
          {editing && <button className="btn btn-outline-secondary rounded-pill" type="button" onClick={resetForm}>Tạo mới</button>}
        </div>

        <div className="article-admin-grid">
          <label>
            <span>Tiêu đề</span>
            <input className="form-control" value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="Ví dụ: Khi nào nên đi khám Tai Mũi Họng?" />
          </label>
          <label>
            <span>Chuyên khoa</span>
            <select className="form-select" value={form.specialtyId} onChange={(event) => updateForm('specialtyId', event.target.value)}>
              <option value="">Theo hồ sơ bác sĩ</option>
              {specialties.map((item) => <option key={item._id} value={item._id}>{cleanDisplayText(item.name)}</option>)}
            </select>
          </label>
          <label>
            <span>Danh mục</span>
            <input className="form-control" value={form.category} onChange={(event) => updateForm('category', event.target.value)} />
          </label>
          <label>
            <span>Trạng thái</span>
            <select className="form-select" value={form.status} onChange={(event) => updateForm('status', event.target.value)}>
              <option value="published">Xuất bản</option>
              <option value="draft">Bản nháp</option>
              <option value="hidden">Ẩn</option>
            </select>
          </label>
        </div>

        <label className="article-admin-full">
          <span>Tóm tắt</span>
          <textarea className="form-control" rows="2" value={form.summary} onChange={(event) => updateForm('summary', event.target.value)} placeholder="Tóm tắt ngắn 1-2 câu để bệnh nhân dễ đọc." />
        </label>
        <label className="article-admin-full">
          <span>Nội dung</span>
          <textarea className="form-control" rows="8" value={form.content} onChange={(event) => updateForm('content', event.target.value)} placeholder="Nội dung bài viết. Mỗi đoạn có thể xuống dòng để hiển thị rõ ràng." />
        </label>
        <div className="article-admin-grid">
          <label>
            <span>Ảnh bìa URL</span>
            <input className="form-control" value={form.coverImage} onChange={(event) => updateForm('coverImage', event.target.value)} placeholder="https://..." />
          </label>
          <label>
            <span>Tags</span>
            <input className="form-control" value={form.tags} onChange={(event) => updateForm('tags', event.target.value)} placeholder="khám bệnh, sức khỏe, phòng khám" />
          </label>
        </div>
        <div className="article-admin-actions">
          <button className="btn btn-primary rounded-pill px-4" type="submit" disabled={saving}>
            {saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo bài viết'}
          </button>
        </div>
      </form>

      <section className="doctor-content-card article-admin-list-card">
        <div className="article-admin-toolbar">
          <div>
            <h2>Danh sách bài viết</h2>
            <p>{visibleArticles.length} bài viết</p>
          </div>
          <input className="form-control" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm bài viết..." />
        </div>

        {loading ? (
          <div className="doctor-loading-card">Đang tải bài viết...</div>
        ) : visibleArticles.length ? (
          <div className="article-admin-list">
            {visibleArticles.map((article) => (
              <article className="article-admin-item" key={article._id}>
                <div>
                  <span className={`article-status-badge ${article.status}`}>{statusLabels[article.status] || article.status}</span>
                  <h3>{cleanDisplayText(article.title)}</h3>
                  <p>{cleanDisplayText(article.summary, 'Chưa có tóm tắt')}</p>
                  <small>{cleanDisplayText(article.category)} · {formatDate(article.publishedAt || article.createdAt)} · {article.viewCount || 0} lượt xem</small>
                </div>
                <div className="article-admin-item-actions">
                  <button className="btn btn-outline-primary rounded-pill" type="button" onClick={() => editArticle(article)}>Sửa</button>
                  <button className="btn btn-outline-danger rounded-pill" type="button" onClick={() => deleteArticle(article)}>Xóa</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-empty-state">
            <h3>Chưa có bài viết nào</h3>
            <p>Bài viết của bác sĩ sẽ hiển thị tại đây sau khi tạo.</p>
          </div>
        )}
      </section>
    </div>
  );
}
