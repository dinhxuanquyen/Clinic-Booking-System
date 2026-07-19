# CSS Architecture Audit - Clinic Booking

Ngày audit: 2026-07-19  
Phạm vi: `frontend/src/styles/app.css`, `frontend_ui_audit.md`, `docs/frontend-design-guidelines.md`, và các layout scroll chính: `PublicLayout.jsx`, `ManagementLayout.jsx`, `AdminLayout.jsx`, `DoctorLayout.jsx`, `BaseModal.jsx`.

Không sửa production code trong task này.

## 1. Executive Summary

`frontend/src/styles/app.css` hiện là một stylesheet đơn khối 36.266 dòng. File này đang chứa tất cả: design tokens, reset/base, Bootstrap overrides, shared components, layout shell, public pages, patient portal, admin portal, doctor portal, modal fixes, responsive fixes, và nhiều lớp "final polish"/"repair" được append theo thời gian.

Các con số chính từ static analysis toàn bộ file:

| Metric | Value |
| --- | ---: |
| Total lines | 36.266 |
| Selector entries ước tính | 7.078 |
| Unique selectors ước tính | 4.719 |
| Duplicate selector groups | 1.328 |
| Duplicate CSS block groups | 80 |
| `!important` usages | 1.101 |
| `@media` usages | 175 |
| `@keyframes` usages | 21 |
| `overflow*` mentions | 331 |
| `position: fixed` | 21 |
| `position: sticky` | 37 |
| `height/min-height/max-height: 100vh` related | 7 direct `height: 100vh`, 2 `min-height: 100vh`, 71 `calc(100vh...)` |
| `100dvh` usages | 9 |
| `width/max-width: 100vw` related | 9 |
| Bootstrap selector mentions | 477 |

The main architecture risk is not any single CSS rule. It is the accumulated cascade model:

- Same selectors are defined repeatedly in far apart sections.
- Similar breakpoints are duplicated with slightly different values: `575.98`, `576`, `640`, `760`, `767`, `767.98`, `768`, `991.98`, `992`, `1024`.
- Scroll ownership is split between `body`, route shells, portal main containers, sidebars, modal backdrops, and body classes such as `doctor-portal-open`, `modal-open`, `mobile-drawer-open`.
- Large page-specific repair blocks are appended after earlier component styles, forcing high specificity and many `!important` rules.

Before any UI refactor, the CSS needs an ownership map and staged migration plan. A mass refactor would be risky because many current layouts rely on late-file overrides to remain usable.

## 2. Kiến Trúc CSS Hiện Tại

### 2.1 Current Single-File Layers

Observed high-level layers in `app.css`:

| Approx. Lines | Current Content | Notes |
| --- | --- | --- |
| 1-108 | Design tokens and global base | `:root`, palette, semantic colors, radius, shadows, `body` base |
| 109-618 | Doctor dashboard appears before global component systems | Page-specific CSS is placed before typography/buttons/modal primitives |
| 619-1269 | Typography, badge, button, skeleton, empty state, modal, form controls | Core shared component layer exists but is embedded in the monolith |
| 1270-3369 | Assorted shared/admin/dashboard/timeline/public components | Mixed domain styles |
| 3370-4299 | Admin dashboard / management UI | Operational dashboard styling |
| 4302-4447 | Doctor area layout lock | First major doctor layout definition |
| 4448-4554 | Public route shell and page skeleton | Public shell lives mid-file |
| 4555-15831 | Admin pages, public pages, doctor detail, queue, auth/modals, mixed overrides | Multiple page and component concerns interleaved |
| 15832-16200 | Responsive/public/mobile/table/modal adjustments | Broad layout overrides and mobile adjustments |
| 16200-22684 | Toasts, auth, appointment, package, footer, navbar/drawer multiple passes | Repeated navbar/footer/mobile drawer patterns |
| 22685-23216 | Medical record phase 2 and modal fixes | Explicit "MODAL FIXES (SCROLLING ISSUE)" |
| 23217-25765 | Articles, specialties, public polish | Public page-specific blocks |
| 25766-32073 | Patient detail pages, doctor appointments, patient health records, appointment center, admin schedules | Large patient/doctor/admin domains mixed |
| 32074-32839 | Admin service package modal final overrides and layout repairs | High specificity and `nth-child` grid repairs |
| 32840-34707 | Public service package catalog/detail multiple passes | Several competing package visual systems |
| 34708-35091 | Targeted modal repair: package/reschedule/doctor schedule exception | Explicit repair block with many `!important` rules |
| 35092-35210 | Final doctor scroll repair | Document/body/root/main/sidebar scroll lock |
| 35211-36223 | Public doctor/article final polish and responsive layout fixes | Late overrides for public doctor/article pages and mobile overflow |
| 36224-36266 | Frontend design baseline added previously | Global resilience/focus baseline |

### 2.2 Current CSS Categories

#### Design Tokens

Present at top-level `:root`:

- Colors: primary, semantic colors, status badge colors, gray scale.
- Radius: `--radius-xs` through `--radius-full`.
- Shadows: `--shadow-xs` through `--shadow-2xl`.
- Backward-compatible aliases: `--brand-blue`, `--ink`, `--muted`, etc.

Risk: tokens are present, but later page CSS still contains many hard-coded colors, shadows, radii, and gradients.

#### Global/Base

Present:

- Box sizing.
- `body` typography/background.
- `html { scrollbar-gutter: stable; }`
- Later repeated `body`, `html, body`, `html, body, #root` rules.

Risk: global rules are repeated at line clusters around 101, 7648, 20121, 20232, 20851, 35093, 36203. This makes the real base style depend heavily on cascade position and active body classes.

#### Utilities

Present but informal:

- Button size classes (`.btn-lg`, `.btn-sm`, `.btn-xs`, `.btn-icon`).
- Skeleton helpers.
- Status badge classes.
- Some broad resilience rules using `:where(...)`.

Risk: utility-like rules are mixed with page CSS. There is no separate utility layer or naming convention.

#### Shared Components

Present:

- `.btn*`
- `.badge-status*`
- `.empty-state*`
- `.page-skeleton*`
- `.admin-modal*`
- `.form-control`, `.form-select`
- `.notification-*`
- `.user-menu-*`
- `.mobile-drawer*`
- `.back-to-top`

Risk: shared component styles are later overridden by page-specific selectors and Bootstrap-specific selectors.

#### Public Layout

Relevant selectors:

- `.app-shell`
- `.public-main`
- `.public-page-frame`
- `.public-page`
- `.public-navbar*`
- `.compact-footer*`

Risk: public layout has multiple later broad scopes: `.public-main :where(...)`, `.public-main .section-band`, `.public-main .public-page`, and final public doctor/article polish. These can affect many public pages beyond the intended target.

#### Patient UI

Relevant prefixes:

- `pa-*` appointment center.
- `phr-*` patient health records.
- `booking-*` booking page.
- `profile-*`.

Risk: patient UI is partially componentized, but CSS remains global and mixed with public/admin/doctor repairs.

#### Admin UI

Relevant prefixes/selectors:

- `.admin-layout`, `.admin-sidebar`, `.admin-main`, `.admin-content`, `.admin-table-card`, `.admin-table`, `.admin-modal`.
- Page-specific admin blocks: dashboard, doctors, clinics, specialties, schedules, service packages, audit logs.

Risk: doctor pages reuse `admin-table`, `admin-modal`, `management-panel`, so admin CSS is effectively shared management CSS without explicit ownership.

#### Doctor UI

Relevant prefixes/selectors:

- `.doctor-layout`, `.doctor-sidebar`, `.doctor-main`, `.doctor-topbar`, `.doctor-page-container`.
- `.doctor-page-*`, `.doctor-dashboard-*`, `.doctor-appointments-*`, `.doctor-record-*`, `.queue-*`.

Risk: doctor layout selectors are redefined many times and then forcibly repaired with `doctor-portal-open` and `!important`.

#### Auth UI

Relevant selectors:

- `.auth-page`, `.auth-card`, `.forgot-password-card`, password modal/change-password selectors.

Risk: auth UI still depends heavily on Bootstrap utilities and is not isolated from global form/button overrides.

#### Page-Specific CSS

Large page-specific clusters exist for:

- Home.
- Booking.
- Clinics.
- Doctors.
- Doctor detail.
- Specialties.
- Specialty detail.
- Packages/package detail.
- Articles/article detail.
- Symptom checker.
- Admin dashboard.
- Admin CRUD pages.
- Doctor appointment/record/schedule pages.
- Patient appointment/medical record pages.

Risk: page CSS lives in the same global cascade as shared component CSS; late page-specific blocks often override earlier shared blocks.

#### Bootstrap Overrides

Current override targets include:

- `.btn`, `.btn-primary`, `.btn-outline-primary`, `.btn-secondary`, `.btn-danger`, `.btn-success`.
- `.form-control`, `.form-select`, focus styles.
- `.table`, `.table-responsive`, `.table-hover`, `.align-middle`.
- `.container`, `.container-fluid`, `.row`, `[class*="col-"]`.
- `.modal-dialog`, `.modal-lg`, `.modal-xl`, `.alert`, `.toast`.

Risk: Bootstrap utility/class semantics are being changed globally and locally. Some rules target Bootstrap structural classes inside specific modals, e.g. `.service-package-modal .admin-modal-body > .row > [class*="col-"]`.

#### Responsive Overrides

Most frequent media queries:

| Media Query | Count |
| --- | ---: |
| `(max-width: 768px)` | 31 |
| `(max-width: 640px)` | 24 |
| `(max-width: 992px)` | 23 |
| `(max-width: 576px)` | 13 |
| `(max-width: 760px)` | 8 |
| `(max-width: 1024px)` | 7 |
| `(max-width: 575.98px)` | 7 |
| `(max-width: 991.98px)` | 7 |
| `(max-width: 1100px)` | 7 |
| `(max-width: 1180px)` | 6 |

Risk: near-duplicate breakpoints create cascade ambiguity and inconsistent tablet/mobile behavior.

#### Legacy / Repair / Potentially Obsolete CSS

Explicit repair/final/phase markers:

- `doctor-list-card override removed - handled in design system` around line 12811.
- `Final doctor layout override` around line 15191.
- `Doctor area alignment guard` around line 15306.
- `DRAWER & RESPONSIVE OVERFLOW FIXES` around line 20180.
- `MEDICAL RECORD PHASE 2: CLINICAL UI & MODAL FIXES` around line 22686.
- `MODAL FIXES (SCROLLING ISSUE)` around line 22689.
- `Admin service package modal final overrides` around line 32074.
- `Targeted modal repair: package form, patient reschedule, doctor schedule exception` around line 34708.
- `Final doctor scroll repair` around line 35092.
- `Public doctor experience final polish` around line 35211.
- `Public article experience final polish` around line 35612.
- `RESPONSIVE LAYOUT FIXES (Appending for Mobile and Sidebar)` around line 36200.

Risk: these sections likely encode real bug fixes. They should not be deleted or moved blindly.

## 3. Duplicate / Specificity / Override Findings

### 3.1 Duplicate Selectors

High-risk repeated selectors:

| Selector | Count | Line Clusters | Risk |
| --- | ---: | --- | --- |
| `body` | 6 | 101, 7648, 20121, 20232, 20851, 36203 | Global base and overflow rules compete |
| `.doctor-layout .doctor-sidebar` | 6 | 4313, 4410, 15202, 15273, 15318, 15455 | Sidebar scroll/height behavior depends on cascade |
| `.doctor-layout .doctor-main` | 6 | 4328, 4419, 15217, 15282, 15332, 15473 | Main scroll owner is redefined repeatedly |
| `.doctor-layout .doctor-topbar` | 6 | 4337, 4423, 15226, 15286, 15342, 15464 | Sticky/header layout conflicts |
| `.doctor-page-container` | 6 | 4353, 4432, 15242, 15295, 15359, 15478 | Page padding/width changes by breakpoint and cascade |
| `.doctor-page-header` | 8 | 4365, 4436, 11482, 12473, 15254, 15299, 15372, 15482 | Shared doctor header is unstable |
| `.public-navbar-inner` | 9 | 7804, 15844, 16142, 20262, 20507, 20593, 20637, 20653, 20863 | Navbar behavior likely differs by late mobile overrides |
| `.mobile-drawer` | 9 | 7899, 16168, 20206, 20224, 20326, 20479, 20700, 20842, 20944 | Drawer width/height/position repeated |
| `.service-package-modal` | 12 | 17222, 17971, 17999, 18027, 18146, 18183, 32094, 32210, 32247, 32286, 32527, 32558 | Highest risk modal for regression |
| `.public-main .article-detail-page` | 9 | 24303, 35614, 35787, 35903, 35940, 36025, 36122, 36159, 36194 | Article detail has several layout passes |
| `.doctor-specialty-sidebar` | 5 | 8424, 12350, 12643, 21173, 36218 | Public doctor/sidebar behavior may be accidental |
| `.booking-sticky-action` | 2 | 9957, 10129 | Sticky CTA can collide with footer/mobile |
| `.pa-summary-bar` | 2 | 29815, 30553 | Patient appointment summary may have competing layout |

### 3.2 Duplicate CSS Blocks

Static analysis found 80 groups of duplicate CSS blocks. Notable examples:

- `.doctor-page-container { padding: 16px; }` appears 3 times.
- `.doctor-page-container { width: 100%; padding: 32px; box-sizing: border-box; }` appears 3 times.
- `.doctor-layout .doctor-sidebar { position: static; width: 100%; min-width: 0; max-width: none; height: auto; min-height: 0; }` appears 3 times.
- `.doctor-layout .doctor-topbar { position: static; height: auto; min-height: 64px; align-items: flex-start; flex-direction: column; padding: 16px; }` appears 3 times.
- `.service-package-modal > form > .admin-modal-body { padding: 16px 18px 0; }` appears 3 times.
- `.service-package-modal { max-width: calc(100vw - 20px); }` appears 3 times.

These are not necessarily dead code. They may be repeated across media query blocks, but the repetition makes ownership unclear.

### 3.3 `!important` Usage

`!important` appears 1.101 times. Major clusters:

- Service package modal grid and nth-child layout repairs around lines 18050-18060, 32128-32137, 32659-32665, 34833-34844.
- Doctor appointment stat and table/card overrides.
- Modal sizing and footer button repairs.
- Final doctor scroll repair around lines 35099-35207.
- Mobile overflow clamp around lines 36203-36214.

Risk level: High. The count itself is less important than where it appears: layout, scroll, modal, grid, and responsive rules. Those are exactly the areas most sensitive to refactor.

### 3.4 Specificity Conflicts

High-risk specificity patterns:

- Broad scoping selectors:
  - `.public-main :where(...)`
  - `[data-cb-modal="true"] :where(...)`
  - `body.modal-open .doctor-main`
  - `body.doctor-portal-open .doctor-main`
  - `.service-package-modal .admin-modal-body > .row > :nth-child(...)`
- Structural Bootstrap selectors:
  - `.admin-modal > form > .admin-modal-body`
  - `.admin-modal > form > .admin-doctor-modal-body`
  - `.service-package-modal .admin-modal-body > .row > [class*="col-"]`
- Page-specific selectors affecting shared components:
  - `.public-main :where(.btn, button, .article-read-link, .specialty-card-cta)`
  - `.public-main :where(.form-control, .form-select, input, select, textarea)`
  - `.public-main .empty-state, .public-main .medical-record-empty, .public-main .appointments-empty-state`

Interpretation: `:where()` keeps specificity low, but when placed late in the file it still wins by source order. Structural selectors with `nth-child` are brittle because JSX reorder breaks layout.

### 3.5 Bootstrap Override Findings

Global Bootstrap overrides exist for button, form, modal, table, container, toast, alert, row/col. This is acceptable only if they are treated as a Bootstrap adapter layer. Currently they are mixed with page fixes.

Specific concerns:

- `.btn` is globally restyled early and then page-specific buttons bypass it with custom classes (`booking-summary-submit`, `sc-submit-btn`, etc.).
- `.form-control`/`.form-select` are restyled globally, then restyled again inside admin/doctor/service package forms.
- `.table-responsive` appears as broad overflow control and later again in resilience baseline.
- `.container`/`.container-fluid` are targeted in mobile overflow fixes, which can mask width bugs across all public pages.

### 3.6 Page-Specific CSS Mixed With Global CSS

Examples:

- Doctor dashboard starts at line 109 before global button/modal systems.
- Public doctor/article final polish is appended near the end, after patient/admin/doctor sections.
- Package CSS has several generations: professional layout, visual catalog, compact catalog, PhenikaaMEC-like catalog, marketplace refresh, final visual polish.
- Service package modal has at least five redesign/repair passes.

Risk: Page-specific fixes become de facto global source-order dependencies.

### 3.7 Selectors With Broad Blast Radius

Highest blast-radius selectors:

- `html, body`, `html, body, #root`.
- `body.modal-open`.
- `body.modal-open:has(.admin-layout)`.
- `body.doctor-portal-open ...`.
- `.public-main :where(...)`.
- `[data-cb-modal="true"] :where(...)`.
- `.container, .container-fluid`.
- `.table-responsive`.
- `.btn`, `.form-control`, `.form-select`.
- `[class*="-card"]`, `[class*="-panel"]`, `[class*="-tile"]`, `[class*="-item"]` from final baseline.

These should be treated as architecture-level rules, not page-level fixes.

## 4. Scroll Ownership Map

### 4.1 Public Layout

JSX:

- `PublicLayout.jsx` renders `.app-shell`, `Navbar`, `.public-main`, `.public-page-frame`, `Outlet`, `BackToTop`, `Footer`.

CSS evidence:

- `.app-shell` around line 4455 sets route shell min-height.
- `.public-main` around line 4463 sets min-height based on navbar height.
- `.public-main > .public-page-frame` and `.public-page-frame` around lines 4470-4481 set min-height.
- Mobile overflow clamp at lines 36203-36214 sets `html, body` and shell containers to `overflow-x: hidden !important`.

Actual scroll owner:

- Intended: document/body scroll.
- Practical: document/body scroll with public shell min-height; some individual public pages add sticky sidebars or fixed elements.

Risk cases:

- Horizontal overflow may be hidden rather than fixed.
- Sticky elements inside pages can behave differently because parent containers may use `overflow-x: clip/hidden`.
- Footer + page min-height can create excess blank space if route content also uses full viewport assumptions.

### 4.2 Patient Layout

JSX:

- Patient pages are public routes under `PublicLayout`.
- Main patient areas: `BookingPage`, `MyAppointments`, `MedicalRecordsPage`, `ProfilePage`.

CSS evidence:

- Booking sticky CTA `.booking-sticky-action` at lines 9957 and 10129 uses fixed positioning.
- Patient health record modal and page sections have their own scroll/height rules around lines 26788-29406.
- Appointment detail modal `.apd-*` around lines 30707+ has modal body scroll areas.

Actual scroll owner:

- Intended: document/body scroll for page; modal body/backdrop for modal.
- Practical: document/body for pages, fixed/sticky sub-elements for booking and detail flows, modal internal scroll for record/appointment detail.

Risk cases:

- Booking sticky action can overlap content or footer on short/mobile viewports.
- Patient record/appointment modals can create nested scroll inside body lock.
- Table/list areas may horizontally scroll inside cards while body horizontal overflow is hidden.

### 4.3 Admin Layout

JSX:

- `ManagementLayout.jsx` renders `.management-layout`, management `Navbar`, then `AdminLayout`.
- `AdminLayout.jsx` renders `.admin-layout`, `.admin-sidebar`, `.admin-main`, `.admin-topbar`, `.admin-content`.
- `AdminLayout.jsx` manually sets `mainRef.current.scrollTop = 0` on route change.

CSS evidence:

- `.admin-layout` around line 11305 has portal layout dimensions.
- `.admin-sidebar` around line 11323.
- `.admin-main` around line 11361.
- Modal lock affects `.admin-main` around lines 15828 and 35157.
- Final modal lock includes `body.modal-open:has(.admin-layout)` around line 35151.

Actual scroll owner:

- Intended: `.admin-main` scroll owner; sidebar may independently scroll if needed.
- Practical: `.admin-main` is route scroll owner, but body/modal classes can override it; some modals create internal scroll.

Risk cases:

- Modal open sets `.admin-main` and `.admin-sidebar` overflow hidden, which can interact with `BaseModal` body lock.
- If `.admin-main` is not the only scroll owner at a breakpoint, route-change scroll reset may not affect the visible scroll container.
- Wide admin tables inside `.admin-table-card` may create nested horizontal scroll.

### 4.4 Doctor Layout

JSX:

- `DoctorLayout.jsx` adds `doctor-portal-open` to `documentElement` and `body`.
- Renders `.doctor-layout`, `.doctor-sidebar`, `.doctor-main`, `.doctor-topbar`, `.doctor-page-container`.
- `DoctorLayout.jsx` manually sets `mainRef.current.scrollTop = 0` on pathname/search changes.

CSS evidence:

- First doctor layout lock around lines 4302-4447.
- Additional doctor layout overrides around lines 15191-15478.
- Final doctor scroll repair around lines 35092-35210:
  - `html, body, #root { height: 100%; }`
  - `html.doctor-portal-open, body.doctor-portal-open { overflow: hidden !important; }`
  - `body.doctor-portal-open .doctor-layout { height: calc(100vh - 76px) !important; overflow: hidden !important; }`
  - `body.doctor-portal-open .doctor-sidebar { overflow-y: auto !important; }`
  - `body.doctor-portal-open .doctor-main { overflow-y: auto !important; }`
  - Mobile breakpoint reverses this to document scroll at max-width 768px.

Actual scroll owner:

- Desktop intended/practical: `.doctor-main` is primary scroll owner; `.doctor-sidebar` can independently scroll.
- Mobile intended/practical: document/body scroll is restored by media query.

Risk cases:

- Desktop has two vertical scrollable containers: sidebar and main. This is intentional but still a nested-scroll UX risk.
- Modal open locks body and also hides `.doctor-main`, `.doctor-sidebar`; if modal content exceeds viewport, only modal internal scroll remains.
- Breakpoint switch at 768px changes scroll owner from `.doctor-main` to document/body, making sticky/fixed components fragile near that width.
- `doctor-portal-open` body/root rules can affect any route accidentally rendered while class remains present.

### 4.5 Modal Scroll Model

JSX:

- `BaseModal.jsx` uses portal to `document.body`.
- It tracks active body locks, saves body overflow/padding, sets `body.modal-open`, and handles focus trap.
- Backdrop prevents wheel/touch move; modal content stops propagation.

CSS evidence:

- `.admin-modal-backdrop` fixed at line 1037 with `overflow-y: auto`.
- `.admin-modal` around line 1052 has max-height rules.
- `[data-cb-modal="true"]` broad child and form rules around lines 1077-1123.
- Modal scrolling repairs around lines 22686-22753.
- Final modal lock around lines 35149-35171.

Actual scroll owner:

- Intended: body locked; modal/backdrop or modal body owns scroll.
- Practical: varies by modal class. Some modals scroll via backdrop, some via modal body, some via form body/footer sticky structures.

Risk cases:

- Backdrop `onWheel` preventDefault + modal stopPropagation can fail if internal scroll area is not correctly sized.
- Multiple modal-specific body classes create inconsistent mobile behavior.
- `body.modal-open .doctor-main/.admin-main` locks underlying portals, but focus/scroll restore depends on modal cleanup and route state.

### 4.6 Sticky / Fixed Elements

Key fixed elements:

- Modal backdrop.
- Notification dropdown variants.
- Mobile drawer layer/backdrop.
- Booking sticky action.
- BackToTop.
- Toast container.

Key sticky elements:

- Doctor/admin topbar/sidebar.
- Doctor detail booking aside.
- Symptom checker form panel.
- Patient record modal/header/sidebar nav.
- Package detail sidebars.
- Doctor/public specialty sidebars.

Risk cases:

- No central z-index scale.
- Sticky elements inside parents with `overflow`, `clip`, or hidden horizontal overflow can stop sticking or be clipped.
- Fixed booking sticky action and BackToTop can compete near the bottom-right/bottom viewport.

## 5. Risk Matrix

| Risk | Severity | Likelihood | Area | Why |
| --- | --- | --- | --- | --- |
| Doctor modal scroll lock conflict | Critical | High | Doctor layout + BaseModal | `doctor-portal-open`, `.doctor-main` scroll, `.doctor-sidebar` scroll, `modal-open` all interact |
| Horizontal overflow hidden instead of solved | Critical | High | Public/mobile | `overflow-x: hidden !important` on `html/body/container` can clip content |
| Service package modal regression | High | High | Admin modal | 12 selector definitions, many `nth-child` grid repairs and `!important` |
| Navbar/mobile drawer cascade conflicts | High | High | Public layout | `.public-navbar-inner` and `.mobile-drawer` each redefined 9 times |
| Article/public detail layout drift | High | Medium | Public pages | `.public-main .article-detail-page` redefined 9 times |
| Admin/doctor table mobile overflow | High | Medium | Management pages | Bootstrap tables in cards with mixed responsive wrappers |
| Bootstrap adapter unclear | Medium | High | Global components | Global Bootstrap classes and page overrides intermixed |
| Token bypass/hard-coded visual values | Medium | High | All CSS | Many hard-coded colors/shadows/radii after token layer |
| Media query fragmentation | Medium | High | Responsive | 175 media blocks and near-duplicate breakpoints |
| Focus/scroll mismatch in mobile drawer | Medium | Medium | Navbar drawer | Drawer behaves like modal but does not use `BaseModal` focus trap |

## 6. Đề Xuất Kiến Trúc CSS Mục Tiêu

Do not move files immediately. Use this as the target architecture after inventory and test coverage.

```text
frontend/src/styles/
  index.css

  foundations/
    tokens.css
    globals.css
    typography.css
    motion.css
    z-index.css
    breakpoints.css

  bootstrap/
    bootstrap-adapter.css
    bootstrap-forms.css
    bootstrap-tables.css

  utilities/
    layout.css
    text.css
    interaction.css
    scroll.css

  layouts/
    public-layout.css
    management-layout.css
    admin-layout.css
    doctor-layout.css
    modal-layout.css

  components/
    button.css
    badge.css
    form-field.css
    alert.css
    empty-state.css
    loading.css
    modal.css
    table.css
    pagination.css
    navbar.css
    mobile-drawer.css
    footer.css
    toast.css
    card.css

  domains/
    patient/
      appointments.css
      medical-records.css
      booking.css
      profile.css
    admin/
      dashboard.css
      crud.css
      schedules.css
      audit-logs.css
      service-packages.css
    doctor/
      dashboard.css
      appointments.css
      queue.css
      records.css
      schedules.css
      profile.css
    public/
      home.css
      directories.css
      details.css
      packages.css
      articles.css
      symptom-checker.css
    auth/
      auth.css

  legacy/
    repairs.css
    deprecated-overrides.css
```

### Target Cascade Order

1. Foundations.
2. Bootstrap adapter.
3. Utilities.
4. Layouts.
5. Components.
6. Domain/page styles.
7. Temporary legacy repairs.

### Required Ownership Rules

- `html`, `body`, `#root` only in `foundations/globals.css` and `layouts/*` scroll model files.
- `.btn`, `.form-control`, `.form-select`, `.table`, `.container` only in `bootstrap-adapter.css` or component files.
- Page-specific CSS must be scoped by a page root class.
- Modal scroll rules live only in `layouts/modal-layout.css` and `components/modal.css`.
- No new `!important` except in `legacy/repairs.css`, with a comment linking to issue/page.
- No `nth-child` layout selectors for form grids in new CSS.

## 7. Safe Migration Strategy Theo Phase

### Phase 0 - Freeze And Inventory

- Do not move CSS yet.
- Add a documented CSS ownership map.
- Tag sections in `app.css` with temporary comments if needed in a separate task.
- Create visual baseline screenshots once dev server/browser can run.

Exit criteria:

- Known routes and viewport list.
- Known scroll owners.
- Known modal variants.

### Phase 1 - Foundations Extraction

Move only non-behavioral foundations:

- `:root` tokens.
- Base typography.
- Box sizing.
- Z-index token definitions.
- Breakpoint documentation as comments/custom properties if desired.

Avoid:

- Any `overflow`, `height`, portal layout, modal, sticky/fixed movement.

Exit criteria:

- Build passes.
- No visual diff expected except source order must be identical through import order.

### Phase 2 - Bootstrap Adapter Extraction

Move stable global Bootstrap adaptations:

- `.btn*`
- `.form-control`, `.form-select`
- base `.table` if truly global
- `.badge-status`

Rules:

- Preserve source order relative to current file.
- Do not migrate page-specific button/form overrides yet.

Exit criteria:

- Auth, booking, admin CRUD forms, doctor forms still visually consistent.

### Phase 3 - Shared Components Extraction

Move stable shared components:

- Empty state.
- Skeleton/loading.
- Toast.
- Modal shell base.
- Notification/user menu only after navbar is tested.

Avoid:

- Service package modal repairs.
- Patient record modal.
- Appointment detail modal.

Exit criteria:

- Modal open/close, focus trap, scroll lock tested on admin/doctor/patient.

### Phase 4 - Layout Scroll Model Isolation

Create dedicated layout files:

- `public-layout.css`
- `management-layout.css`
- `admin-layout.css`
- `doctor-layout.css`
- `modal-layout.css`

Migrate only after visual/browser QA is available.

Rules:

- Define one scroll owner per layout.
- Document desktop/mobile owner switch.
- Remove duplicate definitions only after confirming final computed styles.

Exit criteria:

- No double scrollbar on public/admin/doctor.
- Route change scroll reset works.
- Modals scroll on desktop/mobile.
- Sidebar scroll remains usable.

### Phase 5 - Domain/Page Migration

Migrate domain by domain:

1. Auth, because small and high value.
2. Public directory/detail pages.
3. Patient appointment/medical record pages.
4. Admin CRUD.
5. Doctor workflows.
6. Package/service package modal last.

Exit criteria:

- Each route has page root class and no leaked selectors.
- Page CSS no longer modifies Bootstrap/global classes without scoping.

### Phase 6 - Legacy Repair Burn-Down

Move remaining late-file repair blocks into `legacy/repairs.css`.

For every repair:

- Add owner.
- Add affected route/modal.
- Add removal condition.

Only delete after visual QA confirms no regression.

## 8. Những Phần Tuyệt Đối Không Nên Mass-Refactor

Do not mass-refactor these without route-by-route browser testing:

- Final doctor scroll repair around lines 35092-35210.
- `BaseModal` related CSS and modal scrolling repairs around lines 1037-1123, 22686-22753, 35149-35171.
- Service package modal CSS around lines 17222-18197, 32074-32834, 34708-35091.
- Mobile drawer/navbar CSS around lines 7881-8004, 20180-21049.
- Patient record modal/detail CSS around lines 27819-29406.
- Appointment detail modal / appointment center CSS around lines 29603-31831.
- Global mobile overflow clamp around lines 36200-36214.
- Bootstrap global `.btn`, `.form-control`, `.form-select` until all custom button/form variants are inventoried.
- Any selector using `nth-child` for modal/form layout until JSX structure is stable.

## 9. Thứ Tự CSS Nên Migrate Đầu Tiên

Recommended first migrations:

1. Documentation-only section map and ownership comments.
2. Design tokens and foundation comments.
3. Z-index scale variables.
4. Breakpoint scale documentation.
5. Empty state CSS.
6. Skeleton/loading CSS.
7. Badge/status CSS.
8. Button base CSS.
9. Form control base CSS.
10. Auth page CSS.

Recommended last migrations:

1. Doctor scroll repair.
2. Modal scroll repairs.
3. Mobile overflow hidden clamp.
4. Service package modal.
5. Patient record modal.
6. Appointment detail modal.
7. Navbar/mobile drawer fixed overlay.

## 10. Tiêu Chí Kiểm Thử Sau Mỗi Migration

### Required Viewports

- Desktop: 1366x768 and 1440x900.
- Wide desktop: 1920x1080.
- Tablet: 768x1024.
- Mobile: 390x844 and 360x800.

### Required Routes

Public:

- `/`
- `/booking`
- `/clinics`
- `/doctors`
- `/doctors/:doctorId`
- `/specialties`
- `/specialties/:specialtyId`
- `/packages`
- `/packages/:id`
- `/articles`
- `/articles/:slug`
- `/symptom-checker`

Auth:

- `/login`
- `/register`
- `/forgot-password`
- `/change-password-first-login`

Patient:

- `/appointments/my`
- `/medical-records`
- `/profile`

Admin:

- `/admin`
- `/admin/appointments`
- `/admin/clinics`
- `/admin/doctors`
- `/admin/schedules`
- `/admin/service-packages`
- `/admin/specialties`
- `/admin/articles`
- `/admin/audit-logs`

Doctor:

- `/doctor`
- `/doctor/queue`
- `/doctor/appointments`
- `/doctor/medical-records`
- `/doctor/medical-records?followUpOnly=true`
- `/doctor/schedules`
- `/doctor/articles`
- `/doctor/reviews`
- `/doctor/profile`
- `/doctor/service-packages`

### Scroll / Overflow Checks

For every migrated phase:

- Exactly one vertical scroll owner for public pages: document/body.
- Exactly one main content scroll owner for admin desktop: `.admin-main`.
- Exactly one main content scroll owner for doctor desktop: `.doctor-main`, with sidebar independently scrollable only when content requires.
- On doctor/admin mobile, confirm scroll owner switches intentionally and no body lock remains.
- No horizontal scrollbar on `html/body`.
- No hidden clipped CTA caused by `overflow-x: hidden`.
- Modal open locks background but modal content remains scrollable.
- Modal close restores prior scroll state.
- Mobile drawer locks background and restores focus/scroll.

### Visual Regression Checks

- Navbar does not wrap awkwardly or overlap CTA.
- Sidebar/topbar sticky positions are stable.
- Tables do not clip important actions.
- Filter bars wrap cleanly.
- Buttons fit labels.
- Empty/loading/error states preserve hierarchy.
- Toasts do not appear behind modals/drawers.
- Booking sticky action does not cover form footer or final CTA.

### Accessibility Checks

- Modal focus trap works.
- Escape closes modal/drawer where allowed.
- Focus visible is present on buttons, links, inputs, tabs.
- Table/card actions remain keyboard reachable.
- Error alerts use `role="alert"` where urgent.
- Status badges have text labels, not only color.

## 11. Files Read For This Audit

- `frontend_ui_audit.md`
- `docs/frontend-design-guidelines.md`
- `frontend/src/styles/app.css`
- `frontend/src/components/PublicLayout.jsx`
- `frontend/src/components/ManagementLayout.jsx`
- `frontend/src/components/AdminLayout.jsx`
- `frontend/src/components/DoctorLayout.jsx`
- `frontend/src/components/BaseModal.jsx`

## 12. Final Notes

The safest next task is not visual redesign. It is to introduce CSS ownership boundaries and a testable scroll model. Once the scroll/modal/layout layers are stable, component unification and visual polish can happen with much lower regression risk.
