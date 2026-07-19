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

function listOf(value, limit = 3) {
  return Array.isArray(value) ? value.filter(Boolean).slice(0, limit) : [];
}

const PACKAGE_VISUALS = [
  {
    keys: ['nhi', 'tre em', 'pediatric'],
    image: 'https://images.unsplash.com/photo-1581056771107-24ca5f033842?auto=format&fit=crop&w=900&q=82',
    tone: 'pediatric'
  },
  {
    keys: ['tim', 'mach', 'huyet ap', 'cardio'],
    image: 'https://images.unsplash.com/photo-1628348070889-cb656235b4eb?auto=format&fit=crop&w=900&q=82',
    tone: 'cardio'
  },
  {
    keys: ['da lieu', 'da', 'derma'],
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=82',
    tone: 'derma'
  },
  {
    keys: ['tai mui hong', 'tai', 'mui', 'hong', 'ent'],
    image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=900&q=82',
    tone: 'ent'
  },
  {
    keys: ['san phu', 'phu khoa', 'ivf', 'thai', 'me be'],
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&q=82',
    tone: 'women'
  },
  {
    keys: ['mat', 'nhan khoa', 'eye'],
    image: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=900&q=82',
    tone: 'eye'
  },
  {
    keys: ['co xuong khop', 'xuong', 'khop', 'chan thuong', 'ortho'],
    image: 'https://images.unsplash.com/photo-1612776572997-76cc42e058c3?auto=format&fit=crop&w=900&q=82',
    tone: 'ortho'
  },
  {
    keys: ['tong quat', 'suc khoe', 'noi tong quat', 'general'],
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=82',
    tone: 'general'
  }
];

const DEFAULT_PACKAGE_VISUAL = {
  image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=900&q=82',
  tone: 'general'
};

function normalizeSearchText(value) {
  return cleanDisplayText(value || '', '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function packageImageUrl(item) {
  return item.imageUrl || item.coverImage || item.thumbnailUrl || item.bannerUrl || item.image || '';
}

export function getPackageVisual(item) {
  const explicitImage = packageImageUrl(item);
  if (explicitImage) {
    return { image: explicitImage, tone: 'custom' };
  }

  const haystack = normalizeSearchText([
    item.name,
    item.description,
    valueName(item.specialtyId, ''),
    valueName(item.clinicId, ''),
    ...(Array.isArray(item.targetPatients) ? item.targetPatients : []),
    ...(Array.isArray(item.includes) ? item.includes : [])
  ].join(' '));

  return PACKAGE_VISUALS.find((visual) => visual.keys.some((key) => haystack.includes(key))) || DEFAULT_PACKAGE_VISUAL;
}

function PackageCard({ item }) {
  const targetPatients = listOf(item.targetPatients, 3);
  const includes = listOf(item.includes, 3);
  const isDoctorPackage = Boolean(item.doctorId);
  const visual = getPackageVisual(item);

  return (
    <article className={`public-package-card public-package-card-pro public-package-card-visual-${visual.tone}`}>
      <div className="public-package-media" style={{ backgroundImage: `url("${visual.image}")` }}>
        <div className="public-package-media-overlay">
          <span>{valueName(item.specialtyId, 'ChuyÃªn khoa')}</span>
          <strong>{cleanDisplayText(item.name, 'GÃ³i khÃ¡m')}</strong>
        </div>
      </div>

      <div className="public-package-card-ribbon">
        <span>{cleanDisplayText(item.code, 'Gói khám')}</span>
        <em>{isDoctorPackage ? 'Gói riêng bác sĩ' : 'Áp dụng chung'}</em>
      </div>

      <div className="public-package-card-main">
        <div>
          <p className="public-package-specialty">{valueName(item.specialtyId, 'Chuyên khoa')}</p>
          <h2>{cleanDisplayText(item.name, 'Gói khám')}</h2>
          <p>{cleanDisplayText(item.description, 'Dịch vụ khám chuyên khoa tại phòng khám.')}</p>
        </div>

        <div className="public-package-price-box">
          <strong>{formatCurrency(item.price)}</strong>
          <span>{item.durationMinutes || 30} phút</span>
        </div>
      </div>

      <div className="public-package-highlight-grid">
        <div>
          <span>Cơ sở</span>
          <strong>{valueName(item.clinicId, 'Cơ sở')}</strong>
        </div>
        <div>
          <span>Thanh toán</span>
          <strong>Tại phòng khám</strong>
        </div>
      </div>

      {(targetPatients.length > 0 || includes.length > 0) && (
        <div className="public-package-mini-sections">
          {targetPatients.length > 0 && (
            <div>
              <b>Phù hợp với</b>
              {targetPatients.map((text) => <small key={text}>{cleanDisplayText(text)}</small>)}
            </div>
          )}
          {includes.length > 0 && (
            <div>
              <b>Bao gồm</b>
              {includes.map((text) => <small key={text}>{cleanDisplayText(text)}</small>)}
            </div>
          )}
        </div>
      )}

      <div className="public-package-footer public-package-footer-pro">
        <Link className="btn btn-outline-primary rounded-pill" to={`/packages/${item._id}`}>
          Xem chi tiết
        </Link>
        <Link className="btn btn-primary rounded-pill" to={`/booking?packageId=${item._id}`}>
          Đặt lịch
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
    staleTime: 5 * 60 * 1000
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
        valueName(item.doctorId, ''),
        ...(Array.isArray(item.targetPatients) ? item.targetPatients : []),
        ...(Array.isArray(item.includes) ? item.includes : [])
      ].join(' ').toLowerCase();
      return matchesSpecialty && (!keyword || haystack.includes(keyword));
    });
  }, [packages, search, specialtyId]);

  const packageStats = useMemo(() => {
    const prices = packages.map((item) => Number(item.price || 0)).filter(Boolean);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    return {
      total: packages.length,
      specialties: specialties.length,
      minPrice
    };
  }, [packages, specialties.length]);

  if (loading) return <PageSkeleton minHeight="560px" />;

  return (
    <div className="public-page packages-page packages-page-pro">
      <section className="packages-hero packages-hero-pro">
        <div>
          <span className="eyebrow">Dịch vụ y tế</span>
          <h1>Gói khám minh bạch, dễ chọn trước khi đặt lịch</h1>
          <p>
            Tham khảo giá, thời lượng và nội dung dịch vụ theo từng chuyên khoa. Bạn có thể chọn gói ngay
            hoặc để bác sĩ tư vấn khi thăm khám.
          </p>
          <div className="packages-hero-actions">
            <Link className="btn btn-primary rounded-pill" to="/booking">Đặt lịch khám</Link>
            <Link className="btn btn-outline-primary rounded-pill" to="/symptom-checker">Tư vấn triệu chứng AI</Link>
          </div>
        </div>
        <aside className="packages-hero-stat-card">
          <strong>{packageStats.total}</strong>
          <span>gói khám đang áp dụng</span>
          <small>{packageStats.specialties} chuyên khoa hỗ trợ</small>
          {packageStats.minPrice > 0 && <em>Từ {formatCurrency(packageStats.minPrice)}</em>}
        </aside>
      </section>

      <section className="packages-filter-card packages-filter-card-pro">
        <div className="packages-filter-title">
          <h2>Tìm gói khám phù hợp</h2>
          <p>Lọc nhanh theo triệu chứng, tên dịch vụ hoặc chuyên khoa.</p>
        </div>
        <label>
          Từ khóa
          <input
            className="form-control"
            placeholder="Ví dụ: tai mũi họng, tái khám, dinh dưỡng..."
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

      {error && <div className="alert alert-danger">{cleanDisplayText(error.message || error, 'Không thể tải gói khám')}</div>}

      {!error && visiblePackages.length === 0 && (
        <div className="empty-state packages-empty-state">
          <div className="empty-state-icon">📋</div>
          <h3 className="empty-state-title">Chưa có gói khám phù hợp</h3>
          <p className="empty-state-desc">Bạn có thể đổi bộ lọc hoặc đặt lịch khám để bác sĩ tư vấn dịch vụ phù hợp.</p>
          <Link className="btn btn-primary" to="/booking">Đặt lịch khám</Link>
        </div>
      )}

      {!error && visiblePackages.length > 0 && (
        <>
          <div className="packages-result-heading">
            <div>
              <span className="eyebrow">Danh sách dịch vụ</span>
              <h2>{visiblePackages.length} gói khám phù hợp</h2>
            </div>
            <p>Giá là thông tin tham khảo, thanh toán trực tiếp tại phòng khám.</p>
          </div>
          <section className="public-package-grid public-package-grid-pro">
            {visiblePackages.map((item) => <PackageCard item={item} key={item._id} />)}
          </section>
        </>
      )}
    </div>
  );
}
