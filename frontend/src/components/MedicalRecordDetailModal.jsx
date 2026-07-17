import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BaseModal from './BaseModal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { downloadPdf } from '../utils/downloadFile.js';
import {
  appointmentStatusLabel,
  appointmentTypeLabel,
  canBookFollowUp,
  displayName,
  displayText,
  examDate,
  followUpBookingUrl,
  followUpDescription,
  followUpStatusInfo,
  formatDateVN,
  formatSlot,
  getInsuranceSnapshot,
  getSourceFollowUpRecord,
  getSourceFollowUpRecordId,
  getVitalItems,
  hasValue,
  isFollowUpMedicalRecord,
  linkedFollowUpAppointmentId,
  maskInsuranceNumber,
  recordCode,
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

function OverviewGrid({ rows }) {
  return (
    <div className="phr-overview-grid">
      {rows.filter(([, value]) => hasValue(value)).map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function ResultBlock({ label, value, tone = 'neutral' }) {
  if (!hasValue(value)) return null;
  return (
    <div className={`phr-result-block ${tone}`}>
      <span>{label}</span>
      <p>{displayText(value)}</p>
    </div>
  );
}

function AttachmentType({ type }) {
  if (type === 'pdf') return 'PDF';
  if (type === 'image') return 'Ảnh';
  return 'Tệp';
}

export default function MedicalRecordDetailModal({ record, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);

  const appointment = record?.appointmentId || {};
  const vitals = getVitalItems(record);
  const prescription = Array.isArray(record?.prescription) ? record.prescription : [];
  const attachments = Array.isArray(record?.attachments) ? record.attachments : [];
  const insurance = getInsuranceSnapshot(record);
  const followUpStatus = followUpStatusInfo(record);
  const sourceRecord = getSourceFollowUpRecord(record);
  const sourceRecordId = getSourceFollowUpRecordId(record);
  const showSourceFollowUp = isFollowUpMedicalRecord(record) && sourceRecordId;
  const linkedAppointmentId = linkedFollowUpAppointmentId(record);

  const sections = useMemo(() => {
    if (!record) return [];
    return [
      { id: 'overview', label: 'Tổng quan', visible: true },
      { id: 'source', label: 'Hồ sơ tái khám', visible: showSourceFollowUp },
      { id: 'results', label: 'Kết quả khám', visible: ['symptoms', 'allergies', 'allergyHistory', 'icd10Code', 'diagnosis', 'conclusion', 'advice', 'doctorAdvice'].some((field) => hasValue(record[field])) },
      { id: 'vitals', label: 'Chỉ số sinh tồn', visible: vitals.length > 0 },
      { id: 'prescription', label: 'Đơn thuốc', visible: true },
      { id: 'attachments', label: 'Cận lâm sàng', visible: attachments.length > 0 },
      { id: 'follow-up', label: 'Tái khám', visible: true }
    ].filter((item) => item.visible);
  }, [attachments.length, record, showSourceFollowUp, vitals.length]);

  if (!record) return null;

  async function handleDownloadPdf() {
    if (!record?._id || downloading) return;
    setDownloading(true);
    try {
      await downloadPdf(`/medical-records/${record._id}/pdf`);
    } catch (error) {
      toast.error(error.message || 'Không tải được PDF kết quả khám');
    } finally {
      setDownloading(false);
    }
  }

  function scrollToSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <BaseModal className="admin-modal phr-detail-modal" onClose={onClose} size="xl">
      <header className="phr-detail-header">
        <div>
          <span className="phr-eyebrow">Hồ sơ khám bệnh</span>
          <h2>{recordCode(record)}</h2>
          <p>
            {formatDateVN(examDate(record))}
            {appointment.timeSlot ? ` · ${formatSlot(appointment.timeSlot)}` : ''}
            {' · '}
            {appointmentTypeLabel(record)}
            {' · '}
            {appointmentStatusLabel(appointment.status || 'completed')}
          </p>
          <p className="phr-detail-doctor">{displayName(record.doctorId)} · {displayName(record.specialtyId)}</p>
        </div>
        <div className="phr-detail-header-actions">
          <button className="btn btn-outline-primary btn-sm" disabled={downloading} type="button" onClick={handleDownloadPdf}>
            {downloading ? 'Đang tải...' : 'Tải PDF'}
          </button>
          <button className="phr-modal-close" type="button" aria-label="Đóng hồ sơ khám" onClick={onClose}>
            ×
          </button>
        </div>
      </header>

      <div className="phr-detail-shell">
        <nav className="phr-detail-nav" aria-label="Điều hướng hồ sơ">
          {sections.map((section) => (
            <button key={section.id} type="button" onClick={() => scrollToSection(section.id)}>
              {section.label}
            </button>
          ))}
        </nav>

        <div className="phr-detail-content">
          <div className="phr-anchor-chips" aria-label="Điều hướng hồ sơ trên di động">
            {sections.map((section) => (
              <button key={section.id} type="button" onClick={() => scrollToSection(section.id)}>
                {section.label}
              </button>
            ))}
          </div>

          <Section id="overview" title="Tổng quan">
            <OverviewGrid rows={[
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
              <div className="phr-insurance-card">
                <span>BHYT</span>
                <strong>{maskInsuranceNumber(insurance.insuranceNumber)}</strong>
                <p>Hết hạn: {formatDateVN(insurance.insuranceExpiryDate)} · Nơi KCB ban đầu: {displayText(insurance.insuranceRegisteredHospital)}</p>
              </div>
            ) : (
              <span className="phr-inline-badge">Không sử dụng BHYT</span>
            )}
          </Section>

          {showSourceFollowUp && (
            <Section id="source" title="Hồ sơ tái khám">
              <div className="phr-source-card">
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

          <Section id="results" title="Kết quả khám" className="phr-results-section">
            <ResultBlock label="Triệu chứng và bệnh sử" value={record.symptoms} />
            <ResultBlock label="Tiền sử dị ứng" value={record.allergyHistory || record.allergies} tone="warning" />
            <ResultBlock label="Mã ICD-10" value={record.icd10Code} />
            <ResultBlock label="Chẩn đoán" value={record.diagnosis} tone="primary" />
            <ResultBlock label="Kết luận và hướng điều trị" value={record.conclusion} tone="success" />
            <ResultBlock label="Lời dặn" value={record.doctorAdvice || record.advice} />
          </Section>

          {vitals.length > 0 && (
            <Section id="vitals" title="Chỉ số sinh tồn">
              <div className="phr-vitals-grid">
                {vitals.map(([label, value, unit]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}{unit ? ` ${unit}` : ''}</strong>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section id="prescription" title="Đơn thuốc">
            {prescription.length ? (
              <>
                <div className="phr-prescription-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Tên thuốc</th>
                        <th>Liều dùng</th>
                        <th>Số lần/ngày</th>
                        <th>Thời gian</th>
                        <th>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescription.map((item, index) => (
                        <tr key={`${item.medicineName}-${index}`}>
                          <td>{displayText(item.medicineName)}</td>
                          <td>{displayText(item.dosage, '-')}</td>
                          <td>{displayText(item.frequency, '-')}</td>
                          <td>{displayText(item.duration, '-')}</td>
                          <td>{displayText(item.note, '-')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="phr-medicine-cards">
                  {prescription.map((item, index) => (
                    <article key={`${item.medicineName}-${index}`}>
                      <strong>{displayText(item.medicineName)}</strong>
                      <span>Liều dùng: {displayText(item.dosage, '-')}</span>
                      <span>Số lần/ngày: {displayText(item.frequency, '-')}</span>
                      <span>Thời gian: {displayText(item.duration, '-')}</span>
                      {hasValue(item.note) && <span>Ghi chú: {displayText(item.note)}</span>}
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <p className="phr-compact-empty">Không kê đơn thuốc trong lần khám này.</p>
            )}
          </Section>

          {attachments.length > 0 && (
            <Section id="attachments" title="Cận lâm sàng">
              <div className="phr-attachments-list">
                {attachments.map((attachment, index) => (
                  <a href={attachment.url} target="_blank" rel="noreferrer" key={`${attachment.url}-${index}`}>
                    <span className="phr-file-icon"><AttachmentType type={attachment.type} /></span>
                    <div>
                      <strong>{displayText(attachment.name, 'Tệp đính kèm')}</strong>
                      <small>{displayText(attachment.type, 'Tài liệu')}</small>
                    </div>
                  </a>
                ))}
              </div>
            </Section>
          )}

          <Section id="follow-up" title="Kế hoạch tái khám">
            <div className={`phr-follow-up-callout ${followUpStatus.tone}`}>
              <div>
                <span>{followUpStatus.label}</span>
                <p>{followUpDescription(record)}</p>
              </div>
              <div className="phr-callout-actions">
                {canBookFollowUp(record) && (
                  <button
                    className="btn btn-primary btn-sm"
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(followUpBookingUrl(record));
                    }}
                  >
                    Đặt lịch tái khám
                  </button>
                )}
                {followUpStatus.key === 'scheduled' && linkedAppointmentId && (
                  <button
                    className="btn btn-outline-primary btn-sm"
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/appointments/my?appointmentId=${linkedAppointmentId}`);
                    }}
                  >
                    Xem lịch tái khám
                  </button>
                )}
              </div>
            </div>
          </Section>
        </div>
      </div>
    </BaseModal>
  );
}
