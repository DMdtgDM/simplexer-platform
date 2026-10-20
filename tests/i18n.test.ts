import { describe, expect, it } from 'vitest';
import { dictionary } from '@/lib/i18n/dictionary';

describe('dictionary', () => {
  it('Amharic has exactly the same keys as English', () => {
    expect(Object.keys(dictionary.am).sort()).toEqual(Object.keys(dictionary.en).sort());
  });
  it('no translation is empty', () => {
    for (const [locale, dict] of Object.entries(dictionary)) {
      for (const [key, value] of Object.entries(dict)) {
        expect(value.trim().length, `${locale}.${key}`).toBeGreaterThan(0);
      }
    }
  });
});
