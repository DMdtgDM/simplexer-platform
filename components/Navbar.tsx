import Link from 'next/link';
import { getCurrentUser } from '@/lib/queries/progress';
import { NavbarClient } from './NavbarClient';

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-heading text-lg font-bold text-primary">
          Simplexer<span className="text-secondary">.</span>
        </Link>
        <NavbarClient loggedIn={Boolean(user)} role={user?.profile?.role ?? null} />
      </div>
    </header>
  );
}
