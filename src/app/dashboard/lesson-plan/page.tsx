import { redirect } from 'next/navigation';

// Lesson Plans is retired from the frontend. Its service, hooks and types stay in place but are unused.
export default function Page() {
  redirect('/dashboard/courses');
}
