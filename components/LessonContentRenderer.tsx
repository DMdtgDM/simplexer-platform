'use client';

import { useRef, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Lightbulb, AlertTriangle, BookOpen, CheckCircle2, Info, Eye, EyeOff } from 'lucide-react';
import { readingProps, type Font, type Size } from '@/lib/reading';

// Renders lesson `content` (markdown, may contain $inline$ / $$block$$ LaTeX).
// Display-only features (no data changes — everything is derived from the
// markdown the lesson already has):
//  - typography via @tailwindcss/typography + syntax highlighting
//  - code blocks: dark box, language label, Copy button
//  - plain ``` blocks (no language) render as light OUTPUT boxes
//  - blockquotes starting with Tip: / Remember: / Example: / Mistake: /
//    Warning: / Note: become coloured callout boxes
//  - a blockquote starting with Answer: becomes a tap-to-reveal answer box
//  - lessons with 3+ section headings get an "In this lesson" jump list

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  const props = (node as { props?: { children?: ReactNode } }).props;
  return props ? textOf(props.children) : '';
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_`#>]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

type TocItem = { level: 2 | 3; text: string; id: string };

function extractToc(content: string): TocItem[] {
  const items: TocItem[] = [];
  let inFence = false;
  for (const line of content.split('\n')) {
    if (line.trimStart().startsWith('```')) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (m) {
      const text = m[2].replace(/[*_`]/g, '').trim();
      items.push({ level: m[1].length as 2 | 3, text, id: slugify(text) });
    }
  }
  return items;
}

function LessonToc({ items }: { items: TocItem[] }) {
  return (
    <nav className="not-prose mb-8 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">In this lesson</p>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className={it.level === 3 ? 'pl-4' : ''}>
            <a href={`#${it.id}`} className="text-sm font-medium text-primary hover:underline dark:text-blue-300">
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const arr = (Array.isArray(children) ? children : [children]).filter(
    (c) => !(typeof c === 'string' && c.trim() === '')
  );

  let lang: string | null = null;
  for (const c of arr) {
    const cls = (c as { props?: { className?: string } } | null)?.props?.className;
    const m = cls ? /language-([\w-]+)/.exec(cls) : null;
    if (m) { lang = m[1]; break; }
  }

  async function copy() {
    const text = preRef.current?.innerText ?? '';
    try { await navigator.clipboard.writeText(text.replace(/\n$/, '')); } catch { /* clipboard unavailable */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  // No language on the fence → treat as program output: light terminal box.
  if (!lang) {
    return (
      <div className="not-prose my-5 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 dark:bg-gray-800 dark:ring-gray-700">
        <div className="border-b border-slate-200 px-4 py-1.5 dark:border-gray-700">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">Output</span>
        </div>
        <pre ref={preRef} className="overflow-x-auto p-4 text-[13.5px] leading-relaxed text-slate-800 dark:text-gray-100 [&>code]:bg-transparent [&>code]:p-0">
          {arr}
        </pre>
      </div>
    );
  }

  return (
    <div className="not-prose my-5 overflow-hidden rounded-xl bg-[#0d1117] shadow-sm ring-1 ring-black/10 dark:ring-white/10">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{lang}</span>
        <button
          type="button"
          onClick={copy}
          className="rounded-md px-2 py-1 text-[11px] font-medium text-gray-300 transition hover:bg-white/10 hover:text-white"
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <pre ref={preRef} className="overflow-x-auto p-4 text-[13.5px] leading-relaxed text-gray-100 [&>code]:bg-transparent [&>code]:p-0">
        {arr}
      </pre>
    </div>
  );
}

const CALLOUTS = [
  { key: 'tip', match: /^tip\s*:/i, label: 'Tip', Icon: Lightbulb, box: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20', chip: 'text-emerald-700 dark:text-emerald-300' },
  { key: 'remember', match: /^remember\s*:/i, label: 'Remember', Icon: CheckCircle2, box: 'border-primary bg-primary-50 dark:bg-blue-900/20', chip: 'text-primary dark:text-blue-300' },
  { key: 'example', match: /^example\s*:/i, label: 'Example', Icon: BookOpen, box: 'border-sky-400 bg-sky-50 dark:bg-sky-900/20', chip: 'text-sky-700 dark:text-sky-300' },
  { key: 'mistake', match: /^(common mistake|mistake|warning)\s*:/i, label: 'Watch out', Icon: AlertTriangle, box: 'border-red-400 bg-red-50 dark:bg-red-900/20', chip: 'text-red-700 dark:text-red-300' },
  { key: 'note', match: /^note\s*:/i, label: 'Note', Icon: Info, box: 'border-secondary bg-amber-50 dark:bg-amber-900/20', chip: 'text-amber-700 dark:text-amber-300' },
] as const;

function AnswerBox({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="not-prose my-5 overflow-hidden rounded-xl border border-dashed border-primary/40 bg-primary-50/50 dark:bg-blue-900/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-primary dark:text-blue-300"
      >
        {open ? <EyeOff size={16} /> : <Eye size={16} />}
        {open ? 'Hide the answer' : 'Show the answer'}
      </button>
      {open && <div className="space-y-2 px-4 pb-4 text-[15px] leading-relaxed text-gray-700 dark:text-gray-200 [&_p]:m-0">{children}</div>}
    </div>
  );
}

function Callout({ children }: { children?: ReactNode }) {
  const text = textOf(children).trimStart();
  if (/^answer\s*:/i.test(text)) return <AnswerBox>{children}</AnswerBox>;
  const found = CALLOUTS.find((c) => c.match.test(text));
  if (!found) {
    return (
      <blockquote className="my-5 rounded-r-xl border-l-4 border-secondary bg-amber-50 py-1 pr-4 pl-4 not-italic dark:bg-gray-800/60 [&_p]:my-1">
        {children}
      </blockquote>
    );
  }
  const { Icon, label, box, chip } = found;
  return (
    <div className={`not-prose my-5 rounded-xl border-l-4 px-4 py-3 ${box}`}>
      <p className={`mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${chip}`}>
        <Icon size={14} /> {label}
      </p>
      <div className="space-y-2 text-[15px] leading-relaxed text-gray-700 dark:text-gray-200 [&_p]:m-0">{children}</div>
    </div>
  );
}

function H2({ children }: { children?: ReactNode }) {
  return <h2 id={slugify(textOf(children))} className="scroll-mt-24">{children}</h2>;
}
function H3({ children }: { children?: ReactNode }) {
  return <h3 id={slugify(textOf(children))} className="scroll-mt-24">{children}</h3>;
}

export function LessonContentRenderer({ content, font = 'sans', size = 'md' }: { content: string; font?: Font; size?: Size }) {
  const r = readingProps(font, size);
  const toc = extractToc(content);
  return (
    <div
      style={r.style}
      className={`${r.className} prose prose-slate max-w-none dark:prose-invert
        prose-headings:font-heading prose-headings:text-textneutral dark:prose-headings:text-gray-50
        prose-h2:mt-10 prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2 dark:prose-h2:border-gray-700
        prose-h3:mt-8
        prose-p:leading-[1.85] prose-li:leading-relaxed
        prose-li:marker:font-bold prose-li:marker:text-primary
        prose-a:font-medium prose-a:text-primary
        prose-strong:text-textneutral dark:prose-strong:text-gray-50
        prose-code:rounded-md prose-code:bg-primary-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-medium prose-code:text-primary-dark prose-code:before:content-none prose-code:after:content-none dark:prose-code:bg-gray-800 dark:prose-code:text-amber-200
        prose-th:bg-gray-100 prose-th:px-3 prose-th:py-2 dark:prose-th:bg-gray-800 prose-td:px-3 prose-td:py-2
        prose-img:rounded-xl prose-hr:border-gray-200 dark:prose-hr:border-gray-700`}
    >
      {toc.length >= 3 && <LessonToc items={toc} />}
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{ pre: CodeBlock, blockquote: Callout, h2: H2, h3: H3 }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
