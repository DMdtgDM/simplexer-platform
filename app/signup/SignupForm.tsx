'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/Button';
import { useLocale } from '@/components/LocaleProvider';
import type { Grade } from '@/lib/types';

export function SignupForm({ grades }: { grades: Grade[] }) {
  const router = useRouter();
  const { t } = useLocale();
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
      setError(signUpError.message);
      return;
    }

    // Fill in level_type / grade_id on the profile row created by the trigger.
    if (data.user) {
      await supabase
        .from('users')
        .update({
          name,
          level_type: levelType,
          grade_id: levelType === 'grade' ? gradeId || null : null,
        })
        .eq('id', data.user.id);
    }

    setLoading(false);

    if (data.session) {
      router.push('/profile');
      router.refresh();
    } else {
      // Email confirmation is required before a session exists.
      setDone(true);
    }
  }

  async function handleGoogleSignup() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-card">
        <p className="font-heading text-lg font-semibold text-textneutral">Check your email</p>
        <p className="mt-2 text-sm text-gray-500">
          We sent a confirmation link to <strong>{email}</strong>. Click it, then come back and log in.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
      <h1 className="font-heading text-xl font-bold text-textneutral">{t('signup')}</h1>

      <button
        onClick={handleGoogleSignup}
        className="mt-5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50"
      >
        Continue with Google
      </button>

      <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        or
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          required
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-h-[44px] rounded-xl border border-gray-300 px-3 text-sm focus:border-primary focus:outline-none"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-[44px] rounded-xl border border-gray-300 px-3 text-sm focus:border-primary focus:outline-none"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-[44px] rounded-xl border border-gray-300 px-3 text-sm focus:border-primary focus:outline-none"
        />

        <div className="mt-1">
          <p className="mb-1.5 text-xs font-medium text-gray-500">I am mainly here for:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLevelType('grade')}
              className={`min-h-[44px] rounded-xl border px-2 text-xs font-medium ${
                levelType === 'grade' ? 'border-primary bg-primary-50 text-primary' : 'border-gray-300 text-gray-500'
              }`}
            >
              School (Grade)
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
              Skills / Interests
            </button>
          </div>
        </div>

        {levelType === 'grade' && (
          <select
            required
            value={gradeId}
            onChange={(e) => setGradeId(e.target.value)}
            className="min-h-[44px] rounded-xl border border-gray-300 px-3 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Select your grade</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}

        {error && <p className="text-xs text-error">{error}</p>}
        <Button type="submit" disabled={loading} className="mt-1 w-full">
          {loading ? '...' : t('signup')}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t('login')}
        </Link>
      </p>
    </div>
  );
}
