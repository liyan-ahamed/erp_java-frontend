'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, Search } from '@/components/ui/icons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import {
  ActiveBadge,
  EmptyBlock,
  ErrorBanner,
  FieldLabel,
  FormError,
  LoadingBlock,
  SidePanel,
} from '@/components/gradebook/shared';
import { FilterBar } from '@/components/erp/shared';
import { useAllSubjectOfferings, useSaveSubject, useSubjects } from '@/hooks/useGradebook';
import { useBatches } from '@/hooks/useAcademic';
import { cohortLabel, sortCohorts } from '@/lib/academic-context';
import { SELECT_CLASS, SUBJECT_TYPE_LABELS, SUBJECT_TYPES, formatCredits, hasCredits, subjectTypeLabel } from '@/lib/gradebook-labels';
import { Subject, SubjectRequest, SubjectType } from '@/types/gradebook';

// Reusable subject definitions (formerly the Subjects page). Credits appear only when the backend
// sends them; a subject with no type yet is shown as "Not classified".
//
// A subject has no semester of its own: the semester belongs to each class offering of it, and the same
// subject can be offered in several semesters or cohorts. The Cohort / Semester filters are the backend's
// `batchId` / `semester` params on GET /subjects (subjects with an active offering, filtered before paging), and
// "Offered In" is each subject's `offeredIn` list (contract D). Semester and cohort choices come from active
// subject offerings, so only real values are offered.

const PAGE_SIZE = 20;

type Panel = { mode: 'create' } | { mode: 'edit'; subject: Subject } | null;

function SubjectForm({ subject, withCredits, onSaved }: { subject?: Subject; withCredits: boolean; onSaved: () => void }) {
  const [form, setForm] = useState<SubjectRequest>(
    subject
      ? { code: subject.code, name: subject.name, subjectType: subject.subjectType, active: subject.active }
      : { code: '', name: '', subjectType: 'THEORY', active: true },
  );
  const [credits, setCredits] = useState(subject?.credits === null || subject?.credits === undefined ? '' : String(subject.credits));
  const [problem, setProblem] = useState('');
  const save = useSaveSubject();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (withCredits && credits !== '' && !(/^\d+$/.test(credits) && Number(credits) <= 40)) {
      return setProblem('Credits must be a whole number from 0 to 40.');
    }
    setProblem('');
    const payload: SubjectRequest = { ...form, code: form.code.trim(), name: form.name.trim() };
    // The backend's PUT replaces the whole subject, so credits are always sent back (null = not recorded).
    if (withCredits) payload.credits = credits === '' ? null : Number(credits);
    save.mutate({ id: subject?.id, payload }, { onSuccess: onSaved });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <FieldLabel htmlFor="subject-code">Subject Code *</FieldLabel>
        <Input
          id="subject-code"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          required
          maxLength={20}
          placeholder="e.g. CS301"
        />
        <p className="text-xs text-muted">Letters, digits, &apos;-&apos; and &apos;_&apos;. Saved in upper case.</p>
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="subject-name">Subject Name *</FieldLabel>
        <Input
          id="subject-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          maxLength={150}
        />
      </div>
      <div className="space-y-1.5 flex flex-col">
        <FieldLabel htmlFor="subject-type">Subject Type *</FieldLabel>
        <select
          id="subject-type"
          value={form.subjectType ?? ''}
          onChange={(e) => setForm({ ...form, subjectType: (e.target.value || null) as SubjectType | null })}
          className={SELECT_CLASS}
        >
          {subject?.subjectType === null && <option value="">Not classified</option>}
          {SUBJECT_TYPES.map((type) => (
            <option key={type} value={type}>{SUBJECT_TYPE_LABELS[type]}</option>
          ))}
        </select>
        {subject && (
          <p className="text-xs text-muted">The type can&apos;t change once the subject is assigned to a class.</p>
        )}
      </div>
      {withCredits && (
        <div className="space-y-1.5">
          <FieldLabel htmlFor="subject-credits">Credits</FieldLabel>
          <Input id="subject-credits" inputMode="numeric" value={credits} onChange={(e) => setCredits(e.target.value.trim())} placeholder="Not recorded" />
          <p className="text-xs text-muted">Whole number, 0 allowed. Leave empty if not recorded.</p>
        </div>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
        Active
      </label>

      {problem && <p className="text-sm text-danger" role="alert">{problem}</p>}
      {save.isError && <FormError error={save.error} fallback="Unable to save subject." />}

      <Button type="submit" className="w-full" isLoading={save.isPending}>
        {subject ? 'Save Changes' : 'Create Subject'}
      </Button>
    </form>
  );
}

export function SubjectCatalog({ canManage }: { canManage: boolean }) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<SubjectType | ''>('');
  const [activeFilter, setActiveFilter] = useState<'' | 'active' | 'inactive'>('');
  const [cohortId, setCohortId] = useState<number | null>(null);
  const [semester, setSemester] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const offerings = useAllSubjectOfferings();
  const batches = useBatches();

  // Search runs on the server; wait for typing to pause before querying.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const byOffering = cohortId !== null || semester !== null;
  const { data, isLoading, isError, error, isFetching } = useSubjects({
    page,
    size: PAGE_SIZE,
    search,
    subjectType: typeFilter || undefined,
    active: activeFilter === '' ? undefined : activeFilter === 'active',
    semester: semester ?? undefined,
    batchId: cohortId ?? undefined,
  });

  // Active offerings in the chosen cohort (or all cohorts) — only for the Semester dropdown's options.
  const scoped = useMemo(
    () => (offerings.data ?? []).filter((o) => o.active && (cohortId === null || o.batchId === cohortId)),
    [offerings.data, cohortId],
  );
  // "Offered In": the subject's semesters, limited to the chosen cohort when one is set.
  const offeredIn = (subject: Subject) =>
    [...new Set((subject.offeredIn ?? []).filter((o) => cohortId === null || o.batchId === cohortId).map((o) => o.semester))].sort((a, b) => a - b);
  const semesterOptions = useMemo(() => [...new Set(scoped.map((o) => o.semester))].sort((a, b) => a - b), [scoped]);
  const cohortOptions = useMemo(
    () => (batches.data
      ? sortCohorts(batches.data).map((b) => ({ id: b.id, label: cohortLabel(b) }))
      : [...new Map((offerings.data ?? []).map((o) => [o.batchId, { id: o.batchId, label: o.batchName }])).values()]),
    [batches.data, offerings.data],
  );

  const editingId = panel?.mode === 'edit' ? panel.subject.id : null;
  const withCredits = hasCredits(data?.content ?? []);

  return (
    <div className="space-y-4">
      <FilterBar>
        <div className="w-full sm:w-64">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder="Search by code or name..."
            aria-label="Search subjects"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <select
          aria-label="Cohort"
          value={cohortId ?? ''}
          disabled={offerings.isLoading}
          onChange={(e) => {
            const next = e.target.value ? Number(e.target.value) : null;
            setCohortId(next);
            // Keep the semester only if the new cohort offers courses in it.
            const nextSemesters = new Set((offerings.data ?? []).filter((o) => o.active && (next === null || o.batchId === next)).map((o) => o.semester));
            if (semester !== null && !nextSemesters.has(semester)) setSemester(null);
            setPage(0);
          }}
          className={SELECT_CLASS}
        >
          <option value="">All Cohorts</option>
          {cohortOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select
          aria-label="Semester"
          value={semester ?? ''}
          disabled={offerings.isLoading || semesterOptions.length === 0}
          onChange={(e) => { setSemester(e.target.value ? Number(e.target.value) : null); setPage(0); }}
          className={SELECT_CLASS}
        >
          <option value="">All Semesters</option>
          {semesterOptions.map((s) => <option key={s} value={s}>Semester {s}</option>)}
        </select>
        <select
          aria-label="Subject type"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as SubjectType | ''); setPage(0); }}
          className={SELECT_CLASS}
        >
          <option value="">All Types</option>
          {SUBJECT_TYPES.map((type) => <option key={type} value={type}>{SUBJECT_TYPE_LABELS[type]}</option>)}
        </select>
        <select
          aria-label="Status"
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
            <Plus className="w-4 h-4" /> Add Subject
          </Button>
        )}
      </FilterBar>

      {offerings.isError && (
        <p className="text-[12px] text-muted" role="status">Class offerings couldn&apos;t be loaded, so the Cohort / Semester choices are unavailable.</p>
      )}
      {byOffering && !isError && (
        <p className="text-[12px] text-muted" role="status">
          Subjects with an active class offering in {semester !== null ? `Semester ${semester}` : 'any semester'}
          {cohortId !== null ? ` for ${cohortOptions.find((c) => c.id === cohortId)?.label ?? 'this cohort'}` : ' in any cohort'}.
        </p>
      )}
      {isError ? (
        <ErrorBanner error={error} fallback="Unable to load subjects." title="Error Loading Subjects" />
      ) : (
        <Card>
          {isLoading ? (
            <LoadingBlock label="Loading subjects..." />
          ) : data?.content.length === 0 ? (
            <EmptyBlock icon={<BookOpen className="w-10 h-10" />} title="No subjects found"
              hint={byOffering ? 'No subject matches these filters and has an active class offering in this semester / cohort.' : undefined} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="col-fit">Code</TableHead>
                    <TableHead>Subject Name</TableHead>
                    <TableHead className="col-fit">Type</TableHead>
                    <TableHead className="col-fit">Offered In</TableHead>
                    {withCredits && <TableHead className="col-fit">Credits</TableHead>}
                    <TableHead className="col-fit">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.content.map((subject) => (
                    <TableRow
                      key={subject.id}
                      className={`${canManage ? 'cursor-pointer' : ''} ${editingId === subject.id ? 'bg-soft' : ''}`}
                      onClick={canManage ? () => setPanel({ mode: 'edit', subject }) : undefined}
                    >
                      <TableCell className="font-mono text-xs font-[550]">{subject.code}</TableCell>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell><Badge variant="outline">{subjectTypeLabel(subject.subjectType)}</Badge></TableCell>
                      <TableCell className="whitespace-nowrap text-[12px]">
                        {offeredIn(subject).length
                          ? offeredIn(subject).map((sem) => `Sem ${sem}`).join(', ')
                          : <span className="text-muted" title={cohortId === null ? 'No active class offering' : 'No active offering for this cohort'}>—</span>}
                      </TableCell>
                      {withCredits && <TableCell>{formatCredits(subject.credits)}</TableCell>}
                      <TableCell><ActiveBadge active={subject.active} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data && <Pagination data={data} onPageChange={setPage} />}
            </>
          )}
        </Card>
      )}

      {canManage && panel?.mode === 'create' && (
        <SidePanel title="Add Subject" onClose={() => setPanel(null)}>
          <SubjectForm withCredits={withCredits} onSaved={() => setPanel(null)} />
        </SidePanel>
      )}
      {canManage && panel?.mode === 'edit' && (
        <SidePanel title="Edit Subject" onClose={() => setPanel(null)}>
          <SubjectForm key={panel.subject.id} subject={panel.subject} withCredits={withCredits} onSaved={() => setPanel(null)} />
        </SidePanel>
      )}
    </div>
  );
}
