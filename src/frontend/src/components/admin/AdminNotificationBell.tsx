import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { styled } from '@mui/material/styles';
import { adminDashboardAPI } from '../../services/adminApi';
import { ADMIN_ROUTE_SEG, pathAdmin, pathAdminFinanceWithdrawals } from '../../constants/appPaths';

const ActionButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text.secondary,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

function formatCurrency(n: number): string {
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * 管理端顶栏：运营待办聚合（来自 dashboard/stats 真实计数）
 */
export function AdminNotificationBell(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const { data: stats } = useQuery({
    queryKey: ['adminDashboardStats'],
    queryFn: () => adminDashboardAPI.getStats({ period: 'today' }),
    refetchInterval: 120_000,
  });

  const pendingCampaign = stats?.campaigns?.pendingReview ?? 0;
  const pendingKol = stats?.kol?.pendingVerification ?? 0;
  const pendingContent = stats?.content?.pendingReview ?? 0;
  const pendingWdCount = stats?.finance?.pendingWithdrawalCount ?? 0;
  const pendingWdAmount = stats?.finance?.pendingWithdrawals ?? 0;
  const pendingDisputes = stats?.orders?.pendingDisputes ?? 0;
  const budgetRiskCount = stats?.campaigns?.budgetRiskCount ?? 0;

  const total =
    pendingCampaign + pendingKol + pendingContent + pendingWdCount + pendingDisputes + budgetRiskCount;

  const close = () => setAnchorEl(null);

  const itemRow = (
    title: string,
    subtitle: string,
    count: number,
    color: string,
    onNavigate: () => void
  ) => (
    <MenuItem
      onClick={() => {
        close();
        onNavigate();
      }}
      sx={{ py: 1.5, px: 2 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, width: '100%' }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, mt: 0.5 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" fontWeight="medium">
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
        <Chip label={count} size="small" color="error" />
      </Box>
    </MenuItem>
  );

  return (
    <>
      <ActionButton aria-label="运营待办" onClick={(e) => setAnchorEl(e.currentTarget)}>
        <Badge badgeContent={total > 99 ? '99+' : total} color="error" invisible={total === 0}>
          <NotificationsIcon />
        </Badge>
      </ActionButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={close}
        PaperProps={{
          elevation: 3,
          sx: { minWidth: 320, maxWidth: 420, mt: 1 },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="body1" fontWeight="bold">
            运营待办
          </Typography>
          <Typography
            variant="body2"
            color="primary"
            sx={{ cursor: 'pointer', fontSize: '0.75rem' }}
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
            }}
          >
            刷新
          </Typography>
        </Box>
        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {pendingCampaign > 0 &&
            itemRow(
              '待审核活动',
              `${pendingCampaign} 个活动待平台审核`,
              pendingCampaign,
              '#1976D2',
              () => navigate(pathAdmin(ADMIN_ROUTE_SEG.campaigns))
            )}
          {pendingKol > 0 &&
            itemRow(
              '待审核 KOL',
              `${pendingKol} 个账号待审核`,
              pendingKol,
              '#ED6C02',
              () => navigate(pathAdmin(ADMIN_ROUTE_SEG.kolReview))
            )}
          {pendingContent > 0 &&
            itemRow(
              '待审核内容',
              `${pendingContent} 条内容待审核`,
              pendingContent,
              '#9C27B0',
              () => navigate(pathAdmin(ADMIN_ROUTE_SEG.contentReview))
            )}
          {pendingDisputes > 0 &&
            itemRow(
              '纠纷待办',
              `${pendingDisputes} 笔未结案纠纷工单`,
              pendingDisputes,
              '#b71c1c',
              () => navigate(`${pathAdmin(ADMIN_ROUTE_SEG.orders)}?tab=disputes`)
            )}
          {budgetRiskCount > 0 &&
            itemRow(
              '预算占用预警',
              `${budgetRiskCount} 个活动达到消耗/预算阈值`,
              budgetRiskCount,
              '#f57c00',
              () => navigate(`${pathAdmin(ADMIN_ROUTE_SEG.campaigns)}#budget-risk`)
            )}
          {pendingWdCount > 0 &&
            itemRow(
              '待处理提现',
              `${pendingWdCount} 笔，合计 ${formatCurrency(pendingWdAmount)}`,
              pendingWdCount,
              '#2E7D32',
              () => navigate(pathAdminFinanceWithdrawals())
            )}
          {total === 0 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                暂无待办
              </Typography>
            </Box>
          )}
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            close();
            navigate(pathAdmin(ADMIN_ROUTE_SEG.notifications));
          }}
        >
          <Typography variant="body2" color="primary" sx={{ width: '100%', textAlign: 'center' }}>
            查看运营待办中心
          </Typography>
        </MenuItem>
      </Menu>
    </>
  );
}
