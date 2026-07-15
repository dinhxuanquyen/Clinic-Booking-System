import fs from 'fs';
import PDFDocument from 'pdfkit';

const fontCandidates = [
  'C:/Windows/Fonts/arial.ttf',
  'C:/Windows/Fonts/Arial.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
];

function nameOf(value, fallback = 'Đang cập nhật') {
  if (!value) return fallback;
  return typeof value === 'object' ? value.name || fallback : String(value);
}

function idOf(value) {
  if (!value) return '';
  return String(value._id || value);
}

function formatDateTime(value = new Date()) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(new Date(value));
}

function createDocument(title) {
  const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true });
  const fontPath = fontCandidates.find((candidate) => fs.existsSync(candidate));
  if (fontPath) {
    doc.registerFont('Regular', fontPath);
    doc.registerFont('Bold', fontPath);
    doc.font('Regular');
  }

  doc.info.Title = title;
  return doc;
}

function drawHeader(doc, title, clinicName = '') {
  doc
    .fontSize(18)
    .fillColor('#0f2b5b')
    .text('Clinic Booking', { continued: false })
    .moveDown(0.2)
    .fontSize(10)
    .fillColor('#64748b')
    .text('Hệ thống đặt lịch khám bệnh trực tuyến');

  doc
    .moveDown(0.8)
    .fontSize(16)
    .fillColor('#0d6efd')
    .text(title, { align: 'center' });

  if (clinicName) {
    doc
      .moveDown(0.2)
      .fontSize(11)
      .fillColor('#334155')
      .text(clinicName, { align: 'center' });
  }

  doc
    .moveDown(0.8)
    .strokeColor('#dbeafe')
    .lineWidth(1)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke()
    .moveDown(1);
}

function drawFooter(doc) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i += 1) {
    doc.switchToPage(i);
    const y = doc.page.height - 52;
    doc
      .fontSize(9)
      .fillColor('#64748b')
      .text('Phiếu được tạo tự động từ hệ thống Clinic Booking.', doc.page.margins.left, y, {
        align: 'center',
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right
      });
  }
}

function drawMeta(doc, code) {
  doc
    .fontSize(10)
    .fillColor('#334155')
    .text(`Mã phiếu: ${code}`)
    .text(`Ngày xuất phiếu: ${formatDateTime(new Date())}`)
    .moveDown(0.8);
}

function drawSectionTitle(doc, title) {
  doc
    .moveDown(0.6)
    .fontSize(12)
    .fillColor('#0f2b5b')
    .text(title)
    .moveDown(0.3);
}

function drawRows(doc, rows) {
  const left = doc.page.margins.left;
  const labelWidth = 155;
  const valueWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right - labelWidth;

  rows.forEach(([label, value]) => {
    const y = doc.y;
    const text = value === undefined || value === null || value === '' ? '-' : String(value);
    const rowHeight = Math.max(
      doc.heightOfString(label, { width: labelWidth }),
      doc.heightOfString(text, { width: valueWidth })
    ) + 10;

    doc
      .roundedRect(left, y, labelWidth + valueWidth, rowHeight, 6)
      .fillAndStroke('#f8fbff', '#e5f2ff');
    doc
      .fillColor('#64748b')
      .fontSize(10)
      .text(label, left + 10, y + 7, { width: labelWidth - 16 });
    doc
      .fillColor('#0f172a')
      .text(text, left + labelWidth + 8, y + 7, { width: valueWidth - 16 });
    doc.y = y + rowHeight + 6;
  });
}

function drawPrescription(doc, prescription = []) {
  if (!prescription.length) {
    drawRows(doc, [['Đơn thuốc', 'Không có đơn thuốc']]);
    return;
  }

  prescription.forEach((item, index) => {
    drawRows(doc, [
      [`Thuốc ${index + 1}`, item.medicineName || '-'],
      ['Liều dùng', item.dosage || '-'],
      ['Số lần/ngày', item.frequency || '-'],
      ['Thời gian dùng', item.duration || '-'],
      ['Ghi chú', item.note || '-']
    ]);
  });
}

function formatDateOnly(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(new Date(value));
}

function getInsuranceSnapshot(source) {
  return source?.insuranceSnapshot || source?.appointmentId?.insuranceSnapshot || null;
}

function servicePackageName(source) {
  const servicePackage = source?.servicePackageSnapshot || source?.servicePackageId || source?.appointmentId?.servicePackageSnapshot;
  if (!servicePackage || typeof servicePackage !== 'object') return 'Để bác sĩ tư vấn';
  return servicePackage.name || 'Khám theo tư vấn của bác sĩ';
}

function appointmentTypeLabel(appointment) {
  return appointment?.isFollowUp || appointment?.followUpRecordId ? 'Tái khám' : 'Khám mới';
}

function appointmentStatusLabel(status) {
  const labels = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    in_progress: 'Đang khám',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
    no_show: 'Không đến khám',
    cancel_requested: 'Yêu cầu hủy',
    reschedule_requested: 'Yêu cầu đổi lịch',
    reschedule_rejected: 'Từ chối đổi lịch'
  };

  return labels[status] || status || '-';
}

function followUpStatusLabel(status) {
  const labels = {
    none: 'Không cần tái khám',
    recommended: 'Cần đặt lịch tái khám',
    scheduled: 'Đã đặt lịch tái khám',
    completed: 'Đã hoàn thành tái khám',
    overdue: 'Quá hạn tái khám',
    cancelled: 'Đã hủy lịch tái khám'
  };

  return labels[status] || 'Cần tái khám';
}

function followUpAppointmentText(appointment) {
  if (!appointment || typeof appointment !== 'object') return '';
  const parts = [];
  if (appointment.date) parts.push(formatDateOnly(appointment.date));
  if (appointment.timeSlot) parts.push(appointment.timeSlot);
  return parts.join(' - ');
}

function medicalRecordFollowUpRows(record) {
  if (!record.followUpRequired) {
    return [['Kế hoạch tái khám', 'Không cần tái khám']];
  }

  const status = record.followUpStatus || 'recommended';
  const followUpAppointment = record.followUpAppointmentId;
  const rows = [
    ['Kế hoạch tái khám', followUpStatusLabel(status)],
    [
      'Ngày tái khám khuyến nghị',
      record.followUpDate ? formatDateOnly(record.followUpDate) : 'Bệnh nhân tự chọn ngày phù hợp'
    ]
  ];

  if (status === 'scheduled' && followUpAppointment) {
    const scheduleText = followUpAppointmentText(followUpAppointment);
    rows.push([
      'Lịch tái khám đã đặt',
      scheduleText ? `Đã đặt lịch tái khám ngày ${scheduleText}` : `Đã đặt lịch tái khám: AP-${idOf(followUpAppointment).slice(-8).toUpperCase()}`
    ]);
  } else if (followUpAppointment) {
    rows.push(['Mã lịch tái khám', `AP-${idOf(followUpAppointment).slice(-8).toUpperCase()}`]);
  }

  if (status === 'overdue') {
    rows.push(['Tình trạng xử lý', 'Quá hạn tái khám']);
  }

  if (status === 'cancelled') {
    rows.push(['Tình trạng xử lý', 'Lịch tái khám đã hủy, bệnh nhân cần đặt lại nếu vẫn cần theo dõi']);
  }

  if (status === 'completed' && record.followUpCompletedRecordId) {
    rows.push(['Hồ sơ tái khám', `MR-${idOf(record.followUpCompletedRecordId).slice(-8).toUpperCase()}`]);
  }

  return rows;
}

function consultationStatusLabel(status) {
  const labels = {
    waiting: 'Chờ khám',
    in_progress: 'Đang khám',
    completed: 'Hoàn thành',
    skipped: 'Bỏ qua'
  };

  return labels[status] || status || 'Chờ khám';
}

function drawInsuranceSection(doc, source) {
  const insurance = getInsuranceSnapshot(source);
  drawSectionTitle(doc, 'THÔNG TIN BHYT');

  if (!insurance?.enabled || !insurance?.insuranceNumber) {
    drawRows(doc, [['BHYT', 'Không sử dụng BHYT']]);
    return;
  }

  drawRows(doc, [
    ['Mã BHYT', insurance.insuranceNumber],
    ['Ngày hết hạn', formatDateOnly(insurance.insuranceExpiryDate)],
    ['Nơi đăng ký KCB ban đầu', insurance.insuranceRegisteredHospital || '-']
  ]);
}

function medicalRecordVitalRows(record) {
  const vitals = record?.vitals || {};
  const rows = [
    ['Huyết áp', vitals.bloodPressure, 'mmHg'],
    ['Nhịp tim', vitals.heartRate, 'lần/phút'],
    ['Nhiệt độ', vitals.temperature, '°C'],
    ['Nhịp thở', vitals.respiratoryRate, 'lần/phút'],
    ['SpO2', vitals.spo2, '%'],
    ['Chiều cao', vitals.height, 'cm'],
    ['Cân nặng', vitals.weight, 'kg'],
    ['BMI', vitals.bmi, '']
  ];

  return rows
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value, unit]) => [label, `${value}${unit ? ` ${unit}` : ''}`]);
}

export function generateAppointmentPdf(appointment) {
  const doc = createDocument('Phiếu đặt lịch');
  drawHeader(doc, 'PHIẾU ĐẶT LỊCH', nameOf(appointment.clinicId, 'Clinic Booking'));
  drawMeta(doc, `AP-${idOf(appointment).slice(-8).toUpperCase()}`);
  drawRows(doc, [
    ['Mã lịch hẹn', idOf(appointment)],
    ['Bệnh nhân', appointment.patientInfo?.name || nameOf(appointment.patientId)],
    ['Số điện thoại', appointment.patientInfo?.phone || appointment.patientId?.phone],
    ['Email', appointment.patientInfo?.email || appointment.patientId?.email],
    ['Bác sĩ', nameOf(appointment.doctorId)],
    ['Chuyên khoa', nameOf(appointment.specialtyId)],
    ['Cơ sở', nameOf(appointment.clinicId)],
    ['Ngày khám', appointment.date],
    ['Khung giờ', appointment.timeSlot],
    ['Loại lịch', appointmentTypeLabel(appointment)],
    ['Dịch vụ khám', servicePackageName(appointment)],
    ['Trạng thái', appointmentStatusLabel(appointment.status)],
    ['Lý do khám', appointment.reason],
    ['Số thứ tự khám', appointment.queueNumber ? String(appointment.queueNumber).padStart(2, '0') : '-']
  ]);
  drawInsuranceSection(doc, appointment);
  drawFooter(doc);
  return doc;
}

export function generateQueueTicketPdf(appointment) {
  const doc = createDocument('Phiếu khám');
  drawHeader(doc, 'PHIẾU KHÁM / SỐ THỨ TỰ', nameOf(appointment.clinicId, 'Clinic Booking'));
  drawMeta(doc, `QT-${idOf(appointment).slice(-8).toUpperCase()}`);
  drawRows(doc, [
    ['Số thứ tự khám', appointment.queueNumber ? String(appointment.queueNumber).padStart(2, '0') : 'Chưa cấp'],
    ['Bệnh nhân', appointment.patientInfo?.name || nameOf(appointment.patientId)],
    ['Bác sĩ', nameOf(appointment.doctorId)],
    ['Ngày khám', appointment.date],
    ['Khung giờ', appointment.timeSlot],
    ['Loại lịch', appointmentTypeLabel(appointment)],
    ['Cơ sở', nameOf(appointment.clinicId)],
    ['Dịch vụ khám', servicePackageName(appointment)],
    ['Trạng thái hàng đợi', consultationStatusLabel(appointment.consultationStatus)],
    ['Lưu ý', 'Vui lòng đến trước giờ khám 15 phút.']
  ]);
  drawInsuranceSection(doc, appointment);
  drawFooter(doc);
  return doc;
}

export function generateMedicalRecordPdf(record) {
  const appointment = record.appointmentId || {};
  const doc = createDocument('Kết quả khám');
  drawHeader(doc, 'KẾT QUẢ KHÁM / HỒ SƠ KHÁM BỆNH', nameOf(record.clinicId, 'Clinic Booking'));
  drawMeta(doc, `MR-${idOf(record).slice(-8).toUpperCase()}`);

  drawSectionTitle(doc, 'Thông tin khám');
  drawRows(doc, [
    ['Bệnh nhân', nameOf(record.patientId)],
    ['Bác sĩ', nameOf(record.doctorId)],
    ['Cơ sở', nameOf(record.clinicId)],
    ['Chuyên khoa', nameOf(record.specialtyId)],
    ['Ngày khám', appointment.date || '-'],
    ['Khung giờ', appointment.timeSlot || '-'],
    ['Dịch vụ khám', servicePackageName(record)],
    ['Ngày tạo hồ sơ', formatDateTime(record.createdAt)]
  ]);

  drawInsuranceSection(doc, record);

  const vitalRows = medicalRecordVitalRows(record);
  if (vitalRows.length) {
    drawSectionTitle(doc, 'Chỉ số sinh tồn');
    drawRows(doc, vitalRows);
  }

  drawSectionTitle(doc, 'Kết quả khám');
  drawRows(doc, [
    ['Triệu chứng', record.symptoms || '-'],
    ['Chẩn đoán', record.diagnosis || '-'],
    ['Kết luận', record.conclusion || '-'],
    ['Lời dặn', record.advice || '-']
  ]);

  drawSectionTitle(doc, 'Kế hoạch tái khám');
  drawRows(doc, medicalRecordFollowUpRows(record));

  drawSectionTitle(doc, 'Đơn thuốc');
  drawPrescription(doc, record.prescription || []);
  drawFooter(doc);
  return doc;
}
