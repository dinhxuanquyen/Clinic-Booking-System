import { useEffect, useState } from 'react';
import { useLayoutEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import PageSkeleton from '../components/PageSkeleton.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getVietnamToday, isPastDate, isPastOrCurrentSlot } from '../utils/dateTime.js';
import { resolveMediaUrl, useImageFallback } from '../utils/media.js';
import { cleanDisplayText } from '../utils/textEncoding.js';

function objectId(value) {
  if (!value) return '';
  return typeof value === 'object' ? value._id : value;
}

function specialtyName(doctor) {
  if (!doctor?.specialtyId) return 'Đang cập nhật';
  return cleanDisplayText(typeof doctor.specialtyId === 'object' ? doctor.specialtyId.name : doctor.specialtyId, 'Đang cập nhật');
}

function clinicName(doctor) {
  if (!doctor?.clinicId) return cleanDisplayText(doctor?.workplace, 'Phòng khám Phenikaa');
  return cleanDisplayText(typeof doctor.clinicId === 'object' ? doctor.clinicId.name : doctor.clinicId, 'Phòng khám Phenikaa');
}

function apiErrorMessage(error) {
  return cleanDisplayText(error?.message, 'Đã xảy ra lỗi, vui lòng thử lại');
}

function bookingErrorMessage(error) {
  const message = apiErrorMessage(error);
  return message || 'Đã xảy ra lỗi, vui lòng thử lại';
}

function formatReviewDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN').format(new Date(value));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function patientDisplayName(patient) {
  const name = cleanDisplayText(patient?.name, 'Bệnh nhân');
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return 'Bệnh nhân';
  return `Bệnh nhân ${parts.map((part) => part[0]).join('.')}`;
}

function practiceAreasForSpecialty(name = '') {
  const normalized = cleanDisplayText(name, '').toLowerCase();

  if (normalized.includes('nhi')) {
    return ['Khám nhi tổng quát', 'Theo dõi tăng trưởng', 'Hô hấp nhi', 'Dinh dưỡng trẻ em'];
  }

  if (normalized.includes('tim')) {
    return ['Tư vấn tim mạch', 'Theo dõi huyết áp', 'Điện tim', 'Dự phòng bệnh tim'];
  }

  if (normalized.includes('da')) {
    return ['Khám da liễu', 'Mụn và viêm da', 'Dị ứng da', 'Chăm sóc da y khoa'];
  }

  if (normalized.includes('mắt') || normalized.includes('mat')) {
    return ['Khám mắt tổng quát', 'Tật khúc xạ', 'Khô mắt', 'Theo dõi thị lực'];
  }

  if (normalized.includes('tai') || normalized.includes('mũi') || normalized.includes('hong') || normalized.includes('họng')) {
    return ['Tai mũi họng tổng quát', 'Viêm xoang', 'Viêm họng', 'Rối loạn thính lực'];
  }

  if (normalized.includes('sản') || normalized.includes('phụ')) {
    return ['Khám phụ khoa', 'Tư vấn thai kỳ', 'Tầm soát sức khỏe nữ', 'Siêu âm sản phụ khoa'];
  }

  if (normalized.includes('xương') || normalized.includes('khớp')) {
    return ['Khám cơ xương khớp', 'Đau lưng', 'Thoái hóa khớp', 'Phục hồi vận động'];
  }

  return ['Khám chuyên khoa', 'Tư vấn điều trị', 'Theo dõi sức khỏe', 'Hướng dẫn chăm sóc'];
}

function scrollDoctorDetailToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

  [
    document.scrollingElement,
    document.documentElement,
    document.body,
    document.getElementById('root'),
    document.querySelector('.app-shell'),
    document.querySelector('.public-main'),
    document.querySelector('.public-page-frame')
  ].filter(Boolean).forEach((element) => {
    element.scrollTop = 0;
    element.scrollLeft = 0;
  });
}

function DoctorServicePackageCard({ item, doctorId, fallback = false }) {
  const targetPatients = Array.isArray(item?.targetPatients) ? item.targetPatients.slice(0, 2) : [];
  const includes = Array.isArray(item?.includes) ? item.includes.slice(0, 3) : [];
  const packageId = item?._id || item?.id;
  const bookingUrl = packageId
    ? `/booking?packageId=${packageId}&doctorId=${doctorId}`
    : `/booking?doctorId=${doctorId}`;

  return (
    <article className={`doctor-service-package-card ${fallback ? 'is-fallback' : ''}`}>
      <div className="doctor-service-package-top">
        <div>
          <span className="service-package-payment-badge">Thanh toán tại phòng khám</span>
          <h3>{cleanDisplayText(item?.name, 'Khám theo tư vấn của bác sĩ')}</h3>
        </div>
        <div className="doctor-service-package-meta">
          <strong>{fallback ? 'Theo tư vấn' : formatCurrency(item?.price)}</strong>
          <span>{item?.durationMinutes || 30} phút</span>
        </div>
      </div>
      <p>
        {cleanDisplayText(
          item?.description,
          'Bạn có thể đặt lịch trước, bác sĩ sẽ tư vấn dịch vụ phù hợp khi thăm khám.'
        )}
      </p>
      {(targetPatients.length > 0 || includes.length > 0) && (
        <div className="doctor-service-package-list">
          {targetPatients.slice(0, 2).map((text) => (
            <span key={`target-${text}`}>{cleanDisplayText(text)}</span>
          ))}
          {includes.slice(0, 2).map((text) => (
            <span key={`include-${text}`}>{cleanDisplayText(text)}</span>
          ))}
        </div>
      )}
      {!fallback && packageId && (
        <div className="doctor-service-package-actions">
          <Link className="btn btn-outline-primary btn-sm" to={`/packages/${packageId}`}>
            Xem chi tiết
          </Link>
          <Link className="btn btn-primary btn-sm" to={bookingUrl}>
            Đặt lịch với gói này
          </Link>
        </div>
      )}
    </article>
  );
}

export default function DoctorDetail() {
  const { clinicId, doctorId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [doctor, setDoctor] = useState(null);
  const today = getVietnamToday();
  const [date, setDate] = useState(() => getVietnamToday());
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [servicePackages, setServicePackages] = useState([]);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [waitingEntries, setWaitingEntries] = useState([]);
  const [joiningSlot, setJoiningSlot] = useState('');
  const [reviewData, setReviewData] = useState({
    summary: { averageRating: 0, ratingCount: 0, ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } },
    reviews: [],
    pagination: { page: 1, totalPages: 1 }
  });
  const [reviewPage, setReviewPage] = useState(1);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const resolvedClinicId = clinicId || objectId(doctor?.clinicId);
  const resolvedSpecialtyId = objectId(doctor?.specialtyId);

  useLayoutEffect(() => {
    scrollDoctorDetailToTop();

    const frameId = window.requestAnimationFrame(scrollDoctorDetailToTop);
    const timeoutId = window.setTimeout(scrollDoctorDetailToTop, 120);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [doctorId]);

  useEffect(() => {
    api(`/doctors/${doctorId}`)
      .then((payload) => setDoctor(payload.data))
      .catch((err) => {
        const errorText = apiErrorMessage(err);
        setError(errorText);
        toast.error(errorText);
      });
  }, [doctorId, toast]);

  useEffect(() => {
    if (!doctorId) return;
    setLoadingReviews(true);
    api(`/doctors/${doctorId}/reviews`, { params: { page: reviewPage, limit: 4, sort: 'newest' } })
      .then((payload) => {
        const nextData = payload.data || {};
        setReviewData((current) => ({
          summary: nextData.summary || current.summary,
          reviews: reviewPage === 1 ? (nextData.reviews || []) : [...current.reviews, ...(nextData.reviews || [])],
          pagination: nextData.pagination || current.pagination
        }));
      })
      .catch(() => {
        setReviewData((current) => current);
      })
      .finally(() => setLoadingReviews(false));
  }, [doctorId, reviewPage]);

  useEffect(() => {
    if (!doctorId || !date) return;
    setLoadingSlots(true);
    setMessage('');
    api(`/doctors/${doctorId}/available-slots?date=${date}`)
      .then((payload) => {
        setSlots(payload.data || []);
        if (payload.message !== 'Available slots fetched successfully') {
          setMessage(payload.message);
        }
        setSelectedSlot('');
      })
      .catch((err) => {
        const errorText = apiErrorMessage(err);
        setError(errorText);
        toast.error(errorText);
      })
      .finally(() => setLoadingSlots(false));
  }, [doctorId, date, toast]);

  useEffect(() => {
    setServicePackages([]);
    if (!resolvedClinicId || !resolvedSpecialtyId || !doctorId) return;

    api('/service-packages', {
      params: {
        clinicId: resolvedClinicId,
        specialtyId: resolvedSpecialtyId,
        doctorId
      }
    })
      .then((payload) => setServicePackages(payload.data || []))
      .catch(() => setServicePackages([]));
  }, [resolvedClinicId, resolvedSpecialtyId, doctorId]);

  useEffect(() => {
    if (user?.role !== 'patient') {
      setWaitingEntries([]);
      return;
    }

    api('/waiting-list/my')
      .then((payload) => setWaitingEntries(payload.data || []))
      .catch(() => setWaitingEntries([]));
  }, [user]);

  function requireLogin() {
    const returnUrl = `${location.pathname}${location.search}`;
    navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  function selectSlot(slot) {
    if (!slot.available) return;
    setSelectedSlot(slot.timeSlot);
  }

  function waitingEntryForSlot(timeSlot) {
    return waitingEntries.find((entry) => (
      objectId(entry.doctorId) === doctorId &&
      entry.date === date &&
      entry.timeSlot === timeSlot &&
      ['waiting', 'offered', 'accepted'].includes(entry.status)
    ));
  }

  async function joinWaitingList(slot) {
    if (!user) {
      requireLogin();
      return;
    }
    if (user.role !== 'patient') {
      toast.warning('Chỉ tài khoản bệnh nhân có thể tham gia danh sách chờ');
      return;
    }

    setJoiningSlot(slot.timeSlot);
    try {
      const payload = await api('/waiting-list', {
        method: 'POST',
        body: JSON.stringify({
          clinicId: resolvedClinicId,
          doctorId,
          specialtyId: resolvedSpecialtyId,
          date,
          timeSlot: slot.timeSlot
        })
      });
      setWaitingEntries((current) => [payload.data, ...current]);
      toast.success('Đã thêm vào danh sách chờ.');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setJoiningSlot('');
    }
  }

  async function book() {
    setMessage('');
    setError('');

    if (!user) {
      requireLogin();
      return;
    }

    if (!selectedSlot) {
      toast.warning('Vui lòng chọn khung giờ khám');
      return;
    }

    if (isPastDate(date)) {
      toast.warning('Không thể đặt lịch trong quá khứ');
      return;
    }

    if (isPastOrCurrentSlot(date, selectedSlot)) {
      toast.warning('Khung giờ này đã qua, vui lòng chọn khung giờ khác');
      return;
    }

    if (!reason.trim()) {
      toast.warning('Vui lòng nhập lý do khám');
      return;
    }

    setBooking(true);
    try {
      await api('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          clinicId: resolvedClinicId,
          doctorId,
          specialtyId: resolvedSpecialtyId,
          date,
          timeSlot: selectedSlot,
          reason: reason.trim()
        })
      });
      const successMessage = `Đặt lịch thành công: ${doctorName}, ${date}, ${selectedSlot}`;
      setMessage('Đặt lịch thành công. Lịch hẹn đã được ghi nhận trong tài khoản của bạn.');
      toast.success(successMessage);
      setSelectedSlot('');
      const refreshed = await api(`/doctors/${doctorId}/available-slots?date=${date}`);
      setSlots(refreshed.data || []);
    } catch (err) {
      const errorText = bookingErrorMessage(err);
      setError(errorText);
      toast.error(errorText);
    } finally {
      setBooking(false);
    }
  }

  if (error && !doctor) {
    return (
      <main className="container py-4">
        <div className="alert alert-danger">{error}</div>
      </main>
    );
  }

  if (!doctor) return <PageSkeleton label="Đang tải hồ sơ bác sĩ..." />;

  const experienceYears = doctor.experienceYears || 10;
  const averageRating = reviewData.summary.averageRating || doctor.ratingAverage || 0;
  const ratingCount = reviewData.summary.ratingCount || doctor.ratingCount || 0;
  const ratingText = ratingCount ? `${averageRating}/5` : 'Chưa có đánh giá';
  const doctorName = cleanDisplayText(doctor.name, 'Bác sĩ');
  const doctorDegree = cleanDisplayText(doctor.degree, '');
  const doctorTitle = doctorDegree ? `${doctorDegree} ${doctorName}` : doctorName;
  const doctorIntroduction =
    cleanDisplayText(doctor.description || doctor.bio, '') ||
    'Bác sĩ có kinh nghiệm thăm khám, tư vấn và theo dõi điều trị cho người bệnh theo từng nhu cầu sức khỏe cụ thể. Quy trình khám được xây dựng rõ ràng, giúp bệnh nhân yên tâm từ lúc đặt lịch đến khi hoàn tất buổi khám.';
  const workExperience = cleanDisplayText(doctor.workplace, '') || clinicName(doctor);
  const doctorPracticeAreas = practiceAreasForSpecialty(specialtyName(doctor));
  const highlights = [
    { icon: '⭐', value: ratingCount ? averageRating : '-', label: 'Đánh giá' },
    { icon: '👥', value: '500+', label: 'Lượt khám' },
    { icon: '💼', value: `${experienceYears}`, label: 'Năm kinh nghiệm' },
    { icon: '😊', value: '98%', label: 'Hài lòng' }
  ];
  const visitSteps = [
    { icon: '📅', title: 'Đặt lịch', description: 'Chọn ngày và khung giờ phù hợp.' },
    { icon: '☎', title: 'Xác nhận', description: 'Phòng khám xác nhận lịch hẹn.' },
    { icon: '🏥', title: 'Đến khám', description: 'Đến trước giờ khám để làm thủ tục.' },
    { icon: '✅', title: 'Hoàn thành', description: 'Bác sĩ hoàn tất buổi khám.' },
    { icon: '📋', title: 'Theo dõi', description: 'Xem lại lịch sử khám trong tài khoản.' }
  ];

  return (
    <main className="doctor-detail-page">
      <div className="container">
        <div className="doctor-detail-layout">
          <section className="doctor-detail-main">
            <div className="doctor-profile-hero">
              <div className="doctor-profile-hero-photo">
                <img
                  src={resolveMediaUrl(doctor.avatar, '/placeholder-doctor.svg')}
                  alt={doctorName}
                  onError={(event) => useImageFallback(event, '/placeholder-doctor.svg')}
                />
              </div>
              <div className="doctor-profile-hero-content">
                <span className="eyebrow">Hồ sơ bác sĩ</span>
                <h1>{doctorTitle}</h1>
                <p>Chuyên khoa {specialtyName(doctor)}</p>
                <div className="doctor-profile-hero-meta">
                  <span>⭐ {ratingText}</span>
                  <span>👥 500+ lượt khám</span>
                  <span>💼 {experienceYears} năm kinh nghiệm</span>
                </div>
                <div className="doctor-profile-hero-clinic">
                  <span>📍 {clinicName(doctor)}</span>
                  <strong>✔ Đang nhận lịch</strong>
                </div>
              </div>
            </div>

            <section className="doctor-highlights-card">
              <div>
                <span className="eyebrow">Điểm nổi bật</span>
                <h2>Năng lực và mức độ tin cậy</h2>
              </div>
              <div className="doctor-highlights-list">
                {highlights.map((item) => (
                  <div className="doctor-highlight-item" key={item.label}>
                    <span>{item.icon}</span>
                    <strong>{item.value}</strong>
                    <small>{item.label}</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="doctor-content-card">
              <span className="eyebrow">Giới thiệu bác sĩ</span>
              <h2>Thông tin chuyên môn</h2>
              <p>{doctorIntroduction}</p>
            </section>

            <section className="doctor-content-grid">
              <article className="doctor-content-card">
                <span className="eyebrow">Kinh nghiệm công tác</span>
                <h2>Quá trình làm việc</h2>
                <p>
                  {workExperience
                    ? `Hiện đang công tác tại ${workExperience}.`
                    : 'Thông tin kinh nghiệm công tác đang được cập nhật.'}
                </p>
                {doctor.position && <p>Chức vụ: {cleanDisplayText(doctor.position)}.</p>}
              </article>

              <article className="doctor-content-card">
                <span className="eyebrow">Lĩnh vực chuyên môn</span>
                <h2>Dịch vụ thăm khám</h2>
                <ul className="doctor-specialty-list">
                  {doctorPracticeAreas.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </section>

            <section className="doctor-content-card doctor-service-reference-section">
              <div className="doctor-service-reference-heading">
                <div>
                  <span className="eyebrow">Dịch vụ khám áp dụng</span>
                  <h2>Gói khám tham khảo</h2>
                  <p>
                    Gói khám giúp bạn tham khảo trước dịch vụ, chi phí và thời lượng. Bạn vẫn có thể đặt lịch trực tiếp
                    để bác sĩ tư vấn dịch vụ phù hợp khi thăm khám.
                  </p>
                </div>
              </div>
              <div className="doctor-service-package-grid">
                {servicePackages.length ? (
                  servicePackages.map((item) => (
                    <DoctorServicePackageCard doctorId={doctorId} item={item} key={item._id || item.id} />
                  ))
                ) : (
                  <DoctorServicePackageCard
                    doctorId={doctorId}
                    fallback
                    item={{
                      name: 'Khám theo tư vấn của bác sĩ',
                      description:
                        'Bạn có thể đặt lịch trước, bác sĩ sẽ tư vấn dịch vụ phù hợp khi thăm khám.',
                      durationMinutes: 30
                    }}
                  />
                )}
              </div>
            </section>

            <section className="doctor-process-card">
              <span className="eyebrow">Quy trình khám</span>
              <div className="doctor-process-timeline">
                {visitSteps.map((item) => (
                  <div className="doctor-process-step" key={item.title}>
                    <span>{item.icon}</span>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="doctor-reviews-card">
              <div className="doctor-reviews-heading">
                <div>
                  <span className="eyebrow">Đánh giá từ bệnh nhân</span>
                  <h2>⭐ {ratingCount ? averageRating : '0.0'}</h2>
                </div>
                <span>{ratingCount ? `${ratingCount} đánh giá` : 'Chưa có đánh giá'}</span>
              </div>
              {ratingCount > 0 && (
                <div className="doctor-rating-distribution">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviewData.summary.ratingDistribution?.[star] || 0;
                    const percent = ratingCount ? Math.round((count / ratingCount) * 100) : 0;
                    return (
                      <div className="doctor-rating-row" key={star}>
                        <span>{star} sao</span>
                        <div><i style={{ width: `${percent}%` }} /></div>
                        <strong>{count}</strong>
                      </div>
                    );
                  })}
                </div>
              )}
              {reviewData.reviews.length ? (
                <>
                  <div className="doctor-review-grid">
                    {reviewData.reviews.map((review) => (
                      <article className="doctor-review-card" key={review._id}>
                        <div className="doctor-review-card-head">
                          <strong>{patientDisplayName(review.patientId)}</strong>
                          <small>{formatReviewDate(review.createdAt)}</small>
                        </div>
                        <span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                        <p>{cleanDisplayText(review.comment, 'Bệnh nhân không để lại nhận xét.')}</p>
                      </article>
                    ))}
                  </div>
                  {reviewData.pagination.page < reviewData.pagination.totalPages && (
                    <button className="btn btn-outline-primary mt-3" disabled={loadingReviews} type="button" onClick={() => setReviewPage((page) => page + 1)}>
                      {loadingReviews ? 'Đang tải...' : 'Xem thêm đánh giá'}
                    </button>
                  )}
                </>
              ) : (
                <div className="doctor-review-empty">
                  Chưa có đánh giá nào
                </div>
              )}
            </section>
          </section>

          <aside className="doctor-booking-aside">
            <div className="booking-panel doctor-booking-panel">
              <span className="eyebrow">Đặt lịch khám</span>
              <h2>Chọn lịch khám phù hợp</h2>
              <p className="booking-panel-subtitle">Chọn ngày, khung giờ còn trống và gửi yêu cầu đặt lịch.</p>
              {message && <div className="alert alert-success">{message}</div>}
              {error && <div className="alert alert-danger">{error}</div>}

              <label className="form-label">Ngày khám</label>
              <input
                className="form-control form-control-lg mb-3"
                min={today}
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />

              <div className="slot-legend">
                <span><i className="available" /> Còn trống</span>
                <span><i className="selected" /> Đang chọn</span>
                <span><i className="booked" /> Đã đặt</span>
              </div>

              <div className="slot-grid mb-3">
                {loadingSlots && <span className="text-secondary">Đang tải khung giờ...</span>}
                {!loadingSlots &&
                  slots.map((slot) => {
                    const waitingEntry = waitingEntryForSlot(slot.timeSlot);
                    const canJoinWaitingList = typeof slot.canJoinWaitingList === 'boolean'
                      ? slot.canJoinWaitingList
                      : !slot.available && slot.label === 'Đã có người đặt';

                    if (slot.available) {
                      return (
                        <button
                          className={`slot-button slot-available ${selectedSlot === slot.timeSlot ? 'slot-selected' : ''}`}
                          key={slot.timeSlot}
                          type="button"
                          onClick={() => selectSlot(slot)}
                        >
                          <strong>{slot.timeSlot}</strong>
                          <span>{slot.label}</span>
                        </button>
                      );
                    }

                    return (
                      <div className="slot-button slot-booked waiting-slot-card" key={slot.timeSlot}>
                        <strong>{slot.timeSlot}</strong>
                        <span>{slot.label}</span>
                        {canJoinWaitingList && (
                          waitingEntry ? (
                            <span className="waiting-slot-position">Đang chờ (#{waitingEntry.position})</span>
                          ) : (
                            <button
                              className="waiting-slot-action"
                              disabled={joiningSlot === slot.timeSlot}
                              type="button"
                              onClick={() => joinWaitingList(slot)}
                            >
                              {joiningSlot === slot.timeSlot ? 'Đang thêm...' : 'Tham gia danh sách chờ'}
                            </button>
                          )
                        )}
                      </div>
                    );
                  })}
                {!loadingSlots && !slots.length && <span className="text-secondary">Không có khung giờ khám.</span>}
              </div>

              {selectedSlot && (
                <div className="selected-slot-card">
                  <span className="eyebrow">Bạn đã chọn</span>
                  <div>
                    <strong>Ngày</strong>
                    <span>{date}</span>
                  </div>
                  <div>
                    <strong>Khung giờ</strong>
                    <span>{selectedSlot}</span>
                  </div>
                </div>
              )}

              <label className="form-label">Lý do khám</label>
              <textarea
                className="form-control mb-3"
                rows="4"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Nhập triệu chứng hoặc nhu cầu khám"
              />
              <button className="btn doctor-booking-submit" type="button" onClick={book} disabled={booking}>
                {booking ? 'Đang đặt lịch...' : 'Đặt lịch khám'}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

