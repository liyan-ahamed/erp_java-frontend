// GET /batches and GET /sections (HOD, STAFF). Both return plain lists inside
// the standard ApiResponse wrapper — not paginated.

export interface Batch {
  id: number;
  name: string;
  admissionYear: number | null;
  graduationYear: number | null;
  /** Year of study (1–4) of the batch. */
  currentYear: number | null;
  /** Current semester from the backend's academic configuration (contract §G1). Absent until the backend sends it. */
  currentSemester?: number | null;
  currentAcademicYear?: string | null;
  active: boolean;
}

/** GET /sections/{id}/students (contract A). Every student of the section, with or without a login or enrollment. */
export interface SectionStudent {
  studentId: number;
  registerNumber: string;
  name: string;
  batchId: number;
  batchName: string;
  sectionId: number;
  sectionName: string;
  active: boolean;
  /** null when the student has no ERP login. */
  userId: number | null;
}

/** A section has no active flag of its own; `active` mirrors its batch. */
export interface Section {
  id: number;
  name: string;
  batchId: number;
  batchName: string;
  currentYear: number | null;
  active: boolean;
}
