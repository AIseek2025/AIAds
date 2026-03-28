import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminCampaignAPI } from '../../services/adminApi';
import { usePublicUiConfig } from '../../hooks/usePublicUiConfig';
import { getApiErrorMessage } from '../../utils/apiError';
import { pathAdminCampaign, pathAdminCampaignAnomalies } from '../../constants/appPaths';
import type { CampaignListParams } from '../../types';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

import { AdminHubNav } from '../../components/admin/AdminHubNav';

import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

const formatCurrency = (n: number) =>
  `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusLabel: Record<string, string> = {
  draft: '草稿',
  pending_review: '待审核',
  active: '进行中',
  paused: '已暂停',
  completed: '已完成',
  cancelled: '已取消',
  rejected: '已拒绝',
};

const anomalyPreviewTypeLabel: Record<string, string> = {
  fake_impressions: '虚假曝光',
  fake_clicks: '虚假点击',
  unusual_engagement: '异常互动',
  budget_overspend: '预算风险',
  other: '其他',
};

const statusColor = (
  status: string
): 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'pending_review':
      return 'warning';
    case 'rejected':
    case 'cancelled':
      return 'error';
    case 'paused':
      return 'info';
    case 'completed':
      return 'primary';
    default:
      return 'default';
  }
};

const AdminCampaignsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const budgetRiskCardRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const queryParams: CampaignListParams = {
    page: page + 1,
    page_size: pageSize,
    sort: 'created_at',
    order: 'desc',
  };
  if (keyword.trim()) queryParams.keyword = keyword.trim();
  if (statusFilter) queryParams.status = statusFilter as CampaignListParams['status'];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['adminCampaigns', queryParams],
    queryFn: () => adminCampaignAPI.getCampaigns(queryParams),
  });

  const { data: anomalyPreview } = useQuery({
    queryKey: ['adminAbnormalCampaignsPreview'],
    queryFn: () => adminCampaignAPI.getAbnormalCampaigns({ page: 1, page_size: 5 }),
  });

  const { data: uiConfig } = usePublicUiConfig();
  const budgetRiskTh = uiConfig?.budget_risk_threshold ?? 0.85;

  const { data: budgetRisk } = useQuery({
    queryKey: ['adminBudgetRiskPreview', budgetRiskTh],
    queryFn: () => adminCampaignAPI.getBudgetRiskCampaigns({ threshold: budgetRiskTh }),
  });

  useEffect(() => {
    if (location.hash === '#budget-risk' && budgetRiskCardRef.current) {
      budgetRiskCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  const rows = data?.items ?? [];
  const total = data?.pagination?.total ?? 0;

  const handleStatusChange = (e: SelectChangeEvent<string>) => {
    setStatusFilter(e.target.value);
    setPage(0);
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          活动管理
        </Typography>
        <Typography variant="body2" color="text.secondary">
          对接管理端活动列表 API，可进入详情审核与调整状态
        </Typography>
      </Box>
      <AdminHubNav onRefresh={() => void refetch()} />
      <Alert severity="info" sx={{ mb: 3, mt: 2 }}>
        列表支持关键词与状态筛选；详情页可处理审核与状态变更。刷新将按当前筛选重拉活动列表。
      </Alert>

      <Stack spacing={2} sx={{ mb: 3 }}>
        <Card ref={budgetRiskCardRef} id="admin-campaign-budget-risk" variant="outlined">
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <TrendingUpIcon color="warning" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={600}>
                  预算占用预警
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  阈值 {(budgetRisk?.threshold ?? budgetRiskTh) * 100}%
                </Typography>
              </Stack>
              <Button
                size="small"
                endIcon={<ChevronRightIcon />}
                onClick={() => navigate(pathAdminCampaignAnomalies())}
              >
                查看全部
              </Button>
            </Stack>
            {(budgetRisk?.items?.length ?? 0) === 0 ? (
              <Typography variant="body2" color="text.secondary">
                暂无达到阈值的活动
              </Typography>
            ) : (
              <Stack spacing={1}>
                {budgetRisk!.items.slice(0, 3).map((it) => (
                  <Stack
                    key={it.id}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    flexWrap="wrap"
                    gap={1}
                  >
                    <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap title={it.title}>
                      {it.title}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${(it.utilization * 100).toFixed(1)}%`}
                      color="warning"
                      variant="outlined"
                    />
                    <Button size="small" onClick={() => navigate(pathAdminCampaign(it.id))}>
                      详情
                    </Button>
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <ReportProblemIcon color="info" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={600}>
                  规则巡检异常（预览）
                </Typography>
              </Stack>
              <Button
                size="small"
                endIcon={<ChevronRightIcon />}
                onClick={() => navigate(pathAdminCampaignAnomalies())}
              >
                查看全部
              </Button>
            </Stack>
            {(anomalyPreview?.items?.length ?? 0) === 0 ? (
              <Typography variant="body2" color="text.secondary">
                暂无巡检记录
              </Typography>
            ) : (
              <Stack spacing={1}>
                {anomalyPreview!.items.map((a) => (
                  <Stack
                    key={a.id}
                    direction="row"
                    alignItems="flex-start"
                    justifyContent="space-between"
                    flexWrap="wrap"
                    gap={1}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {anomalyPreviewTypeLabel[a.anomalyType] ?? a.anomalyType}
                      </Typography>
                      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                        {a.description}
                      </Typography>
                    </Box>
                    <Button size="small" onClick={() => navigate(pathAdminCampaign(a.campaignId))}>
                      活动
                    </Button>
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} flexWrap="wrap">
            <TextField
              placeholder="搜索活动标题或描述"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(0);
              }}
              size="small"
              sx={{ minWidth: 260 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>状态</InputLabel>
              <Select value={statusFilter} label="状态" onChange={handleStatusChange}>
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="draft">草稿</MenuItem>
                <MenuItem value="pending_review">待审核</MenuItem>
                <MenuItem value="active">进行中</MenuItem>
                <MenuItem value="paused">已暂停</MenuItem>
                <MenuItem value="completed">已完成</MenuItem>
                <MenuItem value="cancelled">已取消</MenuItem>
                <MenuItem value="rejected">已拒绝</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getApiErrorMessage(error, '加载活动列表失败')}
        </Alert>
      )}

      <Card>
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>活动名称</TableCell>
                <TableCell>广告主</TableCell>
                <TableCell align="right">预算</TableCell>
                <TableCell align="right">已消耗</TableCell>
                <TableCell align="right">订单冻结</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }} color="text.secondary">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {row.title}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.advertiserName}</TableCell>
                    <TableCell align="right">{formatCurrency(row.budget)}</TableCell>
                    <TableCell align="right">{formatCurrency(row.spentAmount ?? 0)}</TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        color={(row.ordersFrozenTotal ?? 0) > 0 ? 'info.main' : 'text.secondary'}
                      >
                        {formatCurrency(row.ordersFrozenTotal ?? 0)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={statusLabel[row.status] ?? row.status}
                        color={statusColor(row.status)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN') : '—'}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => navigate(pathAdminCampaign(row.id))}
                      >
                        详情
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="每页行数"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
        />
      </Card>
    </Box>
  );
};

export default AdminCampaignsPage;
