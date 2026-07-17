import { displayText, formatDateVN, hasValue } from '../../utils/medicalRecordView.js';
import { resolveMediaUrl } from '../../utils/media.js';

function attachmentTypeLabel(type) {
  if (type === 'pdf') return 'PDF';
  if (type === 'image') return 'Hình ảnh';
  return 'Tài liệu';
}

function attachmentIconClass(type) {
  if (type === 'pdf') return 'pdf';
  if (type === 'image') return 'image';
  return 'file';
}

function uploadedAt(attachment) {
  return attachment?.uploadedAt || attachment?.createdAt || attachment?.date || '';
}

export default function AttachmentSection({ attachments }) {
  const files = Array.isArray(attachments)
    ? attachments.filter((attachment) => hasValue(attachment?.name) || hasValue(attachment?.url))
    : [];

  if (!files.length) return null;

  return (
    <div className="phr-attachments-list phr-modal-attachments phr-attachments-premium">
      {files.map((attachment, index) => {
        const href = attachment.url ? resolveMediaUrl(attachment.url, '') : '';
        const type = attachmentTypeLabel(attachment.type);
        const date = uploadedAt(attachment);
        const content = (
          <>
            <span className={`phr-file-icon ${attachmentIconClass(attachment.type)}`} aria-hidden="true" />
            <div>
              <strong>{displayText(attachment.name, `Tài liệu ${index + 1}`)}</strong>
              <small>{type}{date ? ` · ${formatDateVN(date)}` : ''}</small>
            </div>
          </>
        );

        return href ? (
          <a href={href} target="_blank" rel="noreferrer" key={`${href}-${index}`}>
            {content}
          </a>
        ) : (
          <div className="phr-attachment-row" key={`${attachment.name || type}-${index}`}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
