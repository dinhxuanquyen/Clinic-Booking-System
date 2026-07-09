import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

const ratingFilters = [
  { value: '', label: 'Tất cả' },
  { value: '5', label: '5 ★' },
  { value: '4', label: '4 ★' },
  { value: '3', label: '3 ★' },
  { value: '2', label: '2 ★' },
  { value: '1', label: '1 ★' }
];

const sortOptions = [
  { value: 'newest', label: 'Mới nhất trước' },
  { value: 'highest', label: 'Điểm cao nhất' },
  { value: 'lowest', label: 'Điểm thấp nhất' }
];

function getName(value) {
  if (!value) return 'Đang cập nhật';
  return typeof value === 'object' ? value.name : value;
}

function formatDate(value) {
  if (!value) return 'Đang cập nhật';
  return new Intl.DateTimeFormat('vi-VN').format(new Date(value));
}

function reviewAppointment(review) {
  return review.appointmentId || {};
}

function getAvatarInitial(name = '') {
  const clean = name.replace(/^(BS\.|TS\.|PGS\.|GS\.)\s?/i, '').trim();
  return clean.charAt(0).toUpperCase() || '?';
}

function StarRow({ rating, size = 'md' }) {
  return (
    <span className={`rv-star-row rv-star-row--${size}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? 'rv-star filled' : 'rv-star empty'}>★</span>
      ))}
    </span>
  );
}

function RatingBar({ star, count, total }) {
  const percent = total ? Math.round((count / total) * 100) : 0;
  const tone = star >= 4 ? 'success' : star === 3 ? 'warning' : 'danger';

  return (
    <div className="rv-ratingbar">
      <span className="rv-ratingbar-label">{star} ★</span>
      <div className="rv-ratingbar-track">
        <div
          className={`rv-ratingbar-fill rv-ratingbar-fill--${tone}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="rv-ratingbar-count">{count}</span>
      <span className="rv-ratingbar-pct">{percent}%</span>
    </div>
  );
}

export default function DoctorReviewsPage() {
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({
    averageRating: 0,
    ratingCount: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 6 });
  const [rating, setRating] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const lowRatingCount = useMemo(() => (
    [1, 2, 3].reduce((total, star) => total + (summary.ratingDistribution?.[star] || 0), 0)
  ), [summary.ratingDistribution]);

  useEffect(() => { setPage(1); }, [rating, sort]);

  useEffect(() => {
    const params = { page, limit: 6, sort };
    if (rating) params.rating = rating;

    setLoading(true);
    api('/doctor/reviews', { params })
      .then((payload) => {
        const data = payload.data || {};
        setReviews(data.reviews || []);
        setSummary(data.summary || summary);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0, limit: 6 });
      })
      .catch((error) => toast.error(error.message || 'Không tải được đánh giá'))
      .finally(() => setLoading(false));
  }, [page, rating, sort, toast]);

  const avgRating = summary.ratingCount ? summary.averageRating.toFixed(1) : '—';
  const roundedRating = summary.ratingCount ? Math.round(summary.averageRating) : 0;

  return (
    <div className="doctor-page doctor-reviews-page">
      {/* ── Page Header ── */}
      <div className="doctor-page-header">
        <div className="doctor-page-header-main">
          <p className="doctor-page-eyebrow">Đánh giá bác sĩ</p>
          <h1 className="doctor-page-title">Đánh giá của tôi</h1>
          <p className="doctor-page-subtitle">
            Theo dõi phản hồi của bệnh nhân sau khi hoàn thành buổi khám.
          </p>
        </div>
      </div>

      {/* ── Summary Section ── */}
      <div className="rv-summary-section">
        {/* Score Card */}
        <div className="rv-score-card">
          <div className="rv-score-big">{avgRating}</div>
          <StarRow rating={roundedRating} size="lg" />
          <p className="rv-score-meta">
            {summary.ratingCount > 0
              ? <><strong>{summary.ratingCount}</strong> đánh giá</>
              : 'Chưa có đánh giá'}
          </p>
          {lowRatingCount > 0 && (
            <span className="rv-low-alert">
              ⚠ {lowRatingCount} cần theo dõi
            </span>
          )}
        </div>

        {/* Rating Bars */}
        <div className="rv-bars-card">
          <div className="rv-bars-header">
            <h3>Phân bổ đánh giá</h3>
            <span className="rv-bars-total">{summary.ratingCount} lượt</span>
          </div>
          {[5, 4, 3, 2, 1].map((star) => (
            <RatingBar
              key={star}
              star={star}
              count={summary.ratingDistribution?.[star] || 0}
              total={summary.ratingCount}
            />
          ))}
        </div>
      </div>

      {/* ── Filter & Sort Bar ── */}
      <div className="rv-filter-bar">
        <div className="rv-filter-pills">
          {ratingFilters.map((item) => (
            <button
              key={item.value}
              className={`rv-filter-pill ${rating === item.value ? 'active' : ''}`}
              type="button"
              onClick={() => setRating(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <select
          className="rv-sort-select"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
        >
          {sortOptions.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      </div>

      {/* ── Reviews Grid ── */}
      {loading ? (
        <div className="rv-review-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="rv-review-card rv-review-card--skeleton">
              <div className="skeleton-line" style={{ height: 40, marginBottom: 14 }} />
              <div className="skeleton-line" style={{ height: 60, marginBottom: 10 }} />
              <div className="skeleton-line" style={{ height: 24 }} />
            </div>
          ))}
        </div>
      ) : reviews.length ? (
        <>
          <div className="rv-review-grid">
            {reviews.map((review) => {
              const appointment = reviewAppointment(review);
              const patientName = getName(review.patientId);

              return (
                <article className="rv-review-card" key={review._id}>
                  {/* Card Header */}
                  <div className="rv-card-header">
                    <div className="rv-patient-info">
                      <div className="rv-avatar">{getAvatarInitial(patientName)}</div>
                      <div>
                        <div className="rv-patient-name">{patientName}</div>
                        <div className="rv-review-date">{formatDate(review.createdAt)}</div>
                      </div>
                    </div>
                    <div className="rv-score-badge">{review.rating}<span>★</span></div>
                  </div>

                  {/* Stars */}
                  <div className="rv-stars-row">
                    <StarRow rating={review.rating} />
                  </div>

                  {/* Comment */}
                  <p className="rv-comment">
                    {review.comment
                      ? `"${review.comment}"`
                      : <em className="rv-no-comment">Bệnh nhân không để lại nhận xét.</em>}
                  </p>

                  {/* Meta chips */}
                  <div className="rv-meta-chips">
                    {appointment.date && (
                      <span className="rv-meta-chip">📅 {appointment.date}</span>
                    )}
                    {appointment.timeSlot && (
                      <span className="rv-meta-chip">🕐 {appointment.timeSlot}</span>
                    )}
                    {review.clinicId && (
                      <span className="rv-meta-chip">🏥 {getName(review.clinicId)}</span>
                    )}
                    {review.specialtyId && (
                      <span className="rv-meta-chip">🔬 {getName(review.specialtyId)}</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="rv-pagination">
              <button
                className="btn btn-secondary btn-sm"
                disabled={pagination.page <= 1}
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                ← Trước
              </button>
              <span className="rv-pagination-info">
                Trang {pagination.page} / {pagination.totalPages} · {pagination.total} đánh giá
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={pagination.page >= pagination.totalPages}
                type="button"
                onClick={() => setPage((current) => current + 1)}
              >
                Sau →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">⭐</div>
          <h3 className="empty-state-title">Chưa có đánh giá nào</h3>
          <p className="empty-state-desc">
            Đánh giá sẽ xuất hiện tại đây sau khi bệnh nhân hoàn thành buổi khám.
          </p>
        </div>
      )}
    </div>
  );
}
