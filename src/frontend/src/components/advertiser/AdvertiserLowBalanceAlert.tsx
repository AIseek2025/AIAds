import React from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import type { PublicUiConfig } from '../../services/publicApi';
import { ADVERTISER_ROUTE_SEG, pathAdvertiser } from '../../constants/appPaths';
import { getLowBalanceAlertCny, isAdvertiserLowBalance } from '../../utils/lowBalanceAlert';

const TAIL: Record<
  | 'dashboard'
  | 'analytics'
  | 'orders'
  | 'order-detail'
  | 'kol-discovery'
  | 'recharge'
  | 'campaign-wizard'
  | 'campaign-list'
  | 'campaign-detail',
  string
> = {
  dashboard: '可能影响新订单冻结与投放，请尽快充值。',
  analytics: '可能影响新订单冻结与投放。',
  orders: '可能影响新订单冻结与投放，请尽快充值。',
  'order-detail': '可能影响后续合作冻结；建议充值后再扩大投放。',
  'kol-discovery': '发起合作前建议先充值，以免冻结失败。',
  recharge: '充值后可提升可用额度并降低投放中断风险。',
  'campaign-wizard': '提交活动并产生合作订单时需可用余额，建议先充值以免冻结失败。',
  'campaign-list': '活动预算与新建订单冻结均依赖可用余额，请尽快充值。',
  'campaign-detail': '本活动订单冻结与合作扣款依赖账户可用余额，请尽快充值。',
};

export function AdvertiserLowBalanceAlert(props: {
  balance: { wallet_balance: number; low_balance_alert_cny?: number } | null | undefined;
  publicUi: Pick<PublicUiConfig, 'low_balance_alert_cny'> | null | undefined;
  context?: keyof typeof TAIL;
  sx?: SxProps<Theme>;
}): React.ReactElement | null {
  const { balance, publicUi, context = 'dashboard', sx } = props;
  const navigate = useNavigate();

  if (!isAdvertiserLowBalance(balance, publicUi)) {
    return null;
  }

  const line = getLowBalanceAlertCny(balance, publicUi);

  return (
    <Alert severity="warning" sx={sx}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between">
        <Typography variant="body2" color="text.primary">
          可用余额低于 ¥{line.toLocaleString('zh-CN')}，{TAIL[context]}
        </Typography>
        <Button size="small" variant="outlined" onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.recharge))}>
          去充值
        </Button>
      </Stack>
    </Alert>
  );
}
