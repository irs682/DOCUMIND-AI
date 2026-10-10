import React from 'react';
import { Bot, Sparkles, Play, CheckCircle2, Cpu } from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';

const AgentCard = ({ agent, onRunAgent }) => {
  const {
    id,
    name = 'Research Agent',
    description = 'Autonomous agent that queries vector stores, synthesizes multi-document findings, and writes comprehensive reports.',
    icon: Icon = Bot,
    status = 'ready',
    capabilities = ['Vector Retrieval', 'Multi-doc Synthesis', 'Report Export'],
  } = agent || {};

  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-bold shadow-md group-hover:scale-105 transition-transform">
            <Icon size={24} />
          </div>

          <Badge variant={status === 'running' ? 'amber' : 'emerald'} icon={status === 'running' ? Cpu : CheckCircle2}>
            {status === 'running' ? 'Executing Task' : 'Agent Ready'}
          </Badge>
        </div>

        <div className="mt-4">
          <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {name}
          </h4>
          <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <div className="space-y-3 pt-3 border-t border-slate-100">
        <div className="flex flex-wrap gap-1.5">
          {capabilities.map((cap, idx) => (
            <Badge key={idx} variant="slate">
              {cap}
            </Badge>
          ))}
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={Play}
          onClick={() => onRunAgent(agent)}
          className="w-full justify-center rounded-xl"
        >
          Execute Agent Task
        </Button>
      </div>
    </div>
  );
};

export default AgentCard;
