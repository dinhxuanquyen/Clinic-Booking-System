import { Link } from 'react-router-dom';
import { FaCalendarAlt, FaEnvelope, FaMapMarkerAlt, FaPhoneAlt } from './icons/FaIcons.jsx';

const services = [
  { label: 'Đặt lịch khám online', to: '/booking' },
  { label: 'Tư vấn triệu chứng AI', to: '/symptom-checker' },
  { label: 'Gói khám sức khỏe', to: '/packages' },
  { label: 'Tìm kiếm bác sĩ', to: '/doctors' },
  { label: 'Chuyên khoa y tế', to: '/specialties' }
];

const patientLinks = [
  { label: 'Cơ sở khám bệnh', to: '/clinics' },
  { label: 'Lịch hẹn của tôi', to: '/appointments/my' },
  { label: 'Hồ sơ khám điện tử', to: '/medical-records' },
  { label: 'Tài khoản cá nhân', to: '/profile' }
];

const trustFeatures = [
  { icon: '🛡️', title: 'Bảo mật dữ liệu Y tế' },
  { icon: '⚡', title: 'Xác nhận tức thì 24/7' },
  { icon: '🏥', title: 'Cơ sở y tế đạt chuẩn' },
  { icon: '🤖', title: 'Trợ lý AI thông minh' }
];

export default function Footer() {
  return (
    <footer className="compact-footer">
      <div className="compact-footer-container">
        {/* Main 4-Column Grid */}
        <div className="compact-footer-grid">
          {/* Col 1: Brand & Contact */}
          <div className="compact-footer-col compact-col-brand">
            <Link className="compact-footer-logo" to="/">
              <span className="brand-mark">B</span>
              <span className="brand-text">
                BookingCare Mini
                <small>Clinic Appointment System</small>
              </span>
            </Link>

            <p className="compact-brand-desc">
              Hệ thống y tế số thông minh kết nối người bệnh với các cơ sở y tế và bác sĩ uy tín trên toàn quốc.
            </p>

            <div className="compact-contact-row">
              <a className="compact-hotline-chip" href="tel:19000000">
                <FaPhoneAlt size={13} />
                <span>Hotline: <strong>1900 0000</strong></span>
              </a>
              <div className="compact-contact-chip">
                <FaEnvelope size={13} />
                <span>support@bookingcare-mini.vn</span>
              </div>
            </div>
          </div>

          {/* Col 2: Services */}
          <div className="compact-footer-col">
            <h4 className="compact-col-heading">DỊCH VỤ Y TẾ</h4>
            <ul className="compact-menu-list">
              {services.map((item) => (
                <li key={item.label}>
                  <Link to={item.to}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Patient Links & CTA */}
          <div className="compact-footer-col">
            <h4 className="compact-col-heading">DÀNH CHO BỆNH NHÂN</h4>
            <ul className="compact-menu-list">
              {patientLinks.map((item) => (
                <li key={item.to}>
                  <Link to={item.to}>{item.label}</Link>
                </li>
              ))}
            </ul>

            <div className="compact-cta-box">
              <Link className="btn btn-primary compact-booking-btn" to="/booking">
                <FaCalendarAlt size={13} />
                <span>Đặt lịch khám ngay</span>
              </Link>
            </div>
          </div>

          {/* Col 4: Trust Commitments */}
          <div className="compact-footer-col">
            <h4 className="compact-col-heading">CAM KẾT CHẤT LƯỢNG</h4>
            <div className="compact-trust-list">
              {trustFeatures.map((item) => (
                <div className="compact-trust-item" key={item.title}>
                  <span className="compact-trust-icon">{item.icon}</span>
                  <span className="compact-trust-title">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="compact-footer-bottom">
          <div className="compact-copyright">
            © 2026 BookingCare Mini. Tất cả quyền được bảo lưu.
          </div>
          <div className="compact-legal-links">
            <span>Chính sách bảo mật</span>
            <span className="compact-dot">•</span>
            <span>Điều khoản sử dụng</span>
            <span className="compact-dot">•</span>
            <span>Quy chế hoạt động</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
