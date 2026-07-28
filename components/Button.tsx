import Link from 'next/link';
import type { ReactNode, ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  secondary: 'bg-secondary text-white hover:bg-secondary-dark',
  outline: 'border border-gray-300 text-textneutral hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800',
  ghost: 'text-primary hover:bg-primary-50 dark:hover:bg-primary/10',
};

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 min-h-[44px] font-medium text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none';

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: { children: ReactNode; variant?: Variant; className?: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${base} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  href,
  variant = 'primary',
  className = '',
}: {
  children: ReactNode;
  href: string;
  variant?: Variant;
  className?: string;
}) {
  return (
    <Link href={href} className={`${base} ${variantClasses[variant]} ${className}`}>
      {children}
    </Link>
  );
}
