import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import { getBookmarkedLessonDetails } from '@/lib/queries/bookmarks';
import { BookmarksContent } from './BookmarksContent';

export const metadata = { title: 'Saved Lessons — Simplexer' };

export default async function BookmarksPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const lessons = await getBookmarkedLessonDetails(user.authUser.id);

  return <BookmarksContent lessons={lessons} />;
}
