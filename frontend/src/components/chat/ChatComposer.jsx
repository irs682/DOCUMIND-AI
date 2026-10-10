import React, { useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Paperclip,
  FileText,
  X,
  Plus,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

/**
 * ChatComposer - Elevated input container with auto-grow textarea,
 * document chips, attachment selector trigger, and Send/Stop controls.
 */
const ChatComposer = ({
  inputText = '',
  onChangeInput,
  onSend,
  onStop,
  isLoading = false,
  isStreaming = false,
  sessionDocs = [],
  onRemoveSessionDoc,
  onOpenDocPicker,
  onOpenUpload,
}) => {
  const textareaRef = useRef(null);

  // Auto-grow textarea up to 180px
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, 180);
    el.style.height = `${Math.max(newHeight, 44)}px`;
  }, [inputText]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputText.trim() && !isLoading) {
        onSend();
      }
    }
  };

  const placeholderText =
    sessionDocs.length > 0
      ? `Ask about the ${sessionDocs.length} attached document${sessionDocs.length === 1 ? '' : 's'}…`
      : 'Ask anything about your documents…';

  return (
    <div className="p-3 sm:p-4 bg-white/95 border-t border-slate-200/90 backdrop-blur-xs select-none">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Selected Document Chips Header */}
        {sessionDocs.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1 max-h-20 select-none">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
              Active Context:
            </span>
            {sessionDocs.map((doc) => (
              <span
                key={doc._id || doc.id}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200/70 px-2.5 py-1 text-xs font-semibold text-indigo-700 shadow-2xs group"
              >
                <FileText size={12} className="text-indigo-500 shrink-0" />
                <span className="truncate max-w-[140px] sm:max-w-[200px]" title={doc.name || doc.originalName}>
                  {doc.name || doc.originalName}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveSessionDoc(doc._id || doc.id)}
                  className="rounded hover:bg-indigo-200/70 p-0.5 text-indigo-400 hover:text-indigo-800 transition cursor-pointer"
                  title="Remove document from this session"
                >
                  <X size={11} />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={onOpenDocPicker}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 px-2 py-0.5 rounded-lg hover:bg-indigo-50 transition cursor-pointer"
            >
              <Plus size={12} /> Add more
            </button>
          </div>
        )}

        {/* Elevated Rounded Composer Box */}
        <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200 bg-slate-50/70 p-2 sm:p-2.5 shadow-sm focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-3 focus-within:ring-indigo-100 transition duration-150">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => onChangeInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading && !isStreaming}
            placeholder={placeholderText}
            className="w-full resize-none bg-transparent px-2.5 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none leading-relaxed disabled:opacity-50"
          />

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1 px-1">
            {/* Left Controls: Document Attachment */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenDocPicker}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/70 transition cursor-pointer"
                title="Attach documents to this conversation"
              >
                <Paperclip size={14} className="text-slate-400" />
                <span className="hidden sm:inline">Attach Files</span>
              </button>
            </div>

            {/* Right Controls: Send / Stop */}
            <div className="flex items-center gap-2">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-sm hover:bg-rose-700 transition cursor-pointer"
                  title="Stop generating"
                >
                  <Square size={12} fill="currentColor" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSend()}
                  disabled={!inputText.trim() || isLoading}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Send message (Enter)"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Subtext */}
        <div className="flex items-center justify-between px-2 text-[10px] text-slate-400">
          <span>Enter sends · Shift+Enter for new line</span>
          <span>Grounded with OpenRouter & Vector Search</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ChatComposer);
