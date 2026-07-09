import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { resolveMediaUrl, useImageFallback } from '../utils/media.js';
import { SkeletonGrid } from '../components/SkeletonCard.jsx';

function shortText(value, length = 128) {
  if (!value) return 'Thông tin cơ sở đang được cập nhật.';
  return value.length > length ? `${value.slice(0, length)}...` : value;
}

export default function ClinicsPage() {
  const [search, setSearch] = useState('');

  const { data: clinics = [], isLoading, error } = useQuery({
    queryKey: ['clinics'],
    queryFn: async () => {
      const res = await api('/clinics');
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000 // Cache cho 5 phút
  });

  const filteredClinics = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clinics;
    return clinics.filter((c) =>
      (c.name || '').toLowerCase().includes(term) ||
      (c.address || '').toLowerCase().includes(term) ||
      (c.description || '').toLowerCase().includes(term)
    );
  }, [clinics, search]);

  return (
    <main className="section-band clinics-page">
      <div className="container">
        <div className="page-heading d-flex flex-column flex-lg-row justify-content-between gap-3">
          <div>
            <span className="eyebrow">Hệ thống phòng khám</span>
            <h1 className="h2 mt-2 mb-2">Chọn cơ sở khám bệnh</h1>
            <p className="text-secondary mb-0">Tìm cơ sở gần bạn, xem chuyên khoa và đặt lịch với bác sĩ phù hợp.</p>
          </div>
          <div className="hero-search align-self-lg-end w-100" style={{ maxWidth: 440 }}>
            <div className="input-group">
              <input
                className="form-control"
                placeholder="Tìm theo tên hoặc địa chỉ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search ? (
                <button className="btn btn-outline-secondary" type="button" onClick={() => setSearch('')}>Xóa</button>
              ) : (
                <button className="btn btn-primary" type="button">Tìm</button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger">
            Có lỗi xảy ra khi tải danh sách phòng khám: {error.message || 'Lỗi không xác định'}
          </div>
        )}

        {isLoading ? (
          <SkeletonGrid count={6} />
        ) : (
          <>
            {filteredClinics.length === 0 && !error && (
              <div className="alert alert-light border text-center py-4">
                Không tìm thấy cơ sở khám bệnh phù hợp với từ khóa "{search}".
              </div>
            )}
            
            <div className="row g-4">
              {filteredClinics.map((clinic) => (
                <div className="col-12 col-md-6 col-lg-4" key={clinic._id}>
                  <div className="card h-100 clinic-card">
                    <img
                      src={resolveMediaUrl(clinic.image)}
                      className="card-img-top clinic-card-image"
                      alt={clinic.name}
                      loading="lazy"
                      onError={(event) => useImageFallback(event, '/placeholder-clinic.svg')}
                    />
                    <div className="card-body d-flex flex-column p-4">
                      <span className="location-badge mb-3">{clinic.address || 'Đang cập nhật địa chỉ'}</span>
                      <h2 className="h5 fw-bold">{clinic.name}</h2>
                      <p className="card-text text-secondary clinic-card-description">{shortText(clinic.description)}</p>
                      <Link className="btn btn-outline-primary mt-auto" to={`/clinics/${clinic._id}`}>
                        Xem chi tiết
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
