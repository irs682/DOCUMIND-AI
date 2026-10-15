import React, { useState, useMemo } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

/**
 * CodeBlock sub-component with copy button and language badge.
 */
const CodeBlock = ({ language, code, isStreaming }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const langLabel = (language || 'code').toLowerCase().trim();

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-800 bg-[#0d1117] text-slate-100 shadow-md">
      <div className="flex items-center justify-between border-b border-slate-800 bg-[#161b22] px-3.5 py-1.5 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5 font-mono font-medium lowercase">
          <Terminal size={12} className="text-indigo-400" />
          {langLabel}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-slate-400 transition hover:bg-slate-700 hover:text-white cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-xs font-mono leading-relaxed text-slate-200 selection:bg-indigo-500 selection:text-white">
        <code>{code}</code>
        {isStreaming && (
          <span className="inline-block w-1.5 h-3.5 ml-1 align-middle bg-indigo-400 animate-pulse" />
        )}
      </pre>
    </div>
  );
};

/**
 * Inline text formatter for bold, italics, inline code, and links.
 */
const formatInline = (text) => {
  if (!text) return null;

  // Split by inline code tokens first (`code`)
  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((part, pIdx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={pIdx}
          className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-indigo-700 dark:text-indigo-300 border border-slate-200/80 dark:border-slate-700"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Process bold (**text**) and italics (*text*)
    const boldParts = part.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return (
      <React.Fragment key={pIdx}>
        {boldParts.map((subPart, bIdx) => {
          if (subPart.startsWith('**') && subPart.endsWith('**') && subPart.length >= 4) {
            return (
              <strong key={bIdx} className="font-bold text-slate-900 dark:text-white">
                {subPart.slice(2, -2)}
              </strong>
            );
          }
          if (subPart.startsWith('*') && subPart.endsWith('*') && subPart.length >= 2) {
            return (
              <em key={bIdx} className="italic text-slate-800 dark:text-slate-200">
                {subPart.slice(1, -1)}
              </em>
            );
          }
          return subPart;
        })}
      </React.Fragment>
    );
  });
};

/**
 * Table parser and renderer.
 */
const TableBlock = ({ rows }) => {
  if (!rows || rows.length < 2) return null;

  const headerCells = rows[0].split('|').map((c) => c.trim()).filter(Boolean);
  const dataRows = rows.slice(2).map((r) =>
    r.split('|').map((c) => c.trim()).filter(Boolean)
  );

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
      <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse">
        <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-900 dark:text-white font-semibold border-b border-slate-200 dark:border-slate-800">
          <tr>
            {headerCells.map((cell, idx) => (
              <th key={idx} className="px-3 py-2 border-r last:border-r-0 border-slate-200 dark:border-slate-800 font-bold">
                {formatInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/60">
          {dataRows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3 py-2 border-r last:border-r-0 border-slate-100 dark:border-slate-800">
                  {formatInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Main MarkdownMessage component.
 * Parses stream-safe Markdown blocks without collapsing during active generation.
 */
const MarkdownMessage = ({ content = '', isStreaming = false }) => {
  const blocks = useMemo(() => {
    if (!content) return [];

    // Clean any rogue SVG tags and internal reasoning/thought artifacts
    let cleanContent = content
      .replace(/^svg\s*/i, '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, '')
      .replace(/<think[\s\S]*?<\/think>/gi, '')
      .replace(/<thought[\s\S]*?<\/thought>/gi, '')
      .replace(/<scratchpad[\s\S]*?<\/scratchpad>/gi, '')
      .replace(/Thinking Process:[\s\S]*?(?=(?:Figure\s*\d+|Based on Figure|In Figure|The authentication sequence|The interaction sequence|Participants:|\n\n[A-Z0-9][a-z0-9\s]+:|$))/i, '')
      .replace(/^Thinking Process:[\s\S]*?(?=\n\n\d+\.|\n\nFigure|\n\nBased|\n\nThe)/i, '')
      .replace(/^Analyze the Request:[\s\S]*?\n\n/gim, '')
      .replace(/Analyze the Request:[\s\S]*?(?=\n\n|\n[A-Z]|$)/gim, '')
      .replace(/^Let me (?:check|examine|review|read|look|write)[\s\S]*?\n\n/gim, '');

    // If currently streaming and between unclosed think tags, hide the in-flight reasoning
    if (isStreaming) {
      cleanContent = cleanContent.replace(/<think[\s\S]*$/gi, '');
    }

    const parsedBlocks = [];
    const lines = cleanContent.split('\n');

    let inCode = false;
    let codeLanguage = '';
    let codeLines = [];

    let inTable = false;
    let tableLines = [];

    let inList = false;
    let listType = null; // 'ol' | 'ul'
    let listItems = [];

    const flushList = () => {
      if (inList && listItems.length > 0) {
        parsedBlocks.push({
          type: listType === 'ol' ? 'ordered-list' : 'unordered-list',
          items: [...listItems],
        });
        listItems = [];
        inList = false;
        listType = null;
      }
    };

    const flushTable = () => {
      if (inTable && tableLines.length >= 2) {
        parsedBlocks.push({
          type: 'table',
          rows: [...tableLines],
        });
      } else if (tableLines.length > 0) {
        // Fallback plain paragraph if incomplete table
        parsedBlocks.push({
          type: 'paragraph',
          text: tableLines.join('\n'),
        });
      }
      tableLines = [];
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check fenced code block start or end
      if (trimmed.startsWith('```')) {
        flushList();
        flushTable();

        if (inCode) {
          // Closed code block
          parsedBlocks.push({
            type: 'code',
            language: codeLanguage,
            code: codeLines.join('\n'),
            closed: true,
          });
          inCode = false;
          codeLanguage = '';
          codeLines = [];
        } else {
          // Open code block
          inCode = true;
          codeLanguage = trimmed.slice(3).trim();
          codeLines = [];
        }
        continue;
      }

      if (inCode) {
        codeLines.push(line);
        continue;
      }

      // Check table row (`| ... |`)
      if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
        flushList();
        inTable = true;
        tableLines.push(trimmed);
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Check ordered list item (e.g. `1. `, `2. `)
      const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (olMatch) {
        flushTable();
        if (!inList || listType !== 'ol') {
          flushList();
          inList = true;
          listType = 'ol';
        }
        listItems.push(olMatch[3]);
        continue;
      }

      // Check unordered list item (`- `, `* `)
      const ulMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
      if (ulMatch) {
        flushTable();
        if (!inList || listType !== 'ul') {
          flushList();
          inList = true;
          listType = 'ul';
        }
        listItems.push(ulMatch[2]);
        continue;
      }

      // If we were in a list and hit normal line, flush list
      if (inList) {
        flushList();
      }

      // Headings
      if (trimmed.startsWith('### ')) {
        parsedBlocks.push({ type: 'h3', text: trimmed.slice(4) });
      } else if (trimmed.startsWith('## ')) {
        parsedBlocks.push({ type: 'h2', text: trimmed.slice(3) });
      } else if (trimmed.startsWith('# ')) {
        parsedBlocks.push({ type: 'h1', text: trimmed.slice(2) });
      } else if (trimmed.length > 0) {
        parsedBlocks.push({ type: 'paragraph', text: line });
      } else {
        parsedBlocks.push({ type: 'spacer' });
      }
    }

    // Flush any pending trailing structures (crucial for streaming)
    if (inCode) {
      parsedBlocks.push({
        type: 'code',
        language: codeLanguage,
        code: codeLines.join('\n'),
        closed: false,
      });
    }
    flushTable();
    flushList();

    return parsedBlocks;
  }, [content]);

  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200 break-words">
      {blocks.map((block, idx) => {
        const isLastBlock = idx === blocks.length - 1;

        if (block.type === 'code') {
          return (
            <CodeBlock
              key={idx}
              language={block.language}
              code={block.code}
              isStreaming={isStreaming && isLastBlock && !block.closed}
            />
          );
        }

        if (block.type === 'table') {
          return <TableBlock key={idx} rows={block.rows} />;
        }

        if (block.type === 'ordered-list') {
          return (
            <ol key={idx} className="my-2 ml-5 list-decimal space-y-1 text-slate-800 dark:text-slate-200">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="pl-1">
                  {formatInline(item)}
                  {isStreaming && isLastBlock && itemIdx === block.items.length - 1 && (
                    <span className="inline-block w-1.5 h-3.5 ml-1 align-middle bg-indigo-600 animate-pulse rounded-xs" />
                  )}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === 'unordered-list') {
          return (
            <ul key={idx} className="my-2 ml-5 list-disc space-y-1 text-slate-800 dark:text-slate-200">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="pl-1">
                  {formatInline(item)}
                  {isStreaming && isLastBlock && itemIdx === block.items.length - 1 && (
                    <span className="inline-block w-1.5 h-3.5 ml-1 align-middle bg-indigo-600 animate-pulse rounded-xs" />
                  )}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'h1') {
          return (
            <h1 key={idx} className="text-base font-bold text-slate-900 dark:text-white mt-3 mb-1">
              {formatInline(block.text)}
            </h1>
          );
        }

        if (block.type === 'h2') {
          return (
            <h2 key={idx} className="text-sm font-bold text-slate-900 dark:text-white mt-2.5 mb-1">
              {formatInline(block.text)}
            </h2>
          );
        }

        if (block.type === 'h3') {
          return (
            <h3 key={idx} className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-2 mb-0.5">
              {formatInline(block.text)}
            </h3>
          );
        }

        if (block.type === 'spacer') {
          return <div key={idx} className="h-1.5" />;
        }

        return (
          <p key={idx} className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            {formatInline(block.text)}
            {isStreaming && isLastBlock && (
              <span className="inline-block w-1.5 h-3.5 ml-1 align-middle bg-indigo-600 animate-pulse rounded-xs" />
            )}
          </p>
        );
      })}
    </div>
  );
};

export default React.memo(MarkdownMessage);
