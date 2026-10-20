'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, Users, BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/Button';
import { field } from '@/components/Ui';
import { PasswordField, PasswordStrength } from '@/components/PasswordField';
import { friendlyAuthError } from '@/lib/authErrors';
import { useLocale } from '@/components/LocaleProvider';
import type { Grade } from '@/lib/types';

type AccountType = 'student' | 'parent' | 'tutor';
const HOME_FOR: Record<AccountType, string> = { student: '/profile', parent: '/requests', tutor: '/tutor' };

export function SignupForm({ grades, next }: { grades: Grade[]; next?: string }) {
  const router = useRouter();
  const { t } = useLocale();
  // Same-site return path only — the same rule the auth callback applies.
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : null;
  const [accountType, setAccountType] = useState<AccountType>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [levelType, setLevelType] = useState<'grade' | 'interest_only'>('interest_only');
  const [gradeId, setGradeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (signUpError) {
      setLoading(false);
      setError(friendlyAuthError(signUpError.message, t));
      return;
    }

    // Fill in level_type / grade_id on the profile row created by the trigger.
    if (data.user) {
      await supabase
        .from('users')
        .update({
          name,
          level_type: accountType === 'student' ? levelType : 'interest_only',
          grade_id: accountType === 'student' && levelType === 'grade' ? gradeId || null : null,
        })
        .eq('id', data.user.id);
    }

    setLoading(false);

    if (data.session) {
      router.push(safeNext ?? HOME_FOR[accountType]);
      router.refresh();
    } else {
      // Email confirmation comes first. Remember the chosen account
      // type so the profile page can route them on after they log in.
      try { localStorage.setItem('sx_intent', accountType); } catch { /* private mode */ }
      setDone(true);
    }
  }

  async function handleGoogleSignup() {
    // The account-type choice leaves with the browser to Google and
    // back; the profile page applies it once after the callback.
    try { localStorage.setItem('sx_intent', accountType); } catch { /* private mode */ }
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ''}`,
      },
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-card">
        <p className="font-heading text-lg font-semibold text-textneutral">{t('checkEmailTitle')}</p>
        <p className="mt-2 text-sm text-gray-500">
          {t('checkEmailBody').replace('{email}', email)}
        </p>
        <Link href={safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : '/login'} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          {t('goToLogin')}
        </Link>
      </div>
    );
  }

  const cardCls = (active: boolean) =>
    `flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-2 text-center ${
      active ? 'border-primary bg-primary-50 text-primary' : 'border-gray-300 text-gray-500 hover:border-gray-400'
    }`;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
      <h1 className="font-heading text-xl font-bold text-textneutral">{t('signup')}</h1>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-medium text-gray-500">{t('accountTypeQ')}</p>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => setAccountType('student')} className={cardCls(accountType === 'student')}>
            <GraduationCap size={20} />
            <span className="text-xs font-semibold">{t('studentCard')}</span>
            <span className="text-[10px] leading-tight opacity-80">{t('studentCardSub')}</span>
          </button>
          <button type="button" onClick={() => setAccountType('parent')} className={cardCls(accountType === 'parent')}>
            <Users size={20} />
            <span className="text-xs font-semibold">{t('parentCard')}</span>
            <span className="text-[10px] leading-tight opacity-80">{t('parentCardSub')}</span>
          </button>
          <button type="button" onClick={() => setAccountType('tutor')} className={cardCls(accountType === 'tutor')}>
            <BookOpen size={20} />
            <span className="text-xs font-semibold">{t('tutorCard')}</span>
            <span className="text-[10px] leading-tight opacity-80">{t('tutorCardSub')}</span>
          </button>
        </div>
      </div>

      <button
        onClick={handleGoogleSignup}
        className="mt-5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50"
      >
        {t('continueWithGoogle')}
      </button>

      <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        {t('orWord')}
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          required
          placeholder={t('fullName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={field}
        />
        <input
          type="email"
          required
          placeholder={t('emailPh')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={field}
        />
        <PasswordField value={password} onChange={setPassword} placeholder={t('passwordPh')} autoComplete="new-password" />
        <PasswordStrength password={password} />

        {accountType === 'student' && (
          <div className="mt-1">
            <p className="mb-1.5 text-xs font-medium text-gray-500">{t('hereForQ')}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLevelType('grade')}
                className={`min-h-[44px] rounded-xl border px-2 text-xs font-medium ${
                  levelType === 'grade' ? 'border-primary bg-primary-50 text-primary' : 'border-gray-300 text-gray-500'
                }`}
              >
                {t('schoolGradeOpt')}
              </button>
              <button
                type="button"
                onClick={() => setLevelType('interest_only')}
                className={`min-h-[44px] rounded-xl border px-2 text-xs font-medium ${
                  levelType === 'interest_only'
                    ? 'border-primary bg-primary-50 text-primary'
                    : 'border-gray-300 text-gray-500'
                }`}
              >
                {t('skillsOpt')}
              </button>
            </div>
          </div>
        )}

        {accountType === 'student' && levelType === 'grade' && (
          <select
            required
            value={gradeId}
            onChange={(e) => setGradeId(e.target.value)}
            className={field}
          >
            <option value="">{t('selectGrade')}</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}

        {accountType === 'parent' && <p className="text-xs text-gray-500">{t('parentSignupNote')}</p>}
        {accountType === 'tutor' && <p className="text-xs text-gray-500">{t('tutorSignupNote')}</p>}

        {error && <p className="text-xs text-error">{error}</p>}
        <Button type="submit" disabled={loading} className="mt-1 w-full">
          {loading ? '...' : t('signup')}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-500">
        {t('alreadyAccount')}{' '}
        <Link href={safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : '/login'} className="font-medium text-primary hover:underline">
          {t('login')}
        </Link>
      </p>
    </div>
  );
}
