import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  title?: string;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'bash',
  showLineNumbers = false,
  title,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const lines = code.trim().split('\n');

  return (
    <div
      className={`rounded-lg border border-slate-200 dark:border-white/10 bg-slate-900 text-slate-100 overflow-hidden font-mono text-xs ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950/80 border-b border-slate-800/80 text-[11px] text-slate-400 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-600" />
          <span className="font-semibold text-slate-300 tracking-wider uppercase text-[10px]">
            {language}
          </span>
          {title && <span className="text-slate-500 font-sans text-xs">· {title}</span>}
        </div>

        <button
          onClick={handleCopy}
          aria-label={copied ? 'Code copied to clipboard' : 'Copy code to clipboard'}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/70 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px]"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <div className="p-3.5 overflow-x-auto leading-relaxed">
        {showLineNumbers ? (
          <div className="table w-full">
            {lines.map((line, idx) => (
              <div key={idx} className="table-row">
                <span className="table-cell select-none pr-4 text-right text-slate-600 text-[10px] tabular-nums">
                  {idx + 1}
                </span>
                <span className="table-cell text-slate-200 whitespace-pre">{line}</span>
              </div>
            ))}
          </div>
        ) : (
          <pre className="whitespace-pre text-slate-200 text-xs">
            <code>{code.trim()}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
