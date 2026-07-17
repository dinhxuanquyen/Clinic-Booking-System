import fs from 'fs';
import PDFDocument from 'pdfkit';
import { buildMedicalRecordCode } from '../utils/pdfFilename.js';

const fontCandidates = [
  'C:/Windows/Fonts/arial.ttf',
  'C:/Windows/Fonts/Arial.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
];

const FOOTER_RESERVED_HEIGHT = 40;
const COMPACT_PAGE_HEADER_HEIGHT = 42;
const PRIMARY_BLUE = '#0f2b5b';
const ACCENT_BLUE = '#0d6efd';
const SOFT_BLUE = '#eef8ff';
const BORDER_BLUE = '#dbeafe';
const TEXT_MUTED = '#64748b';

const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function nameOf(value, fallback = 'Đang cập nhật') {
  if (!value) return fallback;
  return typeof value === 'object' ? value.name || fallback : String(value);
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function firstValue(source, keys = []) {
  const key = keys.find((item) => hasValue(source?.[item]));
  return key ? source[key] : '';
}

function valueOf(source, keys = [], fallback = '-') {
  const found = keys.find((key) => source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== '');
  return found ? source[found] : fallback;
}

function idOf(value) {
  if (!value) return '';
  return String(value._id || value);
}

function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function formatDateVN(value) {
  if (!isValidDate(value)) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(new Date(value));
}

function formatDateTimeVN(value = new Date()) {
  if (!isValidDate(value)) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(new Date(value));
}

function formatDateTime(value = new Date()) {
  return formatDateTimeVN(value);
}

function formatSlot(value) {
  return String(value || '-').replace(/\s*-\s*/g, ' - ');
}

function maskInsuranceNumber(value) {
  const text = String(value || '').trim();
  if (text.length <= 8) return text || '-';
  return `${text.slice(0, 4)}${'*'.repeat(Math.max(4, text.length - 8))}${text.slice(-4)}`;
}

function genderLabel(value) {
  const labels = {
    male: 'Nam',
    female: 'Nữ',
    other: 'Khác'
  };
  return labels[String(value || '').toLowerCase()] || value || '-';
}

function codeOf(value, keys = []) {
  if (!value || typeof value !== 'object') return '-';
  const code = valueOf(value, keys, '');
  return code || '-';
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

function contentBottom(doc) {
  return doc.page.height - doc.page.margins.bottom - FOOTER_RESERVED_HEIGHT;
}

function remainingHeight(doc) {
  return contentBottom(doc) - doc.y;
}

function drawCompactPageHeader(doc) {
  const meta = doc._medicalRecordHeader;
  if (!meta) return;
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.page.margins.top - 18;

  doc
    .fontSize(10)
    .fillColor(PRIMARY_BLUE)
    .text(meta.title, left, y, { width, align: 'left' })
    .fontSize(8.5)
    .fillColor(TEXT_MUTED)
    .text(`Mã hồ sơ: ${meta.recordCode} | Bệnh nhân: ${meta.patientName}`, left, y + 15, { width, align: 'left' })
    .strokeColor(BORDER_BLUE)
    .lineWidth(0.8)
    .moveTo(left, y + 32)
    .lineTo(left + width, y + 32)
    .stroke();

  doc.y = doc.page.margins.top + COMPACT_PAGE_HEADER_HEIGHT - 12;
}

function addManagedPage(doc) {
  doc.addPage();
  drawCompactPageHeader(doc);
}

function ensureSpace(doc, requiredHeight = 80, sectionName = '') {
  const remaining = remainingHeight(doc);
  if (remaining >= requiredHeight) return false;

  if (process.env.NODE_ENV === 'development') {
    const pageRange = doc.bufferedPageRange();
    console.debug('[pdf-page-break]', {
      section: sectionName || 'unknown',
      currentY: Math.round(doc.y),
      requiredHeight: Math.round(requiredHeight),
      remainingHeight: Math.round(remaining),
      pageNumber: pageRange.count
    });
  }
  addManagedPage(doc);
  return true;
}

function drawHeader(doc, title, clinic = '', metaRows = []) {
  const compact = Boolean(doc._compactMedicalRecord);
  const clinicObject = clinic && typeof clinic === 'object' ? clinic : {};
  const clinicName = nameOf(clinic, 'Clinic Booking');
  const clinicAddress = clinicObject.address || '';
  const clinicPhone = clinicObject.phone || '';
  const clinicEmail = clinicObject.email || '';

  doc
    .fontSize(14)
    .fillColor(PRIMARY_BLUE)
    .text(clinicName, { continued: false })
    .moveDown(compact ? 0.1 : 0.2)
    .fontSize(10)
    .fillColor('#475569');

  if (clinicAddress) doc.text(`Địa chỉ: ${clinicAddress}`);
  if (clinicPhone || clinicEmail) {
    doc.text([clinicPhone ? `Điện thoại: ${clinicPhone}` : '', clinicEmail ? `Email: ${clinicEmail}` : ''].filter(Boolean).join('   |   '));
  }

  doc
    .moveDown(compact ? 0.45 : 0.8)
    .fontSize(16)
    .fillColor(ACCENT_BLUE)
    .text(title, { align: 'center' });

  if (metaRows.length) {
    doc.moveDown(0.35);
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const columnWidth = width / metaRows.length;
    const y = doc.y;
    metaRows.forEach(([label, value], index) => {
      doc
        .fontSize(9)
        .fillColor(TEXT_MUTED)
        .text(label, doc.page.margins.left + index * columnWidth, y, { width: columnWidth, align: 'center' })
        .fontSize(10)
        .fillColor('#0f172a')
        .text(value || '-', doc.page.margins.left + index * columnWidth, y + 14, { width: columnWidth, align: 'center' });
    });
    doc.y = y + 30;
  }

  doc
    .moveDown(compact ? 0.35 : 0.55)
    .strokeColor(BORDER_BLUE)
    .lineWidth(1)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke()
    .moveDown(compact ? 0.45 : 0.7);
}

function addPageFooter(doc) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i += 1) {
    doc.switchToPage(i);
    if (i > 0) {
      drawCompactPageHeader(doc);
    }
    const y = doc.page.height - doc.page.margins.bottom - 18;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    doc
      .fontSize(9)
      .fillColor('#64748b')
      .text('Tài liệu được xuất từ hệ thống Clinic Booking', doc.page.margins.left, y, { width, align: 'left', lineBreak: false })
      .text(`Trang ${i + 1}/${pages.count}`, doc.page.margins.left, y, { width, align: 'right', lineBreak: false });
  }
}

function drawFooter(doc) {
  addPageFooter(doc);
}

function drawMeta(doc, code) {
  doc
    .fontSize(10)
    .fillColor('#334155')
    .text(`Mã phiếu: ${code}`)
    .text(`Ngày xuất phiếu: ${formatDateTime(new Date())}`)
    .moveDown(0.8);
}

function drawSectionTitle(doc, title, options = {}) {
  const titleHeight = 24;
  const firstContentHeight = options.firstContentHeight ?? 30;
  ensureSpace(doc, titleHeight + firstContentHeight + 8, title);
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc
    .moveDown(options.tight ? 0.2 : 0.35)
    .fontSize(12)
    .fillColor(PRIMARY_BLUE)
    .text(title, left, doc.y, { width })
    .strokeColor(BORDER_BLUE)
    .lineWidth(1)
    .moveTo(left, doc.y + 3)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y + 3)
    .stroke()
    .moveDown(options.tight ? 0.35 : 0.45);
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

function drawInfoGrid(doc, rows, options = {}) {
  const filteredRows = rows.filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!filteredRows.length) return;

  const columns = options.columns || 2;
  const gap = options.gap ?? 8;
  const left = doc.page.margins.left;
  const totalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const cellWidth = (totalWidth - gap * (columns - 1)) / columns;
  const minHeight = options.compact ? 32 : 40;
  const labelSize = options.compact ? 7.6 : 8;
  const valueSize = options.compact ? 9.2 : 9.8;
  const horizontalPad = 7;
  const topPad = options.compact ? 5 : 6;
  const valueTop = options.compact ? 17 : 19;

  for (let index = 0; index < filteredRows.length; index += columns) {
    const cells = filteredRows.slice(index, index + columns);
    const heights = cells.map(([label, value]) => {
      const text = value === undefined || value === null || value === '' ? '-' : String(value);
      return Math.max(
        doc.fontSize(labelSize).heightOfString(label, { width: cellWidth - horizontalPad * 2 }),
        doc.fontSize(valueSize).heightOfString(text, { width: cellWidth - horizontalPad * 2 })
      ) + (options.compact ? 18 : 21);
    });
    const rowHeight = Math.max(minHeight, ...heights);
    ensureSpace(doc, rowHeight + 6, options.sectionName || 'info-grid');
    const y = doc.y;

    cells.forEach(([label, value], cellIndex) => {
      const x = left + cellIndex * (cellWidth + gap);
      const text = value === undefined || value === null || value === '' ? '-' : String(value);
      doc.rect(x, y, cellWidth, rowHeight).fillAndStroke('#fbfdff', '#e5f2ff');
      doc
        .fontSize(labelSize)
        .fillColor(TEXT_MUTED)
        .text(label, x + horizontalPad, y + topPad, { width: cellWidth - horizontalPad * 2 })
        .fontSize(valueSize)
        .fillColor('#0f172a')
        .text(text, x + horizontalPad, y + valueTop, { width: cellWidth - horizontalPad * 2 });
    });

    doc.y = y + rowHeight + 5;
  }
}

function drawHighlightedRows(doc, rows) {
  rows.forEach(([label, value]) => {
    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const text = value === undefined || value === null || value === '' ? '-' : String(value);
    const rowHeight = Math.max(46, doc.fontSize(10.5).heightOfString(text, { width: width - 22 }) + 30);
    ensureSpace(doc, rowHeight + 8, label);
    const y = doc.y;
    doc.roundedRect(left, y, width, rowHeight, 5).fillAndStroke(SOFT_BLUE, '#bae6fd');
    doc
      .fontSize(9)
      .fillColor('#0369a1')
      .text(label, left + 12, y + 9, { width: width - 24 })
      .fontSize(10.5)
      .fillColor(PRIMARY_BLUE)
      .text(text, left + 12, y + 24, { width: width - 24 });
    doc.y = y + rowHeight + 6;
  });
}

function formatDateOnly(value) {
  return formatDateVN(value);
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
  return appointment?.isFollowUp || appointment?.followUpRecordId ? 'Tái khám' : 'Khám lần đầu';
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
  if (appointment.timeSlot) parts.push(formatSlot(appointment.timeSlot));
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

function medicalTextLength(record) {
  return [
    record.symptoms,
    firstValue(record, ['allergyHistory', 'allergies']),
    record.icd10Code,
    record.diagnosis,
    record.conclusion,
    firstValue(record, ['doctorAdvice', 'advice'])
  ].filter(hasValue).join(' ').length;
}

function isCompactMedicalRecord(record) {
  const attachments = Array.isArray(record.attachments) ? record.attachments : [];
  const prescription = Array.isArray(record.prescription) ? record.prescription : [];
  return (
    !medicalRecordVitalRows(record).length &&
    !attachments.length &&
    !prescription.length &&
    !record.followUpRequired &&
    medicalTextLength(record) <= 420
  );
}

function drawVitalsTable(doc, record, title) {
  const rows = medicalRecordVitalRows(record);
  if (!rows.length) return;
  drawSectionTitle(doc, title, { firstContentHeight: 38, tight: true });
  drawInfoGrid(doc, rows, { columns: 4, compact: true, gap: 8, sectionName: 'vitals' });
}

function resultRows(record) {
  const summaryRows = [
    ['Triệu chứng và bệnh sử', record.symptoms],
    ['Tiền sử dị ứng', firstValue(record, ['allergyHistory', 'allergies'])],
    ['Mã ICD-10', record.icd10Code]
  ].filter(([, value]) => hasValue(value));
  const highlightedRows = [
    ['Chẩn đoán', record.diagnosis],
    ['Kết luận và hướng điều trị', record.conclusion]
  ].filter(([, value]) => hasValue(value));
  const adviceRows = [
    ['Lời dặn', firstValue(record, ['doctorAdvice', 'advice'])]
  ].filter(([, value]) => hasValue(value));

  return { summaryRows, highlightedRows, adviceRows };
}

function hasResultContent(record) {
  const rows = resultRows(record);
  return rows.summaryRows.length || rows.highlightedRows.length || rows.adviceRows.length;
}

function drawCompactLine(doc, text, sectionName = 'compact-line') {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const rowHeight = Math.max(22, doc.fontSize(9.8).heightOfString(text, { width: width - 14 }) + 10);
  ensureSpace(doc, rowHeight + 4, sectionName);
  const y = doc.y;
  doc
    .fontSize(9.8)
    .fillColor('#334155')
    .text(text, left + 2, y + 2, { width: width - 4 });
  doc.y = y + rowHeight;
}

function drawResultSection(doc, record, title) {
  const rows = resultRows(record);
  const firstContentHeight = rows.summaryRows.length ? 34 : rows.highlightedRows.length ? 46 : 26;
  drawSectionTitle(doc, title, { firstContentHeight, tight: true });

  if (rows.summaryRows.length) {
    drawInfoGrid(doc, rows.summaryRows, { columns: 1, compact: true, sectionName: 'result-summary' });
  }
  if (rows.highlightedRows.length) {
    drawHighlightedRows(doc, rows.highlightedRows);
  }
  if (rows.adviceRows.length) {
    drawInfoGrid(doc, rows.adviceRows, { columns: 1, compact: true, sectionName: 'advice' });
  }
}

function attachmentTypeLabel(type) {
  const labels = {
    image: 'Hình ảnh',
    pdf: 'PDF',
    other: 'Tài liệu'
  };
  return labels[type] || 'Tài liệu';
}

function drawAttachmentSection(doc, record, title) {
  const attachments = Array.isArray(record.attachments) ? record.attachments : [];
  if (!attachments.length) return;
  drawTable(
    doc,
    ['STT', 'Tên tài liệu', 'Loại', 'Ngày tải', 'Ghi chú'],
    attachments.map((attachment, index) => [
      index + 1,
      attachment.name || 'Tệp đính kèm',
      attachmentTypeLabel(attachment.type),
      formatDateTimeVN(attachment.uploadedAt || attachment.createdAt || record.createdAt),
      'Theo mã hồ sơ'
    ]),
    [30, 190, 72, 104, 103],
    { title }
  );
}

function tableRowHeight(doc, row, columnWidths, fontSize = 8.8) {
  return Math.max(24, ...row.map((cell, index) => (
    doc.fontSize(fontSize).heightOfString(String(cell || '-'), { width: columnWidths[index] - 10 }) + 12
  )));
}

function drawTableHeader(doc, headers, columnWidths, left, totalWidth) {
  const headerHeight = 24;
  const y = doc.y;
  doc.rect(left, y, totalWidth, headerHeight).fillAndStroke('#e0f2fe', '#bae6fd');
  let x = left;
  headers.forEach((header, index) => {
    doc
      .fontSize(8.3)
      .fillColor(PRIMARY_BLUE)
      .text(header, x + 5, y + 7, { width: columnWidths[index] - 10 });
    x += columnWidths[index];
  });
  doc.y = y + headerHeight;
}

function drawTable(doc, headers, rows, widths, options = {}) {
  if (!rows.length) return;
  const left = doc.page.margins.left;
  const totalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columnWidths = widths || headers.map(() => totalWidth / headers.length);
  const headerHeight = 24;
  const firstRowHeight = tableRowHeight(doc, rows[0], columnWidths);
  if (options.title) {
    drawSectionTitle(doc, options.title, { firstContentHeight: headerHeight + firstRowHeight + 4, tight: true });
  } else {
    ensureSpace(doc, headerHeight + firstRowHeight + 6, options.sectionName || 'table');
  }
  drawTableHeader(doc, headers, columnWidths, left, totalWidth);

  rows.forEach((row) => {
    const rowHeight = tableRowHeight(doc, row, columnWidths);
    if (remainingHeight(doc) < rowHeight + 4) {
      addManagedPage(doc);
      if (options.title) {
        drawSectionTitle(doc, `${options.title} (tiếp)`, { firstContentHeight: headerHeight + rowHeight + 4, tight: true });
      }
      drawTableHeader(doc, headers, columnWidths, left, totalWidth);
    }
    const y = doc.y;
    doc.rect(left, y, totalWidth, rowHeight).fillAndStroke('#ffffff', '#e5f2ff');
    let x = left;
    row.forEach((cell, index) => {
      doc
        .fontSize(8.8)
        .fillColor('#0f172a')
        .text(String(cell || '-'), x + 5, y + 7, { width: columnWidths[index] - 10 });
      x += columnWidths[index];
    });
    doc.y = y + rowHeight;
  });
  doc.moveDown(0.4);
}

function drawPrescriptionTable(doc, prescription = [], title, options = {}) {
  if (!prescription.length) {
    drawSectionTitle(doc, title, { firstContentHeight: 24, tight: true });
    drawCompactLine(doc, 'Không kê đơn thuốc trong lần khám này.', 'empty-prescription');
    if (!options.compact) doc.moveDown(0.25);
    return;
  }

  drawTable(
    doc,
    ['STT', 'Tên thuốc', 'Liều dùng', 'Số lần/ngày', 'Thời gian dùng', 'Ghi chú'],
    prescription.map((item, index) => [
      index + 1,
      item.medicineName || '-',
      item.dosage || '-',
      item.frequency || '-',
      item.duration || '-',
      item.note || '-'
    ]),
    [30, 105, 78, 70, 78, 138],
    { title }
  );
}

function sourceRecordText(record) {
  const appointment = record?.appointmentId || {};
  const source = appointment.followUpRecordId;
  if (!source) return '';
  const sourceRecord = typeof source === 'object' ? source : null;
  const sourceAppointment = sourceRecord?.appointmentId || appointment.originalAppointmentId;
  const dateText = sourceAppointment?.date ? formatDateVN(sourceAppointment.date) : formatDateVN(sourceRecord?.createdAt);
  const timeText = sourceAppointment?.timeSlot ? ` ${formatSlot(sourceAppointment.timeSlot)}` : '';
  const diagnosisText = sourceRecord?.diagnosis ? `; chẩn đoán lần khám gốc: ${sourceRecord.diagnosis}` : '';
  return `Tái khám từ hồ sơ ${sourceRecord ? `MR-${idOf(sourceRecord).slice(-8).toUpperCase()}` : `MR-${idOf(source).slice(-8).toUpperCase()}`}${dateText !== '-' ? ` ngày ${dateText}${timeText}` : ''}${diagnosisText}.`;
}

function drawFollowUpSection(doc, record, title, options = {}) {
  if (!record.followUpRequired) {
    drawSectionTitle(doc, title, { firstContentHeight: 24, tight: true });
    drawCompactLine(doc, 'Bác sĩ chưa yêu cầu tái khám.', 'empty-follow-up');
    if (!options.compact) doc.moveDown(0.25);
    return;
  }

  drawSectionTitle(doc, title, { firstContentHeight: 58, tight: true });
  const rows = medicalRecordFollowUpRows(record);
  const detailRows = rows.filter(([label]) => label !== 'Kế hoạch tái khám');
  drawHighlightedRows(doc, [['Trạng thái tái khám', followUpStatusLabel(record.followUpStatus || 'recommended')]]);
  drawInfoGrid(doc, detailRows, { columns: 2, compact: true, sectionName: 'follow-up-details' });
  drawInfoGrid(doc, [
    ['Lời dặn tái khám', record.followUpDate ? 'Tái khám đúng ngày đề xuất hoặc đặt lại lịch nếu cần thay đổi.' : 'Bệnh nhân có thể chọn ngày phù hợp để đặt lịch tái khám.']
  ], { columns: 1, compact: true, sectionName: 'follow-up-advice' });
}

function drawDoctorConfirmation(doc, record, title, options = {}) {
  const doctor = record.doctorId || {};
  const blockHeight = options.compact ? 60 : 62;
  const titleContentHeight = options.compact ? 44 : 56;
  drawSectionTitle(doc, title, { firstContentHeight: titleContentHeight, tight: true });
  ensureSpace(doc, blockHeight, 'doctor-confirmation');
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const gap = 28;
  const columnWidth = (width - gap) / 2;
  const y = doc.y;
  const right = left + columnWidth + gap;
  const metaY = options.compact ? 49 : 48;

  doc
    .moveTo(left, y)
    .lineTo(left + columnWidth, y)
    .moveTo(right, y)
    .lineTo(right + columnWidth, y)
    .strokeColor(BORDER_BLUE)
    .lineWidth(1)
    .stroke()
    .fontSize(10)
    .fillColor(PRIMARY_BLUE)
    .text('NGƯỜI BỆNH', left, y + 8, { width: columnWidth, align: 'center' })
    .text('BÁC SĨ PHỤ TRÁCH', right, y + 8, { width: columnWidth, align: 'center' })
    .fontSize(9.2)
    .fillColor(TEXT_MUTED)
    .text('Đã nhận kết quả', left, y + 24, { width: columnWidth, align: 'center' })
    .text('Hồ sơ xác nhận điện tử', right, y + 24, { width: columnWidth, align: 'center' })
    .fontSize(9.8)
    .fillColor('#0f172a')
    .text(nameOf(doctor), right, y + 38, { width: columnWidth, align: 'center' })
    .fontSize(8.4)
    .fillColor('#334155')
    .text(`Mã bác sĩ: ${codeOf(doctor, ['doctorCode', 'code'])} | Ngày xác nhận: ${formatDateTimeVN(record.updatedAt || record.createdAt)}`, right, y + metaY, { width: columnWidth, align: 'center' });

  doc.y = y + blockHeight;
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
  const recordCode = buildMedicalRecordCode(record);
  const patient = record.patientId || {};
  const doctor = record.doctorId || {};
  const clinic = record.clinicId || {};
  const patientInfo = appointment.patientInfo || {};
  const insurance = getInsuranceSnapshot(record);
  const previousMedicalRecord = sourceRecordText(record);
  const compactMode = isCompactMedicalRecord(record);
  let sectionIndex = 0;
  const nextSectionTitle = (label) => `${romanNumerals[sectionIndex++]}. ${label}`;

  doc._medicalRecordHeader = {
    title: 'PHIẾU KẾT QUẢ KHÁM BỆNH',
    recordCode,
    patientName: nameOf(patient)
  };
  doc._compactMedicalRecord = compactMode;

  drawHeader(doc, 'PHIẾU KẾT QUẢ KHÁM BỆNH', clinic, [
    ['Mã hồ sơ', recordCode],
    ['Ngày lập hồ sơ', formatDateTimeVN(record.createdAt)],
    ['Ngày xuất phiếu', formatDateTimeVN(new Date())]
  ]);

  drawSectionTitle(doc, nextSectionTitle('THÔNG TIN NGƯỜI BỆNH'), { firstContentHeight: 42, tight: true });
  drawInfoGrid(doc, [
    ['Họ tên', nameOf(patient)],
    ['Mã bệnh nhân', codeOf(patient, ['patientCode', 'code', 'medicalCode'])],
    ['Ngày sinh', formatDateVN(patientInfo.dateOfBirth || patient.dateOfBirth)],
    ['Giới tính', genderLabel(patientInfo.gender || patient.gender)],
    ['Điện thoại', patientInfo.phone || patient.phone || '-'],
    ['BHYT', insurance?.enabled && insurance?.insuranceNumber ? maskInsuranceNumber(insurance.insuranceNumber) : 'Không sử dụng BHYT'],
    ['Ngày hết hạn BHYT', insurance?.enabled ? formatDateVN(insurance.insuranceExpiryDate) : ''],
    ['Nơi đăng ký KCB ban đầu', insurance?.enabled ? insurance.insuranceRegisteredHospital || '-' : '']
  ], { columns: compactMode ? 3 : 2, compact: true, sectionName: 'patient-info' });

  drawSectionTitle(doc, nextSectionTitle('THÔNG TIN BUỔI KHÁM'), { firstContentHeight: 42, tight: true });
  drawInfoGrid(doc, [
    ['Bác sĩ', nameOf(doctor)],
    ['Mã bác sĩ', codeOf(doctor, ['doctorCode', 'code'])],
    ['Học vị', doctor.degree || '-'],
    ['Chuyên khoa', nameOf(record.specialtyId)],
    ['Cơ sở', nameOf(clinic)],
    ['Ngày khám', formatDateVN(appointment.date)],
    ['Khung giờ', formatSlot(appointment.timeSlot)],
    ['Số thứ tự khám', appointment.queueNumber ? String(appointment.queueNumber).padStart(2, '0') : '-'],
    ['Loại lịch', appointmentTypeLabel(appointment)],
    ['Trạng thái lịch', appointmentStatusLabel(appointment.status)],
    ['Dịch vụ khám', servicePackageName(record)],
    ['Lý do khám ban đầu', appointment.reason || '-']
  ], { columns: compactMode ? 3 : 2, compact: true, sectionName: 'appointment-info' });

  if (previousMedicalRecord) {
    drawInfoGrid(doc, [['Hồ sơ khám trước', previousMedicalRecord]], { columns: 1, compact: true, sectionName: 'previous-record' });
  }

  if (medicalRecordVitalRows(record).length) {
    drawVitalsTable(doc, record, nextSectionTitle('CHỈ SỐ SINH TỒN'));
  }
  if (hasResultContent(record)) {
    drawResultSection(doc, record, nextSectionTitle('KẾT QUẢ KHÁM'));
  }
  if (Array.isArray(record.attachments) && record.attachments.length) {
    drawAttachmentSection(doc, record, nextSectionTitle('CẬN LÂM SÀNG'));
  }
  drawPrescriptionTable(doc, record.prescription || [], nextSectionTitle('ĐƠN THUỐC'), { compact: compactMode });
  drawFollowUpSection(doc, record, nextSectionTitle('KẾ HOẠCH TÁI KHÁM'), { compact: compactMode });
  drawDoctorConfirmation(doc, record, nextSectionTitle('XÁC NHẬN BÁC SĨ'), { compact: compactMode });
  addPageFooter(doc);
  return doc;
}
