import type { ReactNode } from 'react';

type Tone = 'primary' | 'secondary' | 'success' | 'error' | 'neutral';

const toneClasses: Record<Tone, string> = {
  primary: 'bg-primary-50 text-primary',
  secondary: 'bg-secondary/10 text-secondary-dark',
  success: 'bg-success/10 text-success',
  error: 'bg-error/10 text-error',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
