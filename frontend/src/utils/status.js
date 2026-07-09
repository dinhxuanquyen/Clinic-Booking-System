const statusMap = {
  pending: {
    label: 'Chờ xác nhận',
    className: 'badge-status badge-pending'
  },
  confirmed: {
    label: 'Đã xác nhận',
    className: 'badge-status badge-confirmed'
  },
  in_progress: {
    label: 'Đang khám',
    className: 'badge-status badge-in-progress'
  },
  cancelled: {
    label: 'Đã hủy',
    className: 'badge-status badge-cancelled'
  },
  no_show: {
    label: 'Không đến khám',
    className: 'badge-status badge-no-show'
  },
  cancel_requested: {
    label: 'Yêu cầu hủy',
    className: 'badge-status badge-cancel-requested'
  },
  reschedule_requested: {
    label: 'Yêu cầu đổi lịch',
    className: 'badge-status badge-reschedule-requested'
  },
  reschedule_rejected: {
    label: 'Từ chối đổi lịch',
    className: 'badge-status badge-cancelled'
  },
  completed: {
    label: 'Hoàn thành',
    className: 'badge-status badge-completed'
  },
  waiting_list: {
    label: 'Danh sách chờ',
    className: 'badge-status badge-waiting-list'
  },
  offered: {
    label: 'Đã đề xuất lịch',
    className: 'badge-status badge-offered'
  }
};

const consultationStatusMap = {
  waiting: {
    label: 'Chờ khám',
    className: 'badge-status badge-pending'
  },
  in_progress: {
    label: 'Đang khám',
    className: 'badge-status badge-in-progress'
  },
  completed: {
    label: 'Đã hoàn thành khám',
    className: 'badge-status badge-completed'
  },
  skipped: {
    label: 'Bỏ qua',
    className: 'badge-status badge-cancelled'
  }
};

export function getStatusBadge(status) {
  return statusMap[status] || {
    label: status || 'Không xác định',
    className: 'badge-status badge-neutral'
  };
}

export function getConsultationStatusBadge(status) {
  return consultationStatusMap[status] || {
    label: status || 'Không xác định',
    className: 'badge-status badge-neutral'
  };
}
