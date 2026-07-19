import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import PageSkeleton from '../components/PageSkeleton.jsx';
import { cleanDisplayText } from '../utils/textEncoding.js';
import { DEFAULT_PACKAGE_IMAGE, getPackageVisual } from './PackagesPage.jsx';

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function valueName(value, fallback = 'Đang cập nhật') {
  if (!value) return fallback;
  return cleanDisplayText(typeof value === 'object' ? value.name : value, fallback);
}

function compactList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function ServiceList({ title, items, emptyText, numbered = false }) {
  const values = compactList(items);
  return (
    <section className="package-detail-service-section">
      <h2>{title}</h2>
      {values.length ? (
        <ul className={numbered ? 'package-detail-numbered-list' : 'package-detail-check-list'}>
          {values.map((item, index) => (
            <li key={`${item}-${index}`}>
              {numbered && <span>{String(index + 1).padStart(2, '0')}</span>}
              <strong>{cleanDisplayText(item)}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p>{emptyText}</p>
      )}
    </section>
  );
}

export default function PackageDetailPage() {
  const { id } = useParams();
  const [servicePackage, setServicePackage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api(`/service-packages/${id}`)
      .then((payload) => {
        if (mounted) setServicePackage(payload.data);
      })
      .catch((err) => {
        if (mounted) setError(cleanDisplayText(err.message, 'Không thể tải chi tiết gói khám'));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <PageSkeleton minHeight="560px" />;

  if (error || !servicePackage) {
    return (
      <div className="public-page packages-page">
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3 className="empty-state-title">Không tìm thấy gói khám</h3>
          <p className="empty-state-desc">{error || 'Gói khám không khả dụng hoặc đã tạm ngưng.'}</p>
          <Link className="btn btn-primary" to="/packages">Quay lại danh sách gói khám</Link>
        </div>
      </div>
    );
  }

  const bookingUrl = `/booking?packageId=${servicePackage._id}`;
  const visual = getPackageVisual(servicePackage);
  const packageName = cleanDisplayText(servicePackage.name, 'Gói khám');
  const packageDescription = cleanDisplayText(servicePackage.description, 'Dịch vụ khám chuyên khoa tại phòng khám.');
  const packageCode = cleanDisplayText(servicePackage.code, 'STANDARD');
  const clinicName = valueName(servicePackage.clinicId, 'Cơ sở');
  const specialtyName = valueName(servicePackage.specialtyId, 'Chuyên khoa');
  const doctorName = valueName(servicePackage.doctorId, 'Áp dụng chung');
  const duration = servicePackage.durationMinutes || 30;

  return (
    <div className="public-page package-detail-page package-detail-page-market">
      <nav className="package-detail-breadcrumb" aria-label="Điều hướng gói khám">
        <Link to="/">Trang chủ</Link>
        <span>/</span>
        <Link to="/packages">Gói khám</Link>
        <span>/</span>
        <strong>{packageName}</strong>
      </nav>

      <section className="package-detail-summary-hero">
        <div className="package-detail-summary-copy">
          <span className="package-detail-specialty-badge">{specialtyName}</span>
          <h1>{packageName}</h1>
          <p>{packageDescription}</p>

          <div className="package-detail-key-facts">
            <span>{duration} phút</span>
            <span>{clinicName}</span>
            <span>{doctorName}</span>
          </div>

          <div className="package-detail-hero-price">
            <span>Giá tham khảo</span>
            <strong>{formatCurrency(servicePackage.price)}</strong>
          </div>

          <div className="package-detail-hero-actions">
            <Link className="btn btn-primary rounded-pill" to={bookingUrl}>Đặt lịch với gói này</Link>
            <Link className="btn btn-outline-primary rounded-pill" to="/booking">Để bác sĩ tư vấn</Link>
          </div>
        </div>

        <div className="package-detail-summary-media">
          <img
            src={visual.image}
            alt={packageName}
            loading="lazy"
            onError={(event) => {
              if (event.currentTarget.src !== DEFAULT_PACKAGE_IMAGE) {
                event.currentTarget.src = DEFAULT_PACKAGE_IMAGE;
              }
            }}
          />
        </div>
      </section>

      <div className="package-detail-content-layout">
        <main className="package-detail-content-main">
          <section className="package-detail-content-card" id="tong-quan">
            <span className="eyebrow">Tổng quan</span>
            <h2>Thông tin gói khám</h2>
            <dl className="package-detail-definition-grid">
              <div><dt>Cơ sở</dt><dd>{clinicName}</dd></div>
              <div><dt>Chuyên khoa</dt><dd>{specialtyName}</dd></div>
              <div><dt>Bác sĩ / phạm vi</dt><dd>{doctorName}</dd></div>
              <div><dt>Thời lượng</dt><dd>{duration} phút</dd></div>
              <div><dt>Thanh toán</dt><dd>Tại phòng khám</dd></div>
              <div><dt>Mã gói</dt><dd>{packageCode}</dd></div>
            </dl>
          </section>

          <ServiceList
            title="Gói khám này phù hợp với ai?"
            items={servicePackage.targetPatients}
            emptyText="Phù hợp với người bệnh cần thăm khám và tư vấn chuyên khoa."
          />

          <ServiceList
            title="Gói khám bao gồm"
            items={servicePackage.includes}
            emptyText="Nội dung gói sẽ được phòng khám tư vấn chi tiết khi đặt lịch."
            numbered
          />

          <section className="package-detail-content-card package-detail-note-card" id="luu-y">
            <span className="eyebrow">Lưu ý trước khi đặt lịch</span>
            <h2>Giá gói là thông tin tham khảo</h2>
            <p>
              Sau khi thăm khám, bác sĩ có thể tư vấn lại dịch vụ phù hợp hơn dựa trên triệu chứng, tiền sử và tình
              trạng thực tế của người bệnh.
            </p>
            <div className="package-detail-step-strip">
              <span><b>01</b> Chọn gói</span>
              <span><b>02</b> Chọn thời gian</span>
              <span><b>03</b> Đến phòng khám</span>
            </div>
          </section>
        </main>

        <aside className="package-booking-summary" aria-label="Thông tin đặt khám">
          <span className="eyebrow">Thông tin đặt khám</span>
          <strong>{formatCurrency(servicePackage.price)}</strong>
          <small>Giá tham khảo</small>
          <dl>
            <div><dt>Cơ sở</dt><dd>{clinicName}</dd></div>
            <div><dt>Chuyên khoa</dt><dd>{specialtyName}</dd></div>
            <div><dt>Bác sĩ</dt><dd>{doctorName}</dd></div>
            <div><dt>Thời lượng</dt><dd>{duration} phút</dd></div>
            <div><dt>Thanh toán</dt><dd>Tại phòng khám</dd></div>
          </dl>
          <Link className="btn btn-primary rounded-pill" to={bookingUrl}>Đặt lịch ngay</Link>
          <Link className="btn btn-outline-primary rounded-pill" to="/booking">Để bác sĩ tư vấn</Link>
          <p>Không bắt buộc thanh toán online khi đặt lịch.</p>
        </aside>
      </div>
    </div>
  );
}
