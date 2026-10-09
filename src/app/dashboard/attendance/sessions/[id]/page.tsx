'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, CheckCheck, CheckCircle2, Pencil, Save, Trash2, Users } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { EmptyBlock, ErrorBanner, FormError, LoadingBlock, SidePanel } from '@/components/gradebook/shared';
import { ConfirmBox } from '@/components/portfolio/shared';
import { ReadOnlyNote, StatTile, StatusBadge, SuccessNote, parseRowErrors } from '@/components/erp/shared';
import { AttendanceSessionForm } from '@/components/erp/AttendanceSessionForm';
import { useAuth } from '@/contexts/auth-context';
import {
  useAttendanceRecords,
  useDeleteAttendanceSession,
  useFinalizeAttendanceSession,
  useSaveAttendanceRecords,
} from '@/hooks/useAttendance';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatDate, formatDateTime } from '@/lib/gradebook-labels';
import { ATTENDANCE_STATUSES, ATTENDANCE_STATUS_BADGE, SESSION_STATUS_BADGE } from '@/lib/erp-labels';
import { ROUTES } from '@/constants/routes';
import { ApiResponse } from '@/types/api';
import { AttendanceRecord, AttendanceRecordStatus, AttendanceStatus, NOT_MARKED } from '@/types/attendance';

interface RowDraft {
  status: AttendanceRecordStatus;
  remarks: string;
}

const draftOf = (r: AttendanceRecord): RowDraft => ({ status: r.status, remarks: r.remarks ?? '' });
const sameDraft = (a: RowDraft, b: RowDraft) => a.status === b.status && a.remarks.trim() === b.remarks.trim();

function StatusPicker({ value, onChange, name }: { value: AttendanceRecordStatus; onChange: (s: AttendanceStatus) => void; name: string }) {
  return (
    <div role="radiogroup" aria-label={`Attendance for ${name}`} className="inline-flex rounded-lg border border-[#E8E8E8] overflow-hidden">
      {ATTENDANCE_STATUSES.map((s) => {
        const active = value === s;
        const tone = s === 'PRESENT' ? 'bg-green-600' : s === 'ABSENT' ? 'bg-red-600' : s === 'ON_DUTY' ? 'bg-blue-600' : 'bg-amber-600';
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(s)}
            className={`px-2.5 h-8 text-xs font-medium whitespace-nowrap border-l first:border-l-0 border-[#E8E8E8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] ${
              active ? `${tone} text-white` : 'bg-white text-[#666666] hover:bg-[#F5F5F5]'
            }`}
          >
            {ATTENDANCE_STATUS_BADGE[s].label}
          </button>
        );
      })}
    </div>
  );
}

function TakeAttendanceView() {
  const params = useParams<{ id: string }>();
  const sessionId = Number(params.id);
  const validId = Number.isInteger(sessionId) && sessionId > 0;
  const router = useRouter();
  const { user, hasRole } = useAuth();

  const { data, isLoading, isError, error } = useAttendanceRecords(validId ? sessionId : null);
  const saveRecords = useSaveAttendanceRecords();
  const finalize = useFinalizeAttendanceSession();
  const removeSession = useDeleteAttendanceSession();

  const [edits, setEdits] = useState<Record<number, RowDraft>>({});
  const [savedMessage, setSavedMessage] = useState('');
  const [confirm, setConfirm] = useState<'finalize' | 'discard' | 'leave' | 'delete' | null>(null);
  const [editingSession, setEditingSession] = useState(false);

  const session = data?.session;
  const isOwner = !!session && hasRole('ROLE_STAFF') && session.staffId === user?.id;
  const editable = isOwner && session?.status === 'DRAFT';

  const originals = useMemo(() => {
    const map = new Map<number, RowDraft>();
    data?.records.forEach((r) => map.set(r.studentId, draftOf(r)));
    return map;
  }, [data]);

  const changedIds = useMemo(
    () => Object.keys(edits).map(Number).filter((id) => {
      const original = originals.get(id);
      return original && !sameDraft(original, edits[id]);
    }),
    [edits, originals],
  );
  const dirty = changedIds.length > 0;
  const serverErrors = useMemo(() => parseRowErrors(saveRecords.error), [saveRecords.error]);

  // Rows still unmarked after local edits (finalize needs every enrolled student marked).
  const unmarkedLocally = data?.records.filter((r) => r.inRoster && (edits[r.studentId] ?? originals.get(r.studentId))?.status === NOT_MARKED).length ?? 0;

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const draftFor = (r: AttendanceRecord) => edits[r.studentId] ?? originals.get(r.studentId)!;
  const updateRow = (r: AttendanceRecord, patch: Partial<RowDraft>) => {
    setSavedMessage('');
    setEdits((old) => ({ ...old, [r.studentId]: { ...(old[r.studentId] ?? originals.get(r.studentId)!), ...patch } }));
  };

  /** Local convenience only: sets every enrolled student to Present; nothing is sent until Save. */
  const markAllPresent = () => {
    if (!data) return;
    setSavedMessage('');
    setEdits((old) => {
      const next = { ...old };
      data.records.filter((r) => r.inRoster).forEach((r) => {
        next[r.studentId] = { ...(old[r.studentId] ?? originals.get(r.studentId)!), status: 'PRESENT' };
      });
      return next;
    });
  };

  const onSave = () => {
    if (!session) return;
    const records = changedIds
      .map((id) => ({ id, draft: edits[id] }))
      .filter(({ draft }) => draft.status !== NOT_MARKED)
      .map(({ id, draft }) => ({ studentId: id, status: draft.status as AttendanceStatus, remarks: draft.remarks.trim() || null }));
    if (records.length === 0) { setEdits({}); return; }
    saveRecords.mutate({ sessionId: session.id, payload: { records } }, {
      onSuccess: (result) => {
        setEdits({});
        setSavedMessage(`Saved — ${result.created} added, ${result.updated} updated. ${result.notMarked} of ${result.rosterSize} still not marked.`);
      },
    });
  };

  const finalizeError = finalize.error;
  const finalizeDetails = axios.isAxiosError<ApiResponse>(finalizeError) ? finalizeError.response?.data?.errors ?? [] : [];

  if (!validId) return <PageContainer><ErrorBanner error={null} fallback="Invalid attendance session link." /></PageContainer>;
  if (isLoading) return <PageContainer><LoadingBlock label="Loading attendance session..." /></PageContainer>;
  if (isError || !data || !session) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Link href={ROUTES.ATTENDANCE} className="inline-flex items-center text-sm text-[#666666] hover:text-[#111111]">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to attendance
          </Link>
          <ErrorBanner error={error} fallback="Unable to load this attendance session." title="Error Loading Session" />
        </div>
      </PageContainer>
    );
  }

  const readOnlyReason =
    session.status === 'FINALIZED'
      ? `This session was finalized${session.finalizedAt ? ` on ${formatDateTime(session.finalizedAt)}` : ''} and is locked.`
      : hasRole('ROLE_HOD')
        ? 'Read-only view. Only the assigned staff member can take or finalize attendance.'
        : !isOwner ? 'Read-only view. This session belongs to another staff member.' : null;

  return (
    <PageContainer rawLayout>
      <div className="space-y-6">
        <button onClick={() => (dirty ? setConfirm('leave') : router.push(ROUTES.ATTENDANCE))} className="inline-flex items-center text-sm text-[#666666] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to attendance
        </button>
        {confirm === 'leave' && (
          <ConfirmBox message="You have unsaved attendance. Leave without saving?" confirmLabel="Leave" variant="danger"
            onCancel={() => setConfirm(null)} onConfirm={() => router.push(ROUTES.ATTENDANCE)} />
        )}

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full space-y-6">
            <Card>
              <CardContent className="p-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-[#111111]">{session.subjectName}</h2>
                    <span className="font-mono text-xs text-[#9A9A9A]">{session.subjectCode}</span>
                    <StatusBadge info={SESSION_STATUS_BADGE[session.status]} />
                  </div>
                  <p className="text-sm text-[#666666] mt-1">
                    {formatDate(session.attendanceDate)} · {session.periodNumber ? `Period ${session.periodNumber}` : 'No period'} · Section {session.sectionName}
                  </p>
                  <p className="text-xs text-[#9A9A9A] mt-1">Topic: {session.topic ?? '—'} · Staff: {session.staffName}</p>
                </div>
                {editable && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditingSession(true)}><Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit Details</Button>
                    <Button size="sm" variant="ghost" onClick={() => { removeSession.reset(); setConfirm('delete'); }}><Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {confirm === 'delete' && (
              <div className="space-y-2">
                {removeSession.isError && <FormError error={removeSession.error} fallback="Unable to delete the session." />}
                <ConfirmBox message="Delete this draft session and all its marks?" confirmLabel="Delete Session" variant="danger"
                  isLoading={removeSession.isPending} onCancel={() => setConfirm(null)}
                  onConfirm={() => removeSession.mutate(session.id, { onSuccess: () => router.push(ROUTES.ATTENDANCE) })} />
              </div>
            )}

            {readOnlyReason && <ReadOnlyNote>{readOnlyReason}</ReadOnlyNote>}

            <div className="grid grid-cols-3 gap-3 max-w-xl">
              <StatTile label="Enrolled" value={data.rosterSize} />
              <StatTile label="Marked" value={data.marked} hint="saved" />
              <StatTile label="Not Marked" value={data.notMarked} hint="saved" />
            </div>

            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">{editable ? 'Take Attendance' : 'Attendance'}</CardTitle>
                  <p className="text-xs text-[#9A9A9A] mt-1">{data.records.length} students</p>
                </div>
                {editable && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {dirty && <Badge variant="warning">{changedIds.length} unsaved change{changedIds.length === 1 ? '' : 's'}</Badge>}
                    <Button size="sm" variant="secondary" onClick={markAllPresent}><CheckCheck className="w-3.5 h-3.5 mr-1.5" /> Mark All Present</Button>
                    {dirty && <Button size="sm" variant="ghost" onClick={() => setConfirm('discard')} disabled={saveRecords.isPending}>Discard</Button>}
                    <Button size="sm" onClick={onSave} isLoading={saveRecords.isPending} disabled={!dirty}>
                      {!saveRecords.isPending && <Save className="w-3.5 h-3.5 mr-1.5" />} Save Draft
                    </Button>
                    <Button size="sm" variant="outline" disabled={dirty || saveRecords.isPending}
                      title={dirty ? 'Save or discard your changes before finalizing' : undefined}
                      onClick={() => { finalize.reset(); setConfirm('finalize'); }}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Finalize
                    </Button>
                  </div>
                )}
              </CardHeader>

              <div className="px-6 pt-4 space-y-2 empty:hidden">
                {confirm === 'discard' && (
                  <ConfirmBox message="Discard all unsaved changes?" confirmLabel="Discard" variant="danger"
                    onCancel={() => setConfirm(null)} onConfirm={() => { setEdits({}); saveRecords.reset(); setConfirm(null); }} />
                )}
                {confirm === 'finalize' && (
                  <ConfirmBox
                    message={
                      <>
                        Finalize this session? Finalized attendance is locked and counts towards students&apos; attendance percentage.
                        {data.notMarked > 0 && <> <strong>{data.notMarked} student{data.notMarked === 1 ? ' is' : 's are'} still not marked</strong> — the system will refuse to finalize until everyone is marked.</>}
                      </>
                    }
                    confirmLabel="Finalize Session"
                    isLoading={finalize.isPending}
                    onCancel={() => setConfirm(null)}
                    onConfirm={() => finalize.mutate(session, { onSettled: () => setConfirm(null), onSuccess: () => setSavedMessage('') })}
                  />
                )}
                {savedMessage && <SuccessNote>{savedMessage}</SuccessNote>}
                {finalize.isSuccess && <SuccessNote>Session finalized. It is now locked.</SuccessNote>}
                {editable && dirty && unmarkedLocally > 0 && (
                  <p className="text-xs text-[#92400E]">{unmarkedLocally} student{unmarkedLocally === 1 ? ' is' : 's are'} still not marked. Unmarked students are never marked absent automatically.</p>
                )}
                {saveRecords.isError && (
                  <div className="rounded-[10px] bg-red-50 p-3 text-sm text-red-600 border border-red-100" role="alert">
                    {serverErrors.byStudent.size > 0 || serverErrors.other.length > 0 ? (
                      <>
                        <p className="font-medium">{serverErrors.message}</p>
                        {serverErrors.byStudent.size > 0 && <p className="mt-1">{serverErrors.byStudent.size} row(s) rejected — see the highlighted students. Nothing was saved.</p>}
                        {serverErrors.other.map((line) => <p key={line} className="mt-1">{line}</p>)}
                      </>
                    ) : <p>{getApiErrorMessage(saveRecords.error, 'Unable to save attendance.')}</p>}
                  </div>
                )}
                {finalize.isError && (
                  <div className="rounded-[10px] bg-red-50 p-3 text-sm text-red-600 border border-red-100" role="alert">
                    <p className="font-medium">
                      {axios.isAxiosError<ApiResponse>(finalizeError) && finalizeError.response?.data?.message
                        ? finalizeError.response.data.message
                        : getApiErrorMessage(finalizeError, 'Unable to finalize the session.')}
                    </p>
                    {finalizeDetails.length > 0 && (
                      <ul className="mt-1 list-disc pl-5 max-h-40 overflow-y-auto">
                        {finalizeDetails.map((line) => <li key={line}>{line}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <CardContent className="p-0 pt-2">
                {data.records.length === 0 ? (
                  <EmptyBlock icon={<Users className="w-10 h-10" />} title="No students are enrolled in this subject offering." />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead className="whitespace-nowrap">Register Number</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="min-w-48">Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.records.map((r, index) => {
                          const draft = draftFor(r);
                          const changed = changedIds.includes(r.studentId);
                          const problem = serverErrors.byStudent.get(r.studentId);
                          const rowEditable = editable && r.inRoster;
                          return (
                            <TableRow key={r.studentId} className={problem ? 'bg-red-50/60' : changed ? 'bg-[#FFFBEB]' : ''}>
                              <TableCell className="text-[#9A9A9A] text-xs">{index + 1}</TableCell>
                              <TableCell className="font-mono text-xs whitespace-nowrap">{r.registerNumber}</TableCell>
                              <TableCell>
                                <div className="font-medium whitespace-nowrap">{r.studentName}</div>
                                {!r.inRoster && <div className="text-[11px] text-[#9A9A9A]">No longer enrolled</div>}
                                {problem && <div className="text-xs text-red-600 mt-0.5">{problem}</div>}
                              </TableCell>
                              <TableCell>
                                {rowEditable ? (
                                  <StatusPicker value={draft.status} name={r.studentName} onChange={(s) => updateRow(r, { status: s })} />
                                ) : (
                                  <StatusBadge info={ATTENDANCE_STATUS_BADGE[draft.status]} />
                                )}
                              </TableCell>
                              <TableCell>
                                {rowEditable ? (
                                  <input type="text" maxLength={255} aria-label={`Remarks for ${r.studentName}`} value={draft.remarks}
                                    onChange={(e) => updateRow(r, { remarks: e.target.value })}
                                    className="h-9 w-full min-w-40 px-2 text-sm border border-[#E8E8E8] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#111111]" />
                                ) : (
                                  <span className="text-[#666666] text-sm">{r.remarks || '—'}</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {editingSession && editable && (
            <SidePanel title="Edit Session Details" onClose={() => setEditingSession(false)}>
              <AttendanceSessionForm session={session} onSaved={() => setEditingSession(false)} />
            </SidePanel>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

export default function AttendanceSessionPage() {
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STAFF']}>
      <TakeAttendanceView />
    </RequireRole>
  );
}
