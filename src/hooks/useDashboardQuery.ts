import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/api/dashboard.service';
import { resultService } from '@/services/api/result.service';
import { QUERY_KEYS } from '@/constants/query-keys';
import { Section } from '@/types/academic';
import { ExamResult } from '@/types/result';

export const useDashboardSummary = () => {
  return useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: () => dashboardService.getSummary(),
  });
};

export const ACADEMIC_YEARS = [1, 2, 3, 4] as const;

export interface YearFailures {
  year: number;
  /** Distinct students with at least one published FAIL result. */
  students: number;
  /** Published FAIL subject results (a student failing two subjects counts twice). */
  failedResults: number;
  sections: number;
}

const PAGE_SIZE = 200; // backend maximum for /results

/** Every published FAIL result of one section, paging until the backend reports no more pages. */
const allFailsOfSection = async (sectionId: number): Promise<ExamResult[]> => {
  const rows: ExamResult[] = [];
  let page = 0;
  let totalPages = 1;
  while (page < totalPages) {
    const res = await resultService.getResults({ page, size: PAGE_SIZE, sectionId, published: true, resultStatus: 'FAIL' });
    rows.push(...res.content);
    totalPages = res.totalPages;
    page++;
  }
  return rows;
};

/**
 * HOD: distinct students with a published FAIL result, per year of study. A result's year is its subject
 * offering's section → batch currentYear; the backend only enrolls students of the offering's batch, so
 * this matches the student's own year. ABSENT, WITHHELD and unpublished results are not counted.
 * One request per active section (more only if a section has over 200 failures); no polling.
 */
export const useFailuresByYear = (sections: Section[] | undefined) =>
  useQuery({
    queryKey: [QUERY_KEYS.RESULTS, QUERY_KEYS.DASHBOARD_FAILURES_BY_YEAR, (sections ?? []).map((s) => s.id)],
    enabled: sections !== undefined,
    refetchInterval: false,
    queryFn: async (): Promise<YearFailures[]> => {
      const inYears = (sections ?? []).filter((s) => s.currentYear !== null && s.currentYear >= 1 && s.currentYear <= 4);
      const perSection = await Promise.all(inYears.map(async (s) => ({ year: s.currentYear as number, rows: await allFailsOfSection(s.id) })));
      return ACADEMIC_YEARS.map((year) => {
        const rows = perSection.filter((p) => p.year === year).flatMap((p) => p.rows);
        return {
          year,
          students: new Set(rows.map((r) => r.studentId)).size,
          failedResults: rows.length,
          sections: inYears.filter((s) => s.currentYear === year).length,
        };
      });
    },
  });
