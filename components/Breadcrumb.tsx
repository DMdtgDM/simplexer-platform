import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export type Crumb = { label: string; href?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={12} className="text-gray-300" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-primary hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-textneutral dark:text-gray-100">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
