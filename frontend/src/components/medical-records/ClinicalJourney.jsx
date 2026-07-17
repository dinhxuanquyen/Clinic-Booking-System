import { displayText, hasValue } from '../../utils/medicalRecordView.js';

const JOURNEY_STEPS = [
  { key: 'symptoms', label: 'Triệu chứng và bệnh sử', tone: 'neutral' },
  { key: 'allergy', label: 'Tiền sử dị ứng', tone: 'warning' },
  { key: 'diagnosis', label: 'Chẩn đoán', tone: 'primary' },
  { key: 'conclusion', label: 'Hướng điều trị', tone: 'success' },
  { key: 'advice', label: 'Lời dặn', tone: 'neutral' },
  { key: 'followUp', label: 'Tái khám', tone: 'info' }
];

export default function ClinicalJourney({ items }) {
  const visibleSteps = JOURNEY_STEPS
    .map((step) => ({ ...step, value: items?.[step.key] }))
    .filter((step) => hasValue(step.value));

  if (!visibleSteps.length) {
    return <p className="phr-compact-empty">Chưa có thông tin lâm sàng chi tiết.</p>;
  }

  return (
    <div className="phr-clinical-journey">
      {visibleSteps.map((step, index) => (
        <article className={`phr-journey-step ${step.tone}`} key={step.key}>
          <span className="phr-journey-marker" aria-hidden="true">{index + 1}</span>
          <div>
            <h4>{step.label}</h4>
            <p>{displayText(step.value)}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
