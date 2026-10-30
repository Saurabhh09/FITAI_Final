import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { useAuth } from "../auth/auth-context";
import {
  getTomorrowISO,
  getYesterdayISO,
  todayISO,
} from "./dashboard-domain";
import {
  fetchDashboardData,
  type MobileDashboardData,
} from "./dashboard-service";

export type NutritionDashboardHook = {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  data: MobileDashboardData | null;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  goToToday: () => void;
  refetch: () => Promise<void>;
};

export function useNutritionDashboard(initialDate: string = todayISO()): NutritionDashboardHook {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MobileDashboardData | null>(null);

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
        const res = await fetchDashboardData(client, user.id, selectedDate);

        if (!res.ok) {
          setError(res.error);
          setData(null);
        } else {
          setData(res.data);
          setError(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, selectedDate]
  );

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const refetch = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  const handleSetSelectedDate = useCallback((date: string) => {
    const today = todayISO();
    if (date > today) return; // Block selecting future dates
    setSelectedDate(date);
  }, []);

  const goToPreviousDay = useCallback(() => {
    setSelectedDate((current) => getYesterdayISO(current));
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate((current) => {
      const tomorrow = getTomorrowISO(current);
      return tomorrow > todayISO() ? current : tomorrow;
    });
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(todayISO());
  }, []);

  return {
    loading,
    refreshing,
    error,
    data,
    selectedDate,
    setSelectedDate: handleSetSelectedDate,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    refetch,
  };
}
