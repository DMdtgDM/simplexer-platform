'use client';

import { useRef, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { readingProps, type Font, type Size } from '@/lib/reading';

// Renders lesson `content` (markdown, may contain $inline$ / $$block$$ LaTeX).
// Styling comes from @tailwindcss/typography (registered in tailwind.config.ts)
// tuned below; code blocks get syntax highlighting (rehype-highlight) plus a
// language label and copy button via the CodeBlock override.

function CodeBlock({ children }: { children?: ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  let lang = 'code';
  const arr = (Array.isArray(children) ? children : [children]).filter(
    (c) => !(typeof c === 'string' && c.trim() === '')
  );
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

export function LessonContentRenderer({ content, font = 'sans', size = 'md' }: { content: string; font?: Font; size?: Size }) {
  const r = readingProps(font, size);
  return (
    <div
      style={r.style}
      className={`${r.className} prose prose-slate max-w-none dark:prose-invert
        prose-headings:font-heading prose-headings:text-textneutral dark:prose-headings:text-gray-50
        prose-h2:mt-10 prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2 dark:prose-h2:border-gray-700
        prose-h3:mt-8
        prose-p:leading-[1.85] prose-li:leading-relaxed
        prose-a:font-medium prose-a:text-primary
        prose-strong:text-textneutral dark:prose-strong:text-gray-50
        prose-code:rounded-md prose-code:bg-primary-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-medium prose-code:text-primary-dark prose-code:before:content-none prose-code:after:content-none dark:prose-code:bg-gray-800 dark:prose-code:text-amber-200
        prose-blockquote:rounded-r-xl prose-blockquote:border-l-4 prose-blockquote:border-secondary prose-blockquote:bg-amber-50 prose-blockquote:py-1 prose-blockquote:pr-4 prose-blockquote:not-italic dark:prose-blockquote:bg-gray-800/60
        prose-th:bg-gray-100 prose-th:px-3 prose-th:py-2 dark:prose-th:bg-gray-800 prose-td:px-3 prose-td:py-2
        prose-img:rounded-xl prose-hr:border-gray-200 dark:prose-hr:border-gray-700`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{ pre: CodeBlock }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
