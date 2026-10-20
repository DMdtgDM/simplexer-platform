import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import {
  getCompetition, getCourseProgressFraction, getLeaderboard, getMyEntry, getMyAttempt, getMyWin, getPublicWinners,
  competitionState, formatEat, fmtDuration, prizeList, accessLabel,
} from '@/lib/queries/competitions';
import {
  joinCompetition, startAttempt, saveWinnerPhone,
} from '@/lib/actions/competitions';
import { Countdown } from '@/components/Countdown';
import { ReportButton } from '@/components/ReportButton';
import { card, field, btn, btnGhost } from '@/components/Ui';
import { serverT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';
const MEDAL = ['bg-yellow-100 text-yellow-800', 'bg-gray-200 text-gray-700', 'bg-orange-100 text-orange-800'];

export default async function CompetitionPage(
  props: { params: Promise<{ competitionId: string }>; searchParams: Promise<{ error?: string; ok?: string; done?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const id = params.competitionId;
  const [user, c] = await Promise.all([getCurrentUser(), getCompetition(id)]);
  if (!c) notFound();
  const uid = user?.authUser.id;
  const [rows, entry, attempt, win, winners] = await Promise.all([
    getLeaderboard(id),
    uid ? getMyEntry(id, uid) : null,
    uid ? getMyAttempt(id, uid) : null,
    uid ? getMyWin(id, uid) : null,
    getPublicWinners(id),
  ]);
  const { t } = await serverT();
  const manage = uid === c.created_by || user?.profile?.role === 'admin';
  const courseFraction = c.course_id && uid ? await getCourseProgressFraction(uid, c.course_id) : null;
  const courseLocked = Boolean(c.course_id) && !manage && uid !== c.created_by && (courseFraction ?? 0) <= 0.5;
  const state = competitionState(c);
  const me = rows.find((r) => r.is_me);
  const prizes = prizeList(c);

  let action: React.ReactNode;
  if (c.status === 'draft') action = <p className="text-sm text-gray-500">{t('draftNote')}</p>;
  else if (state === 'ended') action = <p className="text-sm text-gray-500">{t('endedNote')}</p>;
  else if (!uid) action = (
    <div className={`${card} space-y-2 border-secondary/30 bg-secondary/5`}>
      <h2 className="font-heading text-lg font-bold text-textneutral">{t('loginToCompete')}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">{t('loginToCompeteNote')}</p>
      <Link href={`/login?next=/competitions/${id}`} className={btn}>{t('loginToJoin')}</Link>
    </div>
  );
  else if (courseLocked) action = (
    <div className={`${card} space-y-2`}>
      <h2 className="font-heading text-lg font-bold text-textneutral">{t('courseStudentsTitle')}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">{t('courseOnlyNote')} {t('finishedSoFar')} <b>{Math.round((courseFraction ?? 0) * 100)}%</b>. {t('keepGoingNote')}</p>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round((courseFraction ?? 0) * 100)}%` }} /></div>
    </div>
  );
  else if (uid === c.created_by) action = <p className="text-sm text-gray-500">{t('organiserNote')}</p>;
  else if (attempt?.submitted_at) action = <p className="text-sm font-semibold text-green-700">{t('finishedNote')}</p>;
  else if (attempt) action = <Link href={`/competitions/${id}/play`} className={btn}>{t('continueAttempt')}</Link>;
  else if (!entry) action = (
    <form action={joinCompetition.bind(null, id)} className={`${card} space-y-2`}>
      <h2 className="font-heading text-lg font-bold text-textneutral">{t('joinTitle')}</h2>
      <p className="text-sm text-gray-500">{accessLabel(c, t)}</p>
      {c.access === 'code' && <input name="code" required placeholder={t('accessCode')} className={field} />}
      {c.access === 'approval' && c.entry_fee > 0 && (
        <>
          <p className="whitespace-pre-line rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900">
            {t('payEntryFee').replace('{fee}', String(c.entry_fee))}{'\n'}{c.payment_info || t('askOrganiserToPay')}
          </p>
          <input name="pay_ref" required placeholder={t('paymentRef')} className={field} />
        </>
      )}
      <button className={btn}>{c.access === 'open' ? t('joinNow') : c.access === 'code' ? t('joinWithCode') : t('requestEntry')}</button>
    </form>
  );
  else if (entry.status === 'pending') action = <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900">{t('entryPending')}</p>;
  else if (entry.status === 'rejected') action = <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{t('entryRejected')}</p>;
  else if (state === 'upcoming') action = <p className="text-sm text-gray-500">{t('youAreIn')} {t('quizOpensAt').replace('{when}', `${formatEat(c.starts_at)} (${t('ethiopianTime')})`)}</p>;
  else action = (
    <form action={startAttempt.bind(null, id)} className={`${card} space-y-2`}>
      <p className="text-sm text-textneutral">
        {t('attemptRules').replace('{minutes}', String(c.time_limit_min))}
      </p>
      <button className={btn}>{t('startQuiz')}</button>
    </form>
  );

  return (
    <div className="pt-6">
      <Link href="/competitions" className="text-xs text-gray-500">{t('allCompetitions')}</Link>
      <h1 className="mt-2 font-heading text-2xl font-bold text-textneutral">{c.title}</h1>
      <p className="mt-1 text-xs text-gray-400">{formatEat(c.starts_at)} to {formatEat(c.ends_at)} {t('ethiopianTime')} · {accessLabel(c, t)} · {c.time_limit_min} {t('minShort')}</p>
      {searchParams.error && <p className="mt-3 text-sm text-red-600">{searchParams.error}</p>}
      {searchParams.ok && <p className="mt-3 text-sm text-green-700">{searchParams.ok}</p>}
      {manage && <Link href={`/competitions/${id}/manage`} className={`${btnGhost} mt-3`}>{t('manageCompetition')}</Link>}

      <div className="mt-4 space-y-3">
        {prizes.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-3">
            {prizes.map((p) => (
              <div key={p.rank} className={`rounded-xl p-3 text-center ${MEDAL[p.rank - 1]}`}>
                <p className="text-xs font-semibold">{t('prizeFor')} #{p.rank}</p>
                <p className="font-bold">{p.prize}</p>
              </div>
            ))}
          </div>
        )}
        {c.status === 'published' && state === 'live' && <Countdown target={c.ends_at} label={t('closesIn')} />}
        {c.status === 'published' && state === 'upcoming' && <Countdown target={c.starts_at} label={t('opensIn')} />}
        {c.description && <p className="whitespace-pre-line text-sm text-textneutral">{c.description}</p>}
        <p className="text-xs text-gray-500">{t('rankingRule')}</p>
      </div>

      <div className="mt-4">{action}</div>

      {attempt?.submitted_at && (
        <p className={`${card} mt-4 text-sm`}>
          {t('yourResult')}: <b className="text-primary">{attempt.score}/{attempt.total}</b> in {fmtDuration(attempt.duration_seconds)}
          {me ? <> · {t('positionLabel')} <b className="text-primary">#{me.rank}</b> / {rows.length}</> : null}
        </p>
      )}

      {win && (
        <div className={`${card} mt-4 border-yellow-300 bg-yellow-50`}>
          <p className="font-heading text-lg font-bold text-yellow-900">{t('youWon')} #{win.rank}: {win.prize}</p>
          {win.paid ? <p className="text-sm text-green-700">{t('prizeSent')}</p> : win.phone ? (
            <p className="text-sm text-yellow-900">{t('contactOn')} {win.phone}.</p>
          ) : (
            <form action={saveWinnerPhone.bind(null, id)} className="mt-2 flex gap-2">
              <input name="phone" required placeholder={t('phoneForPrize')} className={field} />
              <button className={btn}>{t('send')}</button>
            </form>
          )}
        </div>
      )}

      {winners.length > 0 && (
        <div className="mt-6">
          <h2 className="font-heading text-lg font-bold text-textneutral">{t('winners')}</h2>
          <div className="mt-2 space-y-2">
            {winners.map((w) => (
              <p key={w.rank} className={`${card} text-sm`}>
                <b className="text-primary">#{w.rank}</b> {w.name || t('studentFallback')} · {w.prize} {w.paid && <span className="text-green-700">· {t('paidLabel')}</span>}
              </p>
            ))}
          </div>
        </div>
      )}

      <h2 className="mt-6 font-heading text-lg font-bold text-textneutral">{t('leaderboard')} ({rows.length})</h2>
      <div className={`${card} mt-2 overflow-x-auto p-0`}>
        <table className="w-full text-sm">
          <tbody>
            {rows.length === 0 && <tr><td className="p-4 text-gray-400">{t('noFinishedAttempts')}</td></tr>}
            {rows.slice(0, 25).map((r) => (
              <tr key={r.rank} className={`border-b border-gray-100 last:border-0 dark:border-gray-800 ${r.is_me ? 'bg-primary-50 dark:bg-gray-800' : ''}`}>
                <td className="p-3 font-semibold text-primary">{r.rank}</td>
                <td className="p-3 text-textneutral">{r.name || t('studentFallback')}{r.is_me ? ` ${t('youSuffix')}` : ''}</td>
                <td className="p-3">{r.score}/{r.total}</td>
                <td className="p-3 text-xs text-gray-400">{fmtDuration(r.duration_seconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ReportButton kind="competition" target={c.id} />
    </div>
  );
}
