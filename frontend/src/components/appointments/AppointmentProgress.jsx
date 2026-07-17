const FLOW = [
  { key: 'pending', label: 'Đã gửi' },
  { key: 'confirmed', label: 'Xác nhận' },
  { key: 'in_progress', label: 'Khám' },
  { key: 'completed', label: 'Hoàn thành' }
];

function activeIndex(status) {
  if (status === 'pending') return 0;
  if (status === 'confirmed') return 1;
  if (status === 'in_progress') return 2;
  if (status === 'completed') return 3;
  return -1;
}

export default function AppointmentProgress({ status }) {
  const special = ['cancelled', 'no_show', 'cancel_requested', 'reschedule_requested', 'reschedule_rejected'].includes(status);
  if (special) {
    return <p className="pa-progress-note">Trạng thái đặc biệt, vui lòng xem chi tiết để theo dõi xử lý.</p>;
  }

  const current = activeIndex(status);
  return (
    <ol className="pa-progress" aria-label="Tiến trình lịch hẹn">
      {FLOW.map((step, index) => (
        <li className={index <= current ? 'done' : ''} key={step.key}>
          <span aria-hidden="true" />
          <small>{step.label}</small>
        </li>
      ))}
    </ol>
  );
}
