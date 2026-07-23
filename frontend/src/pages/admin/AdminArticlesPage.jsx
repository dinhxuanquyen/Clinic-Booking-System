import { useEffect, useMemo, useRef, useState } from 'react';
import { api, apiForm } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { resolveMediaUrl } from '../../utils/media.js';
import { cleanDisplayText } from '../../utils/textEncoding.js';

const defaultForm = {
  title: '',
  summary: '',
  content: '',
  coverImage: '',
  category: 'Sức khỏe tổng quát',
  specialtyId: '',
  tags: '',
  status: 'published',
  isFeatured: false
};

const statusLabels = {
  draft: 'Bản nháp',
  published: 'Đã xuất bản',
  hidden: 'Đã ẩn'
};

function formatDate(value) {
  if (!value) return 'Chưa xuất bản';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(value));
}

function listToText(value) {
  return Array.isArray(value) ? value.join(', ') : String(value || '');
}

function textToList(value) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAuthor(article) {
  const name = article.authorId?.name || (article.authorRole === 'doctor' ? article.doctorId?.name : 'Admin');
  return cleanDisplayText(name, 'Hệ thống');
}

export default function AdminArticlesPage() {
  const toast = useToast();
  const coverInputRef = useRef(null);
  const [articles, setArticles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [specialties, setSpecialties] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '', authorRole: '' });
  const [formNotice, setFormNotice] = useState(null);

  async function loadArticles(params = filters) {
    setLoading(true);
    try {
      const payload = await api('/admin/articles', {
        params: {
          limit: 50,
          search: params.search || undefined,
          status: params.status || undefined,
          authorRole: params.authorRole || undefined
        }
      });
      setArticles(payload.data?.articles || []);
      setPagination(payload.data?.pagination || { page: 1, totalPages: 1, total: 0 });
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

  const stats = useMemo(() => ({
    total: articles.length,
    published: articles.filter((item) => item.status === 'published').length,
    draft: articles.filter((item) => item.status === 'draft').length,
    featured: articles.filter((item) => item.isFeatured).length
  }), [articles]);

  const formProgress = useMemo(() => {
    const checks = [
      Boolean(form.title.trim()),
      Boolean(form.category.trim()),
      Boolean(form.summary.trim()),
      Boolean(form.content.trim())
    ];
    return checks.filter(Boolean).length;
  }, [form]);

  function updateForm(field, value) {
    if (formNotice) setFormNotice(null);
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setEditing(null);
    setForm(defaultForm);
    setFormNotice(null);
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
      tags: listToText(article.tags),
      status: article.status || 'published',
      isFeatured: Boolean(article.isFeatured)
    });
    setFormNotice({
      type: 'info',
      title: 'Đang chỉnh sửa bài viết',
      message: 'Bạn có thể cập nhật nội dung, đổi trạng thái hoặc lưu thành bản nháp trước khi xuất bản.'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function uploadCoverImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setUploadingCover(true);
    try {
      const payload = await apiForm('/uploads/article-cover', formData);
      const url = payload.data?.url;
      if (!url) throw new Error('Không nhận được URL ảnh sau khi upload');
      updateForm('coverImage', url);
      toast.success('Đã tải ảnh bìa bài viết');
    } catch (error) {
      toast.error(error.message || 'Không tải được ảnh bìa');
    } finally {
      setUploadingCover(false);
    }
  }

  function openCoverFilePicker(event) {
    if (saving || uploadingCover) return;
    if (event.target.closest('button, input, label, a')) return;
    coverInputRef.current?.click();
  }

  function handleCoverPickerKeyDown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openCoverFilePicker(event);
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setFormNotice({
        type: 'warning',
        title: 'Thiếu tiêu đề bài viết',
        message: 'Tiêu đề giúp bệnh nhân hiểu nhanh nội dung bài viết và là thông tin bắt buộc trước khi lưu.'
      });
      toast.warning('Vui lòng nhập tiêu đề bài viết');
      return;
    }
    if (!form.content.trim()) {
      setFormNotice({
        type: 'warning',
        title: 'Thiếu nội dung bài viết',
        message: 'Nội dung bài viết đang trống. Hãy nhập phần hướng dẫn chính trước khi tạo hoặc cập nhật bài.'
      });
      toast.warning('Vui lòng nhập nội dung bài viết');
      return;
    }

    setSaving(true);
    try {
      const body = {
        ...form,
        specialtyId: form.specialtyId || null,
        tags: textToList(form.tags)
      };
      const url = editing ? `/admin/articles/${editing._id}` : '/admin/articles';
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

  async function updateStatus(article, status) {
    try {
      await api(`/admin/articles/${article._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      toast.success('Đã cập nhật trạng thái bài viết');
      await loadArticles();
    } catch (error) {
      toast.error(error.message || 'Không cập nhật được trạng thái');
    }
  }

  async function toggleFeatured(article) {
    try {
      await api(`/admin/articles/${article._id}/featured`, {
        method: 'PATCH',
        body: JSON.stringify({ isFeatured: !article.isFeatured })
      });
      toast.success(article.isFeatured ? 'Đã bỏ nổi bật bài viết' : 'Đã đánh dấu nổi bật');
      await loadArticles();
    } catch (error) {
      toast.error(error.message || 'Không cập nhật được bài viết nổi bật');
    }
  }

  async function deleteArticle(article) {
    if (!window.confirm(`Xóa bài viết "${cleanDisplayText(article.title)}"?`)) return;
    try {
      await api(`/admin/articles/${article._id}`, { method: 'DELETE' });
      toast.success('Đã xóa bài viết');
      if (editing?._id === article._id) resetForm();
      await loadArticles();
    } catch (error) {
      toast.error(error.message || 'Không xóa được bài viết');
    }
  }

  function applyFilters(event) {
    event.preventDefault();
    loadArticles(filters);
  }

  function clearFilters() {
    const next = { search: '', status: '', authorRole: '' };
    setFilters(next);
    loadArticles(next);
  }

  return (
    <div className="admin-page article-admin-page">
      <div className="admin-page-heading">
        <span className="eyebrow">Cẩm nang sức khỏe</span>
        <h1>Quản lý bài viết y tế</h1>
        <p>Tạo, duyệt và quản lý các bài viết hướng dẫn bệnh nhân trước và sau khi khám.</p>
      </div>

      <section className="article-admin-stats">
        <div><strong>{stats.total}</strong><span>Tổng bài</span></div>
        <div><strong>{stats.published}</strong><span>Đã xuất bản</span></div>
        <div><strong>{stats.draft}</strong><span>Bản nháp</span></div>
        <div><strong>{stats.featured}</strong><span>Nổi bật</span></div>
      </section>

      <form className="admin-table-card article-admin-form-card" onSubmit={submit}>
        <div className="article-admin-form-head">
          <div>
            <h2>{editing ? 'Cập nhật bài viết' : 'Tạo bài viết mới'}</h2>
            <p>Admin có thể tạo bài viết hệ thống, xuất bản hoặc ẩn nội dung khi cần.</p>
          </div>
          {editing && <button className="btn btn-outline-secondary rounded-pill" type="button" onClick={resetForm}>Tạo mới</button>}
        </div>

        {formNotice && (
          <div className={`article-admin-notice ${formNotice.type}`}>
            <div className="article-admin-notice-icon">{formNotice.type === 'warning' ? '!' : 'i'}</div>
            <div>
              <strong>{formNotice.title}</strong>
              <p>{formNotice.message}</p>
            </div>
            <button type="button" onClick={() => setFormNotice(null)} aria-label="Đóng thông báo">×</button>
          </div>
        )}

        <div className="article-admin-editor-layout">
          <div className="article-admin-editor-main">
            <div className="article-admin-section-title">
              <span>01</span>
              <div>
                <h3>Nội dung bài viết</h3>
                <p>Nhập tiêu đề, tóm tắt và phần nội dung chính dành cho bệnh nhân.</p>
              </div>
            </div>

            <div className="article-admin-grid">
              <label>
                <span>Tiêu đề</span>
                <input className="form-control" value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="Ví dụ: Những lưu ý trước khi khám Nhi khoa" />
              </label>
              <label>
                <span>Danh mục</span>
                <input className="form-control" value={form.category} onChange={(event) => updateForm('category', event.target.value)} placeholder="Sức khỏe tổng quát" />
              </label>
            </div>

            <label className="article-admin-full">
              <span>Tóm tắt</span>
              <textarea className="form-control" rows="3" value={form.summary} onChange={(event) => updateForm('summary', event.target.value)} placeholder="Tóm tắt ngắn 1-2 câu để hiển thị trên danh sách bài viết." />
              <small>{form.summary.length}/280 ký tự gợi ý</small>
            </label>
            <label className="article-admin-full">
              <span>Nội dung</span>
              <textarea className="form-control article-content-editor" rows="10" value={form.content} onChange={(event) => updateForm('content', event.target.value)} placeholder="Nhập nội dung hướng dẫn bệnh nhân. Có thể chia đoạn rõ ràng để dễ đọc." />
              <small>{form.content.length} ký tự</small>
            </label>
          </div>

          <aside className="article-admin-editor-side">
            <div className="article-admin-section-title compact">
              <span>02</span>
              <div>
                <h3>Thiết lập xuất bản</h3>
                <p>Chọn chuyên khoa, trạng thái và thông tin hiển thị.</p>
              </div>
            </div>

            <label>
              <span>Chuyên khoa</span>
              <select className="form-select" value={form.specialtyId} onChange={(event) => updateForm('specialtyId', event.target.value)}>
                <option value="">Không gắn chuyên khoa</option>
                {specialties.map((item) => <option key={item._id} value={item._id}>{cleanDisplayText(item.name)}</option>)}
              </select>
            </label>
            <label>
              <span>Trạng thái</span>
              <select className="form-select" value={form.status} onChange={(event) => updateForm('status', event.target.value)}>
                <option value="published">Xuất bản</option>
                <option value="draft">Bản nháp</option>
                <option value="hidden">Ẩn</option>
              </select>
            </label>
            <div className="article-admin-cover-field article-admin-cover-picker" role="button" tabIndex={0} onClick={openCoverFilePicker} onKeyDown={handleCoverPickerKeyDown}>
              <div className="article-admin-cover-preview">
                {form.coverImage ? (
                  <img src={resolveMediaUrl(form.coverImage, '/articles-health-banner.webp')} alt="Ảnh bìa bài viết" />
                ) : (
                  <span>Chưa có ảnh bìa</span>
                )}
              </div>
              <div className="article-admin-cover-controls">
                <div className="article-admin-cover-actions">
                  <input
                    ref={coverInputRef}
                    className="article-cover-file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploadingCover || saving}
                    onChange={uploadCoverImage}
                  />
                  <button
                    className="btn btn-primary article-cover-upload-btn"
                    disabled={uploadingCover || saving}
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    {uploadingCover ? 'Đang tải ảnh...' : 'Tải ảnh từ máy'}
                  </button>
                  {form.coverImage && (
                    <button className="btn btn-outline-secondary" disabled={uploadingCover || saving} type="button" onClick={() => updateForm('coverImage', '')}>
                      Xóa ảnh
                    </button>
                  )}
                </div>
                <small>Hỗ trợ JPG, PNG, WEBP tối đa 2MB. URL ảnh bìa sẽ tự điền sau khi tải lên.</small>
              </div>
            </div>
            <label className="article-cover-url-field">
              <span>Ảnh bìa URL</span>
              <input className="form-control" value={form.coverImage} onChange={(event) => updateForm('coverImage', event.target.value)} placeholder="https://..." />
            </label>
            <label>
              <span>Thẻ</span>
              <input className="form-control" value={form.tags} onChange={(event) => updateForm('tags', event.target.value)} placeholder="khám bệnh, sức khỏe" />
              <small>Phân tách bằng dấu phẩy hoặc xuống dòng.</small>
            </label>
            <label className="article-featured-toggle">
              <input type="checkbox" checked={form.isFeatured} onChange={(event) => updateForm('isFeatured', event.target.checked)} />
              <span>Đánh dấu nổi bật trên trang Cẩm nang</span>
            </label>

            <div className="article-admin-preview-card">
              <span className={`article-status-badge ${form.status}`}>{statusLabels[form.status]}</span>
              {form.isFeatured && <span className="article-featured-badge">Nổi bật</span>}
              <h4>{form.title.trim() || 'Tiêu đề bài viết sẽ hiển thị tại đây'}</h4>
              <p>{form.summary.trim() || 'Tóm tắt ngắn giúp bệnh nhân hiểu nhanh nội dung bài viết.'}</p>
              <div>
                <strong>{formProgress}/4</strong>
                <span>mục nội dung đã hoàn thiện</span>
              </div>
            </div>
          </aside>
        </div>
        <div className="article-admin-actions">
          <button className="btn btn-outline-secondary rounded-pill px-4" type="button" onClick={resetForm} disabled={saving || uploadingCover}>
            Làm mới form
          </button>
          <button className="btn btn-primary rounded-pill px-4" type="submit" disabled={saving || uploadingCover}>
            {saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo bài viết'}
          </button>
        </div>
      </form>

      <section className="admin-table-card article-admin-list-card">
        <form className="article-admin-toolbar" onSubmit={applyFilters}>
          <div>
            <h2>Danh sách bài viết</h2>
            <p>{pagination.total || articles.length} bài viết</p>
          </div>
          <input className="form-control" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Tìm theo tiêu đề, danh mục..." />
          <select className="form-select" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">Tất cả trạng thái</option>
            <option value="published">Đã xuất bản</option>
            <option value="draft">Bản nháp</option>
            <option value="hidden">Đã ẩn</option>
          </select>
          <select className="form-select" value={filters.authorRole} onChange={(event) => setFilters((current) => ({ ...current, authorRole: event.target.value }))}>
            <option value="">Tất cả tác giả</option>
            <option value="admin">Quản trị viên</option>
            <option value="doctor">Bác sĩ</option>
          </select>
          <button className="btn btn-primary rounded-pill" type="submit">Lọc</button>
          <button className="btn btn-outline-secondary rounded-pill" type="button" onClick={clearFilters}>Xóa lọc</button>
        </form>

        {loading ? (
          <div className="admin-empty-state"><p>Đang tải bài viết...</p></div>
        ) : articles.length ? (
          <div className="article-admin-list">
            {articles.map((article) => (
              <article className="article-admin-item" key={article._id}>
                <div>
                  <div className="article-admin-item-meta">
                    <span className={`article-status-badge ${article.status}`}>{statusLabels[article.status] || article.status}</span>
                    {article.isFeatured && <span className="article-featured-badge">Nổi bật</span>}
                    <span>{article.authorRole === 'doctor' ? 'Bác sĩ' : 'Admin'} · {getAuthor(article)}</span>
                  </div>
                  <h3>{cleanDisplayText(article.title)}</h3>
                  <p>{cleanDisplayText(article.summary, 'Chưa có tóm tắt')}</p>
                  <small>{cleanDisplayText(article.category)} · {formatDate(article.publishedAt || article.createdAt)} · {article.viewCount || 0} lượt xem</small>
                </div>
                <div className="article-admin-item-actions">
                  <button className="btn btn-outline-primary rounded-pill" type="button" onClick={() => editArticle(article)}>Sửa</button>
                  <button className="btn btn-outline-info rounded-pill" type="button" onClick={() => toggleFeatured(article)}>{article.isFeatured ? 'Bỏ nổi bật' : 'Nổi bật'}</button>
                  {article.status === 'published' ? (
                    <button className="btn btn-outline-warning rounded-pill" type="button" onClick={() => updateStatus(article, 'hidden')}>Ẩn</button>
                  ) : (
                    <button className="btn btn-outline-success rounded-pill" type="button" onClick={() => updateStatus(article, 'published')}>Xuất bản</button>
                  )}
                  <button className="btn btn-outline-danger rounded-pill" type="button" onClick={() => deleteArticle(article)}>Xóa</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-empty-state">
            <h3>Chưa có bài viết nào</h3>
            <p>Thêm bài viết đầu tiên để xây dựng Cẩm nang sức khỏe cho hệ thống.</p>
          </div>
        )}
      </section>
    </div>
  );
}
