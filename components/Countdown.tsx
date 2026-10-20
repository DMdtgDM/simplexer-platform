'use client';

import { useEffect, useState } from 'react';

export function Countdown({ target, label }: { target: string; label: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = new Date(target).getTime();
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  if (left === null) return null;
  const d = Math.floor(left / 864e5), h = Math.floor((left % 864e5) / 36e5);
  const m = Math.floor((left % 36e5) / 6e4), s = Math.floor((left % 6e4) / 1e3);
  const text = [d ? `${d}d` : '', `${h}h`, `${m}m`, `${s}s`].filter(Boolean).join(' ');
  return (
    <p className="rounded-lg bg-primary-50 px-3 py-2 text-sm font-semibold text-primary" aria-live="off">
      {label} {text}
    </p>
  );
}
