import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { absenceApi } from '@features/absences/api/absence.api';
import type { Absence, AbsenceType } from '@features/absences/types/absence.types';

export interface AbsenceLookupEntry {
  absence: Absence;
  type: AbsenceType;
}

/** Map key format: "userId-YYYY-MM-DD" (same as grid cellKey) */
export type AbsenceLookupMap = Map<string, AbsenceLookupEntry>;

interface UseScheduleAbsencesParams {
  userIds: number[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  enabled?: boolean;
}

export const useScheduleAbsences = ({
  userIds,
  startDate,
  endDate,
  enabled = true,
}: UseScheduleAbsencesParams) => {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  // Stable string for userIds dependency
  const userIdsKey = userIds.join(',');
  const userIdSetRef = useRef<Set<number>>(new Set());
  userIdSetRef.current = new Set(userIds);

  useEffect(() => {
    if (!enabled || userIds.length === 0 || !startDate || !endDate) {
      setAbsences([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    absenceApi
      .getAbsences(
        { start_date: startDate, end_date: endDate },
        { limit: 1000, offset: 0 },
      )
      .then((response) => {
        if (!cancelled) {
          const userIdSet = userIdSetRef.current;
          setAbsences(
            response.absences.filter((a) => userIdSet.has(a.user_id)),
          );
        }
      })
      .catch((err) => {
        console.error('Failed to load absences for schedule grid:', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userIdsKey, startDate, endDate, enabled, fetchTrigger]);

  // Expand absence date ranges into per-day lookup map
  const absenceMap: AbsenceLookupMap = useMemo(() => {
    const map: AbsenceLookupMap = new Map();

    for (const absence of absences) {
      const start = new Date(absence.start_date);
      const end = new Date(absence.end_date);
      const current = new Date(start);

      while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        const key = `${absence.user_id}-${y}-${m}-${d}`;
        map.set(key, { absence, type: absence.type });
        current.setDate(current.getDate() + 1);
      }
    }

    return map;
  }, [absences]);

  const refresh = useCallback(() => {
    setFetchTrigger((prev) => prev + 1);
  }, []);

  return { absenceMap, isLoading, refresh };
};
