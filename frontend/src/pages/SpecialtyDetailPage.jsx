import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import DoctorCard from '../components/DoctorCard.jsx';
import PageSkeleton from '../components/PageSkeleton.jsx';
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaHospital,
  FaInfoCircle,
  FaStethoscope,
  FaUser
} from '../components/icons/FaIcons.jsx';
import { resolveMediaUrl, useImageFallback } from '../utils/media.js';
import { cleanDisplayText } from '../utils/textEncoding.js';
import {
  getSpecialtyContent,
  hasPlaceholderSpecialtyImage,
  normalizeSpecialtyName
} from '../data/specialtyContent.js';

const navItems = [
  { id: 'overview', icon: FaInfoCircle, label: 'Giới thiệu chung' },
  { id: 'symptoms', icon: FaStethoscope, label: 'Khi nào nên khám' },
  { id: 'services', icon: FaCheckCircle, label: 'Dịch vụ / điều trị' },
  { id: 'preparation', icon: FaCalendarAlt, label: 'Chuẩn bị trước khám' },
  { id: 'doctors', icon: FaUser, label: 'Đội ngũ bác sĩ' },
  { id: 'clinics', icon: FaHospital, label: 'Cơ sở liên quan' }
];

function getSpecialtyName(value) {
  if (!value) return '';
  return typeof value === 'object' ? value.name : value;
}

function getObjectId(value) {
  if (!value) return '';
  return typeof value === 'object' ? value._id : value;
}

export function formatSpecialtyName(name = '') {
  const cleaned = cleanDisplayText(name, '');
  return getSpecialtyContent(cleaned).displayName || cleaned;
}

function SpecialtyHeroVisual({ specialty, content }) {
  const hasImage = !hasPlaceholderSpecialtyImage(specialty.image);
  const fallbackImage = content.image || '/placeholder-specialty.svg';
  const imageSrc = hasImage ? resolveMediaUrl(specialty.image, fallbackImage) : fallbackImage;
  const isPhoto = hasImage || String(imageSrc || '').includes('/specialties/photos/');

  if (imageSrc) {
    return (
      <img
        className={isPhoto ? 'specialty-detail-photo' : 'specialty-detail-illustration'}
        src={imageSrc}
        alt={content.displayName}
        onError={(event) => useImageFallback(event, '/placeholder-specialty.svg')}
      />
    );
  }

  return (
    <div className={`specialty-detail-visual specialty-visual-${content.accent || 'cyan'}`}>
      <span>{content.iconLabel || 'CK'}</span>
      <strong>{content.displayName}</strong>
      <small>Clinic Booking</small>
    </div>
  );
}

export default function SpecialtyDetailPage() {
  const { specialtyId } = useParams();
  const [activeSection, setActiveSection] = useState('overview');
  const [specialty, setSpecialty] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');

    Promise.all([
      api(`/specialties/${specialtyId}`),
      api('/specialties'),
      api('/doctors'),
      api('/clinics')
    ])
      .then(([specialtyPayload, specialtiesPayload, doctorsPayload, clinicsPayload]) => {
        setSpecialty(specialtyPayload.data);
        setSpecialties(specialtiesPayload.data || []);
        setDoctors(doctorsPayload.data || []);
        setClinics(clinicsPayload.data || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [specialtyId]);

  const content = getSpecialtyContent(specialty?.name);
  const specialtyKey = normalizeSpecialtyName(content.displayName);
  const displayName = formatSpecialtyName(specialty?.name);
  const description = cleanDisplayText(specialty?.description, content.shortDescription) || content.shortDescription;

  const relatedDoctors = useMemo(() => doctors.filter((doctor) => (
    normalizeSpecialtyName(getSpecialtyContent(getSpecialtyName(doctor.specialtyId)).displayName) === specialtyKey
  )), [doctors, specialtyKey]);

  const visibleDoctors = relatedDoctors.slice(0, 3);

  const relatedClinics = useMemo(() => {
    const clinicIds = new Set(
      specialties
        .filter((item) => normalizeSpecialtyName(getSpecialtyContent(item.name).displayName) === specialtyKey)
        .map((item) => getObjectId(item.clinicId))
        .filter(Boolean)
    );

    return clinics.filter((clinic) => clinicIds.has(clinic._id));
  }, [clinics, specialties, specialtyKey]);

  function handleNavClick(sectionId) {
    setActiveSection(sectionId);
  }

  if (loading) return <PageSkeleton label="Đang tải chuyên khoa..." />;

  if (error || !specialty) {
    return (
      <main className="section-band">
        <div className="container">
          <div className="alert alert-danger">{error || 'Không tìm thấy chuyên khoa'}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="section-band specialty-detail-page">
      <div className="container">
        <section className="specialty-detail-hero">
          <div className="specialty-detail-image">
            <SpecialtyHeroVisual specialty={specialty} content={content} />
          </div>
          <div className="specialty-detail-hero-content">
            <span className="specialty-detail-label">CHUYÊN KHOA</span>
            <h1>{displayName}</h1>
            <p>{description || content.overview}</p>
            <div className="specialty-highlight-list">
              <span><FaCheckCircle size={15} />Bác sĩ chuyên môn</span>
              <span><FaCheckCircle size={15} />Đặt lịch nhanh chóng</span>
              <span><FaCheckCircle size={15} />Nhiều cơ sở hỗ trợ</span>
            </div>
            <div className="specialty-hero-actions">
              <Link className="btn btn-primary specialty-detail-cta" to={`/booking?specialtyId=${specialty._id}`}>
                Đặt lịch khám
              </Link>
              <a className="btn btn-outline-primary specialty-detail-secondary" href="#doctors" onClick={() => handleNavClick('doctors')}>
                Xem bác sĩ
              </a>
            </div>
          </div>
        </section>

        <div className="specialty-detail-layout">
          <aside className="specialty-detail-sidebar">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  className={activeSection === item.id ? 'active' : ''}
                  href={`#${item.id}`}
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                >
                  <Icon size={15} />
                  {item.label}
                </a>
              );
            })}
          </aside>

          <div className="specialty-detail-content">
            <section className="specialty-detail-section" id="overview">
              <h2><FaInfoCircle size={18} />Giới thiệu chung</h2>
              <p>{content.overview || description}</p>
            </section>

            <section className="specialty-detail-section" id="symptoms">
              <h2><FaStethoscope size={18} />Khi nào nên khám?</h2>
              <div className="specialty-service-grid">
                {content.symptoms.map((item) => (
                  <article className="specialty-service-card" key={item}>
                    <FaCheckCircle size={17} />
                    <span>{item}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="specialty-detail-section" id="services">
              <h2><FaCheckCircle size={18} />Dịch vụ / điều trị</h2>
              <div className="specialty-service-grid">
                {content.services.map((item) => (
                  <article className="specialty-service-card" key={item}>
                    <FaCheckCircle size={17} />
                    <span>{item}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="specialty-detail-section" id="preparation">
              <h2><FaCalendarAlt size={18} />Chuẩn bị trước khi khám</h2>
              <ul className="specialty-preparation-list">
                {content.preparation.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="specialty-detail-section" id="doctors">
              <div className="specialty-section-heading">
                <h2><FaUser size={18} />Đội ngũ bác sĩ</h2>
                {relatedDoctors.length > 3 && (
                  <Link to={`/doctors?specialty=${encodeURIComponent(specialty.name)}`}>Xem tất cả</Link>
                )}
              </div>
              {visibleDoctors.length ? (
                <>
                  <div className="row g-4">
                    {visibleDoctors.map((doctor) => (
                      <div className="col-12 col-md-6 col-xl-4" key={doctor._id}>
                        <DoctorCard doctor={doctor} to={`/doctors/${doctor._id}`} />
                      </div>
                    ))}
                  </div>
                  <div className="specialty-doctor-more">
                    <Link className="btn btn-outline-primary" to={`/doctors?specialty=${encodeURIComponent(specialty.name)}`}>
                      Xem tất cả bác sĩ chuyên khoa này
                    </Link>
                  </div>
                </>
              ) : (
                <div className="specialty-empty-card">Chưa có bác sĩ thuộc chuyên khoa này</div>
              )}
            </section>

            <section className="specialty-detail-section" id="clinics">
              <h2><FaHospital size={18} />Cơ sở liên quan</h2>
              {relatedClinics.length ? (
                <div className="specialty-clinic-grid">
                  {relatedClinics.map((clinic) => (
                    <article className="specialty-clinic-card" key={clinic._id}>
                      <h3>{cleanDisplayText(clinic.name, 'Cơ sở khám')}</h3>
                      <p>{cleanDisplayText(clinic.address, 'Chưa cập nhật địa chỉ')}</p>
                      <span>{cleanDisplayText(clinic.phone, 'Chưa cập nhật số điện thoại')}</span>
                      <Link className="btn btn-outline-primary btn-sm" to={`/clinics/${clinic._id}`}>Xem cơ sở</Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="specialty-empty-card">Chưa có cơ sở liên quan.</div>
              )}
            </section>

            <section className="specialty-bottom-cta">
              <div>
                <span><FaStethoscope size={18} /></span>
                <h2>Bạn cần tư vấn chuyên khoa {displayName}?</h2>
                <p>Đặt lịch khám để được hỗ trợ bởi đội ngũ bác sĩ phù hợp.</p>
              </div>
              <Link className="btn btn-primary specialty-detail-cta" to={`/booking?specialtyId=${specialty._id}`}>
                Đặt lịch khám ngay
              </Link>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
