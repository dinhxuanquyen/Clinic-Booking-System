import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { resolveMediaUrl, useImageFallback } from '../utils/media.js';
import { SkeletonGrid } from '../components/SkeletonCard.jsx';

export default function SpecialtiesPage() {
  const { data: specialties = [], isLoading, error } = useQuery({
    queryKey: ['specialties'],
    queryFn: async () => {
      const res = await api('/specialties');
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000 // Cache cho 5 phút
  });

  return (
    <main className="section-band specialties-page">
      <div className="container">
        <div className="page-heading">
          <span className="eyebrow">Chuyên khoa</span>
          <h1 className="h2 mt-2 mb-2">Tìm chuyên khoa phù hợp</h1>
          <p className="text-secondary mb-0">Chọn chuyên khoa để xem đội ngũ bác sĩ đang nhận lịch khám.</p>
        </div>

        {error && (
          <div className="alert alert-danger">
            Có lỗi xảy ra khi tải chuyên khoa: {error.message || 'Lỗi không xác định'}
          </div>
        )}

        {isLoading ? (
          <SkeletonGrid count={6} />
        ) : (
          <div className="row g-4">
            {specialties.map((item) => (
              <div className="col-12 col-md-6 col-lg-4" key={item._id}>
                <article className="specialty-card h-100">
                  <img
                    src={resolveMediaUrl(item.image, '/placeholder-specialty.svg')}
                    alt={item.name}
                    loading="lazy"
                    onError={(event) => useImageFallback(event, '/placeholder-specialty.svg')}
                  />
                  <div className="specialty-card-body">
                    <h2>{item.name}</h2>
                    <p>{item.description || 'Thông tin chuyên khoa đang được cập nhật.'}</p>
                    <Link className="btn btn-outline-primary specialty-card-cta" to={`/specialties/${item._id}`}>
                      Xem chi tiết
                    </Link>
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
