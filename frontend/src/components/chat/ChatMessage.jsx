import React, { useState } from 'react';
import { Bot, User, Copy, Check, ThumbsUp, ThumbsDown, BookOpen } from 'lucide-react';
import SourceCitation from './SourceCitation';

const ChatMessage = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'like' | 'dislike' | null

  const isUser = message.sender === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-6 group`}>
      {/* Avatar */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs shadow-xs select-none ${
          isUser
            ? 'bg-slate-900 text-white'
            : 'bg-indigo-600 text-white'
        }`}
        aria-hidden="true"
      >
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>

      {/* Bubble container */}
      <div className={`max-w-2xl space-y-3 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Message Card */}
        <div
          className={`rounded-2xl p-4 shadow-xs text-sm leading-relaxed ${
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-xs'
              : 'bg-white border border-slate-200 text-slate-900 rounded-tl-xs'
          }`}
        >
          <div className="whitespace-pre-wrap">
            {(message.text || '')
              .replace(/^svg\s*/i, '')
              .replace(/<svg[\s\S]*?<\/svg>/gi, '')
              .trim()}
          </div>
        </div>

        {/* Source Citations for RAG Assistant messages */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <BookOpen size={14} className="text-indigo-600" />
              <span>Retrieved Document Sources ({message.citations.length})</span>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {message.citations.map((citation, idx) => (
                <SourceCitation key={idx} citation={citation} />
              ))}
            </div>
          </div>
        )}

        {/* Message Toolbar */}
        {!isUser && (
          <div className="flex items-center gap-2 text-xs text-slate-400 opacity-80 group-hover:opacity-100 transition select-none">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 hover:text-slate-700 p-1 rounded transition select-none cursor-pointer"
            >
              <span aria-hidden="true">{copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}</span>
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <span>•</span>
            <button
              onClick={() => setFeedback(feedback === 'like' ? null : 'like')}
              className={`p-1 rounded hover:text-indigo-600 select-none cursor-pointer ${
                feedback === 'like' ? 'text-indigo-600 font-bold' : ''
              }`}
              aria-label="Like response"
            >
              <span aria-hidden="true"><ThumbsUp size={14} /></span>
            </button>
            <button
              onClick={() => setFeedback(feedback === 'dislike' ? null : 'dislike')}
              className={`p-1 rounded hover:text-rose-600 select-none cursor-pointer ${
                feedback === 'dislike' ? 'text-rose-600 font-bold' : ''
              }`}
              aria-label="Dislike response"
            >
              <span aria-hidden="true"><ThumbsDown size={14} /></span>
            </button>
            <span className="ml-auto text-[11px] text-slate-400 select-none">{message.timestamp || 'Just now'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
