import type { ComponentType } from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import PeopleIcon from '@mui/icons-material/People';
import CampaignIcon from '@mui/icons-material/Campaign';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TaskIcon from '@mui/icons-material/Task';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import NotificationsIcon from '@mui/icons-material/Notifications';
import {
  ADVERTISER_ROUTE_SEG,
  KOL_ROUTE_SEG,
  pathAdvertiser,
  pathKol,
} from '../../constants/appPaths';

export type MainAppNavIcon = ComponentType<{ fontSize?: 'small' | 'medium' | 'large' }>;

export type MainAppRole = 'advertiser' | 'kol';

/** 与 `AppRouter` 中 `/advertiser/*`、`/kol/*` 及顶栏 Hub 图标语义一致 */
export const MAIN_APP_SIDEBAR_ITEMS: readonly {
  role: MainAppRole;
  path: string;
  label: string;
  Icon: MainAppNavIcon;
}[] = [
  { role: 'advertiser', path: pathAdvertiser(ADVERTISER_ROUTE_SEG.dashboard), label: '仪表板', Icon: DashboardIcon },
  {
    role: 'advertiser',
    path: pathAdvertiser(ADVERTISER_ROUTE_SEG.notifications),
    label: '通知中心',
    Icon: NotificationsIcon,
  },
  { role: 'advertiser', path: pathAdvertiser(ADVERTISER_ROUTE_SEG.campaigns), label: '活动管理', Icon: CampaignIcon },
  { role: 'advertiser', path: pathAdvertiser(ADVERTISER_ROUTE_SEG.orders), label: '订单中心', Icon: ReceiptLongIcon },
  { role: 'advertiser', path: pathAdvertiser(ADVERTISER_ROUTE_SEG.kols), label: 'KOL 发现', Icon: PeopleIcon },
  { role: 'advertiser', path: pathAdvertiser(ADVERTISER_ROUTE_SEG.analytics), label: '数据分析', Icon: AnalyticsIcon },
  {
    role: 'advertiser',
    path: pathAdvertiser(ADVERTISER_ROUTE_SEG.recharge),
    label: '充值与流水',
    Icon: AccountBalanceWalletIcon,
  },
  { role: 'kol', path: pathKol(KOL_ROUTE_SEG.dashboard), label: '仪表板', Icon: DashboardIcon },
  { role: 'kol', path: pathKol(KOL_ROUTE_SEG.notifications), label: '通知中心', Icon: NotificationsIcon },
  { role: 'kol', path: pathKol(KOL_ROUTE_SEG.profile), label: '我的资料', Icon: PersonIcon },
  { role: 'kol', path: pathKol(KOL_ROUTE_SEG.taskMarket), label: '任务广场', Icon: PeopleIcon },
  { role: 'kol', path: pathKol(KOL_ROUTE_SEG.myTasks), label: '我的任务', Icon: TaskIcon },
  { role: 'kol', path: pathKol(KOL_ROUTE_SEG.accounts), label: '账号绑定', Icon: AccountBalanceIcon },
  { role: 'kol', path: pathKol(KOL_ROUTE_SEG.earnings), label: '收益管理', Icon: AttachMoneyIcon },
  { role: 'kol', path: pathKol(KOL_ROUTE_SEG.analytics), label: '经营分析', Icon: AnalyticsIcon },
];

/**
 * 列表页精确匹配；带详情子路由的模块在 path 前缀下高亮（与 AppRouter 一致）。
 */
export const MAIN_APP_SIDEBAR_PREFIX_PATHS: readonly string[] = [
  pathAdvertiser(ADVERTISER_ROUTE_SEG.campaigns),
  pathAdvertiser(ADVERTISER_ROUTE_SEG.orders),
  pathAdvertiser(ADVERTISER_ROUTE_SEG.kols),
  pathKol(KOL_ROUTE_SEG.myTasks),
  pathKol(KOL_ROUTE_SEG.taskMarket),
];

export function isMainAppSidebarItemActive(pathname: string, itemPath: string): boolean {
  if (pathname === itemPath) return true;
  if (MAIN_APP_SIDEBAR_PREFIX_PATHS.includes(itemPath) && pathname.startsWith(`${itemPath}/`)) {
    return true;
  }
  return false;
}
