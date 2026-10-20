import type { DictKey } from '@/lib/i18n/dictionary';

// Supabase auth errors arrive as raw system text ("Invalid login
// credentials", "User already registered"...). Map the common ones to
// plain-language, translated messages; anything unknown gets the
// generic line rather than leaking system wording to the user.
export function friendlyAuthError(raw: string | undefined, t: (key: DictKey) => string): string {
  const m = (raw ?? '').toLowerCase();
  if (m.includes('invalid login credentials')) return t('errWrongCredentials');
  if (m.includes('already registered') || m.includes('already been registered')) return t('errEmailTaken');
  if (m.includes('email not confirmed')) return t('errEmailNotConfirmed');
  if (m.includes('password should be') || m.includes('password is too') || m.includes('at least 6')) return t('errWeakPassword');
  if (m.includes('validate email') || m.includes('email address') && m.includes('invalid')) return t('errBadEmail');
  if (m.includes('rate limit') || m.includes('only request this after') || m.includes('too many')) return t('errRateLimit');
  return t('errGeneric');
}
