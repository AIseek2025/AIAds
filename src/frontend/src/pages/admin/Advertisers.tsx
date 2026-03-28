import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminAdvertiserAPI } from '../../services/adminApi';
import { getApiErrorMessage } from '../../utils/apiError';
import type { AdvertiserListParams } from '../../types';
import { pathAdminAdvertiser } from '../../constants/appPaths';

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

const formatCurrency = (n: number) =>
  `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const verLabel: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  verified: '已认证',
};

const AdminAdvertisersPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<string>('');

  const queryParams: AdvertiserListParams = {
    page: page + 1,
    page_size: pageSize,
    sort: 'created_at',
    order: 'desc',
  };
  if (keyword.trim()) queryParams.keyword = keyword.trim();
  if (verificationFilter) queryParams.verification_status = verificationFilter as AdvertiserListParams['verification_status'];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['adminAdvertisers', queryParams],
    queryFn: () => adminAdvertiserAPI.getAdvertisers(queryParams),
  });

  const rows = data?.items ?? [];
  const total = data?.pagination?.total ?? 0;

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          广告主管理
        </Typography>
        <Typography variant="body2" color="text.secondary">
          对接管理端广告主 API，支持审核与账户操作
        </Typography>
      </Box>
      <AdminHubNav onRefresh={() => void refetch()} />
      <Alert severity="info" sx={{ mb: 3, mt: 2 }}>
        列表支持关键词与认证状态筛选；详情页可处理资质与账户。刷新将按当前筛选重拉广告主列表。
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} flexWrap="wrap">
            <TextField
              placeholder="公司名、联系人、邮箱"
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
              <InputLabel>认证状态</InputLabel>
              <Select
                value={verificationFilter}
                label="认证状态"
                onChange={(e: SelectChangeEvent<string>) => {
                  setVerificationFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="pending">待审核</MenuItem>
                <MenuItem value="approved">已通过</MenuItem>
                <MenuItem value="rejected">已拒绝</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getApiErrorMessage(error, '加载广告主列表失败')}
        </Alert>
      )}

      <Card>
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>公司 / 联系人</TableCell>
                <TableCell>邮箱</TableCell>
                <TableCell>行业</TableCell>
                <TableCell align="right">可用余额</TableCell>
                <TableCell align="right">账户冻结</TableCell>
                <TableCell align="right">订单冻结</TableCell>
                <TableCell align="center">进行中活动</TableCell>
                <TableCell>认证</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
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
                        {row.companyName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.contactPerson ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.contactEmail}</TableCell>
                    <TableCell>{row.industry ?? '—'}</TableCell>
                    <TableCell align="right">{formatCurrency(row.walletBalance ?? 0)}</TableCell>
                    <TableCell align="right">{formatCurrency(row.frozenBalance ?? 0)}</TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        color={(row.ordersFrozenTotal ?? 0) > 0 ? 'info.main' : 'text.secondary'}
                      >
                        {formatCurrency(row.ordersFrozenTotal ?? 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{row.activeCampaigns ?? 0}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={verLabel[row.verificationStatus] ?? row.verificationStatus}
                        color={row.verificationStatus === 'approved' ? 'success' : row.verificationStatus === 'pending' ? 'warning' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => navigate(pathAdminAdvertiser(row.id))}
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

export default AdminAdvertisersPage;
