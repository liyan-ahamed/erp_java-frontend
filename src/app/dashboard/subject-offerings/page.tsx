import { redirect } from 'next/navigation';

// Old route: subject offerings are now Courses → Class Courses.
export default function Page() {
  redirect('/dashboard/courses');
}
