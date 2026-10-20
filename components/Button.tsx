import Link from 'next/link';
import type { ReactNode, ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-white shadow-card hover:bg-primary-dark hover:shadow-lift',
  secondary: 'bg-secondary text-gray-900 shadow-card hover:bg-secondary-light hover:shadow-lift',
  outline: 'border border-gray-300 text-textneutral hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-100',
  ghost: 'text-primary hover:bg-primary-50 dark:hover:bg-primary/10',
};

const base =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 min-h-[46px] font-semibold text-sm transition duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';

export function Button({ children, variant = 'primary', className = '', ...props }: { children: ReactNode; variant?: Variant; className?: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${base} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({ children, href, variant = 'primary', className = '' }: { children: ReactNode; href: string; variant?: Variant; className?: string }) {
  return (
    <Link href={href} className={`${base} ${variantClasses[variant]} ${className}`}>
      {children}
    </Link>
  );
}
