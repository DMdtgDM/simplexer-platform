'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/Button';
import { field } from '@/components/Ui';
import { friendlyAuthError } from '@/lib/authErrors';
import { useLocale } from '@/components/LocaleProvider';

export function ForgotForm() {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
    });
    setLoading(false);
    if (error) {
      // Rate limits and the like still surface; an unknown email does
      // NOT error here, and the sent screen never confirms whether an
      // account exists.
      setError(friendlyAuthError(error.message, t));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-card">
        <p className="font-heading text-lg font-semibold text-textneutral">{t('checkEmailTitle')}</p>
        <p className="mt-2 text-sm text-gray-500">{t('resetSentBody').replace('{email}', email)}</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          {t('goToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
      <h1 className="font-heading text-xl font-bold text-textneutral">{t('forgotTitle')}</h1>
      <p className="mt-2 text-sm text-gray-500">{t('forgotBody')}</p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder={t('emailPh')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={field}
        />
        {error && <p className="text-xs text-error">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? '...' : t('sendResetLink')}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-gray-500">
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t('goToLogin')}
        </Link>
      </p>
    </div>
  );
}
