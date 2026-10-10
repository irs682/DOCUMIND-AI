import React, { useState, useEffect } from 'react';
import {
  Sigma,
  Image as ImageIcon,
  BarChart3,
  Table as TableIcon,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Info,
  ChevronDown,
  ChevronUp,
  MoveUp,
  MoveDown,
  ExternalLink,
  Layers,
  Sparkles,
  Upload,
  Database,
  Calculator,
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

import {
  DIAGRAM_TYPES,
  getSvgForDiagramId,
} from '../../../utils/academicDiagrams';
import {
  calculateRunStatistics,
  autoSelectGraphType,
  buildBarChartSvg,
  buildCalibrationCurveSvg,
} from '../../../utils/academicGraphBuilder';

const FiguresEquationsManager = ({
  project,
  manuscriptObjects = [],
  onUpdateObjects,
  onUpdateProject,
}) => {
  const [activeFilter, setActiveFilter] = useState('all'); // all | equation | figure | graph | table
  const [copiedId, setCopiedId] = useState(null);

  // Modals
  const [modalType, setModalType] = useState(null); // 'equation' | 'diagram' | 'upload' | 'graph' | 'table' | 'inspect_data'
  const [inspectTarget, setInspectTarget] = useState(null);

  // Equation Form State
  const [eqLatex, setEqLatex] = useState('\\mathcal{L}_{total} = \\mathcal{L}_{BC} + \\lambda_1 \\mathcal{L}_{contrastive} + \\lambda_2 \\mathcal{L}_{calibration}');
  const [eqTitle, setEqTitle] = useState('Composite Multi-task Objective');
  const [eqProvenance, setEqProvenance] = useState('model_proposed');
  const [eqSection, setEqSection] = useState('4. Proposed Methodology');
  const [eqSymbols, setEqSymbols] = useState([
    { symbol: '\\mathcal{L}_{BC}', meaning: 'Behavioral cloning imitation loss', unit: 'loss' },
    { symbol: '\\lambda_1, \\lambda_2', meaning: 'Contrastive & calibration regularization weights', unit: 'scalar' },
  ]);

  // Diagram Form State
  const [selectedDiagramId, setSelectedDiagramId] = useState('fig-mera-arch');
  const [diagramSection, setDiagramSection] = useState('4. Proposed Methodology');

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState('Simulation Environment Setup');
  const [uploadCaption, setUploadCaption] = useState('Experimental robot workspace with multi-camera calibration.');
  const [uploadSection, setUploadSection] = useState('5. Experimental Setup & Benchmarks');
  const [uploadFileRef, setUploadFileRef] = useState('');

  // Graph Form State
  const [graphMetric, setGraphMetric] = useState('Success Rate');
  const [graphDataset, setGraphDataset] = useState('CALVIN');
  const [graphSection, setGraphSection] = useState('6. Experimental Results');

  const userResults = project?.userResults || [];
  const baselines = project?.baselines || [];
  const hasVerifiedResults = userResults.length > 0;

  const handleCopyTag = (obj) => {
    let tag = '';
    if (obj.objectType === 'equation') tag = `{{EQUATION:${obj.id}}}`;
    else if (obj.objectType === 'table') tag = `{{TABLE:${obj.id}}}`;
    else tag = `{{FIGURE:${obj.id}}}`;

    navigator.clipboard.writeText(tag);
    setCopiedId(obj.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteObject = async (id) => {
    if (window.confirm('Delete this manuscript object?')) {
      const updated = manuscriptObjects.filter((o) => o.id !== id);
      await onUpdateObjects(updated);
    }
  };

  const handleMoveObject = async (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= manuscriptObjects.length) return;
    const clone = [...manuscriptObjects];
    const temp = clone[index];
    clone[index] = clone[targetIdx];
    clone[targetIdx] = temp;
    await onUpdateObjects(clone);
  };

  // Add / Save Equation
  const handleSaveEquation = async (e) => {
    e.preventDefault();
    const newEq = {
      id: `eq-${Date.now().toString(36)}`,
      objectType: 'equation',
      title: eqTitle.trim(),
      caption: eqTitle.trim(),
      sectionId: eqSection,
      order: manuscriptObjects.length + 1,
      latex: eqLatex.trim(),
      symbolDefinitions: eqSymbols.filter((s) => s.symbol.trim()),
      provenance: {
        sourceType: eqProvenance,
        badgeLabel:
          eqProvenance === 'model_proposed'
            ? 'Proposed Equation'
            : eqProvenance === 'derived'
            ? 'Derived Equation'
            : eqProvenance === 'source_extracted'
            ? 'Extracted Equation'
            : 'User Equation',
      },
      verified: true,
    };

    const updated = [...manuscriptObjects, newEq];
    await onUpdateObjects(updated);
    setModalType(null);
  };

  // Add Conceptual Diagram
  const handleSaveDiagram = async () => {
    const diagDef = DIAGRAM_TYPES.find((d) => d.id === selectedDiagramId) || DIAGRAM_TYPES[0];
    const svgCode = getSvgForDiagramId(diagDef.id);

    const newFig = {
      id: `${diagDef.id}-${Date.now().toString(36)}`,
      objectType: 'figure',
      title: diagDef.title,
      caption: diagDef.caption,
      sectionId: diagramSection,
      order: manuscriptObjects.length + 1,
      svgContent: svgCode,
      figureType: 'conceptual_diagram',
      provenance: {
        sourceType: 'conceptual_diagram',
        badgeLabel: 'Generated Conceptual Diagram',
      },
      verified: true,
    };

    const updated = [...manuscriptObjects, newFig];
    await onUpdateObjects(updated);
    setModalType(null);
  };

  // Upload Figure Handler
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadFileRef(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUploadedFigure = async (e) => {
    e.preventDefault();
    if (!uploadFileRef) return;

    const newFig = {
      id: `fig-user-${Date.now().toString(36)}`,
      objectType: 'image',
      title: uploadTitle.trim(),
      caption: uploadCaption.trim(),
      sectionId: uploadSection,
      order: manuscriptObjects.length + 1,
      fileRef: uploadFileRef,
      figureType: 'user_figure',
      provenance: {
        sourceType: 'user_figure',
        badgeLabel: 'User Research Figure',
      },
      verified: true,
    };

    const updated = [...manuscriptObjects, newFig];
    await onUpdateObjects(updated);
    setUploadFileRef('');
    setModalType(null);
  };

  // Generate Result Graph
  const handleGenerateResultGraph = async () => {
    if (!hasVerifiedResults) return;

    // Filter results matching metric and dataset
    const matchedResults = userResults.filter(
      (r) =>
        r.metric?.toLowerCase().includes(graphMetric.toLowerCase()) ||
        r.dataset?.toLowerCase().includes(graphDataset.toLowerCase())
    );

    const resultsToUse = matchedResults.length > 0 ? matchedResults : userResults;

    // Group by model to compute statistics
    const byModel = new Map();
    resultsToUse.forEach((r) => {
      const mName = r.modelName || r.model || 'Model';
      if (!byModel.has(mName)) byModel.set(mName, []);
      byModel.get(mName).push(r.value);
    });

    const dataPoints = [];
    byModel.forEach((vals, mName) => {
      const stats = calculateRunStatistics(vals);
      dataPoints.push({
        label: mName,
        mean: stats.mean,
        std: stats.std,
        n: stats.n,
        isProposed: true,
        unit: resultsToUse[0]?.unit || '%',
      });
    });

    // Add baseline scores if available
    baselines.forEach((b) => {
      const num = parseFloat(b.score);
      if (Number.isFinite(num)) {
        dataPoints.push({
          label: b.name,
          mean: num,
          std: 0,
          n: 1,
          isProposed: false,
          isBaseline: true,
          unit: resultsToUse[0]?.unit || '%',
        });
      }
    });

    const svg = buildBarChartSvg({
      title: `${graphMetric} Comparison on ${graphDataset}`,
      metric: graphMetric,
      dataset: graphDataset,
      dataPoints,
    });

    const newGraph = {
      id: `graph-${Date.now().toString(36)}`,
      objectType: 'graph',
      graphType: 'bar',
      title: `${graphMetric} Empirical Comparison on ${graphDataset}`,
      caption: `Figure. Verified empirical comparison on ${graphDataset} evaluating ${graphMetric} across proposed model and baseline architectures. Error bars reflect sample standard deviation across multi-seed runs (when n >= 2).`,
      sectionId: graphSection,
      order: manuscriptObjects.length + 1,
      svgContent: svg,
      underlyingData: resultsToUse,
      provenance: {
        sourceType: 'result_graph',
        badgeLabel: 'Verified Result Graph',
        resultIds: resultsToUse.map((r) => r.id),
      },
      verified: true,
    };

    const updated = [...manuscriptObjects, newGraph];
    await onUpdateObjects(updated);
    setModalType(null);
  };

  // Helper to render KaTeX safely
  const renderLatex = (latexStr) => {
    try {
      return {
        __html: katex.renderToString(latexStr, { throwOnError: false, displayMode: true }),
      };
    } catch (e) {
      return { __html: `<code>${latexStr}</code>` };
    }
  };

  const filteredObjects = manuscriptObjects.filter((o) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'equation') return o.objectType === 'equation';
    if (activeFilter === 'figure') return o.objectType === 'figure' || o.objectType === 'image';
    if (activeFilter === 'graph') return o.objectType === 'graph';
    if (activeFilter === 'table') return o.objectType === 'table';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers size={18} className="text-indigo-600" />
            Figures, Tables &amp; Equations Manager
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage first-class equations, architecture diagrams, verified graphs, and tables with full
            provenance and dynamic cross-referencing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setModalType('equation')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs"
          >
            <Sigma size={13} />
            <span>+ Add Equation</span>
          </button>

          <button
            type="button"
            onClick={() => setModalType('diagram')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors shadow-2xs"
          >
            <Sparkles size={13} />
            <span>+ Generate Diagram</span>
          </button>

          <button
            type="button"
            onClick={() => setModalType('upload')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs"
          >
            <Upload size={13} />
            <span>+ Upload Figure</span>
          </button>

          <button
            type="button"
            onClick={() => setModalType('graph')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-2xs ${
              hasVerifiedResults
                ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <BarChart3 size={13} />
            <span>+ Result Graph {hasVerifiedResults ? '' : '(Locked)'}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        {['all', 'equation', 'figure', 'graph', 'table'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
              activeFilter === f
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {f === 'all' ? `All (${manuscriptObjects.length})` : f}
          </button>
        ))}
      </div>

      {/* Objects List */}
      {filteredObjects.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center space-y-2">
          <p className="text-xs text-slate-500 font-medium">
            No manuscript items in this category yet. Click the buttons above to add equations,
            conceptual diagrams, or upload research images.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredObjects.map((obj, idx) => (
            <div
              key={obj.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
            >
              {/* Item Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
                    {obj.displayLabel || `#${idx + 1}`}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{obj.title}</h4>
                    <span className="text-[10px] text-slate-400">Section: {obj.sectionId}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Provenance Badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      obj.provenance?.sourceType === 'conceptual_diagram'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : obj.provenance?.sourceType === 'result_graph'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : obj.provenance?.sourceType === 'user_figure'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    }`}
                  >
                    {obj.provenance?.badgeLabel || obj.provenance?.sourceType || 'Verified Object'}
                  </span>

                  {/* Copy Cross-Reference Tag */}
                  <button
                    type="button"
                    onClick={() => handleCopyTag(obj)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                    title="Copy cross-reference tag for manuscript text"
                  >
                    {copiedId === obj.id ? (
                      <Check size={11} className="text-emerald-600" />
                    ) : (
                      <Copy size={11} />
                    )}
                    <span>{copiedId === obj.id ? 'Copied' : 'Cross-Ref Tag'}</span>
                  </button>

                  {/* Reorder Buttons */}
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveObject(idx, -1)}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    <MoveUp size={13} />
                  </button>
                  <button
                    type="button"
                    disabled={idx === filteredObjects.length - 1}
                    onClick={() => handleMoveObject(idx, 1)}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    <MoveDown size={13} />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteObject(obj.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Item Content Preview */}
              {obj.objectType === 'equation' && (
                <div className="space-y-2">
                  <div
                    className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center font-mono overflow-x-auto"
                    dangerouslySetInnerHTML={renderLatex(obj.latex)}
                  />
                  {obj.symbolDefinitions && obj.symbolDefinitions.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 text-[11px] text-indigo-950 space-y-1">
                      <span className="font-bold text-[10px] uppercase text-indigo-700 block">
                        Symbol Definitions:
                      </span>
                      <div className="grid gap-1 sm:grid-cols-2">
                        {obj.symbolDefinitions.map((s, i) => (
                          <div key={i} className="flex items-center gap-1.5 font-mono">
                            <span className="font-bold">{s.symbol}:</span>
                            <span className="font-sans text-slate-700">{s.meaning}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(obj.objectType === 'figure' || obj.objectType === 'graph') && (
                <div className="space-y-2">
                  <div
                    className="rounded-xl border border-slate-200 bg-white p-3 max-h-[360px] overflow-auto flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: obj.svgContent || '' }}
                  />
                  {obj.objectType === 'graph' && obj.underlyingData && (
                    <button
                      type="button"
                      onClick={() => {
                        setInspectTarget(obj);
                        setModalType('inspect_data');
                      }}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      <Database size={12} />
                      <span>View Underlying Data &amp; Calculation ({obj.underlyingData.length} records)</span>
                    </button>
                  )}
                </div>
              )}

              {obj.objectType === 'image' && obj.fileRef && (
                <div className="rounded-xl border border-slate-200 overflow-hidden text-center bg-slate-50 p-2">
                  <img
                    src={obj.fileRef}
                    alt={obj.title}
                    className="max-h-[300px] mx-auto rounded-lg object-contain"
                  />
                </div>
              )}

              {obj.objectType === 'table' && obj.tableData && (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                        {(obj.tableData.headers || []).map((h, i) => (
                          <th key={i} className="py-2 px-3">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(obj.tableData.rows || []).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/50">
                          {row.map((c, cIdx) => (
                            <td key={cIdx} className="py-2 px-3 text-slate-700">
                              {c}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Caption */}
              <p className="text-xs text-slate-600 italic bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                <strong>{obj.displayLabel || 'Item'}.</strong> {obj.caption}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* --- MODAL 1: ADD EQUATION --- */}
      {modalType === 'equation' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sigma size={16} className="text-indigo-600" />
              Add Mathematical Equation
            </h3>

            <form onSubmit={handleSaveEquation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Equation Title
                </label>
                <input
                  type="text"
                  required
                  value={eqTitle}
                  onChange={(e) => setEqTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  placeholder="e.g. Uncertainty-Aware Policy Loss"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  LaTeX Code
                </label>
                <textarea
                  rows={3}
                  required
                  value={eqLatex}
                  onChange={(e) => setEqLatex(e.target.value)}
                  className="w-full text-xs font-mono p-2.5 border border-slate-200 rounded-xl"
                  placeholder="e.g. \mathcal{L} = \mathcal{L}_{BC} + \lambda \mathcal{L}_{cal}"
                />
              </div>

              {/* Live KaTeX Preview */}
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Live KaTeX Render
                </span>
                <div
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center overflow-x-auto min-h-[50px] flex items-center justify-center"
                  dangerouslySetInnerHTML={renderLatex(eqLatex)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Provenance Classification
                  </label>
                  <select
                    value={eqProvenance}
                    onChange={(e) => setEqProvenance(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-xl"
                  >
                    <option value="model_proposed">Proposed for Current Framework</option>
                    <option value="derived">Derived by DOCUMIND</option>
                    <option value="source_extracted">Extracted from Source Literature</option>
                    <option value="user_defined">User Defined</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Manuscript Section
                  </label>
                  <input
                    type="text"
                    value={eqSection}
                    onChange={(e) => setEqSection(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  Save Equation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: GENERATE CONCEPTUAL DIAGRAM --- */}
      {modalType === 'diagram' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-600" />
              Generate Academic Conceptual Diagram
            </h3>
            <p className="text-xs text-slate-500">
              Generates vector architecture flowcharts based on your saved methodology. Marked as
              <code className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded font-mono ml-1">
                GENERATED_CONCEPTUAL_FIGURE
              </code>.
            </p>

            <div className="space-y-2">
              {DIAGRAM_TYPES.map((d) => (
                <label
                  key={d.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedDiagramId === d.id
                      ? 'bg-amber-50/60 border-amber-300'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="diagram"
                    value={d.id}
                    checked={selectedDiagramId === d.id}
                    onChange={() => setSelectedDiagramId(d.id)}
                    className="mt-1 text-amber-600"
                  />
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">{d.title}</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">{d.caption}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDiagram}
                className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
              >
                Generate Diagram
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: UPLOAD RESEARCH FIGURE --- */}
      {modalType === 'upload' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Upload size={16} className="text-blue-600" />
              Upload Research Figure
            </h3>

            <form onSubmit={handleSaveUploadedFigure} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Figure Title</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Academic Caption
                </label>
                <textarea
                  rows={2}
                  required
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Image File</label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/svg+xml"
                  required
                  onChange={handleImageUpload}
                  className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>

              {uploadFileRef && (
                <div className="p-2 border border-slate-200 rounded-xl text-center bg-slate-50">
                  <img
                    src={uploadFileRef}
                    alt="Preview"
                    className="max-h-[140px] mx-auto rounded-lg object-contain"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFileRef}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  Upload &amp; Attach
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: GENERATE RESULT GRAPH --- */}
      {modalType === 'graph' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 size={16} className="text-emerald-600" />
              Generate Result Graph from Verified Data
            </h3>

            {!hasVerifiedResults ? (
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-rose-900">
                  <ShieldAlert size={15} />
                  <span>Verified Experimental Data Required</span>
                </div>
                <p>
                  DOCUMIND-AI Academic Integrity Guard prohibits generating graphs without real Step 9
                  experimental trials. Please input verified results in Step 9 first.
                </p>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-1.5 text-xs font-bold bg-rose-600 text-white rounded-xl"
                >
                  Understood
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                  <strong>{userResults.length} verified experiment result(s)</strong> available for
                  plotting.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Metric</label>
                    <input
                      type="text"
                      value={graphMetric}
                      onChange={(e) => setGraphMetric(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Dataset</label>
                    <input
                      type="text"
                      value={graphDataset}
                      onChange={(e) => setGraphDataset(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateResultGraph}
                    className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                  >
                    Generate Verified Graph
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL 5: INSPECT UNDERLYING DATA --- */}
      {modalType === 'inspect_data' && inspectTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database size={16} className="text-indigo-600" />
              Underlying Verified Data &amp; Mathematical Derivation
            </h3>
            <p className="text-xs text-slate-500">
              Complete provenance trail linking graph points to verified experimental trials.
            </p>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-2.5">Model</th>
                    <th className="p-2.5">Dataset</th>
                    <th className="p-2.5">Metric</th>
                    <th className="p-2.5">Observed Value</th>
                    <th className="p-2.5">Run / Seed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(inspectTarget.underlyingData || []).map((d, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-bold text-indigo-950">{d.modelName || d.model}</td>
                      <td className="p-2.5">{d.dataset}</td>
                      <td className="p-2.5">{d.metric}</td>
                      <td className="p-2.5 font-mono font-bold text-emerald-700">
                        {d.value} {d.unit}
                      </td>
                      <td className="p-2.5 font-mono text-[10px] text-slate-500">{d.runId || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalType(null);
                  setInspectTarget(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiguresEquationsManager;
