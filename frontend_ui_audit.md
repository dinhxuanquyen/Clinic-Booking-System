# Frontend UI Audit - Clinic Booking

Ngày audit: 2026-07-19  
Phạm vi: `frontend/src` và `frontend/src/styles/app.css`  
Trạng thái runtime: không kiểm tra được trên browser vì `npm run dev` bị sandbox chặn với lỗi `EPERM: operation not permitted, lstat 'C:\Users\DELL'`. Audit dưới đây dựa trên đọc cấu trúc route, JSX components/pages và CSS toàn cục. Không sửa code production trong bước này.

## 1. Tổng Quan Tình Trạng UI Hiện Tại

Frontend đã có nhiều nỗ lực polish UI, đặc biệt ở public pages, hồ sơ bệnh nhân, lịch hẹn, dashboard bác sĩ và admin dashboard. Dự án có design token trong `frontend/src/styles/app.css`, có `BaseModal`, `EmptyState`, skeleton, toast, các nhóm component riêng cho appointment và medical record.

Tuy nhiên UI hiện đang phát triển theo nhiều lớp chồng lên nhau:

- `app.css` đã hơn 36k dòng, chứa nhiều cụm "final polish", "repair", override Bootstrap và nhiều rule có `!important`.
- Có ít nhất 4 hệ UI cùng tồn tại: public marketing-like pages, patient portal (`pa-*`, `phr-*`), admin tables/forms, doctor portal.
- Nhiều component đã có abstraction nhưng chưa được dùng đều: empty/loading/error/pagination/filter/modal/status badge/table.
- Scroll behavior là rủi ro lớn nhất: doctor portal khóa scroll document, admin/doctor main tự scroll, modal lại khóa body, mobile có thêm `overflow-x: hidden !important`.
- Một số trang vẫn mang Bootstrap mặc định rõ rệt (`AuthPage`, `ForgotPasswordPage`, `ChangeInitialPasswordPage`, `StaffToday`, vài alert/table/form trong admin/doctor).

Kết luận: UI chưa cần rewrite toàn bộ, nhưng cần chuẩn hóa hệ component và giảm CSS drift trước khi polish tiếp. Nếu tiếp tục vá từng page, rủi ro regress responsive/scroll/modal sẽ tăng.

## 2. Danh Sách Page / Layout / Component Đã Kiểm Tra

### Layout Dùng Chung

- `frontend/src/App.jsx`
- `frontend/src/components/PublicLayout.jsx`
- `frontend/src/components/ManagementLayout.jsx`
- `frontend/src/components/Navbar.jsx`
- `frontend/src/components/Footer.jsx`
- `frontend/src/components/AdminLayout.jsx`
- `frontend/src/components/DoctorLayout.jsx`
- `frontend/src/components/ProtectedRoute.jsx`
- `frontend/src/components/ScrollToTop.jsx`
- `frontend/src/components/BackToTop.jsx`
- `frontend/src/components/PageTransition.jsx`

### Shared Components

- `BaseModal.jsx`
- `EmptyState.jsx`
- `PageSkeleton.jsx`
- `SkeletonCard.jsx`
- `ToastContext.jsx`
- `NotificationBell.jsx`
- `UserMenu.jsx`
- `ChangePasswordModal.jsx`
- `PasswordPolicyMeter.jsx`
- `DoctorCard.jsx`
- `ReviewDoctorModal.jsx`
- `AppointmentDetailModal.jsx`
- `MedicalRecordModal.jsx`
- `MedicalRecordDetailModal.jsx`
- `components/icons/FaIcons.jsx`

### Patient / Public Pages

- `HomePage.jsx`
- `BookingPage.jsx`
- `ClinicsPage.jsx`
- `ClinicDetail.jsx`
- `DoctorsPage.jsx`
- `DoctorDetail.jsx`
- `SpecialtiesPage.jsx`
- `SpecialtyDetailPage.jsx`
- `PackagesPage.jsx`
- `PackageDetailPage.jsx`
- `ArticlesPage.jsx`
- `ArticleDetailPage.jsx`
- `SymptomCheckerPage.jsx`
- `MyAppointments.jsx`
- `MedicalRecordsPage.jsx`
- `ProfilePage.jsx`

### Auth Pages

- `AuthPage.jsx`
- `ForgotPasswordPage.jsx`
- `ChangeInitialPasswordPage.jsx`

### Admin Pages

- `AdminDashboard.jsx`
- `admin/AdminDashboardPage.jsx`
- `admin/AdminAppointmentsPage.jsx`
- `admin/AdminClinicsPage.jsx`
- `admin/AdminDoctorsPage.jsx`
- `admin/AdminSchedulesPage.jsx`
- `admin/AdminServicePackagesPage.jsx`
- `admin/AdminSpecialtiesPage.jsx`
- `admin/AdminArticlesPage.jsx`
- `admin/AdminAuditLogsPage.jsx`
- `admin/adminUtils.jsx`

### Doctor / Staff Pages

- `DoctorDashboardPage.jsx`
- `DoctorAppointmentsPage.jsx`
- `DoctorQueuePage.jsx`
- `DoctorSchedulesPage.jsx`
- `DoctorMedicalRecordsPage.jsx`
- `DoctorArticlesPage.jsx`
- `DoctorReviewsPage.jsx`
- `DoctorProfilePage.jsx`
- `DoctorServicePackagesPage.jsx`
- `StaffToday.jsx`

### Appointment Components

- `AppointmentActions.jsx`
- `AppointmentCard.jsx`
- `AppointmentDoctorInfo.jsx`
- `AppointmentEmptyState.jsx`
- `AppointmentErrorState.jsx`
- `AppointmentFilters.jsx`
- `AppointmentGroup.jsx`
- `AppointmentLoadingState.jsx`
- `AppointmentPageHeader.jsx`
- `AppointmentProgress.jsx`
- `AppointmentStatusBadge.jsx`
- `AppointmentSummaryBar.jsx`
- `AppointmentTabs.jsx`
- `UpcomingAppointmentHero.jsx`
- `WaitingListCard.jsx`

### Medical Record Components

- `AttachmentSection.jsx`
- `ClinicalJourney.jsx`
- `DiagnosisHighlight.jsx`
- `DoctorProfileBlock.jsx`
- `FollowUpAlert.jsx`
- `FollowUpPlanCard.jsx`
- `HealthRecordPageHeader.jsx`
- `HealthSummaryBar.jsx`
- `MedicalRecordCard.jsx`
- `MedicalRecordFilters.jsx`
- `MedicalRecordGroup.jsx`
- `MedicalRecordModalHeader.jsx`
- `MedicalRecordSectionNav.jsx`
- `MedicalRecordsErrorState.jsx`
- `MedicalRecordsLoadingState.jsx`
- `PrescriptionSection.jsx`
- `RecordDoctorInfo.jsx`
- `RecordEmptyState.jsx`
- `RecordOverviewGrid.jsx`
- `RecordStatusBadge.jsx`
- `VitalsGrid.jsx`

## 3. Vấn Đề Được Phát Hiện

### Critical

#### CR-01 - Scroll lock của doctor portal có nguy cơ tạo double scrollbar hoặc khóa scroll sai khi mở modal

- Priority: Critical
- Category: Scroll / Overflow, Responsive, UX
- Files: `DoctorLayout.jsx`, `BaseModal.jsx`, `app.css`
- Evidence: `DoctorLayout.jsx` thêm class `doctor-portal-open` vào `html` và `body`; `app.css` có cụm "Final doctor scroll repair" quanh line 35092 khóa `html/body/#root`, ép `.doctor-main` thành scrollbar duy nhất; `BaseModal.jsx` cũng khóa `body.modal-open`.
- Impact: Khi mở modal trong doctor/admin area, scroll container chính, sidebar và body đều có rule lock khác nhau. Rất dễ xuất hiện trạng thái không cuộn được, double scrollbar, modal nội dung dài bị cắt, hoặc scroll position bị reset ngoài ý muốn.
- Recommendation: Thiết kế lại scroll model: mỗi portal chỉ có một scroll root; modal lock chỉ tác động document, không override sidebar/main bằng nhiều rule `!important`.

#### CR-02 - CSS cascade quá lớn và nhiều lớp "repair/final polish" làm UI khó dự đoán

- Priority: Critical
- Category: Bootstrap styling, Component consistency, Responsive
- Files: `app.css`
- Evidence: `app.css` hơn 36k dòng, nhiều section lặp cho doctor/articles/packages, nhiều override cuối file như `RESPONSIVE LAYOUT FIXES`, `Final doctor scroll repair`, nhiều `!important`.
- Impact: Một thay đổi nhỏ ở cuối file có thể thay đổi nhiều page không liên quan. Debug responsive, z-index, modal và overflow sẽ rất tốn thời gian.
- Recommendation: Tách CSS theo layer: tokens/base, layout, components, pages, overrides. Đặt quy tắc không thêm "final polish" mới nếu chưa loại bỏ rule cũ.

#### CR-03 - Mobile overflow đang bị che bằng `overflow-x: hidden !important`

- Priority: Critical
- Category: Responsive, Scroll / Overflow
- Files: `app.css`
- Evidence: cuối file có rule mobile ép `html, body`, `.app-shell`, `.public-page-frame`, `.container`, `.container-fluid` `overflow-x: hidden !important` và `width: 100vw !important`.
- Impact: Có thể che lỗi layout thật thay vì sửa nguyên nhân. Trên mobile, nội dung/CTA/table/modal có thể bị cắt mà người dùng không thấy thanh cuộn ngang.
- Recommendation: Audit bằng browser từng breakpoint, gỡ dần rule che lỗi, thay bằng `minmax(0, 1fr)`, `max-width: 100%`, table/card responsive có chủ đích.

### High

#### H-01 - Admin và doctor dùng chung style/table/modal nhưng khác semantics và layout

- Priority: High
- Category: Component consistency, Bootstrap styling
- Files: `AdminLayout.jsx`, `DoctorLayout.jsx`, `DoctorAppointmentsPage.jsx`, `DoctorMedicalRecordsPage.jsx`, `DoctorSchedulesPage.jsx`, admin pages
- Evidence: Doctor pages dùng nhiều class `admin-table`, `admin-modal`, `management-panel`; admin pages dùng `AdminEmptyState`, `AdminPagination`, `ConfirmDialog`.
- Impact: Khó tạo visual identity riêng cho doctor portal; sửa admin table có thể ảnh hưởng doctor table.
- Recommendation: Chuẩn hóa `DataTable`, `ManagementPanel`, `PortalModal`, sau đó truyền variant `admin|doctor`.

#### H-02 - Có nhiều hệ empty state cùng tồn tại

- Priority: High
- Category: Component consistency, UX
- Files: `EmptyState.jsx`, `adminUtils.jsx`, `AppointmentEmptyState.jsx`, `RecordEmptyState.jsx`, nhiều page public tự viết `.empty-state`, `.admin-empty-state`, `.specialty-empty-state`, `.specialty-empty-card`
- Impact: Empty state khác tone, icon, spacing, CTA và accessibility giữa các luồng.
- Recommendation: Dùng một `EmptyState` chung có variants: `patient`, `admin`, `doctor`, `compact`, `table`.

#### H-03 - Loading state không đồng nhất

- Priority: High
- Category: UX, Component consistency
- Files: `App.jsx`, `PageSkeleton.jsx`, `SkeletonCard.jsx`, `AppointmentLoadingState.jsx`, `MedicalRecordsLoadingState.jsx`, admin pages
- Evidence: App fallback là Bootstrap spinner full viewport; public pages dùng skeleton grid; patient appointment/medical record dùng skeleton riêng; admin dùng text "Đang tải...".
- Impact: Cảm nhận polish không đều, đặc biệt khi chuyển giữa public page và management page.
- Recommendation: Chuẩn hóa `PageLoading`, `SectionLoading`, `TableLoading`, `CardSkeleton`.

#### H-04 - Modal system tốt nhưng bị phân mảnh bởi quá nhiều modal class riêng

- Priority: High
- Category: Component consistency, Responsive, Accessibility
- Files: `BaseModal.jsx`, `AppointmentDetailModal.jsx`, `MedicalRecordModal.jsx`, `MedicalRecordDetailModal.jsx`, `ReviewDoctorModal.jsx`, admin pages
- Evidence: Dù dùng `BaseModal`, mỗi modal tự dựng header/body/footer và CSS riêng: `admin-modal`, `change-password-dialog`, `review-doctor-dialog`, `medical-record-modal`, `appointment-reschedule-modal`, `doctor-schedule-exception-modal`.
- Impact: Mobile modal, close button, footer action, focus target, scroll body khó đồng nhất.
- Recommendation: Chuẩn hóa `ModalShell`, `ModalHeader`, `ModalBody`, `ModalFooter`, `ModalCloseButton`.

#### H-05 - Button patterns không thống nhất

- Priority: High
- Category: Component consistency, UX, Accessibility
- Files: toàn bộ pages/components
- Evidence: Có `.btn`, `.booking-summary-submit`, `.booking-sticky-submit`, `.sc-submit-btn`, `.sc-book-btn`, `.empty-state-cta`, `.mobile-drawer-cta-btn`, `.doctor-clear-filter`, `.doctor-pagination-*`.
- Impact: Hover/focus/disabled/loading không đồng đều; người dùng khó nhận biết primary action khi button không cùng ngôn ngữ thị giác.
- Recommendation: Tạo button abstraction hoặc ít nhất token/class contract cho `primary`, `secondary`, `ghost`, `danger`, `link`, `icon`, `loading`.

#### H-06 - Table trên màn hình nhỏ có rủi ro cao

- Priority: High
- Category: Responsive, Layout, UX
- Files: admin pages, `DoctorAppointmentsPage.jsx`, `DoctorMedicalRecordsPage.jsx`, `DoctorSchedulesPage.jsx`, `MyAppointments.jsx`, `StaffToday.jsx`, `PrescriptionSection.jsx`
- Evidence: Nhiều table Bootstrap (`table table-hover align-middle admin-table`) trong card; responsive chủ yếu dựa vào wrapper/overflow CSS. Một số table dùng `table-layout: fixed`.
- Impact: Trên mobile, bảng dễ bị scroll ngang trong nested card hoặc nội dung bị ellipsis quá mức.
- Recommendation: Với mobile, chuyển bảng quản trị chính sang card rows hoặc data-list; chỉ giữ horizontal scroll cho bảng phụ/chi tiết.

#### H-07 - Visual hierarchy của BookingPage quá dày và nhiều card liên tiếp

- Priority: High
- Category: Layout, UX, Spacing
- Files: `BookingPage.jsx`
- Evidence: Form đặt lịch là chuỗi nhiều `booking-step-card`, thêm sticky submit, service package picker, slot grid, follow-up banner, summary card.
- Impact: Người dùng phải đọc nhiều khối cùng trọng lượng thị giác; primary next action không nổi bật ở từng bước, đặc biệt mobile.
- Recommendation: Chia thành stepper thật hoặc progressive disclosure; chỉ giữ summary/sticky CTA khi đủ điều kiện.

#### H-08 - Admin CRUD pages có form/filter/table pattern lặp nhưng chưa thống nhất

- Priority: High
- Category: Component consistency, Spacing, UX
- Files: `AdminClinicsPage.jsx`, `AdminDoctorsPage.jsx`, `AdminSpecialtiesPage.jsx`, `AdminSchedulesPage.jsx`, `AdminServicePackagesPage.jsx`, `AdminArticlesPage.jsx`
- Evidence: Mỗi page tự dựng toolbar/filter/form sections/modal footer; `AdminArticlesPage` là form inline trong page, còn entities khác là modal CRUD.
- Impact: Admin phải học lại cấu trúc thao tác giữa các module.
- Recommendation: Tạo chuẩn `CrudPageLayout`, `FilterBar`, `EntityFormSection`, `EntityTableToolbar`.

#### H-09 - Z-index và fixed/sticky elements có nhiều cấp rời rạc

- Priority: High
- Category: Scroll / Overflow, UX
- Files: `Navbar.jsx`, `NotificationBell.jsx`, `BackToTop.jsx`, `BookingPage.jsx`, `BaseModal.jsx`, `app.css`
- Evidence: modal z-index 1060, notification/dropdown cao hơn, mobile drawer 3000, toast 9999, booking sticky action 1040, navbar sticky.
- Impact: Có nguy cơ dropdown/toast/modal/sticky CTA che nhau sai thứ tự.
- Recommendation: Tạo z-index scale duy nhất: navbar, sticky action, drawer, modal backdrop, modal, toast.

#### H-10 - Auth pages vẫn còn cảm giác Bootstrap mặc định

- Priority: High
- Category: Bootstrap styling, Typography, UX
- Files: `AuthPage.jsx`, `ForgotPasswordPage.jsx`, `ChangeInitialPasswordPage.jsx`
- Evidence: `container py-5 auth-page`, `h3 mt-2`, `alert alert-danger`, `form-control mb-3`, `btn w-100`.
- Impact: Trải nghiệm đăng nhập/đăng ký là điểm chạm quan trọng nhưng kém polished hơn public pages.
- Recommendation: Redesign auth shell cùng brand, consistent error/success/OTP state, password helper và CTA hierarchy.

### Medium

#### M-01 - Typography hierarchy không thống nhất giữa public, patient, admin, doctor

- Priority: Medium
- Category: Typography
- Files: nhiều pages, `app.css`
- Evidence: Trộn Bootstrap heading utilities (`h2`, `h3`, `h5`, `text-secondary small`) với custom classes (`doctor-page-title`, `pa-eyebrow`, `phr-eyebrow`, `section-eyebrow`, `eyebrow`).
- Recommendation: Định nghĩa heading scale cho page title, section title, card title, label, helper text.

#### M-02 - Spacing scale bị trộn giữa Bootstrap utilities và custom CSS

- Priority: Medium
- Category: Spacing
- Files: toàn bộ
- Evidence: Dùng `mt-2`, `mb-4`, `gap-3`, `py-5` xen với custom `gap: 22px`, `padding: 26px 28px`, `clamp(...)`.
- Recommendation: Chọn spacing scale 4/8px và mapping utility hoặc component classes.

#### M-03 - Card/border/shadow bị lạm dụng ở public pages

- Priority: Medium
- Category: Layout, Bootstrap styling
- Files: `HomePage.jsx`, `DoctorsPage.jsx`, `DoctorDetail.jsx`, `PackagesPage.jsx`, `ArticleDetailPage.jsx`, `SpecialtyDetailPage.jsx`
- Evidence: Hero, filters, cards, panels, sidebars, CTA đều có border radius/shadow.
- Recommendation: Giảm card quanh section lớn; dùng full-width bands/unframed layout cho section, cards chỉ cho repeated items.

#### M-04 - Search/filter patterns thiếu chuẩn chung

- Priority: Medium
- Category: Component consistency, UX
- Files: `ClinicsPage.jsx`, `DoctorsPage.jsx`, `SpecialtiesPage.jsx`, `PackagesPage.jsx`, `MyAppointments.jsx`, `MedicalRecordsPage.jsx`, admin pages, doctor pages
- Evidence: Search có input group Bootstrap, custom search box, premium filter panel, admin toolbar, doctor filter card.
- Recommendation: Tạo `SearchField`, `FilterBar`, `FilterChips`, `ResetFiltersButton`.

#### M-05 - Badge/status system bị phân mảnh

- Priority: Medium
- Category: Component consistency
- Files: `utils/status.js`, `AppointmentStatusBadge.jsx`, `RecordStatusBadge.jsx`, admin table status badges, `StaffToday.jsx`
- Evidence: Có `badge-status`, `pa-status-badge`, `phr-status-badge`, Bootstrap `.badge`.
- Recommendation: Một `StatusBadge` dùng chung nhận domain `appointment|record|schedule|package`.

#### M-06 - Error state không đồng nhất

- Priority: Medium
- Category: UX, Component consistency, Accessibility
- Files: auth pages, admin pages, public pages, appointment/medical record components
- Evidence: Có Bootstrap alert, `AdminAlert`, `AppointmentErrorState`, `MedicalRecordsErrorState`, inline warning text.
- Recommendation: Chuẩn hóa `InlineAlert`, `PageError`, `FieldError`, với role/status rõ ràng.

#### M-07 - Success state và toast còn lệ thuộc Bootstrap color

- Priority: Medium
- Category: UX, Bootstrap styling
- Files: `ToastContext.jsx`, `DoctorDetail.jsx`, admin pages
- Evidence: Toast dùng `text-bg-success/danger/warning/primary`; một số page dùng `alert alert-success`.
- Recommendation: Style toast theo design token, thêm icon/title/action nếu cần.

#### M-08 - Pagination có nhiều kiểu

- Priority: Medium
- Category: Component consistency
- Files: `adminUtils.jsx`, `DoctorsPage.jsx`, `MyAppointments.jsx`, `DoctorReviewsPage.jsx`, `AdminAuditLogsPage.jsx`
- Evidence: `AdminPagination`, `doctor-pagination`, `pa-pagination`, `rv-pagination`.
- Recommendation: Một `Pagination` chung có variants `compact`, `numbered`, `simple`.

#### M-09 - Navbar public nhiều item, có nguy cơ quá tải tablet

- Priority: Medium
- Category: Responsive, UX
- Files: `Navbar.jsx`
- Evidence: Public nav gồm Cơ sở, Chuyên khoa, Tìm bác sĩ, Gói khám, Cẩm nang, Tư vấn triệu chứng, Lịch hẹn của tôi, CTA, notification/user/guest actions.
- Recommendation: Xác định breakpoint rõ cho desktop/tablet, gom secondary links vào menu trước khi wrap hoặc overflow.

#### M-10 - Mobile drawer có overlay riêng nhưng chưa thấy focus trap

- Priority: Medium
- Category: Accessibility, UX
- Files: `Navbar.jsx`
- Evidence: Mobile drawer set `aria-modal="true"` và `role="dialog"`, body class lock, Escape close, nhưng không có focus trap/restore như `BaseModal`.
- Recommendation: Dùng cùng modal/focus utility hoặc thêm trap focus và restore focus.

#### M-11 - Form field variants quá nhiều

- Priority: Medium
- Category: Component consistency, Typography
- Files: `BookingPage.jsx`, `ProfilePage.jsx`, `MedicalRecordModal.jsx`, admin forms, `SymptomCheckerPage.jsx`
- Evidence: Bootstrap `.form-control`, custom `.sc-input`, `.booking-reason-field`, `.medical-record-field`, `.profile-edit-form`.
- Recommendation: Chuẩn hóa `Field`, `SelectField`, `TextareaField`, `CheckboxField`, `SwitchField`.

#### M-12 - Inline styles xuất hiện trong UI components

- Priority: Medium
- Category: Component consistency, Maintainability
- Files: `SkeletonCard.jsx`, `AdminAuditLogsPage.jsx`, `MedicalRecordModal.jsx`, `ClinicsPage.jsx`
- Evidence: Inline `style={{ maxWidth: 440 }}`, skeleton dimensions, `<pre>` style, gridTemplateColumns inline.
- Recommendation: Chuyển những style lặp/semantic sang class hoặc component props có token.

#### M-13 - Footer visual density cao

- Priority: Medium
- Category: Layout, Typography
- Files: `Footer.jsx`
- Evidence: Footer có 4 cột, trust list, hotline chips, legal links. Có thể ổn desktop nhưng cần kiểm tra mobile wrap.
- Recommendation: Trên mobile ưu tiên accordion/collapsed sections hoặc rút bớt trust chips.

#### M-14 - AppointmentDetailModal quá lớn và là mini-app trong modal

- Priority: Medium
- Category: UX, Layout, Responsive
- Files: `AppointmentDetailModal.jsx`
- Evidence: file hơn 1200 dòng, nhiều section, live status, document center, action panel, progress, request cards.
- Recommendation: Trên mobile cân nhắc chuyển sang full-screen detail page hoặc modal fullscreen với section nav ổn định.

#### M-15 - Medical record modal/detail có hai hệ layout khác nhau

- Priority: Medium
- Category: Component consistency
- Files: `MedicalRecordModal.jsx`, `MedicalRecordDetailModal.jsx`, `components/medical-records/*`
- Evidence: Patient record detail dùng `phr-*`; doctor create/edit modal dùng `medical-record-*` và Bootstrap utilities.
- Recommendation: Tách domain record UI thành shared components dùng cho patient view và doctor edit mode.

#### M-16 - StaffToday là trang cũ/Bootstrap rõ nhất

- Priority: Medium
- Category: Bootstrap styling, UX
- Files: `StaffToday.jsx`
- Evidence: `container py-4`, row/col Bootstrap, table Bootstrap, badge Bootstrap.
- Recommendation: Nếu page còn dùng, đưa vào management layout hoặc thay bằng `DoctorQueuePage`/admin queue pattern.

### Low

#### L-01 - Icon system trộn FontAwesome wrapper và emoji

- Priority: Low
- Category: Component consistency
- Files: `Navbar.jsx`, `Footer.jsx`, `HomePage.jsx`, `EmptyState.jsx`, `NotificationBell.jsx`, `SymptomCheckerPage.jsx`
- Recommendation: Chọn icon strategy nhất quán: FontAwesome wrapper hiện có hoặc emoji chỉ cho empty/illustrative states.

#### L-02 - Một số legal/footer links không phải link thật

- Priority: Low
- Category: UX, Accessibility
- Files: `Footer.jsx`
- Evidence: "Chính sách bảo mật", "Điều khoản sử dụng", "Quy chế hoạt động" là `<span>`.
- Recommendation: Dùng link hoặc ẩn nếu chưa có route.

#### L-03 - Page heading dùng `h1` trong sidebar layout chưa nhất quán

- Priority: Low
- Category: Typography, Accessibility
- Files: `AdminLayout.jsx`, `DoctorLayout.jsx`
- Evidence: Sidebar title là `h1`, page content cũng có page title.
- Recommendation: Sidebar brand nên là div/strong; mỗi page giữ một `h1` chính.

#### L-04 - Một số action labels chưa rõ trạng thái loading

- Priority: Low
- Category: UX
- Files: admin forms, doctor forms, appointment actions
- Recommendation: Button loading nên luôn đổi label + spinner nhỏ + `aria-busy`.

#### L-05 - Color palette có xu hướng sky/teal lặp lại nhiều

- Priority: Low
- Category: Bootstrap styling, Visual hierarchy
- Files: `app.css`
- Recommendation: Dùng semantic colors có chọn lọc; giữ public pages sáng nhưng admin/doctor nên trung tính hơn.

#### L-06 - Các chip/filter dùng uppercase/letter spacing không đồng nhất

- Priority: Low
- Category: Typography
- Files: `app.css`, nhiều pages
- Recommendation: Chuẩn hóa eyebrow/chip label style.

#### L-07 - Một số alert dùng text thuần không có icon/title

- Priority: Low
- Category: UX, Accessibility
- Files: public/admin/auth pages
- Recommendation: Tạo alert component có icon, title optional, close/action optional.

#### L-08 - `PageSkeleton` minHeight inline theo prop có thể tạo khoảng trắng thừa

- Priority: Low
- Category: Layout
- Files: `PageSkeleton.jsx`, public detail pages
- Recommendation: Dùng variant theo context thay vì hardcode nhiều `minHeight`.

## 4. Component Bị Trùng Lặp Có Thể Chuẩn Hóa

- Empty state: `EmptyState`, `AdminEmptyState`, `AppointmentEmptyState`, `RecordEmptyState`, inline public empty blocks.
- Loading state: `PageSkeleton`, `SkeletonCard`, appointment loading, medical record loading, admin text loading.
- Error/success alert: Bootstrap alerts, `AdminAlert`, custom patient/doctor error components.
- Pagination: `AdminPagination`, `doctor-pagination`, `pa-pagination`, `rv-pagination`.
- Table/list: admin table, doctor table, StaffToday table, prescription table, appointment table/list variants.
- Modal shell: many `BaseModal` consumers with custom header/body/footer.
- Filter/search: admin toolbars, patient filters, doctor filter cards, public directory search boxes.
- Status badge: `badge-status`, `pa-status-badge`, `phr-status-badge`, Bootstrap `.badge`, admin status badges.
- Buttons: Bootstrap `.btn`, booking custom submit, symptom checker custom buttons, drawer CTA, empty state CTA.
- Card/panel: `admin-table-card`, `doctor-content-card`, `management-panel`, `booking-step-card`, `profile-details-card`, public cards.
- Form field: Bootstrap fields plus custom field wrappers in booking/profile/admin/doctor/symptom checker.

## 5. Pattern Giao Diện Nên Được Thống Nhất

1. Page shell: public, patient portal, admin portal, doctor portal.
2. Page header: eyebrow, title, subtitle, primary action, secondary actions.
3. Filter bar: search, selects, date range, reset, active filter summary.
4. Data table responsive: desktop table, mobile card-list, empty/loading/error slots.
5. Modal shell: header/body/footer, close affordance, mobile fullscreen option.
6. Form sections: field grid, required marker, helper text, validation error.
7. Status badge: appointment, follow-up, record, package, account, schedule.
8. CTA hierarchy: primary action, secondary action, destructive action, link action.
9. Loading/error/empty states: consistent icon, text, action, role/aria.
10. Scroll model: document scroll for public, single internal scroll for management, modal scroll isolated.

## 6. Trang Cần Redesign Nhiều Nhất

1. `BookingPage.jsx` - quá nhiều step card và sticky CTA; cần flow đặt lịch rõ hơn.
2. `AuthPage.jsx`, `ForgotPasswordPage.jsx`, `ChangeInitialPasswordPage.jsx` - điểm chạm quan trọng nhưng còn Bootstrap/default.
3. `DoctorAppointmentsPage.jsx` - nhiều filter/table/action/modal, dùng admin pattern trong doctor context.
4. `DoctorMedicalRecordsPage.jsx` - filter/table/modal/detail nhiều lớp; cần chuẩn record workflow.
5. `AdminDoctorsPage.jsx` - form/modal lớn, nhiều section, account linking/reset/detail/delete.
6. `AdminDashboardPage.jsx` - giàu dữ liệu nhưng cần hierarchy và density strategy ổn định.
7. `AppointmentDetailModal.jsx` - modal quá lớn; cần xem xét detail page/fullscreen modal.
8. `StaffToday.jsx` - nếu còn dùng, cần đưa vào design system hiện tại.

## 7. Trang Chỉ Cần Polish Nhẹ

- `HomePage.jsx` - visual đã khá hoàn thiện; cần giảm emoji/card density nếu muốn chuyên nghiệp hơn.
- `ClinicsPage.jsx` - cần chuẩn hóa empty/search và bỏ inline width.
- `DoctorsPage.jsx` - đã có layout tốt; cần kiểm tra tablet/sidebar/search/pagination.
- `SpecialtiesPage.jsx` và `SpecialtyDetailPage.jsx` - polish empty/filter/card consistency.
- `PackagesPage.jsx` và `PackageDetailPage.jsx` - polish card/action consistency và giảm card nesting.
- `ArticlesPage.jsx` và `ArticleDetailPage.jsx` - cần loại bớt CSS override lặp ở cuối file.
- `ProfilePage.jsx` - polish form/insurance section, loading/error states.
- `MedicalRecordsPage.jsx` - component hóa tốt; cần align badge/loading/filter với appointment.
- `DoctorDashboardPage.jsx` - đã có polish; cần kiểm tra responsive KPI grid.
- `DoctorReviewsPage.jsx` - polish pagination/filter và empty states.
- `DoctorServicePackagesPage.jsx` - đơn giản, chỉ cần align table/card.

## 8. Đề Xuất Thứ Tự Ưu Tiên Cải Thiện UI

1. Khóa lại design contract: tokens, spacing scale, typography scale, z-index scale, scroll model.
2. Tách `app.css` theo layer hoặc ít nhất gom các cụm override cuối file vào section có ownership rõ.
3. Chuẩn hóa shared primitives: Button, Field, Alert, EmptyState, Loading, StatusBadge, Pagination.
4. Chuẩn hóa Modal shell và mobile modal behavior.
5. Chuẩn hóa DataTable/List responsive cho admin/doctor/patient.
6. Sửa scroll/overflow ở doctor/admin portal và modal trước khi redesign page lớn.
7. Redesign auth pages để nâng chất lượng điểm vào hệ thống.
8. Redesign booking flow theo stepper/progressive disclosure.
9. Chuẩn hóa admin CRUD pages.
10. Chuẩn hóa doctor workflows: appointments, records, schedules.
11. Polish public directory/detail pages.
12. Chạy visual QA browser trên desktop 1366, tablet 768, mobile 390/360 khi môi trường cho phép.

## 9. Thống Kê Issue

- Critical: 3
- High: 10
- Medium: 16
- Low: 8
- Tổng số vấn đề ghi nhận: 37

## 10. Ghi Chú Kiểm Tra Runtime

Đã thử chạy:

```text
npm run dev -- --host 127.0.0.1 --port 5177
```

Kết quả: thất bại do sandbox/Node permission:

```text
EPERM: operation not permitted, lstat 'C:\Users\DELL'
```

Vì vậy các vấn đề double scrollbar, horizontal overflow, sticky/fixed overlap, modal mobile và nội dung bị che được đánh giá theo code/CSS risk, chưa xác minh bằng screenshot thực tế trong browser ở bước này.
