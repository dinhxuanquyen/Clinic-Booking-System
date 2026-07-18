const TONE_BADGE_CLASS = {
  danger: 'badge-status badge-cancelled',
  info: 'badge-status badge-reschedule-requested',
  neutral: 'badge-status badge-neutral',
  primary: 'badge-status badge-confirmed',
  success: 'badge-status badge-completed',
  warning: 'badge-status badge-pending'
};

const STATUS_PRESENTATIONS = {
  appointment: {
    pending: {
      label: 'Chờ xác nhận',
      tone: 'warning',
      icon: '!',
      description: 'Lịch đã được gửi và đang chờ phòng khám xác nhận.',
      badgeClass: 'badge-status badge-pending'
    },
    confirmed: {
      label: 'Đã xác nhận',
      tone: 'success',
      icon: '✓',
      description: 'Lịch đã được phòng khám xác nhận.',
      badgeClass: 'badge-status badge-confirmed'
    },
    in_progress: {
      label: 'Đang khám',
      tone: 'info',
      icon: '•',
      description: 'Lịch đang trong quy trình khám.',
      badgeClass: 'badge-status badge-in-progress'
    },
    completed: {
      label: 'Hoàn thành',
      tone: 'success',
      icon: '✓',
      description: 'Buổi khám đã hoàn tất.',
      badgeClass: 'badge-status badge-completed',
      contexts: {
        patient: { tone: 'primary' }
      }
    },
    cancelled: {
      label: 'Đã hủy',
      tone: 'neutral',
      icon: '×',
      description: 'Lịch hẹn đã hủy và không còn hiệu lực.',
      badgeClass: 'badge-status badge-cancelled',
      contexts: {
        admin: { tone: 'danger' },
        task: { tone: 'danger' }
      }
    },
    no_show: {
      label: 'Không đến khám',
      tone: 'danger',
      icon: '!',
      description: 'Lịch được ghi nhận là không tham dự.',
      badgeClass: 'badge-status badge-no-show'
    },
    cancel_requested: {
      label: 'Yêu cầu hủy',
      tone: 'warning',
      icon: '!',
      description: 'Yêu cầu hủy đang chờ xử lý.',
      badgeClass: 'badge-status badge-cancel-requested',
      contexts: {
        admin: { tone: 'danger' },
        task: { tone: 'danger' },
        patient: { label: 'Đang chờ duyệt hủy', tone: 'danger' }
      }
    },
    reschedule_requested: {
      label: 'Yêu cầu đổi lịch',
      tone: 'warning',
      icon: '!',
      description: 'Yêu cầu đổi lịch đang chờ xử lý.',
      badgeClass: 'badge-status badge-reschedule-requested',
      contexts: {
        patient: { label: 'Đang chờ duyệt đổi lịch' }
      }
    },
    reschedule_rejected: {
      label: 'Từ chối đổi lịch',
      tone: 'danger',
      icon: '!',
      description: 'Yêu cầu đổi lịch đã bị từ chối.',
      badgeClass: 'badge-status badge-cancelled',
      contexts: {
        patient: { label: 'Yêu cầu đổi lịch bị từ chối' }
      }
    },
    waiting_list: {
      label: 'Danh sách chờ',
      tone: 'info',
      icon: '•',
      description: 'Lịch liên quan đến danh sách chờ.',
      badgeClass: 'badge-status badge-waiting-list'
    },
    offered: {
      label: 'Đã đề xuất lịch',
      tone: 'info',
      icon: '•',
      description: 'Phòng khám đã đề xuất một lịch khám.',
      badgeClass: 'badge-status badge-offered'
    }
  },
  consultation: {
    waiting: {
      label: 'Chờ khám',
      tone: 'warning',
      badgeClass: 'badge-status badge-pending'
    },
    in_progress: {
      label: 'Đang khám',
      tone: 'info',
      badgeClass: 'badge-status badge-in-progress'
    },
    completed: {
      label: 'Đã hoàn thành khám',
      tone: 'success',
      badgeClass: 'badge-status badge-completed'
    },
    skipped: {
      label: 'Bỏ qua',
      tone: 'neutral',
      badgeClass: 'badge-status badge-neutral'
    }
  },
  waitingList: {
    waiting: {
      label: 'Đang chờ',
      tone: 'warning',
      badgeClass: 'badge-status badge-pending'
    },
    offered: {
      label: 'Đã đề nghị',
      tone: 'info',
      badgeClass: 'badge-status badge-reschedule-requested'
    },
    accepted: {
      label: 'Đã chấp nhận',
      tone: 'success',
      badgeClass: 'badge-status badge-completed'
    },
    declined: {
      label: 'Đã từ chối',
      tone: 'danger',
      badgeClass: 'badge-status badge-cancelled'
    },
    expired: {
      label: 'Đã hết hạn',
      tone: 'neutral',
      badgeClass: 'badge-status badge-neutral'
    },
    cancelled: {
      label: 'Đã hủy',
      tone: 'neutral',
      badgeClass: 'badge-status badge-neutral'
    }
  },
  followUp: {
    none: {
      label: 'Không cần tái khám',
      tone: 'neutral',
      badgeClass: 'badge-status badge-neutral'
    },
    recommended: {
      label: 'Cần tái khám',
      tone: 'warning',
      badgeClass: 'badge-status badge-pending'
    },
    scheduled: {
      label: 'Đã đặt lịch tái khám',
      tone: 'info',
      badgeClass: 'badge-status badge-reschedule-requested',
      contexts: {
        doctor: { tone: 'success', badgeClass: 'badge-status badge-completed' },
        task: { tone: 'success', badgeClass: 'badge-status badge-completed' }
      }
    },
    completed: {
      label: 'Đã hoàn thành tái khám',
      tone: 'success',
      badgeClass: 'badge-status badge-completed'
    },
    overdue: {
      label: 'Quá hạn tái khám',
      tone: 'danger',
      badgeClass: 'badge-status badge-cancelled'
    },
    cancelled: {
      label: 'Đã hủy lịch tái khám',
      tone: 'neutral',
      badgeClass: 'badge-status badge-neutral'
    }
  }
};

function normalizeDomain(domain) {
  if (domain === 'queue') return 'consultation';
  if (domain === 'waiting' || domain === 'waiting_list') return 'waitingList';
  if (domain === 'follow_up') return 'followUp';
  return domain;
}

function safeStatusValue(value) {
  return value === undefined || value === null || value === '' ? 'unknown' : String(value);
}

function withComputedBadgeClass(presentation) {
  return {
    ...presentation,
    badgeClass: presentation.badgeClass || TONE_BADGE_CLASS[presentation.tone] || TONE_BADGE_CLASS.neutral
  };
}

function createFallback(value) {
  const safeValue = safeStatusValue(value);
  return {
    value: safeValue,
    label: safeValue === 'unknown' ? 'Không xác định' : safeValue,
    tone: 'neutral',
    icon: '?',
    description: 'Trạng thái chưa được hệ thống định nghĩa hiển thị.',
    badgeClass: 'badge-status badge-neutral'
  };
}

export function getStatusPresentation(domain, value, options = {}) {
  const normalizedDomain = normalizeDomain(domain);
  const safeValue = safeStatusValue(value);
  const base = STATUS_PRESENTATIONS[normalizedDomain]?.[safeValue];

  if (!base) return createFallback(value);

  const override = options.context ? base.contexts?.[options.context] : null;
  const presentation = withComputedBadgeClass({
    ...base,
    ...override,
    value: safeValue
  });

  delete presentation.contexts;
  return presentation;
}

export function getAppointmentStatusPresentation(status, options) {
  return getStatusPresentation('appointment', status, options);
}

export function getConsultationStatusPresentation(status, options) {
  return getStatusPresentation('consultation', status, options);
}

export function getWaitingListStatusPresentation(status, options) {
  return getStatusPresentation('waitingList', status, options);
}

export function getFollowUpStatusPresentation(status, options) {
  return getStatusPresentation('followUp', status, options);
}

export function getStatusBadge(status) {
  const presentation = getAppointmentStatusPresentation(status);
  return {
    label: presentation.label,
    className: presentation.badgeClass
  };
}

export function getConsultationStatusBadge(status) {
  const presentation = getConsultationStatusPresentation(status);
  return {
    label: presentation.label,
    className: presentation.badgeClass
  };
}
