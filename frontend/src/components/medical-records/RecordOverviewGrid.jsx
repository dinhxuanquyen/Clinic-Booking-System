import { hasValue } from '../../utils/medicalRecordView.js';

export default function RecordOverviewGrid({ rows }) {
  return (
    <div className="phr-overview-grid phr-modal-overview-grid">
      {rows.filter(([, value]) => hasValue(value)).map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}
