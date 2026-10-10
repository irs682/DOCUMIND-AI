import React from 'react';
import { Plus, MessageSquare, Trash2, Search, Sparkles } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';

const ConversationList = ({
  conversations = [],
  activeId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}) => {
  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 p-4 space-y-4">
      {/* New chat button */}
      <Button
        variant="primary"
        leftIcon={Plus}
        onClick={onNewConversation}
        className="w-full justify-start rounded-xl"
      >
        New RAG Chat
      </Button>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {conversations.map((conv) => {
          const isActive = conv.id === activeId;
          return (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer text-xs font-semibold transition ${
                isActive
                  ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <MessageSquare
                  size={16}
                  className={isActive ? 'text-indigo-600 shrink-0' : 'text-slate-400 shrink-0'}
                />
                <span className="truncate">{conv.title || 'Untitled Session'}</span>
              </div>

              {onDeleteConversation && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition"
                  title="Delete chat"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConversationList;
