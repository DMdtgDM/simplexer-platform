'use client';

import { Check, X } from 'lucide-react';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function letterOf(index?: number) {
  return index === undefined ? null : (LETTERS[index] ?? String(index + 1));
}

export function QuizOption({
  name,
  value,
  label,
  checked,
  onChange,
  index,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: (value: string) => void;
  index?: number;
}) {
  const letter = letterOf(index);
  return (
    <label
      className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm transition-all focus-within:ring-4 focus-within:ring-primary/20 ${
        checked
          ? 'border-primary bg-primary-50 shadow-sm dark:bg-primary/15'
          : 'border-gray-200 bg-white hover:border-primary/40 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800'
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      {letter && (
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
            checked ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {letter}
        </span>
      )}
      <span className={checked ? 'font-semibold text-textneutral' : 'text-textneutral'}>{label}</span>
      {checked && <Check size={18} className="ml-auto shrink-0 text-primary" />}
    </label>
  );
}

export function QuizOptionResult({
  label,
  isCorrect,
  isSelected,
  index,
}: {
  label: string;
  isCorrect: boolean;
  isSelected: boolean;
  index?: number;
}) {
  const letter = letterOf(index);
  const style = isCorrect
    ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/40'
    : isSelected
      ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900';
  const badge = isCorrect
    ? 'bg-green-600 text-white'
    : isSelected
      ? 'bg-red-500 text-white'
      : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500';

  return (
    <div className={`flex min-h-[52px] items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm ${style}`}>
      {letter && (
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badge}`}>
          {isCorrect ? <Check size={14} /> : isSelected ? <X size={14} /> : letter}
        </span>
      )}
      <span className="text-textneutral">{label}</span>
      {isCorrect && (
        <span className="ml-auto shrink-0 rounded-full bg-green-600 px-2.5 py-0.5 text-[11px] font-bold text-white">Correct</span>
      )}
      {!isCorrect && isSelected && (
        <span className="ml-auto shrink-0 rounded-full bg-red-500 px-2.5 py-0.5 text-[11px] font-bold text-white">Your answer</span>
      )}
    </div>
  );
}
