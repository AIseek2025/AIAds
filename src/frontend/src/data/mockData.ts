// Mock data for admin modules (for demo purposes)

import type {
  AdvertiserListItem,
  AdvertiserDetail,
  CampaignListItem,
  CampaignDetail,
  OrderListItem,
  OrderDetail,
  DashboardStats,
} from '../types';

// Mock Advertisers
export const mockAdvertisers: AdvertiserListItem[] = [
  {
    id: '1',
    companyName: '深圳科技有限公司',
    contactName: '张三',
    contactEmail: 'contact@sztech.com',
    contactPhone: '13800138000',
    industry: '科技',
    balance: 50000,
    status: 'active',
    verificationStatus: 'verified',
    registeredAt: '2026-02-15T10:00:00Z',
  },
  {
    id: '2',
    companyName: '广州贸易公司',
    contactName: '李四',
    contactEmail: 'info@gztrade.com',
    contactPhone: '13900139000',
    industry: '贸易',
    balance: 30000,
    status: 'active',
    verificationStatus: 'verified',
    registeredAt: '2026-03-01T10:00:00Z',
  },
  {
    id: '3',
    companyName: '北京文化传媒',
    contactName: '王五',
    contactEmail: 'hello@bjmedia.com',
    contactPhone: '13700137000',
    industry: '文化传媒',
    balance: 80000,
    status: 'active',
    verificationStatus: 'pending',
    registeredAt: '2026-03-10T10:00:00Z',
  },
];

// Mock Campaigns
export const mockCampaigns: CampaignListItem[] = [
  {
    id: '1',
    title: '夏季促销活动',
    advertiserName: '深圳科技有限公司',
    industry: '科技',
    budget: 5000,
    status: 'active',
    kolCount: 10,
    createdAt: '2026-03-20T10:00:00Z',
  },
  {
    id: '2',
    title: '新品发布推广',
    advertiserName: '广州贸易公司',
    industry: '贸易',
    budget: 8000,
    status: 'pending',
    kolCount: 15,
    createdAt: '2026-03-22T10:00:00Z',
  },
  {
    id: '3',
    title: '品牌知名度提升',
    advertiserName: '北京文化传媒',
    industry: '文化传媒',
    budget: 12000,
    status: 'completed',
    kolCount: 20,
    createdAt: '2026-03-15T10:00:00Z',
  },
];

// Mock Orders
export const mockOrders: OrderListItem[] = [
  {
    id: '1',
    orderNo: 'ORD-20260320-001',
    campaignName: '夏季促销活动',
    kolName: '@fashion_guru',
    platform: 'tiktok',
    amount: 500,
    status: 'completed',
    createdAt: '2026-03-20T10:00:00Z',
  },
  {
    id: '2',
    orderNo: 'ORD-20260321-002',
    campaignName: '新品发布推广',
    kolName: '@tech_reviewer',
    platform: 'youtube',
    amount: 800,
    status: 'in_progress',
    createdAt: '2026-03-21T10:00:00Z',
  },
  {
    id: '3',
    orderNo: 'ORD-20260322-003',
    campaignName: '品牌知名度提升',
    kolName: '@lifestyle_blog',
    platform: 'instagram',
    amount: 600,
    status: 'pending',
    createdAt: '2026-03-22T10:00:00Z',
  },
];

// Mock Stats
export const mockDashboardStats: DashboardStats = {
  totalUsers: 10520,
  totalAdvertisers: 2150,
  totalKols: 8200,
  totalCampaigns: 1580,
  totalGmv: 5280000,
  totalRevenue: 792000,
  activeUsers: 8500,
  pendingReviews: 156,
};
