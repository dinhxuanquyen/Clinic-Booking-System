import { Link } from 'react-router-dom';

const ICONS = {
  calendar: '📅',
  record: '📋',
  review: '⭐',
  notification: '🔔',
  waitlist: '⏳',
  doctor: '👨‍⚕️',
  clinic: '🏥',
  search: '🔍',
  schedule: '📆',
  package: '📦',
  default: '📂'
};

export default function EmptyState({
  icon,
  variant = 'default',
  title = 'Không có dữ liệu',
  description,
  action,
  compact = false
}) {
  const emoji = icon || ICONS[variant] || ICONS.default;

  return (
    <div className={`empty-state ${compact ? 'empty-state-compact' : ''}`}>
      <div className="empty-state-icon">{emoji}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && (
        action.to ? (
          <Link className="empty-state-cta" to={action.to}>{action.label}</Link>
        ) : (
          <button className="empty-state-cta" type="button" onClick={action.onClick}>{action.label}</button>
        )
      )}
    </div>
  );
}
