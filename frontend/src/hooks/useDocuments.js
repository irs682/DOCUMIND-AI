import { useState, useEffect } from 'react';
import { documentApi } from '../services/documentApi';

export const useDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDocuments = async (params) => {
    setLoading(true);
    try {
      const { data } = await documentApi.getAll(params);
      setDocuments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, []);

  return { documents, loading, error, fetchDocuments };
};
