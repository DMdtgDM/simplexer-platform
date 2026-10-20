import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, subtitle, tone = 'primary', children }: { eyebrow?: string; title: string; subtitle?: string; tone?: 'primary' | 'secondary' | 'green'; children?: ReactNode }) {
  const bg = tone === 'secondary' ? 'from-secondary to-secondary-light text-gray-900' : tone === 'green' ? 'from-emerald-700 to-emerald-500 text-white' : 'from-primary to-primary-light text-white';
  return (
    <header className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${bg} p-5 shadow-lift sm:p-6`}>
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom_right,black,transparent_70%)]" />
      <div className="relative">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-widest opacity-70">{eyebrow}</p>}
        <h1 className="mt-1 font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm opacity-90 sm:text-base">{subtitle}</p>}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </header>
  );
}
