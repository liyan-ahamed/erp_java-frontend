// GET /batches and GET /sections (HOD, STAFF). Both return plain lists inside
// the standard ApiResponse wrapper — not paginated.

export interface Batch {
  id: number;
  name: string;
  admissionYear: number | null;
  graduationYear: number | null;
  /** Year of study (1–4) of the batch. */
  currentYear: number | null;
  active: boolean;
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
