'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon, Monitor } from 'lucide-react';

const ORDER = ['light', 'dark', 'system'] as const;
const ICONS = { light: Sun, dark: Moon, system: Monitor };
const LABELS = { light: 'Light', dark: 'Dark', system: 'System' };

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = ICONS[theme];

  function cycle() {
    const idx = ORDER.indexOf(theme);
    setTheme(ORDER[(idx + 1) % ORDER.length]);
  }

  return (
    <button
      onClick={cycle}
      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 hover:border-primary/40 hover:text-primary dark:border-gray-700 dark:text-gray-400"
      aria-label={`Theme: ${LABELS[theme]}. Click to change.`}
      title={`Theme: ${LABELS[theme]}`}
    >
      <Icon size={13} />
      {LABELS[theme]}
    </button>
  );
}
