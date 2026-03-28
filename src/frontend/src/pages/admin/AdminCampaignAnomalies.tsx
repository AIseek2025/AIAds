import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminCampaignAPI } from '../../services/adminApi';
import { getApiErrorMessage } from '../../utils/apiError';
import { pathAdminCampaign } from '../../constants/appPaths';
import type { CampaignAnomaly } from '../../types';

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
import VisibilityIcon from '@mui/icons-material/Visibility';

const anomalyTypeLabel: Record<CampaignAnomaly['anomalyType'], string> = {
  fake_impressions: '虚假曝光',
  fake_clicks: '虚假点击',
  unusual_engagement: '异常互动',
  budget_overspend: '预算风险',
  other: '其他',
};

const severityLabel: Record<CampaignAnomaly['severity'], string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '紧急',
};

const severityColor = (
  s: CampaignAnomaly['severity']
): 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' => {
  switch (s) {
    case 'critical':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    default:
      return 'default';
  }
};

const statusLabel: Record<CampaignAnomaly['status'], string> = {
  pending: '待处理',
  investigating: '调查中',
  confirmed: '已确认',
  false_positive: '误报',
  resolved: '已解决',
};

const AdminCampaignAnomaliesPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [severity, setSeverity] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const queryParams = {
    page: page + 1,
    page_size: pageSize,
    ...(severity ? { severity } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['adminAbnormalCampaigns', queryParams],
    queryFn: () => adminCampaignAPI.getAbnormalCampaigns(queryParams),
  });

  const rows = data?.items ?? [];
  const total = data?.pagination?.total ?? 0;

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          活动异常巡检
        </Typography>
        <Typography variant="body2" color="text.secondary">
          规则引擎与订单维度巡检结果；可筛选严重程度、类型与处理状态，并跳转活动详情
        </Typography>
      </Box>
      <AdminHubNav onRefresh={() => void refetch()} />
      <Alert severity="info" sx={{ mb: 3, mt: 2 }}>
        与活动列表页的预算与巡检预览同源；筛选变更会重新请求列表。
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>严重程度</InputLabel>
              <Select
                value={severity}
                label="严重程度"
                onChange={(e: SelectChangeEvent<string>) => {
                  setSeverity(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="low">低</MenuItem>
                <MenuItem value="medium">中</MenuItem>
                <MenuItem value="high">高</MenuItem>
                <MenuItem value="critical">紧急</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>异常类型</InputLabel>
              <Select
                value={typeFilter}
                label="异常类型"
                onChange={(e: SelectChangeEvent<string>) => {
                  setTypeFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="budget_overspend">预算风险</MenuItem>
                <MenuItem value="unusual_engagement">异常互动</MenuItem>
                <MenuItem value="fake_impressions">虚假曝光</MenuItem>
                <MenuItem value="fake_clicks">虚假点击</MenuItem>
                <MenuItem value="other">其他</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>处理状态</InputLabel>
              <Select
                value={statusFilter}
                label="处理状态"
                onChange={(e: SelectChangeEvent<string>) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="pending">待处理</MenuItem>
                <MenuItem value="investigating">调查中</MenuItem>
                <MenuItem value="confirmed">已确认</MenuItem>
                <MenuItem value="false_positive">误报</MenuItem>
                <MenuItem value="resolved">已解决</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getApiErrorMessage(error, '加载异常列表失败')}
        </Alert>
      )}

      <Card>
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>类型</TableCell>
                <TableCell>说明</TableCell>
                <TableCell>活动 ID</TableCell>
                <TableCell>严重程度</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>检出时间</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }} color="text.secondary">
                    当前筛选下暂无异常记录
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Chip
                        size="small"
                        label={anomalyTypeLabel[row.anomalyType] ?? row.anomalyType}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Typography variant="body2">{row.description}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                        {row.campaignId.slice(0, 8)}…
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={severityLabel[row.severity] ?? row.severity}
                        color={severityColor(row.severity)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{statusLabel[row.status] ?? row.status}</TableCell>
                    <TableCell>
                      {row.detectedAt ? new Date(row.detectedAt).toLocaleString('zh-CN') : '—'}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => navigate(pathAdminCampaign(row.campaignId))}
                      >
                        活动详情
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

export default AdminCampaignAnomaliesPage;
