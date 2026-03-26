import React, { useState } from 'react';
import { mockAdvertisers } from '../../data/mockData';
import type { AdvertiserListItem } from '../../types';

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
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
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
import CancelIcon from '@mui/icons-material/Cancel';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BlockIcon from '@mui/icons-material/Block';

const AdvertisersPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [verificationStatusFilter, setVerificationStatusFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('');
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<AdvertiserListItem | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const industryOptions = ['科技', '贸易', '文化传媒', '电商', '制造', '金融', '教育', '医疗', '其他'];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
    setPage(0);
  };

  const handleVerificationStatusFilterChange = (e: SelectChangeEvent<string>) => {
    setVerificationStatusFilter(e.target.value);
    setPage(0);
  };

  const handleIndustryFilterChange = (e: SelectChangeEvent<string>) => {
    setIndustryFilter(e.target.value);
    setPage(0);
  };

  const handleBalanceFilterChange = (e: SelectChangeEvent<string>) => {
    setBalanceFilter(e.target.value);
    setPage(0);
  };

  const handleViewDetail = (advertiser: AdvertiserListItem) => {
    setSelectedAdvertiser(advertiser);
    setDetailDialogOpen(true);
  };

  // Filter data
  const filteredData = mockAdvertisers.filter(item => {
    if (keyword && !item.companyName.toLowerCase().includes(keyword.toLowerCase()) &&
        !item.contactName.toLowerCase().includes(keyword.toLowerCase()) &&
        !item.contactEmail.toLowerCase().includes(keyword.toLowerCase())) {
      return false;
    }
    if (verificationStatusFilter && item.verificationStatus !== verificationStatusFilter) return false;
    if (industryFilter && item.industry !== industryFilter) return false;
    if (balanceFilter) {
      if (balanceFilter === 'positive' && item.balance <= 0) return false;
      if (balanceFilter === 'zero' && item.balance !== 0) return false;
      if (balanceFilter === 'low' && (item.balance <= 0 || item.balance > 10000)) return false;
      if (balanceFilter === 'high' && item.balance <= 50000) return false;
    }
    return true;
  });

  const paginatedData = filteredData.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>🏢 广告主管理</Typography>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`广告主列表 (${filteredData.length})`} />
          <Tab label="待审核" />
        </Tabs>
      </Paper>

      {/* Tab Panel 0 - Advertiser List */}
      {tabValue === 0 && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
                <TextField
                  placeholder="搜索公司名称/联系人/邮箱..."
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
                  <InputLabel>认证状态</InputLabel>
                  <Select
                    value={verificationStatusFilter}
                    label="认证状态"
                    onChange={handleVerificationStatusFilterChange}
                  >
                    <MenuItem value="">全部</MenuItem>
                    <MenuItem value="pending">待审核</MenuItem>
                    <MenuItem value="verified">已认证</MenuItem>
                    <MenuItem value="rejected">已拒绝</MenuItem>
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
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>余额</InputLabel>
                  <Select
                    value={balanceFilter}
                    label="余额"
                    onChange={handleBalanceFilterChange}
                  >
                    <MenuItem value="">全部</MenuItem>
                    <MenuItem value="positive">有余额</MenuItem>
                    <MenuItem value="zero">零余额</MenuItem>
                    <MenuItem value="low">低余额 (&lt;1 万)</MenuItem>
                    <MenuItem value="high">高余额 (&gt;5 万)</MenuItem>
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
                    <TableCell>公司名称</TableCell>
                    <TableCell>联系人</TableCell>
                    <TableCell>邮箱</TableCell>
                    <TableCell>行业</TableCell>
                    <TableCell>余额</TableCell>
                    <TableCell>认证状态</TableCell>
                    <TableCell>注册时间</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.map((advertiser) => (
                    <TableRow key={advertiser.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                            {advertiser.companyName[0]}
                          </Avatar>
                          {advertiser.companyName}
                        </Stack>
                      </TableCell>
                      <TableCell>{advertiser.contactName}</TableCell>
                      <TableCell>{advertiser.contactEmail}</TableCell>
                      <TableCell>{advertiser.industry}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <AttachMoneyIcon fontSize="small" color="success" />
                          ¥{advertiser.balance.toLocaleString()}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {advertiser.verificationStatus === 'verified' && (
                          <Chip icon={<CheckCircleIcon />} label="已认证" color="success" size="small" />
                        )}
                        {advertiser.verificationStatus === 'pending' && (
                          <Chip label="待审核" color="warning" size="small" />
                        )}
                        {advertiser.verificationStatus === 'rejected' && (
                          <Chip icon={<CancelIcon />} label="已拒绝" color="error" size="small" />
                        )}
                      </TableCell>
                      <TableCell>{new Date(advertiser.registeredAt).toLocaleDateString('zh-CN')}</TableCell>
                      <TableCell>
                        <Tooltip title="查看详情">
                          <IconButton size="small" onClick={() => handleViewDetail(advertiser)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {advertiser.verificationStatus === 'pending' && (
                          <>
                            <Tooltip title="通过">
                              <IconButton size="small" color="success">
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="拒绝">
                              <IconButton size="small" color="error">
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
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

      {/* Tab Panel 1 - Pending Reviews */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>待审核广告主</Typography>
            <Typography color="text.secondary">
              待审核功能开发中...
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      {detailDialogOpen && selectedAdvertiser && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {selectedAdvertiser.companyName} - 详情
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">联系人</Typography>
                <Typography>{selectedAdvertiser.contactName}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">邮箱</Typography>
                <Typography>{selectedAdvertiser.contactEmail}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">电话</Typography>
                <Typography>{selectedAdvertiser.contactPhone}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">余额</Typography>
                <Typography color="success.main">¥{selectedAdvertiser.balance.toLocaleString()}</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" color="primary" startIcon={<AttachMoneyIcon />}>
                  调整余额
                </Button>
                {selectedAdvertiser.status === 'active' ? (
                  <Button variant="outlined" color="error" startIcon={<BlockIcon />}>
                    冻结账户
                  </Button>
                ) : (
                  <Button variant="outlined" color="success" startIcon={<CheckCircleIcon />}>
                    解冻账户
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AdvertisersPage;
