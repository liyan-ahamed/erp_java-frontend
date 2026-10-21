'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ROUTES } from '@/constants/routes';
import { useSections } from '@/hooks/useAcademic';
import { ACADEMIC_YEARS, useFailuresByYear } from '@/hooks/useDashboardQuery';
import { YearWiseStudent } from '@/types/dashboard';
import { ChevronRight, Info } from '@/components/ui/icons';
import { ErrorBanner, LoadingBlock } from '@/components/gradebook/shared';

function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="f-btn sm shrink-0 whitespace-nowrap">
      {children}
      <ChevronRight className="!w-[14px] !h-[14px]" />
    </Link>
  );
}

function PanelHeader({ title, subtitle, action }: { title: string; subtitle: string; action: ReactNode }) {
  return (
    <div className="panel-header flex-wrap">
      <div className="min-w-0">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

/** Neutral note for figures the backend cannot provide yet. No values are estimated. */
function BackendGapNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-[9px] rounded-[10px] border border-dashed border-line px-[14px] py-[11px] text-[12px] text-muted">
      <Info className="!w-[15px] !h-[15px] mt-px shrink-0" />
      <p>
        <span className="font-[550] text-fg">Needs backend support.</span> {children}
      </p>
    </div>
  );
}

/** Placeholder bar track for a year whose value is unavailable — dashed and empty, never a 0% bar. */
const EmptyTrack = () => <div className="h-[8px] rounded-full border border-dashed border-line" aria-hidden="true" />;

const studentsLabel = (n: number) => `${n.toLocaleString()} student${n === 1 ? '' : 's'}`;

// ---------- Attendance by Academic Year (centrepiece) ----------

export function AttendanceByYearPanel({ yearWise }: { yearWise: YearWiseStudent[] | undefined }) {
  const enrolled = (year: number) => yearWise?.find((y) => y.year === year)?.student_count;

  return (
    <section className="panel mb-[21px]">
      <PanelHeader
        title="Attendance by Academic Year"
        subtitle="Student attendance across all four academic years"
        action={<PanelLink href={ROUTES.ATTENDANCE}>View attendance</PanelLink>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-dashed border-line">
        {ACADEMIC_YEARS.map((year, i) => {
          const count = enrolled(year);
          return (
            <div
              key={year}
              className={`px-[21px] py-[22px] flex flex-col gap-[12px] border-line border-dashed ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[14px] font-[550]">Year {year}</h3>
                {count !== undefined && <span className="text-[11px] text-muted whitespace-nowrap">{studentsLabel(count)}</span>}
              </div>
              <div className="text-[28px] font-[550] tracking-[-1px] text-muted leading-none" aria-label={`Year ${year} attendance unavailable`}>
                —
              </div>
              <EmptyTrack />
              <span className="text-[11px] text-muted">Data unavailable</span>
            </div>
          );
        })}
      </div>
      <div className="px-[21px] pb-[19px] pt-[3px]">
        <BackendGapNote>
          The current API only reports attendance per subject offering. A department-wide figure for each academic year
          would need a backend aggregate, so no percentages are shown.
        </BackendGapNote>
      </div>
    </section>
  );
}

// ---------- Average Marks by Academic Year ----------

export function AverageMarksPanel() {
  return (
    <section className="panel flex flex-col">
      <PanelHeader
        title="Average Marks by Academic Year"
        subtitle="Normalised marks from finalized and published records"
        action={<PanelLink href={ROUTES.ASSESSMENTS}>View assessments</PanelLink>}
      />
      <ul className="border-t border-dashed border-line">
        {ACADEMIC_YEARS.map((year) => (
          <li key={year} className="grid grid-cols-[64px_1fr_auto] items-center gap-[14px] px-[21px] py-[14px] border-b border-dashed border-line last:border-b-0">
            <span className="text-[13px] font-[550]">Year {year}</span>
            <EmptyTrack />
            <span className="text-[12px] text-muted w-[92px] text-right">Unavailable</span>
          </li>
        ))}
      </ul>
      <div className="px-[21px] pb-[19px] pt-[3px] mt-auto">
        <BackendGapNote>
          An accurate average needs every finalized mark normalised by its maximum. The API has no year-level marks
          aggregate, and fetching every grade would take one request per assessment.
        </BackendGapNote>
      </div>
    </section>
  );
}

// ---------- Students with Failures by Academic Year ----------

export function FailuresByYearPanel() {
  const sections = useSections(null);
  const failures = useFailuresByYear(sections.data);
  const isLoading = sections.isLoading || failures.isLoading;
  const error = sections.error ?? failures.error;
  const max = Math.max(1, ...(failures.data ?? []).map((y) => y.students));

  return (
    <section className="panel flex flex-col">
      <PanelHeader
        title="Students with Failures by Academic Year"
        subtitle="Distinct students with at least one published FAIL result"
        action={<PanelLink href={ROUTES.RESULTS}>View results</PanelLink>}
      />
      {isLoading ? (
        <div className="border-t border-dashed border-line">
          <LoadingBlock label="Loading published results…" />
        </div>
      ) : error ? (
        <div className="px-[21px] pb-[21px]">
          <ErrorBanner error={error} fallback="Failed to load published results." />
        </div>
      ) : (
        <>
          <ul className="border-t border-dashed border-line">
            {(failures.data ?? []).map((y) => (
              <li key={y.year} className="grid grid-cols-[64px_1fr_auto] items-center gap-[14px] px-[21px] py-[14px] border-b border-dashed border-line last:border-b-0">
                <span className="text-[13px] font-[550]">Year {y.year}</span>
                {y.sections === 0 ? (
                  <EmptyTrack />
                ) : (
                  <div
                    className="h-[8px] rounded-full bg-soft overflow-hidden"
                    role="img"
                    aria-label={`Year ${y.year}: ${studentsLabel(y.students)} with failures`}
                  >
                    {y.students > 0 && <div className="h-full rounded-full bg-danger" style={{ width: `${(y.students / max) * 100}%` }} />}
                  </div>
                )}
                <span className="w-[92px] text-right leading-tight">
                  {y.sections === 0 ? (
                    <span className="text-[12px] text-muted">No active sections</span>
                  ) : (
                    <>
                      <span className={`block text-[14px] font-[550] ${y.students > 0 ? 'text-danger' : ''}`}>{studentsLabel(y.students)}</span>
                      <span className="block text-[11px] text-muted">
                        {y.failedResults} failed result{y.failedResults === 1 ? '' : 's'}
                      </span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="px-[21px] pb-[17px] pt-[4px] mt-auto text-[11px] text-muted">
            Counts each student once per year. Unpublished, ABSENT and WITHHELD results are not counted.
          </p>
        </>
      )}
    </section>
  );
}
