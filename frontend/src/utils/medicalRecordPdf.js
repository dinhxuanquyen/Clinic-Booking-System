import { apiForm, axiosClient } from '../api/client.js';
import { getUser } from './auth.js';
import { convertImageFileToPng } from './imageConversion.js';
import { resolveMediaUrl } from './media.js';

let activePrintFrame = null;
let preparingPrint = false;

function resolveFilename(response, fallback) {
  const disposition = response.headers?.['content-disposition'] || '';
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }

  const asciiMatch = disposition.match(/filename="([^"]+)"|filename=([^;]+)/i);
  return (asciiMatch?.[1] || asciiMatch?.[2] || '').trim() || fallback;
}

function assertPdfResponse(response) {
  const contentType = String(response.headers?.['content-type'] || response.data?.type || '').toLowerCase();
  if (!contentType.includes('application/pdf')) {
    throw new Error('Medical record export did not return a PDF response');
  }
}

function isPdfReadyImage(attachment) {
  const url = String(attachment?.url || attachment?.name || '');
  return /\.(png|jpe?g)(?:$|\?)/i.test(url);
}

function needsPdfImageNormalization(attachment) {
  return attachment?.type === 'image' && attachment?.url && !isPdfReadyImage(attachment);
}

async function normalizeAttachmentForPdf(attachment, index) {
  const sourceUrl = resolveMediaUrl(attachment.url, '');
  if (!sourceUrl) return attachment;

  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error('Không thể tải ảnh cận lâm sàng để chuẩn bị PDF');

  const blob = await response.blob();
  const sourceFile = new File([blob], attachment.name || `ket-qua-${index + 1}`, {
    type: blob.type || 'image/*',
    lastModified: Date.now()
  });
  const pngFile = await convertImageFileToPng(sourceFile);
  const data = new FormData();
  data.append('files', pngFile);

  const payload = await apiForm('/uploads/medical-record-attachments', data);
  const uploaded = payload.data?.attachments?.[0];
  return uploaded
    ? { ...attachment, ...uploaded, uploadedAt: attachment.uploadedAt || attachment.createdAt || new Date().toISOString() }
    : attachment;
}

async function ensurePdfCompatibleAttachments(recordId) {
  const role = getUser()?.role;
  if (!['admin', 'doctor', 'patient'].includes(role)) return;

  const response = await axiosClient.request({
    url: `/medical-records/${recordId}`,
    method: 'GET'
  });
  const record = response.data?.data;
  const attachments = Array.isArray(record?.attachments) ? record.attachments : [];
  if (!attachments.some(needsPdfImageNormalization)) return;

  const normalizedAttachments = await Promise.all(
    attachments.map((attachment, index) => (
      needsPdfImageNormalization(attachment)
        ? normalizeAttachmentForPdf(attachment, index)
        : Promise.resolve(attachment)
    ))
  );

  await axiosClient.request({
    url: `/medical-records/${recordId}/attachments`,
    method: 'PATCH',
    data: { attachments: normalizedAttachments }
  });
}

function cleanupPrintFrame(frame, objectUrl) {
  if (frame?.parentNode) frame.parentNode.removeChild(frame);
  if (activePrintFrame === frame) activePrintFrame = null;
  URL.revokeObjectURL(objectUrl);
}

function releasePrintLock(frame) {
  if (activePrintFrame === frame) activePrintFrame = null;
}

export async function fetchMedicalRecordPdf(recordId) {
  await ensurePdfCompatibleAttachments(recordId);

  const response = await axiosClient.request({
    url: `/medical-records/${recordId}/pdf`,
    method: 'GET',
    responseType: 'blob'
  });

  assertPdfResponse(response);

  const blob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data], { type: 'application/pdf' });

  return {
    blob,
    filename: resolveFilename(response, 'ket-qua-kham.pdf')
  };
}

export async function downloadMedicalRecordPdf(recordId) {
  const { blob, filename } = await fetchMedicalRecordPdf(recordId);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function printMedicalRecordPdf(recordId) {
  if (activePrintFrame || preparingPrint) return;

  preparingPrint = true;
  let blob;
  try {
    ({ blob } = await fetchMedicalRecordPdf(recordId));
  } finally {
    preparingPrint = false;
  }
  const objectUrl = URL.createObjectURL(blob);
  const frame = document.createElement('iframe');
  let cleaned = false;

  function cleanupLater(delay = 60000) {
    window.setTimeout(() => {
      if (cleaned) return;
      cleaned = true;
      cleanupPrintFrame(frame, objectUrl);
    }, delay);
  }

  activePrintFrame = frame;
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.style.visibility = 'hidden';

  await new Promise((resolve, reject) => {
    frame.onload = () => resolve();
    frame.onerror = () => reject(new Error('Unable to load PDF for printing'));
    frame.src = objectUrl;
    document.body.appendChild(frame);
  });

  try {
    const printWindow = frame.contentWindow;
    if (!printWindow?.print) throw new Error('PDF print window is unavailable');

    const handleAfterPrint = () => {
      printWindow.removeEventListener?.('afterprint', handleAfterPrint);
      if (cleaned) return;
      cleaned = true;
      cleanupPrintFrame(frame, objectUrl);
    };

    printWindow.addEventListener?.('afterprint', handleAfterPrint);
    printWindow.focus();
    printWindow.print();
    window.setTimeout(() => releasePrintLock(frame), 1500);
    cleanupLater();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Medical record PDF print fallback:', error?.message || error);
    }
    if (frame.parentNode) frame.parentNode.removeChild(frame);
    if (activePrintFrame === frame) activePrintFrame = null;

    const popup = window.open(objectUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  }
}
