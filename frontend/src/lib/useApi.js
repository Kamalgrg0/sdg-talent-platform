import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

/**
 * Small data-fetching hook for read-only API calls.
 *
 * Passing a falsy URL disabled fetching, which lets pages depend on a route
 * param or on data that arrives later without branching in every component.
 */
export function useApi(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState(null);
  const sequence = useRef(0);

  const reload = useCallback(
    async (options = {}) => {
      if (!url) {
        setData(null);
        setLoading(false);
        setError(null);
        return null;
      }
      const run = sequence.current + 1;
      sequence.current = run;
      setLoading(true);
      setError(null);
      try {
        const payload = await api.get(url, options.params);
        if (sequence.current === run) setData(payload);
        return payload;
      } catch (err) {
        if (sequence.current === run) {
          setError(err);
          setData(null);
        }
        return null;
      } finally {
        if (sequence.current === run) setLoading(false);
      }
    },
    [url]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}
