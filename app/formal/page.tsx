import { getGrades, getSubjectCountsByGrade } from '@/lib/queries/grades';
import { FormalLandingContent } from './FormalLandingContent';

export const metadata = { title: 'Formal Track — Simplexer' };
export const revalidate = 3600;

export default async function FormalLandingPage() {
  const [grades, subjectCounts] = await Promise.all([getGrades(), getSubjectCountsByGrade()]);

  return <FormalLandingContent grades={grades} subjectCounts={subjectCounts} />;
}
