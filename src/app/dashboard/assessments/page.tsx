'use client';

import { useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { ClipboardList, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { AssessmentForm } from '@/components/gradebook/AssessmentForm';
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
  offeringLabel,
} from '@/lib/gradebook-labels';
import { ROUTES } from '@/constants/routes';
import { Assessment, AssessmentStatus, AssessmentType } from '@/types/gradebook';
import { isGradebookEnabled } from '@/lib/feature-flags';

const PAGE_SIZE = 20;

type Panel = { mode: 'create' } | { mode: 'edit'; assessment: Assessment } | null;

function AssessmentsView() {
  const { user, hasRole } = useAuth();
  const router = useRouter();
  const isStaff = hasRole('ROLE_STAFF');

  const [offeringFilter, setOfferingFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssessmentType | ''>('');
  const [statusFilter, setStatusFilter] = useState<AssessmentStatus | ''>('');
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);

  const offerings = useAllSubjectOfferings();
  const { data, isLoading, isError, error, isFetching } = useAssessments({
    page,
    size: PAGE_SIZE,
    subjectOfferingId: offeringFilter ? Number(offeringFilter) : undefined,
    assessmentType: typeFilter || undefined,
    status: statusFilter || undefined,
  });
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
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
      <select
        aria-label="Filter by subject offering"
        value={offeringFilter}
        onChange={(e) => { setOfferingFilter(e.target.value); setPage(0); }}
        className={`${SELECT_CLASS} max-w-full sm:max-w-md`}
      >
        <option value="">All Subject Offerings</option>
        {offerings.data?.map((o) => <option key={o.id} value={o.id}>{offeringLabel(o)}</option>)}
      </select>
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
          <Plus className="w-4 h-4 mr-1.5" /> New Assessment
        </Button>
      )}
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
          {isError ? (
            <ErrorBanner error={error} fallback="Unable to load assessments." title="Error Loading Assessments" />
          ) : (
            <Card>
              {isLoading ? (
                <LoadingBlock label="Loading assessments..." />
              ) : data?.content.length === 0 ? (
                <EmptyBlock
                  icon={<ClipboardList className="w-10 h-10" />}
                  title="No assessments created yet."
                  hint={offeringFilter || typeFilter || statusFilter ? 'Try different filters.' : undefined}
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
                              <div className="text-xs text-[#9A9A9A]">{ASSESSMENT_TYPE_LABELS[a.assessmentType]}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-[#111111]">{a.subjectName} <span className="font-mono text-xs text-[#9A9A9A]">{a.subjectCode}</span></div>
                              <div className="text-xs text-[#9A9A9A]">{classLabel(a)} · Sem {a.semester}</div>
                            </TableCell>
                            <TableCell className="text-[#666666] whitespace-nowrap">{formatDate(a.assessmentDate)}</TableCell>
                            <TableCell className="text-right">{formatMarks(a.maxMarks)}</TableCell>
                            <TableCell className="text-right text-[#666666]">{formatMarks(a.passMarks)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {a.status === 'FINALIZED' && <Lock className="w-3.5 h-3.5 text-[#9A9A9A]" aria-hidden />}
                                <AssessmentStatusBadge status={a.status} />
                              </div>
                              {a.finalizedAt && (
                                <div className="text-[11px] text-[#9A9A9A] mt-1 whitespace-nowrap">{formatDateTime(a.finalizedAt)}</div>
                              )}
                            </TableCell>
                            {isStaff && (
                              <TableCell className="text-right">
                                {canChange(a) && (
                                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => setPanel({ mode: 'edit', assessment: a })}
                                      className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9A9A9A] hover:text-[#111111] hover:bg-[#F5F5F5] transition-colors"
                                      title="Edit assessment"
                                      aria-label={`Edit ${a.title}`}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => onDelete(a)}
                                      disabled={remove.isPending}
                                      className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9A9A9A] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
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
          {remove.isPending && <p className="text-xs text-[#9A9A9A] mt-2">Deleting...</p>}
          {offerings.isError && (
            <p className="text-xs text-red-600 mt-2">{getApiErrorMessage(offerings.error, 'Unable to load offerings for the filter.')}</p>
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

export default function AssessmentsPage() {
  // Marking is switched off on the backend; the page is kept for when it returns.
  if (!isGradebookEnabled()) notFound();
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STAFF']}>
      <AssessmentsView />
    </RequireRole>
  );
}
