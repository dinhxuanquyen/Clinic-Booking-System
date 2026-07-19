import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import DoctorCard from '../components/DoctorCard.jsx';
import PageSkeleton from '../components/PageSkeleton.jsx';
import { resolveMediaUrl, useImageFallback } from '../utils/media.js';

const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function formatDayOfWeek(dayOfWeek) {
  const mapping = {
    monday: 'Thứ 2',
    tuesday: 'Thứ 3',
    wednesday: 'Thứ 4',
    thursday: 'Thứ 5',
    friday: 'Thứ 6',
    saturday: 'Thứ 7',
    sunday: 'Chủ nhật'
  };

  return mapping[dayOfWeek] || dayOfWeek || 'Đang cập nhật';
}

function normalizeWorkingHours(hours = []) {
  if (!Array.isArray(hours) || !hours.length) return [];

  return [...hours].sort((first, second) => {
    const firstIndex = dayOrder.indexOf(first.dayOfWeek);
    const secondIndex = dayOrder.indexOf(second.dayOfWeek);

    return (firstIndex === -1 ? 99 : firstIndex) - (secondIndex === -1 ? 99 : secondIndex);
  });
}

function getObjectId(value) {
  if (!value) return '';
  return typeof value === 'object' ? value._id : value;
}

export default function ClinicDetail() {
  const { clinicId } = useParams();
  const [clinic, setClinic] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('all');
  const [error, setError] = useState('');

  const workingHours = useMemo(() => normalizeWorkingHours(clinic?.workingHours), [clinic]);
  const openDays = useMemo(() => workingHours.filter((item) => !item.isClosed), [workingHours]);

  const filteredDoctors = useMemo(() => {
    if (selectedSpecialtyId === 'all') return doctors;

    return doctors.filter((doctor) => getObjectId(doctor.specialtyId) === selectedSpecialtyId);
  }, [doctors, selectedSpecialtyId]);

  const specialtyDoctorCounts = useMemo(() => {
    return doctors.reduce((counts, doctor) => {
      const specialtyId = getObjectId(doctor.specialtyId);
      if (!specialtyId) return counts;

      counts[specialtyId] = (counts[specialtyId] || 0) + 1;
      return counts;
    }, {});
  }, [doctors]);

  function scrollToDoctors() {
    document.getElementById('doctors')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  useEffect(() => {
    Promise.all([
      api(`/clinics/${clinicId}`),
      api(`/clinics/${clinicId}/specialties`),
      api(`/clinics/${clinicId}/doctors`)
    ])
      .then(([clinicPayload, specialtyPayload, doctorPayload]) => {
        setClinic(clinicPayload.data);
        setSpecialties(specialtyPayload.data || []);
        setDoctors(doctorPayload.data || []);
      })
      .catch((err) => setError(err.message));
  }, [clinicId]);

  if (error) {
    return (
      <main className="container py-4">
        <div className="alert alert-danger">{error}</div>
      </main>
    );
  }

  if (!clinic) return <PageSkeleton label="Đang tải thông tin cơ sở..." />;

  const clinicImageUrl = resolveMediaUrl(clinic.image);

  return (
    <main className="section-band clinic-detail-page">
      <section className="clinic-detail-hero">
        <img
          className="clinic-hero-image"
          src={clinicImageUrl}
          alt={clinic.name}
          onError={(event) => useImageFallback(event, '/placeholder-clinic.svg')}
        />
        <div className="clinic-hero-overlay" />
        <div className="clinic-hero-inner">
          <span className="clinic-crumb">Trang chủ / Cơ sở / {clinic.name}</span>
          <h1 className="clinic-title">{clinic.name}</h1>
          <p className="clinic-hero-address">
            <span aria-hidden="true">📍</span>
            {clinic.address || 'Đang cập nhật địa chỉ'}
          </p>
          <div className="clinic-hero-actions">
            <a className="clinic-hero-phone" href={`tel:${clinic.phone || ''}`}>
              <span aria-hidden="true">☎</span>
              {clinic.phone || 'Đang cập nhật'}
            </a>
            <Link className="btn btn-primary clinic-cta" to={`/booking?clinicId=${clinicId}`}>
              Đặt lịch khám
            </Link>
          </div>
          <div className="clinic-quick-stats" aria-label="Tổng quan cơ sở">
            <span><strong>{specialties.length}</strong> chuyên khoa</span>
            <span><strong>{doctors.length}</strong> bác sĩ</span>
            <span><strong>{openDays.length || '--'}</strong> ngày/tuần</span>
          </div>
        </div>
      </section>

      <div className="container clinic-detail-shell">
        <div className="clinic-detail-main">
          <section className="clinic-about-section">
            <div className="clinic-section-head">
              <div>
                <span className="clinic-section-label">Giới thiệu chung</span>
                <h2>Tổng quan cơ sở</h2>
              </div>
            </div>
            <div className="clinic-about-card">
              <p>{clinic.description || 'Thông tin cơ sở đang được cập nhật.'}</p>
              <div className="clinic-about-highlights">
                <article>
                  <strong>Sứ mệnh</strong>
                  <span>Đặt lịch khám nhanh, minh bạch thông tin và tối ưu trải nghiệm người bệnh.</span>
                </article>
                <article>
                  <strong>Cơ sở vật chất</strong>
                  <span>Không gian khám hiện đại, hỗ trợ nhiều chuyên khoa và đội ngũ bác sĩ phù hợp.</span>
                </article>
              </div>
            </div>
          </section>

          <section className="clinic-specialties-section">
            <div className="clinic-section-head">
              <div>
                <span className="clinic-section-label">Chuyên khoa nổi bật</span>
                <h2>Chuyên khoa tại cơ sở</h2>
              </div>
            </div>
            <div className="clinic-specialty-grid">
              {specialties.map((item, index) => (
                <article className="clinic-specialty-card" key={item._id}>
                  <span aria-hidden="true">{['❤️', '🩺', '👶', '🛡️', '🧠', '👂'][index % 6]}</span>
                  <strong>{item.name}</strong>
                  <small>{specialtyDoctorCounts[item._id] || 0} bác sĩ đang nhận lịch</small>
                </article>
              ))}
              {!specialties.length && <span className="clinic-muted-note">Chưa có chuyên khoa.</span>}
            </div>
          </section>

          <section id="doctors" className="doctor-directory-section">
            <div className="clinic-section-head clinic-doctor-head">
              <div>
                <span className="clinic-section-label">Đội ngũ bác sĩ tại cơ sở</span>
                <h2>Bác sĩ đang nhận lịch</h2>
              </div>
              <p>{filteredDoctors.length} bác sĩ phù hợp</p>
            </div>

            <div className="clinic-doctor-filter-row" aria-label="Lọc bác sĩ theo chuyên khoa">
              <button
                className={`doctor-specialty-filter ${selectedSpecialtyId === 'all' ? 'active' : ''}`}
                type="button"
                onClick={() => setSelectedSpecialtyId('all')}
              >
                <span>Tất cả</span>
                <strong>{doctors.length}</strong>
              </button>
              {specialties.map((item) => (
                <button
                  className={`doctor-specialty-filter ${selectedSpecialtyId === item._id ? 'active' : ''}`}
                  key={item._id}
                  type="button"
                  onClick={() => setSelectedSpecialtyId(item._id)}
                >
                  <span>{item.name}</span>
                  <strong>{specialtyDoctorCounts[item._id] || 0}</strong>
                </button>
              ))}
            </div>

            <div className="doctor-directory-results">
              <div className="row g-4">
                {filteredDoctors.map((doctor) => (
                  <div className="col-12 col-md-6 col-xl-4" key={doctor._id}>
                    <DoctorCard doctor={doctor} to={`/clinics/${clinicId}/doctors/${doctor._id}`} />
                  </div>
                ))}
              </div>

              {!filteredDoctors.length && (
                <div className="doctor-empty-state">
                  Chưa có bác sĩ thuộc chuyên khoa này.
                </div>
              )}
            </div>
          </section>

          <section className="clinic-gallery-section">
            <div className="clinic-section-head">
              <div>
                <span className="clinic-section-label">Cơ sở vật chất & Trang thiết bị</span>
                <h2>Không gian khám bệnh</h2>
              </div>
            </div>
            <div className="clinic-gallery-grid">
              <img
                src={clinicImageUrl}
                alt={`${clinic.name} - khu vực chính`}
                onError={(event) => useImageFallback(event, '/placeholder-clinic.svg')}
              />
              <div className="clinic-gallery-tile">Phòng khám sạch sẽ</div>
              <div className="clinic-gallery-tile">Thiết bị hỗ trợ chẩn đoán</div>
              <div className="clinic-gallery-tile wide">Khu vực tiếp đón người bệnh</div>
            </div>
          </section>
        </div>

        <aside className="clinic-detail-sidebar" aria-label="Thông tin hỗ trợ cơ sở">
          <section className="clinic-side-card">
            <h2>Giờ làm việc</h2>
            <div className="clinic-hours-list">
              {workingHours.length ? (
                workingHours.map((item) => (
                  <div className="clinic-hours-row" key={item.dayOfWeek}>
                    <span className="hours-day">{formatDayOfWeek(item.dayOfWeek)}</span>
                    <span className={`hours-time ${item.isClosed ? 'closed' : 'open'}`}>
                      {item.isClosed ? 'Nghỉ' : `${item.open || '--:--'} - ${item.close || '--:--'}`}
                    </span>
                  </div>
                ))
              ) : (
                <span>Đang cập nhật</span>
              )}
            </div>
          </section>

          <section className="clinic-side-card">
            <h2>Vị trí bản đồ</h2>
            <div className="clinic-map-preview">
              <span aria-hidden="true">📍</span>
            </div>
            <p>{clinic.address || 'Đang cập nhật địa chỉ'}</p>
            <a
              className="clinic-map-link"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.address || clinic.name)}`}
              target="_blank"
              rel="noreferrer"
            >
              Xem đường đi trên Google Maps
            </a>
          </section>

          <section className="clinic-side-card clinic-support-card">
            <h2>Bạn cần hỗ trợ?</h2>
            <p>Liên hệ tổng đài để được tư vấn và hỗ trợ đặt lịch nhanh.</p>
            <a className="clinic-support-phone" href={`tel:${clinic.phone || ''}`}>
              {clinic.phone || '1900 0000'}
            </a>
            <Link className="btn btn-primary clinic-sidebar-cta" to={`/booking?clinicId=${clinicId}`}>
              Đặt lịch khám ngay
            </Link>
            <button className="btn btn-outline-primary clinic-sidebar-secondary" type="button" onClick={scrollToDoctors}>
              Xem bác sĩ
            </button>
          </section>
        </aside>
      </div>
    </main>
  );
}
