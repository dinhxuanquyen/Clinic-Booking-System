import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import DoctorCard from '../components/DoctorCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { SkeletonGrid } from '../components/SkeletonCard.jsx';
import { FaHospital, FaStethoscope, FaUser } from '../components/icons/FaIcons.jsx';

const pageSize = 12;
const doctorHeroImages = [
  {
    src: '/doctor-team-banner.webp',
    alt: 'Đội ngũ bác sĩ và cơ sở bệnh viện'
  },
  {
    src: '/doctor-team-banner-leading.webp',
    alt: 'Đội ngũ chuyên gia bác sĩ hàng đầu'
  }
];

function getObjectId(value) {
  if (!value) return '';
  return typeof value === 'object' ? value._id : value;
}

function getSpecialtyName(value) {
  if (!value) return 'Đang cập nhật';
  return typeof value === 'object' ? value.name : value;
}

function normalizeText(value = '') {
  return String(value).trim().toLowerCase();
}

function buildSpecialtyFilters(doctors) {
  const specialtyMap = new Map();

  doctors.forEach((doctor) => {
    const name = getSpecialtyName(doctor.specialtyId);
    const key = normalizeText(name);
    if (!key || key === normalizeText('Đang cập nhật')) return;

    const current = specialtyMap.get(key);
    specialtyMap.set(key, {
      key,
      name: current?.name || name.trim(),
      count: (current?.count || 0) + 1
    });
  });

  return Array.from(specialtyMap.values()).sort((first, second) => first.name.localeCompare(second.name));
}

function matchesSearch(doctor, keyword) {
  if (!keyword) return true;

  const searchable = [
    doctor.name,
    doctor.degree,
    doctor.position,
    doctor.workplace,
    getSpecialtyName(doctor.specialtyId)
  ].map(normalizeText);

  return searchable.some((value) => value.includes(keyword));
}

function buildPagination(currentPage, totalPages) {
  return Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => (
    totalPages <= 6 || page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
  ));
}

export default function DoctorsPage() {
  const [searchParams] = useSearchParams();
  const [selectedSpecialtyName, setSelectedSpecialtyName] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  const { data: doctors = [], isLoading: loading, error } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const res = await api('/doctors');
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000 // Cache cho 5 phút
  });

  useEffect(() => {
    const specialty = normalizeText(searchParams.get('specialty') || '');
    if (specialty) {
      setSelectedSpecialtyName(specialty);
    }
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSpecialtyName]);

  const specialties = useMemo(() => buildSpecialtyFilters(doctors), [doctors]);

  const stats = useMemo(() => {
    const clinicIds = new Set(doctors.map((doctor) => getObjectId(doctor.clinicId)).filter(Boolean));

    return {
      doctors: doctors.length,
      clinics: clinicIds.size,
      specialties: specialties.length
    };
  }, [doctors, specialties]);

  const filteredDoctors = useMemo(() => {
    const keyword = normalizeText(searchTerm);

    return doctors.filter((doctor) => {
      const specialtyName = normalizeText(getSpecialtyName(doctor.specialtyId));
      const matchesSpecialty = selectedSpecialtyName === 'all' || specialtyName === selectedSpecialtyName;

      return matchesSpecialty && matchesSearch(doctor, keyword);
    });
  }, [doctors, searchTerm, selectedSpecialtyName]);

  const totalPages = Math.max(1, Math.ceil(filteredDoctors.length / pageSize));
  const paginationItems = useMemo(() => buildPagination(currentPage, totalPages), [currentPage, totalPages]);
  const paginatedDoctors = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDoctors.slice(start, start + pageSize);
  }, [currentPage, filteredDoctors]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function showPreviousHeroImage() {
    setActiveHeroIndex((current) => (current === 0 ? doctorHeroImages.length - 1 : current - 1));
  }

  function showNextHeroImage() {
    setActiveHeroIndex((current) => (current + 1) % doctorHeroImages.length);
  }

  return (
    <main className="section-band doctors-page">
      <div className="container">
        <section className="doctor-page-hero doctor-page-hero-banner" aria-label="Ảnh giới thiệu đội ngũ bác sĩ">
          <div
            className="doctor-hero-image-stack"
            style={{
              '--active-slide': activeHeroIndex,
              '--slide-count': doctorHeroImages.length
            }}
          >
            {doctorHeroImages.map((image, index) => (
              <img
                className="doctor-page-hero-image"
                src={image.src}
                alt={image.alt}
                aria-hidden={index === activeHeroIndex ? undefined : 'true'}
                key={`${image.src}-${index}`}
              />
            ))}
          </div>
          <button className="doctor-hero-nav previous" type="button" aria-label="Xem ảnh trước" onClick={showPreviousHeroImage}>
            ‹
          </button>
          <button className="doctor-hero-nav next" type="button" aria-label="Xem ảnh tiếp theo" onClick={showNextHeroImage}>
            ›
          </button>
        </section>

        <section className="doctor-hero-info-card" aria-labelledby="doctor-page-title">
          <div className="doctor-page-hero-content">
            <span className="eyebrow">Tìm bác sĩ</span>
            <h1 id="doctor-page-title">Đội ngũ bác sĩ BookingCare Mini</h1>
            <p>Tra cứu bác sĩ theo chuyên khoa, học vị và nơi công tác để chọn lịch khám phù hợp.</p>
          </div>

          <div className="doctor-stats-grid">
            <article className="doctor-stat-card">
              <span><FaUser size={20} /></span>
              <strong>{stats.doctors}</strong>
              <small>Tổng bác sĩ</small>
            </article>
            <article className="doctor-stat-card">
              <span><FaHospital size={20} /></span>
              <strong>{stats.clinics}</strong>
              <small>Tổng cơ sở</small>
            </article>
            <article className="doctor-stat-card">
              <span><FaStethoscope size={20} /></span>
              <strong>{stats.specialties}</strong>
              <small>Tổng chuyên khoa</small>
            </article>
          </div>
        </section>

        <div className="doctor-search-box">
          <span className="doctor-search-icon" aria-hidden="true" />
          <input
            placeholder="Tìm bác sĩ, chuyên khoa, học vị..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {searchTerm && (
            <button className="doctor-search-clear" type="button" aria-label="Xóa tìm kiếm" onClick={() => setSearchTerm('')}>
              ×
            </button>
          )}
        </div>

        {loading && <SkeletonGrid count={6} minWidth="260px" />}
        {error && <div className="alert alert-danger mt-3">{error}</div>}

        {!loading && !error && (
          <div className="doctor-directory-layout">
            <aside className="doctor-specialty-sidebar" aria-label="Lọc bác sĩ theo chuyên khoa">
              <h2>Lọc theo chuyên khoa</h2>
              <button
                className={`doctor-specialty-filter ${selectedSpecialtyName === 'all' ? 'active' : ''}`}
                type="button"
                onClick={() => setSelectedSpecialtyName('all')}
              >
                <span>Tất cả bác sĩ</span>
                <strong>{doctors.length}</strong>
              </button>
              {specialties.map((item) => (
                <button
                  className={`doctor-specialty-filter ${selectedSpecialtyName === item.key ? 'active' : ''}`}
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedSpecialtyName(item.key)}
                >
                  <span>{item.name}</span>
                  <strong>{item.count}</strong>
                </button>
              ))}
            </aside>

            <div className="doctor-directory-results">
              <div className="row g-4">
                {paginatedDoctors.map((doctor) => (
                  <div className="col-12 col-md-6 col-xl-4" key={doctor._id}>
                    <DoctorCard doctor={doctor} to={`/doctors/${doctor._id}`} />
                  </div>
                ))}
              </div>

              {!filteredDoctors.length && (
                <EmptyState
                  icon="👨‍⚕️"
                  title="Không tìm thấy bác sĩ phù hợp"
                  description="Hãy thử từ khóa khác hoặc chọn chuyên khoa khác."
                />
              )}

              {filteredDoctors.length > pageSize && (
                <nav className="doctor-pagination" aria-label="Phân trang bác sĩ">
                  <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                    &lt;&lt;
                  </button>
                  {paginationItems.map((page, index) => {
                    const previous = paginationItems[index - 1];
                    const showGap = previous && page - previous > 1;

                    return (
                      <span className="doctor-pagination-group" key={page}>
                        {showGap && <span className="doctor-pagination-gap">...</span>}
                        <button
                          className={currentPage === page ? 'active' : ''}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      </span>
                    );
                  })}
                  <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
                    &gt;&gt;
                  </button>
                </nav>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
