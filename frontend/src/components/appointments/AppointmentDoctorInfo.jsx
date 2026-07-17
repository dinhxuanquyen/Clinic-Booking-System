import { useEffect, useMemo, useState } from 'react';
import { getClinicDisplayName, getDoctorDisplayName, getSpecialtyDisplayName } from '../../utils/appointmentView.js';
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

export default function AppointmentDoctorInfo({ appointment }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const doctor = appointment?.doctorId;
  const doctorName = getDoctorDisplayName(appointment);
  const avatar = doctor?.avatar || doctor?.image || doctor?.photoUrl;
  const avatarUrl = useMemo(() => {
    if (!avatar || avatarFailed) return '';
    return resolveMediaUrl(avatar, '');
  }, [avatar, avatarFailed]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatar]);

  return (
    <div className="pa-doctor-info">
      {avatarUrl ? (
        <img
          alt={doctorName}
          className="pa-doctor-avatar"
          loading="lazy"
          src={avatarUrl}
          onError={() => setAvatarFailed(true)}
        />
      ) : (
        <span className="pa-doctor-avatar fallback" aria-hidden="true">{initialsFromName(doctorName)}</span>
      )}
      <div>
        <strong>{doctor?.degree ? `${doctor.degree} ${doctorName}` : doctorName}</strong>
        <span>{getSpecialtyDisplayName(appointment)} · {getClinicDisplayName(appointment)}</span>
      </div>
    </div>
  );
}
