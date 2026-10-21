import { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Layers } from '@/components/ui/icons';
import { EmptyBlock } from '@/components/gradebook/shared';
import { AcademicContext, AcademicLevel } from '@/lib/academic-context';

const ORDER: { level: AcademicLevel; key: keyof AcademicContext; prompt: string }[] = [
  { level: 'cohort', key: 'batchId', prompt: 'Select a cohort to begin.' },
  { level: 'semester', key: 'semester', prompt: 'Select a semester.' },
  { level: 'section', key: 'sectionId', prompt: 'Select a section.' },
  { level: 'subject', key: 'subjectId', prompt: 'Select a subject.' },
];

/**
 * Cohort-first rule for department-wide (HOD) views: nothing is shown or loaded until the context is chosen
 * down to `upTo`. Returns the prompt for the first missing level, or null once the context is complete.
 * Personal views (a student's own data, a faculty member's own classes) don't use this.
 */
export const missingContext = (ctx: AcademicContext, upTo: AcademicLevel): string | null => {
  for (const step of ORDER) {
    if (ctx[step.key] === null) return step.prompt;
    if (step.level === upTo) break;
  }
  return null;
};

/** The restrained empty state shown while the academic context is incomplete. */
export function ContextPrompt({ title, hint, icon }: { title: string; hint?: string; icon?: ReactNode }) {
  return (
    <Card>
      <EmptyBlock icon={icon ?? <Layers className="w-10 h-10" />} title={title} hint={hint} />
    </Card>
  );
}
