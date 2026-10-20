import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import { getCompetition, getManageData, competitionState, accessLabel } from '@/lib/queries/competitions';
import {
  addQuestions, addOneQuestion, deleteQuestion, publishCompetition, setEntryStatus, finalizeCompetition, markPrizePaid, verifyWinner, replaceWinner, deleteCompetition, disqualifyEntry, removePaidWinner,
} from '@/lib/actions/competitions';
import { card, field, btn, btnGhost } from '@/components/Ui';
import { ConfirmForm } from '@/components/ConfirmForm';
import { serverT } from '@/lib/i18n/server';
import { compareAttempts, isSuspiciouslyFast } from '@/lib/ranking';

export const dynamic = 'force-dynamic';

export default async function ManagePage(
  props: { params: Promise<{ competitionId: string }>; searchParams: Promise<{ error?: string; ok?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { t } = await serverT();
  const id = params.competitionId;
  const [user, c] = await Promise.all([getCurrentUser(), getCompetition(id)]);
  if (!user) redirect('/login');
  if (!c) notFound();
  if (user.authUser.id !== c.created_by && user.profile?.role !== 'admin') redirect(`/competitions/${id}`);

  const { questions, entries, winners, code, attempts: rawAttempts, removals } = await getManageData(id);
  const attempts = [...rawAttempts].sort(compareAttempts);
  const nameOf = (uid: string) => entries.find((e) => e.user_id === uid)?.user_name || 'Student';
  const state = competitionState(c);
  const pending = entries.filter((e) => e.status === 'pending');

  return (
    <div className="pt-6">
      <Link href={`/competitions/${id}`} className="text-xs text-gray-500">{t('viewPublicPage')}</Link>
      <h1 className="mt-2 font-heading text-2xl font-bold text-textneutral">Manage: {c.title}</h1>
      <p className="mt-1 text-xs text-gray-400">{c.status} · {accessLabel(c, t)}{code ? ` · code: ${code}` : ''} · {questions.length} questions · {entries.filter((e) => e.status === 'approved').length} approved entries</p>
      {searchParams.error && <p className="mt-3 text-sm text-red-600">{searchParams.error}</p>}
      {searchParams.ok && <p className="mt-3 text-sm text-green-700">{searchParams.ok}</p>}

      {c.status === 'draft' && (
        <form action={publishCompetition.bind(null, id)} className="mt-4">
          <button className={btn}>{t('publishCompetition')}</button>
          <span className="ml-3 text-xs text-gray-500">{t('publishNote')}</span>
        </form>
      )}

      <h2 className="mt-8 font-heading text-lg font-bold text-textneutral">Questions ({questions.length})</h2>
      {c.status === 'draft' ? (<>
        <form action={addOneQuestion.bind(null, id)} className={`${card} mt-2 space-y-2`}>
          <p className="text-sm font-semibold text-textneutral">{t('addOneQuestion')}</p>
          <input name="q" required placeholder={t('theQuestion')} className={field} />
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <input type="radio" name="correct" value={n} defaultChecked={n === 1} aria-label={`Answer ${n} is correct`} />
              <input name={`o${n}`} required={n <= 2} placeholder={`Answer ${n}${n === 1 ? ' (pick the circle if this one is correct)' : ''}`} className={field} />
            </div>
          ))}
          <p className="text-xs text-gray-500">{t('pickCircleNote')}</p>
          <button className={btn}>{t('addThisQuestion')}</button>
        </form>
        <form action={addQuestions.bind(null, id)} className={`${card} mt-2 space-y-2`}>
          <p className="text-xs text-gray-500">{t('pasteQuestionsNote')}</p>
          <code className="block rounded bg-gray-100 p-2 text-xs dark:bg-gray-800">What is 12 x 8? | 86 | *96 | 98 | 104</code>
          <textarea name="lines" rows={6} required className={field} placeholder="Question? | answer | *correct answer | answer" />
          <button className={btn}>{t('addQuestionsBtn')}</button>
        </form>
      </>) : <p className="mt-2 text-xs text-gray-500">{t('questionsLocked')}</p>}
      <div className="mt-3 space-y-2">
        {questions.map((q, n) => (
          <div key={q.id} className={`${card} flex items-start justify-between gap-3`}>
            <div className="text-sm">
              <p className="font-semibold text-textneutral">{n + 1}. {q.body}</p>
              <ul className="mt-1 text-xs text-gray-500">
                {[...q.competition_options].sort((a, b) => a.position - b.position).map((o) => (
                  <li key={o.id} className={o.is_correct ? 'font-semibold text-green-700' : ''}>{o.is_correct ? '✓ ' : '· '}{o.body}</li>
                ))}
              </ul>
            </div>
            {c.status === 'draft' && (
              <form action={deleteQuestion.bind(null, id, q.id)}><button className="text-xs text-red-600 underline">{t('deleteBtn')}</button></form>
            )}
          </div>
        ))}
      </div>

      {c.access === 'approval' && (
        <>
          <h2 className="mt-8 font-heading text-lg font-bold text-textneutral">Entries ({entries.length}, {pending.length} waiting)</h2>
          <div className="mt-2 space-y-2">
            {entries.length === 0 && <p className="text-sm text-gray-400">{t('noJoinRequests')}</p>}
            {entries.map((e) => (
              <div key={e.id} className={`${card} flex items-center justify-between gap-3`}>
                <div className="text-sm">
                  <p className="font-semibold text-textneutral">{e.user_name || 'Student'} <span className="font-normal text-gray-400">· {e.status}</span></p>
                  {e.payment_ref && <p className="text-xs text-gray-500">Payment reference: {e.payment_ref}</p>}
                </div>
                {e.status !== 'approved' && (
                  <form action={setEntryStatus.bind(null, id, e.id, 'approved')}><button className={btn}>{t('approve')}</button></form>
                )}
                {e.status === 'pending' && (
                  <form action={setEntryStatus.bind(null, id, e.id, 'rejected')}><button className={btnGhost}>{t('reject')}</button></form>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {attempts.length > 0 && (
        <>
          <h2 className="mt-8 font-heading text-lg font-bold text-textneutral">Results ({attempts.length})</h2>
          <p className="mt-1 text-xs text-gray-500">{t('rankingRuleManage')}</p>
          <div className="mt-2 space-y-2">
            {attempts.map((a) => (
              <div key={a.user_id} className={`${card} flex items-center justify-between gap-3 text-sm ${a.disqualified ? 'opacity-50' : ''}`}>
                <p className="text-textneutral">{nameOf(a.user_id)} · {a.score}/{a.total} · {Math.floor((a.duration_seconds ?? 0) / 60)}:{String((a.duration_seconds ?? 0) % 60).padStart(2, '0')}
                  {a.disqualified && <span className="text-red-600"> · disqualified {a.dq_reason && `(${a.dq_reason})`}</span>}
                  {!a.disqualified && isSuspiciouslyFast(a) && <span className="font-semibold text-amber-600"> · ⚠ very fast — under 4 seconds per question. Check before paying any prize.</span>}</p>
                {!a.disqualified && c.status !== 'finalized' && (
                  <form action={disqualifyEntry.bind(null, id, a.user_id)} className="flex gap-2">
                    <input name="why" placeholder={t('reasonPlaceholder')} className="w-28 rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900" />
                    <button className="text-xs text-red-600 underline">{t('disqualifyBtn')}</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="mt-8 font-heading text-lg font-bold text-textneutral">{t('winnersAndPrizes')}</h2>
      {c.status === 'published' && state === 'ended' && (
        <form action={finalizeCompetition.bind(null, id)} className="mt-2">
          <button className={btn}>{t('closeAndRecord')}</button>
          <span className="ml-3 text-xs text-gray-500">{t('locksNote')}</span>
        </form>
      )}
      {c.status === 'published' && state !== 'ended' && <p className="mt-2 text-sm text-gray-500">{t('recordAfterClose')}</p>}
      <p className="mt-1 text-xs text-gray-500">{t('payingHowTo')}</p>
      <div className="mt-2 space-y-2">
        {winners.map((w) => {
          const entryPhone = entries.find((e) => e.user_id === w.user_id)?.payment_ref;
          return (
          <div key={w.rank} className={`${card} text-sm`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-textneutral">#{w.rank} {w.name} · {w.prize}</p>
                <p className="text-xs text-gray-500">
                  {w.phone ? `Phone: ${w.phone}` : 'Has not sent a phone number yet'}
                  {entryPhone ? ` · entry payment ref: ${entryPhone}` : ''}
                </p>
                <p className="text-xs text-gray-500">
                  {w.verified ? 'Verified student ✓' : 'Not verified yet — check the account and phone before paying.'}
                  {w.paid && ` Paid${w.payment_ref ? ` · ref: ${w.payment_ref}` : ''}`}
                </p>
              </div>
              {!w.verified && !w.paid && (
                <form action={verifyWinner.bind(null, id, w.rank)}><button className={btnGhost}>{t('markVerified')}</button></form>
              )}
            </div>
            {!w.paid ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <form action={markPrizePaid.bind(null, id, w.rank)} className="flex items-center gap-2">
                  <input name="payment_ref" placeholder={t('paymentRefPlaceholder')} className="w-56 rounded border border-gray-200 px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900" />
                  <button className={btn}>{t('markAsPaid')}</button>
                </form>
                <form action={replaceWinner.bind(null, id, w.rank)}>
                  <button className="text-xs text-red-600 underline">{t('replaceWinnerBtn')}</button>
                </form>
              </div>
            ) : <span className="mt-1 inline-block text-xs font-semibold text-green-700">{t('paidBadge')}</span>}
            {w.paid && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-red-600 underline">{t('removePaidWinner')}</summary>
                <p className="mt-1 text-xs text-gray-500">{t('paidRemoveNote')}</p>
                <ConfirmForm action={removePaidWinner.bind(null, id, w.user_id)} message="Remove this PAID winner? The payment record is kept in the removal log, but the prize moves to the next student." className="mt-2 flex flex-wrap items-center gap-2">
                  <input name="why" required placeholder={t('removalReasonPlaceholder')} className="w-64 rounded border border-gray-200 px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900" />
                  <button className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700">{t('removePaidWinner')}</button>
                </ConfirmForm>
              </details>
            )}
          </div>
          );
        })}
      </div>

      <h2 className="mt-8 font-heading text-lg font-bold text-textneutral">{t('removalLog')}</h2>
      {removals.length === 0 ? (
        <p className="mt-1 text-xs text-gray-500">{t('removalLogEmpty')}</p>
      ) : (
        <div className="mt-2 space-y-2">
          {removals.map((r) => (
            <div key={r.id} className={`${card} text-sm`}>
              <p className="font-semibold text-textneutral">#{r.rank} {r.user_name} · {r.prize}
                {r.was_paid && <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-800">{t('paidTag')}{r.payment_ref ? ` · ${r.payment_ref}` : ''}</span>}
              </p>
              <p className="text-xs text-gray-500">{r.reason}</p>
              <p className="text-xs text-gray-400">
                {r.removed_by_name ? `By ${r.removed_by_name} · ` : ''}{new Date(r.removed_at).toLocaleString('en-GB', { timeZone: 'Africa/Addis_Ababa', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                {r.phone ? ` · Phone: ${r.phone}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-red-200 bg-red-50/60 p-4 dark:border-red-900 dark:bg-red-950/20">
        <p className="text-sm font-semibold text-red-700">{t('dangerZone')}</p>
        <p className="mt-1 text-xs text-red-600/90">Deleting removes the competition with its questions, entries, attempts and winners. This works at any stage, including after winners are announced — and it cannot be undone.</p>
        <ConfirmForm action={deleteCompetition.bind(null, id)} message="Delete this competition and everything in it? This cannot be undone." className="mt-3">
          <button className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700">{t('deleteCompetitionBtn')}</button>
        </ConfirmForm>
      </div>
    </div>
  );
}
