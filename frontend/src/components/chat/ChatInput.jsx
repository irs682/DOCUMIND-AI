import React, { useState } from 'react';
import { Send, Paperclip, Globe, Sparkles, Database } from 'lucide-react';
import Button from '../common/Button';

const ChatInput = ({ onSendMessage, knowledgeBases = [], disabled = false }) => {
  const [text, setText] = useState('');
  const [selectedKb, setSelectedKb] = useState('all');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSendMessage({
      text,
      knowledgeBaseId: selectedKb,
      webSearch: webSearchEnabled,
    });
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-lg space-y-3">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          {/* KB selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700">
            <Database size={13} className="text-indigo-600" />
            <select
              value={selectedKb}
              onChange={(e) => setSelectedKb(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">All Knowledge Bases</option>
              {knowledgeBases.map((kb) => (
                <option key={kb.id} value={kb.id}>
                  {kb.name}
                </option>
              ))}
            </select>
          </div>

          {/* Web Search toggle */}
          <button
            type="button"
            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              webSearchEnabled
                ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Globe size={13} />
            <span>Web RAG Search</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
          Press Shift + Enter for new line
        </span>
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2">
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your uploaded documents or knowledge base..."
          disabled={disabled}
          className="w-full resize-none bg-transparent px-2 py-1 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
        />

        <Button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          size="md"
          leftIcon={Send}
          className="shrink-0 rounded-xl"
        >
          Send
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
