import React, { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { Sparkles, BookOpen } from 'lucide-react';

const ResearchForm = ({ onStartResearch, knowledgeBases = [] }) => {
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState('');
  const [selectedKb, setSelectedKb] = useState('all');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    onStartResearch({
      topic,
      questions,
      knowledgeBaseId: selectedKb,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
        <Sparkles size={18} className="text-indigo-600" />
        <span>Initiate Deep Research Study</span>
      </div>

      <Input
        label="Research Topic / Title"
        placeholder="e.g. Q2 Financial Growth Drivers & Regulatory Compliance Audit"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        required
      />

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
          Key Questions to Answer (Optional)
        </label>
        <textarea
          rows={3}
          value={questions}
          onChange={(e) => setQuestions(e.target.value)}
          placeholder="1. What was the net revenue growth?&#10;2. What compliance steps were implemented?"
          className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
          Target Knowledge Base Scope
        </label>
        <select
          value={selectedKb}
          onChange={(e) => setSelectedKb(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="all">All Knowledge Bases (Cross-Domain)</option>
          {knowledgeBases.map((kb) => {
            const kbId = kb.id || kb._id;
            return (
              <option key={kbId} value={kbId}>
                {kb.name}
              </option>
            );
          })}
        </select>
      </div>

      <div className="pt-2 flex justify-end">
        <Button type="submit" leftIcon={Sparkles}>
          Generate Research Report
        </Button>
      </div>
    </form>
  );
};

export default ResearchForm;
