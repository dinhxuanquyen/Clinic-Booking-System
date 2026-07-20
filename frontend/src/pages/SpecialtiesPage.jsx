import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { resolveMediaUrl, useImageFallback } from '../utils/media.js';
import { SkeletonGrid } from '../components/SkeletonCard.jsx';
import { cleanDisplayText } from '../utils/textEncoding.js';
import {
  getSpecialtyContent,
  hasPlaceholderSpecialtyImage,
  normalizeSpecialtyName
} from '../data/specialtyContent.js';

function getClinicName(value) {
  if (!value) return '';
  return typeof value === 'object' ? value.name : '';
}

function SpecialtyVisual({ item, content }) {
  const hasImage = !hasPlaceholderSpecialtyImage(item.image);
  const fallbackImage = content.image || '/placeholder-specialty.svg';
  const imageSrc = hasImage ? resolveMediaUrl(item.image, fallbackImage) : fallbackImage;
  const isPhoto = hasImage || String(imageSrc || '').includes('/specialties/photos/');

  if (imageSrc) {
    return (
      <img
        className={isPhoto ? 'specialty-card-photo' : 'specialty-card-illustration'}
        src={imageSrc}
        alt={content.displayName}
        loading="lazy"
        onError={(event) => useImageFallback(event, '/placeholder-specialty.svg')}
      />
    );
  }

  return (
    <div className={`specialty-visual specialty-visual-${content.accent || 'cyan'}`}>
      <span>{content.iconLabel || 'CK'}</span>
      <strong>{content.displayName}</strong>
    </div>
  );
}

export default function SpecialtiesPage() {
  const [search, setSearch] = useState('');

  const { data: specialties = [], isLoading, error } = useQuery({
    queryKey: ['specialties'],
    queryFn: async () => {
      const res = await api('/specialties');
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000 // Cache cho 5 phút
  });

  const specialtyGroups = useMemo(() => {
    const map = new Map();

    specialties.forEach((item) => {
      const rawName = cleanDisplayText(item.name, 'Chuyên khoa');
      const content = getSpecialtyContent(rawName);
      const displayName = cleanDisplayText(content.displayName, rawName);
      const groupKey = normalizeSpecialtyName(displayName);
      const clinicName = cleanDisplayText(getClinicName(item.clinicId), '');

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          ...item,
          name: displayName,
          description: cleanDisplayText(item.description, content.shortDescription) || content.shortDescription,
          content,
          clinicNames: new Set(clinicName ? [clinicName] : []),
          variants: [item]
        });
        return;
      }

      const current = map.get(groupKey);
      if (clinicName) current.clinicNames.add(clinicName);
      current.variants.push(item);
      if (!current.image && item.image) current.image = item.image;
      if ((!current.description || current.description === content.shortDescription) && item.description) {
        current.description = cleanDisplayText(item.description, content.shortDescription);
      }
    });

    return Array.from(map.values()).sort((left, right) => left.name.localeCompare(right.name, 'vi'));
  }, [specialties]);

  const filteredSpecialties = useMemo(() => {
    const keyword = normalizeSpecialtyName(search);
    if (!keyword) return specialtyGroups;
    return specialtyGroups.filter((item) => {
      const haystack = normalizeSpecialtyName([
        item.name,
        item.description,
        item.content.symptoms.join(' '),
        item.content.services.join(' '),
        Array.from(item.clinicNames).join(' ')
      ].join(' '));
      return haystack.includes(keyword);
    });
  }, [search, specialtyGroups]);

  return (
    <main className="section-band specialties-page">
      <div className="container">
        <section className="specialties-hero specialties-hero-banner" aria-label="Ảnh giới thiệu chuyên khoa">
          <img
            className="specialties-hero-image"
            src="/specialties-banner.webp"
            alt="Banner giới thiệu các chuyên khoa y tế"
          />
        </section>

        <section className="specialties-info-card" aria-labelledby="specialties-page-title">
          <div className="specialties-info-main">
            <span className="eyebrow">Chuyên khoa</span>
            <h1 id="specialties-page-title">Tìm chuyên khoa phù hợp</h1>
            <p>
              Tra cứu chuyên khoa, xem thông tin dịch vụ thường gặp và chọn đội ngũ bác sĩ phù hợp trước khi đặt lịch.
            </p>
          </div>
          <div className="specialties-hero-panel">
            <strong>{specialtyGroups.length}</strong>
            <span>nhóm chuyên khoa</span>
            <small>{specialties.length} dịch vụ tại các cơ sở</small>
          </div>
        </section>

        <section className="specialties-toolbar">
          <label className="specialties-search">
            <span>Tìm chuyên khoa</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nhập triệu chứng hoặc tên chuyên khoa..."
            />
          </label>
          <div className="specialties-quick-links">
            <Link to="/symptom-checker">Chưa biết nên khám khoa nào?</Link>
            <Link to="/booking">Đặt lịch khám</Link>
          </div>
        </section>

        {error && (
          <div className="alert alert-danger">
            Có lỗi xảy ra khi tải chuyên khoa: {error.message || 'Lỗi không xác định'}
          </div>
        )}

        {isLoading ? (
          <SkeletonGrid count={6} />
        ) : filteredSpecialties.length === 0 ? (
          <div className="specialty-empty-state">
            <h2>Không tìm thấy chuyên khoa phù hợp</h2>
            <p>Thử tìm bằng triệu chứng khác hoặc dùng công cụ tư vấn triệu chứng AI để được định hướng chuyên khoa.</p>
            <Link className="btn btn-primary" to="/symptom-checker">Tư vấn triệu chứng AI</Link>
          </div>
        ) : (
          <div className="row g-4 specialties-grid">
            {filteredSpecialties.map((item) => (
              <div className="col-12 col-md-6 col-lg-4" key={item._id}>
                <article className="specialty-card h-100">
                  <SpecialtyVisual item={item} content={item.content} />
                  <div className="specialty-card-body">
                    <h2>{item.name}</h2>
                    <p>{item.description || item.content.shortDescription}</p>
                    <div className="specialty-card-meta">
                      <span>{item.clinicNames.size || 1} cơ sở hỗ trợ</span>
                      <span>{item.content.services[0]}</span>
                    </div>
                    <div className="specialty-card-tags">
                      {item.content.symptoms.slice(0, 2).map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    <div className="specialty-card-actions">
                      <Link className="btn btn-outline-primary specialty-card-cta" to={`/specialties/${item._id}`}>
                        Xem chi tiết
                      </Link>
                      <Link className="specialty-card-booking" to={`/booking?specialtyId=${item._id}`}>
                        Đặt lịch
                      </Link>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
