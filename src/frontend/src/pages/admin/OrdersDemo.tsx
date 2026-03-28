import React, { useState } from 'react';
import { mockOrders } from '../../data/mockData';

// MUI Components
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
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TablePagination from '@mui/material/TablePagination';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const platformIcons: Record<string, string> = {
  tiktok: '🎵',
  youtube: '📺',
  instagram: '📷',
};

const OrdersDemoPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
    setPage(0);
  };

  const handleStatusFilterChange = (e: SelectChangeEvent<string>) => {
    setStatusFilter(e.target.value);
    setPage(0);
  };

  const handlePlatformFilterChange = (e: SelectChangeEvent<string>) => {
    setPlatformFilter(e.target.value);
    setPage(0);
  };

  // Filter data
  const filteredData = mockOrders.filter(item => {
    if (keyword && !item.orderNo.toLowerCase().includes(keyword.toLowerCase()) &&
        !item.campaignName.toLowerCase().includes(keyword.toLowerCase()) &&
        !item.kolName.toLowerCase().includes(keyword.toLowerCase())) {
      return false;
    }
    if (statusFilter && item.status !== statusFilter) return false;
    if (platformFilter && item.platform !== platformFilter) return false;
    return true;
  });

  const paginatedData = filteredData.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>📝 订单管理</Typography>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`订单列表 (${filteredData.length})`} />
          <Tab label="纠纷订单" />
        </Tabs>
      </Paper>

      {/* Tab Panel 0 - Order List */}
      {tabValue === 0 && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
                <TextField
                  placeholder="搜索订单号/活动名称/KOL..."
                  value={keyword}
                  onChange={handleSearch}
                  size="small"
                  sx={{ minWidth: 240 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={statusFilter}
                    label="状态"
                    onChange={handleStatusFilterChange}
                  >
                    <MenuItem value="">全部</MenuItem>
                    <MenuItem value="pending">待支付</MenuItem>
                    <MenuItem value="in_progress">进行中</MenuItem>
                    <MenuItem value="completed">已完成</MenuItem>
                    <MenuItem value="cancelled">已取消</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>平台</InputLabel>
                  <Select
                    value={platformFilter}
                    label="平台"
                    onChange={handlePlatformFilterChange}
                  >
                    <MenuItem value="">全部</MenuItem>
                    <MenuItem value="tiktok">TikTok</MenuItem>
                    <MenuItem value="youtube">YouTube</MenuItem>
                    <MenuItem value="instagram">Instagram</MenuItem>
                  </Select>
                </FormControl>
                <IconButton onClick={() => setPage(0)}>
                  <RefreshIcon />
                </IconButton>
                <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
                  导出
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>订单号</TableCell>
                    <TableCell>活动名称</TableCell>
                    <TableCell>KOL</TableCell>
                    <TableCell>平台</TableCell>
                    <TableCell>金额</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>创建时间</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell>{order.orderNo}</TableCell>
                      <TableCell>{order.campaignName}</TableCell>
                      <TableCell>{order.kolName}</TableCell>
                      <TableCell>{platformIcons[order.platform] || order.platform}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <TrendingUpIcon fontSize="small" color="success" />
                          ¥{order.amount.toLocaleString()}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {order.status === 'completed' && (
                          <Chip label="已完成" color="success" size="small" />
                        )}
                        {order.status === 'in_progress' && (
                          <Chip label="进行中" color="info" size="small" />
                        )}
                        {order.status === 'pending' && (
                          <Chip label="待支付" color="warning" size="small" />
                        )}
                        {order.status === 'cancelled' && (
                          <Chip label="已取消" color="error" size="small" />
                        )}
                      </TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString('zh-CN')}</TableCell>
                      <TableCell>
                        <Button size="small" startIcon={<VisibilityIcon />}>
                          详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredData.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50, 100]}
            />
          </Card>
        </>
      )}

      {/* Tab Panel 1 - Disputes */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>纠纷订单</Typography>
            <Typography color="text.secondary">
              纠纷订单处理功能开发中...
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default OrdersDemoPage;
