'use client';

import { notFound, useParams } from 'next/navigation';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { ErrorBanner } from '@/components/gradebook/shared';
import { MarksEntry } from '@/components/gradebook/MarksEntry';
import { isGradebookEnabled } from '@/lib/feature-flags';

function AssessmentDetail() {
  const params = useParams<{ id: string }>();
  const assessmentId = Number(params.id);
  if (!Number.isInteger(assessmentId) || assessmentId <= 0) {
    return <PageContainer><ErrorBanner error={null} fallback="Invalid assessment link." /></PageContainer>;
  }
  return <MarksEntry assessmentId={assessmentId} />;
}

export default function AssessmentGradesPage() {
  // Marking is switched off on the backend; the page is kept for when it returns.
  if (!isGradebookEnabled()) notFound();
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STAFF']}>
      <AssessmentDetail />
    </RequireRole>
  );
}
