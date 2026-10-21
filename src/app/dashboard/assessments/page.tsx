'use client';

import { Suspense, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { ClipboardList, Lock, Pencil, Plus, Trash2 } from '@/components/ui/icons';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { AssessmentForm } from '@/components/gradebook/AssessmentForm';
import { StaffAssessments } from '@/components/gradebook/StaffAssessments';
import {
  AssessmentStatusBadge,
  EmptyBlock,
  ErrorBanner,
  LoadingBlock,
  SidePanel,
} from '@/components/gradebook/shared';
import { useAuth } from '@/contexts/auth-context';
import { useAllSubjectOfferings, useAssessments, useDeleteAssessment } from '@/hooks/useGradebook';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  ASSESSMENT_TYPES,
  ASSESSMENT_TYPE_LABELS,
  SELECT_CLASS,
  classLabel,
  formatDate,
  formatDateTime,
  formatMarks,
} from '@/lib/gradebook-labels';
import { ROUTES } from '@/constants/routes';
import { Assessment, AssessmentStatus, AssessmentType } from '@/types/gradebook';
import { isGradebookEnabled } from '@/lib/feature-flags';
import { AcademicContextFilter } from '@/components/academic/AcademicContextFilter';
import { ContextPrompt, missingContext } from '@/components/academic/ContextGate';
import { ReadOnlyNote } from '@/components/erp/shared';
import { useCohortsIn } from '@/hooks/useAcademic';
import { AcademicContext, EMPTY_CONTEXT, resolveRow } from '@/lib/academic-context';

const PAGE_SIZE = 20;

type Panel = { mode: 'create' } | { mode: 'edit'; assessment: Assessment } | null;

function AssessmentsView() {
  const { user, hasRole } = useAuth();
  const router = useRouter();
  const isStaff = hasRole('ROLE_STAFF');
  const isHod = hasRole('ROLE_HOD');

  const [ctx, setCtx] = useState<AcademicContext>(EMPTY_CONTEXT);
  const [typeFilter, setTypeFilter] = useState<AssessmentType | ''>('');
  const [statusFilter, setStatusFilter] = useState<AssessmentStatus | ''>('');
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);

  const offerings = useAllSubjectOfferings();
  const cohorts = useCohortsIn(offerings.data);
  // The backend filters assessments by one course only, so the filter applies once a class course is
  // fully chosen (Cohort → Semester → Section → Subject).
  const offeringFilter = resolveRow(offerings.data ?? [], ctx)?.id;
  // HOD (department view): cohort-first — nothing loads until one class course is chosen, since the
  // backend can only filter by course. Faculty see their own assessments without choosing first.
  const prompt = isHod ? missingContext(ctx, 'subject') : null;
  const partial = !isHod && ctx.batchId !== null && offeringFilter === undefined;
  const { data, isLoading, isError, error, isFetching } = useAssessments({
    page,
    size: PAGE_SIZE,
    subjectOfferingId: offeringFilter,
    assessmentType: typeFilter || undefined,
    status: statusFilter || undefined,
  }, prompt === null);
  const remove = useDeleteAssessment();

  // Only the assigned staff member may change a DRAFT assessment; the backend enforces this too.
  const canChange = (a: Assessment) => isStaff && a.status === 'DRAFT' && a.staffId === user?.id;

  const onDelete = (a: Assessment) => {
    if (window.confirm(`Delete the draft assessment "${a.title}"? Any marks entered for it will be lost.`)) {
      remove.mutate(a.id, {
        onSuccess: () => {
          if (panel?.mode === 'edit' && panel.assessment.id === a.id) setPanel(null);
        },
      });
    }
  };

  const filtersBar = (
    <div className="space-y-3">
      <AcademicContextFilter rows={offerings.data ?? []} value={ctx} cohorts={cohorts} idPrefix="assessments"
        disabled={offerings.isLoading} onChange={(next) => { setCtx(next); setPage(0); }}>
        <select
          aria-label="Filter by assessment type"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as AssessmentType | ''); setPage(0); }}
          className={SELECT_CLASS}
        >
          <option value="">All Types</option>
          {ASSESSMENT_TYPES.map((t) => <option key={t} value={t}>{ASSESSMENT_TYPE_LABELS[t]}</option>)}
        </select>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as AssessmentStatus | ''); setPage(0); }}
          className={SELECT_CLASS}
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="FINALIZED">Finalized</option>
        </select>
        {isFetching && !isLoading && <Spinner size="sm" />}
        {isStaff && (
          <Button className="sm:ml-auto" onClick={() => setPanel({ mode: 'create' })}>
            <Plus className="w-4 h-4" /> New Assessment
          </Button>
        )}
      </AcademicContextFilter>
      {partial && <ReadOnlyNote>Showing all assessments — choose a section and subject to filter by course.</ReadOnlyNote>}
    </div>
  );

  return (
    <PageContainer contextArea={filtersBar} rawLayout={true}>
      {remove.isError && (
        <div className="mb-4">
          <ErrorBanner error={remove.error} fallback="Unable to delete assessment." />
        </div>
      )}
      <div className="flex flex-col-reverse lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          {prompt ? (
            <ContextPrompt icon={<ClipboardList className="w-10 h-10" />} title={prompt}
              hint={ctx.batchId === null ? 'Then choose the semester, section and subject to see its assessments.' : undefined} />
          ) : isError ? (
            <ErrorBanner error={error} fallback="Unable to load assessments." title="Error Loading Assessments" />
          ) : (
            <Card>
              {isLoading ? (
                <LoadingBlock label="Loading assessments..." />
              ) : data?.content.length === 0 ? (
                <EmptyBlock
                  icon={<ClipboardList className="w-10 h-10" />}
                  title="No assessments created yet."
                  hint={offeringFilter !== undefined || typeFilter || statusFilter ? 'Try different filters.' : undefined}
                />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Assessment</TableHead>
                          <TableHead>Subject / Class</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Max</TableHead>
                          <TableHead className="text-right">Pass</TableHead>
                          <TableHead>Status</TableHead>
                          {isStaff && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.content.map((a) => (
                          <TableRow
                            key={a.id}
                            className="cursor-pointer"
                            onClick={() => router.push(`${ROUTES.ASSESSMENTS}/${a.id}`)}
                          >
                            <TableCell>
                              <div className="font-medium">{a.title}</div>
                              <div className="text-xs text-muted">{ASSESSMENT_TYPE_LABELS[a.assessmentType]}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-fg">{a.subjectName} <span className="font-mono text-xs text-muted">{a.subjectCode}</span></div>
                              <div className="text-xs text-muted">{classLabel(a)} · Sem {a.semester}</div>
                            </TableCell>
                            <TableCell className="text-muted whitespace-nowrap">{formatDate(a.assessmentDate)}</TableCell>
                            <TableCell className="text-right">{formatMarks(a.maxMarks)}</TableCell>
                            <TableCell className="text-right text-muted">{formatMarks(a.passMarks)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {a.status === 'FINALIZED' && <Lock className="w-3.5 h-3.5 text-muted" aria-hidden />}
                                <AssessmentStatusBadge status={a.status} />
                              </div>
                              {a.finalizedAt && (
                                <div className="text-[11px] text-muted mt-1 whitespace-nowrap">{formatDateTime(a.finalizedAt)}</div>
                              )}
                            </TableCell>
                            {isStaff && (
                              <TableCell className="text-right">
                                {canChange(a) && (
                                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => setPanel({ mode: 'edit', assessment: a })}
                                      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-soft transition-colors"
                                      title="Edit assessment"
                                      aria-label={`Edit ${a.title}`}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => onDelete(a)}
                                      disabled={remove.isPending}
                                      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-danger hover:bg-danger-soft transition-colors disabled:opacity-50"
                                      title="Delete assessment"
                                      aria-label={`Delete ${a.title}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {data && <Pagination data={data} onPageChange={setPage} />}
                </>
              )}
            </Card>
          )}
          {remove.isPending && <p className="text-xs text-muted mt-2">Deleting...</p>}
          {offerings.isError && (
            <p className="text-xs text-danger mt-2">{getApiErrorMessage(offerings.error, 'Unable to load offerings for the filter.')}</p>
          )}
        </div>

        {isStaff && panel?.mode === 'create' && (
          <SidePanel title="New Assessment" onClose={() => setPanel(null)}>
            <AssessmentForm onSaved={(a) => router.push(`${ROUTES.ASSESSMENTS}/${a.id}`)} />
          </SidePanel>
        )}
        {isStaff && panel?.mode === 'edit' && (
          <SidePanel title="Edit Assessment" onClose={() => setPanel(null)}>
            <AssessmentForm key={panel.assessment.id} assessment={panel.assessment} onSaved={() => setPanel(null)} />
          </SidePanel>
        )}
      </div>
    </PageContainer>
  );
}

/** STAFF get the class-grouped overview; the HOD keeps the department-wide list. */
function AssessmentsByRole() {
  const { hasRole } = useAuth();
  if (hasRole('ROLE_STAFF') && !hasRole('ROLE_HOD')) {
    return (
      <Suspense fallback={<PageContainer><LoadingBlock label="Loading..." /></PageContainer>}>
        <StaffAssessments />
      </Suspense>
    );
  }
  return <AssessmentsView />;
}

export default function AssessmentsPage() {
  // Marking is switched off on the backend; the page is kept for when it returns.
  if (!isGradebookEnabled()) notFound();
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STAFF']}>
      <AssessmentsByRole />
    </RequireRole>
  );
}
