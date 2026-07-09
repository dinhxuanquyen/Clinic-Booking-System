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

  const filteredDoctors = useMemo(() => {
    if (selectedSpecialtyId === 'all') return doctors;

    return doctors.filter((doctor) => getObjectId(doctor.specialtyId) === selectedSpecialtyId);
  }, [doctors, selectedSpecialtyId]);

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

  return (
    <main className="section-band clinic-detail-page">
      <div className="container">
        <section className="clinic-detail-hero mb-5">
          <div className="row g-4 align-items-center">
            <div className="col-lg-5">
              <img
                className="clinic-hero-image"
                src={resolveMediaUrl(clinic.image)}
                alt={clinic.name}
                onError={(event) => useImageFallback(event, '/placeholder-clinic.svg')}
              />
            </div>
            <div className="col-lg-7">
              <span className="clinic-section-label">Thông tin cơ sở</span>
              <h1 className="clinic-title mt-3">{clinic.name}</h1>
              <p className="clinic-description">
                {clinic.description || 'Thông tin cơ sở đang được cập nhật.'}
              </p>

              <div className="clinic-info-grid">
                <article className="clinic-info-card">
                  <span className="clinic-info-icon" aria-hidden="true">📍</span>
                  <div>
                    <strong>Địa chỉ</strong>
                    <span>{clinic.address || 'Đang cập nhật'}</span>
                  </div>
                </article>

                <article className="clinic-info-card">
                  <span className="clinic-info-icon" aria-hidden="true">📞</span>
                  <div>
                    <strong>Điện thoại</strong>
                    <span>{clinic.phone || 'Đang cập nhật'}</span>
                  </div>
                </article>

                <article className="clinic-info-card">
                  <span className="clinic-info-icon" aria-hidden="true">✉️</span>
                  <div>
                    <strong>Email</strong>
                    <span>{clinic.email || 'Đang cập nhật'}</span>
                  </div>
                </article>

                <article className="clinic-info-card">
                  <span className="clinic-info-icon" aria-hidden="true">🕒</span>
                  <div>
                    <strong>Giờ làm việc</strong>
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
                  </div>
                </article>
              </div>

              <Link className="btn btn-primary clinic-cta mt-4" to="#doctors">
                <span className="calendar-icon" aria-hidden="true" />
                Đặt lịch khám
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-5">
          <div className="d-flex justify-content-between align-items-end mb-3">
            <div>
              <span className="clinic-section-label">Chuyên khoa</span>
              <h2 className="h3 mt-2 mb-0">Chuyên khoa tại cơ sở</h2>
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2">
            {specialties.map((item) => (
              <span className="specialty-pill" key={item._id}>
                {item.name}
              </span>
            ))}
            {!specialties.length && <span className="text-secondary">Chưa có chuyên khoa.</span>}
          </div>
        </section>

        <section id="doctors" className="doctor-directory-section">
          <div className="d-flex justify-content-between align-items-end mb-4">
            <div>
              <span className="clinic-section-label">Đội ngũ bác sĩ</span>
              <h2 className="h3 mt-2 mb-0">Bác sĩ tại cơ sở</h2>
            </div>
          </div>

          <div className="doctor-directory-layout">
            <aside className="doctor-specialty-sidebar" aria-label="Lọc bác sĩ theo chuyên khoa">
              <button
                className={`doctor-specialty-filter ${selectedSpecialtyId === 'all' ? 'active' : ''}`}
                type="button"
                onClick={() => setSelectedSpecialtyId('all')}
              >
                Tất cả
              </button>
              {specialties.map((item) => (
                <button
                  className={`doctor-specialty-filter ${selectedSpecialtyId === item._id ? 'active' : ''}`}
                  key={item._id}
                  type="button"
                  onClick={() => setSelectedSpecialtyId(item._id)}
                >
                  {item.name}
                </button>
              ))}
            </aside>

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
          </div>
        </section>
      </div>
    </main>
  );
}
