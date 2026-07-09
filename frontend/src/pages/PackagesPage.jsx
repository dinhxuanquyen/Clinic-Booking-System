import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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

function objectId(value) {
  return typeof value === 'object' ? value?._id : value;
}

function valueName(value, fallback = 'Đang cập nhật') {
  if (!value) return fallback;
  return cleanDisplayText(typeof value === 'object' ? value.name : value, fallback);
}

function PackageCard({ item }) {
  const targetPatients = Array.isArray(item.targetPatients) ? item.targetPatients.slice(0, 3) : [];
  const includes = Array.isArray(item.includes) ? item.includes.slice(0, 4) : [];

  return (
    <article className="public-package-card">
      <div className="public-package-card-head">
        <span>{cleanDisplayText(item.code, 'Gói khám')}</span>
        {item.doctorId && <em>Gói riêng bác sĩ</em>}
      </div>
      <h2>{cleanDisplayText(item.name, 'Gói khám')}</h2>
      <p>{cleanDisplayText(item.description, 'Dịch vụ khám chuyên khoa tại phòng khám.')}</p>

      <div className="public-package-meta">
        <strong>{formatCurrency(item.price)}</strong>
        <span>{item.durationMinutes || 30} phút</span>
      </div>

      {targetPatients.length > 0 && (
        <div className="public-package-list">
          <b>Phù hợp với</b>
          {targetPatients.map((text) => <small key={text}>{cleanDisplayText(text)}</small>)}
        </div>
      )}

      {includes.length > 0 && (
        <div className="public-package-list">
          <b>Bao gồm</b>
          {includes.map((text) => <small key={text}>✓ {cleanDisplayText(text)}</small>)}
        </div>
      )}

      <div className="public-package-footer">
        <span>{valueName(item.specialtyId, 'Chuyên khoa')}</span>
        <Link className="btn btn-outline-primary rounded-pill" to={`/packages/${item._id}`}>
          Xem chi tiết
        </Link>
      </div>
    </article>
  );
}

export default function PackagesPage() {
  const [search, setSearch] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');

  const { data: packages = [], isLoading: loading, error } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const res = await api('/service-packages');
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000 // Cache cho 5 phút
  });

  const specialties = useMemo(() => {
    const map = new Map();
    packages.forEach((item) => {
      const id = objectId(item.specialtyId);
      if (id) map.set(id, valueName(item.specialtyId, 'Chuyên khoa'));
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [packages]);

  const visiblePackages = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return packages.filter((item) => {
      const matchesSpecialty = !specialtyId || objectId(item.specialtyId) === specialtyId;
      const haystack = [
        item.name,
        item.code,
        item.description,
        valueName(item.specialtyId, ''),
        valueName(item.clinicId, ''),
        valueName(item.doctorId, '')
      ].join(' ').toLowerCase();
      return matchesSpecialty && (!keyword || haystack.includes(keyword));
    });
  }, [packages, search, specialtyId]);

  if (loading) return <PageSkeleton minHeight="560px" />;

  return (
    <div className="public-page packages-page">
      <section className="packages-hero">
        <span className="eyebrow">Dịch vụ y tế</span>
        <h1>Gói khám tại Clinic Booking</h1>
        <p>
          Tham khảo các gói khám theo chuyên khoa, giá dự kiến và nội dung dịch vụ trước khi đặt lịch.
          Việc chọn gói là tùy chọn, bạn vẫn có thể đặt lịch khám tiêu chuẩn.
        </p>
      </section>

      <section className="packages-filter-card">
        <label>
          Tìm gói khám
          <input
            className="form-control"
            placeholder="Nhập tên gói, chuyên khoa hoặc cơ sở"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          Chuyên khoa
          <select className="form-select" value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value)}>
            <option value="">Tất cả chuyên khoa</option>
            {specialties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </section>

      {error && <div className="alert alert-danger">{error}</div>}

      {!error && visiblePackages.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3 className="empty-state-title">Chưa có gói khám phù hợp</h3>
          <p className="empty-state-desc">Bạn có thể đổi bộ lọc hoặc đặt lịch khám tiêu chuẩn.</p>
          <Link className="btn btn-primary" to="/booking">Đặt lịch khám</Link>
        </div>
      )}

      {!error && visiblePackages.length > 0 && (
        <section className="public-package-grid">
          {visiblePackages.map((item) => <PackageCard item={item} key={item._id} />)}
        </section>
      )}
    </div>
  );
}
