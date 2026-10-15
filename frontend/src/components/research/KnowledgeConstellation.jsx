import React, { useState, useMemo } from 'react';
import {
  FileText,
  Layers,
  HelpCircle,
  Cpu,
  BarChart2,
  ExternalLink,
  X,
  Maximize2,
  Sparkles,
  Search,
} from 'lucide-react';

const DEFAULT_NODES = [
  {
    id: 'paper-1',
    label: 'OpenVLA (2024)',
    category: 'paper',
    tier: 0,
    x: 70,
    y: 80,
    summary: 'Foundational 7B Vision-Language-Action robot manipulation policy.',
    evidence: 'OpenVLA demonstrates strong generalist capabilities but suffers from policy drift in multi-stage horizons without persistent state memory.',
    link: '/documents',
  },
  {
    id: 'paper-2',
    label: 'RT-2 Transformer',
    category: 'paper',
    tier: 0,
    x: 70,
    y: 190,
    summary: 'Vision-Language-Action models transfer web knowledge to robotic control.',
    evidence: 'Tokenizes actions into text tokens; lacks closed-loop uncertainty estimation when encountering out-of-distribution visual states.',
    link: '/documents',
  },
  {
    id: 'gap-1',
    label: 'Gap 1: Policy Drift',
    category: 'gap',
    tier: 1,
    x: 240,
    y: 100,
    summary: 'Long-horizon degradation in autoregressive embodied control.',
    evidence: 'Grounded across 3 benchmark papers: cumulative errors in sub-goal transitions cause episodic failure without memory retrieval.',
    link: '/research',
  },
  {
    id: 'gap-2',
    label: 'Gap 2: Uncertainty',
    category: 'gap',
    tier: 1,
    x: 240,
    y: 210,
    summary: 'Absence of verifiable confidence intervals in action trajectory decoding.',
    evidence: 'Robotic manipulation benchmarks show catastrophic failures when token probabilities remain uncalibrated.',
    link: '/research',
  },
  {
    id: 'rq-1',
    label: 'RQ1: Memory Retrieval',
    category: 'rq',
    tier: 2,
    x: 410,
    y: 90,
    summary: 'Does episodic memory augmentation reduce manipulation failure rates?',
    evidence: 'Hypothesis H1 states retrieval over past successful trajectories reduces trajectory divergence by >=18%.',
    link: '/research',
  },
  {
    id: 'method-1',
    label: 'MERA-VLA Policy',
    category: 'method',
    tier: 2,
    x: 410,
    y: 190,
    summary: 'Retrieval-Augmented Multimodal Embodied Architecture.',
    evidence: 'Integrates cross-attention over dense vector embeddings of past task demonstrations directly into action decoder layers.',
    link: '/research',
  },
  {
    id: 'bench-1',
    label: 'CALVIN Benchmark',
    category: 'benchmark',
    tier: 3,
    x: 580,
    y: 100,
    summary: 'Challenging 5-task sequential manipulation in simulated kitchen.',
    evidence: 'Standard evaluation testbed evaluating 1,000 continuous action rollouts across 4 environment splits.',
    link: '/research',
  },
  {
    id: 'res-1',
    label: 'Run: 86.4% Success',
    category: 'result',
    tier: 3,
    x: 580,
    y: 210,
    summary: 'Verified empirical result demonstrating +14.2% gain over base OpenVLA.',
    evidence: 'Statistically verified across 5 random seeds (p < 0.01) with reproducibility hyperparameters logged in Step 9.',
    link: '/research',
  },
];

const DEFAULT_LINKS = [
  { from: 'paper-1', to: 'gap-1' },
  { from: 'paper-2', to: 'gap-1' },
  { from: 'paper-2', to: 'gap-2' },
  { from: 'gap-1', to: 'rq-1' },
  { from: 'gap-1', to: 'method-1' },
  { from: 'gap-2', to: 'method-1' },
  { from: 'rq-1', to: 'bench-1' },
  { from: 'method-1', to: 'bench-1' },
  { from: 'method-1', to: 'res-1' },
  { from: 'bench-1', to: 'res-1' },
];

const categoryConfig = {
  paper: {
    label: 'Paper Source',
    color: '#3b82f6',
    border: 'border-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/60',
    icon: FileText,
  },
  gap: {
    label: 'Research Gap',
    color: '#f59e0b',
    border: 'border-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    icon: Layers,
  },
  rq: {
    label: 'Research Question',
    color: '#8b5cf6',
    border: 'border-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950/60',
    icon: HelpCircle,
  },
  method: {
    label: 'Methodology',
    color: '#6366f1',
    border: 'border-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-950/60',
    icon: Cpu,
  },
  benchmark: {
    label: 'Benchmark',
    color: '#10b981',
    border: 'border-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    icon: BarChart2,
  },
  result: {
    label: 'Empirical Result',
    color: '#06b6d4',
    border: 'border-cyan-500',
    bg: 'bg-cyan-50 dark:bg-cyan-950/60',
    icon: Sparkles,
  },
};

const KnowledgeConstellation = ({ project, onOpenEvidence }) => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');

  const safeString = (val, fallback = '') => {
    if (!val) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      return val.title || val.name || val.text || val.raw || fallback;
    }
    return String(val);
  };

  const nodes = useMemo(() => {
    // If project has real research gaps & profiles, adapt the labels
    if (!project) return DEFAULT_NODES;

    const customNodes = DEFAULT_NODES.map((n) => ({ ...n }));
    if (project.title) {
      const methodNode = customNodes.find((n) => n.id === 'method-1');
      if (methodNode) {
        const titleStr = safeString(project.title, methodNode.label);
        methodNode.label = titleStr.slice(0, 20);
      }
    }
    if (project.researchGaps?.[0]?.title) {
      const gapNode = customNodes.find((n) => n.id === 'gap-1');
      if (gapNode) {
        const gapTitle = safeString(project.researchGaps[0].title, gapNode.label);
        gapNode.label = gapTitle.slice(0, 20);
        gapNode.summary = safeString(project.researchGaps[0].category, 'Literature Gap');
        gapNode.evidence = safeString(project.researchGaps[0].description, gapNode.evidence);
      }
    }
    if (project.paperProfiles?.[0]?.title) {
      const pNode = customNodes.find((n) => n.id === 'paper-1');
      if (pNode) {
        const pTitle = safeString(project.paperProfiles[0].title, pNode.label);
        pNode.label = pTitle.slice(0, 20);
      }
    }
    return customNodes;
  }, [project]);

  const filteredNodes = useMemo(() => {
    if (filterCategory === 'all') return nodes;
    return nodes.filter((n) => n.category === filterCategory);
  }, [nodes, filterCategory]);

  return (
    <div className="relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Header & Category Filters */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              Research Knowledge Constellation
            </h3>
            <p className="text-[10px] text-slate-400">
              Interactive evidence graph: Papers → Gaps → Hypotheses → Experiments
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
          {['all', 'paper', 'gap', 'method', 'benchmark'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-2 py-0.5 rounded-lg font-semibold capitalize transition-colors ${
                filterCategory === cat
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Interactive Canvas */}
      <div className="relative flex-1 min-h-[290px] bg-slate-50/50 dark:bg-slate-950/60 overflow-hidden flex items-center justify-center p-2">
        <svg
          viewBox="0 0 660 280"
          className="w-full h-full max-h-[340px] select-none"
        >
          {/* Subtle connecting lines */}
          {DEFAULT_LINKS.map((link, idx) => {
            const source = nodes.find((n) => n.id === link.from);
            const target = nodes.find((n) => n.id === link.to);
            if (!source || !target) return null;

            const isHighlighted =
              hoveredNodeId === source.id || hoveredNodeId === target.id;

            return (
              <g key={idx}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={isHighlighted ? '#6366f1' : 'currentColor'}
                  strokeWidth={isHighlighted ? 2.5 : 1.2}
                  strokeDasharray={isHighlighted ? '4 2' : 'none'}
                  className={`${
                    isHighlighted
                      ? 'text-indigo-500 opacity-90'
                      : 'text-slate-300 dark:text-slate-700/80 opacity-60'
                  } transition-all duration-300`}
                />
              </g>
            );
          })}

          {/* Interactive Nodes */}
          {filteredNodes.map((node) => {
            const config = categoryConfig[node.category] || categoryConfig.paper;
            const isHovered = hoveredNodeId === node.id;
            const isSelected = selectedNode?.id === node.id;
            const Icon = config.icon;

            return (
              <g
                key={node.id}
                onClick={() => setSelectedNode(node)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                className="cursor-pointer group"
              >
                {/* Ambient pulse halo on hover/select */}
                {(isHovered || isSelected) && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={26}
                    fill={config.color}
                    opacity={0.25}
                  />
                )}

                {/* Outer Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={18}
                  fill="currentColor"
                  stroke={config.color}
                  strokeWidth={isHovered || isSelected ? 3 : 2}
                  className="text-white dark:text-slate-900 transition-all duration-200"
                />

                {/* Category Icon */}
                <foreignObject x={node.x - 8} y={node.y - 8} width={16} height={16}>
                  <div
                    className="flex items-center justify-center w-full h-full pointer-events-none"
                    style={{ color: config.color }}
                  >
                    <Icon size={12} className="stroke-[2.5]" />
                  </div>
                </foreignObject>

                {/* Node Pill Label */}
                <text
                  x={node.x}
                  y={node.y + 30}
                  textAnchor="middle"
                  className={`text-[10px] font-bold tracking-tight select-none pointer-events-none transition-colors ${
                    isHovered || isSelected
                      ? 'fill-indigo-600 dark:fill-indigo-400 font-extrabold'
                      : 'fill-slate-700 dark:fill-slate-200'
                  }`}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover / Selection Quick Inspector Card */}
        {selectedNode && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3.5 z-20 animate-scale-in space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: categoryConfig[selectedNode.category]?.color }}
                />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {selectedNode.label}
                </span>
                <span className="text-[9.5px] px-1.5 py-0.2 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                  {selectedNode.category}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
              {selectedNode.summary}
            </p>

            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-500 dark:text-slate-400 italic border border-slate-100 dark:border-slate-800">
              &quot;{selectedNode.evidence}&quot;
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 text-[10px]">Tier {selectedNode.tier + 1} evidence</span>
              <a
                href={selectedNode.link}
                className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <span>Inspect in Workflow</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info & Legend */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Papers
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Gaps
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500" /> Method
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-500" /> Results
          </span>
        </div>
        <span className="font-mono text-slate-500">Click node to inspect origin</span>
      </div>
    </div>
  );
};

export default KnowledgeConstellation;
