import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import PageSkeleton from '../components/PageSkeleton.jsx';
import { cleanDisplayText } from '../utils/textEncoding.js';
import { getPackageVisual } from './PackagesPage.jsx';

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
  const visual = getPackageVisual(servicePackage);
  const packageName = cleanDisplayText(servicePackage.name, 'Gói khám');
  const packageDescription = cleanDisplayText(servicePackage.description, 'Dịch vụ khám chuyên khoa tại phòng khám.');
  const packageCode = cleanDisplayText(servicePackage.code, 'STANDARD');
  const clinicName = valueName(servicePackage.clinicId, 'Cơ sở');
  const specialtyName = valueName(servicePackage.specialtyId, 'Chuyên khoa');
  const doctorName = valueName(servicePackage.doctorId, 'Áp dụng chung');
  const targetPatients = Array.isArray(servicePackage.targetPatients)
    ? servicePackage.targetPatients.filter(Boolean)
    : [];
  const includes = Array.isArray(servicePackage.includes)
    ? servicePackage.includes.filter(Boolean)
    : [];

  return (
    <div className="public-page package-detail-page package-detail-page-pro package-detail-page-mec">
      <div className="package-detail-shell-mec">
        <Link className="package-detail-back-link package-detail-back-link-mec" to="/packages">
          ← Quay lại danh sách gói khám
        </Link>

        <section className="package-detail-banner-mec" style={{ backgroundImage: `url("${visual.image}")` }}>
          <div className="package-detail-banner-content-mec">
            <span>{specialtyName}</span>
            <h1>{packageName}</h1>
          </div>
        </section>

        <section className="package-detail-title-band-mec">
          <span className="eyebrow">Dịch vụ y tế</span>
          <h2>{packageName}</h2>
          <p>{packageDescription}</p>
        </section>

        <div className="package-detail-layout-mec">
          <aside className="package-detail-sidebar-mec" aria-label="Điều hướng nội dung gói khám">
            <nav>
              <a href="#gioi-thieu">Giới thiệu tổng quan</a>
              <a href="#thong-tin">Thông tin gói khám</a>
              <a href="#chi-tiet">Chi tiết dịch vụ</a>
              <a href="#dang-ky">Đăng ký dịch vụ</a>
            </nav>

            <div className="package-detail-sidebar-price-mec">
              <span>Giá tham khảo</span>
              <strong>{formatCurrency(servicePackage.price)}</strong>
              <em>{servicePackage.durationMinutes || 30} phút</em>
            </div>

            <div className="package-detail-sidebar-actions-mec">
              <Link className="btn btn-primary rounded-pill" to={bookingUrl}>
                Đặt lịch với gói này
              </Link>
              <Link className="btn btn-outline-primary rounded-pill" to="/booking">
                Để bác sĩ tư vấn
              </Link>
            </div>
          </aside>

          <main className="package-detail-main-mec">
            <section id="gioi-thieu" className="package-detail-panel-mec package-detail-intro-mec">
              <span className="eyebrow">Giới thiệu tổng quan</span>
              <h2>{packageName}</h2>
              <p>{packageDescription}</p>
              <div className="package-detail-trust-row package-detail-trust-row-mec">
                <span>Thanh toán tại phòng khám</span>
                <span>Tư vấn trước khi thực hiện</span>
                <span>Không bắt buộc khi đặt lịch</span>
              </div>
            </section>

            <section id="thong-tin" className="package-detail-panel-mec">
              <span className="eyebrow">Thông tin gói khám</span>
              <h2>Thông tin áp dụng</h2>
              <div className="package-detail-info-grid package-detail-info-grid-pro package-detail-info-grid-mec">
                <div><span>Mã gói</span><strong>{packageCode}</strong></div>
                <div><span>Cơ sở</span><strong>{clinicName}</strong></div>
                <div><span>Chuyên khoa</span><strong>{specialtyName}</strong></div>
                <div><span>Bác sĩ</span><strong>{doctorName}</strong></div>
                <div><span>Thời lượng</span><strong>{servicePackage.durationMinutes || 30} phút</strong></div>
                <div><span>Thanh toán</span><strong>Tại phòng khám</strong></div>
              </div>
            </section>

            <section id="chi-tiet" className="package-detail-panel-mec">
              <span className="eyebrow">Chi tiết dịch vụ</span>
              <h2>Nội dung gói khám</h2>
              <div className="package-detail-detail-grid-mec">
                <InfoList
                  title="Phù hợp với ai"
                  items={targetPatients}
                  emptyText="Phù hợp với người bệnh cần thăm khám và tư vấn chuyên khoa."
                />
                <InfoList
                  title="Gói khám bao gồm"
                  items={includes}
                  emptyText="Nội dung gói sẽ được phòng khám tư vấn chi tiết khi đặt lịch."
                  variant="includes"
                />
              </div>
            </section>

            <section id="dang-ky" className="package-detail-panel-mec package-detail-registration-mec">
              <span className="eyebrow">Đăng ký dịch vụ</span>
              <h2>Lưu ý trước khi đặt lịch</h2>
              <p>
                Giá gói khám là thông tin tham khảo. Sau khi thăm khám, bác sĩ có thể tư vấn lại dịch vụ phù hợp hơn
                dựa trên triệu chứng, tiền sử và tình trạng thực tế của người bệnh.
              </p>
              <div className="package-detail-step-grid-mec">
                <div><span>01</span><strong>Chọn gói khám</strong><small>Xem thông tin dịch vụ và phạm vi áp dụng.</small></div>
                <div><span>02</span><strong>Đặt lịch</strong><small>Chọn thời gian khám phù hợp với lịch trống.</small></div>
                <div><span>03</span><strong>Đến phòng khám</strong><small>Thanh toán và thực hiện theo tư vấn bác sĩ.</small></div>
              </div>
              <Link className="btn btn-primary rounded-pill" to={bookingUrl}>Đặt lịch ngay</Link>
            </section>
          </main>
        </div>
      </div>
    </div>
  );

  /*
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

        <div className="package-detail-visual-card" style={{ backgroundImage: `url("${visual.image}")` }}>
          <div>
            <span>{valueName(servicePackage.specialtyId, 'ChuyÃªn khoa')}</span>
            <strong>{cleanDisplayText(servicePackage.name, 'GÃ³i khÃ¡m')}</strong>
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
  */
}
