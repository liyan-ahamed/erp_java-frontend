/** Envelope every backend endpoint returns (success and error alike). */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  /** Per-field validation messages, e.g. "email: Email must be valid". */
  errors?: string[];
  timestamp?: string;
}

/**
 * The backend's paging wrapper. The wrapper is snake_case for every module;
 * item fields inside `content` keep whatever casing that module uses.
 */
export interface BackendPage<T> {
  content: T[];
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
  last: boolean;
}

/** Paging shape used by frontend components. */
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
