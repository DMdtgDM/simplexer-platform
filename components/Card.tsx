import Link from 'next/link';
import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-card dark:border-gray-800 dark:bg-gray-900 ${className}`}>
      {children}
    </div>
  );
}

export function CardLink({ children, href, className = '' }: { children: ReactNode; href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`group block rounded-2xl border border-gray-100 bg-white p-5 shadow-card transition duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift active:translate-y-0 active:scale-[0.99] dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      {children}
    </Link>
  );
}
