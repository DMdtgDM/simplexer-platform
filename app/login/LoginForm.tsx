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


  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
      <h1 className="font-heading text-xl font-bold text-textneutral">{t('login')}</h1>



      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
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
