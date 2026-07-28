import { getRecentLessons } from '@/lib/queries/lessons';
import { HomeContent } from './HomeContent';

export const revalidate = 3600; // content changes rarely — cache aggressively per §13.1

export default async function HomePage() {
  const recentLessons = await getRecentLessons(4);

  // For each lesson, we need to know whether it's Formal (topic) or Interest
  // (course) so we can build the correct deep link on the card.
  return <HomeContent lessons={recentLessons} />;
}
