import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MedicalRecordDetailModal from '../components/MedicalRecordDetailModal.jsx';
import FollowUpAlert from '../components/medical-records/FollowUpAlert.jsx';
import HealthRecordPageHeader from '../components/medical-records/HealthRecordPageHeader.jsx';
import HealthSummaryBar from '../components/medical-records/HealthSummaryBar.jsx';
import MedicalRecordFilters from '../components/medical-records/MedicalRecordFilters.jsx';
import MedicalRecordsErrorState from '../components/medical-records/MedicalRecordsErrorState.jsx';
import MedicalRecordsLoadingState from '../components/medical-records/MedicalRecordsLoadingState.jsx';
import MedicalRecordGroup from '../components/medical-records/MedicalRecordGroup.jsx';
import RecordEmptyState from '../components/medical-records/RecordEmptyState.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { connectSocket, getSocket } from '../services/socket.js';
import { getToken } from '../utils/auth.js';
import { downloadMedicalRecordPdf } from '../utils/medicalRecordPdf.js';
import {
  displayName,
  examDate,
  followUpBookingUrl,
  latestExamDate
} from '../utils/medicalRecordView.js';

const FILTER_TABS = [
  { key: 'all', label: 'Tất cả hồ sơ' },
  { key: 'needs_follow_up', label: 'Cần tái khám' },
  { key: 'completed_follow_up', label: 'Đã hoàn thành tái khám' },
  { key: 'overdue', label: 'Quá hạn' }
];

function recordMatchesTab(record, tab) {
  if (tab === 'needs_follow_up') {
    return record.followUpRequired && ['recommended', 'cancelled', undefined, ''].includes(record.followUpStatus || 'recommended');
  }
  if (tab === 'completed_follow_up') return record.followUpStatus === 'completed';
  if (tab === 'overdue') return record.followUpStatus === 'overdue';
  return true;
}

function buildSearchText(record) {
  return [
    record.diagnosis,
    record.conclusion,
    record.symptoms,
    displayName(record.doctorId, ''),
    displayName(record.specialtyId, ''),
    displayName(record.clinicId, '')
  ].join(' ').toLowerCase();
}

function recordYear(record) {
  const date = new Date(examDate(record));
  return Number.isNaN(date.getTime()) ? '' : String(date.getFullYear());
}

export default function MedicalRecordsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [followUpRecords, setFollowUpRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recordsLoaded, setRecordsLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [queryHandled, setQueryHandled] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [year, setYear] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const recordsTopRef = useRef(null);

  const loadRecords = useCallback(() => {
    setLoading(true);
    setRecordsLoaded(false);
    setLoadError('');
    return Promise.all([
      api('/medical-records/my'),
      api('/medical-records/follow-ups/my')
    ])
      .then(([recordsPayload, followUpPayload]) => {
        setRecords(recordsPayload.data || []);
        setFollowUpRecords(followUpPayload.data || []);
        setLoadError('');
      })
      .catch(() => {
        setLoadError('Không thể tải hồ sơ khám bệnh. Vui lòng thử lại.');
        toast.error('Không thể tải hồ sơ khám bệnh. Vui lòng thử lại.');
      })
      .finally(() => {
        setLoading(false);
        setRecordsLoaded(true);
      });
  }, [toast]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    const socket = getSocket() || connectSocket(getToken());
    if (!socket) return undefined;

    function refreshMedicalRecords() {
      setQueryHandled('');
      loadRecords().catch(() => {});
    }

    socket.on('medical-record:created', refreshMedicalRecords);
    socket.on('medical-record:updated', refreshMedicalRecords);
    socket.on('follow-up:updated', refreshMedicalRecords);
    socket.on('appointment:updated', refreshMedicalRecords);
    return () => {
      socket.off('medical-record:created', refreshMedicalRecords);
      socket.off('medical-record:updated', refreshMedicalRecords);
      socket.off('follow-up:updated', refreshMedicalRecords);
      socket.off('appointment:updated', refreshMedicalRecords);
    };
  }, [loadRecords]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const recordId = params.get('recordId');
    const appointmentId = params.get('appointmentId');
    const tab = params.get('tab');
    if (tab === 'follow-ups') setActiveTab('needs_follow_up');

    const queryKey = recordId ? `record:${recordId}` : appointmentId ? `appointment:${appointmentId}` : '';
    if (!queryKey || loading || !recordsLoaded || queryHandled === queryKey) return;

    const record = records.find((item) => {
      if (recordId) return String(item._id) === String(recordId);
      const recordAppointmentId = item.appointmentId?._id || item.appointmentId;
      return String(recordAppointmentId) === String(appointmentId);
    });

    setQueryHandled(queryKey);
    if (record) setSelected(record);
    else toast.warning('Không tìm thấy hồ sơ khám bệnh');
  }, [loading, location.search, queryHandled, records, recordsLoaded, toast]);

  const metrics = useMemo(() => {
    const currentYear = String(new Date().getFullYear());
    return {
      total: records.length,
      thisYear: records.filter((record) => recordYear(record) === currentYear).length,
      needsFollowUp: records.filter((record) => recordMatchesTab(record, 'needs_follow_up')).length,
      completedFollowUp: records.filter((record) => record.followUpStatus === 'completed').length
    };
  }, [records]);

  const tabCounts = useMemo(() => FILTER_TABS.reduce((result, tab) => {
    result[tab.key] = records.filter((record) => recordMatchesTab(record, tab.key)).length;
    return result;
  }, {}), [records]);

  const specialties = useMemo(
    () => Array.from(new Set(records.map((record) => displayName(record.specialtyId, '')).filter(Boolean))).sort(),
    [records]
  );
  const years = useMemo(
    () => Array.from(new Set(records.map(recordYear).filter(Boolean))).sort((a, b) => Number(b) - Number(a)),
    [records]
  );

  const filterActive = Boolean(search.trim() || specialty !== 'all' || year !== 'all');
  const initialLoading = loading && !recordsLoaded && records.length === 0;
  const showLoadError = Boolean(loadError && !loading && records.length === 0);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records
      .filter((record) => recordMatchesTab(record, activeTab))
      .filter((record) => (query ? buildSearchText(record).includes(query) : true))
      .filter((record) => (specialty === 'all' ? true : displayName(record.specialtyId, '') === specialty))
      .filter((record) => (year === 'all' ? true : recordYear(record) === year))
      .sort((a, b) => {
        const left = new Date(examDate(a)).getTime() || 0;
        const right = new Date(examDate(b)).getTime() || 0;
        return sortOrder === 'oldest' ? left - right : right - left;
      });
  }, [activeTab, records, search, sortOrder, specialty, year]);

  async function handleDownloadPdf(record) {
    try {
      await downloadMedicalRecordPdf(record._id);
    } catch (error) {
      toast.error(error.message || 'Không tải được PDF');
    }
  }

  function resetFilters() {
    setSearch('');
    setSpecialty('all');
    setYear('all');
  }

  function showFollowUps() {
    setActiveTab('needs_follow_up');
    window.requestAnimationFrame(() => {
      recordsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <main className="section-band patient-health-record-page pa-page">
      <div className="container pa-container phr-container">
        {initialLoading ? (
          <MedicalRecordsLoadingState />
        ) : (
          <>
            <HealthRecordPageHeader patientName={user?.name} latestDate={latestExamDate(records)} />

            <HealthSummaryBar metrics={metrics} />

            {!loading && !showLoadError && (
              <FollowUpAlert
                records={followUpRecords}
                onBook={(record) => navigate(followUpBookingUrl(record))}
                onOpenRecord={setSelected}
                onViewAll={showFollowUps}
              />
            )}
          </>
        )}

        {!initialLoading && (
          <section className="phr-workspace" ref={recordsTopRef}>
            {showLoadError ? (
              <MedicalRecordsErrorState onRetry={loadRecords} />
            ) : (
              <MedicalRecordFilters
                activeTab={activeTab}
                filterActive={filterActive}
                onReset={resetFilters}
                onSearchChange={setSearch}
                onSortChange={setSortOrder}
                onSpecialtyChange={setSpecialty}
                onTabChange={setActiveTab}
                onYearChange={setYear}
                search={search}
                sortOrder={sortOrder}
                specialties={specialties}
                specialty={specialty}
                tabCounts={tabCounts}
                tabs={FILTER_TABS}
                year={year}
                years={years}
              />
            )}

            {showLoadError ? null : loading && !records.length ? (
              <MedicalRecordsLoadingState />
            ) : filteredRecords.length ? (
              <MedicalRecordGroup records={filteredRecords} onOpen={setSelected} onDownload={handleDownloadPdf} />
            ) : (
              <RecordEmptyState
                filtered={filterActive || activeTab !== 'all'}
                onBook={() => navigate('/booking')}
                onReset={resetFilters}
              />
            )}
          </section>
        )}

        <MedicalRecordDetailModal record={selected} onClose={() => setSelected(null)} />
      </div>
    </main>
  );
}
