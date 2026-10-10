import React, { useState } from 'react';
import { Sliders, Key, Database, Cpu, Save, CheckCircle2, RefreshCw, Sun, Moon } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { useThemeContext } from '../../context/ThemeContext';

const Settings = () => {
  const { theme, setTheme } = useThemeContext();
  const [apiKey, setApiKey] = useState('sk-documind-prod-948275918234');
  const [defaultModel, setDefaultModel] = useState('gpt-4o');
  const [chunkSize, setChunkSize] = useState(512);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <Sliders size={16} />
          <span>System & RAG Configuration</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
          Application Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage workspace appearance, API credentials, default LLM model selection, and vector chunking parameters.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Appearance & Theme Section */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
            <Sun size={16} className="text-amber-500" />
            <span>Workspace Appearance</span>
          </h3>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${
                theme === 'light'
                  ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-2 ring-indigo-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-amber-500 shadow-2xs">
                <Sun size={18} />
              </div>
              <div>
                <div className="text-xs font-bold">Light Mode</div>
                <div className="text-[10px] text-slate-400">Clean & high-contrast</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${
                theme === 'dark'
                  ? 'border-indigo-500 bg-indigo-950/60 text-indigo-200 font-bold ring-2 ring-indigo-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 shadow-2xs">
                <Moon size={18} />
              </div>
              <div>
                <div className="text-xs font-bold">Dark Mode</div>
                <div className="text-[10px] text-slate-400">Deep slate & focused</div>
              </div>
            </button>
          </div>
        </div>
        {/* API Key Section */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Key size={16} className="text-indigo-600" />
            <span>API & Provider Credentials</span>
          </h3>

          <Input
            label="DOCUMIND Platform API Key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            helperText="Use this key to authenticate external API calls."
          />
        </div>

        {/* RAG & Chunking Parameters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Cpu size={16} className="text-indigo-600" />
            <span>RAG Model & Vector Chunking Defaults</span>
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Default LLM Model
              </label>
              <select
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="gpt-4o">OpenAI GPT-4o</option>
                <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Target Chunk Size (Tokens)
              </label>
              <input
                type="number"
                value={chunkSize}
                onChange={(e) => setChunkSize(parseInt(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Chunk Overlap (Tokens)
            </label>
            <input
              type="number"
              value={chunkOverlap}
              onChange={(e) => setChunkOverlap(parseInt(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 max-w-xs"
            />
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={16} />
            Settings saved successfully!
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" leftIcon={Save}>
            Save All Settings
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
