import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getVietnamToday, isPastDate, isPastOrCurrentSlot } from '../utils/dateTime.js';
import { cleanDisplayText } from '../utils/textEncoding.js';

const defaultPatientInfo = {
  name: '',
  email: '',
  phone: '',
  gender: '',
  dateOfBirth: '',
  reason: '',
  confirmed: false
};

const ASSISTANT_BOOKING_CONTEXT_KEY = 'bookingcare:symptom-assistant-context';

function readAssistantBookingContext(searchParams) {
  if (searchParams.get('source') !== 'symptom-assistant') return null;
  try {
    const raw = window.sessionStorage.getItem(ASSISTANT_BOOKING_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.source !== 'symptom-assistant') return null;
    return parsed;
  } catch {
    return null;
  }
}

function getId(value) {
  return typeof value === 'object' ? value?._id : value;
}

function getName(value) {
  if (!value) return 'Đang cập nhật';
  return typeof value === 'object' ? value.name : value;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatSimpleDate(value) {
  return value ? String(value).slice(0, 10) : '';
}

function apiErrorMessage(error) {
  return cleanDisplayText(error?.message, 'Đã xảy ra lỗi, vui lòng thử lại');
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase();
}

function ServicePackageCard({ item, selected, onSelect, fallback = false, recommended = false }) {
  const description = cleanDisplayText(
    item?.description,
    'Bác sĩ sẽ đánh giá tình trạng và tư vấn dịch vụ phù hợp khi thăm khám.'
  );

  return (
    <article
      className={`service-package-option service-package-compact-card ${selected ? 'selected' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <span className="service-package-radio" aria-hidden="true">{selected ? '✓' : ''}</span>
      <div className="service-package-compact-body">
        <div className="service-package-compact-head">
          <strong>{cleanDisplayText(item?.name, 'Để bác sĩ tư vấn')}</strong>
          <span className="service-package-payment-badge">{recommended ? 'Khuyến nghị' : 'Thanh toán tại phòng khám'}</span>
        </div>
        <div className="service-package-compact-meta">
          <span>{fallback ? 'Không bắt buộc' : formatCurrency(item.price)}</span>
          <em>{fallback ? 'Tư vấn khi khám' : `${item?.durationMinutes || 30} phút`}</em>
        </div>
        <p>{description}</p>
        {!fallback && item?._id && (
          <Link
            className="service-package-detail-link"
            to={`/packages/${item._id}`}
            onClick={(event) => event.stopPropagation()}
          >
            Xem chi tiết
          </Link>
        )}
      </div>
    </article>
  );
}

export default function BookingPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialClinicId = searchParams.get('clinicId') || '';
  const initialSpecialtyId = searchParams.get('specialtyId') || '';
  const initialPackageId = searchParams.get('packageId') || '';
  const initialFollowUpRecordId = searchParams.get('followUpRecordId') || '';
  const [assistantBookingContext] = useState(() => readAssistantBookingContext(searchParams));
  const pendingPackageIdRef = useRef(initialPackageId);
  const pendingDoctorIdRef = useRef('');
  const today = getVietnamToday();
  const [clinics, setClinics] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [servicePackages, setServicePackages] = useState([]);
  const [waitingEntries, setWaitingEntries] = useState([]);
  const [followUpRecord, setFollowUpRecord] = useState(null);
  const [followUpDoctorUnavailable, setFollowUpDoctorUnavailable] = useState(false);
  const [form, setForm] = useState({
    clinicId: initialClinicId,
    specialtyId: initialSpecialtyId,
    doctorId: '',
    date: today,
    timeSlot: '',
    servicePackageId: ''
  });
  const [selfPatient, setSelfPatient] = useState(false);
  const [patientInfo, setPatientInfo] = useState(defaultPatientInfo);
  const [joiningSlot, setJoiningSlot] = useState('');
  const [showAllPackages, setShowAllPackages] = useState(false);
  const [loading, setLoading] = useState({ clinics: true, specialties: false, doctors: false, slots: false, packages: false, submit: false });

  const loadWaitingEntries = useCallback(async () => {
    if (normalizeText(user?.role) !== 'patient') {
      setWaitingEntries([]);
      return;
    }

    try {
      const payload = await api('/waiting-list/my');
      setWaitingEntries(payload.data || []);
    } catch {
      setWaitingEntries([]);
    }
  }, [user]);

  const loadSlots = useCallback(async () => {
    if (!form.doctorId || !form.date) return;

    setLoading((current) => ({ ...current, slots: true }));
    try {
      const payload = await api(`/doctors/${form.doctorId}/available-slots?date=${form.date}`);
      setSlots(payload.data || []);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading((current) => ({ ...current, slots: false }));
    }
  }, [form.doctorId, form.date, toast]);

  useEffect(() => {
    api('/clinics')
      .then((payload) => setClinics(payload.data || []))
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading((current) => ({ ...current, clinics: false })));
  }, [toast]);

  useEffect(() => {
    if (!initialPackageId) return undefined;

    let isActive = true;
    api(`/service-packages/${initialPackageId}`)
      .then((payload) => {
        if (!isActive || !payload.data) return;
        const item = payload.data;
        const clinicId = getId(item.clinicId);
        const specialtyId = getId(item.specialtyId);
        const doctorId = getId(item.doctorId);

        pendingPackageIdRef.current = item._id;
        pendingDoctorIdRef.current = doctorId || '';
        setForm((current) => ({
          ...current,
          clinicId: clinicId || current.clinicId,
          specialtyId: specialtyId || current.specialtyId,
          doctorId: doctorId || current.doctorId,
          servicePackageId: item._id
        }));
      })
      .catch(() => {
        toast.warning('Gói khám trong liên kết không khả dụng. Bạn vẫn có thể đặt lịch để bác sĩ tư vấn.');
      });

    return () => {
      isActive = false;
    };
  }, [initialPackageId, toast]);

  useEffect(() => {
    if (!initialFollowUpRecordId) return undefined;

    let isActive = true;
    api(`/medical-records/${initialFollowUpRecordId}`)
      .then((payload) => {
        if (!isActive || !payload.data) return;
        const record = payload.data;
        const clinicId = getId(record.clinicId);
        const specialtyId = getId(record.specialtyId);
        const doctorId = getId(record.doctorId);
        const followUpDate = record.followUpDate ? String(record.followUpDate).slice(0, 10) : today;
        const appointmentDate = record.appointmentId?.date || record.createdAt;
        const visitDate = appointmentDate ? String(appointmentDate).slice(0, 10) : '';

        setFollowUpRecord(record);
        setFollowUpDoctorUnavailable(false);
        pendingDoctorIdRef.current = doctorId || '';
        setForm((current) => ({
          ...current,
          clinicId: clinicId || current.clinicId,
          specialtyId: specialtyId || current.specialtyId,
          doctorId: doctorId || current.doctorId,
          date: followUpDate >= today ? followUpDate : today,
          servicePackageId: ''
        }));
        setPatientInfo((current) => ({
          ...current,
          reason: current.reason || `Tái khám theo hồ sơ khám ngày ${visitDate || followUpDate}`
        }));
      })
      .catch((error) => {
        toast.warning(apiErrorMessage(error) || 'Không thể tải thông tin tái khám. Bạn vẫn có thể đặt lịch bình thường.');
      });

    return () => {
      isActive = false;
    };
  }, [initialFollowUpRecordId, today, toast]);

  useEffect(() => {
    setSpecialties([]);
    setDoctors([]);
    setSlots([]);
    setServicePackages([]);
    
    if (!form.clinicId) return;

    setLoading((current) => ({ ...current, specialties: true }));
    api(`/clinics/${form.clinicId}/specialties`)
      .then((payload) => setSpecialties(payload.data || []))
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading((current) => ({ ...current, specialties: false })));
  }, [form.clinicId, toast]);

  useEffect(() => {
    setDoctors([]);
    setSlots([]);
    setServicePackages([]);
    
    if (!form.clinicId || !form.specialtyId) return;

    setLoading((current) => ({ ...current, doctors: true }));
    api('/doctors', { params: { clinicId: form.clinicId, specialtyId: form.specialtyId } })
      .then((payload) => setDoctors(payload.data || []))
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading((current) => ({ ...current, doctors: false })));
  }, [form.clinicId, form.specialtyId, toast]);


  useEffect(() => {
    if (!pendingDoctorIdRef.current || !doctors.length) return;

    const doctorId = pendingDoctorIdRef.current;
    if (doctors.some((doctor) => doctor._id === doctorId)) {
      setForm((current) => ({ ...current, doctorId }));
      setFollowUpDoctorUnavailable(false);
      pendingDoctorIdRef.current = '';
    } else if (followUpRecord) {
      setFollowUpDoctorUnavailable(true);
      setForm((current) => ({ ...current, doctorId: '', timeSlot: '' }));
      pendingDoctorIdRef.current = '';
      toast.warning('Bác sĩ hiện không còn nhận lịch. Vui lòng chọn bác sĩ khác cùng chuyên khoa.');
    }
  }, [doctors, followUpRecord, toast]);

  useEffect(() => {
    setServicePackages([]);
    setShowAllPackages(false);
    
    if (!form.clinicId || !form.specialtyId) return;

    setLoading((current) => ({ ...current, packages: true }));
    api('/service-packages', {
      params: {
        clinicId: form.clinicId,
        specialtyId: form.specialtyId,
        doctorId: form.doctorId || undefined
      }
    })
      .then((payload) => setServicePackages(payload.data || []))
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading((current) => ({ ...current, packages: false })));
  }, [form.clinicId, form.specialtyId, form.doctorId, toast]);


  useEffect(() => {
    if (!pendingPackageIdRef.current || !servicePackages.length) return;

    const packageId = pendingPackageIdRef.current;
    if (servicePackages.some((item) => item._id === packageId)) {
      setForm((current) => ({ ...current, servicePackageId: packageId }));
      pendingPackageIdRef.current = '';
    }
  }, [servicePackages]);

  useEffect(() => {
    setSlots([]);
    setForm((current) => ({ ...current, timeSlot: '' }));
    if (!form.doctorId || !form.date) return;

    loadSlots();
  }, [form.doctorId, form.date, loadSlots]);

  useEffect(() => {
    loadWaitingEntries();
  }, [loadWaitingEntries]);

  useEffect(() => {
    if (!assistantBookingContext) return;
    const symptomReason = cleanDisplayText(assistantBookingContext.symptoms || assistantBookingContext.reason || '');
    if (!symptomReason) return;

    setPatientInfo((current) => {
      if (current.reason.trim()) return current;
      return {
        ...current,
        reason: `Tư vấn triệu chứng AI: ${symptomReason}`.slice(0, 500)
      };
    });
  }, [assistantBookingContext]);

  function updateForm(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'clinicId') {
        next.specialtyId = '';
        next.doctorId = '';
        next.timeSlot = '';
        next.servicePackageId = '';
      } else if (field === 'specialtyId') {
        next.doctorId = '';
        next.timeSlot = '';
        next.servicePackageId = '';
      } else if (field === 'doctorId') {
        next.timeSlot = '';
        next.servicePackageId = '';
      }
      return next;
    });
  }

  function updatePatient(field, value) {
    setPatientInfo((current) => ({ ...current, [field]: value }));
  }

  function toggleSelfPatient(checked) {
    setSelfPatient(checked);
    setPatientInfo((current) => ({
      ...current,
      name: checked ? user?.name || '' : '',
      email: checked ? user?.email || '' : '',
      phone: checked ? user?.phone || '' : '',
      gender: checked ? user?.gender || '' : '',
      dateOfBirth: checked ? user?.dateOfBirth || '' : ''
    }));
  }

  function validate() {
    if (!form.clinicId) return 'Vui lòng chọn cơ sở khám';
    if (!form.specialtyId) return 'Vui lòng chọn chuyên khoa';
    if (!form.doctorId) return 'Vui lòng chọn bác sĩ';
    if (!form.date) return 'Vui lòng chọn ngày khám';
    if (isPastDate(form.date)) return 'Không thể đặt lịch trong quá khứ';
    if (!form.timeSlot) return 'Vui lòng chọn khung giờ khám';
    if (isPastOrCurrentSlot(form.date, form.timeSlot)) return 'Khung giờ này đã qua, vui lòng chọn khung giờ khác';
    if (!patientInfo.name.trim()) return 'Vui lòng nhập họ và tên';
    if (!patientInfo.phone.trim()) return 'Vui lòng nhập số điện thoại';
    if (!patientInfo.reason.trim()) return 'Vui lòng nhập lý do khám';
    if (!patientInfo.confirmed) return 'Vui lòng xác nhận thông tin đặt lịch';
    return '';
  }

  const selectedClinic = clinics.find((clinic) => clinic._id === form.clinicId);
  const selectedSpecialty = specialties.find((specialty) => specialty._id === form.specialtyId);
  const selectedDoctor = doctors.find((doctor) => doctor._id === form.doctorId);
  const selectedPackage = servicePackages.find((item) => item._id === form.servicePackageId);
  const followUpOriginalDate = followUpRecord ? formatSimpleDate(followUpRecord.appointmentId?.date || followUpRecord.createdAt) : '';
  const followUpRecommendedDate = formatSimpleDate(followUpRecord?.followUpDate);
  const followUpDoctorLocked = Boolean(followUpRecord && getId(followUpRecord.doctorId) && !followUpDoctorUnavailable);
  const followUpRecommendedDateNoSlots = Boolean(
    followUpRecord &&
    followUpRecommendedDate &&
    form.date === followUpRecommendedDate &&
    form.doctorId &&
    !loading.slots &&
    !slots.length
  );
  const displayedPackages = showAllPackages ? servicePackages : servicePackages.slice(0, 3);
  const canSubmitMainSteps = Boolean(form.clinicId && form.specialtyId && form.doctorId && form.date && form.timeSlot);
  const showStickyAction = Boolean(form.doctorId && form.date && form.timeSlot);

  function waitingEntryForSlot(timeSlot) {
    return waitingEntries.find((entry) => (
      getId(entry.doctorId) === form.doctorId &&
      entry.date === form.date &&
      entry.timeSlot === timeSlot &&
      ['waiting', 'offered', 'accepted'].includes(entry.status)
    ));
  }

  function canJoinWaitingList(slot) {
    if (typeof slot.canJoinWaitingList === 'boolean') {
      return (
        slot.canJoinWaitingList &&
        !slot.available &&
        Boolean(form.doctorId && form.date) &&
        !isPastDate(form.date) &&
        !isPastOrCurrentSlot(form.date, slot.timeSlot)
      );
    }

    const label = normalizeText(slot.label);
    return (
      !slot.available &&
      Boolean(form.doctorId && form.date) &&
      !isPastDate(form.date) &&
      !isPastOrCurrentSlot(form.date, slot.timeSlot) &&
      label.includes('dat')
    );
  }

  async function joinWaitingList(slot) {
    if (!user) {
      toast.warning('Vui lòng đăng nhập để tham gia danh sách chờ');
      const returnUrl = `${location.pathname}${location.search}`;
      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (normalizeText(user.role) !== 'patient') {
      toast.warning('Chỉ tài khoản bệnh nhân có thể tham gia danh sách chờ');
      return;
    }

    setJoiningSlot(slot.timeSlot);
    try {
      const payload = await api('/waiting-list', {
        method: 'POST',
        body: JSON.stringify({
          clinicId: form.clinicId,
          specialtyId: form.specialtyId,
          doctorId: form.doctorId,
          date: form.date,
          timeSlot: slot.timeSlot
        })
      });
      setWaitingEntries((current) => [payload.data, ...current]);
      toast.success('Đã thêm vào danh sách chờ');
      await Promise.all([loadSlots(), loadWaitingEntries()]);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setJoiningSlot('');
    }
  }

  async function submit(event) {
    event.preventDefault();
    const validationMessage = validate();
    if (validationMessage) {
      toast.warning(validationMessage);
      return;
    }

    if (!user) {
      toast.warning('Vui lòng đăng nhập để đặt lịch khám');
      const returnUrl = `${location.pathname}${location.search}`;
      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setLoading((current) => ({ ...current, submit: true }));
    try {
      await api('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          clinicId: form.clinicId,
          specialtyId: form.specialtyId,
          doctorId: form.doctorId,
          date: form.date,
          timeSlot: form.timeSlot,
          servicePackageId: form.servicePackageId || undefined,
          followUpRecordId: followUpRecord?._id || undefined,
          reason: patientInfo.reason.trim(),
          patientInfo: {
            name: patientInfo.name.trim(),
            email: patientInfo.email.trim(),
            phone: patientInfo.phone.trim(),
            gender: patientInfo.gender,
            dateOfBirth: patientInfo.dateOfBirth
          }
        })
      });
      toast.success('Đặt lịch thành công');
      navigate('/appointments/my');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading((current) => ({ ...current, submit: false }));
    }
  }

  return (
    <main className={`section-band booking-page ${showStickyAction ? 'has-booking-sticky' : ''}`}>
      <div className="container">
        <section className="booking-hero-banner" aria-labelledby="booking-page-title">
          <img src="/banner-dang-ky-kham.webp" alt="" aria-hidden="true" />
          <div className="booking-hero-content">
            <span className="eyebrow">Đặt lịch khám</span>
            <h1 id="booking-page-title">Đặt lịch hẹn nhanh</h1>
            <p>Chọn cơ sở, chuyên khoa, bác sĩ và khung giờ phù hợp trong một form.</p>
            <Link className="booking-ai-helper-link" to="/symptom-checker">
              Chưa biết nên khám khoa nào? Thử tư vấn triệu chứng
            </Link>
          </div>
        </section>

        {assistantBookingContext && (
          <div className="booking-ai-context-banner">
            <span className="booking-ai-context-icon">AI</span>
            <div>
              <strong>
                Đang đặt lịch theo gợi ý {cleanDisplayText(assistantBookingContext.specialtyName || selectedSpecialty?.name || 'chuyên khoa phù hợp')}
              </strong>
              <p>
                {assistantBookingContext.clinicName
                  ? `Cơ sở gợi ý: ${cleanDisplayText(assistantBookingContext.clinicName)}. `
                  : ''}
                {cleanDisplayText(assistantBookingContext.reason || assistantBookingContext.summary || 'Bạn có thể chọn bác sĩ và khung giờ phù hợp để được thăm khám trực tiếp.')}
              </p>
            </div>
            <Link to="/symptom-checker">Quay lại tư vấn</Link>
          </div>
        )}

        {followUpRecord && (
          <div className="booking-follow-up-banner">
            <span className="booking-follow-up-icon">↻</span>
            <div>
              <strong>Đặt lịch tái khám theo hồ sơ đã tạo</strong>
              <p>
                {followUpRecord.followUpDate
                  ? `Hệ thống đã điền sẵn bác sĩ, chuyên khoa và ngày tái khám khuyến nghị ${formatSimpleDate(followUpRecord.followUpDate)}. Bạn vẫn có thể chọn khung giờ phù hợp trước khi xác nhận.`
                  : 'Hệ thống đã điền sẵn bác sĩ và chuyên khoa từ hồ sơ khám. Bác sĩ chưa chỉ định ngày cụ thể, bạn có thể chọn ngày và khung giờ phù hợp.'}
              </p>
              {followUpDoctorUnavailable && (
                <p className="booking-follow-up-warning">
                  Bác sĩ hiện không còn nhận lịch. Vui lòng chọn bác sĩ khác cùng chuyên khoa.
                </p>
              )}
            </div>
          </div>
        )}

        <form className="booking-layout" onSubmit={submit}>
          <div className="booking-main-stack">
            <section className="booking-step-card">
              <div className="booking-step-header">
                <span>01</span>
                <div>
                  <h2>Chọn cơ sở và chuyên khoa</h2>
                  <p>Chọn nơi khám và chuyên khoa phù hợp với nhu cầu của bạn.</p>
                </div>
              </div>
              <div className="booking-step-grid two-columns">
                <label>
                  <span>Cơ sở/phòng khám</span>
                  <select
                    className="form-select"
                    value={form.clinicId}
                    disabled={Boolean(followUpRecord)}
                    onChange={(event) => updateForm('clinicId', event.target.value)}
                  >
                    <option value="">{loading.clinics ? 'Đang tải...' : 'Chọn cơ sở'}</option>
                    {clinics.map((clinic) => <option key={clinic._id} value={clinic._id}>{clinic.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>Chuyên khoa</span>
                  <select
                    className="form-select"
                    value={form.specialtyId}
                    disabled={!form.clinicId || Boolean(followUpRecord)}
                    onChange={(event) => updateForm('specialtyId', event.target.value)}
                  >
                    <option value="">{loading.specialties ? 'Đang tải...' : 'Chọn chuyên khoa'}</option>
                    {specialties.map((specialty) => <option key={specialty._id} value={specialty._id}>{specialty.name}</option>)}
                  </select>
                </label>
              </div>
              {followUpRecord && (
                <p className="booking-field-helper">
                  Cơ sở và chuyên khoa được giữ theo hồ sơ khám gốc để lịch tái khám không bị tách khỏi quá trình điều trị.
                </p>
              )}
              <div className="booking-ai-row">
                <span>🤖 Chưa biết nên chọn chuyên khoa?</span>
                <Link to="/symptom-checker">Thử tư vấn triệu chứng AI</Link>
              </div>
            </section>

            <section className="booking-step-card">
              <div className="booking-step-header">
                <span>02</span>
                <div>
                  <h2>Chọn bác sĩ và ngày khám</h2>
                  <p>Sau khi chọn bác sĩ, hệ thống sẽ tải khung giờ còn trống.</p>
                </div>
              </div>
              <div className="booking-step-grid two-columns">
                <label>
                  <span>Bác sĩ</span>
                  <select
                    className="form-select"
                    value={form.doctorId}
                    disabled={!form.specialtyId || followUpDoctorLocked}
                    onChange={(event) => updateForm('doctorId', event.target.value)}
                  >
                    <option value="">{loading.doctors ? 'Đang tải...' : 'Chọn bác sĩ'}</option>
                    {doctors.map((doctor) => <option key={doctor._id} value={doctor._id}>{doctor.name} - {getName(doctor.specialtyId)}</option>)}
                  </select>
                  {followUpDoctorLocked && (
                    <em className="booking-field-helper">Bác sĩ tái khám được giữ theo hồ sơ gốc trong giai đoạn này.</em>
                  )}
                  {followUpDoctorUnavailable && (
                    <em className="booking-field-helper warning">Bác sĩ hiện không còn nhận lịch. Vui lòng chọn bác sĩ khác cùng chuyên khoa.</em>
                  )}
                </label>
                <label>
                  <span>Ngày khám</span>
                  <input
                    className="form-control"
                    min={today}
                    type="date"
                    value={form.date}
                    onChange={(event) => updateForm('date', event.target.value)}
                  />
                </label>
              </div>
            </section>

            <section className="booking-step-card">
              <div className="booking-step-header">
                <span>03</span>
                <div>
                  <h2>Chọn khung giờ</h2>
                  <p>Chọn một khung giờ còn trống hoặc tham gia danh sách chờ nếu slot đã đầy.</p>
                </div>
              </div>
              <div className="slot-grid booking-slot-grid">
                {loading.slots && <span className="text-secondary">Đang tải khung giờ...</span>}
                {!loading.slots && slots.map((slot) => {
                  const waitingEntry = waitingEntryForSlot(slot.timeSlot);
                  const showWaitingAction = canJoinWaitingList(slot);

                  if (slot.available) {
                    return (
                      <button
                        className={`slot-button slot-available ${form.timeSlot === slot.timeSlot ? 'slot-selected' : ''}`}
                        key={slot.timeSlot}
                        type="button"
                        onClick={() => updateForm('timeSlot', slot.timeSlot)}
                      >
                        <strong>{slot.timeSlot}</strong>
                        <span>{slot.label || 'Còn trống'}</span>
                      </button>
                    );
                  }

                  return (
                    <div className="slot-button slot-booked booking-waiting-slot-card" key={slot.timeSlot}>
                      <strong>{slot.timeSlot}</strong>
                      <span>{slot.label || 'Đã có người đặt'}</span>
                      {showWaitingAction && (
                        waitingEntry ? (
                          <span className="waiting-slot-position">Đang chờ (#{waitingEntry.position})</span>
                        ) : (
                          <button
                            className="waiting-slot-action"
                            disabled={joiningSlot === slot.timeSlot}
                            type="button"
                            onClick={() => joinWaitingList(slot)}
                          >
                            {joiningSlot === slot.timeSlot ? 'Đang thêm...' : 'Tham gia danh sách chờ'}
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
                {!loading.slots && form.doctorId && !slots.length && (
                  <span className={followUpRecommendedDateNoSlots ? 'booking-inline-warning' : 'text-secondary'}>
                    {followUpRecommendedDateNoSlots
                      ? 'Ngày tái khám khuyến nghị hiện chưa có khung giờ trống. Bạn có thể chọn ngày khác, hệ thống vẫn giữ bác sĩ và chuyên khoa tái khám.'
                      : 'Không có khung giờ khám.'}
                  </span>
                )}
                {!form.doctorId && <span className="text-secondary">Vui lòng chọn bác sĩ để xem khung giờ.</span>}
              </div>
            </section>

            <section className="booking-step-card booking-service-package-section">
              <div className="booking-step-header">
                <span>04</span>
                <div>
                  <div className="booking-step-title-row">
                    <h2>Dịch vụ gợi ý</h2>
                    <span className="booking-optional-badge">Không bắt buộc</span>
                  </div>
                  <p>Nếu chưa chắc nên chọn dịch vụ nào, bạn có thể để bác sĩ tư vấn khi thăm khám.</p>
                </div>
              </div>
              <div className="service-package-picker compact">
                <ServicePackageCard
                  fallback
                  recommended
                  item={{
                    name: 'Để bác sĩ tư vấn',
                    description: 'Bác sĩ sẽ đánh giá tình trạng và tư vấn dịch vụ phù hợp khi thăm khám.'
                  }}
                  selected={!form.servicePackageId}
                  onSelect={() => updateForm('servicePackageId', '')}
                />
                {loading.packages && <span className="booking-inline-note">Đang tải gói khám...</span>}
                {!loading.packages && displayedPackages.map((item) => (
                  <ServicePackageCard
                    item={item}
                    key={item._id}
                    selected={form.servicePackageId === item._id}
                    onSelect={() => updateForm('servicePackageId', item._id)}
                  />
                ))}
                {!loading.packages && servicePackages.length > 3 && (
                  <button className="booking-show-more-packages" type="button" onClick={() => setShowAllPackages((current) => !current)}>
                    {showAllPackages ? 'Thu gọn gói khám' : `Xem thêm ${servicePackages.length - 3} gói khám`}
                  </button>
                )}
                {!loading.packages && form.clinicId && form.specialtyId && !servicePackages.length && (
                  <span className="booking-inline-note">Chưa có gói khám áp dụng. Bạn vẫn có thể đặt lịch để bác sĩ tư vấn.</span>
                )}
                {!form.specialtyId && <span className="booking-inline-note">Chọn cơ sở và chuyên khoa để xem dịch vụ gợi ý.</span>}
              </div>
            </section>

            <section className="booking-step-card">
              <div className="booking-step-header">
                <span>05</span>
                <div>
                  <h2>Thông tin bệnh nhân</h2>
                  <p>Thông tin này giúp phòng khám liên hệ và chuẩn bị trước khi bạn đến khám.</p>
                </div>
              </div>
              <div className="patient-self-checkbox">
                <input
                  type="checkbox"
                  checked={selfPatient}
                  onChange={(event) => toggleSelfPatient(event.target.checked)}
                />
                <span>Tôi là người đi khám</span>
              </div>
              <div className="booking-step-grid two-columns">
                <label>
                  <span>Họ và tên</span>
                  <input className="form-control" value={patientInfo.name} onChange={(event) => updatePatient('name', event.target.value)} />
                </label>
                <label>
                  <span>Email</span>
                  <input className="form-control" type="email" value={patientInfo.email} onChange={(event) => updatePatient('email', event.target.value)} />
                </label>
                <label>
                  <span>Số điện thoại</span>
                  <input className="form-control" value={patientInfo.phone} onChange={(event) => updatePatient('phone', event.target.value)} />
                </label>
                <div className="booking-mini-grid">
                  <label>
                    <span>Giới tính</span>
                    <select className="form-select" value={patientInfo.gender} onChange={(event) => updatePatient('gender', event.target.value)}>
                      <option value="">Chọn</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </label>
                  <label>
                    <span>Ngày sinh</span>
                    <input className="form-control" type="date" value={patientInfo.dateOfBirth} onChange={(event) => updatePatient('dateOfBirth', event.target.value)} />
                  </label>
                </div>
              </div>
            </section>

            <section className="booking-step-card">
              <div className="booking-step-header">
                <span>06</span>
                <div>
                  <h2>Lý do khám</h2>
                  <p>Mô tả ngắn triệu chứng để bác sĩ nắm thông tin ban đầu.</p>
                </div>
              </div>
              <label className="booking-reason-field">
                <span>Lý do khám</span>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Ví dụ: Tôi bị đau họng 3 ngày, sốt nhẹ..."
                  value={patientInfo.reason}
                  onChange={(event) => updatePatient('reason', event.target.value)}
                />
              </label>
              <label className="booking-confirm-check">
                <input className="form-check-input" type="checkbox" checked={patientInfo.confirmed} onChange={(event) => updatePatient('confirmed', event.target.checked)} />
                <span>Tôi xác nhận thông tin đặt lịch là chính xác</span>
              </label>
            </section>

            <section className="booking-step-card booking-summary-section">
              <div className="booking-step-header">
                <span>07</span>
                <div>
                  <h2>Tóm tắt lịch hẹn</h2>
                  <p>Kiểm tra lại thông tin trước khi xác nhận đặt lịch.</p>
                </div>
              </div>
              <dl className="booking-summary-list">
                <div>
                  <dt>Cơ sở</dt>
                  <dd>{selectedClinic?.name || 'Chưa chọn'}</dd>
                </div>
                <div>
                  <dt>Chuyên khoa</dt>
                  <dd>{selectedSpecialty?.name || 'Chưa chọn'}</dd>
                </div>
                <div>
                  <dt>Bác sĩ</dt>
                  <dd>{selectedDoctor?.name || 'Chưa chọn'}</dd>
                </div>
                <div>
                  <dt>Ngày</dt>
                  <dd>{form.date || 'Chưa chọn'}</dd>
                </div>
                <div>
                  <dt>Giờ</dt>
                  <dd>{form.timeSlot || 'Chưa chọn'}</dd>
                </div>
                <div>
                  <dt>Dịch vụ</dt>
                  <dd>
                    {selectedPackage ? (
                      <>
                        <strong>{cleanDisplayText(selectedPackage.name, 'Gói khám')}</strong>
                        <span>{formatCurrency(selectedPackage.price)}</span>
                      </>
                    ) : (
                      <>
                        <strong>Để bác sĩ tư vấn</strong>
                        <span>Không bắt buộc chọn gói trước</span>
                      </>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Thanh toán</dt>
                  <dd>Tại phòng khám</dd>
                </div>
                {followUpRecord && (
                  <div>
                    <dt>Loại lịch</dt>
                    <dd>
                      <strong>Lịch tái khám</strong>
                      <span>Theo hồ sơ khám ngày {followUpOriginalDate || 'đã tạo'}</span>
                      <span>
                        {followUpRecommendedDate
                          ? `Ngày khuyến nghị: ${followUpRecommendedDate}`
                          : 'Bác sĩ chưa chỉ định ngày cụ thể'}
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
              <button className="booking-summary-submit" type="submit" disabled={loading.submit || !canSubmitMainSteps}>
                {loading.submit ? 'Đang đặt lịch...' : 'Xác nhận đặt lịch'}
              </button>
              {!canSubmitMainSteps && (
                <p className="booking-summary-hint">Vui lòng chọn đủ cơ sở, chuyên khoa, bác sĩ, ngày và khung giờ.</p>
              )}
            </section>
          </div>

          {showStickyAction && (
            <div className="booking-sticky-action" aria-label="Xác nhận nhanh lịch hẹn">
              <div className="booking-sticky-info">
                <strong>{form.timeSlot}</strong>
                <span>{form.date} · {selectedDoctor?.name || 'Bác sĩ'}</span>
              </div>
              <button className="booking-sticky-submit" type="submit" disabled={loading.submit || !canSubmitMainSteps}>
                {loading.submit ? 'Đang đặt...' : 'Xác nhận đặt lịch'}
              </button>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
