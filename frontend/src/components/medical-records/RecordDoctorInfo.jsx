import { displayName } from '../../utils/medicalRecordView.js';

function initialsFromName(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'BS';
}

export default function RecordDoctorInfo({ doctor, specialty, clinic }) {
  const doctorName = displayName(doctor);
  const avatar = doctor?.avatar || doctor?.image || doctor?.photoUrl;

  return (
    <div className="phr-doctor-info">
      {avatar ? (
        <img className="phr-doctor-avatar" src={avatar} alt="" />
      ) : (
        <span className="phr-doctor-avatar fallback" aria-hidden="true">
          {initialsFromName(doctorName)}
        </span>
      )}
      <div>
        <strong>{doctorName}</strong>
        <span>{displayName(specialty)} · {displayName(clinic)}</span>
      </div>
    </div>
  );
}
