'use client';

import { FormEvent, useEffect, useState } from 'react';
import { BookOpen, Plus, Search } from 'lucide-react';
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
  EmptyBlock,
  ErrorBanner,
  FieldLabel,
  FormError,
  LoadingBlock,
  SidePanel,
} from '@/components/gradebook/shared';
import { useAuth } from '@/contexts/auth-context';
import { useSaveSubject, useSubjects } from '@/hooks/useGradebook';
import { SELECT_CLASS, SUBJECT_TYPE_LABELS, SUBJECT_TYPES } from '@/lib/gradebook-labels';
import { Subject, SubjectRequest, SubjectType } from '@/types/gradebook';

const PAGE_SIZE = 20;

type Panel = { mode: 'create' } | { mode: 'edit'; subject: Subject } | null;

function SubjectForm({ subject, onSaved }: { subject?: Subject; onSaved: () => void }) {
  const [form, setForm] = useState<SubjectRequest>(
    subject
      ? { code: subject.code, name: subject.name, subjectType: subject.subjectType, active: subject.active }
      : { code: '', name: '', subjectType: 'THEORY', active: true },
  );
  const save = useSaveSubject();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(
      { id: subject?.id, payload: { ...form, code: form.code.trim(), name: form.name.trim() } },
      { onSuccess: onSaved },
    );
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
        <p className="text-xs text-[#9A9A9A]">Letters, digits, &apos;-&apos; and &apos;_&apos;. Saved in upper case.</p>
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
          value={form.subjectType}
          onChange={(e) => setForm({ ...form, subjectType: e.target.value as SubjectType })}
          className={SELECT_CLASS}
        >
          {SUBJECT_TYPES.map((type) => (
            <option key={type} value={type}>{SUBJECT_TYPE_LABELS[type]}</option>
          ))}
        </select>
        {subject && (
          <p className="text-xs text-[#9A9A9A]">The type can&apos;t change once the subject has offerings.</p>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
        Active
      </label>

      {save.isError && <FormError error={save.error} fallback="Unable to save subject." />}

      <Button type="submit" className="w-full" isLoading={save.isPending}>
        {subject ? 'Save Changes' : 'Create Subject'}
      </Button>
    </form>
  );
}

function SubjectsView() {
  const { hasRole } = useAuth();
  const canManage = hasRole('ROLE_HOD');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<SubjectType | ''>('');
  const [activeFilter, setActiveFilter] = useState<'' | 'active' | 'inactive'>('');
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);

  // Search runs on the server; wait for typing to pause before querying.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, error, isFetching } = useSubjects({
    page,
    size: PAGE_SIZE,
    search,
    subjectType: typeFilter || undefined,
    active: activeFilter === '' ? undefined : activeFilter === 'active',
  });

  const filtersBar = (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
      <div className="flex-1 w-full sm:max-w-xs">
        <Input
          icon={<Search className="w-4 h-4" />}
          placeholder="Search by code or name..."
          aria-label="Search subjects"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>
      <select
        aria-label="Filter by subject type"
        value={typeFilter}
        onChange={(e) => { setTypeFilter(e.target.value as SubjectType | ''); setPage(0); }}
        className={SELECT_CLASS}
      >
        <option value="">All Types</option>
        {SUBJECT_TYPES.map((type) => <option key={type} value={type}>{SUBJECT_TYPE_LABELS[type]}</option>)}
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
          <Plus className="w-4 h-4 mr-1.5" /> Add Subject
        </Button>
      )}
    </div>
  );

  const editingId = panel?.mode === 'edit' ? panel.subject.id : null;

  return (
    <PageContainer contextArea={filtersBar} rawLayout={true}>
      <div className="flex flex-col-reverse lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          {isError ? (
            <ErrorBanner error={error} fallback="Unable to load subjects." title="Error Loading Subjects" />
          ) : (
            <Card>
              {isLoading ? (
                <LoadingBlock label="Loading subjects..." />
              ) : data?.content.length === 0 ? (
                <EmptyBlock icon={<BookOpen className="w-10 h-10" />} title="No subjects found" />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Subject Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.content.map((subject) => (
                        <TableRow
                          key={subject.id}
                          className={`${canManage ? 'cursor-pointer' : ''} ${editingId === subject.id ? 'bg-[#F5F5F5]' : ''}`}
                          onClick={canManage ? () => setPanel({ mode: 'edit', subject }) : undefined}
                        >
                          <TableCell className="font-mono text-xs font-semibold">{subject.code}</TableCell>
                          <TableCell className="font-medium">{subject.name}</TableCell>
                          <TableCell><Badge variant="outline">{SUBJECT_TYPE_LABELS[subject.subjectType]}</Badge></TableCell>
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
        </div>

        {canManage && panel?.mode === 'create' && (
          <SidePanel title="Add Subject" onClose={() => setPanel(null)}>
            <SubjectForm onSaved={() => setPanel(null)} />
          </SidePanel>
        )}
        {canManage && panel?.mode === 'edit' && (
          <SidePanel title="Edit Subject" onClose={() => setPanel(null)}>
            <SubjectForm key={panel.subject.id} subject={panel.subject} onSaved={() => setPanel(null)} />
          </SidePanel>
        )}
      </div>
    </PageContainer>
  );
}

export default function SubjectsPage() {
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STAFF']}>
      <SubjectsView />
    </RequireRole>
  );
}
