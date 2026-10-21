# ERP API Contract — Frontend ⇄ Backend

**The one shared copy:** `C:\Users\laksh\Documents\Java ERP\Front end\erp_java-frontend\docs\ERP_API_CONTRACT.md`. Both agents edit this file and no other copy. The backend repo has no copy; if one is ever needed, copy this file and note the date here.

**How an endpoint moves through this document:**
- **PROPOSED:** written by the frontend, not agreed yet.
- **CONFIRMED:** the backend has accepted it, possibly with edits. The frontend builds against it.
- **IMPLEMENTED:** the backend has shipped it and the frontend has verified it against the running server.

**Rules:**
- The backend may rename paths, extend an existing API instead of adding a new one, or change shapes. Edit the section directly and record the change in the Change log at the end.
- The frontend does not rely on a PROPOSED endpoint. It only prepares types and a service behind a fallback.

| # | Area | Status |
|---|---|---|
| A | Section student roster | IMPLEMENTED (reads verified by frontend 2026-10-21; writes not yet exercised) |
| B | Curriculum configuration | IMPLEMENTED (reads verified by frontend 2026-10-21; writes not yet exercised) |
| C | Registration status (authoritative) | IMPLEMENTED (reads verified by frontend 2026-10-21; writes not yet exercised) |
| D | Subject catalog: server-side offering filter | IMPLEMENTED (reads verified by frontend 2026-10-21; writes not yet exercised) |
| E | Holiday calendar: management and publication | IMPLEMENTED (reads verified by frontend 2026-10-21; writes not yet exercised) |
| F | Staff dashboard: holiday-aware upcoming classes | No new API (uses E) |
| G | Staff teaching context (Batch → Semester → Class) | CONFIRMED (backend edits) — implemented on :8080 2026-10-21 |
| H | Staff results: read-only, Batch → Semester → Exam | CONFIRMED (backend edits: COE role) — implemented on :8080 2026-10-21 |
| I | Assessments: overview, marks entry, finalization | CONFIRMED (backend edits) — implemented on :8080 2026-10-21 |
| J | Assessment import / export | CONFIRMED (backend edit: server preview + confirmed apply) — implemented on :8080 2026-10-21 |
| K | Portfolio Review STAFF filter | No API change |
| L | Test data on the dev DB | Backend finding + rule for both agents |

---

## 0. Conventions (existing, unchanged)

- **Base path:** `/api` (the frontend proxies `/api/*` to the backend).
- **Authentication:** `Authorization: Bearer <accessToken>` (JWT from `POST /auth/login`). Roles are checked with `@PreAuthorize`: `HOD`, `STAFF`, `STUDENT`.
- **Response envelope:** every endpoint, success or error, returns:
  ```json
  { "success": true, "message": "…", "data": { }, "errors": ["field: message"], "timestamp": "2026-10-20T10:00:00" }
  ```
  `errors` appears only on validation failures.
- **Pagination:** `?page=0&size=N`, zero-based. `data` is the snake_case `PagedResponse`:
  ```json
  { "content": [ ], "page": 0, "size": 50, "total_elements": 63, "total_pages": 2, "last": false }
  ```
  Item fields inside `content` are camelCase.
- **Errors (GlobalExceptionHandler):**

  | Status | When | Body |
  |---|---|---|
  | 400 | Validation, bad enum / date / paging, business rule | `message` + optional `errors[]` (`"field: message"` or `"electiveGroups[1].requiredSelections: …"`) |
  | 401 | Missing, invalid or revoked token | `message` |
  | 403 | Wrong role, or not your resource | `message` |
  | 404 | Unknown id | `message` |
  | 409 | Duplicate / unique constraint, or stale `version` (optimistic lock) | `message` |

  The frontend shows `message` and lists `errors[]` as returned. Backend validation is the source of truth.
- **Dates and times:** dates `yyyy-MM-dd`; timestamps ISO local date-time.
- **Registration rule (shared definition):** an enrollment *counts* only when its `status` is `ENROLLED` or `COMPLETED` **and** its subject offering is active. `DROPPED` rows and rows on deactivated offerings never count.

---

## A. Section student roster — CONFIRMED

**Replaces** the frontend's temporary use of `GET /subject-offerings/{id}/internal-marks` (gradebook) as a class list. Does not depend on the gradebook flag.

**Path:** `GET /sections/{sectionId}/students`. This sits next to the existing `GET /sections` in `AcademicStructureController`.

- **Roles:** HOD (any section). STAFF: only sections where they are the assigned staff of at least one **active** subject offering (the existing portfolio review scope); other sections → 403. STUDENT → 403.
- **Query:**

  | Param | Type | Default | Notes |
  |---|---|---|---|
  | `page` | int | 0 | |
  | `size` | int | 100 | max 200 |
  | `active` | boolean | `true` | `false` = inactive only; omit for active only |
  | `search` | string | — | name or register number, case-insensitive |

- **Sort:** `registerNumber` ascending (then `studentId`).
- **Response:** a `PagedResponse` of:
  ```json
  { "studentId": 575, "registerNumber": "REG2023A058", "name": "Aashika M",
    "batchId": 2, "batchName": "2025-2029", "sectionId": 5, "sectionName": "A",
    "active": true, "userId": 13 }
  ```
  `userId` is null when the student has no ERP login. Students **are** returned whether or not they have a login or any enrollment.
- **Errors:** 404 for an unknown section.

---

## B. Curriculum configuration — CONFIRMED (backend edits)

There is one curriculum per **cohort (batch) + semester**. It holds:
- **Compulsory subjects:** each must be registered.
- **Elective groups:** each is "choose `requiredSelections` of these options".

Subjects not in the curriculum are optional extras and never affect completeness. The backend seeds **no** curriculum: every cohort starts `configured: false` until the HOD saves one.

### Model
```json
{
  "batchId": 2, "batchName": "2025-2029", "semester": 3,
  "configured": true,
  "version": 4,
  "updatedAt": "2026-10-20T10:00:00", "updatedBy": "Dr Kumar",
  "compulsorySubjects": [ { "subjectId": 11, "code": "2321CSC301T", "name": "Computer Networks", "subjectType": "THEORY", "credits": 3 } ],
  "electiveGroups": [
    { "id": 7, "name": "Elective Group I", "requiredSelections": 1, "displayOrder": 1,
      "options": [ { "subjectId": 21, "code": "…", "name": "Machine Learning Techniques", "subjectType": "THEORY_CUM_PRACTICAL", "credits": 3 } ] }
  ]
}
```
- `configured: false` means nothing is saved for this cohort + semester. The lists are then empty and `version`, `updatedAt`, `updatedBy` are null.
- *(Backend edit)* A saved curriculum is never empty: it has at least one compulsory subject or one elective group (see validation). To remove a curriculum, use `DELETE`.
- `displayOrder` = position of the group in the last saved request (1-based). Subjects are listed in request order.

### Endpoints

| Method | Path | Roles | Body | Returns |
|---|---|---|---|---|
| GET | `/curricula/batches/{batchId}/semesters/{semester}` | HOD, STAFF | — | Curriculum (200, also when `configured: false`) |
| PUT | `/curricula/batches/{batchId}/semesters/{semester}` | HOD | CurriculumRequest | Curriculum (saved) |
| DELETE | `/curricula/batches/{batchId}/semesters/{semester}` | HOD | — | Curriculum with `configured: false` *(backend addition)*; 404 if none is saved |

- Unknown batch → 404. `semester` outside 1–8 → 400.

**CurriculumRequest.** This is a whole-document replace, done atomically (nothing is saved if any check fails):
```json
{
  "version": 4,
  "compulsorySubjectIds": [11, 12, 13],
  "electiveGroups": [
    { "id": 7, "name": "Elective Group I", "requiredSelections": 1, "subjectIds": [21, 22, 23] },
    { "id": null, "name": "Elective Group II", "requiredSelections": 2, "subjectIds": [31, 32, 33, 34] }
  ]
}
```
- `version`: null when creating. It must equal the stored version otherwise, or the backend returns 409 (also 409 when `version` is null but a curriculum already exists, or set but none exists).
- Group `id`: null for a new group; an existing group keeps its id. A stored group missing from the request is deleted. An `id` that does not belong to this curriculum → 400.

**Validation** (400, with one `errors[]` entry per problem):
- *(Backend edit)* At least one compulsory subject or one elective group.
- Every subject id exists and is active.
- *(Backend decision)* Every subject has an **active subject offering for this batch + semester** (any section).
- No duplicate within `compulsorySubjectIds`.
- `name` is non-blank, at most 100 characters, and unique within the curriculum (case-insensitive).
- `subjectIds` has no duplicates and at least **2** entries *(backend edit: a one-option group is a compulsory subject)*.
- `requiredSelections` is at least 1 and no more than the number of options.
- A subject appears in only **one** place in a curriculum: compulsory, or exactly one elective group (also enforced by a DB unique key).
- At most 30 compulsory subjects, 10 elective groups, 30 options per group.

---

## C. Registration status (authoritative) — CONFIRMED (backend edits)

The backend calculates status. The frontend only displays it.

**Status values:**

| Value | Meaning |
|---|---|
| `ALL_REGISTERED` | All compulsory subjects registered **and** every elective group has ≥ `requiredSelections` registered options |
| `INCOMPLETE` | At least one counted registration, but a requirement is unmet |
| `NOT_REGISTERED` | No counted registration in this cohort + semester (applies whether or not a curriculum exists) |
| `REQUIREMENTS_UNKNOWN` | Has registrations, but no curriculum is configured (`configured: false`) |

Registrations are the counted enrollments (see §0) on offerings of the given batch + semester (any section of the batch). A subject counts once even with two counted enrollments. `ALL_REGISTERED` is never returned without a configured curriculum.

### C1. List (one row per student) — `GET /course-enrollments/registration-status`

- **Roles:** HOD.
- **Query:** `batchId`*, `semester`* (* = required), plus `sectionId` *(backend edit: optional; omitted = the whole cohort)*, `registrationStatus` *(backend edit: renamed from `status`; one value above)*, `search` (name or register number), `page`, `size` (default 50, max 200).
- **Who is included:** every active student of the batch (and section, if given), including students with zero enrollments. Each student appears exactly once.
- **Sort:** `registerNumber` ascending. `registrationStatus` and `search` filter the whole class **before** paging; `total_elements` counts the filtered rows.
- **Response:** a `PagedResponse` of:
  ```json
  { "studentId": 575, "registerNumber": "REG2023A058", "studentName": "Aashika M",
    "batchId": 2, "batchName": "2025-2029", "semester": 3, "sectionId": 5, "sectionName": "A",
    "registeredCount": 12,
    "compulsoryRegistered": 5, "compulsoryRequired": 5,
    "electiveGroupsSatisfied": 1, "electiveGroupsRequired": 1,
    "status": "ALL_REGISTERED" }
  ```
  The four compulsory / elective counts are null when no curriculum is configured.

### C2. Summary — `GET /course-enrollments/registration-status/summary`

Used for the filter counts and the header line.
- **Roles:** HOD.
- **Query:** `batchId`*, `semester`*, `sectionId` (optional, as in C1).
- **Response:**
  ```json
  { "totalStudents": 63, "curriculumConfigured": true, "offeredCourseCount": 12,
    "counts": { "ALL_REGISTERED": 50, "INCOMPLETE": 10, "NOT_REGISTERED": 3, "REQUIREMENTS_UNKNOWN": 0 } }
  ```
  `offeredCourseCount` = distinct subjects with an active offering for the batch + semester (limited to the section when given). All four keys are always present.

### C3. One student's detail — `GET /course-enrollments/registration-status/students/{studentId}`

- **Roles:** HOD.
- **Query:** `semester`*; `batchId` optional *(backend edit; the student's own batch is used; if sent it must match, else 400)*.
- **Response:**
  ```json
  {
    "student": { "studentId": 575, "registerNumber": "…", "studentName": "…", "batchId": 2, "batchName": "…", "semester": 3, "sectionId": 5, "sectionName": "A" },
    "status": "INCOMPLETE", "curriculumConfigured": true, "registeredCount": 6,
    "compulsory": [ { "subjectId": 11, "code": "…", "name": "…", "offeringId": 113, "staffName": "Prof. X",
                      "registered": true, "enrollmentId": 900, "enrollmentStatus": "ENROLLED" } ],
    "electiveGroups": [ { "groupId": 7, "name": "Elective Group I", "requiredSelections": 1, "selectedCount": 0, "satisfied": false,
                          "options": [ { "subjectId": 21, "code": "…", "name": "…", "offeringId": 112, "staffName": "…",
                                         "registered": false, "enrollmentId": null, "enrollmentStatus": null } ] } ],
    "otherRegistrations": [ { "subjectId": 99, "code": "…", "name": "…", "offeringId": 140, "staffName": "…", "registered": true, "enrollmentId": 950, "enrollmentStatus": "ENROLLED" } ]
  }
  ```
  - When the subject has an enrollment row for this semester, `offeringId` / `staffName` / `enrollmentId` / `enrollmentStatus` describe that enrollment (a counted one first). `registered` is true only for a counted one, so a `DROPPED` row shows `registered: false, enrollmentStatus: "DROPPED"`.
  - Otherwise `offeringId` / `staffName` are the active offering for the student's section in that semester, or null when there is none.
  - `otherRegistrations` lists counted registrations outside the curriculum (all counted registrations when no curriculum is configured).
  - 404 for an unknown student.
  - Enrollment actions (Drop / Reactivate / Mark Completed) keep using the existing `PUT /course-enrollments/{id}/status`. The frontend loads full enrollment rows with the existing `GET /course-enrollments?studentId=`.

---

## D. Subject catalog: server-side offering filter — CONFIRMED

**Extend** the existing `GET /subjects` (HOD, STAFF; unchanged). No new endpoint.

- **New optional query params:**
  - `semester` (int 1–8): only subjects with an **active** offering in this semester.
  - `batchId` (long): only subjects with an active offering for this cohort. Combines with `semester` (same offering).
- Filtering is an `EXISTS` on subject offerings, so each subject appears once; filters apply before paging.
- Existing params (`search`, `subjectType`, `active`, `page`, `size` ≤ 100) and the sort (by `code`) are unchanged. Without the new params the endpoint behaves exactly as before (plus the new field).
- **New response field on SubjectResponse** (also on `GET /subjects/{id}`, POST, PUT):
  ```json
  "offeredIn": [ { "batchId": 2, "batchName": "2025-2029", "semester": 3 } ]
  ```
  This lists the active offerings' distinct (batch, semester) pairs, sorted by semester then batch name. Not narrowed by the filters. `[]` when there is none.

---

## E. Holiday calendar: management and publication — CONFIRMED (backend edits)

**Rules:**
- Only institution-approved holidays (scope `COLLEGE`) form the ERP calendar. Nothing from the government lists becomes a college holiday automatically.
- National or state days appear only when the HOD adds them to the college calendar, with the matching category. They then count like any college holiday.
- **Effective calendar** = holidays of **PUBLISHED** college calendars only. It is what the timetable (`weekOf`), the attendance day view (`/attendance/day`) and the staff dashboard (`/dashboard/staff` upcoming classes / `skippedHolidays`) use, filtered by the class's cohort (`batchIds`). Draft holidays and government lists never affect them. *(Backend edit: the old fallback to government lists is removed everywhere.)*
- The government lists (`NATIONAL`, `TAMIL_NADU`, category `PUBLIC_HOLIDAY`) stay stored for reference only and are returned only with an explicit `scope=`. They are read-only.
- The college JSON file (`holidays/college/<year>.json`) is imported only for a year that has **no** calendar yet, and creates it as `PUBLISHED`. After that the HOD owns the year and the file is ignored (sync reports `SKIPPED` for that source). 2026 is already PUBLISHED with its 24 holidays.

### Publication: one calendar per **calendar year** (Jan–Dec, not academic year)

| State | Meaning |
|---|---|
| `NOT_CREATED` | No calendar row: no college holidays and never published |
| `DRAFT` | Editable; visible to HOD only |
| `PUBLISHED` | Visible to everyone |

`GET /holidays/calendars/{year}` (HOD, STAFF, STUDENT):
```json
{ "year": 2027, "status": "DRAFT", "publishedAt": null, "publishedBy": null, "holidayCount": 4 }
```
- STAFF / STUDENT receive `DRAFT` and `NOT_CREATED` both as `"status": "NOT_PUBLISHED"`, with `holidayCount: null`. Drafts are never revealed.
- `publishedBy` is null for a year published by the migration or the calendar-file import (2026), i.e. not by a person.
- A `PUBLISHED` year with zero holidays is valid and distinct from not published.
- `year` outside 2000–2100 → 400.

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/holidays/calendars/{year}/publish` | HOD | NOT_CREATED / DRAFT → PUBLISHED; returns the calendar status. Allowed with 0 holidays. Already published → 409. |
| POST | `/holidays/calendars/{year}/unpublish` | HOD | PUBLISHED → DRAFT. Not published → 409. |

### Holiday entries

`GET /holidays?year=` (existing endpoint, behaviour changed):
- **No `scope` (or `scope=COLLEGE`):** college holidays only, never government / `PUBLIC_HOLIDAY` rows, for every role.
  - **STAFF / STUDENT:** entries of PUBLISHED years only; `[]` otherwise.
  - **HOD:** all college entries, drafts included (`calendarStatus` tells which).
- **`scope=NATIONAL` or `scope=TAMIL_NADU`:** that government list's stored rows (reference), any role.
- Other existing params unchanged: `dateFrom`, `dateTo` (max 400 days; with no year/range the current year is used). A holiday is included when its range overlaps the window.
- New optional `batchId`: only holidays that apply to that cohort (`batchIds` empty or containing it).
- Sorted by `startDate`, then name.

Item:
```json
{ "id": 38, "name": "Pongal", "startDate": "2026-01-15", "endDate": "2026-01-17",
  "date": "2026-01-15",
  "category": "STATE", "description": null,
  "batchIds": [],
  "year": 2026, "calendarStatus": "PUBLISHED",
  "scope": "COLLEGE", "source": "…", "lastSyncedAt": null, "updatedAt": "…" }
```
- `endDate` is null for a one-day holiday and is inclusive.
- `date` is kept as an alias of `startDate` for existing clients; `lastSyncedAt` is kept (null for holidays entered in the ERP).
- `calendarStatus` is null for government rows.
- **Category** *(backend edit)*: existing values stay and are **not** remapped: `GENERAL_HOLIDAY` (the imported college rows) and `PUBLIC_HOLIDAY` (government rows only, never accepted on writes). New values accepted on writes: `NATIONAL | STATE | INSTITUTIONAL | ACADEMIC_BREAK | OTHER` (plus `GENERAL_HOLIDAY`).
- **`batchIds`:** empty means the whole institution. Otherwise only those cohorts.
- *(Backend decision)* A holiday may **not** cross a year boundary: `startDate` and `endDate` must be in the same calendar year (400).

| Method | Path | Roles | Body |
|---|---|---|---|
| POST | `/holidays` | HOD | `{ "name", "startDate", "endDate"?, "category", "description"?, "batchIds"? }` → 201 + item |
| PUT | `/holidays/{id}` | HOD | same (full replace) → 200 + item |
| DELETE | `/holidays/{id}` | HOD | — → 200 with `data: null` |

- Creating a holiday in a year with no calendar creates that year's calendar as `DRAFT`. Moving a holiday to another year (PUT) does the same for the new year.
- *(Backend decision)* A PUBLISHED year can be edited directly; changes are visible at once and audited.
- Government rows → 409 on PUT / DELETE ("read-only"). Unknown id → 404.

**Validation** (400): `name` non-blank and at most 150 characters; `startDate` required, year 2000–2100; `endDate` not before `startDate`, same year; range at most 60 days inclusive; `category` valid (not `PUBLIC_HOLIDAY`); `description` at most 500 characters; `batchIds` exist, no duplicates. Same name (case-insensitive) already in that year's college calendar → 409. Overlapping holidays with different names are allowed.

Audit: module `HOLIDAY`, actions `HOLIDAY_CREATED`, `HOLIDAY_UPDATED`, `HOLIDAY_DELETED`, `CALENDAR_PUBLISHED`, `CALENDAR_UNPUBLISHED`.

---

## F. Staff dashboard: holiday-aware upcoming classes — no new API

The frontend reads `GET /timetable/me` and `GET /holidays?year=` (published only for STAFF), plus `GET /holidays/calendars/{year}`. It hides classes on full-day holidays that apply to the class's cohort (`batchIds` empty or containing it).
- If holiday data fails to load, classes are shown with a "holidays could not be checked" note. A failure is never read as "no holidays".
- Partial-day holidays are not modelled.
- *(Backend note)* `GET /dashboard/staff` already skips holidays itself; it now uses the same effective calendar (published, cohort-aware) as described in E.

---

## G. Staff teaching context — CONFIRMED (backend edits)

Staff pages pick a class as **Batch → Semester → Class**. "Batch" is a display word only: APIs keep `batchId` / `batchName`. A *class* is one subject offering (`offeringId`), never a section or a subject name.

**Current semester: the institution's term calendar** *(user decision, 2026-10-21)*. The backend calculates it; the frontend never guesses it.
- **Year 1:** Semester 1 runs **1 Sep – 31 Dec** (admission year). Semester 2 runs **1 Jan – 30 Apr**.
- **Years 2–4:** odd semesters run **1 Jun – 30 Nov**. Even semesters run **1 Jan – 30 Apr**.
- The year of study and the semester follow from the batch's `admissionYear` and today's date. `currentSemester` is the latest semester that **has started**.
- Between terms (December for Years 2–4, May, and June–August before a Year 1 starts), the last started semester stays current with `termStatus: "BETWEEN_TERMS"`.
- `termStatus` is one of `NOT_STARTED | IN_SESSION | BETWEEN_TERMS | COMPLETED`. For `NOT_STARTED` (before Semester 1 starts) and `COMPLETED` (after Semester 8 ends), `currentSemester` is null.
- Today (2026-10-21): 2026-2030 → 1, 2025-2029 → 3, 2024-2028 → 5, 2023-2027 → 7. All are `IN_SESSION`.

### G1. `currentSemester` on `GET /batches` — CONFIRMED (backend edit: `termStatus` added)
```json
{ "id": 2, "name": "2025-2029", "admissionYear": 2025, "graduationYear": 2029, "currentYear": 2, "active": true,
  "currentSemester": 3, "currentAcademicYear": "2026-2027", "termStatus": "IN_SESSION" }
```
- `currentAcademicYear` = the odd semester's calendar year + 1 (e.g. Semester 2 of 2026-2030 → "2026-2027"). Null together with `currentSemester`.
- `currentYear` is the stored column and stays unchanged. The calculated year of study is `(currentSemester + 1) / 2`.

### G1b. *(Backend addition)* `GET /subject-offerings/teaching-terms` — HOD, STAFF
This is the selector's Batch + Semester level in one call. STAFF get only the cohorts and semesters where they have offerings (active or not). HOD gets all of them.
```json
[ { "batchId": 5, "batchName": "2026-2030", "batchActive": true, "admissionYear": 2026,
    "yearOfStudy": 1, "currentSemester": 1, "termStatus": "IN_SESSION",
    "currentTermStart": "2026-09-01", "currentTermEnd": "2026-12-31",
    "semesters": [ { "semester": 1, "status": "CURRENT", "startDate": "2026-09-01", "endDate": "2026-12-31",
                     "academicYears": ["2026-2027"], "offeringCount": 3, "activeOfferingCount": 3 },
                   { "semester": 2, "status": "UPCOMING", "startDate": "2027-01-01", "endDate": "2027-04-30",
                     "academicYears": ["2026-2027"], "offeringCount": 5, "activeOfferingCount": 5 } ] } ]
```
- Semester `status`: `CURRENT`, `PREVIOUS` (before the current one, or every semester of a `COMPLETED` cohort) or `UPCOMING` (after the current one, or every semester of a `NOT_STARTED` cohort).
- Batch order: active batches first, then the newest admission year first. Semesters are listed in ascending order.
- *Data note:* staff@department.com has legacy CS301/CS305 offerings labelled Semester 1 in 2024-2028. They appear as `PREVIOUS` Semester 1 of a cohort that is now in Semester 5.

### G2. `SubjectOfferingResponse` — backend edits
- `batchId` filter on `GET /subject-offerings` **already exists** (STAFF are still limited to their own offerings). Use `?batchId=&semester=` for the Class level.
- `subjectAcronym`: **not added.** No acronym is stored anywhere, and adding one needs a schema change plus data nobody has supplied. The frontend keeps its initials fallback.
- `studentCount`: **not added** to every offering response (it would cost a count query on every offering list). The class size is available from:
  - `classSize` in I3 (assessment overview, one call per cohort + semester);
  - A's `total_elements`.

---

## H. Staff results: read-only, Batch → Semester → Exam — CONFIRMED (backend edits)

**Rule:** STAFF never modify end-semester results. This is enforced server-side.

### H1. Authorization — IMPLEMENTED (backend edit: new role COE)
- New role **`COE`** (Controller of Examinations) *(user decision)*, added by Flyway V41: `roles.ROLE_COE`, `dept_role` value `COE`.
  - The HOD assigns it with the existing `POST /users` / `PUT /users/{id}` (`"roles": ["COE"]`). `GET /users?role=COE` works.
  - `/auth/me` returns `roles: ["ROLE_COE"]`. **No COE account exists yet.**
- `PUT /results/subject-offerings/{o}/periods/{p}`, decided by the exam period's `examType`:

  | examType | Who may enter | Others |
  |---|---|---|
  | `END_SEMESTER`, `SUPPLEMENTARY` | **COE only** (any offering, active or not) | STAFF → **403**, also for their own offering (message "End-semester and supplementary results are read-only for staff; …"). HOD → 403 |
  | `INTERNAL` | assigned STAFF of an active offering (unchanged) | COE → 403, HOD → 403 |

- Publish stays **HOD only** (`POST …/publish`). STAFF and COE → 403. Published rows stay immutable for everyone.
- Audit of every result mutation: there is no delete, import, unlock or reopen endpoint for results. The only results write STAFF can reach is the PUT above. Exam-period writes are HOD only (unchanged).
- Reads:
  - `GET /results` and `GET /results/subject-offerings/{o}/periods/{p}`: HOD and COE see everything; STAFF see their own offerings (unchanged).
  - `GET /exam-periods[/{id}]`: also COE.
  - Every other role-restricted endpoint (gradebook, attendance, users, etc.) → 403 for COE. Login-only endpoints (`/auth/me`, own account settings, notifications) work as for any user.
  - The frontend needs a COE navigation: exam periods (read) + results entry for `END_SEMESTER` / `SUPPLEMENTARY` periods.

### H2. *(Backend addition)* `GET /results/by-exam` — HOD, STAFF
One call for "all my classes". It is read-only and adds no new storage.
- **Query:** `batchId`*, `semester`* (1–8), `exam`* = `END_SEMESTER | CAT_1 | CAT_2`, plus optional `subjectOfferingId`, `sectionId`, `examPeriodId` (END_SEMESTER only), `page` (0), `size` (50, max 200).
- **Scope:** the offerings of that batch + semester (active and inactive, so history stays readable). STAFF see only their own; HOD sees all.
  - An explicit `subjectOfferingId` that isn't theirs → 403.
  - One from another batch or semester → 400.
  - Unknown → 404.
- **Sources:**
  - `END_SEMESTER`: `exam_results` of `END_SEMESTER` periods. **STAFF receive published rows only.** HOD receives all rows, each with a `published` flag.
  - `CAT_1` / `CAT_2`: **FINALIZED** gradebook assessments of that type only (drafts never appear). There is one row per student of the gradebook class list, with `NOT_GRADED` when the student has no row. CAT is rejected with 400 when the gradebook feature is off.
- **Sort:** subject code → section → assessment / period → register number. Paged `PagedResponse`.
- **Row:**
  ```json
  { "exam": "CAT_1", "source": "ASSESSMENT", "subjectOfferingId": 1, "subjectId": 1, "subjectCode": "CS301", "subjectName": "Computer Networks",
    "batchId": 1, "batchName": "2024-2028", "semester": 1, "academicYear": "2026-2027", "sectionId": 1, "sectionName": "A",
    "studentId": 3, "registerNumber": "REG2024A001", "studentName": "…",
    "assessmentId": 1, "examPeriodId": null, "title": "CAT 1",
    "marks": 42.00, "maxMarks": 50.00, "passMarks": 25.00, "grade": null,
    "status": "GRADED", "remarks": null, "published": true, "publishedAt": "2026-09-05T04:30:00" }
  ```
  - `status`: `PASS | FAIL | ABSENT | WITHHELD` for `source: "EXAM_RESULT"`, or `GRADED | ABSENT | EXEMPTED | NOT_GRADED` for `"ASSESSMENT"`.
  - `marks` is null for absent and not-graded rows (never 0).
  - For CAT, `publishedAt` = the assessment's `finalizedAt`.
- The frontend's H2 composition from existing endpoints also stays valid. This endpoint just saves the per-offering calls.

**Answer to the INTERNAL question:** the **gradebook is authoritative for CAT 1 / CAT 2** (`assessmentType CAT_1 | CAT_2`). The `INTERNAL` exam period "Internal Assessment Test 1" is legacy demo data from `ErpModulesDevSeeder` (CS203 / CS205 offerings, now inactive). It is not CAT data. Do not show `INTERNAL` periods under CAT.

---

## I. Assessments: overview, marks entry, finalization — CONFIRMED (backend edits)

Built on the existing gradebook endpoints. Nothing replaces them and nothing adds a second grade store.

**Status semantics:** confirmed as proposed.
- `entered = expectedStudentCount − notGradedCount`. ABSENT and EXEMPTED count as entered.
- Average, highest, lowest and pass rate use GRADED marks only. Absent is never zero.
- `passPercentage = passCount / gradedCount × 100` (2 dp). It is null without `passMarks`.

### I1. Finalization rules — IMPLEMENTED
`POST /assessments/{id}/finalize`:
- **400** while any active student of the class list has no grade row, or has an invalid stored mark. `errors[]` holds one entry per student: `"REG… (studentId N): no marks and not marked absent"`.
- 409 when it is already finalized. 403 for anyone but the assigned STAFF member (HOD included).
- When it succeeds: `status: FINALIZED` and `finalizedAt` are set, and every later grade write → 409. `finalizedBy` is not stored; the audit row `FINALIZE` records who finalized it.
- Assessments finalized **before** this rule (e.g. "API verification quiz", CS301 "CAT 2") are historical and were **not changed**. They show their `notGradedCount` as it is.

### I2. Clearing a mark — IMPLEMENTED (backend edit: no DELETE endpoint)
Use the same bulk `PUT /assessments/{id}/grades`. An entry with **`status: null` and `marks: null`** deletes that student's grade, so the student is back to `NOT_GRADED`.
- `status: null` with marks → 400.
- It can be mixed with normal rows in one autosave request (all or nothing).
- The response adds **`clearedCount`**. `changedGradeCount = created + updated + cleared`.
- Validation (unchanged, now one shared rule):
  - GRADED marks are between 0 and `maxMarks`, with at most 2 decimals;
  - ABSENT / EXEMPTED carry no marks;
  - the student must be in the class list;
  - no duplicate rows;
  - the assessment must be DRAFT;
  - only the owner may write.
- Identical rows are skipped, so sending unchanged rows costs nothing.

### I3. Overview — IMPLEMENTED (backend edit: dedicated endpoint instead of `includeSummary`)
- `GET /assessments` gained `batchId` (`semester` already existed).
- **`GET /assessments/overview?batchId=&semester=`** (both required), optional `sectionId`, `subjectOfferingId`. HOD all; STAFF their own. Returns a list of offerings by subject code, then section. Offerings with no assessments are included:
  ```json
  [ { "subjectOfferingId": 1, "subjectId": 1, "subjectCode": "CS301", "subjectName": "…", "subjectType": "THEORY",
      "batchId": 1, "batchName": "2024-2028", "sectionId": 1, "sectionName": "A", "academicYear": "2026-2027", "semester": 1,
      "offeringActive": true, "staffId": 12, "staffName": "Staff User", "classSize": 58, "draftCount": 1, "finalizedCount": 4,
      "assessments": [ { "id": 9, "title": "…", "assessmentType": "QUIZ", "maxMarks": 20.00, "passMarks": null, "weightage": null,
                         "assessmentDate": "2026-10-02", "status": "DRAFT", "finalizedAt": null, "marksEntryDueAt": null,
                         "readyToFinalize": false,
                         "statistics": { "expectedStudentCount": 58, "gradedCount": 0, "absentCount": 0, "exemptedCount": 0,
                                         "notGradedCount": 58, "average": null, "highest": null, "lowest": null,
                                         "passCount": null, "failCount": null, "passPercentage": null } } ] } ]
  ```
  - `statistics` has the same numbers as `GET /assessments/{id}/summary`, from one shared calculator.
  - `readyToFinalize` = DRAFT and `notGradedCount == 0`.
  - The response uses four queries no matter how many assessments there are.

### I4. Autosave — CONFIRMED as proposed
Send only changed rows. Clears go in the same request (I2).

## J. Assessment import / export — CONFIRMED (backend edit: server-side preview + confirmed apply)

The browser still parses the .xlsx / .csv file. The backend has no spreadsheet library and none was added. Map `AB` to `"status": "ABSENT"`.

To meet "do not silently modify existing grades", applying goes through a server endpoint that enforces the confirmation. Using `PUT /grades` for imports would leave the confirmation to the frontend only.

| Method | Path | Roles | Body |
|---|---|---|---|
| POST | `/assessments/{id}/grades/import/preview` | STAFF (owner, DRAFT) | `{ "rows": [ { "rowNumber": 2, "registerNumber": "REG2025A001", "marks": 18.5, "status": null } ] }` |
| POST | `/assessments/{id}/grades/import` | STAFF (owner, DRAFT) | same + `"confirmOverwrite": true` |

- **Rows** (max 500):
  - `status` null + marks → GRADED;
  - `ABSENT` / `EXEMPTED` without marks;
  - **blank** (no status, no marks) → `SKIPPED`. An import never clears a grade.
  - Register numbers are matched case-insensitively, after trimming, against the class list.
- **Preview** (nothing saved):
  ```json
  { "assessmentId": 9, "maxMarks": 20.00, "totalRows": 60, "newCount": 50, "overwriteCount": 3, "unchangedCount": 2,
    "skippedCount": 1, "errorCount": 4, "canApply": false,
    "rows": [ { "rowNumber": 2, "registerNumber": "REG2025A001", "studentId": 575, "studentName": "…", "marks": 18.5,
                "status": "GRADED", "currentMarks": 12.00, "currentStatus": "GRADED", "outcome": "OVERWRITE", "error": null } ],
    "studentsNotInFile": [ { "studentId": 580, "registerNumber": "…", "studentName": "…", "currentStatus": "NOT_GRADED" } ] }
  ```
  `outcome` is one of:
  - `NEW`;
  - `OVERWRITE`: a different stored grade exists;
  - `UNCHANGED`;
  - `SKIPPED`;
  - `UNMATCHED`: not a student of this class;
  - `DUPLICATE`: every row sharing a register number;
  - `INVALID`: range / decimals / absent-with-marks.
- **Apply:**
  - 400 when there are any UNMATCHED / DUPLICATE / INVALID rows (nothing saved; `errors[]` = `"row N (REG…): …"`);
  - **409** when `overwriteCount > 0` and `confirmOverwrite` is not `true`;
  - otherwise NEW + OVERWRITE rows are saved in one transaction. Stored remarks are kept.
  - Returns the I2 counts shape. Audited as `GRADE_IMPORT`, with counts only.
- **Export:** unchanged (browser CSV from `GET /assessments/{id}/grades`).

## K. Portfolio Review filter — no API change
Removing Workshop, Conference, Technical Event, Club Activity and Other from the STAFF filter is frontend-only. `GET /portfolio/review?activityType=` stays optional. No endpoint lists activity types, so there is nothing to change. Activity types and historical entries were not touched.

## L. Test data and the dev database (backend finding)
- Assessment 9 "[QA AUDIT] Assessment A (edited)" (CS301 A, DRAFT, 0 grades) has these origins. The audit trail shows a user agent of `HeadlessChrome/151` / `154`.
  - Created on 2026-10-02 (audit 161).
  - Edited on 2026-10-02 (audit 166) and 2026-10-11 (audit 270).
  - All of these came from browser QA runs as staff@department.com against the **dev DB `erp_db`** through :8080.
- The same run (2026-10-02) also left these. All are still present and **untouched**, pending the user's decision:
  - user 15 `qa.audit.temp`, active STAFF;
  - inactive subjects 3 `QA-AUDIT-X` and 4 `QA-AUDIT-XQA-AUDIT-X`;
  - a "(QA edit)" rename of CS301 that was reverted.
- These are **not seed data and not backend tests.** Backend integration tests run on `erp_db_test` in rolled-back transactions.
- **Rule from now on (both agents):** live checks against :8080 are **read-only**. Any write on the dev DB needs the user's OK first and must use clearly labelled data with a clean-up step. For write testing, use the backend integration tests or a separate backend instance on another port pointed at `erp_db_test`.

---

## Change log
- 2026-10-20: frontend: first draft, all sections PROPOSED.
- 2026-10-20: backend: A, D CONFIRMED as proposed (A: STAFF scope defined). B CONFIRMED with: empty curriculum rejected, DELETE added, subjects must have an active offering for the batch + semester, groups need ≥ 2 options, size limits. C CONFIRMED with: filter renamed `registrationStatus`, `sectionId` optional, C3 `batchId` optional, detail semantics for dropped rows. E CONFIRMED with: categories keep GENERAL_HOLIDAY / PUBLIC_HOLIDAY (no remapping) plus NATIONAL | STATE | INSTITUTIONAL | ACADEMIC_BREAK | OTHER; no year-crossing ranges; published years editable; cohort holidays supported; default GET /holidays never returns government rows; government fallback removed from timetable / attendance / dashboard; college file imported only for a year without a calendar.
- 2026-10-21: backend: A–E implemented and running on localhost:8080 (V39 curriculum tables, V40 holiday calendars applied to the dev DB). Shapes exactly as CONFIRMED above; only addition: `publishedBy` may be null for system-published years. Awaiting frontend verification before IMPLEMENTED is final.
- 2026-10-21: frontend: verified A–E on :8080 with read-only GETs. Response keys match the CONFIRMED shapes.
  - **A:** 63 students in section 5 (1 with a login), paging OK. Taught section → 200; untaught section → 403 for STAFF; STUDENT → 403; unknown section → 404.
  - **B:** GET returns `configured:false`, `version:null`; STUDENT → 403.
  - **C:** C1 has 63 rows, all REQUIREMENTS_UNKNOWN, and the `registrationStatus` filter works. C2 counts match C1. C3 returns 12 otherRegistrations when no curriculum is configured. STAFF / STUDENT → 403.
  - **D:** `semester=3&batchId=2` returns 12 subjects sorted by code; `offeredIn` is present, also on unfiltered results.
  - **E:** 2026 is PUBLISHED with 24 COLLEGE / GENERAL_HOLIDAY rows for every role. 2027 shows NOT_CREATED to HOD and NOT_PUBLISHED with `holidayCount:null` to STAFF / STUDENT. The default list has no government rows; `scope=NATIONAL` returns 14.
  - **Not exercised:** PUT/DELETE curricula, holiday POST/PUT/DELETE, publish/unpublish. These write to the dev DB and wait for the user's OK.
- 2026-10-21: frontend: integrated A–E in the UI.
  - **A:** Enroll One Student candidates.
  - **B:** Courses → Curriculum (GET / PUT / DELETE).
  - **C:** Enrollments table, summary and detail. The frontend no longer computes status.
  - **D:** Subject Catalog filters and Offered In.
  - **E:** HOD holiday management, publication bar and published-only scheduling.
  - Browser smoke test passed against :8080 using reads only.
  - **Not exercised:** writes (PUT/DELETE curricula, holiday CRUD, publish/unpublish). The user withheld a test curriculum because no authoritative compulsory/elective classification exists, and holiday writes were excluded from testing.
- 2026-10-21: frontend: G–J PROPOSED (staff teaching context, read-only staff results, assessment workflow, import/export). The frontend builds G/H/I on existing endpoints with labelled fallbacks and switches to `currentSemester`, `subjectAcronym`, `studentCount` and the grade DELETE when they are CONFIRMED. Data note for backend: assessment 9 "[QA AUDIT] Assessment A (edited)" was created 2026-10-02 21:21 and edited 2026-10-11 10:36 by headless-Chrome QA runs logged in as staff@department.com on the dev DB (audit rows 161, 166, 270). It is test data, not a seed. Not deleted — waiting for the user's OK.
- 2026-10-21: frontend: findings for backend while building G–J (read-only checks):
  - **H1 still open:** `PUT /results/subject-offerings/{o}/periods/{p}` is `hasRole('STAFF')` today, so the server still lets STAFF write end-semester results. The frontend no longer renders any result editor (STAFF or HOD), but this must be closed server-side.
  - **I1 needed:** finalized assessments with missing marks already exist in the dev DB — "API verification quiz" (6 / 58 entered) and CS301 "CAT 2" (11 / 58), both FINALIZED. Finalize does not check completeness today.
  - Frontend smoke test blocked every non-GET request in the browser, so nothing was written.
- 2026-10-21: backend: G–J CONFIRMED with edits and implemented on :8080. K, L added.
  - **G:** the current semester is calculated from the user's term calendar:
    - Year 1: Sep–Dec / Jan–Apr;
    - Years 2–4: Jun–Nov / Jan–Apr.
    - `GET /batches` adds `currentSemester`, `currentAcademicYear`, `termStatus`.
    - New `GET /subject-offerings/teaching-terms`.
    - `subjectAcronym` / `studentCount` not added (G2).
  - **H:** new role COE (V41, applied to the dev DB after a backup).
    - END_SEMESTER / SUPPLEMENTARY results: COE only; STAFF → 403. INTERNAL: unchanged. Publish: HOD only.
    - New read-only `GET /results/by-exam`.
    - The gradebook is authoritative for CAT; INTERNAL periods are legacy demo data.
  - **I:**
    - Finalize → 400 while marks are missing or invalid.
    - Clearing = `status: null, marks: null` in `PUT /grades` (no DELETE); `clearedCount` added.
    - New `GET /assessments/overview`.
    - `batchId` filter on `GET /assessments`.
  - **J:** server-side import preview + apply. Overwrites need `confirmOverwrite: true` (else 409).
  - Live read-only checks on :8080:
    - teaching-terms (2026-2030 → 1, 2025-2029 → 3, 2024-2028 → 5);
    - overview;
    - CAT_1 view;
    - STAFF PUT on the END_SEMESTER period → 403. That check used a fake student id, so nothing was written.
