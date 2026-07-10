import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import BaseModal from '../components/BaseModal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { downloadPdf } from '../utils/downloadFile.js';

function getName(value) {
  if (!value) return 'Đang cập nhật';
  return typeof value === 'object' ? value.name : value;
}

function formatDate(value) {
  if (!value) return 'Chưa cập nhật';
  return String(value).slice(0, 10);
}

function followUpText(record) {
  return record?.followUpRequired ? formatDate(record.followUpDate) : 'Không cần tái khám';
}

function followUpStatusLabel(record) {
  if (record?.followUpStatus === 'completed') return { label: 'Đã hoàn thành tái khám', tone: 'success' };
  if (!record?.followUpRequired) return { label: 'Không cần tái khám', tone: 'neutral' };
  if (record.followUpStatus === 'scheduled') return { label: 'Đã đặt lịch tái khám', tone: 'success' };
  if (record.followUpStatus === 'overdue') return { label: 'Quá hạn tái khám', tone: 'danger' };
  return { label: 'Cần tái khám', tone: 'warning' };
}

function buildFollowUpSummary(items) {
  return items.reduce((summary, record) => {
    if (!record.followUpRequired) return summary;
    const status = record.followUpStatus || 'recommended';
    summary.total += 1;
    summary[status] = (summary[status] || 0) + 1;
    return summary;
  }, {
    total: 0,
    recommended: 0,
    scheduled: 0,
    completed: 0,
    overdue: 0
  });
}

const FOLLOW_UP_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'recommended', label: 'Cần tái khám' },
  { value: 'overdue', label: 'Quá hạn' },
  { value: 'scheduled', label: 'Đã đặt lịch' },
  { value: 'completed', label: 'Đã hoàn thành' }
];

function InsuranceSnapshotCard({ insurance }) {
  const hasInsurance = Boolean(insurance?.enabled && insurance?.insuranceNumber);

  return (
    <div className={`insurance-snapshot-card medical-record-insurance-card ${hasInsurance ? 'active' : 'inactive'}`}>
      <div className="insurance-snapshot-heading">
        <div>
          <strong>Thông tin BHYT</strong>
          <span>Dữ liệu được ghi nhận tại thời điểm đặt lịch.</span>
        </div>
        <em>{hasInsurance ? 'Có BHYT' : 'Không sử dụng BHYT'}</em>
      </div>
      {hasInsurance && (
        <div className="insurance-snapshot-grid">
          <div>
            <span>Mã BHYT</span>
            <strong>{insurance.insuranceNumber}</strong>
          </div>
          <div>
            <span>Ngày hết hạn</span>
            <strong>{formatDate(insurance.insuranceExpiryDate)}</strong>
          </div>
          <div>
            <span>Nơi đăng ký KCB ban đầu</span>
            <strong>{insurance.insuranceRegisteredHospital || 'Chưa cập nhật'}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

function DoctorRecordDetailModal({ record, onClose, onDownloadPdf, downloading }) {
  if (!record) return null;
  const appointment = record.appointmentId || {};
  const followUpStatus = followUpStatusLabel(record);

  return (
    <BaseModal className="admin-modal medical-record-detail-modal" onClose={onClose} size="lg">
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
        <div>
          <span className="eyebrow">Hồ sơ đã tạo</span>
          <h2 className="h4 mt-2 mb-1">{getName(record.patientId)}</h2>
          <p className="text-secondary mb-0">{appointment.date || formatDate(record.createdAt)} · {appointment.timeSlot || 'Đang cập nhật'}</p>
        </div>
        <div className="d-flex flex-wrap justify-content-end gap-2">
          <button className="btn btn-sm btn-outline-success" disabled={downloading} type="button" onClick={() => onDownloadPdf(record)}>
            {downloading ? 'Đang tải...' : 'Tải PDF'}
          </button>
          <button className="btn btn-sm btn-outline-secondary" type="button" onClick={onClose}>Đóng</button>
        </div>
      </div>

      <div className="medical-record-detail-grid">
        <div><span>Bệnh nhân</span><strong>{getName(record.patientId)}</strong></div>
        <div><span>Cơ sở</span><strong>{getName(record.clinicId)}</strong></div>
        <div><span>Chuyên khoa</span><strong>{getName(record.specialtyId)}</strong></div>
        <div><span>Tái khám</span><strong>{followUpText(record)}</strong></div>
      </div>

      {record.followUpRequired && (
        <div className={`medical-record-follow-up-card ${followUpStatus.tone}`}>
          <div>
            <span>Kế hoạch tái khám</span>
            <strong>{followUpStatus.label}</strong>
            <p>Ngày tái khám khuyến nghị: {formatDate(record.followUpDate)}</p>
          </div>
        </div>
      )}

      <InsuranceSnapshotCard insurance={appointment.insuranceSnapshot} />

      {[
        ['Triệu chứng', record.symptoms || 'Chưa cập nhật'],
        ['Chẩn đoán', record.diagnosis],
        ['Kết luận', record.conclusion],
        ['Lời dặn', record.advice || 'Chưa cập nhật'],
        ['Ghi chú nội bộ', record.note || 'Không có']
      ].map(([label, value]) => (
        <div className="medical-record-detail-section" key={label}>
          <h3>{label}</h3>
          <p>{value}</p>
        </div>
      ))}

      <div className="medical-record-detail-section">
        <h3>Đơn thuốc</h3>
        {record.prescription?.length ? (
          <div className="table-responsive">
            <table className="table table-sm align-middle">
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
                {record.prescription.map((item, index) => (
                  <tr key={index}>
                    <td>{item.medicineName}</td>
                    <td>{item.dosage || '-'}</td>
                    <td>{item.frequency || '-'}</td>
                    <td>{item.duration || '-'}</td>
                    <td>{item.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Không có đơn thuốc.</p>
        )}
      </div>
    </BaseModal>
  );
}

export default function DoctorMedicalRecordsPage() {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [clinics, setClinics] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [downloadingRecordId, setDownloadingRecordId] = useState('');
  const [followUpSummary, setFollowUpSummary] = useState({ total: 0, recommended: 0, scheduled: 0, completed: 0, overdue: 0 });
  const [filters, setFilters] = useState({
    patientName: '',
    date: '',
    clinicId: '',
    specialtyId: '',
    followUpStatus: ''
  });

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  async function loadRecords() {
    setLoading(true);
    try {
      const payload = await api(`/doctor/medical-records${query ? `?${query}` : ''}`);
      const items = payload.data || [];
      setRecords(items);
      setFollowUpSummary(payload.meta?.followUpSummary || buildFollowUpSummary(items));
    } catch (error) {
      toast.error(error.message || 'Không tải được hồ sơ đã tạo');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, [query]);

  useEffect(() => {
    Promise.allSettled([api('/clinics'), api('/specialties')]).then(([clinicResult, specialtyResult]) => {
      if (clinicResult.status === 'fulfilled') setClinics(clinicResult.value.data || []);
      if (specialtyResult.status === 'fulfilled') setSpecialties(specialtyResult.value.data || []);
    });
  }, []);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function resetFilters() {
    setFilters({ patientName: '', date: '', clinicId: '', specialtyId: '', followUpStatus: '' });
  }

  async function downloadRecordPdf(record) {
    if (!record?._id || downloadingRecordId) return;
    setDownloadingRecordId(record._id);
    try {
      await downloadPdf(`/medical-records/${record._id}/pdf`, `ket-qua-kham-${record._id}.pdf`);
    } catch (error) {
      toast.error(error.message || 'Không tải được PDF');
    } finally {
      setDownloadingRecordId('');
    }
  }

  return (
    <div className="doctor-page">
      <div className="doctor-page-header">
        <div className="doctor-page-header-main">
          <p className="doctor-page-eyebrow">Hồ sơ khám bệnh</p>
          <h1 className="doctor-page-title">Hồ sơ đã tạo</h1>
          <p className="doctor-page-subtitle">Xem lại kết quả khám, chẩn đoán và đơn thuốc bạn đã cập nhật cho bệnh nhân.</p>
        </div>
      </div>

      <section className="doctor-record-follow-up-summary" aria-label="Tổng quan tái khám">
        <article className="doctor-record-follow-up-card warning">
          <span>Cần tái khám</span>
          <strong>{followUpSummary.recommended}</strong>
          <p>Hồ sơ có chỉ định tái khám, bệnh nhân chưa đặt lịch mới.</p>
        </article>
        <article className="doctor-record-follow-up-card danger">
          <span>Quá hạn</span>
          <strong>{followUpSummary.overdue}</strong>
          <p>Đã quá ngày tái khám khuyến nghị, cần nhắc bệnh nhân.</p>
        </article>
        <article className="doctor-record-follow-up-card success">
          <span>Đã đặt lịch</span>
          <strong>{followUpSummary.scheduled}</strong>
          <p>Bệnh nhân đã có lịch tái khám liên kết với hồ sơ.</p>
        </article>
        <article className="doctor-record-follow-up-card neutral">
          <span>Đã hoàn thành</span>
          <strong>{followUpSummary.completed}</strong>
          <p>Hồ sơ đã được ghi nhận hoàn tất vòng tái khám.</p>
        </article>
      </section>

      <section className="queue-filter-card medical-record-filter-card">
        <div>
          <label className="form-label">Tên bệnh nhân</label>
          <input className="form-control" value={filters.patientName} onChange={(event) => updateFilter('patientName', event.target.value)} />
        </div>
        <div>
          <label className="form-label">Ngày tạo</label>
          <input className="form-control" type="date" value={filters.date} onChange={(event) => updateFilter('date', event.target.value)} />
        </div>
        <div>
          <label className="form-label">Cơ sở</label>
          <select className="form-select" value={filters.clinicId} onChange={(event) => updateFilter('clinicId', event.target.value)}>
            <option value="">Tất cả cơ sở</option>
            {clinics.map((clinic) => (
              <option key={clinic._id} value={clinic._id}>{clinic.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Chuyên khoa</label>
          <select className="form-select" value={filters.specialtyId} onChange={(event) => updateFilter('specialtyId', event.target.value)}>
            <option value="">Tất cả chuyên khoa</option>
            {specialties.map((specialty) => (
              <option key={specialty._id} value={specialty._id}>{specialty.name}</option>
            ))}
          </select>
        </div>
        <div className="doctor-follow-up-status-filter">
          <span>Trạng thái tái khám</span>
          {FOLLOW_UP_FILTERS.map((item) => (
            <button
              className={filters.followUpStatus === item.value ? 'active' : ''}
              key={item.value || 'all'}
              type="button"
              onClick={() => updateFilter('followUpStatus', item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button className="btn btn-outline-secondary align-self-end" type="button" onClick={resetFilters}>
          Xóa lọc
        </button>
      </section>

      <section className="management-panel admin-table-card">
        {loading ? (
          <div className="admin-empty-state"><p>Đang tải hồ sơ...</p></div>
        ) : records.length ? (
          <div className="table-responsive">
            <table className="table table-hover align-middle admin-table">
              <thead>
                <tr>
                  <th>Ngày khám</th>
                  <th>Bệnh nhân</th>
                  <th>Cơ sở</th>
                  <th>Chuyên khoa</th>
                  <th>Chẩn đoán</th>
                  <th>Tái khám</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const appointment = record.appointmentId || {};
                  const followUpStatus = followUpStatusLabel(record);
                  return (
                    <tr key={record._id}>
                      <td>{appointment.date || formatDate(record.createdAt)}</td>
                      <td>{getName(record.patientId)}</td>
                      <td>{getName(record.clinicId)}</td>
                      <td>{getName(record.specialtyId)}</td>
                      <td>{record.diagnosis}</td>
                      <td>
                        <div className="doctor-follow-up-table-cell">
                          <span className={`follow-up-status-pill ${followUpStatus.tone}`}>{followUpStatus.label}</span>
                          {record.followUpRequired && <small>{formatDate(record.followUpDate)}</small>}
                        </div>
                      </td>
                      <td className="text-end">
                        <div className="d-flex flex-wrap justify-content-end gap-2">
                          <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => setSelected(record)}>
                            Xem chi tiết
                          </button>
                          <button className="btn btn-sm btn-outline-success" disabled={downloadingRecordId === record._id} type="button" onClick={() => downloadRecordPdf(record)}>
                            {downloadingRecordId === record._id ? 'Đang tải...' : 'Tải PDF'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <span aria-hidden="true">+</span>
            <p>Chưa có hồ sơ khám bệnh</p>
          </div>
        )}
      </section>

      <DoctorRecordDetailModal
        downloading={downloadingRecordId === selected?._id}
        record={selected}
        onClose={() => setSelected(null)}
        onDownloadPdf={downloadRecordPdf}
      />
    </div>
  );
}
