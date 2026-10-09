# Frontend Progress

## Phase: Student ERP modules + Score re-enabled (2026-10-09)

Built against the backend's new modules. Controllers, DTOs and enums were read first; the backend is the source of truth.
- **No backend code was changed.**
- **No LeetCode data or frontend behaviour was changed.**
- **My Profile was not touched.** This frontend has no My Profile page.

### Routes
Each module has one route; what it shows depends on the role. Every page uses `RequireRole`.

| Route | STUDENT | STAFF | HOD |
|---|---|---|---|
| `/dashboard/course-enrollment` | My courses (code, name, faculty, year, semester, status) | Rosters of own offerings, read-only | List with filters (offering/section/status); detail panel with Drop / Reactivate / Mark Completed; Enroll Section (shows counts); Enroll One Student |
| `/dashboard/timetable` | Weekly grid (desktop), day cards (phone) | Own teaching timetable, read-only | List or week view; filters (section/staff/day/offering/deleted); create, edit, delete (deactivates); 409 conflict messages shown as returned |
| `/dashboard/attendance` | One card per subject: sessions, present, absent, OD, excused, %, minimum, below-threshold flag | Sessions list + Create Session; Class Summary tab | Read-only sessions (with section filter) and Class Summary with "below threshold only" |
| `/dashboard/attendance/sessions/[id]` | — (guarded) | Take Attendance (see below) | Read-only roster |
| `/dashboard/lesson-plan` | Plans grouped by subject, with backend progress | Pick own offering: progress tiles, topics, add/edit (PLANNED only), Mark Completed (date + notes), Cancel, Reopen | Read-only: progress by offering (backend `/progress` for each) and all topics; filters subject/offering/section/staff/status |
| Score (existing Gradebook pages) | My Grades, Internal Marks | Assessments, grade entry, summary, Internal Marks | Same pages, read-only (existing behaviour) |
| `/dashboard/fees` | Totals + charge table (see below) | — (guarded; backend gives STAFF no access) | Summary tiles, Student Charges and Fee Structures (see below) |
| `/dashboard/receipts` | My receipts → detail → **Print Receipt** (browser print) | — (guarded) | Receipt search (receipt no., section, method, date range) → detail → print |
| `/dashboard/exam-registration` | Student workflow (see below) | — (guarded; no backend access) | Registrations and Exam Periods (see below) |
| `/dashboard/results` | Published results grouped by exam period (code, name, marks, max, grade, status) | Exam period + own offering → spreadsheet entry, Save | Review & Publish, and All Results (see below) |
| `/dashboard/feedback` | Forms targeted to the student (see below) | — (guarded; no backend access) | Forms list, form builder, analytics (see below) |

#### Details for the busier pages
- **Take Attendance (STAFF):**
  - Full roster with status buttons and remarks.
  - **Mark All Present** only changes the screen; nothing is sent until Save.
  - Save Draft sends one bulk PUT with changed rows only.
  - Finalize asks for confirmation.
  - The draft session itself can be edited or deleted.
- **Fees (STUDENT):** total due, paid and balance, plus a charge table: original amount, paid, balance, due date with overdue flag, status, waiver reason.
- **Fees (HOD):**
  - Student Charges: filters for section, fee, status and outstanding only.
  - Charge detail: payment list, **Record Payment** (shows the new receipt), and **Waive** (needs a reason, then confirmation).
  - Fee Structures: create and edit (the amount is locked once assigned).
  - Assign: to the whole batch or one section, with an optional due date.
- **Exam registration (STUDENT):**
  - Open periods → eligible subjects (only what the backend lists) → Save Draft → Submit (with confirmation).
  - Shows status and the review note or rejection reason, plus earlier registrations.
- **Exam registration (HOD):**
  - Registrations: filters for period, status and section. Approve, or Reject with a reason of 5+ characters.
  - Exam Periods: create and edit; Open and Close with confirmation.
- **Results (STAFF):** columns for status, marks, max, grade and remarks, plus an "Apply Max" helper.
- **Results (HOD):**
  - Review & Publish: the result sheet is read-only, Publish needs confirmation, and each row shows Published / Unpublished.
  - All Results: filter by published / unpublished.
- **Feedback (STUDENT):**
  - Forms show open/closed and whether they were submitted.
  - Rating questions use 1–5 buttons; text questions use a text box.
  - Anonymous forms show "Your response is anonymous."
  - One submission per form.
- **Feedback (HOD):**
  - Forms list with filters.
  - Form builder:
    - target: department, batch, section or offering
    - anonymous or identified
    - add, remove and reorder questions
    - unsaved-changes badge
  - Open and Close with confirmation.
  - Analytics: eligible students, submissions, response rate, average ratings, rating spread and text answers.
  - Individual responses never show identity for anonymous forms.

### Code added
- **Types:** one file per module, using the exact backend enum values and field names:
  - `types/enrollment.ts`, `timetable.ts`, `lesson-plan.ts`, `fees.ts`, `exam.ts`, `result.ts`, `feedback.ts`
  - `types/attendance.ts` (replaces the old HR mock types)
- **Services:** `enrollment`, `timetable`, `attendance`, `lesson-plan`, `fees` (incl. receipts), `exam`, `result`, `feedback`.
  - All use the shared axios client and `mapPage` for paged lists. Endpoints are listed in `API_ENDPOINTS`.
  - Score reuses the existing Gradebook services, so no Gradebook code is duplicated.
- **Hooks:** `useEnrollment`, `useTimetable`, `useAttendance`, `useLessonPlans`, `useFees`, `useExams`, `useResults`, `useFeedback`.
  - No background polling.
  - After a change, only the related data is refreshed. Examples:
    - finalize → that session's records, the sessions list, and that offering's attendance summary
    - payment → charges list, that charge, fee summary, receipts
- **Query keys:**
  - Enrollment: `enrollments`, `my-enrollments`, `enrollment-roster`
  - Timetable: `timetable`, `my-timetable`
  - Attendance: `attendance-sessions`, `attendance-records`, `attendance-summary`, `my-attendance`
  - Lesson plans: `lesson-plans`, `my-lesson-plans`, `lesson-plan-summary`
  - Fees and receipts: `fee-structures`, `fees`, `fee-account`, `fee-summary`, `my-fees`, `receipts`, `receipt`, `my-receipts`
  - Exams: `exam-periods`, `exam-registrations`, `my-exam-periods`, `my-eligible-subjects`, `my-exam-registration`
  - Results: `results`, `result-sheet`, `my-results`
  - Feedback: `feedback-forms`, `feedback-form`, `my-feedback-forms`, `feedback-summary`, `feedback-submissions`
- **Labels:** `lib/erp-labels.ts`.
  - Turns backend values into display text.
  - Every status badge has text, so status is never shown by colour alone.
  - Formats money as INR and formats times.
  - Checks money input as text, with no floating-point maths.
- **Components:**
  - `components/erp/shared.tsx`:
    - status badge, stat tile and read-only note
    - a parser that matches bulk-save errors to rows
    - offering labels such as "CS201 — Data Structures — 2023-2027 Sec A — Sem 3"
  - `WeeklyTimetable.tsx`, `AttendanceSessionForm.tsx`, `ReceiptView.tsx`.
  - Page states, side panels and confirmations reuse `gradebook/shared` and `portfolio/shared` (`ConfirmBox`; no `window.confirm`).
- **Print:** `@media print` rules in `globals.css` print only the receipt.

### Behaviour notes
- **Backend values only:** attendance %, lesson-plan progress, fee totals and balances, feedback analytics and result counts are shown exactly as returned.
  - An empty attendance % shows "Not enough attendance data", never 0%.
  - An empty completion % shows "Nothing planned".
  - There is no GPA/CGPA anywhere.
- **Attendance:**
  - Sessions go DRAFT → FINALIZED. The backend has no separate "open" step.
  - Unmarked students are never turned into ABSENT. If finalizing is refused, the backend's "N enrolled student(s) are not marked yet" message is shown with the list of names.
  - Finalized sessions are locked.
  - Students only get per-subject summaries; the backend has no per-session history for students.
- **Unsaved changes:**
  - Attendance, result entry and the feedback form builder show an unsaved badge.
  - Attendance and results also warn before closing or reloading the tab, and ask before Discard or Back.
- **Errors:**
  - Every error goes through `getApiErrorMessage` (the backend message plus its `errors[]` list).
  - Bulk-save row errors (`records[i] (studentId X)`, `results[i] …`) highlight the affected rows.
- **Notifications and audit:** the frontend creates neither. The existing Notifications and Audit Log pages show what the backend creates.

### Score / Gradebook re-enabled
- **Flag:** in `lib/feature-flags.ts`, `isGradebookEnabled()` is now **on** by default.
  - `NEXT_PUBLIC_FEATURE_GRADEBOOK=false` switches it off again (pages show 404, sidebar links are hidden).
  - The flag mechanism is kept.
- **Backend flag off:** if only the backend switches marking off, its endpoints return 404. Gradebook queries never poll and no longer retry on 404, and the pages show the backend's message.
- **Subject Offerings** shows its Assessments section and Internal Marks link again.
- **Internal marks:** totals still show "Pending calculation configuration". Nothing is calculated in the frontend.

### Navigation (sidebar, by role)
- **STUDENT:**
  - Dashboard, Course Enrollment, Timetable, My Attendance, Lesson Plan
  - Score (My Grades, Internal Marks)
  - My Fee Details, Exam Registration, Result, Feedback, My Receipts
  - My Portfolio, Schedule (Deadline/Poll), LeetCode, Notifications
- **STAFF:**
  - Dashboard, My Timetable, Attendance, Lesson Plans
  - Score / Gradebook (Assessments, Internal Marks), Results
  - Academics (Subjects, My Offerings, Class Rosters)
  - Portfolio (Review Queue, Analytics)
  - Schedule, LeetCode, Notifications, Users
- **HOD:**
  - Dashboard
  - Academics (Subjects, Subject Offerings, Course Enrollments, Timetable Management)
  - Attendance Overview, Lesson Plan Overview, Score Overview
  - Examinations (Exam Registration, Results)
  - Finance (Fees, Receipts)
  - Feedback, Portfolio
  - Schedule, LeetCode, Notifications, Users, Audit Log
- **Phone layout:**
  - Below the `md` breakpoint, the sidebar is now a slide-in menu: a menu button in the header opens it, and a backdrop or picking a link closes it.
  - Pages have a 16px side margin on phones.
  - The desktop layout is unchanged.

### Removed (approved)
- The old HR-style attendance mock:
  - `data/attendance-data.ts`
  - the old `hooks/useAttendance.ts` and `services/api/attendance.service.ts` (replaced by real ones)
  - the `app/dashboard/attendance/[id]` and `attendance/analytics` pages, and the old attendance page
  - the hidden "employees present/late" cards on the dashboard
- The `isAttendanceEnabled` flag (attendance is real now).

### Verification
- **Type check:** passes.
  - An auto-generated `.next/dev/types` folder from an old `next dev` run still pointed at the deleted mock pages.
  - It was cleared; Next.js regenerates it.
- **Production build:** passes, 29 routes. That includes the 10 new pages and `/dashboard/attendance/sessions/[id]`.
- **Lint:** 3 errors and 3 warnings, all already present in files this phase didn't touch:
  - `lib/axios.ts`: `any` ×2
  - setState in the login page's mount effect
  - an unused expression in Notifications
  - unused variables in auth-provider
  - **No new lint issues.** Warnings dropped from 5 to 3 because the dashboard cleanup removed unused imports.
- **Live browser QA: NOT DONE.** It was skipped at the user's request.
  - The only live check was the JSON format against the running dev backend: times are `HH:mm:ss`, money is a JSON number.

### Test-data side effects
- Nothing was created or changed.
- After an API login as the demo student, three read-only GET calls were made: `/timetable/me`, `/fees/me`, `/attendance/me`. The backend may have logged that login.

### Known issues / backend limits
- **No student lookup endpoint:**
  - HOD "Enroll One Student" can only offer students already enrolled in another subject of the same section. Enroll Section covers the normal case.
  - Fee assignment supports the whole batch or one section. The backend's `studentIds` option isn't used because there is no way to pick students.
- **Student attendance history:** the backend only returns per-subject summaries to students, with no per-session list.
- **Exam registration and feedback for STAFF:** the backend gives STAFF no access, so there are no STAFF pages.
- **Not browser-tested:** every new page needs a manual check:
  - as HOD, STAFF and STUDENT
  - on desktop (~1440px) and phone (~390px)
  - typing URLs directly, and logged out
- **Timestamps:** still have no timezone offset. This is the backend's format, unchanged.
- **HOD lesson-plan progress table:** makes one `/progress` request per listed offering. This is fine for a department-sized list.

## Phase: Student Achievement & Activity Portfolio frontend (2026-10-05)

Built against the existing backend `/portfolio` API (backend code is the source of truth). **No backend code was changed.**

### Routes / pages
| Route | Who | What |
|---|---|---|
| `/dashboard/portfolio` | STUDENT | Summary cards (from `/portfolio/me/summary`), server-side filters (status / activity type / year), paged list, detail panel, create/edit form, submit / resubmit / delete with inline confirmation. |
| `/dashboard/portfolio/review` | STAFF, HOD | Review queue (defaults to SUBMITTED, oldest first). Server-side filters: status, activity type, level, batch, section, search. Detail panel with Verify (optional note) and Reject (note required, 10+ characters). The selected entry is kept in the URL (`?entry=ID`) so a direct link opens it. |
| `/dashboard/portfolio/students/[studentId]` | STAFF, HOD | A student's verified portfolio (VERIFIED entries only, as the backend returns), grouped by activity type or year. |
| `/dashboard/portfolio/analytics` | STAFF, HOD | `/portfolio/summary`. HOD sees the whole department; STAFF sees the sections they teach (labelled from the backend `scope`). Cards and verified-only breakdowns by type, level, batch and section. |

- **Sidebar:** STUDENT gets a flat "My Portfolio" link. STAFF/HOD get a collapsible "Portfolio" group (Review Queue, Analytics).
- **Route guards:** every page uses `RequireRole`. Out-of-scope entries and students return 403 from the backend, which shows as "Access denied" with the backend message and no entry data.
- **Header titles:** "My Portfolio", "Portfolio Review", "Portfolio Analytics", "Student Portfolio".

### Code added
- **Types:** `types/portfolio.ts`, with the exact backend enums and DTO fields (camelCase items in the shared snake_case page wrapper).
- **Labels:** `lib/portfolio-labels.ts` holds display labels (DRAFT → Draft, SUBMITTED → Pending Review, VERIFIED → Verified, REJECTED → Needs Changes), the backend's minimum lengths, and an http(s) URL check that matches the backend rule.
- **Service:** `services/api/portfolio.service.ts` uses the shared axios client and `mapPage`. Endpoints are listed in `API_ENDPOINTS.PORTFOLIO`.
- **Hooks:** `hooks/usePortfolio.ts`, with no background polling. Query keys are `portfolio-me`, `portfolio-me-summary`, `portfolio-entry`, `portfolio-review`, `portfolio-student`, `portfolio-summary`.
  - Student create/edit/delete/submit → refreshes own list + own summary + that entry.
  - Verify/reject → updates the entry cache, then refreshes the queue + that student's portfolio + the summary.
- **Components:** `components/portfolio/shared.tsx` has the status badge (icon + text, not colour alone), safe evidence link (new tab, `noopener`, never embedded), entry content, review info and the inline `ConfirmBox`. `components/portfolio/PortfolioEntryForm.tsx` is the create/edit form. Side panel and page states reuse `components/gradebook/shared.tsx`.

### Behaviour notes
- **Drafts** only need activity type + title, matching the backend. Fields needed to submit are marked "(needed to submit)". The backend's submit errors are shown exactly as returned.
- **Client checks:** activity type and title required, end date not before start date, start date required when an end date is given, evidence link format, and rejection note of 10+ characters. The backend stays authoritative.
- **Actions per status:**
  - DRAFT and REJECTED: Edit, Delete, Submit/Resubmit.
  - SUBMITTED: read-only.
  - VERIFIED: final ("permanent portfolio record"), no actions.
  - Reviewers only get Verify/Reject on SUBMITTED entries, and never edit content.
- **Resubmitted entries** show "Earlier rejection (resubmitted since)", because the backend keeps the last decision fields until the entry is reviewed again.
- **Confirmations** are inline boxes instead of `window.confirm`, which also keeps browser automation working.
- **Notifications** are created only by the backend. The Notifications page already refetches on the app's normal background polling.

### Gradebook (marking) disabled in the frontend
- Added `isGradebookEnabled = () => false` in `lib/feature-flags.ts`, next to the Attendance flag. It mirrors backend `features.gradebook.enabled=false`.
- **Sidebar:** Assessments, Internal Marks, My Grades and Total Internals are hidden. The STAFF/HOD group is labelled "Academics" while marking is off, and students' "Grades" group is hidden.
- **Direct URLs:** `/dashboard/assessments`, `/dashboard/assessments/[id]`, `/dashboard/internal-marks` and `/dashboard/my-grades` call `notFound()`, the same pattern as Attendance.
- **Subject Offerings** no longer calls `/assessments` (neither the detail list nor the edit-form lock check) and hides the Internal Marks link and the Assessments section. While marking is off, the backend's own error covers the "locked once assessments exist" rule.
- **Subjects and Subject Offerings** stay fully active. No Gradebook files were deleted. To re-enable, flip the flag together with the backend flag.

### Verification
- **Type check:** passes. **Production build:** passes (4 new routes).
- **Lint:** the same 8 issues as before (3 errors, 5 warnings), all in files this phase didn't touch. Nothing new.
- **Live run:** dev profile backend (health UP) and the production frontend, driven headlessly with Chrome via Playwright, because the Chrome extension wasn't connected. 79 checks: 74 passed first time, and the other 5 were test-script matching mistakes that passed when re-checked.
  - **STUDENT:** summary, filters (server-side), create / edit / delete a draft, client validation, exact backend message for an incomplete submit, submit → read-only, rejected note + reviewer visible, edit keeps Needs Changes, resubmit, verified is final, evidence link, both notifications received.
  - **STAFF:** queue limited to their sections, out-of-scope direct link → Access denied, reject needs a note, reject, verify, queue refreshes, repeated verify → 409 message, verified portfolio, out-of-scope student → Access denied, analytics (assigned-sections scope).
  - **HOD:** department-wide queue (incl. section B), batch/section/search filters (server-side), verify with note, student portfolio refreshes, analytics (department scope).
  - **Guards:** STUDENT redirected from review/analytics/student routes with no API calls; STAFF redirected from the student page; logged-out → login; marking pages show 404 with no marking API calls.
  - **Network/console:** no unexpected failed requests and no React errors. The only 4xx responses were the intentional 400 / 403 / 409 checks.
  - **Audit Log:** has CREATE/UPDATE/DELETE/SUBMIT/REJECT/VERIFY rows for these actions.
  - **Layout:** tablet (820px) works with no sideways scrolling. On phones (390px) the existing fixed sidebar covers most of the screen. That is the app-wide layout issue already noted below and was not changed.

### Live-test side effects (dev database)
- **Entry 10, `[TEST] Portfolio UI lifecycle check`** (demo student): created → submitted → rejected by STAFF → edited → resubmitted → **verified by HOD**. It stays as a permanent VERIFIED record, because the backend doesn't allow deleting verified entries.
- **Entry 9, `[TEST] Draft to delete`:** created, edited and **deleted**. It no longer exists.
- **Seeded entry 5** ("National Level Coding Contest", Aarav Patel) was **verified by STAFF**.
- **Seeded entry 6** (section B) is still SUBMITTED.
- **Notifications:** the demo student received "needs changes" and "verified" notifications for entry 10.
- **Audit log:** the usual portfolio audit rows were added.

### Known issues
- **Phone layout:** the app's sidebar is fixed-width with no mobile collapse. This is the existing layout and affects every page.
- **STAFF review scope** depends on active subject offerings (backend rule). Staff with no offerings see an empty queue.
- **Notification links:** clicking a portfolio notification doesn't link to the entry; the Notifications page has no reference-based links.
- **Timestamps:** still have no timezone offset (same as earlier phases).

### Remaining work
- Attendance remains a separate future module.
- Gradebook/marking remains preserved but intentionally disabled.

## Patch: Academic structure lookups (2026-10-02)

- **New lookups:** the Subject Offering form now uses the backend's `GET /batches` and `GET /sections?batchId=`, both HOD/STAFF only.
  - `types/academic.ts` (`Batch`, `Section`, matching the backend DTOs)
  - `services/api/academic.service.ts` (`getBatches`, `getSections`)
  - `hooks/useAcademic.ts` (`useBatches`, `useSections`)
  - Query keys are `batches`, `sections` + batchId (or `all`). They use normal caching with no background polling.
- **Workaround removed:** the old way of matching batch IDs by name from existing offerings and dashboard-summary sections is gone. That includes the disabled "batch unavailable" sections and their warning.
- **New form flow:**
  - Pick a Batch (e.g. "Second Year — 2023-2027"), then a Section from that batch.
  - Section stays disabled until a batch is picked and is cleared when the batch changes. If a batch has no sections, the form says "No sections available for this batch".
  - Edit preselects the offering's batch and section. If its batch is now inactive, it stays listed as an option, because `/batches` lists only active batches.
  - The lock on context fields when assessments exist is unchanged.
- **Verified live:**
  - 4 batches and **all 10 sections selectable**: Year 1 A–D, Year 2 A–C, Year 3 A–B, Year 4 A.
  - Create sends the real `batchId`/`sectionId`. A Year 4 section, previously unreachable, was accepted by the backend; the test then failed on the academic-year rule on purpose, so nothing was saved.
  - The duplicate-offering 409 still shows, and edit preselects correctly.
  - STAFF is still read-only.
  - STUDENT flows are unchanged and never call these APIs.
- **Checks:** type check and build pass. Lint has the same 8 issues as before (3 errors, 5 warnings), all in code this patch didn't touch. No backend files were changed.
- **Side effects:** offering 3 was re-saved with no changes (audit entry only). Nothing new was created.

## Phase: Gradebook + Internal Assessment frontend (2026-10-02)

Built against the existing backend APIs. No backend code was changed.

### Routes / pages
| Route | Who | What |
|---|---|---|
| `/dashboard/subjects` | HOD (manage), STAFF (read-only) | List with server-side search / type / status filters. HOD can create and edit (there's no delete in the backend). |
| `/dashboard/subject-offerings` | HOD (manage), STAFF (own only, read-only) | List, a detail panel (with the offering's assessments and an Internal Marks link), and HOD create/edit. |
| `/dashboard/assessments` | HOD (read-only), STAFF | Filters for offering / type / status (all done by the backend). STAFF can create, edit and delete DRAFT assessments on their own offerings. |
| `/dashboard/assessments/[id]` | HOD (read-only), STAFF | Spreadsheet-style grade entry (status / marks / remarks), one bulk save, finalize, and summary cards. |
| `/dashboard/internal-marks` | HOD, STAFF, STUDENT | HOD/STAFF pick an offering and get a class table with expandable source assessments. STUDENT sees their own marks, one card per subject. |
| `/dashboard/my-grades` | STUDENT | Finalized grades grouped by subject, with year/semester filters (done by the backend). |

- **Sidebar:** a collapsible "Gradebook" group for HOD/STAFF (STAFF sees "My Offerings") and a "Grades" group for STUDENT (My Grades, Total Internals).
- **Route guards:** every route is guarded with `RequireRole`, so typing a URL directly redirects to `/dashboard`.

### Code added
- **Types:** `types/gradebook.ts`, using the backend's exact enum values and camelCase item fields.
- **Labels and formatting:** `lib/gradebook-labels.ts` turns enum values into readable labels and formats dates and marks.
- **Services:** `subject`, `subject-offering`, `assessment`, `gradebook` (grades, summary, `/grades/me`) and `internal-marks`. All use the shared axios client, `mapPage` and `getApiErrorMessage`.
  - `fetchAllPages()` in `lib/pagination.ts` loads every page, but only for dropdown lists.
- **Hooks:** `hooks/useGradebook.ts`. Each area has its own query keys and only invalidates related data:
  - grade save → that assessment's grades + summary
  - finalize → the assessments list, that assessment's grades + summary, and the offering's internal marks
  - Gradebook queries skip the app's 7-second background polling.
- **Components:** `components/gradebook/` contains `shared.tsx` (side panel, badges, page states, `PendingTotal`), `AssessmentForm.tsx` and `InternalMarksBreakdown.tsx`.
- **Header fix:** the page header now skips number segments in the URL, so `/assessments/12` shows "Assessments" instead of "12".

### Grade entry behavior
- **Rows:** the whole class is shown. `NOT_GRADED` is display-only and never sent.
- **Status rules:** ABSENT and EXEMPTED clear and disable the marks field. Typing marks for an ungraded student switches their status to GRADED.
- **Before saving:** the page checks marks are filled in, not negative, at most the max, and have at most 2 decimals.
- **Saving:**
  - Only changed rows are sent, in one PUT.
  - If the backend rejects rows, its errors (`grades[i] (studentId X): …`) are matched to students and those rows are highlighted.
- **Unsaved changes:**
  - Rows with changes show a count badge and are highlighted.
  - Discard asks for confirmation.
  - Back to Assessments asks before leaving.
  - Closing or reloading the tab triggers the browser's own warning.
  - Finalize is disabled until changes are saved.
  - The sidebar links don't warn, because the app has no general way to intercept navigation.
- **Finalize:** asks for confirmation, explaining that finalized assessments can't be reopened. The frontend never sends notifications; the backend does.
- **Who can edit:** only the assigned STAFF member, and only while the assessment is DRAFT. HOD and other staff see a locked, read-only view.

### Internal marks (no calculation)
**Internal-mark calculation logic is intentionally not implemented because the final formula has not yet been provided.**
- **Totals:** these come straight from the backend. `null` shows as "Pending calculation configuration", never as 0.
  - THEORY subjects show Theory Internal Total + Total Internals.
  - THEORY_CUM_PRACTICAL subjects show Theory /50, Practical /50 and Total /100.
- **Source assessments:** these are grouped for display only.
  - Theory: CAT 1, CAT 2, Assignment, Group Presentation.
  - Practical: Practical, Record.
  - Any other finalized type (e.g. Lab, Quiz) appears under "Other finalized assessments" rather than being guessed into a component.
- **My Grades:** shows a percentage for each individual assessment only. There's no overall grade, GPA or letter grade.

### Verification
- **Type check and production build:** both pass.
- **Lint:** the same 3 errors and 5 warnings as the previous phase, all in code this work didn't change. Nothing new.
- **Live headless run against the dev backend:** 66/66 checks passed, covering HOD, STAFF and STUDENT:
  - **Role access:** the right sidebar links for each role, redirects on direct URL access, and no management API calls from STUDENT.
  - **HOD:** subject 409/400 errors, the 409 when changing a subject's type after it has offerings, subject edit (then reverted), offering edit with locked fields, and the duplicate-offering 409.
  - **STAFF:** create, edit and delete a DRAFT assessment, then the grade grid: limits, Enter moving to the next row, the unsaved-changes guard, and a single bulk PUT.
  - **Finalize:** finalizing makes the assessment read-only, and a second finalize gets 409.
  - **Another teacher's offering:** STAFF gets the 403 message.
  - **STUDENT:** sees only finalized grades and the pending internal-marks state.
  - **Notifications:** exactly one backend notification per student.

### Known issues / blockers
- ~~No batch/section endpoint~~ — resolved by the academic-structure patch above.
- **Staff dropdown:** built from `/users?active=true` (all pages), keeping STAFF-role users who aren't students. This matches the backend's rule. It needs HOD's `VIEW_USERS` permission, which HOD has.
- **Timestamps:** these still have no timezone offset (same as the previous phase).
- **Mobile:** the app's sidebar is a fixed width (existing layout). Gradebook tables scroll sideways inside their cards.

### Live-test side effects (dev database)
- **CAT 2 (CS301, Section A):** one previously ungraded student was given 30 marks, then the assessment was **finalized** (agreed option a). The class received the backend's "Marks published: CS301" notification.
- **Test assessment:** `[TEST] UI verification` (id 8) was created, graded, edited and then **deleted**. It no longer exists.
- **Subject CS301:** the name was edited and then reverted.
- **Offering 1:** re-saved with no changes.
- **Audit log:** these actions added the usual audit entries.

### Remaining work
- Internal-mark calculation, once the formula is provided (backend first).
- Reopening finalized assessments (not supported by the backend).
- **Attendance remains disabled because there is no backend implementation yet.**
- Poll result analytics: there's still no backend endpoint.

## Phase: Frontend ↔ backend sync (2026-10-02)

Synced the existing frontend with the current backend. The backend is the source of truth. No backend code was changed.

### Done
- **Audit Logs** (`/dashboard/audit-log`)
  - Uses the real `GET /audit-logs?page=&size=` (20 per page). All mock data is gone.
  - Shows only the fields the backend returns. `old_value` / `new_value` are shown exactly as returned, including `[REDACTED]`.
  - The fake filters (search, module, action, status) and fake fields (role, status, browser, device, location, description, reason) are removed.
  - "Export This Page" exports only the rows currently shown.
  - Only HOD can open the page. Anyone else is sent to `/dashboard` before any API call runs.
- **Dashboard**: the fake "Today's Activities" / failed-logins card is removed.
- **User Management** (`/dashboard/users`, new)
  - Server-side search (name/email), Active/Inactive filter, paging, and a detail panel that loads `GET /users/{id}`.
  - HOD can create, edit, deactivate and reactivate users. An HOD can't deactivate their own account.
  - STAFF gets a read-only view.
  - STUDENT sees no sidebar link and is redirected if they open the URL.
  - Uses its own types in `types/user-management.ts`, separate from the `/auth/me` user type.
  - Create offers only the HOD and STAFF roles, because student logins are tied to student records. Edit shows all roles.
- **Notifications**
  - Removed: archive (it only hid items in memory), categories, the "From" sender field, and the search, priority and sort controls that only worked on the current page.
  - Kept: the read/unread filter (done by the backend), mark read, mark all read and delete.
- **Shared API helpers**
  - `lib/api-error.ts` → `getApiErrorMessage()` shows the backend `message` plus the `errors[]` list for validation failures. Used by Schedules, LeetCode, Users, Audit, Dashboard and Login.
  - `lib/pagination.ts` → `mapPage()` turns the backend page wrapper into the frontend paging shape and leaves item fields unchanged. This works for camelCase modules like Gradebook too.
  - `components/ui/Pagination.tsx` is the shared pager.
  - `components/common/RequireRole.tsx` is the route guard.
  - The 3 copied `handleApiError` functions and the old "200 with `success:false`" checks are removed.
- **LeetCode**: Top Count now shows Easy, Medium, Hard and Last Synced.
- **Dead code removed**
  - Files: `components/common/{Loading,EmptyState,ErrorFallback,NotFound}.tsx`, `types/common.ts`, `data/audit-data.ts`, `data/notification-data.ts` (which held the stale `MEETING` mock).
  - Code: `LoginCredentials`, `authService.refresh` (token refresh lives in `lib/axios.ts`), unused `QUERY_KEYS`, the `API_ENDPOINTS.AUTH` entries, and the unused audit types.

### Decisions
- When the backend can't filter or sort something, the frontend control was removed rather than faking it on the current page.
- Route guards check roles from `/auth/me`, which has no permissions list. HOD gets audit access and user management. STAFF can view users. This matches the backend's seeded role permissions.
- Attendance (mock layer and pages behind `notFound()`) is left exactly as it was, still disabled.

### Verification
- `tsc --noEmit` and `next build` both pass.
- `eslint`: 3 errors and 5 warnings, all in code this phase didn't change (`lib/axios.ts` `any`, setState in the login mount effect, unused imports).
- Tested headless against the dev backend as HOD, STAFF and STUDENT:
  - Role-based routes and sidebar links behave correctly.
  - Audit paging works.
  - Users search, filter, detail, edit, deactivate and reactivate work.
  - The 409 (duplicate email/username) and 400 (validation) messages show in the UI.
  - Notifications mark read and delete work.
  - Polls and Deadlines load.
  - No call is made to the removed `/schedules` API.

### Known issues
- **Timestamps**: the backend sends `LocalDateTime` values with no timezone offset. The frontend reads them as browser-local time. This is an API-contract issue to fix in the backend later.
- **Validation runs before the permission check**: a STAFF user sending an invalid `POST /users` gets 400, not 403. A valid body correctly gets 403. The UI never shows STAFF these controls.
- **Test account**: during verification an extra account was created: username `staff`, email `dup.unique.zz@example.com`, id 14. It has been deactivated. The backend has no hard delete.

### Remaining gaps (intentionally not built)
- Gradebook / Internal Assessment frontend: next phase.
- Attendance: there's no backend module, so it stays disabled.
- Poll result analytics: there's no backend endpoint for response counts.
