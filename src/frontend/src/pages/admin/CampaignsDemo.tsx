import React, { useState } from 'react';
import { mockCampaigns } from '../../data/mockData';
import type { CampaignListItem } from '../../types';

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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const CampaignsDemoPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');

  const industryOptions = ['科技', '贸易', '文化传媒', '电商', '制造', '金融', '教育', '医疗', '其他'];

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

  const handleIndustryFilterChange = (e: SelectChangeEvent<string>) => {
    setIndustryFilter(e.target.value);
    setPage(0);
  };

  // Filter data
  const filteredData = mockCampaigns.filter(item => {
    if (keyword && !item.title.toLowerCase().includes(keyword.toLowerCase()) &&
        !item.advertiserName.toLowerCase().includes(keyword.toLowerCase())) {
      return false;
    }
    if (statusFilter && item.status !== statusFilter) return false;
    if (industryFilter && item.industry !== industryFilter) return false;
    return true;
  });

  const paginatedData = filteredData.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>📢 活动管理</Typography>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`活动列表 (${filteredData.length})`} />
          <Tab label="待审核" />
          <Tab label="异常活动" />
        </Tabs>
      </Paper>

      {/* Tab Panel 0 - Campaign List */}
      {tabValue === 0 && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
                <TextField
                  placeholder="搜索活动名称/广告主..."
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
                    <MenuItem value="pending">待审核</MenuItem>
                    <MenuItem value="active">进行中</MenuItem>
                    <MenuItem value="completed">已完成</MenuItem>
                    <MenuItem value="cancelled">已取消</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>行业</InputLabel>
                  <Select
                    value={industryFilter}
                    label="行业"
                    onChange={handleIndustryFilterChange}
                  >
                    <MenuItem value="">全部</MenuItem>
                    {industryOptions.map(ind => (
                      <MenuItem key={ind} value={ind}>{ind}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton onClick={() => setPage(0)}>
                  <RefreshIcon />
                </IconButton>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>活动名称</TableCell>
                    <TableCell>广告主</TableCell>
                    <TableCell>行业</TableCell>
                    <TableCell>预算</TableCell>
                    <TableCell>KOL 数量</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>创建时间</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.map((campaign) => (
                    <TableRow key={campaign.id} hover>
                      <TableCell>{campaign.title}</TableCell>
                      <TableCell>{campaign.advertiserName}</TableCell>
                      <TableCell>{campaign.industry}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <TrendingUpIcon fontSize="small" color="success" />
                          ¥{campaign.budget.toLocaleString()}
                        </Stack>
                      </TableCell>
                      <TableCell>{campaign.kolCount}</TableCell>
                      <TableCell>
                        {campaign.status === 'active' && (
                          <Chip icon={<CheckCircleIcon />} label="进行中" color="success" size="small" />
                        )}
                        {campaign.status === 'pending' && (
                          <Chip icon={<PendingIcon />} label="待审核" color="warning" size="small" />
                        )}
                        {campaign.status === 'completed' && (
                          <Chip label="已完成" color="info" size="small" />
                        )}
                        {campaign.status === 'cancelled' && (
                          <Chip icon={<CancelIcon />} label="已取消" color="error" size="small" />
                        )}
                      </TableCell>
                      <TableCell>{new Date(campaign.createdAt).toLocaleDateString('zh-CN')}</TableCell>
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

      {/* Tab Panel 1 & 2 - Placeholders */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>待审核活动</Typography>
            <Typography color="text.secondary">
              待审核功能开发中...
            </Typography>
          </CardContent>
        </Card>
      )}

      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>异常活动监控</Typography>
            <Typography color="text.secondary">
              异常活动监控功能开发中...
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default CampaignsDemoPage;
