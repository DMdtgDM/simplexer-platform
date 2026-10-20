import type { CSSProperties } from 'react';

export type Font = 'sans' | 'serif' | 'ethiopic' | 'mono';
export type Size = 'sm' | 'md' | 'lg';

export const FONTS: { id: Font; label: string; sample: string }[] = [
  { id: 'sans', label: 'Clean', sample: 'Aa አማ' },
  { id: 'serif', label: 'Book', sample: 'Aa አማ' },
  { id: 'ethiopic', label: 'Amharic', sample: 'ሀሁ አማርኛ' },
  { id: 'mono', label: 'Code', sample: '{ a+b }' },
];
export const SIZES: { id: Size; label: string }[] = [
  { id: 'sm', label: 'Small' },
  { id: 'md', label: 'Medium' },
  { id: 'lg', label: 'Large' },
];

/** Class names and inline style that give a lesson its chosen reading look. */
export function readingProps(font: Font = 'sans', size: Size = 'md'): { className: string; style?: CSSProperties } {
  const sizeClass = size === 'sm' ? 'prose-sm' : size === 'lg' ? 'prose-lg' : '';
  if (font === 'serif') return { className: `${sizeClass} font-serif` };
  if (font === 'mono') return { className: `${sizeClass} font-mono` };
  if (font === 'ethiopic') return { className: sizeClass, style: { fontFamily: '"Noto Sans Ethiopic","Abyssinica SIL",system-ui,sans-serif' } };
  return { className: sizeClass };
}
