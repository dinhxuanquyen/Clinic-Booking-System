import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { cleanDisplayText } from '../utils/textEncoding.js';

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function getName(value, fallback = 'Đang cập nhật') {
  if (!value) return fallback;
  return cleanDisplayText(typeof value === 'object' ? value.name || fallback : String(value), fallback);
}

function PackageCard({ item }) {
  const targetPatients = Array.isArray(item.targetPatients) ? item.targetPatients.slice(0, 4) : [];
  const includes = Array.isArray(item.includes) ? item.includes.slice(0, 5) : [];

  return (
    <article className="service-package-card service-package-doctor-card">
      <div className="service-package-card-top">
        <span className="service-package-code">{item.code}</span>
        <span className={`service-package-scope ${item.scope === 'doctor' ? 'doctor' : 'common'}`}>
          {item.scope === 'doctor' ? 'Gói riêng của tôi' : 'Gói chung chuyên khoa'}
        </span>
      </div>
      <h2>{cleanDisplayText(item.name, 'Gói khám')}</h2>
      <p>{cleanDisplayText(item.description, 'Gói khám đang được áp dụng cho lịch đặt khám.')}</p>
      <div className="service-package-meta">
        <span>{formatCurrency(item.price)}</span>
        <span>{item.durationMinutes} phút</span>
      </div>
      <div className="service-package-applies">
        <span>{getName(item.clinicId, 'Cơ sở')}</span>
        <span>{getName(item.specialtyId, 'Chuyên khoa')}</span>
      </div>
      {targetPatients.length > 0 && (
        <div className="service-package-card-list">
          <strong>Phù hợp với</strong>
          {targetPatients.map((text) => <span key={text}>• {cleanDisplayText(text)}</span>)}
        </div>
      )}
      {includes.length > 0 && (
        <div className="service-package-card-list">
          <strong>Bao gồm</strong>
          {includes.map((text) => <span key={text}>✓ {cleanDisplayText(text)}</span>)}
        </div>
      )}
      <div className="service-package-payment-note">Thanh toán tại phòng khám</div>
    </article>
  );
}

function PackageSection({ title, subtitle, items }) {
  return (
    <section className="doctor-content-card service-package-table-card">
      <div className="service-package-section-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span>{items.length} gói</span>
      </div>
      {items.length ? (
        <div className="service-package-doctor-grid">
          {items.map((item) => <PackageCard item={item} key={item._id} />)}
        </div>
      ) : (
        <div className="admin-empty-state">
          <h3>Chưa có gói khám</h3>
          <p>Gói khám sẽ hiển thị khi admin cấu hình cho chuyên khoa hoặc riêng bác sĩ.</p>
        </div>
      )}
    </section>
  );
}

export default function DoctorServicePackagesPage() {
  const toast = useToast();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api('/doctor/service-packages')
      .then((payload) => setPackages(payload.data || []))
      .catch((error) => toast.error(error.message || 'Không tải được gói khám áp dụng'))
      .finally(() => setLoading(false));
  }, [toast]);

  const grouped = useMemo(() => ({
    common: packages.filter((item) => item.scope !== 'doctor'),
    doctor: packages.filter((item) => item.scope === 'doctor')
  }), [packages]);

  return (
    <div className="doctor-page doctor-service-packages-page">
      <div className="doctor-page-header">
        <div className="doctor-page-header-main">
          <p className="doctor-page-eyebrow">Dịch vụ áp dụng</p>
          <h1 className="doctor-page-title">Gói khám áp dụng</h1>
          <p className="doctor-page-subtitle">Theo dõi các gói khám bệnh nhân có thể chọn khi đặt lịch với bạn.</p>
        </div>
      </div>

      {loading ? (
        <section className="doctor-content-card doctor-loading-card">Đang tải gói khám...</section>
      ) : (
        <>
          <PackageSection
            title="Gói chung chuyên khoa"
            subtitle="Các gói áp dụng cho toàn bộ bác sĩ trong cùng chuyên khoa tại cơ sở."
            items={grouped.common}
          />
          <PackageSection
            title="Gói riêng của tôi"
            subtitle="Các dịch vụ chuyên sâu được gắn trực tiếp với hồ sơ bác sĩ của bạn."
            items={grouped.doctor}
          />
        </>
      )}
    </div>
  );
}
