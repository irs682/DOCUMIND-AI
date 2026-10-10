import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, AlertCircle, FileText, RefreshCw } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import ExtractionProgress from '../../components/extractions/ExtractionProgress';
import ExtractionResultsView from '../../components/extractions/ExtractionResults';
import { extractionApi } from '../../services/extractionApi';
import { getExtractionResult } from '../../components/extractions/extractionTypes';

const ACTIVE_STATUSES = new Set(['QUEUED', 'PROCESSING']);

const ExtractionResults = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [extraction, setExtraction] = useState(location.state?.extraction || null);
  const [loading, setLoading] = useState(!location.state?.extraction);
  const [error, setError] = useState('');

  const loadExtraction = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const nextExtraction = await extractionApi.getById(id);
      setExtraction(nextExtraction);
    } catch (requestError) {
      if (!silent) {
        setError(requestError.response?.data?.message || requestError.message || 'Unable to load this extraction result.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadExtraction();
  }, [loadExtraction]);

  useEffect(() => {
    const status = String(extraction?.status || '').toUpperCase();
    if (!ACTIVE_STATUSES.has(status)) return undefined;

    const timer = window.setInterval(() => loadExtraction({ silent: true }), 2500);
    return () => window.clearInterval(timer);
  }, [extraction?.status, loadExtraction]);

  const status = String(extraction?.status || '').toUpperCase();
  const result = getExtractionResult(extraction);
  const hasResult = result && typeof result === 'object' && Object.keys(result).length > 0;
  const isActive = ACTIVE_STATUSES.has(status);
  const documentName = extraction?.documentName || extraction?.document?.name || extraction?.document?.originalName || extraction?.result?.meta?.documentName || 'Selected document';

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/documents" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600">
            <ArrowLeft size={14} /> Back to documents
          </Link>
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            <FileText size={16} /> Information Extraction
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Document findings</h1>
          <p className="mt-1 text-sm text-slate-500">Structured findings grounded only in {documentName}.</p>
        </div>
        <Button variant="outline" size="sm" leftIcon={RefreshCw} onClick={() => loadExtraction()} disabled={loading || isActive}>
          Refresh
        </Button>
      </div>

      {loading && !extraction ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading extraction result...</div>
      ) : error && !extraction ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <AlertCircle size={22} className="mx-auto text-rose-600" />
          <h2 className="mt-3 text-sm font-bold text-rose-900">Unable to load extraction</h2>
          <p className="mt-1 text-sm text-rose-700">{error}</p>
          <Button className="mt-4" size="sm" onClick={() => loadExtraction()}>Try again</Button>
        </div>
      ) : extraction ? (
        <>
          {isActive && <ExtractionProgress extraction={extraction} />}
          {status === 'FAILED' && <ExtractionProgress extraction={extraction} />}
          {status === 'COMPLETED' || hasResult ? <ExtractionResultsView extraction={extraction} /> : null}
          {error && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              The latest status update could not be retrieved. {error}
            </p>
          )}
        </>
      ) : null}

      {status === 'FAILED' && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => navigate('/documents')}>Choose another extraction</Button>
        </div>
      )}
    </div>
  );
};

export default ExtractionResults;
