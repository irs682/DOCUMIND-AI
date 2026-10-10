import React, { useState, useEffect, useCallback } from 'react';
import { Bot, Sparkles, FileText, Search, ShieldCheck, Database, Play, Clock, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import AgentCard from '../../components/agents/AgentCard';
import AgentTask from '../../components/agents/AgentTask';
import AgentTimeline from '../../components/agents/AgentTimeline';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { agentApi } from '../../services/agentApi';
import api from '../../services/api';

const defaultAgents = [
  {
    id: 'agent-research',
    name: 'Autonomous Research Agent',
    description: 'Queries vector stores across multiple knowledge bases, plans research steps, synthesizes multi-document findings, and writes comprehensive reports.',
    icon: Bot,
    status: 'ready',
    capabilities: ['Vector RAG', 'Multi-Hop Reasoning', 'Report Generation'],
  },
  {
    id: 'agent-summarizer',
    name: 'Document Summarizer & Analyst',
    description: 'Generates executive summaries, extracts key numerical metrics, identifies risks, and structures action items from long documents.',
    icon: FileText,
    status: 'ready',
    capabilities: ['Executive Summaries', 'Metric Extraction', 'Risk Audit'],
  },
  {
    id: 'agent-auditor',
    name: 'Compliance & Safety Auditor',
    description: 'Audits uploaded policies and contracts against regulatory standards, flagging security risks and compliance discrepancies.',
    icon: ShieldCheck,
    status: 'ready',
    capabilities: ['Compliance Check', 'Policy Audit', 'Risk Scoring'],
  },
];

const fallbackSteps = [
  { title: 'Goal Deconstruction & Planning', detail: 'Decomposing task objective into structured semantic search queries.' },
  { title: 'Dense Vector Retrieval', detail: 'Retrieving top passages from Qdrant vector store with Cosine similarity filtering.' },
  { title: 'Cross-Document Synthesis', detail: 'Synthesizing vector chunk findings across indexed documents.' },
  { title: 'Report Generation & Formatting', detail: 'Generating structured output with verifiable source grounding.' },
];

const Agents = () => {
  const [agents] = useState(defaultAgents);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [activeExecution, setActiveExecution] = useState(null);
  const [executionStep, setExecutionStep] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pastTasks, setPastTasks] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [error, setError] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load user knowledge bases and previous agent tasks
  const loadInitialData = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const [kbRes, tasksRes] = await Promise.allSettled([
        api.get('/knowledge-bases'),
        agentApi.getTasks(),
      ]);

      if (kbRes.status === 'fulfilled' && kbRes.value.data?.knowledgeBases) {
        setKnowledgeBases(
          kbRes.value.data.knowledgeBases.map((kb) => ({
            id: kb._id || kb.id,
            name: kb.name,
          }))
        );
      }

      if (tasksRes.status === 'fulfilled' && tasksRes.value.data?.tasks) {
        setPastTasks(tasksRes.value.data.tasks);
      }
    } catch (err) {
      console.warn('Could not load agent task history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleRunAgent = (agent) => {
    setSelectedAgent(agent);
  };

  const handleStartTask = async (taskData) => {
    setSelectedAgent(null);
    setError('');

    const executionPlan = {
      prompt: taskData.prompt,
      agentId: taskData.agentId,
      depth: taskData.depth,
      startedAt: new Date().toLocaleTimeString(),
      steps: fallbackSteps,
      outputSummary: '',
    };

    setActiveExecution(executionPlan);
    setIsExecuting(true);
    setExecutionStep(0);

    // Live step progression indicator
    const stepInterval = setInterval(() => {
      setExecutionStep((prev) => (prev < fallbackSteps.length - 2 ? prev + 1 : prev));
    }, 900);

    try {
      const response = await agentApi.executeTask({
        agentId: taskData.agentId,
        prompt: taskData.prompt,
        knowledgeBaseId: taskData.knowledgeBaseId || 'all',
        depth: taskData.depth,
      });

      clearInterval(stepInterval);
      setExecutionStep(fallbackSteps.length - 1);

      const serverTask = response.data?.task;
      if (serverTask) {
        setActiveExecution({
          ...executionPlan,
          steps: serverTask.stepLogs && serverTask.stepLogs.length > 0 ? serverTask.stepLogs : fallbackSteps,
          outputSummary: serverTask.outputSummary,
        });
        setPastTasks((prev) => [serverTask, ...prev]);
      }
    } catch (err) {
      clearInterval(stepInterval);
      console.error('Agent execution failed:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Agent task execution encountered an error.'
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSelectPastTask = (task) => {
    setActiveExecution({
      prompt: task.prompt,
      agentId: task.agentType || task.agentId,
      depth: task.depth || 'deep',
      startedAt: task.createdAt ? new Date(task.createdAt).toLocaleTimeString() : 'Past execution',
      steps: task.stepLogs && task.stepLogs.length > 0 ? task.stepLogs : fallbackSteps,
      outputSummary: task.outputSummary,
    });
    setExecutionStep(fallbackSteps.length);
    setIsExecuting(false);
    setError('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
          <Bot size={16} />
          <span>Agentic AI Hub (Phase 7)</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          Autonomous AI Agents
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Deploy specialized AI agents with autonomous tool execution for multi-step research, document audits, and data extraction.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}

      {/* Agents Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onRunAgent={handleRunAgent}
          />
        ))}
      </div>

      {/* Active Execution Monitor */}
      {activeExecution && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-indigo-100 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                {isExecuting ? 'Active Agent Execution' : 'Agent Execution Result'}
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                "{activeExecution.prompt}"
              </h3>
            </div>
            <span className="text-xs text-slate-500">Started at {activeExecution.startedAt}</span>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <AgentTimeline
                steps={activeExecution.steps || fallbackSteps}
                currentStepIndex={executionStep}
                isComplete={!isExecuting}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Execution Output Summary
              </h4>

              {isExecuting ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500 italic animate-pulse">
                  Agent is synthesizing vector context and executing tools...
                </div>
              ) : activeExecution.outputSummary ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-sans space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <CheckCircle2 size={16} />
                    <span>Workflow Completed Successfully</span>
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed text-slate-700">
                    {activeExecution.outputSummary}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                  Task finished. No additional summary was returned.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task History Panel */}
      {pastTasks.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Clock size={14} className="text-indigo-600" />
              <span>Agent Execution History</span>
            </div>
            <span className="text-xs text-slate-400">{pastTasks.length} tasks executed</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pastTasks.map((t) => (
              <button
                key={t._id || t.id}
                type="button"
                onClick={() => handleSelectPastTask(t)}
                className="flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-left hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
              >
                <div className="space-y-1 overflow-hidden pr-2">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {t.prompt}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {t.agentType || 'Research Agent'} • {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'Recent'}
                  </p>
                </div>
                <ChevronRight size={14} className="text-slate-400 shrink-0 mt-1" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Task Modal */}
      <Modal
        isOpen={!!selectedAgent}
        onClose={() => setSelectedAgent(null)}
        title={`Configure Task for ${selectedAgent?.name || 'Agent'}`}
        subtitle="Set task objective, target knowledge base scope, and depth."
        size="md"
      >
        {selectedAgent && (
          <AgentTask
            agent={selectedAgent}
            knowledgeBases={knowledgeBases}
            onStartTask={handleStartTask}
            onCancel={() => setSelectedAgent(null)}
          />
        )}
      </Modal>
    </div>
  );
};

export default Agents;
