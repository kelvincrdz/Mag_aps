import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownViewerProps {
  content: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  const [resolved, setResolved] = useState<string>(content);

  useEffect(() => {
    const isUrl = /^https?:\/\//i.test(content);
    if (!isUrl) {
      setResolved(content);
      return;
    }
    let cancelled = false;
    fetch(content)
      .then(r => r.text())
      .then(txt => { if (!cancelled) setResolved(txt); })
      .catch(() => { if (!cancelled) setResolved(''); });
    return () => { cancelled = true; };
  }, [content]);

  return (
    <div className="
      prose prose-invert max-w-none 
      prose-headings:font-serif prose-headings:text-mag-cyan 
      prose-h1:text-2xl md:prose-h1:text-3xl prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-3 md:prose-h1:pb-4 prose-h1:tracking-wide
      prose-h2:text-lg md:prose-h2:text-xl prose-h2:text-mag-text/90 prose-h2:mt-6 md:prose-h2:mt-8
      prose-h3:text-base md:prose-h3:text-lg
      prose-p:text-base md:prose-p:text-mag-text/80 prose-p:leading-relaxed prose-p:font-light prose-p:mb-4
      prose-strong:text-mag-accent prose-strong:font-bold
      prose-blockquote:border-l-4 prose-blockquote:border-mag-accent prose-blockquote:bg-white/5 prose-blockquote:py-2 prose-blockquote:px-3 md:prose-blockquote:px-4 prose-blockquote:rounded-r prose-blockquote:text-sm md:prose-blockquote:text-base
      prose-ul:list-disc prose-ul:marker:text-mag-cyan prose-ul:text-base prose-ul:my-3
      prose-li:text-base prose-li:my-1
      prose-a:text-mag-cyan prose-a:no-underline hover:prose-a:underline hover:prose-a:text-white transition-colors
      prose-code:text-sm md:prose-code:text-base prose-code:text-mag-accent prose-code:bg-black/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-[#05080a] prose-pre:border prose-pre:border-white/10 prose-pre:shadow-inner prose-pre:overflow-x-auto prose-pre:text-sm prose-pre:p-3 md:prose-pre:p-4
      prose-th:text-mag-cyan prose-th:uppercase prose-th:text-xs prose-th:tracking-wider prose-th:border-b prose-th:border-white/20 prose-th:p-2 md:prose-th:p-3
      prose-td:border-b prose-td:border-white/5 prose-td:p-2 md:prose-td:p-3 prose-td:text-sm
    ">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-6 rounded-lg border border-white/10 bg-black/20 custom-scrollbar">
              <table className="w-full text-left border-collapse" {...props} />
            </div>
          ),
          hr: ({ node, ...props }) => (
            <hr className="border-t border-white/10 my-8" {...props} />
          )
        }}
      >
        {resolved}
      </ReactMarkdown>
    </div>
  );
};
