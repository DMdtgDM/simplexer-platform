import { getCategories, getCourseCountsByCategory } from '@/lib/queries/courses';
import { InterestsLandingContent } from './InterestsLandingContent';

export const metadata = { title: 'Interest Track — Simplexer' };
export const revalidate = 3600;

export default async function InterestsPage() {
  const [categories, courseCounts] = await Promise.all([getCategories(), getCourseCountsByCategory()]);
  return <InterestsLandingContent categories={categories} courseCounts={courseCounts} />;
}
