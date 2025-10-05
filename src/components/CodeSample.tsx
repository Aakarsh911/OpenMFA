"use client";
import { useEffect, useRef, useState } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';

// Ensure JS is registered for consistent highlighting
// (add more languages as needed)
// @ts-ignore - runtime registration
hljs.registerLanguage('javascript', javascript);

export function CodeSample({ code, language = 'javascript', title }: { code: string; language?: string; title?: string }) {
  const ref = useRef<HTMLElement | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (ref.current) hljs.highlightElement(ref.current);
  }, [code, language]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur">
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="text-sm text-slate-300">{title || 'Quickstart snippet'}</div>
        <button onClick={onCopy} className="text-xs px-2 py-1 rounded-md border border-white/20 hover:bg-white/10 text-slate-200">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto p-4 text-sm"><code ref={ref as any} className={`language-${language}`}>{code}</code></pre>
    </div>
  );
}
