import React from 'react';
import { Search, X, SlidersHorizontal, Sparkles } from 'lucide-react';
import Button from '../common/Button';

const SearchBar = ({ query, onChange, onSearch, searchMode, onModeChange }) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative flex items-center shadow-lg rounded-2xl bg-white border border-slate-200 p-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition">
        <div className="pl-3.5 text-slate-400">
          <Search size={22} />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search documents by semantic meaning, exact phrase, or concepts..."
          className="w-full bg-transparent px-3 py-2 text-base text-slate-900 placeholder-slate-400 focus:outline-none"
        />

        {query && (
          <button
            onClick={() => onChange('')}
            className="p-1 text-slate-400 hover:text-slate-600 mr-2"
          >
            <X size={18} />
          </button>
        )}

        <Button onClick={onSearch} size="md" className="rounded-xl shrink-0">
          Search
        </Button>
      </div>

      {/* Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
            Retrieval Strategy:
          </span>
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => onModeChange('hybrid')}
              className={`rounded-lg px-3 py-1 font-semibold transition ${
                searchMode === 'hybrid'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚡ Hybrid (Dense + Sparse)
            </button>
            <button
              type="button"
              onClick={() => onModeChange('semantic')}
              className={`rounded-lg px-3 py-1 font-semibold transition ${
                searchMode === 'semantic'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🧠 Semantic Vector
            </button>
            <button
              type="button"
              onClick={() => onModeChange('keyword')}
              className={`rounded-lg px-3 py-1 font-semibold transition ${
                searchMode === 'keyword'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔤 Keyword (BM25)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
