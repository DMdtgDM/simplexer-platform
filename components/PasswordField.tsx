'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { field } from '@/components/Ui';
import { useLocale } from '@/components/LocaleProvider';

// Password input with a show/hide eye, used by login, signup and the
// reset page so all three behave the same way.
export function PasswordField({
  value, onChange, placeholder, autoComplete = 'current-password',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  const { t } = useLocale();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${field} pr-11`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? t('hidePassword') : t('showPassword')}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

// Simple strength score 0..3 for the signup/reset hint line.
export function passwordScore(pw: string): number {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw) || /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw) || /[a-zA-Z]/.test(pw) && /\d/.test(pw)) s++;
  return Math.min(s, 3);
}

export function PasswordStrength({ password }: { password: string }) {
  const { t } = useLocale();
  if (!password) return null;
  const s = passwordScore(password);
  const labels = [t('pwWeak'), t('pwWeak'), t('pwFair'), t('pwStrong')];
  const colors = ['bg-red-400', 'bg-red-400', 'bg-amber-400', 'bg-green-500'];
  return (
    <div className="-mt-1">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded ${i < s ? colors[s] : 'bg-gray-200 dark:bg-gray-700'}`} />
        ))}
      </div>
      <p className="mt-1 text-[11px] text-gray-400">{labels[s]} — {t('pwHint')}</p>
    </div>
  );
}
