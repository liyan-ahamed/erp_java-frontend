'use client';

import { Fragment, Suspense, useState } from 'react';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronRight, Calculator, Info } from '@/components/ui/icons';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { EmptyBlock, ErrorBanner, LoadingBlock, PendingTotal } from '@/components/gradebook/shared';
import { CalculationStatusBadge, InternalMarksBreakdown } from '@/components/gradebook/InternalMarksBreakdown';
import { useAuth } from '@/contexts/auth-context';
import { useAllSubjectOfferings, useMyInternalMarks, useOfferingInternalMarks } from '@/hooks/useGradebook';
import { ROUTES } from '@/constants/routes';
import { classLabel, subjectTypeLabel } from '@/lib/gradebook-labels';
import { OfferingPicker } from '@/components/academic/AcademicContextFilter';
import { TeachingSelector } from '@/components/academic/TeachingSelector';
import { useTeachingSelection } from '@/hooks/useTeachingSelection';
import { useCohortsIn } from '@/hooks/useAcademic';
import { InternalMarks } from '@/types/gradebook';
import { isGradebookEnabled } from '@/lib/feature-flags';

// Internal-mark totals are not calculated by the backend yet (calculationStatus
// PENDING_CALCULATION_CONFIGURATION, totals null). This page never fills them in.

function NotConfiguredNotice() {
  return (
    <div className="flex items-start gap-3 rounded-[10px] bg-accent-soft border border-accent/30 p-4 text-sm text-accent">
      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-medium">Internal calculation not configured yet.</p>
        <p className="text-xs mt-0.5">
          Totals will appear once the calculation formula is configured. Finalized assessment marks are shown as source data.
        </p>
      </div>
    </div>
  );
}

const allPending = (list: InternalMarks[]) =>
  list.every((m) => m.students.every((s) => s.calculationStatus === 'PENDING_CALCULATION_CONFIGURATION'));

/** HOD: Cohort → Semester → Section → Subject. STAFF: Batch → Semester → Class (their own classes). */
function OfferingInternalMarks({ isStaff }: { isStaff: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teaching = useTeachingSelection();
  const selected = isStaff ? teaching.selection.offeringId : Number(searchParams.get('offering')) || null;
  const [expanded, setExpanded] = useState<number | null>(null);

  const offerings = useAllSubjectOfferings();
  const cohorts = useCohortsIn(offerings.data);
  const { data, isLoading, isError, error } = useOfferingInternalMarks(selected);
  const practical = !!data?.practicalComponentApplicable;

  const select = (value: string) => {
    setExpanded(null);
    router.replace(value ? `${ROUTES.INTERNAL_MARKS}?offering=${value}` : ROUTES.INTERNAL_MARKS);
  };

  const picker = isStaff ? (
    <TeachingSelector rows={teaching.rows} batches={teaching.batches} value={teaching.selection} classMode="required"
      idPrefix="internal-marks" disabled={teaching.isLoading}
      onChange={(next) => { setExpanded(null); teaching.setSelection(next); }} />
  ) : (
    <OfferingPicker
      rows={offerings.data ?? []}
      value={selected}
      cohorts={cohorts}
      idPrefix="internal-marks"
      disabled={offerings.isLoading}
      onChange={(o) => {
        if (o?.id !== (selected ?? undefined)) select(o ? String(o.id) : '');
      }}
    />
  );

  let body;
  if (offerings.isError) {
    body = <ErrorBanner error={offerings.error} fallback="Unable to load courses." />;
  } else if (!offerings.isLoading && offerings.data?.length === 0) {
    body = <Card><EmptyBlock icon={<Calculator className="w-10 h-10" />} title="No courses assigned." /></Card>;
  } else if (!selected) {
    body = <Card><EmptyBlock icon={<Calculator className="w-10 h-10" />} title={isStaff ? 'Choose a class to view its internal marks.' : 'Choose a cohort, semester, section and subject to view internal marks.'} /></Card>;
  } else if (isLoading) {
    body = <Card><LoadingBlock label="Loading internal marks..." /></Card>;
  } else if (isError || !data) {
    body = <ErrorBanner error={error} fallback="Unable to load internal marks." title="Error Loading Internal Marks" />;
  } else {
    body = (
      <div className="space-y-4">
        {allPending([data]) && <NotConfiguredNotice />}
        <Card>
          <div className="px-6 py-4 border-b border-line flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-[550] text-fg">{data.offering.subjectName}</h3>
            <Badge variant="outline">{subjectTypeLabel(data.offering.subjectType)}</Badge>
            <span className="text-xs text-muted">
              {classLabel(data.offering)} · Sem {data.offering.semester} · {data.offering.academicYear} · {data.offering.staffName}
            </span>
          </div>
          {data.students.length === 0 ? (
            <EmptyBlock icon={<Calculator className="w-10 h-10" />} title="No students in this class." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"><span className="sr-only">Expand</span></TableHead>
                    <TableHead className="whitespace-nowrap">Register No.</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>{practical ? 'Theory / 50' : 'Theory Total'}</TableHead>
                    {practical && <TableHead>Practical / 50</TableHead>}
                    <TableHead>{practical ? 'Total / 100' : 'Total Internals'}</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.students.map((s) => {
                    const open = expanded === s.studentId;
                    return (
                      <Fragment key={s.studentId}>
                        <TableRow className="cursor-pointer" onClick={() => setExpanded(open ? null : s.studentId)}>
                          <TableCell>
                            <button
                              aria-label={open ? `Hide details for ${s.name}` : `Show details for ${s.name}`}
                              aria-expanded={open}
                              className="text-muted"
                            >
                              {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          </TableCell>
                          <TableCell className="font-mono text-xs whitespace-nowrap">{s.registerNumber}</TableCell>
                          <TableCell className="font-medium whitespace-nowrap">{s.name}</TableCell>
                          <TableCell><PendingTotal value={s.theoryComponentTotal} /></TableCell>
                          {practical && <TableCell><PendingTotal value={s.practicalComponentTotal} /></TableCell>}
                          <TableCell><PendingTotal value={s.totalInternalMarks} /></TableCell>
                          <TableCell><CalculationStatusBadge status={s.calculationStatus} /></TableCell>
                        </TableRow>
                        {open && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={practical ? 7 : 6} className="bg-soft">
                              <div className="py-2"><InternalMarksBreakdown entry={s} practical={practical} /></div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <PageContainer contextArea={picker} rawLayout={true}>
      {body}
    </PageContainer>
  );
}

/** STUDENT: own internal marks for every offering of their section. */
function MyInternalMarks() {
  const { data, isLoading, isError, error } = useMyInternalMarks({});

  if (isLoading) return <PageContainer><LoadingBlock label="Loading internal marks..." /></PageContainer>;
  if (isError || !data) {
    return (
      <PageContainer>
        <ErrorBanner error={error} fallback="Unable to load your internal marks." title="Error Loading Internal Marks" />
      </PageContainer>
    );
  }

  return (
    <PageContainer rawLayout={true}>
      <div className="space-y-6">
        {data.length > 0 && allPending(data) && <NotConfiguredNotice />}
        {data.length === 0 ? (
          <Card><EmptyBlock icon={<Calculator className="w-10 h-10" />} title="No subjects with internal marks yet." /></Card>
        ) : (
          data.map((item) => {
            const entry = item.students[0];
            return (
              <Card key={item.offering.id}>
                <div className="px-6 py-4 border-b border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-[550] text-fg">{item.offering.subjectName}</h3>
                      <span className="font-mono text-xs text-muted">{item.offering.subjectCode}</span>
                      <Badge variant="outline">{subjectTypeLabel(item.offering.subjectType)}</Badge>
                    </div>
                    <p className="text-xs text-muted mt-0.5">Semester {item.offering.semester} · {item.offering.academicYear}</p>
                  </div>
                  {entry && <CalculationStatusBadge status={entry.calculationStatus} />}
                </div>
                <CardContent className="p-6">
                  {entry ? (
                    <InternalMarksBreakdown entry={entry} practical={item.practicalComponentApplicable} />
                  ) : (
                    <p className="text-sm text-muted">Internal calculation not configured yet.</p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </PageContainer>
  );
}

function InternalMarksView() {
  const { hasRole } = useAuth();
  return hasRole('ROLE_STUDENT') ? <MyInternalMarks /> : <OfferingInternalMarks isStaff={hasRole('ROLE_STAFF') && !hasRole('ROLE_HOD')} />;
}

export default function InternalMarksPage() {
  // Marking is switched off on the backend; the page is kept for when it returns.
  if (!isGradebookEnabled()) notFound();
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STAFF', 'ROLE_STUDENT']}>
      <Suspense fallback={<PageContainer><LoadingBlock label="Loading..." /></PageContainer>}>
        <InternalMarksView />
      </Suspense>
    </RequireRole>
  );
}
