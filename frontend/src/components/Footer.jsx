import { Link } from 'react-router-dom';
import {
  FaArrowRight,
  FaCalendarAlt,
  FaCalendarCheck,
  FaCheckCircle,
  FaCommentMedical,
  FaEnvelope,
  FaHospital,
  FaPhoneAlt,
  FaStethoscope,
  FaUser
} from './icons/FaIcons.jsx';

const serviceLinks = [
  { label: 'Đặt lịch khám online', to: '/booking' },
  { label: 'Tư vấn triệu chứng AI', to: '/symptom-checker' },
  { label: 'Gói khám sức khỏe', to: '/packages' },
  { label: 'Danh sách bác sĩ', to: '/doctors' },
  { label: 'Chuyên khoa y tế', to: '/specialties' }
];

const patientLinks = [
  { label: 'Cơ sở khám bệnh', to: '/clinics' },
  { label: 'Lịch hẹn của tôi', to: '/appointments/my' },
  { label: 'Hồ sơ khám điện tử', to: '/medical-records' },
  { label: 'Tài khoản cá nhân', to: '/profile' }
];

const trustFeatures = [
  {
    icon: FaCheckCircle,
    title: 'Bảo mật dữ liệu y tế',
    text: 'Thông tin cá nhân được xử lý theo phạm vi chăm sóc sức khỏe.'
  },
  {
    icon: FaCalendarCheck,
    title: 'Quy trình đặt lịch rõ ràng',
    text: 'Theo dõi lịch hẹn, trạng thái xác nhận và yêu cầu đổi lịch.'
  },
  {
    icon: FaHospital,
    title: 'Kết nối cơ sở uy tín',
    text: 'Tìm cơ sở, chuyên khoa và bác sĩ phù hợp nhu cầu khám.'
  }
];

export default function Footer() {
  return (
    <footer className="bc-footer">
      <div className="bc-footer-shell">
        <section className="bc-footer-cta" aria-label="Đặt lịch khám nhanh">
          <div>
            <span className="bc-footer-eyebrow">BookingCare Mini</span>
            <h2>Chủ động đặt lịch và quản lý hành trình khám của bạn</h2>
            <p>
              Tìm cơ sở, chuyên khoa, bác sĩ và gói khám phù hợp trong một hệ thống đặt lịch thống nhất.
            </p>
          </div>
          <div className="bc-footer-cta-actions">
            <Link className="bc-footer-primary-btn" to="/booking">
              <FaCalendarAlt size={14} />
              Đặt lịch khám
            </Link>
            <Link className="bc-footer-secondary-btn" to="/symptom-checker">
              <FaCommentMedical size={14} />
              Hỏi trợ lý AI
            </Link>
          </div>
        </section>

        <div className="bc-footer-main">
          <section className="bc-footer-brand" aria-label="Thông tin BookingCare Mini">
            <Link className="bc-footer-logo" to="/">
              <span className="brand-mark brand-logo">
                <img src="/site-logo.webp" alt="" />
              </span>
              <span className="brand-text">
                <strong>BookingCare Mini</strong>
                <small>Clinic Appointment System</small>
              </span>
            </Link>
            <p>
              Hệ thống đặt lịch khám thông minh, giúp người bệnh tiếp cận dịch vụ y tế phù hợp và quản lý lịch hẹn dễ dàng.
            </p>
            <div className="bc-footer-contact">
              <a href="tel:19000000">
                <FaPhoneAlt size={14} />
                <span>1900 0000</span>
              </a>
              <a href="mailto:support@bookingcare-mini.vn">
                <FaEnvelope size={14} />
                <span>support@bookingcare-mini.vn</span>
              </a>
            </div>
          </section>

          <nav className="bc-footer-col" aria-label="Dịch vụ y tế">
            <h3>Dịch vụ y tế</h3>
            {serviceLinks.map((item) => (
              <Link key={item.to} to={item.to}>
                <FaArrowRight size={11} />
                {item.label}
              </Link>
            ))}
          </nav>

          <nav className="bc-footer-col" aria-label="Dành cho bệnh nhân">
            <h3>Dành cho bệnh nhân</h3>
            {patientLinks.map((item) => (
              <Link key={item.to} to={item.to}>
                <FaArrowRight size={11} />
                {item.label}
              </Link>
            ))}
          </nav>

          <section className="bc-footer-trust" aria-label="Cam kết chất lượng">
            <h3>Cam kết chất lượng</h3>
            <div className="bc-footer-trust-list">
              {trustFeatures.map(({ icon: Icon, title, text }) => (
                <article key={title}>
                  <span>
                    <Icon size={15} />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <p>{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="bc-footer-bottom">
          <span>© 2026 BookingCare Mini. Tất cả quyền được bảo lưu.</span>
          <div>
            <Link to="/articles">Cẩm nang</Link>
            <Link to="/clinics">Cơ sở</Link>
            <Link to="/doctors">Tìm bác sĩ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
