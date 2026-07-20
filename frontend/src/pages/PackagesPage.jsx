import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import PageSkeleton from '../components/PageSkeleton.jsx';
import { resolveMediaUrl } from '../utils/media.js';
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
    keys: ['da lieu', 'derma'],
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=82',
    tone: 'derma'
  },
  {
    keys: ['tai mui hong', 'tmh', 'ent'],
    image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=900&q=82',
    tone: 'ent'
  },
  {
    keys: ['san phu', 'phu khoa', 'ivf', 'thai', 'me be'],
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&q=82',
    tone: 'women'
  },
  {
    keys: ['nhan khoa', 'mat', 'eye'],
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

export const DEFAULT_PACKAGE_IMAGE = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=82';

const DEFAULT_PACKAGE_VISUAL = {
  image: DEFAULT_PACKAGE_IMAGE,
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
    return { image: resolveMediaUrl(explicitImage, DEFAULT_PACKAGE_VISUAL.image), tone: 'custom' };
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
  const visual = getPackageVisual(item);
  const specialtyName = valueName(item.specialtyId, 'Chuyên khoa');
  const clinicName = valueName(item.clinicId, 'Cơ sở');
  const packageName = cleanDisplayText(item.name, 'Gói khám');
  const description = cleanDisplayText(item.description, 'Dịch vụ khám chuyên khoa tại phòng khám.');

  return (
    <article className={`public-package-card public-package-card-market public-package-card-visual-${visual.tone}`}>
      <Link
        className="public-package-image-link"
        to={`/packages/${item._id}`}
        aria-label={`Xem chi tiết ${packageName}`}
      >
        <span className="public-package-image" style={{ backgroundImage: `url("${visual.image}")` }}>
          <span>{specialtyName}</span>
        </span>
      </Link>

      <div className="public-package-market-body">
        <h2>{packageName}</h2>
        <p>{description}</p>

        <div className="public-package-card-meta">
          <span>{clinicName}</span>
          <span>{item.durationMinutes || 30} phút</span>
        </div>

        <div className="public-package-price-row">
          <span>Từ</span>
          <strong>{formatCurrency(item.price)}</strong>
        </div>

        <div className="public-package-market-actions">
          <Link className="btn btn-outline-primary rounded-pill" to={`/packages/${item._id}`}>
            Xem chi tiết
          </Link>
          <Link className="btn btn-primary rounded-pill" to={`/booking?packageId=${item._id}`}>
            Đặt lịch
          </Link>
        </div>
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
    const keyword = normalizeSearchText(search.trim());
    return packages.filter((item) => {
      const matchesSpecialty = !specialtyId || objectId(item.specialtyId) === specialtyId;
      const haystack = normalizeSearchText([
        item.name,
        item.code,
        item.description,
        valueName(item.specialtyId, ''),
        valueName(item.clinicId, ''),
        valueName(item.doctorId, ''),
        ...(Array.isArray(item.targetPatients) ? item.targetPatients : []),
        ...(Array.isArray(item.includes) ? item.includes : [])
      ].join(' '));
      return matchesSpecialty && (!keyword || haystack.includes(keyword));
    });
  }, [packages, search, specialtyId]);

  if (loading) return <PageSkeleton minHeight="560px" />;

  return (
    <div className="public-page packages-page packages-page-market">
      <section className="packages-market-hero packages-market-hero-banner" aria-label="Ảnh giới thiệu gói khám">
        <img
          className="packages-market-hero-image"
          src="/packages-family-banner.webp"
          alt="Bác sĩ và gia đình trong banner gói khám sức khỏe"
        />
      </section>

      <section className="packages-market-info-card" aria-labelledby="packages-market-title">
        <div className="packages-market-info-copy">
          <span className="eyebrow">Gói khám & dịch vụ</span>
          <h1 id="packages-market-title">Chăm sóc sức khỏe phù hợp với nhu cầu của bạn</h1>
          <p>
            Tìm kiếm các gói khám theo chuyên khoa, cơ sở và nhu cầu với thông tin rõ ràng trước khi đặt lịch.
          </p>
          <div className="packages-market-trust">
            <span>Giá tham khảo rõ ràng</span>
            <span>Bác sĩ chuyên khoa</span>
            <span>Đặt lịch nhanh</span>
          </div>
        </div>
        <div className="packages-market-hero-actions">
          <a className="btn btn-primary rounded-pill" href="#package-results">Tìm gói khám</a>
          <Link className="btn btn-outline-primary rounded-pill" to="/booking">Đặt lịch trực tiếp</Link>
        </div>
      </section>

      <section className="packages-market-filter" aria-label="Tìm kiếm gói khám">
        <label>
          <span>Tìm kiếm</span>
          <input
            className="form-control"
            placeholder="Tên gói, chuyên khoa, cơ sở..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          <span>Chuyên khoa</span>
          <select className="form-select" value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value)}>
            <option value="">Tất cả chuyên khoa</option>
            {specialties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </section>

      {error && <div className="alert alert-danger">{cleanDisplayText(error.message || error, 'Không thể tải gói khám')}</div>}

      {!error && (
        <section id="package-results" className="packages-market-results">
          <div className="packages-result-heading packages-result-heading-market">
            <div>
              <span className="eyebrow">Danh sách dịch vụ</span>
              <h2>Gói khám dành cho bạn</h2>
              <p>{visiblePackages.length} dịch vụ phù hợp</p>
            </div>
            <p>Giá mang tính tham khảo và có thể được tư vấn lại sau khi thăm khám.</p>
          </div>

          {visiblePackages.length === 0 ? (
            <div className="empty-state packages-empty-state">
              <div className="empty-state-icon">📋</div>
              <h3 className="empty-state-title">Chưa có gói khám phù hợp</h3>
              <p className="empty-state-desc">
                Bạn có thể đổi bộ lọc hoặc đặt lịch khám để bác sĩ tư vấn dịch vụ phù hợp.
              </p>
              <Link className="btn btn-primary" to="/booking">Đặt lịch khám</Link>
            </div>
          ) : (
            <div className="public-package-grid public-package-grid-market">
              {visiblePackages.map((item) => <PackageCard item={item} key={item._id} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
