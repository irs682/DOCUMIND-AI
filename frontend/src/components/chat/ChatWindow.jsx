import React, { useRef, useEffect } from 'react';
import { Bot, Sparkles, Sliders } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

const samplePrompts = [
  "Summarize the main findings in 2026_Q2_Financial_Report.pdf",
  "What are the compliance requirements for AI safety?",
  "List the architecture specifications in the Engineering Knowledge Base",
];

const ChatWindow = ({
  messages = [],
  onSendMessage,
  knowledgeBases = [],
  selectedModel = 'gpt-4o',
  onSelectModel,
}) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">RAG AI Assistant</h3>
            <p className="text-[11px] text-slate-500">Context-grounded document responses</p>
          </div>
        </div>

        {/* Model Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">Model:</span>
          <select
            value={selectedModel}
            onChange={(e) => onSelectModel && onSelectModel(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="gpt-4o">OpenAI GPT-4o</option>
            <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
          </select>
        </div>
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 max-w-lg mx-auto py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-100 text-indigo-600 shadow-md">
              <Sparkles size={32} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Ask Anything About Your Documents</h3>
              <p className="mt-1 text-xs text-slate-500">
                RAG automatically retrieves passages from your vector store to cite exact sources.
              </p>
            </div>

            {/* Prompt Suggestion Pills */}
            <div className="w-full space-y-2 text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Suggested Questions:</p>
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage({ text: prompt, knowledgeBaseId: 'all' })}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 transition shadow-2xs"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <ChatInput onSendMessage={onSendMessage} knowledgeBases={knowledgeBases} />
      </div>
    </div>
  );
};

export default ChatWindow;
