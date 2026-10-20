import Link from 'next/link';
import { NavbarClient } from './NavbarClient';

// No data fetching here on purpose: login state is resolved in the browser, so the
// layout never waits on the database and public pages can be cached.
export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-3" aria-label="Simplexer home">
          {/* A simplex is the simplest shape: a triangle. Three points, one connected idea. */}
          <svg viewBox="0 0 40 40" className="h-9 w-9 drop-shadow-sm" aria-hidden>
            <rect width="40" height="40" rx="12" className="fill-primary" />
            <path d="M20 9.5 L31 28.5 H9 Z" fill="none" stroke="white" strokeWidth="2.4" strokeLinejoin="round" opacity="0.9" />
            <circle cx="20" cy="9.5" r="3.4" fill="white" />
            <circle cx="31" cy="28.5" r="3.4" fill="white" />
            <circle cx="9" cy="28.5" r="3.4" className="fill-secondary" />
          </svg>
          <span className="font-heading text-xl font-extrabold leading-none tracking-tight text-primary min-[420px]:text-2xl">Simplexer</span>
        </Link>
        <NavbarClient />
      </div>
    </header>
  );
}
