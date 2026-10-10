import React, { useState } from 'react';
import {
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  Star,
  Pencil,
  FileText,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import MarkdownMessage from './MarkdownMessage';

/**
 * ChatMessageRow - Polished modern conversation message row.
 * User message: Right-aligned compact bubble.
 * Assistant message: Clean document-style typography without heavy card borders.
 */
const ChatMessageRow = ({
  message,
  onRegenerate,
  onBookmark,
  onEditAndResend,
  onOpenContextPanel,
}) => {
  const isUser = message.sender === 'user';
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (_) {}
  };

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    setIsEditing(false);
    if (onEditAndResend && editText.trim() !== message.text) {
      onEditAndResend(message.id, editText.trim());
    }
  };

  return (
    <div
      className={`group relative flex gap-3.5 my-4 px-2 sm:px-4 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      <div
        className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-white font-bold text-xs select-none shadow-xs mt-0.5 ${
          isUser ? 'bg-indigo-600' : 'bg-slate-900'
        }`}
        aria-hidden="true"
      >
        {isUser ? <User size={15} /> : <Bot size={16} />}
      </div>

      {/* Content Column */}
      <div
        className={`flex-1 min-w-0 max-w-[85%] sm:max-w-[78%] space-y-2 ${
          isUser ? 'items-end flex flex-col' : 'items-start'
        }`}
      >
        {/* User Message Bubble */}
        {isUser ? (
          <div className="rounded-2xl rounded-tr-sm bg-indigo-600 text-white px-4 py-2.5 text-sm leading-relaxed shadow-xs whitespace-pre-line break-words w-fit max-w-full">
            {isEditing ? (
              <div className="space-y-2 select-text">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl bg-indigo-700/80 p-2 text-sm text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/40 resize-none"
                />
                <div className="flex items-center justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-2 py-1 rounded text-indigo-100 hover:bg-indigo-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-3 py-1 rounded-lg bg-white text-indigo-600 font-bold hover:bg-indigo-50 shadow-xs cursor-pointer"
                  >
                    Save & Resend
                  </button>
                </div>
              </div>
            ) : (
              message.text
            )}
          </div>
        ) : (
          /* Assistant Document-Style Flow */
          <div className="text-slate-800 text-sm leading-relaxed select-text min-w-0 w-full">
            {message.loading && !message.text ? (
              <div className="flex items-center gap-2.5 text-slate-400 py-1.5 animate-pulse">
                <Sparkles size={16} className="animate-spin text-indigo-500 shrink-0" />
                <span className="text-xs font-medium">
                  {message.phase || 'Analyzing document context & formulating answer…'}
                </span>
              </div>
            ) : (
              <MarkdownMessage content={message.text || ''} isStreaming={message.streaming} />
            )}
          </div>
        )}

        {/* Source Citation Pill (Assistant Only) */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onOpenContextPanel}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200/80 bg-indigo-50/70 hover:bg-indigo-100/70 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 transition cursor-pointer shadow-2xs"
            >
              <Layers size={12} className="text-indigo-600" />
              <span>Grounded in {message.sources.length} document source{message.sources.length === 1 ? '' : 's'}</span>
              <span className="text-[10px] text-indigo-400 font-normal">→ view snippets</span>
            </button>
          </div>
        )}

        {/* Action Controls Bar */}
        <div className={`flex items-center gap-2.5 text-[11px] text-slate-400 select-none pt-0.5 ${isUser ? 'justify-end' : ''}`}>
          <span>{message.timestamp}</span>

          {message.status === 'cancelled' && (
            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-medium">
              Stopped
            </span>
          )}
          {message.status === 'interrupted' && (
            <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded font-medium">
              Interrupted
            </span>
          )}

          {/* User Edit Action */}
          {isUser && !message.loading && !isEditing && (
            <button
              type="button"
              onClick={() => {
                setEditText(message.text);
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition cursor-pointer"
              title="Edit message"
            >
              <Pencil size={11} />
              <span>Edit</span>
            </button>
          )}

          {/* Assistant Action Buttons */}
          {!isUser && !message.loading && message.text && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                title="Copy response"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {onBookmark && (
                <button
                  type="button"
                  onClick={() => onBookmark(message.id, !message.isBookmarked)}
                  className={`inline-flex items-center gap-1 transition cursor-pointer ${
                    message.isBookmarked
                      ? 'text-amber-500 font-semibold'
                      : 'text-slate-400 hover:text-amber-500'
                  }`}
                  title={message.isBookmarked ? 'Bookmarked' : 'Save response'}
                >
                  <Star size={12} fill={message.isBookmarked ? 'currentColor' : 'none'} />
                  <span>{message.isBookmarked ? 'Saved' : 'Save'}</span>
                </button>
              )}

              {onRegenerate && (
                <button
                  type="button"
                  onClick={() => onRegenerate(message.id)}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                  title="Regenerate this response"
                >
                  <RotateCcw size={12} />
                  <span>Regenerate</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ChatMessageRow);
