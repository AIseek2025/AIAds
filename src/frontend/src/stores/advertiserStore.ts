import { create } from 'zustand';
import type { Advertiser } from '../types';

interface AdvertiserStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalSpent: number;
  totalViews: number;
  totalClicks: number;
  totalConversions: number;
}

interface AdvertiserState {
  // State
  advertiser: Advertiser | null;
  stats: AdvertiserStats | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAdvertiser: (advertiser: Advertiser) => void;
  setStats: (stats: AdvertiserStats) => void;
  updateBalance: (balance: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  refreshAdvertiser: () => void;
}

export const useAdvertiserStore = create<AdvertiserState>((set, get) => ({
  // Initial state
  advertiser: null,
  stats: null,
  isLoading: false,
  error: null,

  // Actions
  setAdvertiser: (advertiser) => set({ advertiser }),

  setStats: (stats) => set({ stats }),

  updateBalance: (balance) =>
    set((state) => ({
      advertiser: state.advertiser
        ? { ...state.advertiser, walletBalance: balance }
        : null,
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  refreshAdvertiser: () => {
    // This will be called when data needs to be refreshed
    // Actual API call will be made in the component using React Query
    set({ isLoading: true });
  },
}));

export default useAdvertiserStore;
