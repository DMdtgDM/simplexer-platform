'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/Button';
import { field } from '@/components/Ui';
import { PasswordField } from '@/components/PasswordField';
import { friendlyAuthError } from '@/lib/authErrors';
import { useLocale } from '@/components/LocaleProvider';

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Same-site return path only — the same rule the auth callback applies.
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(friendlyAuthError(error.message, t));
      return;
    }
    router.push(safeNext ?? '/profile');
    router.refresh();
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ''}`,
      },
    });
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
      <h1 className="font-heading text-xl font-bold text-textneutral">{t('login')}</h1>

      <button
        onClick={handleGoogleLogin}
        className="mt-5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50"
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.61z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.87-3.04.87-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
          />
          <path fill="#FBBC05" d="M3.97 10.73A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.19.29-1.73V4.94H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.06z" />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94L3.68 7.27C4.38 5.16 6.36 3.58 9 3.58z"
          />
        </svg>
        {t('continueWithGoogle')}
      </button>

      <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        {t('orWord')}
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder={t('emailPh')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={field}
        />
        <PasswordField value={password} onChange={setPassword} placeholder={t('passwordPh')} />
        <div className="-mt-1 text-right">
          <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
            {t('forgotPassword')}
          </Link>
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
        <Button type="submit" disabled={loading} className="mt-1 w-full">
          {loading ? '...' : t('login')}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-500">
        {t('noAccount')}{' '}
        <Link href={safeNext ? `/signup?next=${encodeURIComponent(safeNext)}` : '/signup'} className="font-medium text-primary hover:underline">
          {t('signup')}
        </Link>
      </p>
    </div>
  );
}
