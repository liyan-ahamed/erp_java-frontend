# Frontend Progress

## Phase: Staff Batch → Semester → Class, read-only staff Results, Assessments redesign (2026-10-21)

Frontend only. **No backend code was changed.** Not committed. Contract: `docs/ERP_API_CONTRACT.md` §G–J (all PROPOSED; the backend agent had not answered yet).

**Spec note:** the Markdown assessment spec named in the request was not attached or found on disk. The work follows the request text and the two screenshots (`Pictures/Camera Roll/Screenshots/Screenshot 2026-10-21 070026.png` = mockup, `…065508.png` = Portfolio Review). Re-check against the spec once it is available.

### What changed
- **Shared staff selector: Batch → Semester → Class**
  - Files: `lib/teaching-context.ts`, `hooks/useTeachingSelection.ts`, `components/academic/TeachingSelector.tsx`, `lib/url-query.ts`.
  - Options come only from the staff member's own offerings (past semesters included).
  - "Cohort" is shown as "2025–2029 Batch". Classes are labelled like "OOPJ · Sec A", with the batch / year added only when two labels clash. Ids are offering ids.
  - **Semester labels:** Current / Previous / Upcoming come from `Batch.currentSemester` (§G1, not sent by the backend yet). Until then, the latest semester with my classes that the batch has reached (≤ currentYear × 2) is used and labelled **"Latest"**, never "Current". Today's date is never used.
  - Changing the batch resets the semester; changing the semester clears the class. The selection is kept in `?batch=&sem=&class=` (old `?offering=` links still work).
  - Used in: Assessments, Results, Internal Marks, My Courses, Course rosters, Attendance (Overview + Session Log tabs), and the New Assessment / Create Session forms.
  - **Not used in My Timetable:** a batch filter would hide classes from other batches in the weekly grid.
- **Assessments overview (STAFF)** — `components/gradebook/StaffAssessments.tsx`
  - Opens on the batch that has drafts (otherwise the one with most current classes), with all my classes.
  - **Needs your attention:** drafts, oldest first, with progress and Enter marks / Continue / Review & finalize. Drafts in other batches or semesters are linked below.
  - **Filters:** Class, type chips (CAT, Quiz, Assignment, Practical, Record, plus any other type in use) and status chips with counts.
  - **Class cards** with an assessment table. Average and pass rate are shown for finalized assessments only.
  - **⋯ menu:** Edit details, Duplicate (details only, never marks), Delete (draft + owner only, confirmed in a dialog). Finalized assessments show those options disabled.
  - The HOD keeps the old department view.
- **Marks entry** — `components/gradebook/MarksEntry.tsx`, `MarksImportDialog.tsx`, `lib/assessment-marks.ts`, `lib/spreadsheet.ts`
  - Header with chips and metadata; summary cards (entered / average / highest / lowest / absent), calculated live from what is on screen.
  - **Table:** marks input, Absent checkbox, typing `AB`, and a message column.
  - **Keyboard:** Enter / ↓ moves to the next student, Shift+Enter / ↑ to the previous one.
  - **Filters and search:** All / Not entered / Absent / Errors. A filtered list stays fixed while you type.
  - **Validation:** > max → "Max is 25"; negative, text and > 2 decimals are rejected.
  - **Autosave:** 800 ms debounce, changed rows only, one request at a time, existing remarks sent back unchanged. Shows Saving / ✓ Saved n min ago / Failed — Retry. Pending changes are sent when leaving the page, plus a leave-page warning.
  - **Finalize** only when every student is graded, absent or exempted and nothing is invalid, pending or failed. Confirmed in a dialog, then the screen becomes read-only with **Export (CSV)**.
  - **Import .xlsx / .csv:** parsed in the browser (no new dependency). The preview lists new, overwrite, unchanged, invalid, unmatched, duplicate and exempted rows. Overwrites only apply when ticked.
  - Clearing a saved mark can't be saved yet (§I2). It is flagged, never dropped silently.
- **Results (STAFF): strictly read-only** — `components/results/StaffResults.tsx`
  - Batch → Semester → Exam (End Semester Examination / CAT 1 / CAT 2), with a Class filter.
  - **End semester:** `published=true` results only.
  - **CAT:** FINALIZED gradebook assessments only. Drafts say "not results yet" and link to Assessments.
  - No result editor is rendered for anyone any more (the HOD sheet keeps Publish only).
- **Portfolio Review (STAFF filter only):** Workshop, Conference, Technical Event, Club Activity and Other were removed from the Activity Type dropdown. The HOD keeps all 11, and "All Activity Types" still returns every record.
- **Header breadcrumb** now reads section / page ("Teaching / Assessments"). `PageContainer` gained a `backLink` slot.

### Decisions
- No new UI library. Excel is read with the browser's built-in `DecompressionStream` + `DOMParser`.
- Statistics count graded marks only. Absent and exempted students are never counted as zero (same rule as backend `/summary`).
- The overview calls `/summary` once per visible assessment until §I3 embeds it.

### Data issues found (nothing deleted or changed)
- **"[QA AUDIT] Assessment A (edited)" (id 9):** created 2026-10-02 21:21 and edited 2026-10-11 10:36 by headless-Chrome QA runs logged in as `staff@department.com` on the dev DB (audit rows 161, 166, 270). It is test data, not a seed. **Waiting for your OK to delete it.** It is not hidden by any frontend filter.
- **Finalized assessments with missing marks:** "API verification quiz" (6 / 58) and CS301 "CAT 2" (11 / 58). The backend's finalize doesn't check completeness (§I1).
- **The backend still allows STAFF to write end-semester results** (`PUT /results/...` is `hasRole('STAFF')`) — §H1, the backend agent's task.

### Verified (2026-10-21)
- **tsc:** passes. **ESLint:** clean on every changed file.
- **Logic tests** (scratch Node script), 52/52:
  - marks validation, stats, progress states, import plan, CSV;
  - selector defaults, labels, semester tags, resolution, URL.
- **Browser smoke test** (headless Chrome, real backend; every non-GET request blocked in the browser), 26/26:
  - overview, filters, menu, batch change, breadcrumb, mobile width;
  - marks entry validation, AB + autosave (one row sent, failure shows Retry), import preview, reload unchanged, finalized read-only;
  - results (End Semester, CAT 1, CAT 2 empty, no writes);
  - internal marks, my courses, attendance, portfolio filter (staff vs HOD), HOD assessments unchanged.
- **Not run:** production build; real saves / finalize / delete against the dev DB.

### Known issues / next steps
- **Waiting on backend:**
  - §G1 `currentSemester`. Until then 2026–2030 opens on "Latest — Semester 2", which may really be next semester.
  - §G2 `subjectAcronym` / `studentCount`.
  - §H1 STAFF write block.
  - §I1 finalize completeness.
  - §I2 clear-a-mark.
  - §I3 summaries in the list.
  - The INTERNAL exam period vs gradebook CAT 1 question (§H2).
- **Session Log** "All my classes" lists all of the teacher's sessions (the sessions API has no batch / semester filter).
- **Detail page breadcrumb** reads "Teaching / Assessment" (not the assessment title).

## Phase: Curriculum, holiday management, backend registration status (2026-10-21)

Frontend only. **No backend code was changed.** Not committed.

The work follows `docs/ERP_API_CONTRACT.md` (sections A–E), which the backend agent implemented and the frontend verified against :8080.

### What changed
- **Courses → Curriculum (HOD, new tab)** — `components/courses/CurriculumConfig.tsx`, `lib/curriculum.ts`
  - Pick Cohort → Semester; nothing loads before both are chosen.
  - **Compulsory courses:** add and remove.
  - **Elective groups:** create, rename, add/remove options, set required selections, delete.
  - Shows offered subjects that are in neither list as "Not in the curriculum".
  - **Local checks before Save**, mirroring the backend:
    - no duplicates, and a subject in only one place;
    - each group has ≥ 2 options and 1 ≤ required ≤ options;
    - names present and unique;
    - limits of 30 compulsory, 10 groups, 30 options;
    - not empty (Delete removes a whole curriculum instead).

    The backend's own 400 / 409 messages are shown as returned. A 409 offers "Reload".
  - **Saving:** nothing is saved until Save; the whole document is sent with its `version`.
  - **Unsaved changes are guarded:** a badge, Discard, a confirm on cohort/semester change and on tab change, and the browser's leave-page warning.
  - **Delete Curriculum** returns the cohort + semester to "not configured".
- **Enrollments (HOD)**
  - The table, summary, filter counts and paging now come from the backend's registration-status endpoints (C1 / C2). The frontend no longer calculates status.
  - **Detail dialog (C3):**
    - Compulsory courses: ✓ / ✕, faculty, enrollment status;
    - Elective groups: "n of N selected", "k more needed", selected options, other options;
    - other registrations, plus a "Not counted" list.
  - Manage / Drop / Reactivate / Mark Completed are unchanged. They use the student's full rows from `GET /course-enrollments?studentId=`.
  - **Workarounds removed:**
    - the internal-marks class list and the `/users` fallback;
    - the old browser-side status logic (`lib/registration.ts` now only holds labels and the counting rule).
  - **Enroll One Student** now lists the section's students from `GET /sections/{id}/students`, so students with no enrollments can be added.
- **Subject Catalog:** the Cohort / Semester filters are the backend's `batchId` / `semester` params (server paging). "Offered In" comes from `offeredIn`, limited to the chosen cohort. The whole catalog is no longer loaded.
- **Holiday calendar** — `HolidayCalendar.tsx`, `HolidayForm.tsx`, `lib/holidays.ts`, `hooks/useHolidays.ts`
  - The year's state comes from `GET /holidays/calendars/{year}`, fetched together with the year's holidays. Multi-day ranges are expanded.
  - **HOD:**
    - a year bar (Published / Draft / Not created, count, published at/by) with Publish / Unpublish (confirmed);
    - Add Holiday;
    - Edit / Delete in the details panel. Drafts are visible and marked.
    - **The form:** name, start/end date, category (National, State, Institutional, Academic Break, Other; existing General Holiday rows keep theirs), description, and cohorts (none ticked = whole institution).
  - **STAFF / STUDENT:** read-only. The exact messages are "College holiday calendar for 2027 has not been published yet.", "No holidays scheduled for this month." and "Unable to load holidays." with Retry. Students only see holidays for their own cohort (taken from their timetable).
  - **Only PUBLISHED years affect scheduling** (`effective` / `effectiveByDate`), in the attendance calendar and the staff dashboard. The HOD's draft view never does.
- **Staff dashboard:** upcoming classes skip published college holidays that apply to the class's cohort, and say how many were skipped. If holidays fail to load, it says so instead of assuming there are none.

### Test data
- **No test curriculum was saved.** The only department source (`DevCurriculum.java`) lists each semester's courses but not which are compulsory or elective. Saving one would have meant inventing that classification.
- The management UI was checked by editing and discarding, with no write requests sent.
- No holiday records were created, edited, deleted, published or unpublished.

### Verified (2026-10-21)
- **tsc:** passes.
- **ESLint:** clean on every file changed in this phase.
- **Focused logic tests** (scratch script, 22/22):
  - curriculum checks, draft ↔ request round trip;
  - holiday ranges (month and leap-year boundaries, 60-day max);
  - publication handling: drafts / unpublished never count, published with zero holidays stays published, government rows ignored;
  - cohort matching, form checks.
- **Browser smoke test** (headless Chrome, real backend), 13/13:
  - HOD curriculum (gating, edit, checks, tab guard, discard);
  - enrollments (63 rows from C1/C2, server status filter, paging, C3 detail, Manage → Back, roster endpoint);
  - catalog (server filter, no full load);
  - HOD holidays (year bar, Edit form, Unpublish confirm cancelled, 2027 "no calendar yet");
  - STAFF / STUDENT read-only holidays and the 2027 message;
  - staff dashboard.

  No write requests, console errors or failed calls.
- **Not run (by design):** production build; real saves / deletes / publishes.

### Known issues / notes
- **Registration statuses:** ALL_REGISTERED / INCOMPLETE can't be seen until the HOD saves a real curriculum.
- **Staff holiday shading:** the attendance calendar shades a holiday when it applies to any cohort (it isn't split per class). The day view note is also not cohort-specific.
- **Student cohort source:** a student's cohort comes from their timetable. A student with no timetable sees every published holiday.
- **Attendance redesign:** waits for `docs/STAFF_ATTENDANCE_SPEC.md`, which isn't in the repo yet.

### Next steps
- Staff Attendance redesign (Priority 2) once the spec is available.
- Optionally, save the first real curriculum through the UI with the department's classification.

## Phase: Student-level enrollments, catalog semester filter, holiday calendar (2026-10-20)

Frontend only. **No backend code was changed.** Not committed.

### Decisions (agreed before building)
- **Registration status is never guessed.** The backend has no curriculum: nothing says which subjects are compulsory or elective, or how many electives each group needs. So a student with registrations is **Requirements Unknown**, never "All Registered".
  - The number of courses offered to a class is **not** treated as the number required.
- **Holidays: only the college's own calendar** (`scope: COLLEGE`) is shown. Government rows (NATIONAL / TAMIL_NADU) never appear as college holidays. A national or state holiday shows only when the college calendar lists it.
  - This replaces the old decision to not use `/holidays`. The backend now serves the college calendar for 2026.
- **Catalog semester filter runs in the browser for now.** A server-side filter is the preferred fix (see backend items).

### HOD → Courses → Enrollments (`components/courses/Enrollments.tsx`)
- **One row per student** for the chosen class. Columns: Register No., Student Name, Class, Courses Registered, Registration Status.
- **Filters:** Cohort → Semester → Section, plus Registration Status (All Students / All Registered / Incomplete / Not Registered / Requirements Unknown, each with its count).
  - The Subject dropdown and the old enrollment-row status filter are gone.
  - Cohort-first gating is unchanged: nothing loads until a section is chosen. Changing cohort clears semester and section; changing semester clears section.
- **Where the students come from:**
  - **Class list:** `GET /subject-offerings/{id}/internal-marks` for any course of the class. It is the only existing endpoint that lists every active student of a section, enrolled or not (the same students Enroll Section uses). Read-only.
  - **Enrollments:** every page of `GET /course-enrollments?sectionId=`, then narrowed to the semester in the browser (the backend has no semester filter).
  - **Fallback:** only if the class list fails (e.g. gradebook switched off), the section's logins from `GET /users?role=STUDENT&sectionId=` (all pages). A warning then says students with no enrollment and no login may be missing.
  - Found during this phase: `/users` is paginated (max 100 per page) and only returns students who have an ERP login. Section 2025-2029 A has 63 students but 1 login.
- **Counting:** only ENROLLED / COMPLETED rows on an **active** course offering count. Dropped rows and rows on deactivated offerings are listed under "Not counted" in the detail.
  - "Courses Registered" shows the registered count only. "N active courses offered to this class" is a separate line, and "Required courses: not recorded in the ERP" is stated.
- **Pagination:** 50 unique students per page, built in the browser after the status filter runs on the whole class. Resets to page 1 when filters change.
- **Student detail (dialog):**
  - Student information and the registration summary: registered, offered, compulsory (Not available), electives (Not available), overall.
  - Non-elective and Elective sections show "classification not available".
  - "Courses offered to this class" lists every active course with ✓ / ✕, faculty and the enrollment status.
- **Enrollment actions kept:** each registration has **Manage**, which opens the existing Drop / Reactivate / Mark Completed view, with "Back to student".
  - Enroll Section and Enroll One Student are unchanged and refresh the table.
- **`lib/registration.ts`:** the full completeness rules for when the backend supplies requirements:
  - compulsory subjects;
  - each elective group checked on its own ("choose N");
  - extra optional subjects never block completion;
  - zero active registrations = Not Registered.
  - `REQUIREMENTS` in `Enrollments.tsx` is `null` until that endpoint exists. The detail already renders compulsory lists and elective groups (Selected / Other options / Selection Pending) when it isn't.

### HOD → Courses → Subject Catalog (`components/courses/SubjectCatalog.tsx`)
- **New filters:** Cohort (optional) and Semester. Both are built from active subject offerings, so only real semesters are offered.
- **New "Offered In" column** (e.g. "Sem 2, Sem 3"). A subject offered in several semesters appears under each one.
- **With no cohort or semester set,** the table works exactly as before (server search and paging, 20 per page).
- **With either set,** every subject is loaded (all pages). Search, type, status, the semester match, sorting by code (as the backend sorts) and paging then all run in the browser.

### Holiday calendar (`components/timetable/HolidayCalendar.tsx`) — HOD, STAFF and STUDENT
- One shared component in each role's existing Timetable → Holidays tab. Read-only; no editing controls.
- **New files:**
  - `types/holiday.ts`, `services/api/holiday.service.ts`: `GET /holidays?year=`.
  - `hooks/useHolidays.ts` (`useInstitutionHolidays`).
  - `lib/holidays.ts`: COLLEGE filter, status, category styles.
  - `lib/calendar.ts`: month-grid helpers, now shared with the attendance calendar.
- **Month grid:** Monday first, with Previous / Next / Today and today ringed. Holidays are shaded, with their name in wide layouts and a dot in narrow ones.
- **Details panel** for the clicked date: name, date, type (backend category, e.g. "General Holiday"), calendar and source. The backend sends no description or cohort, so none are shown.
- **Upcoming holidays:** the next 6 from today, across this year and next.
- **Categories** are coloured from the backend's `category` value. GENERAL_HOLIDAY is orange; any new category gets its own colour and its label as sent.
- **Three distinct states:**
  - **Not published:** the backend returned only government rows, which it does only for a year with no college calendar.
  - **No entries:** an empty response. The page says the ERP doesn't tell whether that year is published.
  - **Error:** shown with a Try again button.
  - A published month with no holidays shows "No holidays in ‹month›".

### Attendance calendar (`components/attendance/MonthCalendar.tsx`, `app/dashboard/attendance/page.tsx`)
- The "Holidays: calendar not available yet" placeholder is gone.
- College holidays from the same hook are shaded, and a selected holiday shows "College holiday: ‹name›" above that day's classes.
- Display only: which classes are listed and whether attendance can be taken are unchanged.

### Verified (2026-10-20)
- **Checks:** `tsc` passes; `next build` passes. `eslint` shows only the same 5 old issues (`lib/axios.ts`, `auth-provider`, `notifications`).
- **Logic tests** (scratch Node script, 20/20), covering:
  - registration rules: unknown requirements, compulsory missing, per-group electives, extras ignored, count-only never completes, dropped / inactive rows not counted;
  - calendar dates: leap years 2000 / 2024 / 2100, 2026 month lengths, Monday-first blanks, year rollover;
  - holiday status: published, not-published, no-entries;
  - local paging.
- **Live browser tests** (headless Chrome, real backend):
  - **HOD 22/22 + 1:**
    - no requests before a class is chosen;
    - 63 unique students, each count matching the backend;
    - pages 1 + 2 with no repeats;
    - status filter over the whole class;
    - detail lists all 12 offered courses; Manage → Back works;
    - **Enroll Section run for real** on a course where everyone was already enrolled ("0 newly enrolled", so no data changed), and the table refetched;
    - cohort / semester resets;
    - catalog: server paging, Sem 3 = exactly 12 subjects, a multi-semester subject under each semester, search / type combined;
    - holidays; attendance calendar;
    - a class with no enrollments (2026-2030 A, Sem 2): 10 students all Not Registered, 14 missing courses in the detail.
  - **STAFF + STUDENT 19/19:**
    - the holiday calendar for each role: Oct 2026 data, upcoming list, January 2026 Pongal details, Feb 2026 = 28 days, Feb 2028 = 29 days;
    - the three states (2025 not-published, 2027 no entries, a forced API failure then Try again);
    - Today button; attendance calendar holiday note;
    - students make no `/users`, `/batches` or class-list calls.
  - **Responsive:** no page overflow at 390 / 1024 / 1440; light and dark screenshots reviewed.
  - No console errors and no failed API calls in any run.
- **Not run:** a real enrollment status change (Drop / Reactivate) and a real Enroll One Student submit, because they would change backend data. The buttons and dialogs were opened.

### Known issues / notes
- All current classes show Requirements Unknown or Not Registered until the backend supplies curriculum requirements. This is intended.
- The class list depends on the gradebook feature being on in the backend. If it is off, the fallback warning appears.
- Enroll One Student still lists only students already enrolled in another subject of the section (unchanged behaviour). Students with no enrollments can be added with Enroll Section.
- The staff dashboard's upcoming classes still ignore holidays (unchanged).
- `useUsersWithRole` still filters roles in the browser, although `/users?role=` now exists (unchanged; can switch later).

### Backend requirements discovered (none implemented here)
1. **Registration requirements (curriculum).** `GET /curriculum/requirements?batchId=&semester=&sectionId=` (suggested path), returning:
   ```json
   { "batchId": 2, "semester": 3, "compulsorySubjectIds": [11, 12, 13],
     "electiveGroups": [{ "id": 1, "name": "Elective Group I", "minSelections": 1, "subjectIds": [21, 22, 23] }] }
   ```
   - Needs tables for a curriculum per cohort + semester: compulsory subjects, plus elective groups with options and a minimum.
   - Alternatively, an `elective_group_id` / `is_elective` on subject offerings.
2. **Authoritative registration status (preferred).** `GET /course-enrollments/registration-status?batchId=&semester=&sectionId=&status=&page=&size=`, paged by **student**. Each item:
   ```json
   { "studentId": 1, "registerNumber": "REG2024A001", "studentName": "…", "sectionName": "A",
     "registeredCount": 5, "status": "ALL_REGISTERED | INCOMPLETE | NOT_REGISTERED | REQUIREMENTS_UNKNOWN",
     "compulsory": { "registered": 5, "required": 5 }, "electives": { "satisfied": 1, "required": 1 } }
   ```
   - Plus a per-student detail with each compulsory subject and each elective group's selections.
   - This replaces loading every enrollment and doing the work in the browser.
3. **Section student roster.** `GET /sections/{id}/students` (or `/students?sectionId=`): every active student, with or without a login (studentId, registerNumber, name, section, status).
   - Today the frontend borrows the internal-marks endpoint for this.
4. **Enrollment semester filter.** `semester` (and `batchId`) on `GET /course-enrollments`.
5. **Subject catalog offering filter.** `GET /subjects?semester=&batchId=` (subjects with an active offering), plus the semesters each subject is offered in, so filtering and paging stay on the server.
6. **Holiday calendar fields.**
   - **Publication status:** e.g. `GET /holidays/calendars/{year}` → `{ year, published, publishedAt }`, so an empty year can be told apart from an unpublished one.
   - **Optional per holiday:** `description`, a finer `category` (e.g. NATIONAL_HOLIDAY, STATE_HOLIDAY, INSTITUTION_HOLIDAY, ACADEMIC_BREAK) and, if holidays can be cohort-specific, `appliesTo` (batch / section ids).
   - The frontend already colours any new category; it would show description / appliesTo once they exist.

### Next steps
- Backend items 1–3 first. Then set `REQUIREMENTS` from the new endpoint, or switch the table to item 2 and drop the in-browser assembly.
- Switch the catalog to item 5 when available.
- Add holiday awareness to the staff dashboard's upcoming classes.

## Phase: Cleanup + workflow redesign (2026-10-12, second pass)

Frontend only. **No backend code was changed.** Not committed.

### Decisions (agreed before building)
- **Users tabs:** Admins and Faculty load every page of `/users` and filter by role in the browser. This is isolated in `useUsersWithRole` (hooks/useUsers.ts) so it can be swapped for a server-side role filter.
  - Students are NOT rebuilt from the generic user list. The view shows Cohort → Section, then a "not available yet" state.
- **No class average %.** A mean of student percentages can mislead, so it isn't calculated. Only backend figures are shown: each student's %, below-threshold counts, finalized classes.
- **Holidays:** the backend's current `/holidays` (national / Tamil Nadu) is NOT used. The tab shows "Holiday calendar not available yet." No holiday list in the frontend, no API call.
- **Account email/password** forms are built but disabled (flag `features.accountSelfService`).
- **Staff "Things to Complete":** marks-entry reminders show a not-available state. Only real draft attendance sessions are listed.
- **Portfolio Analytics** is off (flag `features.portfolioAnalytics`). The code is kept.

### Cohort-first rule (HOD department views)
- **`components/academic/ContextGate.tsx`:**
  - `missingContext(ctx, upTo)` returns "Select a cohort to begin." / "Select a semester." / … until the context is complete.
  - `ContextPrompt` is the empty state.
- **`AcademicContextFilter`:** changing a level now clears every level after it. The cohort choice is never "All cohorts".
- **Gated (no list request until chosen):**

  | Page | Requires |
  |---|---|
  | Timetable grid | Cohort, semester, section |
  | Timetable Slot List | Cohort, semester, section; faculty / day narrow further |
  | Attendance | Cohort, semester, section |
  | Assessments (HOD) | Down to subject (backend filters by course only) |
  | Enrollments | Section |
  | Results → All Results | Section (Cohort → Semester → Section → Subject, then exam / status) |
  | Courses | Cohort, semester (wording updated) |

  Internal Marks and the Results sheet were already pickers that load nothing until chosen.
- **Not gated:** students' and faculty's own views.

### Timetable
- **Period schedule now comes from the backend** (`GET /timetable/periods` via `usePeriodSchedule`). `lib/academic-periods.ts` holds no times any more; every helper takes the schedule.
- **Class view** requests `batchId + semester + sectionId` only.
- **Slot List** is limited to one class.
- **Holidays tab:** "not available yet" state (see Decisions).

### Attendance (rebuilt: `app/dashboard/attendance/page.tsx`, `components/attendance/*`)
- **HOD tabs:** Overview, Calendar, Session Log (read-only).
  - **Overview:** "Overall Attendance" or one subject.
  - Overall: "Classes conducted" bars and "Class summary by subject" (below threshold, total students), plus a note that class % is not provided.
  - One subject: tiles and the student table (% with inline bar, threshold).
- **Calendar:** month calendar (today, selected day, days with classes; holidays noted as unavailable), then that day's timetable with Break / Lunch rows.
  - A class's status shows Finalized, Draft or Not recorded. Clicking a recorded class opens the session page.
  - **HOD:** a class with no attendance shows "No attendance has been recorded…".
  - **Faculty:** a class with no attendance shows Take Attendance, which creates the session for that slot and date, then opens it.
  - Attendance recorded on a day for a class with no timetable slot that day is listed under "Other attendance recorded on this day" (never hidden).
- **Faculty tabs:** My Classes (calendar on `/timetable/me`; only their classes), Overview (their courses), Session Log (with Create Session).
- **Student tabs:**
  - **Overview:** subject dropdown; % bars per subject with a tick at the minimum; "Classes conducted vs attended" bars; summed counts.
  - **Calendar:** own timetable. Clicking a class shows that subject's own figures; per-class status isn't available from the backend.
  - Students never call session or class endpoints.

### Account menu + settings
- **`components/layout/AccountMenu.tsx`:** the sidebar user card and the top-bar avatar open the same menu (Account Settings, Notifications, Log out).
  - Portal-rendered, closes on Escape / outside click / resize. Only one is open at a time. It closes the phone drawer on navigate.
- **`/dashboard/settings`:** account info (read-only), Change email, Change password.
  - Forms are disabled until the backend endpoints exist (`services/api/account.service.ts`, `PUT /auth/me/email`, `PUT /auth/me/password`).
  - After a password change the app signs out and the login page shows "Your password was changed…" (`?notice=password-changed`).

### Fees (student)
- Grouped by academic year, with expandable rows:
  - Summary columns: year, study year (from semester), payable, paid, balance.
  - Detail columns: particular, actual, concession, payable, paid, balance, due date, status.
- **Year subtotals** are sums of the backend's own per-charge amounts, added in paise (no float drift). Each balance is the backend's.
- **Concession shows "—":** the backend has no concession field.
- No fees: "No fee structure configured."

### Staff dashboard (`components/dashboard/StaffDashboard.tsx`)
- Replaces the department-wide view for STAFF only. HOD and student dashboards are unchanged.
- **Metrics:** Today's classes, Weekly classes, Attendance to finalize (draft sessions), Pending marks entry ("—", not tracked).
- **Upcoming Classes:** next 6 classes over 7 days from `/timetable/me`, labelled Today / Tomorrow / date.
- **Things to Complete:** real draft sessions, plus the marks-entry not-available state.

### Users (`/dashboard/users`) — HOD only
- STAFF lost the sidebar link, and the route redirects before any `/users` call.
- **Tabs:** Admins (default), Faculty (staff code, designation, email, status), Students (see Decisions).
- **Single role:**
  - Radio buttons: HOD / Faculty / Student. Create offers HOD / Faculty only.
  - Saving sends `roles: [one role]`. Old multi-role accounts get a warning that saving keeps one.
  - One role badge everywhere (`lib/user-roles.ts`). STAFF displays as "Faculty" (also in `ROLE_LABEL`).

### Portfolio Analytics
- `features.portfolioAnalytics.enabled = false` (`lib/feature-flags.ts`).
- The link is removed for HOD and STAFF.
- `/dashboard/portfolio/analytics` redirects to Portfolio Review before mounting the view, so `/portfolio/summary` is never called.
- Portfolio Review is unchanged.

### Verified (2026-10-12)
- **Checks:** `tsc` and `next build` pass. `eslint` shows the same 5 old issues only (`lib/axios.ts`, `auth-provider`, `notifications`).
- **Live tests** (headless Chrome scripts, real backend):
  - **HOD 35/35:** gating with no early requests, clearing dependents, grid, Slot List, Holidays with no call, attendance overview / subject / calendar / day / session, Users tabs and radio, Students state, settings, same menu from both entry points, analytics redirect with no call, gated Assessments / Enrollments / All Results.
  - **STAFF + STUDENT 23/23:** staff dashboard (no `/dashboard/summary`), no Users (no `/users` call), analytics redirect, own timetable, My Classes calendar (`/timetable/me` only), Take Attendance offered (not submitted), Session Log; student overview / subject / calendar (no session calls), fee expansion, courses, `/users` blocked, settings.
  - **Responsive 48/48:** no page-level horizontal overflow at 1920 / 1440 / 1024 / 390 for the attendance views, timetable, users and role dialog, settings, staff dashboard and student fees. Dark-mode screenshots reviewed.
- No console errors in any run.

### Known issues / notes
- The backend fee data is still the old seed (e.g. Tuition ₹45,000, Exam ₹1,500). The UI shows whatever the backend returns.
- The calendar marks class days from the weekly timetable (no term start/end dates); holidays aren't marked yet.
- Escape on the account menu could only be verified with a DOM key event. The headless CDP key events don't reach the page in this setup.
- The sidebar card's second line is the user's designation, or the role if empty. It is shown uppercase by the existing CSS.

### Backend requirements discovered (none implemented here)
1. **Institution holiday calendar.** An endpoint for the college's own calendar: date, name, category ("General Holiday"), filterable by year/month.
   - One row per day; no national/state duplicates.
   - Must include the supplied 2026 list, incl. Project Day (23 Jan) and Legislative Assembly Election (23 Apr).
   - The current `/holidays` (NATIONAL / TAMIL_NADU feed) does not meet this.
2. **Attendance by day.** `GET /attendance/day?date=&sectionId=` (HOD) and `?date=` (faculty, own classes): that day's slots with their session (id, status) if any, holiday flag.
   - Today the frontend joins the timetable and sessions itself.
3. **Student's own per-class status.** `GET /attendance/me/day?date=` returning the student's own status per class. Never other students.
4. **Attendance summaries.** A class-level aggregate per course and per class (Σ attended ÷ Σ eligible, conducted classes, students below threshold, total students). Optionally a student's overall % across subjects.
5. **Class averages.** An authoritative average attendance % per subject for a class, from aggregate counts.
6. **Self-service account:**
   - `PUT /auth/me/email` {currentPassword, newEmail}: validation, duplicate-email 409 with message.
   - `PUT /auth/me/password` {currentPassword, newPassword}: rules enforced, tokens revoked.
   - Then set `features.accountSelfService.enabled = true`.
7. **Fee structure.** Replace the seed with Year 1 (Tuition 130,000; Placement Value Added Course 25,000; Book Fee 25,000; e-learning 25,000 = 205,000) and Year 2 (Tuition 130,000; e-learning 25,000; Culturals and Events 1,525 = 156,525). No Year 3/4.
   - Expose per particular: actual, concession (default 0), payable, paid, balance; per-year totals; student year.
8. **Staff dashboard.** An upcoming-classes endpoint (optional; the frontend uses `/timetable/me`) that knows holidays and term dates. A faculty task list.
9. **Marks-entry deadlines / reminders.** Windows per assessment type (CAT 1, CAT 2, Assignment, Practical, Result) per course, with due date and completion state. Only the faculty member's own courses; completed tasks drop out.
10. **Single-role users.** Accept and return exactly one role (e.g. `role: "STAFF"`), reject multiple, migrate multi-role accounts. Restrict `/users` to HOD (STAFF currently has VIEW_USERS).
11. **Role-filtered users / student lookup:**
    - `GET /users?role=HOD|STAFF` (server-side, paged).
    - `GET /students?batchId=&sectionId=&search=` returning register no., name, login email, cohort, section, status.
12. **Portfolio analytics flag.** Optionally a backend `features.portfolio-analytics.enabled` so `/portfolio/summary` answers 404 while off. The frontend flag already blocks it.

### Next steps
- Turn each backend item above into a backend task, then:
  - wire the Holidays tab and calendar shading;
  - switch Users to server-side role filters and add the Students list;
  - enable the account forms;
  - add class % and the "total vs present" graph for classes;
  - fill Things to Complete.

## Phase: Courses + timetable redesign (2026-10-12)

Frontend only. **No backend code was changed.** Not committed.

### Navigation
- **HOD → Academics:** Courses, Timetable. Subjects, Subject Offerings, Enrollments and Lesson Plans are gone from the sidebar.
- **STAFF → Teaching:** My Courses, My Timetable, Attendance, Assessments, Internal Marks, Results. The separate Subjects / My Offerings / Class Rosters links are gone.
- **STUDENT → Academics:** My Courses, Timetable, My Attendance, My Grades, Internal Marks.
- Lesson Plans is removed for every role. Its service, hooks and types are still in the code, unused.

### Courses (`/dashboard/courses`, tabs in `?tab=`)
- **HOD tabs:** Class Courses | Enrollments | Subject Catalog. **STAFF tabs:** My Courses | Class Rosters (read-only). **STUDENT:** own courses, with a semester filter built from their own enrollments.
- **Class Courses filters:** Cohort → Semester → Section → Subject, plus Type and Status.
  - Cohort + semester: one row per subject (code, subject, type, credits, sections, status).
  - Add a section: shows who teaches each course.
  - Pick a subject: detail per section (faculty, academic year, enrolled, assessments, sessions held, students below the attendance minimum). These figures come from the roster, assessment and attendance-summary endpoints.
- The semester list shows only the courses that **exist in backend offerings**. No curriculum is invented on the frontend.
- **Assign Course** (HOD) replaces "Create Subject Offering". Order: Cohort → Semester → Section → Subject → Faculty → Academic Year.
  - It suggests the academic year already used for that semester.
  - Backend lock messages (e.g. "has assessments") are shown as returned.
- **Code moved, not deleted:**
  - Subjects page → `components/courses/SubjectCatalog.tsx`
  - Offerings page → `ClassCourses.tsx` + `CourseAssignForm.tsx`
  - Enrollment page → `Enrollments.tsx`

### Shared academic filter
- **`components/academic/AcademicContextFilter.tsx`:** Cohort → Semester → Section → Subject. Each dropdown only offers what is valid for the choices before it.
  - **`OfferingPicker`:** the same filter, used when exactly one class course must be chosen.
  - **Helpers:** `lib/academic-context.ts`.
  - **`useCohortsIn`:** lists only active backend cohorts that actually have records.
- **Cohorts always come from `/batches`**, never from a hardcoded year list. Students never call `/batches`.
- **Used in:** Courses, Enrollments, Internal Marks, Assessments, Attendance (sessions and class summary), Results (after picking the exam period), the Timetable grid and list, and the Assessment, Attendance-session and Timetable-slot forms. The long "Subject — Batch · Section — Sem — Year" dropdowns are gone; Feedback's target picker is unchanged.
- **Partial filters:** where the backend can only filter by course or section (assessments, sessions, enrollments), choosing only a cohort or semester shows a note instead of pretending to filter.

### Timetable
- **The period schedule lives in one place: `lib/academic-periods.ts`.** It is marked TEMPORARY until the backend serves one. Rows: P1–P8, plus Break and Lunch rows styled as non-teaching.
- **Layout:** Mon–Fri; Saturday/Sunday appear only if the data has classes on them. Multi-period labs span rows. Today's column is highlighted. Phones get day tabs.
- **HOD:**
  - View by class (Cohort → Semester → Section) or by faculty.
  - Click a free cell to add a class there (pre-filled). Click a class to edit or delete it.
  - The old list is now the secondary **Slot List** tab: deleted slots, plus a "Non-standard" badge for times outside the standard periods.
- **Slot form:** pick a period or a period range (labs). "Custom times" keeps slots outside the standard periods possible.
- **Slots that don't fit the periods are never hidden.** They appear in an "Other times" card under the grid and in the Slot List.
- **STAFF / STUDENT:** the same grid from `/timetable/me`, read-only.
- **Holidays tab** (all roles) shows: "Holiday calendar will appear once holiday data is available." No API call and no fake data.

### Old routes (redirects)
- `/dashboard/subjects` → `/dashboard/courses?tab=catalog`
- `/dashboard/subject-offerings` → `/dashboard/courses`
- `/dashboard/course-enrollment` → `/dashboard/courses?tab=enrollments`
- `/dashboard/lesson-plan` → `/dashboard/courses`
- The HOD dashboard's student card now links to Courses → Enrollments.

### Backend changes picked up during this phase
The separate backend task changed the running backend while this was being built. The frontend now handles those changes:
- **Subject type:** may be `PROJECT_BASED` ("Project based") or `null` ("Not classified").
- **Credits:** subjects and offerings now carry `credits`. The Credits column and field appear **only when the backend sends credits**; null shows "—".
- **Subject edit form:** always sends credits back, because the backend's PUT replaces the whole subject. Otherwise saving would wipe credits.

### Verified (2026-10-12)
- **Checks:** `tsc` and `next build` pass. `eslint` shows only the same 5 issues as before, all in files this phase didn't touch.
- **Live test** against the real backend, using headless Chrome:
  - **HOD:** Courses (all three cases, Assign dialog, tabs), the 4 redirects, Timetable (class and faculty views, add/edit pre-fill, Slot List, Holidays), and the new selectors on Internal Marks, Assessments, Attendance and Results.
  - **STAFF:** courses, rosters, timetable, the new selectors, and the Assessment form.
  - **STUDENT:** `reg2023a058@student.erp.com` has 14 courses and 28 timetable classes. `aarav.sharma1@student.erp.com` has no enrollments in the backend, so it correctly shows empty states.
- **Screens:** 1920 / 1440 / 1024 / 390 px, light and dark. No page-level horizontal overflow and no console errors. At 1024 px the timetable grid fits with no scrolling.

### Known issues / notes
- Headless logins sometimes got a 500 from `/api/auth/login` on the first try; a retry worked. Curl logins never failed. This may be a backend issue; worth checking.
- `components/erp/WeeklyTimetable.tsx` is no longer used (replaced by `components/timetable/PeriodGrid.tsx`). Not deleted; remove it when you're happy.
- **Not used yet:** the new backend endpoint `GET /subject-offerings/{id}/summary`. The course detail builds its figures from existing endpoints; it could switch to the summary endpoint once that is final.

### Next steps
- Replace `lib/academic-periods.ts` with the backend period schedule once it exists.
- Connect the Holidays tab and holiday shading on the grid to backend holiday data.
- Delete `WeeklyTimetable.tsx` and the unused Lesson Plan frontend files (needs your OK).

## Fix: desktop shell width (2026-10-11)

Layout only. No logic, routes, API or role changes.
- **Cause:** the shell copied Forma's demo sizing. `.shell { max-width: 1550px; margin: 32px auto }`, plus `margin: 40px auto` at ≥1450 px, made the ERP a centred 1550 px island with big empty sides on wide monitors.
- **Now:** the shell fills the viewport minus a gutter (`--shell-gap` in `globals.css`). Sidebar width doesn't change with screen size; the main area takes the rest. No `zoom`/scale tricks.

- **Update (same day):** the gutter is now one fluid value on all four sides, `clamp(16px, 0.83vw + 4px, 28px)`:

  | Viewport | Gutter | Shell width |
  |---|---|---|
  | 1366 / 1440 px | 16 px | |
  | 1920 px | 20 px | 97.9% |
  | 2560 px | 25 px | 98.0% |
  | ≤700 px | none | full screen, no shadow |

  The sidebar is 235 px (213 px below 1200 px) at every size. The shell shadow (`--shadow`) is now a soft two-layer shadow in both themes.

- **Stray scrollbar fixed:** `body` is now `display: flow-root`. Before, the shell's margin leaked through `<body>` and made the page one gutter taller than the window, adding a second outer scrollbar.
- **Filter selects** (`.f-select` without `w-full`) are capped at 380 px, so long offering names don't stretch toolbars.
- **New `col-fit` class for table headers:** the column shrinks to its content. Used on Enrollments (Register No., Class, Status, Subject Code, Semester) so wide screens give the extra room to text columns.
- Checked at 2560×1440, 1920×1080, 1600×900, 1440×900, 1366×768, 1024×768 and 390×844, for HOD / STAFF / STUDENT, light and dark. No page-level overflow, no console errors.

## Phase: Forma visual redesign (2026-10-11)

The whole frontend was restyled to the **Forma** design (reference: `frontend.md`, a vanilla HTML/CSS/JS demo). Only the look changed.
- **No backend code was changed.** No API calls, services, hooks, query keys, auth/JWT handling, routes or `RequireRole` guards were changed.
- **No demo data was added.** Every number, table and dropdown still comes from the backend. Forma's sample users and figures are not used anywhere.
- **No `forma-demo` storage.** The only thing kept in the browser is the theme choice (`forma-theme` = `light` / `dark`).
- **My Profile was not touched.** This frontend still has no My Profile page.
- Not committed.

### How the design is wired
- **Tokens:** `src/app/globals.css` defines Forma's colors as CSS variables, light on `:root` and dark on `.dark`. Tailwind utilities read them: `bg-surface`, `bg-soft`, `bg-side`, `text-fg`, `text-muted`, `border-line`, `text-accent` / `bg-accent-soft`, `text-ok` / `bg-ok-soft`, `text-warn` / `bg-warn-soft`, `text-danger` / `bg-danger-soft`.
  - **Red (`danger`) is our own addition.** Forma has no error color; it's styled the same soft way.
  - **Never use hex colors in pages.** Use the tokens, or dark mode breaks.
- **Forma component classes** also live in `globals.css`: shell, sidebar, topbar, page-heading, metrics, panel, badge, `f-btn`, `f-control`, `f-select`, `f-table`, tabs, modal, toast, login. The responsive and short-screen rules sit at the end, outside the layer on purpose; the comment there explains why.
- **Font:** DM Sans via `next/font/google` in `app/layout.tsx`.
- **Dark mode:** `providers/theme-provider.tsx` (`useTheme`). A tiny script in `<head>` applies dark mode before first paint.
- **Toasts:** `providers/toast-provider.tsx` (`useToast`). `SuccessNote` stays on screen and also shows its text as a toast.

### Shared components (same props as before, so pages didn't need logic changes)
- **New:**
  - `components/ui/icons.tsx`: Forma's SVG icons. It keeps the old lucide names, e.g. `Plus` or `Trash2`, so pages only swapped the import. Lucide is still in `package.json` but no longer used anywhere.
  - `components/ui/Dialog.tsx`: Escape and overlay click close it, focus stays inside, focus returns to the opener.
  - `components/ui/Tabs.tsx`
  - `lib/navigation.ts`: sidebar sections per role, page titles/subtitles, breadcrumb section, initials.
- **Restyled:** `Button`, `Badge`, `Card`, `Input`, `Table`, `Pagination`, `MetricCard` (+ `MetricGrid`), `Spinner`, `PageContainer` (Forma page heading, title taken from the route), `StatTile`, `ReadOnlyNote`, `SuccessNote`, `ConfirmBox`, loading / empty / error blocks.
- **Side panels are now dialogs.** `SidePanel` (gradebook/shared) renders a Forma dialog, and so do the Users and Audit Log panels. The Audit Log detail used to be desktop-only; it now works on phones too.
- **Shell:** `AppLayout` / `Sidebar` / `Header`.
  - Inset desktop shell; only the main area scrolls.
  - Sidebar is grouped by role. Administration, Notifications and Log out are pinned at the bottom.
  - On short screens the link list scrolls by itself, because the ERP has more modules than the demo.
  - Top bar: page title, section breadcrumb, role badge, theme toggle, notifications bell (dot shows when the backend reports unread notifications), initials avatar.
  - Phones (≤700 px): drawer menu.
- **Login:** Forma's two-column layout around the **real** email/password form. Phones get the compact wordmark only.

### Forma features intentionally not copied
- Role-picker demo login and sample identities (real login is kept).
- Ctrl-K search, department switcher, semester progress card, CSV export, Help & support. The backend doesn't support them.
- Demo data and browser-saved demo state.
- Forma's course-feedback category flow. Our feedback is backend form-based; it got the Forma styling instead.
- Brand text stays "Dept. ERP" (not "Forma").

### Verified (2026-10-11)
- `tsc --noEmit` and `next build` pass.
- `eslint`: 2 errors in `lib/axios.ts` and 3 warnings (`auth-provider`, `notifications`). All of these were already there before the redesign; those files weren't edited.
- Live test against the backend, using headless Chrome driven by a scratch script:
  - HOD, STAFF and STUDENT logged in with the seeded dev accounts. Every sidebar route was opened with no console errors and no failed requests.
  - Direct-route guards still redirect: STAFF and STUDENT are sent away from HOD-only pages, and signed-out users go to `/login`.
  - Saves through dialogs work, tested by saving without changes: users, timetable slot, assessment, portfolio entry (all `PUT → 200`).
  - Checked at 1440 / 1024 / 390 px, in light and dark mode.

### Known issues / notes
- **Gradebook was off in the backend.** The backend that was already running had been started with plain `spring-boot:run`, so `features.gradebook.enabled` defaulted to `false` and Assessments / Internal Marks returned 404 from the backend.
  - It was restarted with `FEATURES_GRADEBOOK_ENABLED=true`, same profile. Flyway reported "up to date", so no migrations ran.
  - To get it back after a restart, start it with that variable, or with the `dev` profile.
- Wide tables scroll sideways inside their panel, as Forma intends (e.g. My Portfolio, Fees).
- Some pages keep their own small uppercase field labels (e.g. Users details). Forma uses plain 11–12 px labels; this is a minor visual mismatch.

### Next steps
- Remove `lucide-react` from `package.json` once you're happy (needs your OK).
- Optional: unify the remaining per-page label styles.

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

## Phase: HOD Dashboard redesign (2026-10-11)

Frontend only. No backend code was changed.

### Done
- **HOD layout**: heading → 4 clickable KPI cards → full-width "Attendance by Academic Year" panel → "Average Marks by Academic Year" and "Students with Failures by Academic Year" panels. The two lower panels sit side by side from 1280 px wide and stack below that.
- **STAFF / STUDENT**: they keep the old dashboard. It's now the `GeneralDashboard` function in `app/dashboard/page.tsx`, with the same content as before.
- **KPI cards** (each one is a link):
  - Total Students → `/dashboard/course-enrollment`
  - Total Staff → `/dashboard/users`
  - Average Student Attendance → `/dashboard/attendance`
  - Unread Notifications → `/dashboard/notifications`
- **Failures panel**: counts distinct students with at least one published `FAIL` result in each year. It makes one `/results?sectionId&published=true&resultStatus=FAIL` request per active section and pages through all results. It does not poll. Its query key sits under `RESULTS`, so publishing results refreshes it.
- **Code**:
  - New: `components/dashboard/{HodDashboard.tsx, YearAnalytics.tsx, greeting.ts}`, `useFailuresByYear` in `hooks/useDashboardQuery.ts`, `QUERY_KEYS.DASHBOARD_FAILURES_BY_YEAR`.
  - Changed: `MetricCard` has an optional `href` and accepts any content as its value. Existing uses are unchanged.

### Decisions
- **"Total Staff", not "Total Faculty"**: the backend counts every active account with the STAFF role, and nothing marks which staff teach.
- **No year drill-downs**: the Attendance and Results pages filter by a single section only, so year bars aren't clickable. Each panel links to its module page instead.
- **Year grouping for failures**: each result's year comes from its subject offering's section → batch `currentYear`. The backend requires an enrolled student's batch to match the offering's batch. A live check of all 126 published results found 0 mismatches against the students' own sections.
- **Unsupported metrics**: Average Student Attendance, Attendance by Year and Average Marks by Year show a "Needs backend support" state with no numbers. Computing them on the frontend would need one request per subject offering or per assessment.

### Verification
- `tsc --noEmit` and `next build` pass.
- `eslint`: 2 errors and 3 warnings, all in files this phase didn't touch (`lib/axios.ts`, `auth-provider.tsx`, `notifications/page.tsx`).
- Tested headless as HOD at 2560, 1920, 1440, 1024 and 390 px, in light and dark:
  - No horizontal overflow and no console errors.
  - All 4 KPI links reach the right pages.
  - Blocking `/results` shows an error only in the failures panel.
  - The 11 results requests run once, with no polling.
- STAFF still sees the old dashboard and makes no `/results` calls.

### Known issues
- Keyboard Tab/Enter on the KPI cards wasn't automated, because headless Chrome ignored the synthetic key presses. The cards are native links and show the global focus outline. Worth a quick manual Tab check.
- On phones (390 px), long KPI titles are cut off with "…". This is existing `MetricCard` behaviour on every page.

### Remaining work
- Backend aggregates for: department-wide average student attendance, attendance by academic year, and average marks by academic year. Then wire them into `YearAnalytics.tsx` and the attendance KPI.

## Phase: Dark-mode contrast pass (2026-10-11)

Only `src/app/globals.css` changed. Light mode is unchanged.

### Done
- **New dark palette in steps, darkest first**:
  - outer background `#0d0f12`
  - sidebar `#111317`
  - main workspace `#15171b`
  - cards and dialogs `#1b1e23`
  - inputs and table headers `#22262c` / `#23272d`
  - hover `#282d34`
- **Text**: brighter primary text (`#f1f3f5`), secondary text `#a7adb6`, and a dimmer `--subtle` (`#858c96`) for nav labels, the footer and metadata.
- **Colours**: accent and the green, orange and red status colours all re-tuned for dark backgrounds.
- **New role tokens**: `--shell`, `--hover`, `--subtle`, `--placeholder`, `--nav-text`, `--nav-icon`, `--nav-active`, `--nav-active-text`, `--topbar-border`, `--btn`, `--btn-border`, `--btn-text`, `--control`, `--control-border`, `--control-border-hover`, `--table-head`, `--table-head-text`, `--row-hover`, `--badge-ring`.
  - In `:root` (light), each one equals an existing token, so light mode resolves to exactly the same colours.
  - `.dark` gives each its own value.
- **Bugs fixed**:
  - `--border-strong` and `--accent` had no dark values, so dark mode used the light `#c6c3cc` / `#9166cc`.
  - Outline badges also match Tailwind's `outline` utility (a 1px ring in the text colour). That ring was bright in dark mode; `--badge-ring` softens it there and keeps `currentColor` in light.
  - New input hover border rule. It skips invalid fields, so the red error border still wins.

### Verification
- `tsc` and `next build` pass. `eslint` shows the same 2 errors and 3 warnings as before, in untouched files.
- **Light-mode regression**: compared the computed colours of every element on 23 pages (login plus 22 HOD routes) between the original CSS and the new CSS, with animations off. 15,463 elements, 0 differences. A probe token confirmed each run loaded the intended stylesheet.
- **Dark review** at 1920, 1440 and 390 px:
  - Covered tables, inputs and selects, a dialog, tabs, pagination, badges, the active nav item, and the login page.
  - Hover states were checked with DevTools' forced `:hover`, because headless Chrome ignores synthetic mouse moves.
- **Contrast**: all text pairs are ≥ 4.5:1 except placeholders (4.19:1).

### Known issues
- On the login page, the story card (`--side`) is only slightly lighter than the page background. It's separated mainly by its border.
