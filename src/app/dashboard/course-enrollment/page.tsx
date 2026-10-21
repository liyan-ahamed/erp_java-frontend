import { redirect } from 'next/navigation';

// Old route: enrollments now live in Courses → Enrollments (STUDENT: their own courses).
export default function Page() {
  redirect('/dashboard/courses?tab=enrollments');
}
