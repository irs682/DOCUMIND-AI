import React, { useState } from 'react';
import { Award, Info, ChevronRight, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

/**
 * Animated Circular SVG Ring with 5 segmented arcs:
 * 1. Literature
 * 2. Methodology
 * 3. Experiments
 * 4. Integrity
 * 5. Reproducibility
 */
const ResearchReadinessRing = ({ score = 72, pillars = {}, onInspectAudit }) => {
  const [hoveredPillar, setHoveredPillar] = useState(null);

  const radius = 54;
  const strokeWidth = 8;
  const center = 70;
  const circumference = 2 * Math.PI * radius;

  // 5 Segments evenly distributed across the 360 circle (each arc ~18% of circumference with small gap)
  const segments = [
    {
      id: 'literature',
      name: 'Literature Coverage',
      score: pillars.literature ?? 82,
      color: '#3b82f6', // blue
      bgTrack: 'rgba(59, 130, 246, 0.2)',
      desc: 'Ingested paper profiles, citation provenance & related work matrix',
      offsetPct: 0,
    },
    {
      id: 'methodology',
      name: 'Methodology Precision',
      score: pillars.methodology ?? 94,
      color: '#8b5cf6', // purple
      bgTrack: 'rgba(139, 92, 246, 0.2)',
      desc: 'Formal architecture specifications, algorithms & ablation plans',
      offsetPct: 0.2,
    },
    {
      id: 'experiments',
      name: 'Empirical Experiments',
      score: pillars.experiments ?? 25,
      color: '#10b981', // emerald
      bgTrack: 'rgba(16, 185, 129, 0.2)',
      desc: 'Verified benchmark test runs & quantitative metric logs',
      offsetPct: 0.4,
    },
    {
      id: 'integrity',
      name: 'Academic Integrity',
      score: pillars.integrity ?? 96,
      color: '#f59e0b', // amber
      bgTrack: 'rgba(245, 158, 11, 0.2)',
      desc: 'Grounded research gaps, hypothesis links & citation deduplication',
      offsetPct: 0.6,
    },
    {
      id: 'reproducibility',
      name: 'Reproducibility',
      score: pillars.reproducibility ?? 65,
      color: '#6366f1', // indigo
      bgTrack: 'rgba(99, 102, 241, 0.2)',
      desc: 'Artifact checklists, environment seeds & hyperparameter ledger',
      offsetPct: 0.8,
    },
  ];

  const arcLength = (circumference / 5) * 0.82; // 82% arc, 18% gap
  const gapLength = (circumference / 5) * 0.18;

  const activePillarData = hoveredPillar
    ? segments.find((s) => s.id === hoveredPillar)
    : null;

  return (
    <div className="flex flex-col items-center select-none">
      {/* SVG Multi-Segment Ring */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg
          viewBox="0 0 140 140"
          className="w-full h-full -rotate-90 transition-transform duration-500"
        >
          {/* Base Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-slate-100 dark:text-slate-800/80"
            strokeWidth={strokeWidth}
          />

          {/* 5 Distinct Segmented Arcs */}
          {segments.map((seg, idx) => {
            const rot = (idx * 360) / 5;
            const fillRatio = Math.max(0.1, seg.score / 100);
            const filledArc = arcLength * fillRatio;
            const emptyArc = arcLength * (1 - fillRatio);

            return (
              <g
                key={seg.id}
                transform={`rotate(${rot} ${center} ${center})`}
                onMouseEnter={() => setHoveredPillar(seg.id)}
                onMouseLeave={() => setHoveredPillar(null)}
                className="cursor-pointer transition-opacity"
              >
                {/* Segment Background Slot */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={seg.bgTrack}
                  strokeWidth={hoveredPillar === seg.id ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={`${arcLength} ${circumference - arcLength}`}
                  strokeLinecap="round"
                  className="transition-all duration-200"
                />

                {/* Segment Filled Value */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={hoveredPillar === seg.id ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={`${filledArc} ${circumference - filledArc}`}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </g>
            );
          })}
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span
            className={`text-3xl font-extrabold tracking-tight transition-colors duration-200 ${
              activePillarData
                ? 'text-indigo-600 dark:text-indigo-400'
                : score >= 90
                ? 'text-emerald-600 dark:text-emerald-400'
                : score >= 70
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-amber-500 dark:text-amber-400'
            }`}
          >
            {activePillarData ? `${activePillarData.score}%` : `${score}%`}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5">
            {activePillarData ? 'Pillar Score' : 'Readiness'}
          </span>
        </div>
      </div>

      {/* Explanatory Caption / Segment hover details */}
      <div className="mt-3 text-center min-h-[44px]">
        {activePillarData ? (
          <div className="animate-fade-in">
            <span
              className="inline-block text-xs font-bold"
              style={{ color: activePillarData.color }}
            >
              {activePillarData.name} ({activePillarData.score}%)
            </span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs leading-snug">
              {activePillarData.desc}
            </p>
          </div>
        ) : (
          <div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {score >= 90
                ? 'Publication Ready Draft'
                : score >= 70
                ? 'Strong Pre-Experimental Draft'
                : 'Structured Scientific Study'}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Hover segments to inspect 5 evidence dimensions
            </p>
          </div>
        )}
      </div>

      {/* Direct Quality Audit Button */}
      {onInspectAudit && (
        <button
          type="button"
          onClick={onInspectAudit}
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
        >
          <span>Open 19D Quality Audit</span>
          <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
};

export default ResearchReadinessRing;
