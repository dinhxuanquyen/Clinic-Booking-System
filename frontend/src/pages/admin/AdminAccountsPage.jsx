import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { AdminEmptyState, AdminPagination, adminPageSize, paginate } from './adminUtils.jsx';

const roleTabs = [
  { value: '', label: 'Tất cả' },
  { value: 'patient', label: 'Bệnh nhân' },
  { value: 'doctor', label: 'Bác sĩ' },
  { value: 'admin', label: 'Quản trị' }
];

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'locked', label: 'Đã khóa' }
];

function roleLabel(role) {
  if (role === 'admin') return 'Quản trị viên';
  if (role === 'doctor') return 'Bác sĩ';
  if (role === 'patient') return 'Bệnh nhân';
  return role || 'Chưa phân quyền';
}

function formatDateTime(value) {
  if (!value) return 'Chưa có';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getUserId(user) {
  return String(user?._id || user?.id || '');
}

function readUsers(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.users)) return payload.data.users;
  return [];
}

function readSummary(payload, users) {
  const summary = payload?.data?.summary;
  if (summary) return summary;

  return users.reduce((acc, user) => {
    acc.total += 1;
    if (user.isActive === false) acc.locked += 1;
    else acc.active += 1;
    if (user.role === 'admin') acc.admins += 1;
    if (user.role === 'doctor') acc.doctors += 1;
    if (user.role === 'patient') acc.patients += 1;
    if (user.role === 'patient' && user.isEmailVerified === false) acc.unverified += 1;
    return acc;
  }, { total: 0, active: 0, locked: 0, admins: 0, doctors: 0, patients: 0, unverified: 0 });
}

export default function AdminAccountsPage() {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, locked: 0, admins: 0, doctors: 0, patients: 0, unverified: 0 });
  const [filters, setFilters] = useState({ keyword: '', role: '', status: '' });
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const currentUserId = getUserId(currentUser);
  const { pageItems, totalPages } = useMemo(() => paginate(users, currentPage, adminPageSize), [users, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.keyword, filters.role, filters.status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      api('/admin/users', { params: filters })
        .then((payload) => {
          const nextUsers = readUsers(payload);
          setUsers(nextUsers);
          setSummary(readSummary(payload, nextUsers));
        })
        .catch((error) => toast.error(error.message || 'Không tải được danh sách tài khoản'))
        .finally(() => setLoading(false));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [filters, toast]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  async function toggleAccountStatus(targetUser) {
    const nextIsActive = targetUser.isActive === false;
    const actionLabel = nextIsActive ? 'mở khóa' : 'khóa';
    const confirmed = window.confirm(`Bạn chắc chắn muốn ${actionLabel} tài khoản ${targetUser.email}?`);
    if (!confirmed) return;

    setUpdatingId(getUserId(targetUser));
    try {
      const payload = await api(`/admin/users/${getUserId(targetUser)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextIsActive })
      });
      const updatedUser = payload.data?.user;
      if (updatedUser) {
        setUsers((current) => current.map((item) => (getUserId(item) === getUserId(updatedUser) ? updatedUser : item)));
        setSummary((current) => ({
          ...current,
          active: current.active + (nextIsActive ? 1 : -1),
          locked: current.locked + (nextIsActive ? -1 : 1)
        }));
      }
      toast.success(payload.message || (nextIsActive ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản'));
    } catch (error) {
      toast.error(error.message || 'Không cập nhật được trạng thái tài khoản');
    } finally {
      setUpdatingId('');
    }
  }

  return (
    <div className="admin-page admin-accounts-page">
      <div className="admin-page-heading d-flex justify-content-between align-items-start gap-3">
        <div>
          <span className="eyebrow">Quản trị truy cập</span>
          <h1>Tài khoản hệ thống</h1>
          <p>Quản lý tài khoản bệnh nhân, bác sĩ và quản trị viên. Khóa tài khoản sẽ ngăn người dùng đăng nhập nhưng không xóa dữ liệu.</p>
        </div>
      </div>

      <section className="admin-account-summary">
        <div>
          <span>Tổng tài khoản</span>
          <strong>{summary.total}</strong>
        </div>
        <div>
          <span>Đang hoạt động</span>
          <strong>{summary.active}</strong>
        </div>
        <div>
          <span>Đã khóa</span>
          <strong>{summary.locked}</strong>
        </div>
        <div>
          <span>Chưa xác thực email</span>
          <strong>{summary.unverified}</strong>
        </div>
      </section>

      <div className="admin-tabs" role="tablist" aria-label="Lọc vai trò tài khoản">
        {roleTabs.map((item) => (
          <button
            className={`admin-tab ${filters.role === item.value ? 'active' : ''}`}
            key={item.value || 'all'}
            type="button"
            onClick={() => updateFilter('role', item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="management-panel admin-table-card admin-accounts-card">
        <div className="admin-table-toolbar">
          <input
            className="form-control"
            placeholder="Tìm theo tên, email hoặc số điện thoại"
            value={filters.keyword}
            onChange={(event) => updateFilter('keyword', event.target.value)}
          />
          <select className="form-select" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
            {statusOptions.map((item) => <option key={item.value || 'all-status'} value={item.value}>{item.label}</option>)}
          </select>
        </div>

        <div className="admin-accounts-result-bar">
          <span>{loading ? 'Đang tải tài khoản...' : `${users.length} tài khoản phù hợp`}</span>
          <span>Trang {Math.min(currentPage, totalPages)} / {totalPages}</span>
        </div>

        {loading ? (
          <div className="admin-empty-state"><p>Đang tải dữ liệu tài khoản...</p></div>
        ) : users.length === 0 ? (
          <AdminEmptyState message="Không có tài khoản phù hợp" />
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle admin-table admin-accounts-table">
                <thead>
                  <tr>
                    <th>Tài khoản</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Xác thực</th>
                    <th>Liên kết</th>
                    <th>Lần đăng nhập</th>
                    <th>Ngày tạo</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item) => {
                    const itemId = getUserId(item);
                    const isCurrentUser = itemId === currentUserId;
                    const isLocked = item.isActive === false;
                    const relation = item.role === 'doctor'
                      ? item.doctorId?.name || item.doctorId?.doctorCode || 'Chưa liên kết bác sĩ'
                      : item.clinicId?.name || 'Toàn hệ thống';

                    return (
                      <tr key={itemId}>
                        <td>
                          <div className="admin-account-user-cell">
                            <div className="admin-account-avatar" aria-hidden="true">{(item.name || item.email || '?').slice(0, 1).toUpperCase()}</div>
                            <div>
                              <strong>{item.name || 'Chưa cập nhật tên'}</strong>
                              <span>{item.email}</span>
                              {item.phone ? <small>{item.phone}</small> : null}
                            </div>
                          </div>
                        </td>
                        <td><span className="admin-code-pill">{roleLabel(item.role)}</span></td>
                        <td>
                          <span className={`badge ${isLocked ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'}`}>
                            {isLocked ? 'Đã khóa' : 'Đang hoạt động'}
                          </span>
                        </td>
                        <td>
                          {item.role === 'patient' ? (
                            <span className={`badge ${item.isEmailVerified === false ? 'bg-warning-subtle text-warning-emphasis' : 'bg-success-subtle text-success'}`}>
                              {item.isEmailVerified === false ? 'Chưa xác thực' : 'Đã xác thực'}
                            </span>
                          ) : (
                            <span className="badge bg-secondary-subtle text-secondary">Tài khoản nội bộ</span>
                          )}
                        </td>
                        <td><span className="admin-table-text">{relation}</span></td>
                        <td><span className="admin-table-text">{formatDateTime(item.lastLoginAt)}</span></td>
                        <td><span className="admin-table-text">{formatDateTime(item.createdAt)}</span></td>
                        <td>
                          <div className="admin-table-actions">
                            {isCurrentUser ? (
                              <span className="admin-current-account-pill">Đang dùng</span>
                            ) : (
                              <button
                                className={`btn btn-sm ${isLocked ? 'btn-outline-success' : 'btn-outline-danger'}`}
                                disabled={updatingId === itemId}
                                type="button"
                                onClick={() => toggleAccountStatus(item)}
                              >
                                {updatingId === itemId ? 'Đang lưu...' : isLocked ? 'Mở khóa' : 'Khóa'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <AdminPagination currentPage={Math.min(currentPage, totalPages)} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}
      </section>
    </div>
  );
}
