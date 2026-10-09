'use client';

import { FormEvent, useState } from 'react';
import { ArrowDown, ArrowUp, BarChart3, EyeOff, MessageSquareText, Plus, Trash2, UserRound } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { EmptyBlock, ErrorBanner, FieldLabel, FormError, LoadingBlock, SidePanel } from '@/components/gradebook/shared';
import { ConfirmBox, TEXTAREA_CLASS } from '@/components/portfolio/shared';
import { FilterBar, ReadOnlyNote, StatTile, StatusBadge, SuccessNote, offeringOptionLabel } from '@/components/erp/shared';
import { useAuth } from '@/contexts/auth-context';
import { useBatches, useSections } from '@/hooks/useAcademic';
import { useAllSubjectOfferings } from '@/hooks/useGradebook';
import {
  useFeedbackAnalytics,
  useFeedbackFormAction,
  useFeedbackForms,
  useFeedbackResponses,
  useMyFeedbackForms,
  useSubmitFeedback,
} from '@/hooks/useFeedback';
import { SELECT_CLASS, formatDateTime } from '@/lib/gradebook-labels';
import {
  FEEDBACK_FORM_STATUSES,
  FEEDBACK_FORM_STATUS_BADGE,
  FEEDBACK_QUESTION_TYPES,
  FEEDBACK_QUESTION_TYPE_LABELS,
  FEEDBACK_TARGET_LABELS,
  FEEDBACK_TARGET_TYPES,
  RATING_VALUES,
} from '@/lib/erp-labels';
import {
  FeedbackForm,
  FeedbackFormRequest,
  FeedbackFormStatus,
  FeedbackQuestionType,
  FeedbackTargetType,
} from '@/types/feedback';

const ANONYMOUS_TEXT = 'Your response is anonymous.';

function ModeBadge({ anonymous }: { anonymous: boolean }) {
  return anonymous
    ? <Badge variant="info"><EyeOff className="w-3 h-3 mr-1" aria-hidden /> Anonymous</Badge>
    : <Badge variant="outline"><UserRound className="w-3 h-3 mr-1" aria-hidden /> Identified</Badge>;
}

// ---------- STUDENT ----------

function AnswerForm({ form, onDone }: { form: FeedbackForm; onDone: () => void }) {
  const submit = useSubmitFeedback();
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [texts, setTexts] = useState<Record<number, string>>({});
  const [missing, setMissing] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const answered = (qId: number, type: FeedbackQuestionType) => (type === 'RATING' ? ratings[qId] !== undefined : !!texts[qId]?.trim());

  const check = (event: FormEvent) => {
    event.preventDefault();
    const gaps = new Set(form.questions.filter((q) => q.required && !answered(q.id, q.questionType)).map((q) => q.id));
    setMissing(gaps);
    if (gaps.size === 0) setConfirming(true);
  };

  const send = () => {
    const answers = form.questions
      .filter((q) => answered(q.id, q.questionType))
      .map((q) => q.questionType === 'RATING'
        ? { questionId: q.id, rating: ratings[q.id], textAnswer: null }
        : { questionId: q.id, rating: null, textAnswer: texts[q.id].trim() });
    submit.mutate({ id: form.id, payload: { answers } }, { onSuccess: onDone, onSettled: () => setConfirming(false) });
  };

  return (
    <form onSubmit={check} className="space-y-5" noValidate>
      {form.anonymous ? (
        <div className="flex items-center gap-2 rounded-[10px] bg-[#EFF6FF] border border-[#BFDBFE] p-3 text-sm text-[#1E40AF]">
          <EyeOff className="w-4 h-4 flex-shrink-0" aria-hidden /> {ANONYMOUS_TEXT}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-[10px] bg-[#FFFBEB] border border-[#FDE68A] p-3 text-sm text-[#92400E]">
          <UserRound className="w-4 h-4 flex-shrink-0" aria-hidden /> This form is identified: your name is recorded with your answers.
        </div>
      )}
      {form.description && <p className="text-sm text-[#666666]">{form.description}</p>}
      {[...form.questions].sort((a, b) => a.position - b.position).map((q, i) => (
        <fieldset key={q.id} className={`space-y-2 rounded-[10px] p-3 border ${missing.has(q.id) ? 'border-red-300 bg-red-50/50' : 'border-transparent'}`}>
          <legend className="text-sm font-medium text-[#111111]">
            {i + 1}. {q.questionText} {q.required ? <span className="text-red-600" aria-label="required">*</span> : <span className="text-xs text-[#9A9A9A]">(optional)</span>}
          </legend>
          {q.questionType === 'RATING' ? (
            <div role="radiogroup" aria-label={q.questionText} className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-[#9A9A9A]">Poor</span>
              {RATING_VALUES.map((v) => (
                <button key={v} type="button" role="radio" aria-checked={ratings[q.id] === v} aria-label={`${v} out of 5`}
                  onClick={() => { setRatings({ ...ratings, [q.id]: v }); setConfirming(false); }}
                  className={`w-10 h-10 rounded-lg border text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] ${
                    ratings[q.id] === v ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E8E8E8] hover:bg-[#F5F5F5]'
                  }`}>
                  {v}
                </button>
              ))}
              <span className="text-[11px] text-[#9A9A9A]">Excellent</span>
            </div>
          ) : (
            <textarea aria-label={q.questionText} rows={3} maxLength={2000} className={TEXTAREA_CLASS} value={texts[q.id] ?? ''}
              onChange={(e) => { setTexts({ ...texts, [q.id]: e.target.value }); setConfirming(false); }} />
          )}
          {missing.has(q.id) && <p className="text-xs text-red-600">This question is required.</p>}
        </fieldset>
      ))}
      {submit.isError && <FormError error={submit.error} fallback="Unable to submit your feedback." />}
      {confirming ? (
        <ConfirmBox message="Submit your feedback? You can submit this form only once." confirmLabel="Submit Feedback"
          isLoading={submit.isPending} onCancel={() => setConfirming(false)} onConfirm={send} />
      ) : (
        <Button type="submit">Submit Feedback</Button>
      )}
    </form>
  );
}

function StudentFeedback() {
  const { data, isLoading, isError, error } = useMyFeedbackForms();
  const [openForm, setOpenForm] = useState<FeedbackForm | null>(null);
  const [thanks, setThanks] = useState('');

  if (isLoading) return <LoadingBlock label="Loading feedback forms..." />;
  if (isError || !data) return <ErrorBanner error={error} fallback="Unable to load feedback forms." title="Error Loading Feedback" />;

  return (
    <div className="space-y-4">
      {thanks && <SuccessNote>{thanks}</SuccessNote>}
      {data.length === 0 ? (
        <Card><EmptyBlock icon={<MessageSquareText className="w-10 h-10" />} title="No feedback forms for you right now." /></Card>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.map((f) => {
              const canAnswer = f.status === 'OPEN' && !f.submitted;
              return (
                <Card key={f.id} className={openForm?.id === f.id ? 'ring-1 ring-[#111111]' : ''}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-[#111111]">{f.title}</h3>
                    </div>
                    <p className="text-xs text-[#666666]">{f.targetLabel}</p>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge info={f.status === 'OPEN' ? { label: 'Open', variant: 'success' } : { label: 'Closed', variant: 'outline' }} />
                      {f.submitted ? <Badge variant="success">Submitted</Badge> : <Badge variant="warning">Not submitted</Badge>}
                      <ModeBadge anonymous={f.anonymous} />
                    </div>
                    {canAnswer ? (
                      <Button size="sm" onClick={() => { setThanks(''); setOpenForm(f); }}>Give Feedback</Button>
                    ) : (
                      <p className="text-xs text-[#9A9A9A]">{f.submitted ? 'You have already submitted this form.' : 'This form is closed.'}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {openForm && (
            <SidePanel title={openForm.title} onClose={() => setOpenForm(null)}>
              <AnswerForm key={openForm.id} form={openForm} onDone={() => { setOpenForm(null); setThanks('Thank you — your feedback was submitted.'); }} />
            </SidePanel>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- HOD: form builder ----------

interface QuestionDraft { key: number; questionText: string; questionType: FeedbackQuestionType; required: boolean }

let questionKey = 0;
const newQuestion = (): QuestionDraft => ({ key: ++questionKey, questionText: '', questionType: 'RATING', required: true });

function FormBuilder({ form, onSaved }: { form?: FeedbackForm; onSaved: () => void }) {
  const action = useFeedbackFormAction();
  const batches = useBatches();
  const sections = useSections(null);
  const offerings = useAllSubjectOfferings();
  const [state, setState] = useState({
    title: form?.title ?? '',
    description: form?.description ?? '',
    targetType: (form?.targetType ?? 'DEPARTMENT') as FeedbackTargetType,
    targetId: String(form?.targetBatchId ?? form?.targetSectionId ?? form?.targetSubjectOfferingId ?? ''),
    anonymous: form?.anonymous ?? true,
  });
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    form ? [...form.questions].sort((a, b) => a.position - b.position).map((q) => ({ key: ++questionKey, questionText: q.questionText, questionType: q.questionType, required: q.required }))
      : [newQuestion()],
  );
  const [dirty, setDirty] = useState(false);
  const [problem, setProblem] = useState('');
  const set = (patch: Partial<typeof state>) => { setState({ ...state, ...patch }); setDirty(true); setProblem(''); };
  const setQ = (key: number, patch: Partial<QuestionDraft>) => { setQuestions(questions.map((q) => (q.key === key ? { ...q, ...patch } : q))); setDirty(true); setProblem(''); };
  const move = (index: number, delta: number) => {
    const next = [...questions];
    const [q] = next.splice(index, 1);
    next.splice(index + delta, 0, q);
    setQuestions(next);
    setDirty(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!state.title.trim()) return setProblem('Title is required.');
    if (state.targetType !== 'DEPARTMENT' && !state.targetId) return setProblem(`Choose the ${FEEDBACK_TARGET_LABELS[state.targetType].toLowerCase()} this form is for.`);
    if (questions.length === 0) return setProblem('Add at least one question.');
    if (questions.some((q) => !q.questionText.trim())) return setProblem('Every question needs text.');
    const id = state.targetId ? Number(state.targetId) : null;
    const payload: FeedbackFormRequest = {
      title: state.title.trim(),
      description: state.description.trim() || null,
      targetType: state.targetType,
      targetBatchId: state.targetType === 'BATCH' ? id : null,
      targetSectionId: state.targetType === 'SECTION' ? id : null,
      targetSubjectOfferingId: state.targetType === 'SUBJECT_OFFERING' ? id : null,
      anonymous: state.anonymous,
      questions: questions.map((q) => ({ questionText: q.questionText.trim(), questionType: q.questionType, required: q.required })),
    };
    action.mutate({ action: 'save', id: form?.id, payload }, { onSuccess: () => { setDirty(false); onSaved(); } });
  };

  const targetOptions =
    state.targetType === 'BATCH' ? (batches.data ?? []).map((b) => ({ id: b.id, label: b.name }))
      : state.targetType === 'SECTION' ? (sections.data ?? []).map((s) => ({ id: s.id, label: `${s.batchName} — Sec ${s.name}` }))
      : state.targetType === 'SUBJECT_OFFERING' ? (offerings.data ?? []).filter((o) => o.active).map((o) => ({ id: o.id, label: offeringOptionLabel(o) }))
      : [];

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {dirty && <Badge variant="warning">Unsaved changes</Badge>}
      <div className="space-y-1.5">
        <FieldLabel htmlFor="fb-title">Title</FieldLabel>
        <Input id="fb-title" maxLength={200} value={state.title} onChange={(e) => set({ title: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="fb-description">Description (optional)</FieldLabel>
        <textarea id="fb-description" rows={2} maxLength={1000} className={TEXTAREA_CLASS} value={state.description} onChange={(e) => set({ description: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="fb-target-type">Target</FieldLabel>
          <select id="fb-target-type" className={`${SELECT_CLASS} w-full`} value={state.targetType} onChange={(e) => set({ targetType: e.target.value as FeedbackTargetType, targetId: '' })}>
            {FEEDBACK_TARGET_TYPES.map((t) => <option key={t} value={t}>{FEEDBACK_TARGET_LABELS[t]}</option>)}
          </select>
        </div>
        {state.targetType !== 'DEPARTMENT' && (
          <div className="space-y-1.5">
            <FieldLabel htmlFor="fb-target">{FEEDBACK_TARGET_LABELS[state.targetType]}</FieldLabel>
            <select id="fb-target" className={`${SELECT_CLASS} w-full`} value={state.targetId} onChange={(e) => set({ targetId: e.target.value })}>
              <option value="">Select…</option>
              {targetOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
        )}
      </div>
      <fieldset className="space-y-1">
        <legend className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider mb-1">Responses</legend>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="fb-mode" checked={state.anonymous} onChange={() => set({ anonymous: true })} /> Anonymous — no student identity is stored with answers</label>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="fb-mode" checked={!state.anonymous} onChange={() => set({ anonymous: false })} /> Identified — responses show the student</label>
      </fieldset>

      <div className="space-y-3">
        <FieldLabel>Questions</FieldLabel>
        {questions.map((q, i) => (
          <div key={q.key} className="rounded-[10px] border border-[#E8E8E8] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#666666]">Question {i + 1}</span>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" aria-label={`Move question ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="w-3.5 h-3.5" /></Button>
                <Button type="button" size="sm" variant="ghost" aria-label={`Move question ${i + 1} down`} disabled={i === questions.length - 1} onClick={() => move(i, 1)}><ArrowDown className="w-3.5 h-3.5" /></Button>
                <Button type="button" size="sm" variant="ghost" aria-label={`Remove question ${i + 1}`} disabled={questions.length === 1}
                  onClick={() => { setQuestions(questions.filter((x) => x.key !== q.key)); setDirty(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
            <Input aria-label={`Question ${i + 1} text`} maxLength={500} value={q.questionText} onChange={(e) => setQ(q.key, { questionText: e.target.value })} />
            <div className="flex flex-wrap items-center gap-3">
              <select aria-label={`Question ${i + 1} type`} className={SELECT_CLASS} value={q.questionType} onChange={(e) => setQ(q.key, { questionType: e.target.value as FeedbackQuestionType })}>
                {FEEDBACK_QUESTION_TYPES.map((t) => <option key={t} value={t}>{FEEDBACK_QUESTION_TYPE_LABELS[t]}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={q.required} onChange={(e) => setQ(q.key, { required: e.target.checked })} /> Required</label>
            </div>
          </div>
        ))}
        <Button type="button" size="sm" variant="secondary" disabled={questions.length >= 50} onClick={() => { setQuestions([...questions, newQuestion()]); setDirty(true); }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Question
        </Button>
      </div>
      {problem && <p className="text-sm text-red-600" role="alert">{problem}</p>}
      {action.isError && <FormError error={action.error} fallback="Unable to save the feedback form." />}
      <Button type="submit" isLoading={action.isPending}>{form ? 'Save Draft Form' : 'Create Draft Form'}</Button>
    </form>
  );
}

// ---------- HOD: analytics ----------

function Analytics({ form }: { form: FeedbackForm }) {
  const analytics = useFeedbackAnalytics(form.id);
  const responses = useFeedbackResponses(form.id);
  const [showResponses, setShowResponses] = useState(false);

  if (analytics.isLoading) return <div className="py-8 flex justify-center"><Spinner /></div>;
  if (analytics.isError || !analytics.data) return <ErrorBanner error={analytics.error} fallback="Unable to load analytics." />;
  const a = analytics.data;
  const questionText = new Map(form.questions.map((q) => [q.id, q.questionText]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2"><ModeBadge anonymous={a.anonymous} /><StatusBadge info={FEEDBACK_FORM_STATUS_BADGE[a.status]} /></div>
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Eligible" value={a.eligibleStudents} />
        <StatTile label="Submissions" value={a.submissions} />
        <StatTile label="Response Rate" value={a.responseRatePercentage === null ? '—' : `${Number(a.responseRatePercentage)}%`} />
      </div>
      {[...a.questions].sort((x, y) => x.position - y.position).map((q) => (
        <div key={q.questionId} className="rounded-[10px] border border-[#E8E8E8] p-3 space-y-2">
          <p className="text-sm font-medium text-[#111111]">{q.position}. {q.questionText}</p>
          <p className="text-xs text-[#9A9A9A]">{q.answers} answer(s)</p>
          {q.questionType === 'RATING' ? (
            <>
              <p className="text-sm">Average: <strong>{q.averageRating === null ? '—' : Number(q.averageRating)}</strong> / 5</p>
              <ul className="space-y-1">
                {RATING_VALUES.map((v) => {
                  const count = Number(q.ratingDistribution?.[String(v)] ?? 0);
                  const width = q.answers > 0 ? (count / q.answers) * 100 : 0;
                  return (
                    <li key={v} className="flex items-center gap-2 text-xs">
                      <span className="w-6 text-[#666666]">{v}★</span>
                      <span className="flex-1 h-2 rounded-full bg-[#F5F5F5] overflow-hidden" aria-hidden>
                        <span className="block h-full bg-[#111111]" style={{ width: `${width}%` }} />
                      </span>
                      <span className="w-8 text-right text-[#111111]">{count}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (q.textAnswers ?? []).length === 0 ? (
            <p className="text-xs text-[#9A9A9A]">No text answers.</p>
          ) : (
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {(q.textAnswers ?? []).map((t, i) => <li key={i} className="text-sm text-[#111111] bg-[#FAFAFA] rounded-lg px-2 py-1.5">{t}</li>)}
            </ul>
          )}
        </div>
      ))}
      <Button size="sm" variant="secondary" onClick={() => setShowResponses(!showResponses)}>{showResponses ? 'Hide' : 'Show'} individual responses</Button>
      {showResponses && (
        responses.isLoading ? <Spinner size="sm" />
          : responses.isError || !responses.data ? <ErrorBanner error={responses.error} fallback="Unable to load responses." />
          : responses.data.responses.length === 0 ? <p className="text-sm text-[#9A9A9A]">No responses yet.</p>
          : (
            <div className="space-y-2">
              {responses.data.anonymous && <p className="text-xs text-[#666666]">Anonymous form: responses carry no student, no time and are shown in random order.</p>}
              {responses.data.responses.map((r, i) => (
                <div key={i} className="rounded-[10px] border border-[#E8E8E8] p-3 space-y-1">
                  <p className="text-xs font-semibold text-[#666666]">
                    {responses.data.anonymous ? `Response ${i + 1}` : `${r.studentName ?? ''} ${r.registerNumber ? `(${r.registerNumber})` : ''} · ${formatDateTime(r.submittedAt)}`}
                  </p>
                  {r.answers.map((ans) => (
                    <p key={ans.questionId} className="text-sm"><span className="text-[#9A9A9A]">{questionText.get(ans.questionId) ?? 'Question'}:</span> {ans.rating !== null ? `${ans.rating}/5` : ans.textAnswer}</p>
                  ))}
                </div>
              ))}
            </div>
          )
      )}
    </div>
  );
}

type HodPanel = { mode: 'create' } | { mode: 'edit'; form: FeedbackForm } | { mode: 'analytics'; form: FeedbackForm } | null;

function HodFeedback() {
  const [filters, setFilters] = useState({ status: '', targetType: '' });
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState<HodPanel>(null);
  const [confirm, setConfirm] = useState<{ form: FeedbackForm; action: 'open' | 'close' } | null>(null);
  const action = useFeedbackFormAction();
  const set = (patch: Partial<typeof filters>) => { setFilters({ ...filters, ...patch }); setPage(0); };
  const { data, isLoading, isError, error, isFetching } = useFeedbackForms({
    page, size: 20,
    status: (filters.status || undefined) as FeedbackFormStatus | undefined,
    targetType: (filters.targetType || undefined) as FeedbackTargetType | undefined,
  });

  return (
    <div className="space-y-4">
      <FilterBar>
        <select aria-label="Filter by status" className={SELECT_CLASS} value={filters.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="">All Statuses</option>
          {FEEDBACK_FORM_STATUSES.map((s) => <option key={s} value={s}>{FEEDBACK_FORM_STATUS_BADGE[s].label}</option>)}
        </select>
        <select aria-label="Filter by target" className={SELECT_CLASS} value={filters.targetType} onChange={(e) => set({ targetType: e.target.value })}>
          <option value="">All Targets</option>
          {FEEDBACK_TARGET_TYPES.map((t) => <option key={t} value={t}>{FEEDBACK_TARGET_LABELS[t]}</option>)}
        </select>
        <Button size="sm" onClick={() => setPanel({ mode: 'create' })}><Plus className="w-4 h-4 mr-1.5" /> New Feedback Form</Button>
        {isFetching && !isLoading && <Spinner size="sm" />}
      </FilterBar>
      {action.isError && <FormError error={action.error} fallback="Unable to change the feedback form." />}
      {confirm && (
        <ConfirmBox
          message={confirm.action === 'open'
            ? <>Open <strong>{confirm.form.title}</strong>? Targeted students are notified and the questions can no longer be edited.</>
            : <>Close <strong>{confirm.form.title}</strong>? No further responses will be accepted.</>}
          confirmLabel={confirm.action === 'open' ? 'Open Form' : 'Close Form'}
          variant={confirm.action === 'close' ? 'danger' : 'primary'}
          isLoading={action.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() => action.mutate({ action: confirm.action, id: confirm.form.id }, { onSettled: () => setConfirm(null) })}
        />
      )}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full">
          {isLoading ? <LoadingBlock label="Loading feedback forms..." />
            : isError || !data ? <ErrorBanner error={error} fallback="Unable to load feedback forms." />
            : data.content.length === 0 ? <Card><EmptyBlock icon={<MessageSquareText className="w-10 h-10" />} title="No feedback forms yet." /></Card>
            : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submissions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.content.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.title}<div className="text-[11px] text-[#9A9A9A] font-normal">{f.questions.length} question(s)</div></TableCell>
                        <TableCell className="text-[#666666]">{f.targetLabel}</TableCell>
                        <TableCell><ModeBadge anonymous={f.anonymous} /></TableCell>
                        <TableCell><StatusBadge info={FEEDBACK_FORM_STATUS_BADGE[f.status]} /></TableCell>
                        <TableCell>{f.submissionCount ?? 0}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {f.status === 'DRAFT' && <Button size="sm" variant="ghost" onClick={() => setPanel({ mode: 'edit', form: f })}>Edit</Button>}
                          {f.status === 'DRAFT' && <Button size="sm" variant="ghost" onClick={() => { action.reset(); setConfirm({ form: f, action: 'open' }); }}>Open</Button>}
                          {f.status === 'OPEN' && <Button size="sm" variant="ghost" onClick={() => { action.reset(); setConfirm({ form: f, action: 'close' }); }}>Close</Button>}
                          {f.status !== 'DRAFT' && (
                            <Button size="sm" variant="ghost" onClick={() => setPanel({ mode: 'analytics', form: f })}><BarChart3 className="w-3.5 h-3.5 mr-1" /> Analytics</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination data={data} onPageChange={setPage} />
              </Card>
            )}
        </div>
        {panel && (
          <SidePanel title={panel.mode === 'create' ? 'New Feedback Form' : panel.mode === 'edit' ? 'Edit Feedback Form' : `Analytics — ${panel.form.title}`} onClose={() => setPanel(null)}>
            {panel.mode === 'create' && <FormBuilder onSaved={() => setPanel(null)} />}
            {panel.mode === 'edit' && <FormBuilder key={panel.form.id} form={panel.form} onSaved={() => setPanel(null)} />}
            {panel.mode === 'analytics' && <Analytics key={panel.form.id} form={panel.form} />}
          </SidePanel>
        )}
      </div>
      <ReadOnlyNote>Analytics are calculated by the ERP. Anonymous forms never show who answered.</ReadOnlyNote>
    </div>
  );
}

function FeedbackView() {
  const { hasRole } = useAuth();
  return <PageContainer rawLayout>{hasRole('ROLE_HOD') ? <HodFeedback /> : <StudentFeedback />}</PageContainer>;
}

export default function FeedbackPage() {
  // STAFF have no access to feedback on the backend.
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STUDENT']}>
      <FeedbackView />
    </RequireRole>
  );
}
