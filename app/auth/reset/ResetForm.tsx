'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button, ButtonLink } from '@/components/Button';
import { PasswordField, PasswordStrength } from '@/components/PasswordField';
import { friendlyAuthError } from '@/lib/authErrors';
import { useLocale } from '@/components/LocaleProvider';

// Landing page for the password-reset email link. The link goes
// through /auth/callback, which exchanges the code and sets a session;
// this page then lets the user set the new password on that session.
export function ResetForm() {
  const { t } = useLocale();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t('passwordsNoMatch'));
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(friendlyAuthError(error.message, t));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-card">
        <p className="font-heading text-lg font-semibold text-textneutral">{t('resetDoneTitle')}</p>
        <p className="mt-2 text-sm text-gray-500">{t('resetDoneBody')}</p>
        <ButtonLink href="/profile" className="mt-4">
          {t('profile')}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
      <h1 className="font-heading text-xl font-bold text-textneutral">{t('forgotTitle')}</h1>
      {ready === false ? (
        <>
          <p className="mt-2 text-sm text-error">{t('resetExpired')}</p>
          <Link href="/forgot-password" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            {t('sendResetLink')}
          </Link>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <PasswordField value={password} onChange={setPassword} placeholder={t('newPasswordPh')} autoComplete="new-password" />
          <PasswordStrength password={password} />
          <PasswordField value={confirm} onChange={setConfirm} placeholder={t('confirmPasswordPh')} autoComplete="new-password" />
          {error && <p className="text-xs text-error">{error}</p>}
          <Button type="submit" disabled={loading || ready === null} className="w-full">
            {loading ? '...' : t('setNewPasswordBtn')}
          </Button>
        </form>
      )}
    </div>
  );
}
