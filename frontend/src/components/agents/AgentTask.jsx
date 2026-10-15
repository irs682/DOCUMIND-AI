import React, { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { Play, Bot, Database } from 'lucide-react';

const AgentTask = ({ agent, knowledgeBases = [], onStartTask, onCancel }) => {
  const [taskPrompt, setTaskPrompt] = useState('');
  const [selectedKb, setSelectedKb] = useState(knowledgeBases[0]?.id || 'all');
  const [reasoningDepth, setReasoningDepth] = useState('deep');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!taskPrompt.trim()) return;
    onStartTask({
      agentId: agent.id,
      prompt: taskPrompt,
      knowledgeBaseId: selectedKb,
      depth: reasoningDepth,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-xs">
        <Bot size={22} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
        <div>
          <span className="font-bold text-slate-900 dark:text-white">{agent?.name || 'AI Agent'}</span>
          <p className="text-slate-500 dark:text-slate-400">{agent?.description}</p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
          Agent Task Objective / Prompt
        </label>
        <textarea
          rows={3}
          value={taskPrompt}
          onChange={(e) => setTaskPrompt(e.target.value)}
          placeholder="e.g. Conduct a comprehensive comparative analysis of Q2 financial results vs AI safety compliance policies across all documents."
          required
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 p-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Knowledge Base Target
          </label>
          <select
            value={selectedKb}
            onChange={(e) => setSelectedKb(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/50"
          >
            <option value="all">All Knowledge Bases</option>
            {knowledgeBases.map((kb) => (
              <option key={kb.id} value={kb.id}>
                {kb.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Reasoning Depth
          </label>
          <select
            value={reasoningDepth}
            onChange={(e) => setReasoningDepth(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/50"
          >
            <option value="quick">Quick Scan (Fast)</option>
            <option value="deep">Deep Multi-Hop RAG (Thorough)</option>
            <option value="exhaustive">Exhaustive Audit (Comprehensive)</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" leftIcon={Play}>
          Launch Agent Workflow
        </Button>
      </div>
    </form>
  );
};

export default AgentTask;
