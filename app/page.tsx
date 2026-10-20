import { getRecentLessons } from '@/lib/queries/lessons';
import { getHomeStats } from '@/lib/queries/stats';
import { HomeContent } from './HomeContent';

export const revalidate = 3600; // content changes rarely, so this page is cached

export default async function HomePage() {
  const [recentLessons, stats] = await Promise.all([getRecentLessons(4), getHomeStats()]);
  return <HomeContent lessons={recentLessons} stats={stats} />;
}
