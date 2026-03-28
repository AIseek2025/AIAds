import React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export type AdvertiserBudgetRiskDashboardItem = {
  id: string;
  title: string;
  budget: number;
  spentAmount?: number;
};

type DashboardMode = {
  mode: 'dashboard';
  budgetRiskTh: number;
  campaigns: AdvertiserBudgetRiskDashboardItem[];
  formatCurrency: (value: number) => string;
  onViewCampaign: (campaignId: string) => void;
  /** 列表最多展示条数，默认 5 */
  maxItems?: number;
};

type AnalyticsMode = {
  mode: 'analytics';
  budgetRiskTh: number;
  atRiskCount: number;
};

export type AdvertiserBudgetRiskBannerProps = DashboardMode | AnalyticsMode;

/**
 * 活动预算占用 ≥ 运营阈值时的统一预警（仪表盘列表 / 数据分析摘要）。
 */
export function AdvertiserBudgetRiskBanner(props: AdvertiserBudgetRiskBannerProps): React.ReactElement | null {
  if (props.mode === 'analytics') {
    const { budgetRiskTh, atRiskCount } = props;
    if (atRiskCount <= 0) return null;
    return (
      <Alert severity="warning" sx={{ mb: 3 }}>
        有 {atRiskCount} 个活动在本页样本中已达到预算风险线（已消耗 ≥
        {Math.round(budgetRiskTh * 100)}%），与活动列表「占用率」预警一致，请在活动管理中关注或调整预算。
      </Alert>
    );
  }

  const { budgetRiskTh, campaigns, formatCurrency, onViewCampaign, maxItems = 5 } = props;
  if (campaigns.length === 0) return null;

  return (
    <Alert severity="warning" sx={{ mb: 3 }}>
      <Typography variant="body2" fontWeight={600} gutterBottom>
        预算占用偏高（进行中活动已消耗 ≥{Math.round(budgetRiskTh * 100)}% 预算，与运营预警阈值一致）
      </Typography>
      <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
        {campaigns.slice(0, maxItems).map((c) => {
          const ratio = c.budget > 0 ? Math.round(((c.spentAmount ?? 0) / c.budget) * 100) : 0;
          return (
            <Typography key={c.id} component="li" variant="body2">
              「{c.title}」已用 {formatCurrency(c.spentAmount ?? 0)} / {formatCurrency(c.budget)}（约 {ratio}%）
              <Button size="small" sx={{ ml: 1 }} onClick={() => onViewCampaign(c.id)}>
                查看活动
              </Button>
            </Typography>
          );
        })}
      </Stack>
      {campaigns.length > maxItems && (
        <Typography variant="caption" color="text.secondary">
          另有 {campaigns.length - maxItems} 个活动，请在活动管理查看全部。
        </Typography>
      )}
    </Alert>
  );
}
