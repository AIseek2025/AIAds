import { create } from 'zustand';
import type { Campaign } from '../types';

interface CampaignFilters {
  status?: Campaign['status'];
  keyword?: string;
  objective?: Campaign['objective'];
  startDate?: string;
  endDate?: string;
}

interface CampaignState {
  // State
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  filters: CampaignFilters;
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;

  // Actions
  setCampaigns: (campaigns: Campaign[]) => void;
  setCurrentCampaign: (campaign: Campaign | null) => void;
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (id: string, campaign: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  setFilters: (filters: CampaignFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetFilters: () => void;
}

export const useCampaignStore = create<CampaignState>((set) => ({
  // Initial state
  campaigns: [],
  currentCampaign: null,
  filters: {},
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 20,

  // Actions
  setCampaigns: (campaigns) => set({ campaigns }),

  setCurrentCampaign: (campaign) => set({ currentCampaign: campaign }),

  addCampaign: (campaign) =>
    set((state) => ({
      campaigns: [campaign, ...state.campaigns],
      total: state.total + 1,
    })),

  updateCampaign: (id, campaignData) =>
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === id ? { ...c, ...campaignData } : c
      ),
      currentCampaign:
        state.currentCampaign?.id === id
          ? { ...state.currentCampaign, ...campaignData }
          : state.currentCampaign,
    })),

  deleteCampaign: (id) =>
    set((state) => ({
      campaigns: state.campaigns.filter((c) => c.id !== id),
      total: state.total - 1,
    })),

  setFilters: (filters) => set({ filters, page: 1 }),

  setPage: (page) => set({ page }),

  setPageSize: (pageSize) => set({ pageSize, page: 1 }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  resetFilters: () => set({ filters: {}, page: 1 }),
}));

export default useCampaignStore;
