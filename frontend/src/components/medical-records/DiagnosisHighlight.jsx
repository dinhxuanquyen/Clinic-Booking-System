import { displayText, hasValue } from '../../utils/medicalRecordView.js';

export default function DiagnosisHighlight({ diagnosis, icd10Code, previousDiagnosis }) {
  if (!hasValue(diagnosis) && !hasValue(icd10Code)) return null;

  return (
    <div className="phr-diagnosis-highlight">
      <span>Chẩn đoán chính</span>
      <strong>{displayText(diagnosis, 'Chưa cập nhật chẩn đoán')}</strong>
      {hasValue(icd10Code) && <small>ICD-10: {displayText(icd10Code)}</small>}
      {hasValue(previousDiagnosis) && (
        <div className="phr-diagnosis-compare">
          <span>Chẩn đoán lần trước</span>
          <p>{displayText(previousDiagnosis)}</p>
        </div>
      )}
    </div>
  );
}
