'use client';

import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check } from 'lucide-react';

export const inputCls =
  'min-h-[44px] w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[15px] text-textneutral shadow-sm transition placeholder:text-gray-400 hover:border-gray-300 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/15 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600 dark:focus:bg-gray-900 sm:text-sm';
export const panel = 'rounded-2xl border border-gray-200/80 bg-white p-5 shadow-card dark:border-gray-800 dark:bg-gray-900';

export function Field({ label, hint, required, children, className = '' }: { label: string; hint?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-semibold leading-snug text-textneutral">{label}{required && <span className="text-red-500"> *</span>}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

export function Segmented<T extends string>({ value, onChange, options, small }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[]; small?: boolean }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800" role="radiogroup">
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}
          className={`rounded-lg ${small ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'} font-medium transition ${value === o.id ? 'bg-white text-primary shadow dark:bg-gray-950' : 'text-gray-500 hover:text-textneutral'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Type and press Enter or comma to add a chip. Submits as one comma-separated value under `name`. */
export function TagInput({ name, defaultValue = [], placeholder, suggestions = [] }: { name: string; defaultValue?: string[]; placeholder?: string; suggestions?: string[] }) {
  const [tags, setTags] = useState<string[]>(defaultValue);
  const [text, setText] = useState('');
  const add = (t: string) => {
    const v = t.trim().replace(/,/g, '');
    if (v && !tags.some((x) => x.toLowerCase() === v.toLowerCase()) && tags.length < 15) setTags([...tags, v]);
    setText('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(text); }
    else if (e.key === 'Backspace' && !text && tags.length) setTags(tags.slice(0, -1));
  };
  return (
    <div>
      <input type="hidden" name={name} value={tags.join(', ')} />
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-gray-200 bg-white p-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 dark:border-gray-700 dark:bg-gray-900">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary">
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => setTags(tags.filter((x) => x !== t))} className="text-primary/60 hover:text-primary">×</button>
          </span>
        ))}
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} onBlur={() => add(text)}
          placeholder={tags.length ? '' : placeholder} className="min-h-[36px] min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-sm outline-none" />
      </div>
      {suggestions.filter((s) => !tags.includes(s)).length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {suggestions.filter((s) => !tags.includes(s)).map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-dashed border-gray-300 px-2.5 py-0.5 text-xs text-gray-500 hover:border-primary hover:text-primary">+ {s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StepBar({ steps, current, onGo }: { steps: string[]; current: number; onGo?: (i: number) => void }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-2">
          <button type="button" onClick={() => onGo?.(i)} aria-current={i === current ? 'step' : undefined}
            className="flex items-center gap-2 text-left">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold transition ${
              i < current ? 'bg-green-500 text-white' : i === current ? 'bg-primary text-white shadow-card' : 'bg-gray-200 text-gray-500 dark:bg-gray-800'}`}>
              {i < current ? <Check size={16} /> : i + 1}
            </span>
            <span className={`hidden text-sm sm:block ${i === current ? 'font-bold text-textneutral' : 'text-gray-500'}`}>{s}</span>
          </button>
          {i < steps.length - 1 && <span className={`h-0.5 flex-1 rounded ${i < current ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-800'}`} />}
        </li>
      ))}
    </ol>
  );
}
