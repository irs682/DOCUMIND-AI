import React, { useState } from 'react';
import {
  Database,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calculator,
  ShieldAlert,
  AlertCircle,
  TrendingUp,
  FileText,
  CopyCheck,
  RotateCcw,
  Info,
} from 'lucide-react';
import { parseAndValidateResults, normalizeResult } from '../../../utils/csvResultParser';
import ResearchEvidenceDashboard from '../ResearchEvidenceDashboard';

const Step9Results = ({
  project,
  onUpdateProject,
  onExecuteStep,
  onNext,
  onPrev,
  isExecuting,
}) => {
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'csv'
  const [csvText, setCsvText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // CSV/TSV Preview State
  const [previewData, setPreviewData] = useState(null);
  const [duplicateMode, setDuplicateMode] = useState('skip'); // 'skip' | 'replace' | 'append'

  // Manual entry inputs
  const [modelName, setModelName] = useState('Proposed Model');
  const [dataset, setDataset] = useState('CALVIN');
  const [split, setSplit] = useState('Test Split');
  const [metric, setMetric] = useState('Success Rate');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('%');
  const [runId, setRunId] = useState('Seed 42');
  const [notes, setNotes] = useState('');

  const userResults = project?.userResults || [];
  const comparison = project?.resultComparison || {
    comparisonRows: [],
    absoluteImprovement: '',
    relativeImprovement: '',
    percentagePointDiff: '',
    isFairComparison: true,
    fairComparisonVerdict: '',
  };

  const handleAddManualResult = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    const numVal = parseFloat(value);
    if (isNaN(numVal)) {
      setError('Please provide a valid numerical score for the experiment result.');
      return;
    }

    const newResult = normalizeResult({
      modelName: modelName.trim(),
      model: modelName.trim(),
      dataset: dataset.trim(),
      split: split.trim(),
      metric: metric.trim(),
      value: numVal,
      unit: unit.trim() || '%',
      runId: runId.trim(),
      notes: notes.trim(),
      sourceType: 'user_supplied_result',
      verified: true,
    });

    try {
      setIsSaving(true);
      const updated = [...userResults, newResult];
      await onUpdateProject({ userResults: updated });
      setValue('');
      setNotes('');
      setSuccessMsg(`Added 1 verified result: ${newResult.modelName} (${newResult.value} ${newResult.unit} on ${newResult.metric}).`);
    } catch (err) {
      setError(err.message || 'Failed to record experiment result.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreviewCsv = () => {
    setError('');
    setSuccessMsg('');
    if (!csvText.trim()) {
      setError('Please paste CSV or TSV data first.');
      return;
    }

    const parseResult = parseAndValidateResults(csvText, userResults);

    if (!parseResult.success && parseResult.validRows.length === 0) {
      setPreviewData(null);
      setError(
        parseResult.errors.length > 0
          ? parseResult.errors.join(' | ')
          : 'Could not parse valid CSV data. Format: Model, Metric, Value, Dataset, Unit'
      );
      return;
    }

    setPreviewData(parseResult);
  };

  const handleConfirmImport = async () => {
    if (!previewData || previewData.validRows.length === 0) return;
    setError('');
    setSuccessMsg('');
    setIsSaving(true);

    try {
      let rowsToImport = [...previewData.validRows];

      // Handle duplicate mode
      if (duplicateMode === 'skip') {
        rowsToImport = rowsToImport.filter((r) => !r.isDuplicate);
      }

      let updatedResults = [...userResults];

      if (duplicateMode === 'replace') {
        // Replace existing results matching duplicate keys
        rowsToImport.forEach((newRow) => {
          const matchIdx = updatedResults.findIndex(
            (exist) =>
              (exist.modelName || exist.model || '').toLowerCase().trim() === newRow.modelName.toLowerCase().trim() &&
              (exist.dataset || '').toLowerCase().trim() === newRow.dataset.toLowerCase().trim() &&
              (exist.metric || '').toLowerCase().trim() === newRow.metric.toLowerCase().trim() &&
              (exist.split || 'Test').toLowerCase().trim() === (newRow.split || 'Test').toLowerCase().trim()
          );
          if (matchIdx >= 0) {
            updatedResults[matchIdx] = newRow;
          } else {
            updatedResults.push(newRow);
          }
        });
      } else {
        // 'skip' or 'append'
        updatedResults = [...updatedResults, ...rowsToImport];
      }

      await onUpdateProject({ userResults: updatedResults });
      setSuccessMsg(
        `Successfully imported ${rowsToImport.length} verified result${rowsToImport.length === 1 ? '' : 's'}.${
          previewData.summary.invalidCount > 0
            ? ` (${previewData.summary.invalidCount} invalid row${previewData.summary.invalidCount === 1 ? '' : 's'} skipped)`
            : ''
        }`
      );
      setCsvText('');
      setPreviewData(null);
      setActiveTab('manual');
    } catch (err) {
      setError(err.message || 'Failed to save imported results to project.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewData(null);
    setError('');
  };

  const handleDeleteResult = async (resId, idx) => {
    const updated = userResults.filter((r, i) => (r.id ? r.id !== resId : i !== idx));
    await onUpdateProject({ userResults: updated });
    setSuccessMsg('Result removed.');
  };

  const handleClearAllResults = async () => {
    if (window.confirm('Are you sure you want to remove all experimental results?')) {
      await onUpdateProject({ userResults: [] });
      setSuccessMsg('All results cleared.');
    }
  };

  const handleRunComparisonCalculation = async () => {
    if (userResults.length === 0) {
      setError('Please enter at least one experimental result before running comparison.');
      return;
    }
    setError('');
    try {
      await onExecuteStep(9, { userResults });
    } catch (err) {
      setError(err.message || 'Comparison calculation failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Step 9 — User Experiment Results & Fair Comparison
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Input verified experimental or simulation results. All absolute and relative improvements
            are calculated programmatically without LLM arithmetic estimation.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRunComparisonCalculation}
          disabled={isExecuting || userResults.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xs shrink-0"
        >
          <Calculator size={14} className={isExecuting ? 'animate-spin' : ''} />
          <span>{isExecuting ? 'Computing Gains...' : 'Calculate Benchmark Comparison'}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-rose-400 hover:text-rose-700 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <p className="flex-1 font-medium">{successMsg}</p>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-emerald-500 hover:text-emerald-800 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Canonical 6-Dimension Research Evidence Dashboard */}
      <ResearchEvidenceDashboard
        project={project}
        onProjectUpdated={onUpdateProject}
        onNavigateToStep={() => {}}
      />

      {/* Mandatory Anti-Fabrication Notice */}
      {userResults.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-6 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
            <ShieldAlert size={16} className="text-amber-600" />
            <span>Academic Anti-Fabrication Guard</span>
          </div>
          <p className="text-xs text-amber-900 font-medium leading-relaxed">
            Verified experimental results are required before generating the Results section of an
            original research paper. DOCUMIND-AI will never hallucinate synthetic numbers,
            p-values, or benchmark outcomes.
          </p>
        </div>
      ) : null}

      {/* Results Input Options */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex border-b border-slate-100 pb-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('manual');
              setPreviewData(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'manual'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Database size={13} />
            <span>Manual Entry</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('csv')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'csv'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet size={13} />
            <span>Paste CSV / TSV</span>
          </button>
        </div>

        {activeTab === 'manual' ? (
          <form onSubmit={handleAddManualResult} className="grid gap-3 sm:grid-cols-4 items-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Model Name</label>
              <input
                type="text"
                required
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Dataset / Benchmark</label>
              <input
                type="text"
                required
                value={dataset}
                onChange={(e) => setDataset(e.target.value)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Split</label>
              <input
                type="text"
                value={split}
                onChange={(e) => setSplit(e.target.value)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Metric Name</label>
              <input
                type="text"
                required
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Observed Value</label>
              <input
                type="number"
                step="any"
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. 72.4"
                className="w-full text-xs p-2 border border-slate-200 rounded-lg font-mono font-bold focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Run ID / Seed</label>
              <input
                type="text"
                value={runId}
                onChange={(e) => setRunId(e.target.value)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={isSaving}
                className="w-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs disabled:opacity-50"
              >
                <Plus size={14} /> {isSaving ? 'Saving...' : 'Record Result'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Format Instructions & Academic Protocol Banner */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                  <FileText size={14} className="text-indigo-600" />
                  Paste rows using:
                </span>
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                  CSV (comma) or TSV (tab) supported
                </span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100 font-mono text-xs text-slate-800">
                Model, Metric, Value, Dataset, Unit
              </div>
              <div className="text-[11px] text-slate-600 space-y-1">
                <p>
                  <strong className="text-slate-800">Example:</strong>{' '}
                  <code className="text-indigo-700 font-mono">
                    MERA-VLA (Full), Success Rate, 72.4, CALVIN, %
                  </code>
                </p>
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Info size={11} className="text-slate-400" />
                  Header row is optional. Quotes, decimals, and trailing newlines are handled automatically.
                </p>
              </div>
              <div className="pt-1 border-t border-indigo-100 text-[10px] text-amber-800 font-medium">
                Values must be real observed experimental or simulation results. Do not enter estimated or synthetic scores.
              </div>
            </div>

            {/* Input Textarea (Hidden when preview is active) */}
            {!previewData ? (
              <div className="space-y-3">
                <textarea
                  rows={5}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`Model,Metric,Value,Dataset,Unit\nMERA-VLA (Full),Success Rate,72.4,CALVIN,%\nMERA-VLA (Full),Expected Calibration Error,0.08,CALVIN,score`}
                  className="w-full text-xs font-mono p-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {csvText ? `${csvText.split('\n').filter(Boolean).length} line(s) entered` : 'Ready for input'}
                  </span>
                  <button
                    type="button"
                    onClick={handlePreviewCsv}
                    disabled={!csvText.trim()}
                    className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-all shadow-xs disabled:opacity-40"
                  >
                    Preview & Validate Data
                  </button>
                </div>
              </div>
            ) : (
              /* Import Preview Section */
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                {/* Preview Header & Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <CopyCheck size={14} className="text-indigo-600" />
                      Import Preview ({previewData.summary.validCount} Valid Row{previewData.summary.validCount === 1 ? '' : 's'})
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Detected Format: <strong className="text-slate-700">{previewData.detectedFormat}</strong> •{' '}
                      Header Row: <strong className="text-slate-700">{previewData.hasHeader ? 'Detected & Excluded' : 'None'}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 size={12} /> {previewData.summary.validCount} Valid
                    </span>
                    {previewData.summary.invalidCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                        <XCircle size={12} /> {previewData.summary.invalidCount} Skipped
                      </span>
                    )}
                    {previewData.summary.duplicateCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                        <AlertTriangle size={12} /> {previewData.summary.duplicateCount} Duplicate
                      </span>
                    )}
                  </div>
                </div>

                {/* Row-Level Errors Notice */}
                {previewData.invalidRows.length > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-1.5 text-xs text-rose-800">
                    <div className="font-bold flex items-center gap-1.5 text-rose-900">
                      <AlertCircle size={14} />
                      <span>{previewData.invalidRows.length} Row(s) Skipped Due to Validation Errors:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] font-mono text-rose-700">
                      {previewData.invalidRows.map((inv, i) => (
                        <li key={i}>
                          <strong>Row {inv.rowIndex}:</strong> {inv.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Duplicate Policy Selector (if duplicates exist) */}
                {previewData.summary.duplicateCount > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={15} className="text-amber-700 shrink-0" />
                      <span>
                        <strong>Potential duplicate result(s) detected:</strong> Choose import handling
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer">
                        <input
                          type="radio"
                          name="dupMode"
                          value="skip"
                          checked={duplicateMode === 'skip'}
                          onChange={() => setDuplicateMode('skip')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Skip duplicates</span>
                      </label>
                      <label className="inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer">
                        <input
                          type="radio"
                          name="dupMode"
                          value="replace"
                          checked={duplicateMode === 'replace'}
                          onChange={() => setDuplicateMode('replace')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Replace existing</span>
                      </label>
                      <label className="inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer">
                        <input
                          type="radio"
                          name="dupMode"
                          value="append"
                          checked={duplicateMode === 'append'}
                          onChange={() => setDuplicateMode('append')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Append all</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Valid Rows Preview Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3 font-bold">#</th>
                        <th className="py-2.5 px-3 font-bold">Model</th>
                        <th className="py-2.5 px-3 font-bold">Dataset</th>
                        <th className="py-2.5 px-3 font-bold">Split</th>
                        <th className="py-2.5 px-3 font-bold">Metric</th>
                        <th className="py-2.5 px-3 font-bold">Observed Value</th>
                        <th className="py-2.5 px-3 font-bold">Unit</th>
                        <th className="py-2.5 px-3 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {previewData.validRows.map((row, idx) => (
                        <tr
                          key={idx}
                          className={row.isDuplicate ? 'bg-amber-50/40' : 'hover:bg-slate-50/50'}
                        >
                          <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">
                            {row.rawRowIndex}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-indigo-950">{row.modelName}</td>
                          <td className="py-2.5 px-3">{row.dataset}</td>
                          <td className="py-2.5 px-3 text-slate-500">{row.split}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{row.metric}</td>
                          <td className="py-2.5 px-3 font-bold font-mono text-emerald-700">
                            {row.value}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{row.unit}</td>
                          <td className="py-2.5 px-3">
                            {row.isDuplicate ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                Duplicate
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                Ready
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Preview Actions */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleCancelPreview}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition-colors"
                  >
                    <RotateCcw size={13} />
                    <span>Edit Raw Input</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={isSaving || previewData.validRows.length === 0}
                    className="inline-flex items-center gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl transition-all shadow-xs disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} />
                    <span>
                      {isSaving
                        ? 'Saving Results...'
                        : `Import ${
                            duplicateMode === 'skip'
                              ? previewData.validRows.filter((r) => !r.isDuplicate).length
                              : previewData.validRows.length
                          } Verified Results`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Results Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Verified User Experimental Trials ({userResults.length})
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">Original empirical findings</span>
            {userResults.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllResults}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {userResults.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            No experiment results entered yet. Add your test numbers above via Manual Entry or Paste CSV / TSV.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-bold">Model</th>
                  <th className="py-3 px-4 font-bold">Dataset</th>
                  <th className="py-3 px-4 font-bold">Split</th>
                  <th className="py-3 px-4 font-bold">Metric</th>
                  <th className="py-3 px-4 font-bold">Observed Value</th>
                  <th className="py-3 px-4 font-bold">Provenance</th>
                  <th className="py-3 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {userResults.map((res, idx) => (
                  <tr key={res.id || idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-indigo-950">
                      {res.modelName || res.model}
                    </td>
                    <td className="py-3 px-4">{res.dataset}</td>
                    <td className="py-3 px-4 text-slate-500">{res.split || 'Test'}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{res.metric}</td>
                    <td className="py-3 px-4 font-bold font-mono text-emerald-700">
                      {res.value} {res.unit}
                    </td>
                    <td className="py-3 px-4 text-[10px]">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <CheckCircle2 size={10} /> Verified User Result
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteResult(res.id, idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="Delete result"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Programmatic Comparison & Mathematical Gain Output */}
      {comparison.comparisonRows && comparison.comparisonRows.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Computed Benchmark Comparison & Improvement Metrics
              </h3>
            </div>
            {comparison.isFairComparison ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                <CheckCircle2 size={12} /> Fair Comparison Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                <AlertTriangle size={12} /> Differing Conditions Noted
              </span>
            )}
          </div>

          {/* Programmatic Gain Cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Absolute Improvement</span>
              <p className="text-lg font-bold font-mono text-indigo-700">
                {comparison.absoluteImprovement || 'N/A'}
              </p>
              <span className="text-[10px] text-slate-500">Exact difference (+pp)</span>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Relative Improvement</span>
              <p className="text-lg font-bold font-mono text-emerald-700">
                {comparison.relativeImprovement || 'N/A'}
              </p>
              <span className="text-[10px] text-slate-500">Gain over prior best (%)</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Comparative Verdict</span>
              <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                {comparison.fairComparisonVerdict || 'Direct benchmark alignment'}
              </p>
            </div>
          </div>

          {/* Full Comparison Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 text-[10px] uppercase">
                  <th className="py-2.5 px-3 font-bold">Model</th>
                  <th className="py-2.5 px-3 font-bold">Dataset</th>
                  <th className="py-2.5 px-3 font-bold">Metric</th>
                  <th className="py-2.5 px-3 font-bold">Score</th>
                  <th className="py-2.5 px-3 font-bold">Delta vs Prior Best</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {comparison.comparisonRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={
                      row.isProposed ? 'bg-indigo-50/30 font-semibold' : 'hover:bg-slate-50/50'
                    }
                  >
                    <td className="py-2.5 px-3">
                      {row.model} {row.isProposed ? '(Proposed)' : ''}
                    </td>
                    <td className="py-2.5 px-3">{row.dataset}</td>
                    <td className="py-2.5 px-3">{row.metric}</td>
                    <td className="py-2.5 px-3 font-mono font-bold">{row.score}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-700">{row.delta || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Nav Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Step 8: Benchmarks</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs"
        >
          <span>Continue to Step 10: Discussion</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Step9Results;
