import React from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ViewListIcon from '@mui/icons-material/ViewList';
import CampaignIcon from '@mui/icons-material/Campaign';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import PaymentsIcon from '@mui/icons-material/Payments';
import PeopleIcon from '@mui/icons-material/People';
import NotificationsIcon from '@mui/icons-material/Notifications';
import RefreshIcon from '@mui/icons-material/Refresh';
import { ADVERTISER_ROUTE_SEG, pathAdvertiser } from '../../constants/appPaths';

export type AdvertiserHubNavPreset =
  | 'full'
  | 'kol-discovery'
  | 'campaign-detail'
  /** 充值与流水页：不展示「充值与流水」自链，补充「订单中心」 */
  | 'recharge-page'
  /** 数据分析页：不展示「数据分析」自链，补充「订单中心」 */
  | 'analytics-page'
  /** 广告主仪表盘：不展示「仪表板」自链；含活动列表、订单中心（与 Dashboard 顶栏一致） */
  | 'dashboard-page'
  /** 创建/编辑活动：不展示「KOL 发现」；含仪表板、活动列表、订单中心等 */
  | 'campaign-wizard'
  /** 活动列表页：不展示「活动列表」自链；含仪表板、订单中心及全站入口（与 Dashboard 同宽） */
  | 'campaign-list-page'
  /** 订单中心列表：不展示「订单中心」自链；含仪表板、活动列表及全站入口 */
  | 'orders-page'
  /** 订单详情：与创建活动同级中间区（活动列表+订单中心），含 KOL 发现 */
  | 'order-detail'
  /** 通知中心：不展示「通知中心」自链 */
  | 'notifications-page';

export interface AdvertiserHubNavProps {
  onRefresh?: () => void;
  preset?: AdvertiserHubNavPreset;
}

/**
 * 广告主端内容区顶部快捷导航，与列表/详情页常用入口一致，支持当前页数据刷新。
 */
export const AdvertiserHubNav: React.FC<AdvertiserHubNavProps> = ({
  onRefresh,
  preset = 'full',
}) => {
  const navigate = useNavigate();

  const showAnalytics = preset !== 'analytics-page';
  const showPayments = preset !== 'recharge-page';
  const showOrdersAfterCampaigns = preset === 'recharge-page' || preset === 'analytics-page';
  const showDashboard = preset !== 'dashboard-page';
  const showKolDiscovery = preset !== 'kol-discovery' && preset !== 'campaign-wizard';
  const dashboardLikeNav =
    preset === 'dashboard-page' ||
    preset === 'campaign-wizard' ||
    preset === 'order-detail';
  const isCampaignListPage = preset === 'campaign-list-page';
  const isOrdersPage = preset === 'orders-page';
  const showNotificationsLink = preset !== 'notifications-page';

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 1,
        maxWidth: '100%',
      }}
    >
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        {showDashboard ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<DashboardIcon />}
            onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.dashboard))}
          >
            仪表板
          </Button>
        ) : null}

        {showNotificationsLink ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<NotificationsIcon />}
            onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.notifications))}
          >
            通知中心
          </Button>
        ) : null}

        {preset === 'kol-discovery' ? (
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<CampaignIcon />}
              onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.campaigns))}
            >
              活动管理
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ReceiptLongIcon />}
              onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.orders))}
            >
              订单中心
            </Button>
          </>
        ) : preset === 'campaign-detail' ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<ReceiptLongIcon />}
            onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.orders))}
          >
            订单中心
          </Button>
        ) : isCampaignListPage ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<ReceiptLongIcon />}
            onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.orders))}
          >
            订单中心
          </Button>
        ) : isOrdersPage ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<ViewListIcon />}
            onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.campaigns))}
          >
            活动列表
          </Button>
        ) : dashboardLikeNav ? (
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ViewListIcon />}
              onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.campaigns))}
            >
              活动列表
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ReceiptLongIcon />}
              onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.orders))}
            >
              订单中心
            </Button>
          </>
        ) : (
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ViewListIcon />}
              onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.campaigns))}
            >
              活动列表
            </Button>
            {showOrdersAfterCampaigns ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<ReceiptLongIcon />}
                onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.orders))}
              >
                订单中心
              </Button>
            ) : null}
          </>
        )}

        {showAnalytics ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AnalyticsIcon />}
            onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.analytics))}
          >
            数据分析
          </Button>
        ) : null}

        {showPayments ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<PaymentsIcon />}
            onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.recharge))}
          >
            充值与流水
          </Button>
        ) : null}

        {showKolDiscovery ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<PeopleIcon />}
            onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.kols))}
          >
            KOL 发现
          </Button>
        ) : null}

        {onRefresh ? (
          <IconButton onClick={onRefresh} color="primary" aria-label="刷新当前页数据">
            <RefreshIcon />
          </IconButton>
        ) : null}
      </Stack>
    </Box>
  );
};
