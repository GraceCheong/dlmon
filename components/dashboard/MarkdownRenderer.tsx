'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-container">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>

      <style jsx global>{`
        .markdown-container {
          color: #4A5568;
          line-height: 1.8;
          font-size: 1.05rem;
        }
        .markdown-container h1 {
          font-size: 2.25rem;
          margin-bottom: 1.5rem;
          color: var(--primary-hover);
          border-bottom: 2px solid var(--primary-light);
          padding-bottom: 0.5rem;
        }
        .markdown-container h2 {
          font-size: 1.75rem;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          color: #4A5568;
        }
        .markdown-container h3 {
          font-size: 1.25rem;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .markdown-container p {
          margin-bottom: 1.25rem;
        }
        .markdown-container ul, .markdown-container ol {
          margin-bottom: 1.5rem;
          padding-left: 1.5rem;
        }
        .markdown-container li {
          margin-bottom: 0.5rem;
        }
        .markdown-container table {
          width: 100%;
          border-collapse: collapse;
          margin: 2rem 0;
          background: #F8FAFC;
          border-radius: 1rem;
          overflow: hidden;
        }
        .markdown-container th {
          background: var(--primary-light);
          color: var(--primary-hover);
          padding: 1rem;
          text-align: left;
          font-weight: 700;
        }
        .markdown-container td {
          padding: 1rem;
          border-bottom: 1px solid white;
        }
        .markdown-container blockquote {
          border-left: 4px solid var(--primary);
          padding-left: 1.5rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: #718096;
        }
        .markdown-container code {
          background: #F1F5F9;
          padding: 0.2rem 0.4rem;
          border-radius: 0.4rem;
          font-family: monospace;
          font-size: 0.9em;
        }
      `}</style>
    </div>
  );
}
