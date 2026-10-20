'use client';

import { useState, useTransition } from 'react';
import { reportIssue } from '@/lib/actions/reports';

export function ReportButton({ kind, target }: { kind: string; target: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="mt-8 border-t border-gray-100 pt-4 text-xs dark:border-gray-800">
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-gray-400 underline hover:text-primary">Report a mistake or a problem</button>
      ) : msg?.ok ? (
        <p className="text-green-700">{msg.message}</p>
      ) : (
        <div className="space-y-2">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="What is wrong? Be as specific as you can."
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" />
          {msg && <p className="text-red-600">{msg.message}</p>}
          <button disabled={pending} onClick={() => start(async () => setMsg(await reportIssue(kind, target, note)))}
            className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-white disabled:opacity-50">
            {pending ? 'Sending...' : 'Send report'}
          </button>
        </div>
      )}
    </div>
  );
}
