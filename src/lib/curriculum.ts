import { Curriculum, CurriculumRequest } from '@/types/curriculum';

// Editable copy of one cohort + semester curriculum and the quick checks that mirror the backend's rules
// (contract B). The backend's 400 messages remain the source of truth; these only catch mistakes early.

export const CURRICULUM_LIMITS = { compulsory: 30, groups: 10, options: 30, groupName: 100 } as const;

export interface DraftGroup {
  /** Stable React key; new groups get a temporary one. */
  key: string;
  /** Backend id, null for a group that has never been saved. */
  id: number | null;
  name: string;
  requiredSelections: number;
  subjectIds: number[];
}

export interface CurriculumDraft {
  compulsorySubjectIds: number[];
  groups: DraftGroup[];
}

export const draftFrom = (c: Curriculum): CurriculumDraft => ({
  compulsorySubjectIds: c.compulsorySubjects.map((s) => s.subjectId),
  groups: [...c.electiveGroups]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((g) => ({ key: `g${g.id}`, id: g.id, name: g.name, requiredSelections: g.requiredSelections, subjectIds: g.options.map((o) => o.subjectId) })),
});

export const toRequest = (draft: CurriculumDraft, version: number | null): CurriculumRequest => ({
  version,
  compulsorySubjectIds: draft.compulsorySubjectIds,
  electiveGroups: draft.groups.map((g) => ({ id: g.id, name: g.name.trim(), requiredSelections: g.requiredSelections, subjectIds: g.subjectIds })),
});

/** True when the two drafts would save the same curriculum (React keys ignored). */
export const sameDraft = (a: CurriculumDraft, b: CurriculumDraft) =>
  JSON.stringify(toRequest(a, null)) === JSON.stringify(toRequest(b, null));

export const isEmptyDraft = (d: CurriculumDraft) => d.compulsorySubjectIds.length === 0 && d.groups.length === 0;

/** Every subject id used more than once anywhere in the draft. */
export const repeatedSubjects = (d: CurriculumDraft): Set<number> => {
  const seen = new Set<number>();
  const repeated = new Set<number>();
  [...d.compulsorySubjectIds, ...d.groups.flatMap((g) => g.subjectIds)].forEach((id) => (seen.has(id) ? repeated.add(id) : seen.add(id)));
  return repeated;
};

/** Problems that would make the backend reject the save, as readable sentences. Empty = looks valid. */
export const curriculumProblems = (d: CurriculumDraft, subjectName: (id: number) => string = (id) => `Subject #${id}`): string[] => {
  const problems: string[] = [];
  if (isEmptyDraft(d)) problems.push('Add at least one compulsory subject or elective group. To remove the whole curriculum, use Delete Curriculum.');
  if (d.compulsorySubjectIds.length > CURRICULUM_LIMITS.compulsory) problems.push(`At most ${CURRICULUM_LIMITS.compulsory} compulsory subjects.`);
  if (d.groups.length > CURRICULUM_LIMITS.groups) problems.push(`At most ${CURRICULUM_LIMITS.groups} elective groups.`);
  repeatedSubjects(d).forEach((id) => problems.push(`${subjectName(id)} is listed more than once. A subject can be compulsory or in one elective group, not both.`));

  const names = new Map<string, number>();
  d.groups.forEach((g) => { const n = g.name.trim().toLowerCase(); if (n) names.set(n, (names.get(n) ?? 0) + 1); });
  d.groups.forEach((g, i) => {
    const label = g.name.trim() || `Elective group ${i + 1}`;
    if (!g.name.trim()) problems.push(`Elective group ${i + 1} needs a name.`);
    else if (g.name.trim().length > CURRICULUM_LIMITS.groupName) problems.push(`${label}: the name can have at most ${CURRICULUM_LIMITS.groupName} characters.`);
    else if ((names.get(g.name.trim().toLowerCase()) ?? 0) > 1) problems.push(`More than one elective group is called "${g.name.trim()}".`);
    if (g.subjectIds.length < 2) problems.push(`${label} needs at least 2 options. A single required subject belongs under Compulsory courses.`);
    if (g.subjectIds.length > CURRICULUM_LIMITS.options) problems.push(`${label} can have at most ${CURRICULUM_LIMITS.options} options.`);
    if (!Number.isInteger(g.requiredSelections) || g.requiredSelections < 1) problems.push(`${label}: required selections must be a whole number of at least 1.`);
    else if (g.requiredSelections > g.subjectIds.length) problems.push(`${label}: required selections (${g.requiredSelections}) can't exceed the number of options (${g.subjectIds.length}).`);
  });
  return problems;
};
