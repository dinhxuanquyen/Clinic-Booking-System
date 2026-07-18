import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import DoctorLayout from './components/DoctorLayout.jsx';
import ManagementLayout from './components/ManagementLayout.jsx';
import PublicLayout from './components/PublicLayout.jsx';

// ---- Lazy load Pages ----
// Public Pages
const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const BookingPage = lazy(() => import('./pages/BookingPage.jsx'));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage.jsx'));
const ArticleDetailPage = lazy(() => import('./pages/ArticleDetailPage.jsx'));
const PackagesPage = lazy(() => import('./pages/PackagesPage.jsx'));
const PackageDetailPage = lazy(() => import('./pages/PackageDetailPage.jsx'));
const SymptomCheckerPage = lazy(() => import('./pages/SymptomCheckerPage.jsx'));
const ClinicsPage = lazy(() => import('./pages/ClinicsPage.jsx'));
const ClinicDetail = lazy(() => import('./pages/ClinicDetail.jsx'));
const DoctorsPage = lazy(() => import('./pages/DoctorsPage.jsx'));
const DoctorDetail = lazy(() => import('./pages/DoctorDetail.jsx'));
const SpecialtiesPage = lazy(() => import('./pages/SpecialtiesPage.jsx'));
const SpecialtyDetailPage = lazy(() => import('./pages/SpecialtyDetailPage.jsx'));
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.jsx'));
const ChangeInitialPasswordPage = lazy(() => import('./pages/ChangeInitialPasswordPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const MyAppointments = lazy(() => import('./pages/MyAppointments.jsx'));
const MedicalRecordsPage = lazy(() => import('./pages/MedicalRecordsPage.jsx'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));
const AdminAppointmentsPage = lazy(() => import('./pages/admin/AdminAppointmentsPage.jsx'));
const AdminClinicsPage = lazy(() => import('./pages/admin/AdminClinicsPage.jsx'));
const AdminDoctorsPage = lazy(() => import('./pages/admin/AdminDoctorsPage.jsx'));
const AdminAuditLogsPage = lazy(() => import('./pages/admin/AdminAuditLogsPage.jsx'));
const AdminArticlesPage = lazy(() => import('./pages/admin/AdminArticlesPage.jsx'));
const AdminSchedulesPage = lazy(() => import('./pages/admin/AdminSchedulesPage.jsx'));
const AdminServicePackagesPage = lazy(() => import('./pages/admin/AdminServicePackagesPage.jsx'));
const AdminSpecialtiesPage = lazy(() => import('./pages/admin/AdminSpecialtiesPage.jsx'));

// Doctor Pages
const DoctorAppointmentsPage = lazy(() => import('./pages/DoctorAppointmentsPage.jsx'));
const DoctorArticlesPage = lazy(() => import('./pages/DoctorArticlesPage.jsx'));
const DoctorDashboardPage = lazy(() => import('./pages/DoctorDashboardPage.jsx'));
const DoctorMedicalRecordsPage = lazy(() => import('./pages/DoctorMedicalRecordsPage.jsx'));
const DoctorProfilePage = lazy(() => import('./pages/DoctorProfilePage.jsx'));
const DoctorQueuePage = lazy(() => import('./pages/DoctorQueuePage.jsx'));
const DoctorReviewsPage = lazy(() => import('./pages/DoctorReviewsPage.jsx'));
const DoctorSchedulesPage = lazy(() => import('./pages/DoctorSchedulesPage.jsx'));
const DoctorServicePackagesPage = lazy(() => import('./pages/DoctorServicePackagesPage.jsx'));

// A simple global loading fallback
const PageLoadingFallback = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', width: '100vw' }}>
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

function ProfileRouteByRole() {
  const { user } = useAuth();
  if (user?.role?.toLowerCase() === 'doctor') {
    return <Navigate to="/doctor/profile" replace />;
  }
  return <ProfilePage />;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/articles" element={<ArticlesPage />} />
          <Route path="/articles/:slug" element={<ArticleDetailPage />} />
          <Route path="/packages" element={<PackagesPage />} />
          <Route path="/packages/:id" element={<PackageDetailPage />} />
          <Route path="/symptom-checker" element={<SymptomCheckerPage />} />
          <Route path="/clinics" element={<ClinicsPage />} />
          <Route path="/clinics/:clinicId" element={<ClinicDetail />} />
          <Route path="/clinics/:clinicId/doctors/:doctorId" element={<DoctorDetail />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/doctors/:doctorId" element={<DoctorDetail />} />
          <Route path="/specialties" element={<SpecialtiesPage />} />
          <Route path="/specialties/:specialtyId" element={<SpecialtyDetailPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/change-password-first-login"
            element={
              <ProtectedRoute>
                <ChangeInitialPasswordPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileRouteByRole />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-appointments"
            element={
              <ProtectedRoute roles={['patient']}>
                <MyAppointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments/my"
            element={
              <ProtectedRoute roles={['patient']}>
                <MyAppointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/medical-records"
            element={
              <ProtectedRoute roles={['patient']}>
                <MedicalRecordsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route element={<ManagementLayout />}>
          <Route
            path="/staff"
            element={
              <ProtectedRoute roles={['doctor', 'admin']}>
                <DoctorQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor"
            element={
              <ProtectedRoute roles={['doctor']}>
                <DoctorLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DoctorDashboardPage />} />
            <Route path="queue" element={<DoctorQueuePage />} />
            <Route path="schedules" element={<DoctorSchedulesPage />} />
            <Route path="appointments" element={<DoctorAppointmentsPage />} />
            <Route path="medical-records" element={<DoctorMedicalRecordsPage />} />
            <Route path="articles" element={<DoctorArticlesPage />} />
            <Route path="reviews" element={<DoctorReviewsPage />} />
            <Route path="service-packages" element={<DoctorServicePackagesPage />} />
            <Route path="profile" element={<DoctorProfilePage />} />
          </Route>
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminLayout>
                  <AdminAuditLogsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="clinics" element={<AdminClinicsPage />} />
            <Route path="specialties" element={<AdminSpecialtiesPage />} />
            <Route path="doctors" element={<AdminDoctorsPage />} />
            <Route path="articles" element={<AdminArticlesPage />} />
            <Route path="service-packages" element={<AdminServicePackagesPage />} />
            <Route path="schedules" element={<AdminSchedulesPage />} />
            <Route path="queue" element={<DoctorQueuePage />} />
            <Route path="appointments" element={<AdminAppointmentsPage />} />
            <Route path="audit-logs" element={<AdminAuditLogsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
