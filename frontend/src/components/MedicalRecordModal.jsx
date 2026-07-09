import { useMemo, useState } from 'react';
import BaseModal from './BaseModal.jsx';

const emptyMedicine = {
  medicineName: '',
  dosage: '',
  frequency: '',
  duration: '',
  note: ''
};

const emptyAttachment = {
  url: '',
  name: '',
  type: 'image'
};

const initialForm = {
  symptoms: '',
  diagnosis: '',
  conclusion: '',
  prescription: [],
  advice: '',
  followUpRequired: false,
  followUpDate: '',
  note: '',
  icd10Code: '',
  allergies: '',
  vitals: {
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    respiratoryRate: '',
    spo2: '',
    height: '',
    weight: '',
    bmi: ''
  },
  attachments: []
};

const vitalFieldOrder = ['bloodPressure', 'heartRate', 'temperature', 'spo2', 'height', 'weight', 'bmi'];

const vitalFieldConfig = {
  bloodPressure: { label: 'Huyết áp', unit: 'mmHg', placeholder: 'VD: 120/80' },
  heartRate: { label: 'Nhịp tim', unit: 'lần/phút', type: 'number', placeholder: 'VD: 80' },
  temperature: { label: 'Nhiệt độ', unit: '°C', type: 'number', step: '0.1', placeholder: 'VD: 37.2' },
  spo2: { label: 'SpO2', unit: '%', type: 'number', placeholder: 'VD: 98' },
  height: { label: 'Chiều cao', unit: 'cm', type: 'number', placeholder: 'VD: 170' },
  weight: { label: 'Cân nặng', unit: 'kg', type: 'number', placeholder: 'VD: 65' },
  bmi: { label: 'BMI', placeholder: 'Tự động tính', readonly: true }
};

const vitalPresets = [
  { key: 'basic', label: 'Bộ cơ bản', fields: ['bloodPressure', 'heartRate', 'temperature'] },
  { key: 'respiratory', label: 'Sốt / hô hấp', fields: ['temperature', 'spo2', 'heartRate'] },
  { key: 'cardio', label: 'Tim mạch', fields: ['bloodPressure', 'heartRate'] },
  { key: 'pediatric', label: 'Nhi khoa', fields: ['temperature', 'weight'] },
  { key: 'general', label: 'Tổng quát', fields: ['bloodPressure', 'heartRate', 'temperature', 'spo2', 'height', 'weight', 'bmi'] }
];

function patientName(appointment) {
  return appointment?.patientInfo?.name || appointment?.patientId?.name || 'Bệnh nhân';
}

function calculateBmi(vitals) {
  const heightM = Number(vitals.height) / 100;
  const weightKg = Number(vitals.weight);
  if (!heightM || !weightKg || heightM <= 0 || weightKg <= 0) return '';
  return (weightKg / (heightM * heightM)).toFixed(1);
}

function cleanVitals(vitals, enabled) {
  if (!enabled) return {};
  return Object.entries(vitals || {}).reduce((result, [key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      result[key] = value;
    }
    return result;
  }, {});
}

export default function MedicalRecordModal({ appointment, onClose, onSubmit, submitting = false }) {
  const [form, setForm] = useState(initialForm);
  const [vitalsEnabled, setVitalsEnabled] = useState(false);
  const [activeVitalPreset, setActiveVitalPreset] = useState('basic');
  const title = useMemo(() => `Hồ sơ khám - ${patientName(appointment)}`, [appointment]);

  const activeVitalFields = useMemo(() => {
    const preset = vitalPresets.find((item) => item.key === activeVitalPreset) || vitalPresets[0];
    const fieldSet = new Set(preset.fields);
    if (fieldSet.has('height') && fieldSet.has('weight')) fieldSet.add('bmi');
    return vitalFieldOrder.filter((field) => fieldSet.has(field));
  }, [activeVitalPreset]);

  if (!appointment) return null;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateVital(field, value) {
    setForm((current) => {
      const nextVitals = { ...current.vitals, [field]: value };
      nextVitals.bmi = calculateBmi(nextVitals);
      return { ...current, vitals: nextVitals };
    });
  }

  function toggleNoFollowUp(checked) {
    setForm((current) => ({
      ...current,
      followUpRequired: !checked,
      followUpDate: checked ? '' : current.followUpDate
    }));
  }

  function applyVitalPreset(presetKey) {
    setVitalsEnabled(true);
    setActiveVitalPreset(presetKey);
  }

  function updateMedicine(index, field, value) {
    setForm((current) => ({
      ...current,
      prescription: current.prescription.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      ))
    }));
  }

  function addMedicine() {
    setForm((current) => ({
      ...current,
      prescription: [...current.prescription, { ...emptyMedicine }]
    }));
  }

  function removeMedicine(index) {
    setForm((current) => ({
      ...current,
      prescription: current.prescription.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function updateAttachment(index, field, value) {
    setForm((current) => ({
      ...current,
      attachments: current.attachments.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      ))
    }));
  }

  function addAttachment() {
    setForm((current) => ({
      ...current,
      attachments: [...current.attachments, { ...emptyAttachment }]
    }));
  }

  function removeAttachment(index) {
    setForm((current) => ({
      ...current,
      attachments: current.attachments.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function submit(event) {
    event.preventDefault();
    if (form.followUpRequired && !form.followUpDate) {
      event.currentTarget.reportValidity();
      return;
    }

    onSubmit?.({
      ...form,
      appointmentId: appointment._id,
      vitals: cleanVitals(form.vitals, vitalsEnabled),
      prescription: form.prescription.filter((item) => (
        item.medicineName || item.dosage || item.frequency || item.duration || item.note
      )),
      attachments: form.attachments.filter((item) => item.url && item.name)
    });
  }

  return (
    <BaseModal className="admin-modal medical-record-modal" disableClose={submitting} onClose={onClose} size="lg">
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
        <div>
          <span className="eyebrow">Hồ sơ khám bệnh</span>
          <h2 className="h4 mt-2 mb-1">{title}</h2>
          <p className="text-secondary mb-0">{appointment.date} - {appointment.timeSlot}</p>
        </div>
        <button className="btn btn-sm btn-outline-secondary" disabled={submitting} type="button" onClick={onClose}>
          Đóng
        </button>
      </div>

      <form className="medical-record-form" onSubmit={submit}>
        <div className="medical-record-modal-body">
          <div className="medical-record-section medical-vitals-card">
            <div className="medical-vitals-header">
              <div>
                <h3 className="h6 mb-1">Chỉ số sinh tồn (nếu có)</h3>
                <p className="text-secondary small mb-0">
                  Không bắt buộc. Bác sĩ có thể bổ sung nếu buổi khám có đo chỉ số.
                </p>
              </div>
              <label className="medical-vitals-toggle">
                <input
                  checked={vitalsEnabled}
                  disabled={submitting}
                  type="checkbox"
                  onChange={(event) => setVitalsEnabled(event.target.checked)}
                />
                <span>Có đo chỉ số sinh tồn</span>
              </label>
            </div>

            <div className="medical-vitals-presets" aria-label="Chọn bộ chỉ số sinh tồn">
              {vitalPresets.map((preset) => (
                <button
                  className={`medical-vitals-preset ${vitalsEnabled && activeVitalPreset === preset.key ? 'active' : ''}`}
                  disabled={submitting}
                  key={preset.key}
                  type="button"
                  onClick={() => applyVitalPreset(preset.key)}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {vitalsEnabled ? (
              <div className="medical-vitals-grid compact">
                {activeVitalFields.map((field) => {
                  const config = vitalFieldConfig[field];
                  const value = form.vitals[field] || '';
                  return (
                    <div className="medical-record-field" key={field}>
                      <label className="form-label mb-1">
                        {config.label}{config.unit ? ` (${config.unit})` : ''}
                      </label>
                      <input
                        className="form-control form-control-sm"
                        disabled={submitting || config.readonly}
                        placeholder={config.placeholder}
                        readOnly={config.readonly}
                        step={config.step}
                        type={config.type || 'text'}
                        value={value}
                        onChange={(event) => updateVital(field, event.target.value)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="medical-vitals-collapsed-note">
                Không bắt buộc. Bác sĩ có thể bổ sung nếu buổi khám có đo chỉ số.
              </div>
            )}
          </div>

          <div className="medical-record-grid">
            <div className="medical-record-field">
              <label className="form-label">Triệu chứng & bệnh sử</label>
              <textarea className="form-control" rows="2" value={form.symptoms} onChange={(event) => update('symptoms', event.target.value)} />
            </div>
            <div className="medical-record-field">
              <label className="form-label">Tiền sử dị ứng</label>
              <textarea className="form-control" rows="2" placeholder="Thuốc, thức ăn..." value={form.allergies} onChange={(event) => update('allergies', event.target.value)} />
            </div>
          </div>

          <div className="medical-record-grid mt-3">
            <div className="medical-record-field" style={{ flex: 1 }}>
              <label className="form-label">Mã ICD-10</label>
              <input className="form-control" placeholder="VD: J02.9" value={form.icd10Code} onChange={(event) => update('icd10Code', event.target.value)} />
            </div>
            <div className="medical-record-field" style={{ flex: 3 }}>
              <label className="form-label">Chẩn đoán <span className="text-danger">*</span></label>
              <input className="form-control" required placeholder="Chẩn đoán xác định" value={form.diagnosis} onChange={(event) => update('diagnosis', event.target.value)} />
            </div>
          </div>

          <div className="medical-record-grid mt-3">
            <div className="medical-record-field">
              <label className="form-label">Kết luận & hướng điều trị <span className="text-danger">*</span></label>
              <textarea className="form-control" required rows="2" value={form.conclusion} onChange={(event) => update('conclusion', event.target.value)} />
            </div>
            <div className="medical-record-field">
              <label className="form-label">Lời dặn</label>
              <textarea className="form-control" rows="2" value={form.advice} onChange={(event) => update('advice', event.target.value)} />
            </div>
          </div>

          <div className="medical-record-section mt-4">
            <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
              <div>
                <h3 className="h6 mb-1">Cận lâm sàng</h3>
                <p className="text-secondary small mb-0">Thêm URL ảnh chụp X-quang, siêu âm, xét nghiệm.</p>
              </div>
              <button className="btn btn-sm btn-outline-primary" disabled={submitting} type="button" onClick={addAttachment}>
                Đính kèm URL kết quả
              </button>
            </div>

            {form.attachments.length ? (
              <div className="medical-prescription-list">
                {form.attachments.map((attachment, index) => (
                  <div className="medical-prescription-item" key={index}>
                    <div className="medical-prescription-fields" style={{ gridTemplateColumns: '2fr 3fr 1fr' }}>
                      <input
                        className="form-control"
                        placeholder="Tên kết quả (VD: X-quang phổi)"
                        required
                        value={attachment.name}
                        onChange={(event) => updateAttachment(index, 'name', event.target.value)}
                      />
                      <input
                        className="form-control"
                        placeholder="URL ảnh/PDF (https://...)"
                        required
                        value={attachment.url}
                        onChange={(event) => updateAttachment(index, 'url', event.target.value)}
                      />
                      <select
                        className="form-select"
                        value={attachment.type}
                        onChange={(event) => updateAttachment(index, 'type', event.target.value)}
                      >
                        <option value="image">Hình ảnh</option>
                        <option value="pdf">PDF</option>
                        <option value="other">Khác</option>
                      </select>
                    </div>
                    <button className="btn btn-sm btn-outline-danger" disabled={submitting} type="button" onClick={() => removeAttachment(index)}>
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-empty-state compact-empty-state">
                <p>Chưa có kết quả cận lâm sàng đính kèm</p>
              </div>
            )}
          </div>

          <div className="medical-record-section mt-4">
            <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
              <div>
                <h3 className="h6 mb-1">Đơn thuốc</h3>
                <p className="text-secondary small mb-0">Thêm thuốc nếu bác sĩ có kê đơn cho bệnh nhân.</p>
              </div>
              <button className="btn btn-sm btn-outline-primary" disabled={submitting} type="button" onClick={addMedicine}>
                Thêm thuốc
              </button>
            </div>

            {form.prescription.length ? (
              <div className="medical-prescription-list">
                {form.prescription.map((medicine, index) => (
                  <div className="medical-prescription-item" key={index}>
                    <div className="medical-prescription-fields">
                      <input
                        className="form-control"
                        placeholder="Tên thuốc"
                        required={Boolean(medicine.dosage || medicine.frequency || medicine.duration || medicine.note)}
                        value={medicine.medicineName}
                        onChange={(event) => updateMedicine(index, 'medicineName', event.target.value)}
                      />
                      <input className="form-control" placeholder="Liều dùng" value={medicine.dosage} onChange={(event) => updateMedicine(index, 'dosage', event.target.value)} />
                      <input className="form-control" placeholder="Số lần/ngày" value={medicine.frequency} onChange={(event) => updateMedicine(index, 'frequency', event.target.value)} />
                      <input className="form-control" placeholder="Thời gian dùng" value={medicine.duration} onChange={(event) => updateMedicine(index, 'duration', event.target.value)} />
                      <input className="form-control" placeholder="Ghi chú" value={medicine.note} onChange={(event) => updateMedicine(index, 'note', event.target.value)} />
                    </div>
                    <button className="btn btn-sm btn-outline-danger" disabled={submitting} type="button" onClick={() => removeMedicine(index)}>
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-empty-state compact-empty-state">
                <p>Chưa có thuốc trong đơn</p>
              </div>
            )}
          </div>

          <div className="medical-record-grid mt-4 pt-3 border-top">
            <div className="medical-record-field">
              <label className="form-label">Ngày tái khám</label>
              <label className="medical-follow-up-toggle">
                <input
                  checked={!form.followUpRequired}
                  disabled={submitting}
                  type="checkbox"
                  onChange={(event) => toggleNoFollowUp(event.target.checked)}
                />
                <span>Không cần tái khám</span>
              </label>
              <input
                className="form-control"
                disabled={!form.followUpRequired || submitting}
                required={form.followUpRequired}
                type="date"
                value={form.followUpDate}
                onChange={(event) => update('followUpDate', event.target.value)}
              />
            </div>
            <div className="medical-record-field">
              <label className="form-label">Ghi chú nội bộ</label>
              <input className="form-control" placeholder="Chỉ phòng khám và bác sĩ thấy" value={form.note} onChange={(event) => update('note', event.target.value)} />
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top medical-record-modal-footer">
          <button className="btn btn-outline-secondary" disabled={submitting} type="button" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-primary" disabled={submitting} type="submit">
            {submitting ? 'Đang lưu...' : 'Lưu hồ sơ và hoàn thành'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
