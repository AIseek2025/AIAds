import React from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TaskIcon from '@mui/icons-material/Task';
import PeopleIcon from '@mui/icons-material/People';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PersonIcon from '@mui/icons-material/Person';
import LinkIcon from '@mui/icons-material/Link';
import NotificationsIcon from '@mui/icons-material/Notifications';
import RefreshIcon from '@mui/icons-material/Refresh';
import { KOL_ROUTE_SEG, pathKol } from '../../constants/appPaths';

export type KolHubExploreLink = 'task-market' | 'my-tasks';

export type KolHubNavPreset =
  /** 任务广场 / 我的任务列表与详情：二选一互斥入口 */
  | 'default'
  /** 收益管理页：双入口 + 经营分析，不含「收益管理」自链 */
  | 'earnings-page'
  /** 经营分析页：双入口 + 收益管理，不含「经营分析」自链 */
  | 'analytics-page'
  /** 账号绑定页：双入口 + 经营分析 + 收益 + 个人资料 */
  | 'accounts'
  /** KOL 仪表盘：不展示「仪表板」自链；双入口 + 经营分析 + 收益 + 个人资料 */
  | 'dashboard-page'
  /** 个人资料页：不展示「个人资料」自链；双入口 + 经营分析 + 收益 + 账号绑定 */
  | 'profile-page'
  /** 任务广场列表：不展示「任务广场」自链；单链「我的任务」+ 经营分析 + 收益 + 个人资料 */
  | 'task-market-page'
  /** 我的任务列表：不展示「我的任务」自链；单链「任务广场」+ 经营分析 + 收益 + 个人资料 */
  | 'my-tasks-page'
  /** 通知中心：不展示「通知中心」自链 */
  | 'notifications-page';

export interface KolHubNavProps {
  onRefresh?: () => void;
  preset?: KolHubNavPreset;
  /**
   * 仅 `preset` 为 `default`（或未指定 preset）时使用：任务广场详情突出「我的任务」，反之亦然。
   */
  exploreLink?: KolHubExploreLink;
}

/**
 * KOL 端内容区顶部快捷导航，与任务/订单详情常用入口一致。
 */
export const KolHubNav: React.FC<KolHubNavProps> = ({
  onRefresh,
  preset = 'default',
  exploreLink,
}) => {
  const navigate = useNavigate();

  const showAnalytics = preset !== 'analytics-page';
  const showEarnings = preset !== 'earnings-page';
  const showDashboard = preset !== 'dashboard-page';
  const showNotificationsLink = preset !== 'notifications-page';

  const dualExplore = (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<PeopleIcon />}
        onClick={() => navigate(pathKol(KOL_ROUTE_SEG.taskMarket))}
      >
        任务广场
      </Button>
      <Button
        size="small"
        variant="outlined"
        startIcon={<TaskIcon />}
        onClick={() => navigate(pathKol(KOL_ROUTE_SEG.myTasks))}
      >
        我的任务
      </Button>
    </>
  );

  const singleExplore =
    exploreLink === 'my-tasks'
      ? {
          label: '我的任务',
          path: pathKol(KOL_ROUTE_SEG.myTasks),
          Icon: TaskIcon,
        }
      : {
          label: '任务广场',
          path: pathKol(KOL_ROUTE_SEG.taskMarket),
          Icon: PeopleIcon,
        };

  const ExploreIcon = singleExplore.Icon;

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
            onClick={() => navigate(pathKol(KOL_ROUTE_SEG.dashboard))}
          >
            仪表板
          </Button>
        ) : null}

        {showNotificationsLink ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<NotificationsIcon />}
            onClick={() => navigate(pathKol(KOL_ROUTE_SEG.notifications))}
          >
            通知中心
          </Button>
        ) : null}

        {preset === 'default' ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<ExploreIcon />}
            onClick={() => navigate(singleExplore.path)}
          >
            {singleExplore.label}
          </Button>
        ) : (
          dualExplore
        )}

        {showAnalytics ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AnalyticsIcon />}
            onClick={() => navigate(pathKol(KOL_ROUTE_SEG.analytics))}
          >
            经营分析
          </Button>
        ) : null}

        {showEarnings ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AttachMoneyIcon />}
            onClick={() => navigate(pathKol(KOL_ROUTE_SEG.earnings))}
          >
            收益管理
          </Button>
        ) : null}

        {preset === 'accounts' ||
        preset === 'dashboard-page' ||
        preset === 'task-market-page' ||
        preset === 'my-tasks-page' ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<PersonIcon />}
            onClick={() => navigate(pathKol(KOL_ROUTE_SEG.profile))}
          >
            个人资料
          </Button>
        ) : null}

        {preset === 'profile-page' ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<LinkIcon />}
            onClick={() => navigate(pathKol(KOL_ROUTE_SEG.accounts))}
          >
            账号绑定
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
