import { hasValue } from '../../utils/medicalRecordView.js';

function vitalClass(label) {
  const text = String(label || '').toLowerCase();
  if (text.includes('huyết')) return 'blood-pressure';
  if (text.includes('tim')) return 'heart-rate';
  if (text.includes('nhiệt')) return 'temperature';
  if (text.includes('spo2')) return 'oxygen';
  if (text.includes('thở')) return 'respiratory';
  if (text.includes('cao')) return 'height';
  if (text.includes('nặng')) return 'weight';
  return 'metric';
}

export default function VitalsGrid({ items }) {
  const visibleItems = (items || []).filter(([, value]) => hasValue(value));
  if (!visibleItems.length) return null;

  return (
    <div className="phr-vitals-grid phr-modal-vitals phr-vitals-premium">
      {visibleItems.map(([label, value, unit]) => (
        <article className={`phr-vital-tile ${vitalClass(label)}`} key={label}>
          <span className="phr-vital-icon" aria-hidden="true" />
          <div>
            <span>{label}</span>
            <strong>{value}</strong>
            {hasValue(unit) && <small>{unit}</small>}
          </div>
        </article>
      ))}
    </div>
  );
}
