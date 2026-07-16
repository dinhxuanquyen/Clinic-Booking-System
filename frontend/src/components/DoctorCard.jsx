import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaMapMarkerAlt, FaStar, FaStethoscope } from './icons/FaIcons.jsx';
import { resolveMediaUrl } from '../utils/media.js';

function getSpecialtyName(doctor) {
  if (!doctor?.specialtyId) return 'Đang cập nhật';
  return typeof doctor.specialtyId === 'object' ? doctor.specialtyId.name : doctor.specialtyId;
}

function getRating(doctor) {
  if (!doctor?.ratingCount) return null;
  return Number(doctor.ratingAverage || 0).toFixed(1);
}

function hasActiveSchedule(doctor) {
  if (Array.isArray(doctor?.workingDays) && doctor.workingDays.length > 0) return true;
  if (doctor?.workingHours?.start || doctor?.workingHours?.end) return true;
  if (typeof doctor?.workingHours === 'string' && doctor.workingHours.trim()) return true;
  return false;
}

function getInitial(name = '') {
  const clean = name.replace(/^(BS\.|TS\.|PGS\.|GS\.)\s?/i, '').trim();
  return clean.charAt(0).toUpperCase() || 'B';
}

export default function DoctorCard({ doctor, to }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const rating = getRating(doctor);
  const specialtyName = getSpecialtyName(doctor);
  const accepting = hasActiveSchedule(doctor);
  const initial = getInitial(doctor.name || '');
  const avatarUrl = useMemo(() => {
    if (!doctor.avatar || avatarFailed) return '';
    return resolveMediaUrl(doctor.avatar, '');
  }, [doctor.avatar, avatarFailed]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [doctor.avatar]);

  return (
    <article className="dc-card">
      {/* Photo */}
      <div className="dc-photo-wrap">
        <div className="dc-photo-bg" />
        {avatarUrl ? (
          <img
            className="dc-photo"
            src={avatarUrl}
            alt={doctor.name}
            loading="lazy"
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <div className="dc-photo dc-photo-placeholder">
            <span className="dc-photo-placeholder-avatar">{initial}</span>
            <span className="dc-photo-placeholder-label">Bác sĩ</span>
          </div>
        )}
        {accepting && (
          <span className="dc-accepting-pill">
            <span className="dc-accepting-dot" />
            Đang nhận lịch
          </span>
        )}
        {rating && (
          <span className="dc-rating-badge">
            <FaStar size={11} />
            {rating}
            {doctor.ratingCount ? <small>&nbsp;({doctor.ratingCount})</small> : null}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="dc-body">
        <div className="dc-specialty-chip">
          <FaStethoscope size={12} />
          {specialtyName}
        </div>

        <h3 className="dc-name">{doctor.name}</h3>

        {doctor.degree && (
          <p className="dc-degree">{doctor.degree}</p>
        )}

        {doctor.position && (
          <p className="dc-position">{doctor.position}</p>
        )}

        <div className="dc-meta-list">
          {doctor.workplace && (
            <div className="dc-meta-item">
              <FaMapMarkerAlt size={13} />
              <span>{doctor.workplace}</span>
            </div>
          )}
          {(doctor.experienceYears > 0) && (
            <div className="dc-meta-item">
              <FaStar size={13} />
              <span>{doctor.experienceYears} năm kinh nghiệm</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="dc-footer">
        <Link className="dc-cta-btn" to={to}>
          Xem &amp; đặt lịch
          <FaArrowRight size={13} />
        </Link>
      </div>
    </article>
  );
}
