import { cookies } from 'next/headers';
import { dictionary, type DictKey, type Locale } from './dictionary';

/** Server-side translator: reads the locale cookie set by LocaleProvider. */
export async function serverT(): Promise<{ locale: Locale; t: (k: DictKey) => string }> {
  const v = (await cookies()).get('simplexer_locale')?.value;
  const locale: Locale = v === 'am' ? 'am' : 'en';
  return { locale, t: (k: DictKey) => dictionary[locale][k] };
}
