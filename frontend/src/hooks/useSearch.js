import { useState } from 'react';
import { searchApi } from '../services/searchApi';

export const useSearch = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = async (query, params) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await searchApi.search(query, params);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, error, search };
};
