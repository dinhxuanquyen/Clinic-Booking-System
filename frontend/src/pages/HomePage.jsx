import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import {
  FaArrowRight,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaCommentMedical,
  FaHospital,
  FaStethoscope,
  FaUser
} from '../components/icons/FaIcons.jsx';
import { getSpecialtyContent, hasPlaceholderSpecialtyImage } from '../data/specialtyContent.js';
import { resolveMediaUrl, useImageFallback } from '../utils/media.js';
import { cleanDisplayText } from '../utils/textEncoding.js';

const heroSlides = [
  {
    image: '/banner-dang-ky-kham.webp',
    eyebrow: 'Đặt lịch khám nhanh',
    title: 'Chủ động chăm sóc sức khỏe cùng BookingCare Mini',
    description: 'Tìm cơ sở, chuyên khoa và bác sĩ phù hợp chỉ trong vài bước.',
    to: '/booking',
    action: 'Đặt lịch khám'
  },
  {
    image: '/doctor-team-banner-leading.webp',
    eyebrow: 'Đội ngũ chuyên gia',
    title: 'Kết nối với bác sĩ chuyên khoa uy tín',
    description: 'Xem lịch khám còn trống, kinh nghiệm và chuyên môn trước khi đặt lịch.',
    to: '/doctors',
    action: 'Tìm bác sĩ'
  },
  {
    image: '/specialties-banner.webp',
    eyebrow: 'Dịch vụ chuyên khoa',
    title: 'Tra cứu chuyên khoa phù hợp với nhu cầu khám',
    description: 'Khám tổng quát, nhi khoa, tai mũi họng, tim mạch và nhiều chuyên khoa khác.',
    to: '/specialties',
    action: 'Xem chuyên khoa'
  },
  {
    image: '/clinics-technology-banner.webp',
    eyebrow: 'Cơ sở y tế',
    title: 'Thông tin cơ sở rõ ràng trước khi đi khám',
    description: 'Xem địa chỉ, chuyên khoa hỗ trợ và lựa chọn điểm khám thuận tiện.',
    to: '/clinics',
    action: 'Xem cơ sở'
  }
];

const quickCards = [
  {
    title: 'Hướng dẫn khách hàng',
    text: 'Quy trình đặt lịch và chuẩn bị trước khi khám.',
    to: '/booking',
    icon: FaCalendarAlt
  },
  {
    title: 'Danh sách chuyên khoa',
    text: 'Tìm đúng chuyên khoa theo triệu chứng và nhu cầu.',
    to: '/specialties',
    icon: FaStethoscope
  },
  {
    title: 'Tìm bác sĩ',
    text: 'Xem hồ sơ bác sĩ, kinh nghiệm và lịch khám.',
    to: '/doctors',
    icon: FaUser
  },
  {
    title: 'Tư vấn triệu chứng AI',
    text: 'Nhận gợi ý chuyên khoa ban đầu trước khi đặt lịch.',
    to: '/symptom-checker',
    icon: FaCommentMedical
  }
];

const fallbackDoctors = [
  { _id: 'fallback-1', name: 'BS. Nguyễn Thanh Hồi', degree: 'PGS. TS. BS', position: 'Chuyên gia Nội tổng quát', specialtyId: { name: 'Nội tổng quát' } },
  { _id: 'fallback-2', name: 'BS. Lâm Khánh', degree: 'GS. TS. BS', position: 'Cố vấn chuyên môn', specialtyId: { name: 'Tim mạch' } },
  { _id: 'fallback-3', name: 'BS. Nguyễn Thị Sim', degree: 'TS. BS', position: 'Chuyên gia Nhi khoa', specialtyId: { name: 'Nhi khoa' } },
  { _id: 'fallback-4', name: 'BS. Cao Minh Châu', degree: 'GS. TS. BS', position: 'Chuyên gia phục hồi chức năng', specialtyId: { name: 'Phục hồi chức năng' } }
];

const fallbackSpecialties = [
  { _id: 'sp-internal', name: 'Nội tổng quát', image: '/specialties/photos/specialty-internal.jpg' },
  { _id: 'sp-pediatric', name: 'Nhi khoa', image: '/specialties/photos/specialty-pediatrics.jpg' },
  { _id: 'sp-ent', name: 'Tai Mũi Họng', image: '/specialties/photos/specialty-ent.jpg' },
  { _id: 'sp-cardio', name: 'Tim mạch', image: '/specialties/photos/specialty-cardiology.jpg' },
  { _id: 'sp-dental', name: 'Răng Hàm Mặt', image: '/specialties/photos/specialty-dental.jpg' },
  { _id: 'sp-derma', name: 'Da liễu', image: '/specialties/photos/specialty-dermatology.jpg' }
];

const fallbackArticles = [
  {
    _id: 'article-1',
    slug: 'huong-dan-kham-benh',
    title: 'Chuẩn bị trước khi đi khám chuyên khoa',
    summary: 'Các thông tin nên chuẩn bị để buổi khám diễn ra nhanh và hiệu quả.',
    coverImage: '/articles-health-banner.webp',
    publishedAt: new Date().toISOString()
  },
  {
    _id: 'article-2',
    slug: 'tu-van-trieu-chung',
    title: 'Khi nào nên dùng tư vấn triệu chứng AI?',
    summary: 'AI giúp định hướng ban đầu nhưng không thay thế thăm khám với bác sĩ.',
    coverImage: '/symptom-checker-banner.webp',
    publishedAt: new Date().toISOString()
  },
  {
    _id: 'article-3',
    slug: 'goi-kham-suc-khoe',
    title: 'Cách chọn gói khám phù hợp',
    summary: 'Chọn gói khám theo nhu cầu, độ tuổi, chuyên khoa và cơ sở thuận tiện.',
    coverImage: '/packages-family-banner.webp',
    publishedAt: new Date().toISOString()
  }
];

function rotateList(items, start, size) {
  if (!items.length) return [];
  return Array.from({ length: Math.min(size, items.length) }, (_, index) => items[(start + index) % items.length]);
}

function getName(value, fallback = 'Đang cập nhật') {
  if (!value) return fallback;
  return cleanDisplayText(typeof value === 'object' ? value.name : value, fallback);
}

function getDoctorImage(doctor) {
  return doctor.avatar || doctor.image || doctor.photoUrl || doctor.photo || '';
}

function getArticleDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN').format(new Date(value));
}

function getDoctorPath(doctor) {
  return doctor?._id && !String(doctor._id).startsWith('fallback-') ? `/doctors/${doctor._id}` : '/doctors';
}

function getSpecialtyPath(specialty) {
  return specialty?._id && !String(specialty._id).startsWith('sp-') ? `/specialties/${specialty._id}` : '/specialties';
}

function HomeSectionHeader({ eyebrow, title, description, to, action }) {
  return (
    <div className="home-modern-section-head">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {to && (
        <Link to={to}>
          {action}
          <FaArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}

export default function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [doctorStart, setDoctorStart] = useState(0);
  const [specialtyStart, setSpecialtyStart] = useState(0);

  const { data: doctorsPayload = [] } = useQuery({
    queryKey: ['home-doctors'],
    queryFn: async () => {
      const res = await api('/doctors');
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000
  });

  const { data: specialtiesPayload = [] } = useQuery({
    queryKey: ['home-specialties'],
    queryFn: async () => {
      const res = await api('/specialties');
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000
  });

  const { data: articlesPayload } = useQuery({
    queryKey: ['home-articles'],
    queryFn: async () => {
      const res = await api('/articles', { params: { limit: 8 } });
      return res.data?.articles || [];
    },
    staleTime: 5 * 60 * 1000
  });

  const doctors = doctorsPayload.length ? doctorsPayload.slice(0, 8) : fallbackDoctors;
  const specialties = specialtiesPayload.length ? specialtiesPayload.slice(0, 10) : fallbackSpecialties;
  const articles = (articlesPayload?.length ? articlesPayload : fallbackArticles).slice(0, 6);
  const visibleDoctors = useMemo(() => rotateList(doctors, doctorStart, 4), [doctors, doctorStart]);
  const visibleSpecialties = useMemo(() => rotateList(specialties, specialtyStart, 6), [specialties, specialtyStart]);
  const slide = heroSlides[activeSlide];

  useEffect(() => {
    if (isHeroPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [isHeroPaused]);

  return (
    <main className="home-modern-page">
      <section
        className="home-modern-hero"
        aria-label="Giới thiệu BookingCare Mini"
        onMouseEnter={() => setIsHeroPaused(true)}
        onMouseLeave={() => setIsHeroPaused(false)}
      >
        <div className="home-modern-hero-frame">
          {heroSlides.map((item, index) => (
            <img
              alt={item.title}
              aria-hidden={activeSlide !== index}
              className={activeSlide === index ? 'active' : ''}
              key={item.image}
              src={item.image}
            />
          ))}

          <button
            aria-label="Ảnh trước"
            className="home-modern-nav previous"
            type="button"
            onClick={() => setActiveSlide((current) => (current - 1 + heroSlides.length) % heroSlides.length)}
          >
            <FaChevronLeft size={17} />
          </button>

          <button
            aria-label="Ảnh tiếp theo"
            className="home-modern-nav next"
            type="button"
            onClick={() => setActiveSlide((current) => (current + 1) % heroSlides.length)}
          >
            <FaChevronRight size={17} />
          </button>

          <div className="home-modern-dots" aria-label="Chọn ảnh giới thiệu">
            {heroSlides.map((item, index) => (
              <button
                aria-label={`Xem ${item.eyebrow}`}
                className={activeSlide === index ? 'active' : ''}
                key={item.image}
                type="button"
                onClick={() => setActiveSlide(index)}
              />
            ))}
          </div>
        </div>

        <div className="home-modern-hero-copy" aria-live="polite">
          <span>{slide.eyebrow}</span>
          <h1>{slide.title}</h1>
          <p>{slide.description}</p>
          <Link to={slide.to}>
            {slide.action}
            <FaArrowRight size={14} />
          </Link>
        </div>
      </section>

      <section className="home-modern-quick-grid" aria-label="Truy cập nhanh">
        {quickCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link className="home-modern-quick-card" key={card.title} to={card.to}>
              <span><Icon size={40} /></span>
              <strong>{card.title}</strong>
              <p>{card.text}</p>
            </Link>
          );
        })}
      </section>

      <section className="home-modern-intro">
        <div>
          <span>BookingCare Mini</span>
          <h2>Hệ thống đặt lịch khám trực tuyến thân thiện cho người bệnh</h2>
          <p>
            BookingCare Mini hỗ trợ người dùng tìm chuyên khoa, chọn bác sĩ, tham khảo gói khám và theo dõi lịch hẹn trong một trải nghiệm rõ ràng.
            Dữ liệu chỉ mang tính hỗ trợ định hướng, quyết định chuyên môn vẫn thuộc về bác sĩ khi thăm khám.
          </p>
          <Link to="/clinics">
            Xem cơ sở y tế
            <FaArrowRight size={14} />
          </Link>
          <div className="home-modern-intro-points" aria-label="Lợi ích của BookingCare Mini">
            <span>Thông tin rõ ràng</span>
            <span>Đặt lịch thuận tiện</span>
            <span>Nhắc lịch chủ động</span>
          </div>
        </div>
        <img src="/clinics-technology-banner.webp" alt="Cơ sở vật chất và trang thiết bị y tế" />
      </section>

      <section className="home-modern-experts">
        <HomeSectionHeader
          eyebrow="Đội ngũ chuyên gia"
          title="Bác sĩ chuyên khoa"
          description="Theo dõi hồ sơ, chuyên môn và đặt lịch với bác sĩ phù hợp."
          to="/doctors"
          action="Xem toàn bộ"
        />
        <div className="home-modern-carousel-shell dark">
          <button aria-label="Bác sĩ trước" type="button" onClick={() => setDoctorStart((current) => (current - 1 + doctors.length) % doctors.length)}><FaChevronLeft size={16} /></button>
          <div className="home-modern-doctor-grid">
            {visibleDoctors.map((doctor) => {
              const image = getDoctorImage(doctor);
              const name = cleanDisplayText(doctor.name, 'Bác sĩ');
              const doctorPath = getDoctorPath(doctor);
              return (
                <article className="home-modern-doctor-card" key={doctor._id || name}>
                  {image ? (
                    <img
                      src={resolveMediaUrl(image, '/placeholder-doctor.svg')}
                      alt={name}
                      onError={(event) => useImageFallback(event, '/placeholder-doctor.svg')}
                    />
                  ) : (
                    <div className="home-modern-doctor-placeholder"><FaUser size={44} /></div>
                  )}
                  <div>
                    <span>{getName(doctor.specialtyId, 'Chuyên khoa')}</span>
                    <h3>{name}</h3>
                    <p>{cleanDisplayText(doctor.position || doctor.degree, 'Đang cập nhật thông tin chuyên môn')}</p>
                    <Link to={doctorPath}>Đặt lịch ngay</Link>
                  </div>
                </article>
              );
            })}
          </div>
          <button aria-label="Bác sĩ tiếp theo" type="button" onClick={() => setDoctorStart((current) => (current + 1) % doctors.length)}><FaChevronRight size={16} /></button>
        </div>
      </section>

      <section className="home-modern-specialties">
        <HomeSectionHeader
          eyebrow="Dịch vụ chuyên khoa"
          title="Chuyên khoa nổi bật"
          description="Các nhóm chuyên khoa thường được người bệnh tìm kiếm."
          to="/specialties"
          action="Xem chuyên khoa"
        />
        <div className="home-modern-carousel-shell">
          <button aria-label="Chuyên khoa trước" type="button" onClick={() => setSpecialtyStart((current) => (current - 1 + specialties.length) % specialties.length)}><FaChevronLeft size={16} /></button>
          <div className="home-modern-specialty-grid">
            {visibleSpecialties.map((specialty) => {
              const name = cleanDisplayText(specialty.name, 'Chuyên khoa');
              const content = getSpecialtyContent(name);
              const image = !hasPlaceholderSpecialtyImage(specialty.image)
                ? specialty.image
                : content.image || '/placeholder-specialty.svg';
              return (
                <Link className="home-modern-specialty-card" key={specialty._id || name} to={getSpecialtyPath(specialty)}>
                  <img
                    src={resolveMediaUrl(image, '/placeholder-specialty.svg')}
                    alt={name}
                    onError={(event) => useImageFallback(event, '/placeholder-specialty.svg')}
                  />
                  <strong>{name}</strong>
                  <span>{cleanDisplayText(content.shortDescription, 'Tư vấn và thăm khám chuyên khoa')}</span>
                </Link>
              );
            })}
          </div>
          <button aria-label="Chuyên khoa tiếp theo" type="button" onClick={() => setSpecialtyStart((current) => (current + 1) % specialties.length)}><FaChevronRight size={16} /></button>
        </div>
      </section>

      <section className="home-modern-news">
        <HomeSectionHeader
          eyebrow="Tin nổi bật"
          title="Cẩm nang sức khỏe"
          description="Tin tức và hướng dẫn chăm sóc sức khỏe dễ hiểu cho người bệnh."
          to="/articles"
          action="Xem thêm"
        />
        <div className="home-modern-news-grid">
          {articles.map((article) => {
            const title = cleanDisplayText(article.title, 'Bài viết y tế');
            return (
              <article className="home-modern-news-card" key={article._id || article.slug || title}>
                <Link to={`/articles/${article.slug || article._id}`}>
                  <img
                    src={resolveMediaUrl(article.coverImage, '/articles-health-banner.webp')}
                    alt={title}
                    onError={(event) => useImageFallback(event, '/articles-health-banner.webp')}
                  />
                </Link>
                <div>
                  <h3><Link to={`/articles/${article.slug || article._id}`}>{title}</Link></h3>
                  <p>{cleanDisplayText(article.summary, 'Thông tin tham khảo từ đội ngũ chuyên môn.')}</p>
                  <footer>
                    <span>{getArticleDate(article.publishedAt || article.createdAt)}</span>
                    <Link to={`/articles/${article.slug || article._id}`}>Chi tiết</Link>
                  </footer>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
