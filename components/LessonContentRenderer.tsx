import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

// Renders lesson `content` (markdown, may contain $inline$ / $$block$$ LaTeX
// per SRS §12.6). Amharic/Ethiopic text passes through untouched since it's
// just Unicode text inside the markdown — the font stack (see layout.tsx /
// globals.css) is what makes it render correctly, not this component.
export function LessonContentRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-heading prose-headings:text-textneutral dark:prose-headings:text-gray-100 prose-p:leading-relaxed prose-a:text-primary prose-img:rounded-xl prose-pre:bg-gray-900 prose-pre:text-gray-100">
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
