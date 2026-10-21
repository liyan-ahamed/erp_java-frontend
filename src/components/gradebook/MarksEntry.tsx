'use client';

import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Search, Users } from '@/components/ui/icons';
import { PageContainer } from '@/components/common/PageContainer';
import { Button } from '@/components/ui/Button';
import { EmptyBlock, ErrorBanner, LoadingBlock, SidePanel } from '@/components/gradebook/shared';
import { AssessmentForm } from '@/components/gradebook/AssessmentForm';
import { ConfirmDialog, StatusChip, TypeChip, longDate } from '@/components/gradebook/assessment-ui';
import { MarksImportDialog } from '@/components/gradebook/MarksImportDialog';
import { parseRowErrors } from '@/components/erp/shared';
import { useAuth } from '@/contexts/auth-context';
import { useAutosaveGrades, useFinalizeAssessment, useGradebook } from '@/hooks/useGradebook';
import { gradebookService } from '@/services/api/gradebook.service';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  MarkCheck,
  MarkDraft,
  SavedValue,
  checkMark,
  computeStats,
  formatMarkValue,
  isAbsentText,
  marksCsv,
  readyToFinalize,
  sameSaved,
  savedValueOf,
} from '@/lib/assessment-marks';
import { formatMarks } from '@/lib/gradebook-labels';
import { ROUTES } from '@/constants/routes';
import { Assessment, Gradebook, GradebookRow, StudentGradeEntry } from '@/types/gradebook';

const AUTOSAVE_DELAY_MS = 800;

type RowFilter = 'all' | 'empty' | 'absent' | 'errors';

const savedOf = (row: GradebookRow): SavedValue | null =>
  row.gradeStatus === 'GRADED' && row.marks !== null ? { status: 'GRADED', marks: Number(row.marks) }
    : row.gradeStatus === 'ABSENT' ? { status: 'ABSENT' }
      : row.gradeStatus === 'EXEMPTED' ? { status: 'EXEMPTED' }
        : null;

const draftOf = (saved: SavedValue | null): MarkDraft => ({
  raw: saved?.status === 'GRADED' ? formatMarkValue(saved.marks) : '',
  absent: saved?.status === 'ABSENT',
  exempted: saved?.status === 'EXEMPTED',
});

/** "just now", "1 min ago", "5 min ago", then the time. */
const savedAgo = (at: number, now: number) => {
  const mins = Math.floor((now - at) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return new Date(at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

function SummaryCard({ value, label, highlight }: { value: string; label: string; highlight?: boolean }) {
  return (
    <div className={`rounded-[13px] border px-4 py-3 min-w-0 ${highlight ? 'bg-warn-soft border-[color-mix(in_srgb,var(--orange-text)_25%,var(--border))]' : 'bg-surface border-line'}`}>
      <div className={`text-[20px] font-[600] leading-tight ${highlight ? 'text-warn' : 'text-fg'}`}>{value}</div>
      <div className="text-[11.5px] text-muted mt-1">{label}</div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={`h-[30px] px-3 rounded-full text-[12px] border whitespace-nowrap ${active ? 'bg-fg text-surface border-fg' : 'bg-surface text-fg border-line hover:bg-soft'}`}>
      {children}
    </button>
  );
}

interface EditorProps {
  gradebook: Gradebook;
  assessment: Assessment;
  editable: boolean;
  readOnlyReason: string | null;
}

/**
 * The marks table with autosave. Mounted once per assessment and status, so the teacher's typing is never
 * replaced by a refetch; after finalizing it remounts read-only from fresh data.
 */
function MarksEditor({ gradebook, assessment, editable, readOnlyReason }: EditorProps) {
  const maxMarks = Number(assessment.maxMarks);
  const passMarks = assessment.passMarks === null ? null : Number(assessment.passMarks);
  const students = gradebook.students;

  // What the server holds (updated after each successful save) and what is on screen.
  const [saved, setSaved] = useState<Map<number, SavedValue | null>>(() => new Map(students.map((r) => [r.studentId, savedOf(r)])));
  const [drafts, setDrafts] = useState<Map<number, MarkDraft>>(() => new Map(students.map((r) => [r.studentId, draftOf(savedOf(r))])));
  const remarks = useMemo(() => new Map(students.map((r) => [r.studentId, r.remarks])), [students]);

  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [rowErrors, setRowErrors] = useState<Map<number, string>>(new Map());
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [filter, setFilter] = useState<RowFilter>('all');
  const [filterIds, setFilterIds] = useState<Set<number> | null>(null);
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  const autosave = useAutosaveGrades();
  const finalize = useFinalizeAssessment();

  const checks = useMemo(() => {
    const map = new Map<number, MarkCheck>();
    students.forEach((r) => map.set(r.studentId, checkMark(drafts.get(r.studentId)!, maxMarks)));
    return map;
  }, [students, drafts, maxMarks]);
  const stats = useMemo(() => computeStats([...checks.values()], passMarks), [checks, passMarks]);

  /** Rows whose screen value differs from the server and can be saved. */
  const changedRows = useCallback(
    (d: Map<number, MarkDraft>, s: Map<number, SavedValue | null>) =>
      students.flatMap((r) => {
        const value = savedValueOf(checkMark(d.get(r.studentId)!, maxMarks));
        return value && value.status !== 'EXEMPTED' && !sameSaved(value, s.get(r.studentId) ?? null) ? [{ id: r.studentId, value }] : [];
      }),
    [students, maxMarks],
  );
  // A saved mark that was deleted can't be saved yet (contract §I2): flag it instead of dropping it silently.
  const cleared = useMemo(
    () => new Set(students.filter((r) => checks.get(r.studentId)?.kind === 'empty' && saved.get(r.studentId)).map((r) => r.studentId)),
    [students, checks, saved],
  );

  // ---------- Autosave ----------
  const draftsRef = useRef(drafts);
  const savedRef = useRef(saved);
  const inFlight = useRef(false);
  const again = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // flush re-runs itself after a save when more edits arrived meanwhile; the ref avoids a self-reference.
  const flushRef = useRef<() => void>(() => undefined);
  useEffect(() => { draftsRef.current = drafts; }, [drafts]);
  useEffect(() => { savedRef.current = saved; }, [saved]);

  const buildPayload = useCallback(
    (rows: { id: number; value: SavedValue }[]): StudentGradeEntry[] =>
      rows.map(({ id, value }) => ({
        studentId: id,
        status: value.status,
        marks: value.status === 'GRADED' ? value.marks : null,
        // Remarks aren't edited here; send them back unchanged so they are kept.
        remarks: remarks.get(id) ?? null,
      })),
    [remarks],
  );

  const flush = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (inFlight.current) { again.current = true; return; }
    const rows = changedRows(draftsRef.current, savedRef.current);
    if (rows.length === 0) { setPending(false); return; }
    inFlight.current = true;
    setPending(true);
    autosave.mutate(
      { assessmentId: assessment.id, payload: { grades: buildPayload(rows) } },
      {
        onSuccess: () => {
          const next = new Map(savedRef.current);
          rows.forEach(({ id, value }) => next.set(id, value));
          savedRef.current = next;
          setSaved(next);
          setRowErrors((old) => {
            const m = new Map(old);
            rows.forEach(({ id }) => m.delete(id));
            return m;
          });
          setSaveError(null);
          setLastSavedAt(Date.now());
        },
        onError: (error) => {
          setSaveError(error);
          setRowErrors(parseRowErrors(error).byStudent);
          again.current = false;
        },
        onSettled: (_d, error) => {
          inFlight.current = false;
          if (!error && (again.current || changedRows(draftsRef.current, savedRef.current).length > 0)) {
            again.current = false;
            flushRef.current();
          } else {
            setPending(false);
          }
        },
      },
    );
  }, [assessment.id, autosave, buildPayload, changedRows]);
  useEffect(() => { flushRef.current = flush; }, [flush]);

  const schedule = useCallback(() => {
    setPending(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
  }, [flush]);

  // Leaving the screen: send anything still waiting rather than dropping it.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (!editable || inFlight.current) return;
    const rows = changedRows(draftsRef.current, savedRef.current);
    if (rows.length) void gradebookService.saveGrades(assessment.id, { grades: buildPayload(rows) }).catch(() => undefined);
  }, [editable, assessment.id, buildPayload, changedRows]);

  const hasUnsaved = pending || !!saveError || changedRows(drafts, saved).length > 0 || cleared.size > 0;
  useEffect(() => {
    if (!hasUnsaved || !editable) return;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsaved, editable]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const setDraft = (studentId: number, patch: Partial<MarkDraft>) => {
    setDrafts((old) => {
      const next = new Map(old);
      next.set(studentId, { ...old.get(studentId)!, ...patch });
      draftsRef.current = next;
      return next;
    });
    schedule();
  };

  const onMarksChange = (studentId: number, value: string) => {
    if (isAbsentText(value)) setDraft(studentId, { absent: true, raw: '' });
    else setDraft(studentId, { absent: false, raw: value });
  };

  const applyImport = (values: { studentId: number; value: SavedValue }[]) => {
    setDrafts((old) => {
      const next = new Map(old);
      values.forEach(({ studentId, value }) => next.set(studentId, draftOf(value)));
      draftsRef.current = next;
      return next;
    });
    flush();
  };

  // ---------- Filters ----------
  const rowState = (id: number): RowFilter | 'ok' => {
    const c = checks.get(id)!;
    if (c.kind === 'error' || rowErrors.has(id) || cleared.has(id)) return 'errors';
    if (c.kind === 'empty') return 'empty';
    if (c.kind === 'absent') return 'absent';
    return 'ok';
  };
  const counts = {
    empty: students.filter((r) => rowState(r.studentId) === 'empty').length,
    absent: stats.absent,
    errors: students.filter((r) => rowState(r.studentId) === 'errors').length,
  };
  // The filtered list is fixed when the filter is chosen, so a row doesn't vanish while its mark is typed.
  const chooseFilter = (f: RowFilter) => {
    setFilter(f);
    setFilterIds(f === 'all' ? null : new Set(students.filter((r) => rowState(r.studentId) === f).map((r) => r.studentId)));
  };
  const term = search.trim().toLowerCase();
  const visible = students
    .map((row, index) => ({ row, number: index + 1 }))
    .filter(({ row }) => !filterIds || filterIds.has(row.studentId))
    .filter(({ row }) => !term || row.name.toLowerCase().includes(term) || row.registerNumber.toLowerCase().includes(term));

  // ---------- Keyboard ----------
  const focusRow = (position: number) => {
    const el = document.querySelector<HTMLInputElement>(`[data-mark-pos="${position}"]`);
    if (el) { el.focus(); el.select(); }
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>, position: number) => {
    if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'ArrowDown') { e.preventDefault(); focusRow(position + 1); }
    else if ((e.key === 'Enter' && e.shiftKey) || e.key === 'ArrowUp') { e.preventDefault(); focusRow(position - 1); }
  };

  // ---------- Finalize / export ----------
  const canFinalize = editable && readyToFinalize(stats) && !pending && !saveError && rowErrors.size === 0 && cleared.size === 0;
  const finalizeBlocker = !editable ? null
    : stats.errors > 0 || rowErrors.size > 0 || cleared.size > 0 ? 'Fix the highlighted marks first'
      : stats.notEntered > 0 ? `${stats.notEntered} student${stats.notEntered === 1 ? '' : 's'} still need a mark or Absent`
        : pending ? 'Waiting for changes to save' : saveError ? 'Some changes failed to save — retry first' : null;

  const exportCsv = () => {
    const csv = marksCsv(students.map((r) => ({ registerNumber: r.registerNumber, name: r.name, value: saved.get(r.studentId) ?? null })));
    const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assessment.subjectCode}-Sec${assessment.sectionName}-${assessment.title}.csv`.replace(/[^\w.-]+/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveStatus = !editable ? null
    : autosave.isPending || pending ? <span className="text-muted" role="status">Saving…</span>
      : saveError ? (
        <span className="text-danger flex items-center gap-2" role="alert">
          Failed{rowErrors.size === 0 ? ` — ${getApiErrorMessage(saveError, 'not saved')}` : ''}
          <button type="button" className="underline underline-offset-2" onClick={() => { setSaveError(null); flush(); }}>Retry</button>
        </span>
      )
        : lastSavedAt ? <span className="text-ok" role="status">✓ Saved {savedAgo(lastSavedAt, now)}</span>
          : <span className="text-muted">Changes save automatically</span>;

  const average = stats.average === null ? '—' : stats.average.toFixed(1);
  const done = assessment.status === 'FINALIZED';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2 -mt-2">
        <span className="text-[12px] mr-auto sm:mr-1">{saveStatus}</span>
        {editable && <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>Import from Excel</Button>}
        {editable && (
          <span title={finalizeBlocker ?? undefined}>
            <Button size="sm" disabled={!canFinalize} onClick={() => { finalize.reset(); setConfirmFinalize(true); }}>Finalize marks</Button>
          </span>
        )}
        {done && <Button variant="secondary" size="sm" onClick={exportCsv}><Download className="w-3.5 h-3.5" /> Export</Button>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" aria-label="Marks summary">
        <SummaryCard value={`${stats.entered} / ${stats.total}`} label="Marks entered" highlight={!done && stats.entered < stats.total} />
        <SummaryCard value={average} label={`Average (of ${formatMarks(maxMarks)})`} />
        <SummaryCard value={stats.highest === null ? '—' : formatMarkValue(stats.highest)} label="Highest" />
        <SummaryCard value={stats.lowest === null ? '—' : formatMarkValue(stats.lowest)} label="Lowest" />
        <SummaryCard value={String(stats.absent)} label={stats.exempted ? `Absent · ${stats.exempted} exempted` : 'Absent'} />
      </div>

      {readOnlyReason ? (
        <p className="rounded-[10px] bg-soft border border-line px-4 py-2.5 text-[12px] text-muted">{readOnlyReason}</p>
      ) : counts.empty > 0 ? (
        <p className="rounded-[10px] bg-warn-soft px-4 py-2.5 text-[12px] text-fg">
          {counts.empty} student{counts.empty === 1 ? '' : 's'} still {counts.empty === 1 ? 'has' : 'have'} no mark. Enter a mark or mark them absent to finalize. Finalized marks are locked.
        </p>
      ) : counts.errors > 0 ? (
        <p className="rounded-[10px] bg-danger-soft px-4 py-2.5 text-[12px] text-danger">
          Fix {counts.errors} highlighted mark{counts.errors === 1 ? '' : 's'} before finalizing.
        </p>
      ) : (
        <p className="rounded-[10px] bg-ok-soft px-4 py-2.5 text-[12px] text-fg">Every student has a mark or is marked absent. Review, then finalize — finalized marks are locked.</p>
      )}
      {cleared.size > 0 && (
        <p className="text-[12px] text-danger" role="alert">
          {cleared.size} saved mark{cleared.size === 1 ? ' was' : 's were'} cleared. A saved mark can&apos;t be removed yet — enter a mark or AB for {cleared.size === 1 ? 'that student' : 'those students'}.
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show students">
          <FilterChip active={filter === 'all'} onClick={() => chooseFilter('all')}>All {students.length}</FilterChip>
          <FilterChip active={filter === 'empty'} onClick={() => chooseFilter('empty')}>Not entered · {counts.empty}</FilterChip>
          <FilterChip active={filter === 'absent'} onClick={() => chooseFilter('absent')}>Absent · {counts.absent}</FilterChip>
          <FilterChip active={filter === 'errors'} onClick={() => chooseFilter('errors')}>Errors · {counts.errors}</FilterChip>
        </div>
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or reg. no."
            aria-label="Search students" className="f-control w-full !pl-9" />
        </div>
      </div>

      <div className="panel">
        {students.length === 0 ? (
          <EmptyBlock icon={<Users className="w-10 h-10" />} title="No active students in this class." />
        ) : (
          <div className="overflow-x-auto">
            <table className="f-table">
              <thead>
                <tr>
                  <th className="col-fit">#</th>
                  <th>Student</th>
                  <th className="col-fit">Marks (of {formatMarks(maxMarks)})</th>
                  <th className="col-fit">Absent</th>
                  <th><span className="sr-only">Message</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted">No students match.</td></tr>
                )}
                {visible.map(({ row, number }, position) => {
                  const d = drafts.get(row.studentId)!;
                  const c = checks.get(row.studentId)!;
                  const typingAb = /^a$/i.test(d.raw.trim());
                  const problem = rowErrors.get(row.studentId)
                    ?? (c.kind === 'error' && !typingAb ? c.message : null)
                    ?? (cleared.has(row.studentId) ? 'Cleared — not saved' : null);
                  const message = problem ?? (c.kind === 'absent' ? 'Absent' : c.kind === 'exempted' ? 'Exempted' : '');
                  const inputValue = d.exempted ? 'EX' : d.absent ? 'AB' : d.raw;
                  return (
                    <tr key={row.studentId} className={problem ? 'bg-danger-soft/60' : ''}>
                      <td className="text-muted">{number}</td>
                      <td>
                        <span className="font-[550] text-fg">{row.name}</span>{' '}
                        <span className="font-mono text-[11px] text-muted">{row.registerNumber}</span>
                      </td>
                      <td>
                        {editable ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              data-mark-pos={position}
                              aria-label={`Marks for ${row.name}, out of ${formatMarks(maxMarks)}`}
                              aria-invalid={!!problem}
                              aria-describedby={message ? `msg-${row.studentId}` : undefined}
                              value={inputValue}
                              placeholder="–"
                              disabled={d.exempted}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => onMarksChange(row.studentId, e.target.value)}
                              onKeyDown={(e) => onKeyDown(e, position)}
                              className={`h-8 w-[68px] px-2 text-right text-[12.5px] rounded-[7px] border bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent ${
                                problem ? 'border-danger text-danger' : 'border-line'
                              } ${d.absent || d.exempted ? 'bg-soft text-muted' : ''}`}
                            />
                            <span className="text-[11.5px] text-muted">/ {formatMarks(maxMarks)}</span>
                          </div>
                        ) : (
                          <span className="font-[550]">
                            {c.kind === 'graded' ? formatMarkValue(c.marks) : c.kind === 'absent' ? 'AB' : c.kind === 'exempted' ? 'EX' : '—'}
                            <span className="text-muted font-normal"> / {formatMarks(maxMarks)}</span>
                          </span>
                        )}
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-[var(--accent)]"
                          aria-label={`${row.name} absent`}
                          checked={d.absent}
                          disabled={!editable || d.exempted}
                          onChange={(e) => setDraft(row.studentId, { absent: e.target.checked, raw: '' })}
                        />
                      </td>
                      <td id={`msg-${row.studentId}`} className={`text-[12px] ${problem ? 'text-danger font-[550]' : 'text-muted'}`}>{message}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editable && (
        <p className="text-[11.5px] text-muted">
          <kbd className="px-1 rounded border border-line bg-soft font-mono">Enter</kbd> or <kbd className="px-1 rounded border border-line bg-soft font-mono">↓</kbd> moves
          to the next student · type <kbd className="px-1 rounded border border-line bg-soft font-mono">AB</kbd> to mark absent · changes save automatically.
        </p>
      )}

      {importOpen && (
        <MarksImportDialog
          students={students}
          current={new Map(students.map((r) => [r.studentId, savedValueOf(checks.get(r.studentId)!)]))}
          maxMarks={maxMarks}
          onClose={() => setImportOpen(false)}
          onApply={(values) => { applyImport(values); setImportOpen(false); }}
        />
      )}
      {confirmFinalize && (
        <ConfirmDialog
          title="Finalize marks?"
          confirmLabel="Finalize marks"
          isLoading={finalize.isPending}
          onClose={() => setConfirmFinalize(false)}
          onConfirm={() => finalize.mutate(assessment.id, { onSuccess: () => setConfirmFinalize(false) })}
        >
          <p>
            <strong>{assessment.title}</strong> · {assessment.subjectCode} · Sec {assessment.sectionName}
          </p>
          <p className="text-muted">
            {stats.total} students: {stats.graded} with marks, {stats.absent} absent{stats.exempted ? `, ${stats.exempted} exempted` : ''}.
            Marks are published to students and locked. This can&apos;t be undone here.
          </p>
          {finalize.isError && <p className="text-danger">{getApiErrorMessage(finalize.error, 'Unable to finalize.')}</p>}
        </ConfirmDialog>
      )}
    </div>
  );
}

/** STAFF / HOD → one assessment: marks entry for the owner while DRAFT, read-only results otherwise. */
export function MarksEntry({ assessmentId }: { assessmentId: number }) {
  const { user, hasRole } = useAuth();
  const { data, isLoading, isError, error } = useGradebook(assessmentId);
  const [editing, setEditing] = useState(false);

  const back = (
    <Link href={ROUTES.ASSESSMENTS} className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-fg">
      <ArrowLeft className="w-[13px] h-[13px]" /> Assessments
    </Link>
  );

  if (isLoading) return <PageContainer backLink={back}><LoadingBlock label="Loading marks..." /></PageContainer>;
  if (isError || !data) {
    return <PageContainer backLink={back}><ErrorBanner error={error} fallback="Unable to load this assessment." title="Error Loading Assessment" /></PageContainer>;
  }

  const a = data.assessment;
  const isOwner = hasRole('ROLE_STAFF') && a.staffId === user?.id;
  const editable = isOwner && a.status === 'DRAFT';
  const readOnlyReason =
    a.status === 'FINALIZED'
      ? `Finalized${a.finalizedAt ? ` on ${longDate(a.finalizedAt)}` : ''}. Marks are published to students and locked.`
      : hasRole('ROLE_HOD')
        ? 'Read-only. Only the assigned staff member can enter marks or finalize this assessment.'
        : !isOwner
          ? 'Read-only. This assessment belongs to another staff member.'
          : null;

  return (
    <PageContainer
      title={
        <span className="flex items-center gap-2.5 flex-wrap">
          {a.title} <TypeChip type={a.assessmentType} /> <StatusChip assessment={a} />
        </span>
      }
      description={
        <>
          {a.subjectName} · <span className="font-mono">{a.subjectCode}</span> · {a.batchName.replace(/-/g, '–')} · Sec {a.sectionName} · held{' '}
          {longDate(a.assessmentDate)} · <strong className="text-fg font-[550]">Max {formatMarks(a.maxMarks)}</strong> ·{' '}
          {a.passMarks === null ? 'no pass mark' : `pass mark ${formatMarks(a.passMarks)}`}
          {editable && (
            <>
              {' '}·{' '}
              <button type="button" className="text-accent underline underline-offset-2" onClick={() => setEditing(true)}>Edit details</button>
            </>
          )}
        </>
      }
      backLink={back}
    >
      <MarksEditor key={`${a.id}-${a.status}`} gradebook={data} assessment={a} editable={editable} readOnlyReason={readOnlyReason} />
      {editing && (
        <SidePanel title="Edit Assessment" onClose={() => setEditing(false)}>
          <AssessmentForm assessment={a} onSaved={() => setEditing(false)} />
        </SidePanel>
      )}
    </PageContainer>
  );
}
