import { redirect } from 'next/navigation';

// Old route: the subject catalog now lives in Courses → Subject Catalog.
export default function Page() {
  redirect('/dashboard/courses?tab=catalog');
}
