import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import DoctorCard from '../components/DoctorCard.jsx';
import PageSkeleton from '../components/PageSkeleton.jsx';
import { FaChevronLeft, FaChevronRight } from '../components/icons/FaIcons.jsx';
import { resolveMediaUrl, useImageFallback } from '../utils/media.js';
import { cleanDisplayText } from '../utils/textEncoding.js';
import {
  getSpecialtyContent,
  hasPlaceholderSpecialtyImage
} from '../data/specialtyContent.js';

const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const clinicHeroTransitionMs = 760;

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

function normalizeClinicImages(clinic) {
  const galleryImages = Array.isArray(clinic?.galleryImages) ? clinic.galleryImages : [];
  const images = [clinic?.image, ...galleryImages]
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  const uniqueImages = Array.from(new Set(images));

  return uniqueImages.length ? uniqueImages : ['/placeholder-clinic.svg'];
}

function ClinicSpecialtyVisual({ item, content }) {
  const hasImage = !hasPlaceholderSpecialtyImage(item.image);
  const fallbackImage = content.image || '/placeholder-specialty.svg';
  const imageSrc = hasImage ? resolveMediaUrl(item.image, fallbackImage) : fallbackImage;
  const isPhoto = hasImage || String(imageSrc || '').includes('/specialties/photos/');

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

export default function ClinicDetail() {
  const { clinicId } = useParams();
  const [clinic, setClinic] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('all');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageTrackIndex, setImageTrackIndex] = useState(1);
  const [isImageJumping, setIsImageJumping] = useState(false);
  const [isImageAnimating, setIsImageAnimating] = useState(false);
  const [error, setError] = useState('');
  const imageLockedRef = useRef(false);
  const imageResetTimerRef = useRef(null);

  const workingHours = useMemo(() => normalizeWorkingHours(clinic?.workingHours), [clinic]);
  const openDays = useMemo(() => workingHours.filter((item) => !item.isClosed), [workingHours]);
  const clinicImages = useMemo(() => normalizeClinicImages(clinic), [clinic]);
  const clinicHeroSlides = useMemo(() => {
    if (clinicImages.length <= 1) return clinicImages;

    return [
      clinicImages[clinicImages.length - 1],
      ...clinicImages,
      clinicImages[0]
    ];
  }, [clinicImages]);
  const clinicSpaceImages = useMemo(() => {
    const images = Array.isArray(clinic?.galleryImages)
      ? Array.from(new Set(clinic.galleryImages.map((item) => String(item || '').trim()).filter(Boolean)))
      : [];

    return images.length ? images : clinicImages;
  }, [clinic, clinicImages]);

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

  const clinicSpecialtyCards = useMemo(() => specialties.map((item) => {
    const rawName = cleanDisplayText(item.name, 'Chuyên khoa');
    const content = getSpecialtyContent(rawName);
    const displayName = cleanDisplayText(content.displayName, rawName);

    return {
      ...item,
      name: displayName,
      description: cleanDisplayText(item.description, content.shortDescription) || content.shortDescription,
      content
    };
  }), [specialties]);

  function scrollToDoctors() {
    document.getElementById('doctors')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const unlockImageTrack = useCallback(() => {
    imageLockedRef.current = false;
    setIsImageAnimating(false);
  }, []);

  const completeImageTransition = useCallback((nextTrackIndex) => {
    if (clinicImages.length <= 1) return;

    if (imageResetTimerRef.current) {
      window.clearTimeout(imageResetTimerRef.current);
      imageResetTimerRef.current = null;
    }

    let normalizedTrackIndex = nextTrackIndex;
    let normalizedImageIndex = nextTrackIndex - 1;

    if (nextTrackIndex === 0) {
      normalizedTrackIndex = clinicImages.length;
      normalizedImageIndex = clinicImages.length - 1;
    } else if (nextTrackIndex === clinicImages.length + 1) {
      normalizedTrackIndex = 1;
      normalizedImageIndex = 0;
    }

    if (normalizedTrackIndex === nextTrackIndex) {
      unlockImageTrack();
      return;
    }

    setIsImageJumping(true);
    setImageTrackIndex(normalizedTrackIndex);
    setActiveImageIndex(normalizedImageIndex);

    imageResetTimerRef.current = window.setTimeout(() => {
      setIsImageJumping(false);
      imageResetTimerRef.current = null;
      unlockImageTrack();
    }, 32);
  }, [clinicImages.length, unlockImageTrack]);

  const scheduleImageTrackFallback = useCallback((nextTrackIndex) => {
    if (imageResetTimerRef.current) {
      window.clearTimeout(imageResetTimerRef.current);
    }

    imageResetTimerRef.current = window.setTimeout(() => {
      completeImageTransition(nextTrackIndex);
    }, clinicHeroTransitionMs + 60);
  }, [completeImageTransition]);

  const showPreviousImage = useCallback(() => {
    if (imageLockedRef.current || clinicImages.length <= 1) return;

    imageLockedRef.current = true;
    setIsImageAnimating(true);
    setActiveImageIndex((current) => (current === 0 ? clinicImages.length - 1 : current - 1));
    setImageTrackIndex((current) => {
      const nextTrackIndex = current - 1;
      scheduleImageTrackFallback(nextTrackIndex);
      return nextTrackIndex;
    });
  }, [clinicImages.length, scheduleImageTrackFallback]);

  const showNextImage = useCallback(() => {
    if (imageLockedRef.current || clinicImages.length <= 1) return;

    imageLockedRef.current = true;
    setIsImageAnimating(true);
    setActiveImageIndex((current) => (current + 1) % clinicImages.length);
    setImageTrackIndex((current) => {
      const nextTrackIndex = current + 1;
      scheduleImageTrackFallback(nextTrackIndex);
      return nextTrackIndex;
    });
  }, [clinicImages.length, scheduleImageTrackFallback]);

  function handleImageTransitionEnd(event) {
    if (!event.target.classList.contains('clinic-hero-image-track')) return;
    completeImageTransition(imageTrackIndex);
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

  useEffect(() => {
    setActiveImageIndex(0);
    setImageTrackIndex(clinicImages.length > 1 ? 1 : 0);
    setIsImageAnimating(false);
    setIsImageJumping(false);
    imageLockedRef.current = false;
  }, [clinicId]);

  useEffect(() => {
    if (activeImageIndex >= clinicImages.length) {
      setActiveImageIndex(0);
      setImageTrackIndex(clinicImages.length > 1 ? 1 : 0);
    }
  }, [activeImageIndex, clinicImages.length]);

  useEffect(() => {
    setActiveImageIndex(0);
    setImageTrackIndex(clinicImages.length > 1 ? 1 : 0);
    setIsImageAnimating(false);
    setIsImageJumping(false);
    imageLockedRef.current = false;
  }, [clinicImages.length]);

  useEffect(() => () => {
    if (imageResetTimerRef.current) {
      window.clearTimeout(imageResetTimerRef.current);
    }
  }, []);

  if (error) {
    return (
      <main className="container py-4">
        <div className="alert alert-danger">{error}</div>
      </main>
    );
  }

  if (!clinic) return <PageSkeleton label="Đang tải thông tin cơ sở..." />;

  const mapQuery = encodeURIComponent([clinic.address, clinic.name].filter(Boolean).join(' ') || 'clinic');
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
  const googleMapsEmbedUrl = `https://www.google.com/maps?q=${mapQuery}&output=embed`;

  return (
    <main className="section-band clinic-detail-page">
      <section className="clinic-detail-hero">
        <div className="clinic-hero-media">
          <div
            className="clinic-hero-image-track"
            data-animating={isImageAnimating}
            data-jumping={isImageJumping}
            style={{
              '--slide-count': clinicHeroSlides.length,
              '--active-slide': imageTrackIndex
            }}
            onTransitionEnd={handleImageTransitionEnd}
          >
            {clinicHeroSlides.map((image, index) => (
              <img
                className="clinic-hero-image"
                src={resolveMediaUrl(image, '/placeholder-clinic.svg')}
                alt={clinic.name}
                key={`${image}-${index}`}
                onError={(event) => useImageFallback(event, '/placeholder-clinic.svg')}
              />
            ))}
          </div>
        <div className="clinic-hero-overlay" />
        {clinicImages.length > 1 && (
          <div className="clinic-hero-carousel" aria-label="Chuyển ảnh cơ sở">
            <button className="clinic-hero-nav previous" type="button" onClick={showPreviousImage} aria-label="Ảnh trước">
              <FaChevronLeft size={17} />
            </button>
            <button className="clinic-hero-nav next" type="button" onClick={showNextImage} aria-label="Ảnh tiếp theo">
              <FaChevronRight size={17} />
            </button>
            <span className="clinic-hero-image-count">{activeImageIndex + 1}/{clinicImages.length}</span>
          </div>
        )}
        </div>
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

          <section className="clinic-specialties-section clinic-specialties-rich-section">
            <div className="clinic-section-head clinic-specialties-rich-head">
              <div>
                <span className="clinic-section-label">Chuyên khoa nổi bật</span>
                <h2>Chuyên khoa tại cơ sở</h2>
              </div>
              <p>{clinicSpecialtyCards.length} chuyên khoa phù hợp</p>
            </div>
            <div className="clinic-specialties-grid">
              {clinicSpecialtyCards.map((item) => (
                <article className="specialty-card clinic-specialty-real-card" key={item._id}>
                  <ClinicSpecialtyVisual item={item} content={item.content} />
                  <div className="specialty-card-body">
                    <div className="clinic-specialty-card-heading">
                      <h3>{item.name}</h3>
                      <span>{specialtyDoctorCounts[item._id] || 0} bác sĩ</span>
                    </div>
                    <p>{item.description || item.content.shortDescription}</p>
                    <div className="specialty-card-meta">
                      <span>{item.content.services[0]}</span>
                      <span>{specialtyDoctorCounts[item._id] || 0} bác sĩ đang nhận lịch</span>
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
                      <Link className="specialty-card-booking" to={`/booking?clinicId=${clinicId}&specialtyId=${item._id}`}>
                        Đặt lịch
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
              {!clinicSpecialtyCards.length && <span className="clinic-muted-note">Chưa có chuyên khoa.</span>}
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
              {clinicSpaceImages.map((image, index) => {
                const imageIndex = clinicImages.indexOf(image);
                const targetIndex = imageIndex >= 0 ? imageIndex : index;

                return (
                <button
                  className={`clinic-gallery-photo ${index === 0 ? 'large' : ''} ${activeImageIndex === targetIndex ? 'active' : ''}`}
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setActiveImageIndex(targetIndex)}
                >
                  <img
                    src={resolveMediaUrl(image, '/placeholder-clinic.svg')}
                    alt={`${clinic.name} - không gian ${index + 1}`}
                    onError={(event) => useImageFallback(event, '/placeholder-clinic.svg')}
                  />
                </button>
              );
              })}
              {clinicSpaceImages.length < 2 && <div className="clinic-gallery-tile">Phòng khám sạch sẽ</div>}
              {clinicSpaceImages.length < 3 && <div className="clinic-gallery-tile">Thiết bị hỗ trợ chẩn đoán</div>}
              {clinicSpaceImages.length < 4 && <div className="clinic-gallery-tile wide">Khu vực tiếp đón người bệnh</div>}
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
              <iframe
                title={`Bản đồ ${clinic.name}`}
                src={googleMapsEmbedUrl}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
              <span aria-hidden="true">📍</span>
            </div>
            <p>{clinic.address || 'Đang cập nhật địa chỉ'}</p>
            <a
              className="clinic-map-link"
              href={googleMapsUrl}
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
