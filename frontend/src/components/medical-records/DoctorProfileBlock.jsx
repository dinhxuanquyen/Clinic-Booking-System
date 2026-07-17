import { useEffect, useMemo, useState } from 'react';
import { displayName } from '../../utils/medicalRecordView.js';
import { resolveMediaUrl } from '../../utils/media.js';

function initialsFromName(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'BS';
}

export default function DoctorProfileBlock({ clinic, doctor, specialty }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const doctorName = displayName(doctor);
  const avatar = doctor?.avatar || doctor?.image || doctor?.photoUrl;
  const avatarUrl = useMemo(() => {
    if (!avatar || avatarFailed) return '';
    return resolveMediaUrl(avatar, '');
  }, [avatar, avatarFailed]);
  const degree = doctor?.degree || doctor?.title || doctor?.academicTitle || '';
  const doctorCode = doctor?.doctorCode || doctor?.code || '';

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatar]);

  return (
    <div className="phr-doctor-profile">
      {avatarUrl ? (
        <img
          className="phr-doctor-profile-avatar"
          src={avatarUrl}
          alt={doctorName}
          loading="lazy"
          onError={() => setAvatarFailed(true)}
        />
      ) : (
        <span className="phr-doctor-profile-avatar fallback" aria-hidden="true">
          {initialsFromName(doctorName)}
        </span>
      )}
      <div>
        <span>Bác sĩ phụ trách</span>
        <strong>{degree ? `${degree} ${doctorName}` : doctorName}</strong>
        <p>{displayName(specialty)} · {displayName(clinic)}</p>
        {doctorCode && <small>Mã bác sĩ: {doctorCode}</small>}
      </div>
    </div>
  );
}
