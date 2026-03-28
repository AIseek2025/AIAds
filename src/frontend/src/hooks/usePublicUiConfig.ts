import { useQuery } from '@tanstack/react-query';
import { publicApi, publicUiConfigQueryKey } from '../services/publicApi';

const STALE_MS = 5 * 60 * 1000;

/** 与 GET /public/ui-config 一致；多页共享 React Query 缓存 */
export function usePublicUiConfig() {
  return useQuery({
    queryKey: publicUiConfigQueryKey,
    queryFn: publicApi.getUiConfig,
    staleTime: STALE_MS,
    retry: 1,
  });
}

export function budgetUtilizationRatio(budget: number, spent: number): number {
  const b = Number(budget) || 0;
  if (b <= 0) return 0;
  return (Number(spent) || 0) / b;
}

export function isBudgetAtOrAboveRisk(
  budget: number,
  spent: number,
  threshold: number
): boolean {
  return budgetUtilizationRatio(budget, spent) >= threshold;
}
