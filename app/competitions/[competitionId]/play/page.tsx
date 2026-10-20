import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import { getCompetition, getMyAttempt, getPlayQuestions, getSavedAnswers } from '@/lib/queries/competitions';
import { PlayClient } from './PlayClient';

export const dynamic = 'force-dynamic';

export default async function PlayPage(props: { params: Promise<{ competitionId: string }> }) {
  const params = await props.params;
  const id = params.competitionId;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/competitions/${id}/play`);
  const [c, attempt] = await Promise.all([getCompetition(id), getMyAttempt(id, user.authUser.id)]);
  if (!c || !attempt || attempt.submitted_at) redirect(`/competitions/${id}`);
  const [questions, saved] = await Promise.all([getPlayQuestions(attempt.id), getSavedAnswers(attempt.id)]);
  if (questions.length === 0) redirect(`/competitions/${id}?error=This+competition+has+no+questions`);

  return (
    <PlayClient
      attemptId={attempt.id}
      compId={id}
      title={c.title}
      deadline={questions[0].deadline}
      serverNow={Date.now()}
      saved={saved}
      questions={questions.map((q) => ({ id: q.id, body: q.body, options: q.options }))}
    />
  );
}
