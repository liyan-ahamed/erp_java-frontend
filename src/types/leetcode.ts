export const URL_NOT_PROVIDED = 'URL NOT PROVIDED';

export type LeetCodeYear = 'FIRST_YEAR' | 'SECOND_YEAR' | 'THIRD_YEAR' | 'FOURTH_YEAR';

export type LeetCodeSyncStatus =
  | 'SYNCED'
  | 'NOT_SYNCED'
  | 'FAILED'
  | 'INVALID_URL'
  | 'URL_NOT_PROVIDED';

export interface LeetCodeFilters {
  years: { value: LeetCodeYear; label: string; sections: string[] }[];
}

export interface LeetCodeStudentStats {
  studentId: number;
  name: string;
  registerNumber: string;
  profileUrl: string;
  username: string | null;
  totalSolved: number | null;
  easySolved: number | null;
  mediumSolved: number | null;
  hardSolved: number | null;
  lastSyncedAt: string | null;
  status: LeetCodeSyncStatus;
  message: string | null;
}

export interface LeetCodeRankedStudent {
  rank: number;
  studentId: number;
  name: string;
  section: string;
  totalSolved: number;
  easySolved: number | null;
  mediumSolved: number | null;
  hardSolved: number | null;
  lastSyncedAt: string | null;
}

/** One page (10 students) of a year's ranking. */
export interface LeetCodeTopPage {
  year: LeetCodeYear;
  page: number;
  totalRanked: number;
  hasMore: boolean;
  students: LeetCodeRankedStudent[];
}

export interface LeetCodeUrlUpdate {
  studentId: number;
  profileUrl: string;
}

export interface LeetCodeSectionStats {
  year: LeetCodeYear;
  section: string;
  totalStudents: number;
  profilesQueried: number;
  synced: number;
  failed: number;
  urlNotProvided: number;
  students: LeetCodeStudentStats[];
}
