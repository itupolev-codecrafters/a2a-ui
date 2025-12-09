'use client';

import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = memo(
  ({ content, className = '' }) => {
    return (
      <div className={`markdown-content ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // Заголовки
            h1: ({ children }) => (
              <h1 className="text-xl font-bold mt-4 mb-2 first:mt-0">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-bold mt-3 mb-2 first:mt-0">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-semibold mt-2 mb-1 first:mt-0">{children}</h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h4>
            ),
            // Параграфы
            p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
            // Списки
            ul: ({ children }) => (
              <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
            ),
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            // Код
            code: ({ className, children, ...props }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                    {children}
                  </code>
                );
              }
              return (
                <code className={`${className} font-mono text-sm`} {...props}>
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="bg-muted rounded-md p-3 mb-2 overflow-x-auto text-sm">{children}</pre>
            ),
            // Цитаты
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-2 text-muted-foreground">
                {children}
              </blockquote>
            ),
            // Ссылки
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {children}
              </a>
            ),
            // Разделители
            hr: () => <hr className="my-4 border-border" />,
            // Таблицы
            table: ({ children }) => (
              <div className="overflow-x-auto mb-2">
                <table className="min-w-full border border-border rounded-md">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
            th: ({ children }) => (
              <th className="px-3 py-2 text-left text-sm font-semibold border-b border-border">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-3 py-2 text-sm border-b border-border">{children}</td>
            ),
            // Выделение текста
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }
);

MarkdownRenderer.displayName = 'MarkdownRenderer';
