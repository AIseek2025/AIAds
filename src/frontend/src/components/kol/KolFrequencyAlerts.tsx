import React from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import type { SxProps, Theme } from '@mui/material/styles';
import { usePublicUiConfig } from '../../hooks/usePublicUiConfig';
import type { KolAcceptFrequency } from '../../services/kolApi';

type Tone = 'dashboard' | 'task-market' | 'my-tasks';

const copy: Record<Tone, { atLimit: string; fallback: string }> = {
  dashboard: {
    atLimit: '，已达上限，请先处理进行中的订单或待窗口滚动后再接新单。',
    fallback:
      '接单频控已开启（近 {days} 日最多接单 {max} 次），当前用量接口暂不可用，请稍后点击刷新或前往任务广场查看。',
  },
  'task-market': {
    atLimit: '，已达上限，请在「我的任务」待处理单处理完毕或待窗口滚动后再接新单。',
    fallback:
      '接单频控已开启（近 {days} 日最多接单 {max} 次），当前用量接口暂不可用，请稍后重试或前往任务广场。',
  },
  'my-tasks': {
    atLimit: '，已达上限，请待窗口滚动或处理完进行中的合作后再试。',
    fallback:
      '接单频控已开启（近 {days} 日最多接单 {max} 次），当前用量接口暂不可用，请稍后重试。',
  },
};

/**
 * 接单频控：优先展示 `/kols/me/frequency`；失败时用 `GET /public/ui-config` 兜底说明。
 */
export function KolFrequencyAlerts(props: {
  freqQ: UseQueryResult<KolAcceptFrequency>;
  tone: Tone;
  onRetry: () => void;
  onGoTaskMarket: () => void;
  /** 默认 mb: 3；任务广场/我的任务可用 mb: 2 与旧版一致 */
  alertSx?: SxProps<Theme>;
}): React.ReactElement {
  const { freqQ, tone, onRetry, onGoTaskMarket, alertSx } = props;
  const mbSx: SxProps<Theme> = alertSx ?? { mb: 3 };
  const { data: publicUi } = usePublicUiConfig();
  const d = freqQ.data;
  const c = copy[tone];
  const showFallback =
    publicUi?.kol_accept_frequency.enabled === true && freqQ.isError;

  return (
    <>
      {d?.enabled ? (
        <Alert
          severity={d.remaining <= 0 ? 'warning' : d.remaining <= 3 ? 'warning' : 'info'}
          sx={mbSx}
        >
          接单频控：近 {d.rollingDays} 日已接单 {d.currentCount}/{d.maxAccepts}
          {d.remaining <= 0
            ? c.atLimit
            : tone === 'task-market'
              ? `，尚可接单约 ${d.remaining} 次（以实际接单为准）。`
              : `，尚可接单约 ${d.remaining} 次。`}
          <Button size="small" sx={{ ml: 1 }} onClick={onGoTaskMarket}>
            去任务广场
          </Button>
        </Alert>
      ) : null}
      {showFallback && publicUi ? (
        <Alert severity="warning" sx={mbSx}>
          {c.fallback
            .replace('{days}', String(publicUi.kol_accept_frequency.rolling_days))
            .replace('{max}', String(publicUi.kol_accept_frequency.max_accepts))}
          <Button size="small" sx={{ ml: 1 }} onClick={() => void onRetry()}>
            重试
          </Button>
          <Button size="small" sx={{ ml: 1 }} onClick={onGoTaskMarket}>
            去任务广场
          </Button>
        </Alert>
      ) : null}
    </>
  );
}
