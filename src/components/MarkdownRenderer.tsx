import React, { useState } from 'react';
import { Copy, Check, Terminal, Play } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  onExecuteCode?: (code: string, language: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onExecuteCode }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Parse markdown blocks (Headers, tables, code blocks, lists, bold, inline code)
  const renderFormattedText = (raw: string) => {
    const lines = raw.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeContent: string[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let blockIndex = 0;

    const flushTable = () => {
      if (tableRows.length > 0) {
        const header = tableRows[0];
        const body = tableRows.slice(1).filter((r) => !r.every((c) => c.match(/^:?-+:?$/)));
        elements.push(
          <div key={`table-${blockIndex++}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/90 text-cyan-900 font-bold uppercase tracking-wider">
                  {header.map((col, cIdx) => (
                    <th key={cIdx} className="px-3.5 py-2.5 font-bold text-slate-900">
                      {col.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {body.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-cyan-50/50 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3.5 py-2 text-slate-800 font-mono text-[11px] whitespace-nowrap">
                        {cell.trim()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
      }
    };

    const flushCodeBlock = () => {
      if (codeContent.length > 0) {
        const fullCode = codeContent.join('\n');
        const currentIndex = blockIndex++;
        elements.push(
          <div key={`code-${currentIndex}`} className="my-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-md">
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800/80 text-xs text-slate-400">
              <div className="flex items-center gap-2 font-mono text-[11px] text-cyan-400">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>{codeLanguage || 'code'}</span>
              </div>
              <div className="flex items-center gap-2">
                {onExecuteCode && (codeLanguage.toLowerCase().includes('sql') || codeLanguage.toLowerCase().includes('python')) && (
                  <button
                    onClick={() => onExecuteCode(fullCode, codeLanguage)}
                    className="flex items-center gap-1 text-[11px] bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded transition"
                  >
                    <Play className="w-3 h-3" /> Run
                  </button>
                )}
                <button
                  onClick={() => copyToClipboard(fullCode, currentIndex)}
                  className="flex items-center gap-1 text-[11px] hover:text-slate-200 transition text-slate-400"
                >
                  {copiedIndex === currentIndex ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <pre className="p-3.5 text-xs font-mono text-cyan-100/90 overflow-x-auto leading-relaxed selection:bg-cyan-500/30">
              <code>{fullCode}</code>
            </pre>
          </div>
        );
        codeContent = [];
        codeLanguage = '';
        inCodeBlock = false;
      }
    };

    lines.forEach((line) => {
      // Code block start/end
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
        } else {
          flushTable();
          inCodeBlock = true;
          codeLanguage = line.trim().slice(3).trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return;
      }

      // Markdown Table
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        inTable = true;
        const cells = line
          .trim()
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        tableRows.push(cells);
        return;
      } else if (inTable) {
        flushTable();
      }

      // Headers
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${blockIndex++}`} className="text-base font-bold text-cyan-800 mt-3.5 mb-1.5 flex items-center gap-2">
            <span className="inline-block w-1.5 h-4 bg-cyan-600 rounded-sm"></span>
            {line.slice(4)}
          </h3>
        );
        return;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${blockIndex++}`} className="text-lg font-bold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-200">
            {line.slice(3)}
          </h2>
        );
        return;
      }
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${blockIndex++}`} className="text-xl font-extrabold text-slate-900 mt-5 mb-2.5">
            {line.slice(2)}
          </h1>
        );
        return;
      }

      // Bullet points
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const itemText = line.trim().slice(2);
        elements.push(
          <li key={`li-${blockIndex++}`} className="ml-4 list-disc text-slate-800 my-1 text-sm leading-relaxed">
            {parseInlineFormatting(itemText)}
          </li>
        );
        return;
      }

      // Numbered list
      const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        elements.push(
          <div key={`num-${blockIndex++}`} className="flex items-start gap-2 text-slate-800 my-1 text-sm leading-relaxed">
            <span className="font-bold text-cyan-700 shrink-0">{numMatch[1]}.</span>
            <span>{parseInlineFormatting(numMatch[2])}</span>
          </div>
        );
        return;
      }

      // Blockquote
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote
            key={`quote-${blockIndex++}`}
            className="border-l-3 border-cyan-600 bg-cyan-50/80 px-3.5 py-2 my-2 rounded-r-xl text-xs text-cyan-950 font-medium italic"
          >
            {parseInlineFormatting(line.slice(2))}
          </blockquote>
        );
        return;
      }

      // Empty line
      if (line.trim() === '') {
        return;
      }

      // Normal paragraph
      elements.push(
        <p key={`p-${blockIndex++}`} className="text-slate-800 text-sm my-1.5 leading-relaxed font-normal">
          {parseInlineFormatting(line)}
        </p>
      );
    });

    if (inCodeBlock) flushCodeBlock();
    if (inTable) flushTable();

    return elements;
  };

  // Inline formatting for **bold**, `code`, and *italic*
  const parseInlineFormatting = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Bold **text**
      const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
      // Inline code `code`
      const codeMatch = remaining.match(/`([^`]+)`/);

      let earliestMatchIndex = remaining.length;
      let matchType: 'bold' | 'code' | null = null;
      let matchedText = '';
      let innerText = '';

      if (boldMatch && boldMatch.index !== undefined && boldMatch.index < earliestMatchIndex) {
        earliestMatchIndex = boldMatch.index;
        matchType = 'bold';
        matchedText = boldMatch[0];
        innerText = boldMatch[1];
      }

      if (codeMatch && codeMatch.index !== undefined && codeMatch.index < earliestMatchIndex) {
        earliestMatchIndex = codeMatch.index;
        matchType = 'code';
        matchedText = codeMatch[0];
        innerText = codeMatch[1];
      }

      if (matchType) {
        if (earliestMatchIndex > 0) {
          parts.push(remaining.substring(0, earliestMatchIndex));
        }

        if (matchType === 'bold') {
          parts.push(
            <strong key={`b-${keyIdx++}`} className="font-bold text-slate-950">
              {innerText}
            </strong>
          );
        } else if (matchType === 'code') {
          parts.push(
            <code
              key={`c-${keyIdx++}`}
              className="px-1.5 py-0.5 rounded-md bg-cyan-50 text-cyan-900 font-mono text-[11px] font-semibold border border-cyan-200"
            >
              {innerText}
            </code>
          );
        }

        remaining = remaining.substring(earliestMatchIndex + matchedText.length);
      } else {
        parts.push(remaining);
        break;
      }
    }

    return parts;
  };

  return <div className="space-y-1">{renderFormattedText(content)}</div>;
};
