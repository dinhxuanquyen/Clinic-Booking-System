import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import PageSkeleton from '../components/PageSkeleton.jsx';
import { cleanDisplayText } from '../utils/textEncoding.js';

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

function InfoList({ title, items, emptyText, variant = 'default' }) {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  return (
    <section className={`package-detail-section package-detail-section-${variant}`}>
      <div className="package-detail-section-title">
        <span>{variant === 'includes' ? '✓' : 'i'}</span>
        <h2>{title}</h2>
      </div>
      {values.length ? (
        <ul>
          {values.map((item) => <li key={item}>{cleanDisplayText(item)}</li>)}
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

  return (
    <div className="public-page package-detail-page package-detail-page-pro">
      <section className="package-detail-hero package-detail-hero-pro">
        <div className="package-detail-hero-copy">
          <Link className="package-detail-back-link" to="/packages">← Quay lại danh sách gói khám</Link>
          <span className="eyebrow">Chi tiết gói khám</span>
          <h1>{cleanDisplayText(servicePackage.name, 'Gói khám')}</h1>
          <p>{cleanDisplayText(servicePackage.description, 'Dịch vụ khám chuyên khoa tại phòng khám.')}</p>
          <div className="package-detail-trust-row">
            <span>Thanh toán tại phòng khám</span>
            <span>Tư vấn trước khi thực hiện</span>
            <span>Không bắt buộc khi đặt lịch</span>
          </div>
        </div>

        <aside className="package-detail-price-card package-detail-price-card-pro">
          <span>Giá tham khảo</span>
          <strong>{formatCurrency(servicePackage.price)}</strong>
          <em>{servicePackage.durationMinutes || 30} phút</em>
          <Link className="btn btn-primary rounded-pill" to={bookingUrl}>
            Đặt lịch với gói này
          </Link>
          <Link className="btn btn-outline-primary rounded-pill" to="/booking">
            Để bác sĩ tư vấn
          </Link>
          <small>Giá có thể được phòng khám tư vấn lại theo tình trạng thực tế.</small>
        </aside>
      </section>

      <section className="package-detail-info-grid package-detail-info-grid-pro">
        <div><span>Mã gói</span><strong>{cleanDisplayText(servicePackage.code, 'STANDARD')}</strong></div>
        <div><span>Cơ sở</span><strong>{valueName(servicePackage.clinicId, 'Cơ sở')}</strong></div>
        <div><span>Chuyên khoa</span><strong>{valueName(servicePackage.specialtyId, 'Chuyên khoa')}</strong></div>
        <div><span>Bác sĩ</span><strong>{valueName(servicePackage.doctorId, 'Áp dụng chung')}</strong></div>
      </section>

      <div className="package-detail-content-grid package-detail-content-grid-pro">
        <InfoList
          title="Phù hợp với ai"
          items={servicePackage.targetPatients}
          emptyText="Phù hợp với người bệnh cần thăm khám và tư vấn chuyên khoa."
        />
        <InfoList
          title="Gói khám bao gồm"
          items={servicePackage.includes}
          emptyText="Nội dung gói sẽ được phòng khám tư vấn chi tiết khi đặt lịch."
          variant="includes"
        />
      </div>

      <section className="package-detail-note package-detail-note-pro">
        <div>
          <span className="eyebrow">Lưu ý khi đặt lịch</span>
          <h2>Gói khám là thông tin tham khảo, không thay thế chỉ định của bác sĩ</h2>
          <p>
            Người bệnh có thể đặt lịch với gói này hoặc chọn khám theo tư vấn. Sau khi thăm khám, bác sĩ có thể
            đề xuất dịch vụ phù hợp hơn dựa trên triệu chứng, tiền sử và kết quả kiểm tra thực tế.
          </p>
        </div>
        <Link className="btn btn-primary rounded-pill" to={bookingUrl}>Đặt lịch ngay</Link>
      </section>
    </div>
  );
}
