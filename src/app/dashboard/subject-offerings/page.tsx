'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Layers, Pencil, Plus } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import {
  ActiveBadge,
  AssessmentStatusBadge,
  DetailField,
  EmptyBlock,
  ErrorBanner,
  FieldLabel,
  FormError,
  LoadingBlock,
  SidePanel,
} from '@/components/gradebook/shared';
import { useAuth } from '@/contexts/auth-context';
import { useBatches, useSections } from '@/hooks/useAcademic';
import {
  useAllSubjects,
  useAssessments,
  useSaveSubjectOffering,
  useStaffOptions,
  useSubjectOffering,
  useSubjectOfferings,
} from '@/hooks/useGradebook';
import { getApiErrorMessage } from '@/lib/api-error';
import { isGradebookEnabled } from '@/lib/feature-flags';
import {
  ASSESSMENT_TYPE_LABELS,
  SELECT_CLASS,
  SUBJECT_TYPE_LABELS,
  classLabel,
  formatDate,
} from '@/lib/gradebook-labels';
import { ROUTES } from '@/constants/routes';
import { SubjectOffering, SubjectOfferingRequest } from '@/types/gradebook';
import { Batch } from '@/types/academic';

const PAGE_SIZE = 20;
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

type Panel = { mode: 'detail'; id: number } | { mode: 'create' } | { mode: 'edit'; offering: SubjectOffering } | null;

const YEAR_NAMES: Record<number, string> = { 1: 'First Year', 2: 'Second Year', 3: 'Third Year', 4: 'Fourth Year' };

/** e.g. "Second Year — 2025-2029"; just the batch name when the year of study is unknown. */
const batchLabel = (b: Pick<Batch, 'name' | 'currentYear'>) =>
  b.currentYear ? `${YEAR_NAMES[b.currentYear] ?? `Year ${b.currentYear}`} — ${b.name}` : b.name;

function OfferingForm({ offering, onSaved }: { offering?: SubjectOffering; onSaved: (o: SubjectOffering) => void }) {
  const subjects = useAllSubjects();
  const staff = useStaffOptions();
  const batches = useBatches();
  // Subject, class, year and semester are fixed by the backend once assessments exist. While
  // marking is switched off /assessments is unavailable, so the backend's own error covers it.
  const existing = useAssessments({ page: 0, size: 1, subjectOfferingId: offering?.id }, !!offering && isGradebookEnabled());
  const contextLocked = !!offering && (existing.data?.totalElements ?? 0) > 0;
  const save = useSaveSubjectOffering();

  const [form, setForm] = useState({
    subjectId: offering ? String(offering.subjectId) : '',
    batchId: offering ? String(offering.batchId) : '',
    sectionId: offering ? String(offering.sectionId) : '',
    staffId: offering ? String(offering.staffId) : '',
    academicYear: offering?.academicYear ?? '',
    semester: offering ? String(offering.semester) : '',
    active: offering?.active ?? true,
  });
  const sections = useSections(form.batchId ? Number(form.batchId) : null, !!form.batchId);

  // /batches and /sections list active batches only. When editing, keep the
  // offering's own batch/section selectable even if its batch was retired.
  const batchOptions = [...(batches.data ?? [])];
  if (offering && !batchOptions.some((b) => b.id === offering.batchId)) {
    batchOptions.push({ id: offering.batchId, name: offering.batchName, currentYear: null, admissionYear: null, graduationYear: null, active: false });
  }
  const sectionOptions = (sections.data ?? []).map((sec) => ({ id: sec.id, name: sec.name }));
  if (offering && String(offering.batchId) === form.batchId && !sectionOptions.some((sec) => sec.id === offering.sectionId)) {
    sectionOptions.push({ id: offering.sectionId, name: offering.sectionName });
  }

  const onBatchChange = (batchId: string) =>
    // Sections belong to one batch, so a new batch always needs a new section.
    setForm({ ...form, batchId, sectionId: batchId === form.batchId ? form.sectionId : '' });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const payload: SubjectOfferingRequest = {
      subjectId: Number(form.subjectId),
      batchId: Number(form.batchId),
      sectionId: Number(form.sectionId),
      staffId: Number(form.staffId),
      academicYear: form.academicYear.trim(),
      semester: Number(form.semester),
      active: form.active,
    };
    save.mutate({ id: offering?.id, payload }, { onSuccess: onSaved });
  };

  if (subjects.isLoading || staff.isLoading || batches.isLoading) {
    return <div className="py-10 flex justify-center"><Spinner size="lg" /></div>;
  }
  const loadError = subjects.error ?? staff.error ?? batches.error;
  if (loadError) return <FormError error={loadError} fallback="Unable to load form options." />;

  return (
    <form onSubmit={submit} className="space-y-4">
      {contextLocked && (
        <p className="rounded-[10px] bg-[#FFFBEB] border border-[#FDE68A] p-3 text-xs text-[#92400E]">
          This offering has assessments, so its subject, class, academic year and semester are locked.
          Staff and status can still change.
        </p>
      )}
      <div className="space-y-1.5 flex flex-col">
        <FieldLabel htmlFor="offering-subject">Subject *</FieldLabel>
        <select
          id="offering-subject"
          required
          disabled={contextLocked}
          value={form.subjectId}
          onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
          className={SELECT_CLASS}
        >
          <option value="">Select subject</option>
          {subjects.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} — {s.name}{s.active ? '' : ' (inactive)'}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 flex flex-col">
          <FieldLabel htmlFor="offering-batch">Batch *</FieldLabel>
          <select
            id="offering-batch"
            required
            disabled={contextLocked}
            value={form.batchId}
            onChange={(e) => onBatchChange(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Select batch</option>
            {batchOptions.map((b) => (
              <option key={b.id} value={b.id}>{batchLabel(b)}{b.active ? '' : ' (inactive)'}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 flex flex-col">
          <FieldLabel htmlFor="offering-section">Section *</FieldLabel>
          <select
            id="offering-section"
            required
            disabled={contextLocked || !form.batchId || sections.isLoading}
            value={form.sectionId}
            onChange={(e) => setForm({ ...form, sectionId: e.target.value })}
            className={SELECT_CLASS}
          >
            <option value="">
              {!form.batchId ? 'Select a batch first' : sections.isLoading ? 'Loading sections...' : 'Select section'}
            </option>
            {sectionOptions.map((sec) => (
              <option key={sec.id} value={sec.id}>Section {sec.name}</option>
            ))}
          </select>
        </div>
      </div>
      {form.batchId && sections.isError && (
        <p className="text-xs text-red-600">{getApiErrorMessage(sections.error, 'Unable to load sections.')}</p>
      )}
      {form.batchId && sections.isSuccess && sectionOptions.length === 0 && (
        <p className="text-xs text-[#9A9A9A]">No sections available for this batch.</p>
      )}
      <div className="space-y-1.5 flex flex-col">
        <FieldLabel htmlFor="offering-staff">Assigned Staff *</FieldLabel>
        <select
          id="offering-staff"
          required
          value={form.staffId}
          onChange={(e) => setForm({ ...form, staffId: e.target.value })}
          className={SELECT_CLASS}
        >
          <option value="">Select staff member</option>
          {staff.data?.map((u) => (
            <option key={u.id} value={u.id}>{u.name} — {u.designation || 'Staff'}</option>
          ))}
          {offering && !staff.data?.some((u) => u.id === offering.staffId) && (
            <option value={offering.staffId}>{offering.staffName} (not an active staff member)</option>
          )}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="offering-year">Academic Year *</FieldLabel>
          <Input
            id="offering-year"
            required
            disabled={contextLocked}
            pattern="\d{4}-\d{4}"
            title="Two consecutive years, e.g. 2026-2027"
            placeholder="2026-2027"
            value={form.academicYear}
            onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 flex flex-col">
          <FieldLabel htmlFor="offering-semester">Semester *</FieldLabel>
          <select
            id="offering-semester"
            required
            disabled={contextLocked}
            value={form.semester}
            onChange={(e) => setForm({ ...form, semester: e.target.value })}
            className={SELECT_CLASS}
          >
            <option value="">Select</option>
            {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
        Active
      </label>

      {save.isError && <FormError error={save.error} fallback="Unable to save subject offering." />}

      <Button type="submit" className="w-full" isLoading={save.isPending}>
        {offering ? 'Save Changes' : 'Create Offering'}
      </Button>
    </form>
  );
}

function OfferingDetail({ id, canManage, onEdit }: { id: number; canManage: boolean; onEdit: (o: SubjectOffering) => void }) {
  const { data: offering, isLoading, isError, error } = useSubjectOffering(id);
  const gradebookEnabled = isGradebookEnabled();
  const assessments = useAssessments({ page: 0, size: 50, subjectOfferingId: id }, gradebookEnabled);

  if (isLoading) return <div className="py-10 flex justify-center"><Spinner size="lg" /></div>;
  if (isError || !offering) {
    return <p className="text-sm text-red-600">{getApiErrorMessage(error, 'Unable to load offering.')}</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-base font-semibold text-[#111111]">{offering.subjectName}</h4>
        <p className="text-sm text-[#666666] font-mono">{offering.subjectCode}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <ActiveBadge active={offering.active} />
          <Badge variant="outline">{SUBJECT_TYPE_LABELS[offering.subjectType]}</Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Batch" value={offering.batchName} />
        <DetailField label="Section" value={offering.sectionName} />
        <DetailField label="Academic Year" value={offering.academicYear} />
        <DetailField label="Semester" value={`Semester ${offering.semester}`} />
        <div className="col-span-2">
          <DetailField label="Assigned Staff" value={offering.staffName} />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {canManage && (
          <Button size="sm" variant="secondary" onClick={() => onEdit(offering)}>
            <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
          </Button>
        )}
        {gradebookEnabled && (
          <Link href={`${ROUTES.INTERNAL_MARKS}?offering=${offering.id}`}>
            <Button size="sm" variant="outline">Internal Marks</Button>
          </Link>
        )}
      </div>

      {gradebookEnabled && (
      <div className="pt-4 border-t border-[#F5F5F5]">
        <FieldLabel>Assessments</FieldLabel>
        {assessments.isLoading ? (
          <div className="py-4 flex justify-center"><Spinner /></div>
        ) : assessments.isError ? (
          <p className="text-sm text-red-600 mt-2">{getApiErrorMessage(assessments.error, 'Unable to load assessments.')}</p>
        ) : assessments.data?.content.length === 0 ? (
          <p className="text-sm text-[#666666] mt-2">No assessments created yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#F5F5F5]">
            {assessments.data?.content.map((a) => (
              <li key={a.id}>
                <Link
                  href={`${ROUTES.ASSESSMENTS}/${a.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 hover:bg-[#FAFAFA] rounded-lg px-2 -mx-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#111111] truncate">{a.title}</p>
                    <p className="text-xs text-[#9A9A9A]">{ASSESSMENT_TYPE_LABELS[a.assessmentType]} · {formatDate(a.assessmentDate)}</p>
                  </div>
                  <AssessmentStatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {(assessments.data?.totalElements ?? 0) > (assessments.data?.content.length ?? 0) && (
          <Link href={ROUTES.ASSESSMENTS} className="text-xs text-[#2563EB] hover:underline">
            View all {assessments.data?.totalElements} assessments
          </Link>
        )}
      </div>
      )}
    </div>
  );
}

function SubjectOfferingsView() {
  const { hasRole } = useAuth();
  const canManage = hasRole('ROLE_HOD');

  const [subjectFilter, setSubjectFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<'' | 'active' | 'inactive'>('');
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);

  const subjects = useAllSubjects();
  const { data, isLoading, isError, error, isFetching } = useSubjectOfferings({
    page,
    size: PAGE_SIZE,
    subjectId: subjectFilter ? Number(subjectFilter) : undefined,
    semester: semesterFilter ? Number(semesterFilter) : undefined,
    active: activeFilter === '' ? undefined : activeFilter === 'active',
  });

  const filtersBar = (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
      <select
        aria-label="Filter by subject"
        value={subjectFilter}
        onChange={(e) => { setSubjectFilter(e.target.value); setPage(0); }}
        className={SELECT_CLASS}
      >
        <option value="">All Subjects</option>
        {subjects.data?.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
      </select>
      <select
        aria-label="Filter by semester"
        value={semesterFilter}
        onChange={(e) => { setSemesterFilter(e.target.value); setPage(0); }}
        className={SELECT_CLASS}
      >
        <option value="">All Semesters</option>
        {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
      </select>
      <select
        aria-label="Filter by status"
        value={activeFilter}
        onChange={(e) => { setActiveFilter(e.target.value as '' | 'active' | 'inactive'); setPage(0); }}
        className={SELECT_CLASS}
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      {isFetching && !isLoading && <Spinner size="sm" />}
      {canManage && (
        <Button className="sm:ml-auto" onClick={() => setPanel({ mode: 'create' })}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Offering
        </Button>
      )}
    </div>
  );

  const selectedId = panel?.mode === 'detail' ? panel.id : panel?.mode === 'edit' ? panel.offering.id : null;

  return (
    <PageContainer contextArea={filtersBar} rawLayout={true}>
      <div className="flex flex-col-reverse lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          {isError ? (
            <ErrorBanner error={error} fallback="Unable to load subject offerings." title="Error Loading Offerings" />
          ) : (
            <Card>
              {isLoading ? (
                <LoadingBlock label="Loading subject offerings..." />
              ) : data?.content.length === 0 ? (
                <EmptyBlock
                  icon={<Layers className="w-10 h-10" />}
                  title={canManage ? 'No subject offerings found.' : 'No subject offerings assigned.'}
                />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Staff</TableHead>
                          <TableHead>Academic Year</TableHead>
                          <TableHead>Sem</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.content.map((o) => (
                          <TableRow
                            key={o.id}
                            className={`cursor-pointer ${selectedId === o.id ? 'bg-[#F5F5F5]' : ''}`}
                            onClick={() => setPanel({ mode: 'detail', id: o.id })}
                          >
                            <TableCell>
                              <div className="font-medium">{o.subjectName}</div>
                              <div className="text-xs text-[#9A9A9A] font-mono">{o.subjectCode}</div>
                            </TableCell>
                            <TableCell className="text-[#666666] whitespace-nowrap">{classLabel(o)}</TableCell>
                            <TableCell className="text-[#666666]">{o.staffName}</TableCell>
                            <TableCell className="text-[#666666]">{o.academicYear}</TableCell>
                            <TableCell className="text-[#666666]">{o.semester}</TableCell>
                            <TableCell><ActiveBadge active={o.active} /></TableCell>
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
        </div>

        {panel?.mode === 'detail' && (
          <SidePanel title="Offering Details" onClose={() => setPanel(null)}>
            <OfferingDetail id={panel.id} canManage={canManage} onEdit={(offering) => setPanel({ mode: 'edit', offering })} />
          </SidePanel>
        )}
        {canManage && panel?.mode === 'create' && (
          <SidePanel title="Add Subject Offering" onClose={() => setPanel(null)}>
            <OfferingForm onSaved={(o) => setPanel({ mode: 'detail', id: o.id })} />
          </SidePanel>
        )}
        {canManage && panel?.mode === 'edit' && (
          <SidePanel title="Edit Subject Offering" onClose={() => setPanel({ mode: 'detail', id: panel.offering.id })}>
            <OfferingForm
              key={panel.offering.id}
              offering={panel.offering}
              onSaved={(o) => setPanel({ mode: 'detail', id: o.id })}
            />
          </SidePanel>
        )}
      </div>
    </PageContainer>
  );
}

export default function SubjectOfferingsPage() {
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STAFF']}>
      <SubjectOfferingsView />
    </RequireRole>
  );
}
