'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useBatches } from '@/hooks/useAcademic';
import { useAllSubjectOfferings } from '@/hooks/useGradebook';
import {
  EMPTY_SELECTION,
  TeachingSelection,
  resolveSelection,
  selectionFromParams,
  selectionToParams,
} from '@/lib/teaching-context';
import { currentQuery, replaceQuery } from '@/lib/url-query';

interface Options {
  /** Offering ids the page has data for (e.g. draft assessments); used only to pick the default batch. */
  prefer?: number[];
  /** Keep the selection in the URL (`?batch=&sem=&class=`). Pages that sit in a tab or a dialog pass false. */
  syncUrl?: boolean;
}

/**
 * Batch → Semester → Class state for STAFF pages (contract §G). The options are the signed-in staff member's
 * own offerings. Invalid or missing choices resolve to defaults (current semester, all my classes).
 */
export function useTeachingSelection({ prefer, syncUrl = true }: Options = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const offerings = useAllSubjectOfferings();
  const batches = useBatches();
  const [local, setLocal] = useState<TeachingSelection>(EMPTY_SELECTION);

  const rows = useMemo(() => offerings.data ?? [], [offerings.data]);
  const wanted = syncUrl ? selectionFromParams(new URLSearchParams(searchParams.toString())) : local;
  const preferKey = prefer?.join(',') ?? '';
  const selection = useMemo(
    () => resolveSelection(wanted, rows, batches.data, prefer),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `prefer` is compared by value via preferKey
    [wanted.batchId, wanted.semester, wanted.offeringId, rows, batches.data, preferKey],
  );

  const setSelection = useCallback(
    (next: TeachingSelection) => {
      if (!syncUrl) {
        setLocal(next);
        return;
      }
      // Start from the latest URL, not the last render's params, so two quick changes don't undo each other.
      const base = currentQuery(pathname);
      base.delete('offering');
      replaceQuery(router, pathname, selectionToParams(next, base));
    },
    [syncUrl, router, pathname],
  );

  return {
    rows,
    batches: batches.data,
    selection,
    setSelection,
    // Batches only label options; the selector still works if /batches fails.
    isLoading: offerings.isLoading,
    isError: offerings.isError,
    error: offerings.error,
  };
}
