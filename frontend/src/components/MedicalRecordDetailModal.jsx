import { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BaseModal from './BaseModal.jsx';
import AttachmentSection from './medical-records/AttachmentSection.jsx';
import ClinicalJourney from './medical-records/ClinicalJourney.jsx';
import DiagnosisHighlight from './medical-records/DiagnosisHighlight.jsx';
import DoctorProfileBlock from './medical-records/DoctorProfileBlock.jsx';
import FollowUpPlanCard from './medical-records/FollowUpPlanCard.jsx';
import MedicalRecordModalHeader from './medical-records/MedicalRecordModalHeader.jsx';
import MedicalRecordSectionNav from './medical-records/MedicalRecordSectionNav.jsx';
import PrescriptionSection from './medical-records/PrescriptionSection.jsx';
import RecordOverviewGrid from './medical-records/RecordOverviewGrid.jsx';
import VitalsGrid from './medical-records/VitalsGrid.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { downloadMedicalRecordPdf, printMedicalRecordPdf } from '../utils/medicalRecordPdf.js';
import {
  appointmentTypeLabel,
  displayName,
  displayText,
  examDate,
  formatDateVN,
  formatSlot,
  getInsuranceSnapshot,
  getSourceFollowUpRecord,
  getSourceFollowUpRecordId,
  getVitalItems,
  hasValue,
  isFollowUpMedicalRecord,
  maskInsuranceNumber,
  servicePackageName,
  sourceFollowUpVisitText
} from '../utils/medicalRecordView.js';

function sourceRecordPath(recordId, pathname) {
  if (pathname.startsWith('/doctor')) return `/doctor/medical-records?recordId=${recordId}`;
  return `/medical-records?recordId=${recordId}`;
}

function Section({ id, title, children, className = '' }) {
  return (
    <section className={`phr-detail-section ${className}`} id={id}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export default function MedicalRecordDetailModal({ record, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const contentRef = useRef(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);

  const appointment = record?.appointmentId || {};
  const vitals = getVitalItems(record);
  const prescription = Array.isArray(record?.prescription) ? record.prescription : [];
  const attachments = Array.isArray(record?.attachments) ? record.attachments : [];
  const visibleAttachments = attachments.filter((attachment) => hasValue(attachment?.name) || hasValue(attachment?.url));
  const insurance = getInsuranceSnapshot(record);
  const sourceRecord = getSourceFollowUpRecord(record);
  const sourceRecordId = getSourceFollowUpRecordId(record);
  const showSourceFollowUp = isFollowUpMedicalRecord(record) && sourceRecordId;
  const hasResults = ['symptoms', 'allergies', 'allergyHistory', 'icd10Code', 'diagnosis', 'conclusion', 'advice', 'doctorAdvice']
    .some((field) => hasValue(record?.[field]));

  const sections = useMemo(() => {
    if (!record) return [];
    return [
      { id: 'overview', label: 'Tổng quan', visible: true },
      { id: 'source', label: 'Hồ sơ gốc', visible: showSourceFollowUp },
      { id: 'journey', label: 'Hành trình khám', visible: hasResults },
      { id: 'diagnosis', label: 'Chẩn đoán', visible: hasValue(record.diagnosis) || hasValue(record.icd10Code) },
      { id: 'vitals', label: 'Chỉ số sinh tồn', visible: vitals.length > 0 },
      { id: 'prescription', label: 'Đơn thuốc', visible: true },
      { id: 'attachments', label: 'Cận lâm sàng', visible: visibleAttachments.length > 0 },
      { id: 'follow-up', label: 'Tái khám', visible: true },
      { id: 'doctor', label: 'Bác sĩ', visible: true }
    ].filter((item) => item.visible);
  }, [hasResults, record, showSourceFollowUp, visibleAttachments.length, vitals.length]);

  if (!record) return null;

  async function handleDownloadPdf() {
    if (!record?._id || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
      await downloadMedicalRecordPdf(record._id);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Medical record PDF download failed:', error?.status || error?.message || error);
      }
      toast.error(error.message || 'Không tải được PDF kết quả khám');
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  async function handlePrintPdf() {
    if (!record?._id || isPrintingPdf) return;
    setIsPrintingPdf(true);
    try {
      await printMedicalRecordPdf(record._id);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Medical record PDF print failed:', error?.status || error?.message || error);
      }
      toast.error('Không thể chuẩn bị bản in. Vui lòng thử lại.');
    } finally {
      setIsPrintingPdf(false);
    }
  }

  function scrollToSection(sectionId) {
    const target = contentRef.current?.querySelector(`#${sectionId}`);
    if (!target) return;
    setActiveSection(sectionId);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <BaseModal
      ariaLabelledBy="medical-record-detail-title"
      className="admin-modal phr-detail-modal phr-patient-record-modal"
      onClose={onClose}
      size="xl"
    >
      <MedicalRecordModalHeader
        isDownloadingPdf={isDownloadingPdf}
        isPrintingPdf={isPrintingPdf}
        onClose={onClose}
        onDownload={handleDownloadPdf}
        onPrint={handlePrintPdf}
        record={record}
      />

      <div className="phr-detail-shell phr-modal-shell">
        <MedicalRecordSectionNav activeSection={activeSection} onSelect={scrollToSection} sections={sections} />

        <div className="phr-detail-content phr-modal-content" ref={contentRef}>
          <MedicalRecordSectionNav activeSection={activeSection} mode="chips" onSelect={scrollToSection} sections={sections} />

          <Section id="overview" title="Tổng quan buổi khám">
            <RecordOverviewGrid rows={[
              ['Bác sĩ', displayName(record.doctorId)],
              ['Chuyên khoa', displayName(record.specialtyId)],
              ['Cơ sở', displayName(record.clinicId)],
              ['Dịch vụ', servicePackageName(record)],
              ['Ngày khám', formatDateVN(examDate(record))],
              ['Khung giờ', formatSlot(appointment.timeSlot)],
              ['Số thứ tự', appointment.queueNumber ? String(appointment.queueNumber).padStart(2, '0') : 'Chưa cấp'],
              ['Loại lịch', appointmentTypeLabel(record)]
            ]} />

            {insurance?.enabled && insurance?.insuranceNumber ? (
              <div className="phr-insurance-card phr-modal-insurance">
                <span>BHYT</span>
                <strong>{maskInsuranceNumber(insurance.insuranceNumber)}</strong>
                <p>Hết hạn: {formatDateVN(insurance.insuranceExpiryDate)} · Nơi KCB ban đầu: {displayText(insurance.insuranceRegisteredHospital)}</p>
              </div>
            ) : (
              <span className="phr-inline-badge">Không sử dụng BHYT</span>
            )}
          </Section>

          {showSourceFollowUp && (
            <Section id="source" title="Nguồn hồ sơ tái khám">
              <div className="phr-source-card phr-modal-source">
                <div>
                  <span>Hồ sơ gốc</span>
                  <strong>Ngày {sourceFollowUpVisitText(record)}</strong>
                  {sourceRecord?.diagnosis && <p>Chẩn đoán lần trước: {displayText(sourceRecord.diagnosis)}</p>}
                  {sourceRecord?.doctorId && <p>Bác sĩ: {displayName(sourceRecord.doctorId)}</p>}
                </div>
                <button
                  className="btn btn-outline-primary btn-sm"
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(sourceRecordPath(sourceRecordId, location.pathname));
                  }}
                >
                  Xem hồ sơ gốc
                </button>
              </div>
            </Section>
          )}

          {hasResults && (
            <Section id="journey" title="Hành trình khám" className="phr-results-section">
              <ClinicalJourney
                items={{
                  symptoms: record.symptoms,
                  allergy: record.allergyHistory || record.allergies,
                  diagnosis: record.diagnosis,
                  conclusion: record.conclusion,
                  advice: record.doctorAdvice || record.advice,
                  followUp: record.followUpRequired ? record.followUpNote || record.followUpReason || 'Có kế hoạch tái khám theo chỉ định.' : ''
                }}
              />
            </Section>
          )}

          {(hasValue(record.diagnosis) || hasValue(record.icd10Code)) && (
            <Section id="diagnosis" title="Chẩn đoán">
              <DiagnosisHighlight
                diagnosis={record.diagnosis}
                icd10Code={record.icd10Code}
                previousDiagnosis={sourceRecord?.diagnosis}
              />
            </Section>
          )}

          {vitals.length > 0 && (
            <Section id="vitals" title="Chỉ số sinh tồn">
              <VitalsGrid items={vitals} />
            </Section>
          )}

          <Section id="prescription" title="Đơn thuốc">
            <PrescriptionSection prescription={prescription} />
          </Section>

          {visibleAttachments.length > 0 && (
            <Section id="attachments" title="Cận lâm sàng">
              <AttachmentSection attachments={visibleAttachments} />
            </Section>
          )}

          <Section id="follow-up" title="Kế hoạch tái khám">
            <FollowUpPlanCard onClose={onClose} record={record} />
          </Section>

          <Section id="doctor" title="Bác sĩ phụ trách">
            <DoctorProfileBlock clinic={record.clinicId} doctor={record.doctorId} specialty={record.specialtyId} />
          </Section>
        </div>
      </div>
    </BaseModal>
  );
}
