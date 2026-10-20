'use client';

import type { ReactNode } from 'react';

export function ConfirmForm({ action, message, children, className }: { action: () => Promise<void> | void; message: string; children: ReactNode; className?: string }) {
  return (
    <form action={action} className={className} onSubmit={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </form>
  );
}
