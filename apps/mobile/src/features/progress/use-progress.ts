import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { useAuth } from "../auth/auth-context";
import { todayISO } from "../dashboard/dashboard-domain";
import {
  fetchProgressData,
  type ProgressScreenData,
} from "./progress-service";

export type UseProgressReturn = {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  data: ProgressScreenData | null;
  refetch: () => Promise<void>;
};

export function useProgress(): UseProgressReturn {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProgressScreenData | null>(null);

  const loadData = useCallback(
    async (isManualRefresh: boolean = false) => {
      if (!user) {
        setLoading(false);
        return;
      }

      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const client = getSupabase();
        const res = await fetchProgressData(client, user.id, todayISO());

        if (!res.ok) {
          setError(res.error);
        } else {
          setData(res.data);
          setError(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load progress data.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const refetch = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  return {
    loading,
    refreshing,
    error,
    data,
    refetch,
  };
}
