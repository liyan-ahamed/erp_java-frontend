'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/common/PageContainer';
import { RequireRole } from '@/components/common/RequireRole';
import { Tabs } from '@/components/ui/Tabs';
import { LoadingBlock } from '@/components/gradebook/shared';
import { ClassCourses } from '@/components/courses/ClassCourses';
import { HodEnrollments, StaffRosters, StudentCourses } from '@/components/courses/Enrollments';
import { SubjectCatalog } from '@/components/courses/SubjectCatalog';
import { CurriculumConfig } from '@/components/courses/CurriculumConfig';
import { ConfirmBox } from '@/components/portfolio/shared';
import { useAuth } from '@/contexts/auth-context';
import { ROUTES } from '@/constants/routes';

type CourseTab = 'classes' | 'enrollments' | 'catalog' | 'curriculum';

const HOD_TABS = [
  { value: 'classes', label: 'Class Courses' },
  { value: 'enrollments', label: 'Enrollments' },
  { value: 'catalog', label: 'Subject Catalog' },
  { value: 'curriculum', label: 'Curriculum' },
] as const;

const STAFF_TABS = [
  { value: 'classes', label: 'My Courses' },
  { value: 'enrollments', label: 'Class Rosters' },
] as const;

/**
 * Courses — one academic area that hides the backend's Subject / Subject Offering split.
 * HOD: Class Courses | Enrollments | Subject Catalog | Curriculum. STAFF: own courses and rosters. STUDENT: own courses.
 */
function CoursesView() {
  const { hasRole } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isHod = hasRole('ROLE_HOD');
  const isStaff = !isHod && hasRole('ROLE_STAFF');
  // Unsaved curriculum edits: switching tab asks first instead of silently discarding them.
  const [curriculumDirty, setCurriculumDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState<CourseTab | null>(null);

  if (!isHod && !isStaff) {
    return <PageContainer><StudentCourses /></PageContainer>;
  }

  const items = isHod ? HOD_TABS : STAFF_TABS;
  const requested = searchParams.get('tab');
  // Unknown or role-hidden tabs (e.g. ?tab=catalog for STAFF) fall back to the first tab.
  const tab: CourseTab = items.some((i) => i.value === requested) ? (requested as CourseTab) : 'classes';
  const goTab = (next: CourseTab) => {
    setPendingTab(null);
    if (next !== 'curriculum') setCurriculumDirty(false);
    router.replace(next === 'classes' ? ROUTES.COURSES : `${ROUTES.COURSES}?tab=${next}`);
  };
  const setTab = (next: CourseTab) => (tab === 'curriculum' && curriculumDirty && next !== tab ? setPendingTab(next) : goTab(next));

  return (
    <PageContainer contextArea={<Tabs label="Courses sections" value={tab} onChange={setTab} items={items} className="!mb-0" />}>
      {tab === 'classes' && <ClassCourses canManage={isHod} />}
      {tab === 'enrollments' && (isHod ? <HodEnrollments /> : <StaffRosters />)}
      {tab === 'catalog' && isHod && <SubjectCatalog canManage />}
      {tab === 'curriculum' && isHod && (
        <div className="space-y-4">
          {pendingTab && (
            <ConfirmBox message="You have unsaved curriculum changes. Leave without saving?" confirmLabel="Leave Without Saving" variant="danger"
              onCancel={() => setPendingTab(null)} onConfirm={() => goTab(pendingTab)} />
          )}
          <CurriculumConfig onDirtyChange={setCurriculumDirty} />
        </div>
      )}
    </PageContainer>
  );
}

export default function CoursesPage() {
  return (
    <RequireRole roles={['ROLE_HOD', 'ROLE_STAFF', 'ROLE_STUDENT']}>
      <Suspense fallback={<PageContainer><LoadingBlock label="Loading..." /></PageContainer>}>
        <CoursesView />
      </Suspense>
    </RequireRole>
  );
}
