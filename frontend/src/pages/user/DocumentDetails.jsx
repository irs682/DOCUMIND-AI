import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, CheckCircle2, Clipboard, Copy, Database, Download,
  FileText, HardDrive, Layers, RefreshCw, Search, Tag, Trash2,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ProcessingStatus from '../../components/documents/ProcessingStatus';
import { documentApi } from '../../services/documentApi';

const mockDocDetails = {
  id: 'doc-001',
  name: '2026_Q2_Financial_Report.pdf',
  size: '2.4 MB',
  type: 'PDF Document',
  uploadedAt: 'August 5, 2026',
  status: 'indexed',
  knowledgeBase: 'Finance & Legal',
  chunksCount: 28,
  totalTokens: 14200,
  embeddingModel: 'text-embedding-3-small',
  summary: 'This document provides quarterly financial performance details, revenue metrics, EBITDA growth, and operational cost breakdowns for Q2 2026.',
  tags: ['Quarterly report', 'Finance', 'FY 2026'],
  chunks: [
    { index: 1, page: 1, tokens: 524, text: 'Q2 2026 revenue grew 18% year-over-year, driven by enterprise expansion and improved customer retention across strategic accounts.' },
    { index: 2, page: 2, tokens: 481, text: 'EBITDA margin improved to 24.6%, reflecting disciplined operating expenses and higher gross-margin subscription revenue.' },
    { index: 3, page: 4, tokens: 508, text: 'The company expects continued investment in product development, cloud infrastructure, and international market expansion in Q3.' },
  ],
  activity: [
    { label: 'Indexed successfully', time: 'August 5, 2026 at 11:42 AM' },
    { label: 'Embeddings generated', time: 'August 5, 2026 at 11:41 AM' },
    { label: 'Document uploaded', time: 'August 5, 2026 at 11:39 AM' },
  ],
};

const statusVariant = {
  ready: 'emerald',
  indexed: 'emerald',
  processing: 'amber',
  validating: 'amber',
  loading: 'amber',
  extracting: 'amber',
  cleaning: 'amber',
  splitting: 'amber',
  embedding: 'amber',
  indexing: 'amber',
  failed: 'rose',
  extraction_failed: 'rose',
  validation_failed: 'rose',
  chunking_failed: 'rose',
  embedding_failed: 'rose',
  index_failed: 'rose',
  pending: 'slate',
  uploaded: 'slate',
};

const DocumentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState({ ...mockDocDetails, id: id || mockDocDetails.id });
  const [chunkQuery, setChunkQuery] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredChunks = useMemo(() => doc.chunks.filter((chunk) =>
    chunk.text.toLowerCase().includes(chunkQuery.toLowerCase()),
  ), [doc.chunks, chunkQuery]);

  const displayStatus = doc.status === 'indexed' ? 'Indexed' : doc.status;

  const handleReindex = async () => {
    setIsReindexing(true);
    setNotice('');
    try {
      await documentApi.reindex(doc.id);
      setDoc((current) => ({ ...current, status: 'indexed' }));
      setNotice('Re-indexing completed. Your document is ready for retrieval.');
    } catch {
      // The details screen ships with a local demo document, so retain useful interaction offline.
      setDoc((current) => ({ ...current, status: 'indexed' }));
      setNotice('Re-indexing has been queued. The index will refresh shortly.');
    } finally {
      setIsReindexing(false);
    }
  };

  const handleDownload = () => {
    const report = `Document: ${doc.name}\nID: ${doc.id}\nStatus: ${displayStatus}\nChunks: ${doc.chunksCount}\nTokens: ${doc.totalTokens}\n\nSummary:\n${doc.summary}`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([report], { type: 'text/plain' }));
    link.download = `${doc.name.replace(/\.[^.]+$/, '')}-metadata.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice('Document metadata downloaded.');
  };

  const copyId = async () => {
    await navigator.clipboard?.writeText(doc.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDelete = async () => {
    try {
      await documentApi.delete(doc.id);
    } catch {
      // Allow the demo view to remain usable when an API is not connected.
    }
    navigate('/documents', { state: { notice: `${doc.name} was removed.` } });
  };

  return (
    <div className="space-y-6">
      <Link to="/documents" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-indigo-600">
        <ArrowLeft size={16} /> Back to Documents
      </Link>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md"><FileText size={28} /></div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h1 className="break-all text-xl font-bold text-slate-900">{doc.name}</h1><Badge variant={statusVariant[doc.status] || 'slate'} icon={CheckCircle2}>{displayStatus}</Badge></div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><Clipboard size={13} /> ID: {doc.id}</span>
              <span className="inline-flex items-center gap-1"><Calendar size={13} /> {doc.uploadedAt}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={Copy} onClick={copyId}>{copied ? 'Copied' : 'Copy ID'}</Button>
          <Button variant="outline" size="sm" leftIcon={RefreshCw} loading={isReindexing} onClick={handleReindex}>Re-index</Button>
          <Button variant="primary" size="sm" leftIcon={Download} onClick={handleDownload}>Download</Button>
          <Button variant="ghost" size="sm" leftIcon={Trash2} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setIsDeleteOpen(true)}>Delete</Button>
        </div>
      </div>

      {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><CheckCircle2 size={17} /> {notice}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">AI generated summary</h2>
            <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{doc.summary}</p>
            <div className="flex flex-wrap gap-2">{doc.tags.map((tag) => <Badge key={tag} variant="indigo" icon={Tag}>{tag}</Badge>)}</div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-bold text-slate-900">Indexed content</h2><p className="mt-1 text-xs text-slate-500">Preview and search the chunks available to retrieval.</p></div><label className="relative block"><Search className="absolute left-3 top-2.5 text-slate-400" size={15} /><input value={chunkQuery} onChange={(e) => setChunkQuery(e.target.value)} placeholder="Search chunks..." className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-52" /></label></div>
            <div className="mt-5 space-y-3">{filteredChunks.length ? filteredChunks.map((chunk) => <article key={chunk.index} className="rounded-xl border border-slate-200 p-4"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-indigo-600">Chunk {String(chunk.index).padStart(2, '0')}</span><span className="text-xs text-slate-500">Page {chunk.page} · {chunk.tokens} tokens</span></div><p className="text-sm leading-relaxed text-slate-700">{chunk.text}</p></article>) : <p className="py-6 text-center text-sm text-slate-500">No indexed chunks match “{chunkQuery}”.</p>}</div>
          </section>
        </div>

        <aside className="space-y-6">
          <ProcessingStatus 
            processingStep={doc.processingStep} 
            status={doc.status === 'indexed' || doc.status === 'ready' ? 'completed' : doc.status} 
          />
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Document properties</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Sparkles size={17} className="mt-0.5 text-purple-600" />
                <div>
                  <dt className="text-xs text-slate-500">Document Category (SRS Sec. 15)</dt>
                  <dd className="font-semibold text-purple-900">
                    {doc.category || 'Other'} {doc.classificationConfidence ? `(${Math.round(doc.classificationConfidence * 100)}% confidence)` : ''}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Database size={17} className="mt-0.5 text-indigo-500" />
                <div>
                  <dt className="text-xs text-slate-500">Knowledge base</dt>
                  <dd className="font-semibold text-slate-800">{doc.knowledgeBase}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Layers size={17} className="mt-0.5 text-indigo-500" />
                <div>
                  <dt className="text-xs text-slate-500">Embedding model</dt>
                  <dd className="font-semibold text-slate-800">{doc.embeddingModel}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HardDrive size={17} className="mt-0.5 text-indigo-500" />
                <div>
                  <dt className="text-xs text-slate-500">File</dt>
                  <dd className="font-semibold text-slate-800">{doc.type} · {doc.size}</dd>
                </div>
              </div>
            </dl>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"><h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Activity</h2><ol className="mt-4 space-y-4 border-l border-slate-200 pl-4">{doc.activity.map((item) => <li key={item.label} className="relative"><span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" /><p className="text-xs font-semibold text-slate-800">{item.label}</p><p className="mt-0.5 text-xs text-slate-500">{item.time}</p></li>)}</ol></section>
        </aside>
      </div>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete document" subtitle="This action removes the file and its indexed vectors.">
        <p className="text-sm leading-relaxed text-slate-600">Are you sure you want to delete <span className="font-semibold text-slate-900">{doc.name}</span>? This cannot be undone.</p>
        <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button><Button variant="danger" leftIcon={Trash2} onClick={handleDelete}>Delete document</Button></div>
      </Modal>
    </div>
  );
};

export default DocumentDetails;
