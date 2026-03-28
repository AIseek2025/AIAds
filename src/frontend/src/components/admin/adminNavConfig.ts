import type { ComponentType } from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import StorefrontIcon from '@mui/icons-material/Storefront';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import CampaignIcon from '@mui/icons-material/Campaign';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SettingsIcon from '@mui/icons-material/Settings';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import GroupsIcon from '@mui/icons-material/Groups';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { ADMIN_ROUTE_SEG, pathAdmin } from '../../constants/appPaths';

export type AdminNavIcon = ComponentType<{ fontSize?: 'small' | 'medium' | 'large' }>;

/** 管理端侧栏与内容区 Hub 共用：顺序、path、图标一致；文案可区分长短。 */
export const ADMIN_APP_NAV_ITEMS: readonly {
  path: string;
  hubLabel: string;
  sidebarLabel: string;
  Icon: AdminNavIcon;
}[] = [
  { path: pathAdmin(ADMIN_ROUTE_SEG.dashboard), hubLabel: '数据看板', sidebarLabel: '数据看板', Icon: DashboardIcon },
  {
    path: pathAdmin(ADMIN_ROUTE_SEG.notifications),
    hubLabel: '运营待办',
    sidebarLabel: '运营待办',
    Icon: NotificationsIcon,
  },
  { path: pathAdmin(ADMIN_ROUTE_SEG.users), hubLabel: '用户管理', sidebarLabel: '用户管理', Icon: PeopleIcon },
  {
    path: pathAdmin(ADMIN_ROUTE_SEG.advertisers),
    hubLabel: '广告主',
    sidebarLabel: '广告主管理',
    Icon: StorefrontIcon,
  },
  { path: pathAdmin(ADMIN_ROUTE_SEG.kols), hubLabel: 'KOL 库', sidebarLabel: 'KOL 库', Icon: GroupsIcon },
  { path: pathAdmin(ADMIN_ROUTE_SEG.kolReview), hubLabel: 'KOL 审核', sidebarLabel: 'KOL 审核', Icon: VerifiedUserIcon },
  {
    path: pathAdmin(ADMIN_ROUTE_SEG.contentReview),
    hubLabel: '内容审核',
    sidebarLabel: '内容审核',
    Icon: FactCheckIcon,
  },
  { path: pathAdmin(ADMIN_ROUTE_SEG.campaigns), hubLabel: '活动管理', sidebarLabel: '活动管理', Icon: CampaignIcon },
  {
    path: pathAdmin(ADMIN_ROUTE_SEG.campaignAnomalies),
    hubLabel: '活动异常',
    sidebarLabel: '活动异常',
    Icon: WarningAmberIcon,
  },
  { path: pathAdmin(ADMIN_ROUTE_SEG.orders), hubLabel: '订单管理', sidebarLabel: '订单管理', Icon: ReceiptLongIcon },
  { path: pathAdmin(ADMIN_ROUTE_SEG.finance), hubLabel: '财务管理', sidebarLabel: '财务管理', Icon: AccountBalanceIcon },
  { path: pathAdmin(ADMIN_ROUTE_SEG.stats), hubLabel: '数据统计', sidebarLabel: '数据统计', Icon: AnalyticsIcon },
  {
    path: pathAdmin(ADMIN_ROUTE_SEG.inviteCodes),
    hubLabel: '邀请码',
    sidebarLabel: '注册邀请码',
    Icon: VpnKeyIcon,
  },
  { path: pathAdmin(ADMIN_ROUTE_SEG.settings), hubLabel: '系统设置', sidebarLabel: '系统设置', Icon: SettingsIcon },
];

/** 侧栏高亮：列表页精确匹配；详情等子路由视为所属模块激活（数据看板根不向下匹配）。 */
export function isAdminNavRouteActive(pathname: string, itemPath: string): boolean {
  if (pathname === itemPath) return true;
  if (itemPath === pathAdmin(ADMIN_ROUTE_SEG.dashboard)) return false;
  return pathname.startsWith(`${itemPath}/`);
}

/** Hub 顶栏：仅在模块列表首页隐藏对应按钮，避免自链。 */
export function filterAdminHubNavItems<
  T extends { path: string },
>(pathname: string, items: readonly T[]): T[] {
  return items.filter((item) => pathname !== item.path);
}
