export default function RecordStatusBadge({ status, className = '' }) {
  if (!status?.label) return null;

  return (
    <span className={`phr-status-badge ${status.tone || 'neutral'} ${className}`.trim()}>
      {status.label}
    </span>
  );
}
