import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Sliders, Database, Layers } from 'lucide-react';
import SearchBar from '../../components/search/SearchBar';
import SearchFilters from '../../components/search/SearchFilters';
import SearchResult from '../../components/search/SearchResult';
import EmptyState from '../../components/common/EmptyState';

const mockKnowledgeBases = [
  { id: 'kb-1', name: 'Finance & Legal' },
  { id: 'kb-2', name: 'Engineering & Architecture' },
  { id: 'kb-3', name: 'Product Insights' },
];

const mockSearchResults = [
  {
    id: 'res-1',
    documentName: '2026_Q2_Financial_Report.pdf',
    snippet: 'Quarterly net revenue grew by 24% year-over-year, driven by enterprise subscriptions to the DOCUMIND-AI document intelligence platform. Enterprise ARR reached $14.2M.',
    similarityScore: 0.94,
    knowledgeBase: 'Finance & Legal',
    pageNumber: 4,
    chunkId: 'chk-finance-004',
    tokenCount: 240,
  },
  {
    id: 'res-2',
    documentName: 'AI_Safety_and_Compliance_Policy.pdf',
    snippet: 'Vector embedding search queries are executed through dense cosine similarity algorithms. Strict document permission masks are applied to ensure zero data leakage across tenant boundaries.',
    similarityScore: 0.88,
    knowledgeBase: 'Finance & Legal',
    pageNumber: 2,
    chunkId: 'chk-safety-012',
    tokenCount: 310,
  },
  {
    id: 'res-3',
    documentName: 'Product_Architecture_Overview.docx',
    snippet: 'The RAG retrieval pipeline extracts top-K vector passages using HNSW indexing in Pinecone/Weaviate vector store before feeding context chunks into LLM generation windows.',
    similarityScore: 0.82,
    knowledgeBase: 'Engineering & Architecture',
    pageNumber: 7,
    chunkId: 'chk-arch-029',
    tokenCount: 195,
  },
];

const Search = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState('hybrid');
  const [minScore, setMinScore] = useState(0.7);
  const [selectedKbs, setSelectedKbs] = useState(['Finance & Legal', 'Engineering & Architecture', 'Product Insights']);
  const [selectedFileTypes, setSelectedFileTypes] = useState(['pdf', 'docx', 'csv', 'txt']);
  const [hasSearched, setHasSearched] = useState(true);

  const handleSearch = () => {
    setHasSearched(true);
  };

  const handleToggleKb = (name) => {
    setSelectedKbs((prev) =>
      prev.includes(name) ? prev.filter((k) => k !== name) : [...prev, name]
    );
  };

  const handleToggleFileType = (type) => {
    setSelectedFileTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const filteredResults = mockSearchResults.filter((res) => {
    const matchesScore = res.similarityScore >= minScore;
    const matchesKb = selectedKbs.includes(res.knowledgeBase);
    const matchesQuery = !query || res.snippet.toLowerCase().includes(query.toLowerCase()) || res.documentName.toLowerCase().includes(query.toLowerCase());
    return matchesScore && matchesKb && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
          <SearchIcon size={16} />
          <span>Vector & Hybrid Retrieval</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          Semantic Document Search
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Find exact passages, semantic concepts, and data across all knowledge bases.
        </p>
      </div>

      {/* Main Search Input */}
      <SearchBar
        query={query}
        onChange={setQuery}
        onSearch={handleSearch}
        searchMode={searchMode}
        onModeChange={setSearchMode}
      />

      {/* Results & Filters Layout */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Filters */}
        <div className="lg:col-span-1">
          <SearchFilters
            knowledgeBases={mockKnowledgeBases}
            selectedKbs={selectedKbs}
            onToggleKb={handleToggleKb}
            minScore={minScore}
            onMinScoreChange={setMinScore}
            selectedFileTypes={selectedFileTypes}
            onToggleFileType={handleToggleFileType}
          />
        </div>

        {/* Right Search Results */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
            <span>Showing {filteredResults.length} matching vector chunks</span>
            <span>Latency: 42ms</span>
          </div>

          {filteredResults.length === 0 ? (
            <EmptyState
              title="No matching passages found"
              description="Try adjusting your query, lowering the minimum similarity threshold, or selecting additional knowledge bases."
              icon={SearchIcon}
            />
          ) : (
            <div className="space-y-4">
              {filteredResults.map((result) => (
                <SearchResult
                  key={result.id}
                  result={result}
                  onAskAI={() => navigate('/chat')}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;
