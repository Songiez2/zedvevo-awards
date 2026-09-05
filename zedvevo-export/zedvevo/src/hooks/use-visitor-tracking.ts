import { useEffect, useState } from 'react';
import { logVisit, getTodayVisitorCount } from '@/lib/api';
import { supabase } from '@/db/supabase';

/**
 * Records a visitor log entry on mount and subscribes to Supabase Realtime
 * to keep today's live visitor count up-to-date.
 * Returns { todayCount } for any component that wants to display it.
 */
export function useVisitorTracking(page: string) {
  const [todayCount, setTodayCount] = useState<number>(0);

  useEffect(() => {
    // Log this visit
    logVisit(page).catch(() => {});

    // Fetch initial count
    getTodayVisitorCount()
      .then(setTodayCount)
      .catch(() => {});

    // Realtime subscription — increment count on every new visitor_logs row
    const channel = supabase
      .channel('visitor-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'visitor_logs' },
        () => {
          setTodayCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [page]);

  return { todayCount };
}
