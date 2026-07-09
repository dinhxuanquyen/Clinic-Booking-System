import { Link } from 'react-router-dom';

const quickCards = [
  {
    title: 'Hướng dẫn khách hàng',
    text: 'Quy trình đặt lịch, chuẩn bị hồ sơ và lưu ý trước khi khám.',
    to: '/clinics',
    icon: '📋',
    accent: 'sky'
  },
  {
    title: 'Danh sách chuyên khoa',
    text: 'Tìm chuyên khoa phù hợp theo nhu cầu khám và điều trị.',
    to: '/specialties',
    icon: '🔬',
    accent: 'violet'
  },
  {
    title: 'Tìm bác sĩ',
    text: 'Xem thông tin bác sĩ, kinh nghiệm và lịch khám còn trống.',
    to: '/doctors',
    icon: '👨‍⚕️',
    accent: 'emerald'
  },
  {
    title: 'Bảng giá dịch vụ',
    text: 'Tham khảo dịch vụ khám, tư vấn và các gói chăm sóc sức khỏe.',
    to: '/specialties',
    icon: '💊',
    accent: 'amber'
  }
];

const processSteps = [
  {
    step: '01',
    title: 'Chọn cơ sở & chuyên khoa',
    desc: 'Tìm cơ sở y tế gần bạn hoặc chuyên khoa phù hợp với nhu cầu.',
    icon: '🏥'
  },
  {
    step: '02',
    title: 'Chọn bác sĩ & khung giờ',
    desc: 'Xem lịch trống của bác sĩ và chọn thời gian thuận tiện nhất.',
    icon: '📅'
  },
  {
    step: '03',
    title: 'Xác nhận & theo dõi',
    desc: 'Nhận thông báo xác nhận và theo dõi lịch hẹn trong ứng dụng.',
    icon: '✅'
  }
];

const heroStats = [
  { value: '500+', label: 'Bác sĩ chuyên khoa' },
  { value: '30+', label: 'Chuyên khoa' },
  { value: '24/7', label: 'Đặt lịch online' },
  { value: '15+', label: 'Cơ sở y tế' }
];

export default function HomePage() {
  return (
    <main>
      {/* ═══ HERO SECTION ═══ */}
      <section className="hero-section">
        <div className="container position-relative">
          <div className="row align-items-center g-5">
            <div className="col-lg-7">
              <div className="hero-eyebrow">
                <span>🏥</span> Nền tảng y tế số
              </div>

              <h1 className="hero-title">
                Chăm sóc sức khỏe{' '}
                <span className="hero-title-highlight">chủ động</span>
                {', '}đặt lịch
                {' '}dễ dàng
              </h1>

              <p className="hero-copy">
                BookingCare Mini giúp bạn tìm bác sĩ, chuyên khoa và đặt lịch khám
                chỉ trong vài bước — nhanh, rõ ràng và đáng tin cậy.
              </p>

              <div className="hero-search-bar">
                <input
                  type="search"
                  placeholder="Tìm cơ sở, chuyên khoa hoặc bác sĩ..."
                />
                <Link className="btn btn-primary" to="/clinics">
                  Tìm kiếm
                </Link>
              </div>

              <div className="hero-ai-cta mt-3">
                <span>Chưa biết nên khám khoa nào?</span>
                <Link to="/symptom-checker">
                  🤖 Thử tư vấn triệu chứng AI
                </Link>
              </div>

              <div className="hero-stats-bar">
                {heroStats.map((stat) => (
                  <div className="hero-stat-item" key={stat.label}>
                    <span className="hero-stat-value">{stat.value}</span>
                    <span className="hero-stat-label">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-lg-5 d-none d-lg-block">
              <div className="home-hero-visual">
                <div className="home-hero-card">
                  <div className="home-hero-card-header">
                    <span className="home-hero-card-dot green" />
                    <span className="home-hero-card-dot amber" />
                    <span className="home-hero-card-dot red" />
                    <span className="home-hero-card-title">Lịch hẹn hôm nay</span>
                  </div>
                  <div className="home-hero-appt-list">
                    {[
                      { time: '08:30', doctor: 'BS. Nguyễn Thị Lan', spec: 'Nội tổng quát', badge: 'Đã xác nhận', color: 'confirmed' },
                      { time: '10:00', doctor: 'TS. Trần Minh Đức', spec: 'Tim mạch', badge: 'Chờ xác nhận', color: 'pending' },
                      { time: '14:30', doctor: 'PGS. Lê Thu Hà', spec: 'Thần kinh', badge: 'Đã xác nhận', color: 'confirmed' }
                    ].map((appt) => (
                      <div className="home-hero-appt-item" key={appt.time}>
                        <span className="home-hero-appt-time">{appt.time}</span>
                        <div className="home-hero-appt-info">
                          <strong>{appt.doctor}</strong>
                          <span>{appt.spec}</span>
                        </div>
                        <span className={`badge-status badge-${appt.color}`}>{appt.badge}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="home-hero-floating-card ai-card">
                  <span>🤖</span>
                  <div>
                    <strong>AI Symptom Checker</strong>
                    <p>Phân tích triệu chứng tức thì</p>
                  </div>
                </div>
                <div className="home-hero-floating-card notif-card">
                  <span>🔔</span>
                  <div>
                    <strong>Nhắc lịch tự động</strong>
                    <p>Nhận thông báo trước 24h</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ QUICK ACCESS CARDS ═══ */}
      <section className="home-quick-section">
        <div className="container">
          <div className="row g-4">
            {quickCards.map((card) => (
              <div className="col-sm-6 col-xl-3" key={card.title}>
                <Link className={`quick-card quick-card-${card.accent}`} to={card.to}>
                  <div className={`quick-icon quick-icon-${card.accent}`}>
                    {card.icon}
                  </div>
                  <h2>{card.title}</h2>
                  <p>{card.text}</p>
                  <span className="quick-card-arrow">→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="home-process-section">
        <div className="container">
          <div className="home-process-header">
            <div className="hero-eyebrow">
              <span>⚡</span> Quy trình đặt lịch
            </div>
            <h2>Đặt lịch khám chỉ trong <span className="home-process-highlight">3 bước</span></h2>
            <p>Nhanh chóng, minh bạch và hoàn toàn trực tuyến</p>
          </div>

          <div className="home-process-grid">
            {processSteps.map((item, index) => (
              <div className="home-process-step" key={item.step}>
                <div className="home-process-step-icon">{item.icon}</div>
                <div className="home-process-step-num">{item.step}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                {index < processSteps.length - 1 && (
                  <span className="home-process-arrow" aria-hidden="true">→</span>
                )}
              </div>
            ))}
          </div>

          <div className="home-process-cta">
            <Link className="btn btn-primary btn-lg" to="/booking">
              Đặt lịch khám ngay
            </Link>
            <Link className="btn btn-secondary btn-lg" to="/doctors">
              Xem danh sách bác sĩ
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ AI CTA BANNER ═══ */}
      <section className="home-ai-banner">
        <div className="container">
          <div className="home-ai-banner-inner">
            <div className="home-ai-banner-content">
              <div className="home-ai-banner-icon">🤖</div>
              <div>
                <h2>Chưa biết nên khám khoa nào?</h2>
                <p>
                  Mô tả triệu chứng để AI phân tích và gợi ý chuyên khoa phù hợp —
                  miễn phí và tức thì.
                </p>
              </div>
            </div>
            <Link className="btn btn-primary btn-lg home-ai-banner-btn" to="/symptom-checker">
              Thử ngay miễn phí
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
