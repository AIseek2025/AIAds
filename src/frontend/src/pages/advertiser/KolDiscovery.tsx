import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Slider from '@mui/material/Slider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Rating from '@mui/material/Rating';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import TablePagination from '@mui/material/TablePagination';
import Divider from '@mui/material/Divider';
import Autocomplete from '@mui/material/Autocomplete';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import StarIcon from '@mui/icons-material/Star';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MessageIcon from '@mui/icons-material/Message';

// Types
import type { Kol } from '../../types';
import { AdvertiserHubNav } from '../../components/advertiser/AdvertiserHubNav';

// Services
import {
  advertiserAPI,
  advertiserBalanceQueryKey,
  campaignAPI,
  kolAPI,
} from '../../services/advertiserApi';
import type { KolRecommendationRow } from '../../services/advertiserApi';
import { getApiErrorMessage } from '../../utils/apiError';
import { usePublicUiConfig } from '../../hooks/usePublicUiConfig';
import { AdvertiserLowBalanceAlert } from '../../components/advertiser/AdvertiserLowBalanceAlert';

// Styled Components
const KolCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const colors: Record<string, string> = {
  tiktok: '#ff0050',
  youtube: '#ff0000',
  instagram: '#e4405f',
  facebook: '#1877f2',
  twitter: '#1da1f2',
  linkedin: '#0a66c2',
  xiaohongshu: '#ff2442',
  weibo: '#e6162d',
};

const PlatformIcon = styled(Box)<{ platform: string }>(({ platform }) => ({
  width: 32,
  height: 32,
  borderRadius: '50%',
  backgroundColor: colors[platform] || '#757575',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  fontSize: '0.75rem',
  fontWeight: 'bold',
  textTransform: 'uppercase',
}));

// Platform options
const platformOptions = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'linkedin', label: 'LinkedIn' },
];

// Category options
const categoryOptions = [
  { value: 'beauty', label: '美妆' },
  { value: 'fashion', label: '时尚' },
  { value: 'technology', label: '科技' },
  { value: 'food', label: '美食' },
  { value: 'travel', label: '旅行' },
  { value: 'fitness', label: '健身' },
  { value: 'education', label: '教育' },
  { value: 'gaming', label: '游戏' },
  { value: 'music', label: '音乐' },
  { value: 'entertainment', label: '娱乐' },
  { value: 'parenting', label: '母婴' },
  { value: 'lifestyle', label: '生活' },
];

// Country options
const countryOptions = [
  { value: 'US', label: '美国' },
  { value: 'UK', label: '英国' },
  { value: 'CA', label: '加拿大' },
  { value: 'AU', label: '澳大利亚' },
  { value: 'DE', label: '德国' },
  { value: 'FR', label: '法国' },
  { value: 'JP', label: '日本' },
  { value: 'KR', label: '韩国' },
  { value: 'CN', label: '中国' },
  { value: 'IN', label: '印度' },
  { value: 'BR', label: '巴西' },
  { value: 'MX', label: '墨西哥' },
];

export const KolDiscoveryPage: React.FC = () => {
  // State
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [selectedKol, setSelectedKol] = useState<Kol | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [keyword, setKeyword] = useState('');

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [countryFilter, setCountryFilter] = useState<string[]>([]);
  const [followerRange, setFollowerRange] = useState<[number, number]>([
    1000, 100000,
  ]);
  const [minEngagementRate, setMinEngagementRate] = useState(0);
  const [recommendCampaignId, setRecommendCampaignId] = useState('');

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    severity: 'success' | 'error';
    message: string;
  }>({ open: false, severity: 'success', message: '' });

  // Fetch KOLs
  const {
    data: kolsData,
    isLoading,
    error,
    refetch: refetchKols,
  } = useQuery({
    queryKey: [
      'kols',
      page + 1,
      pageSize,
      platformFilter,
      categoryFilter,
      countryFilter,
      followerRange,
      minEngagementRate,
      keyword,
    ],
    queryFn: () =>
      kolAPI.getKols({
        page: page + 1,
        page_size: pageSize,
        platform: platformFilter.length ? platformFilter[0] : undefined,
        min_followers: followerRange[0],
        max_followers: followerRange[1],
        categories: categoryFilter.length
          ? categoryFilter.join(',')
          : undefined,
        regions: countryFilter.length ? countryFilter.join(',') : undefined,
        min_engagement_rate: minEngagementRate,
        keyword: keyword || undefined,
      }),
    retry: 1,
  });

  const { data: balance, refetch: refetchBalance } = useQuery({
    queryKey: [...advertiserBalanceQueryKey],
    queryFn: advertiserAPI.getBalance,
    retry: 1,
  });

  const { data: publicUi } = usePublicUiConfig();

  const {
    data: campaignsForRecommend,
    isError: campaignsPickerError,
    isLoading: campaignsPickerLoading,
    error: campaignsPickerErr,
    refetch: refetchCampaignsPicker,
  } = useQuery({
    queryKey: ['campaigns', 'kol-discovery-picker'],
    queryFn: () => campaignAPI.getCampaigns({ page: 1, page_size: 100 }),
  });

  const {
    data: recommendData,
    isLoading: recommendLoading,
    isError: recommendError,
    error: recommendErr,
    refetch: refetchRecommendKols,
  } = useQuery({
    queryKey: ['kols-recommend', recommendCampaignId],
    queryFn: () => kolAPI.getRecommendedKols(recommendCampaignId, 12),
    enabled: Boolean(recommendCampaignId.trim()),
    retry: 1,
  });

  // Handle detail dialog
  const handleDetailOpen = (kol: Kol) => {
    setSelectedKol(kol);
    setDetailDialogOpen(true);
  };

  const handleDetailClose = () => {
    setDetailDialogOpen(false);
    setSelectedKol(null);
  };

  // Handle contact dialog
  const handleContactOpen = () => {
    setDetailDialogOpen(false);
    setContactDialogOpen(true);
  };

  const handleContactClose = () => {
    setContactDialogOpen(false);
    setContactMessage('');
  };

  const handleContactSubmit = () => {
    setSnackbar({
      open: true,
      severity: 'success',
      message: '联系请求已发送，我们会尽快回复您',
    });
    handleContactClose();
  };

  // Handle pagination
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Reset filters
  const handleResetFilters = () => {
    setPlatformFilter([]);
    setCategoryFilter([]);
    setCountryFilter([]);
    setFollowerRange([1000, 100000]);
    setMinEngagementRate(0);
    setKeyword('');
    setPage(0);
  };

  // Format number
  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(value);
  };

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 2,
          mb: 2,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" gutterBottom>
            KOL 发现
          </Typography>
          <Typography variant="body1" color="text.secondary">
            发现并联系适合您品牌的 KOL；下单后可在活动详情与订单中心跟踪合作、CPM 与结算。
          </Typography>
        </Box>
        <AdvertiserHubNav
          preset="kol-discovery"
          onRefresh={() => {
            void refetchKols();
            void refetchBalance();
            void refetchCampaignsPicker();
            if (recommendCampaignId.trim()) void refetchRecommendKols();
          }}
        />
      </Box>
      <AdvertiserLowBalanceAlert balance={balance} publicUi={publicUi} context="kol-discovery" sx={{ mb: 3 }} />
      <Alert severity="info" sx={{ mb: 3 }}>
        「智能推荐」需先选择进行中的活动；建单与冻结预算以活动及订单规则为准。
      </Alert>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                placeholder="搜索 KOL 名称..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  ),
                }}
                size="small"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Autocomplete
                multiple
                options={platformOptions}
                value={
                  platformOptions.filter((p) =>
                    platformFilter.includes(p.value)
                  ) || []
                }
                onChange={(_, newValue) => {
                  setPlatformFilter(newValue.map((item) => item.value));
                  setPage(0);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="平台" size="small" />
                )}
                getOptionLabel={(option) => option.label}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option.label}
                      {...getTagProps({ index })}
                      size="small"
                      key={option.value}
                    />
                  ))
                }
                size="small"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Autocomplete
                multiple
                options={categoryOptions}
                value={
                  categoryOptions.filter((c) =>
                    categoryFilter.includes(c.value)
                  ) || []
                }
                onChange={(_, newValue) => {
                  setCategoryFilter(newValue.map((item) => item.value));
                  setPage(0);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="类别" size="small" />
                )}
                getOptionLabel={(option) => option.label}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option.label}
                      {...getTagProps({ index })}
                      size="small"
                      key={option.value}
                    />
                  ))
                }
                size="small"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Autocomplete
                multiple
                options={countryOptions}
                value={
                  countryOptions.filter((c) =>
                    countryFilter.includes(c.value)
                  ) || []
                }
                onChange={(_, newValue) => {
                  setCountryFilter(newValue.map((item) => item.value));
                  setPage(0);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="地区" size="small" />
                )}
                getOptionLabel={(option) => option.label}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option.label}
                      {...getTagProps({ index })}
                      size="small"
                      key={option.value}
                    />
                  ))
                }
                size="small"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={handleResetFilters}
                size="small"
              >
                重置筛选
              </Button>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" gutterBottom>
                粉丝数范围
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {formatNumber(followerRange[0])}
                </Typography>
                <Slider
                  value={followerRange}
                  onChange={(_, newValue) => {
                    if (Array.isArray(newValue)) {
                      setFollowerRange([newValue[0], newValue[1]]);
                      setPage(0);
                    }
                  }}
                  valueLabelDisplay="auto"
                  min={0}
                  max={1000000}
                  step={1000}
                  valueLabelFormat={(value) => formatNumber(value)}
                />
                <Typography variant="body2" color="text.secondary">
                  {formatNumber(followerRange[1])}
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" gutterBottom>
                最低互动率
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  0%
                </Typography>
                <Slider
                  value={minEngagementRate}
                  onChange={(_, newValue) => {
                    setMinEngagementRate(newValue as number);
                    setPage(0);
                  }}
                  min={0}
                  max={0.1}
                  step={0.01}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${(value * 100).toFixed(1)}%`}
                />
                <Typography variant="body2" color="text.secondary">
                  10%
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 活动维度智能推荐 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1,
              mb: 2,
            }}
          >
            <TrendingUpIcon color="primary" />
            <Typography variant="h6">活动智能推荐</Typography>
            <Typography variant="body2" color="text.secondary">
              选择活动后展示规则匹配分、理由与预估触达
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 280, maxWidth: '100%' }}>
            <InputLabel id="recommend-campaign-label">关联活动</InputLabel>
            <Select
              labelId="recommend-campaign-label"
              label="关联活动"
              value={recommendCampaignId}
              onChange={(e) => setRecommendCampaignId(e.target.value)}
            >
              <MenuItem value="">
                <em>请选择活动</em>
              </MenuItem>
              {(campaignsForRecommend?.items ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {campaignsPickerLoading && (
            <LinearProgress sx={{ mt: 2 }} />
          )}
          {campaignsPickerError && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {getApiErrorMessage(
                campaignsPickerErr,
                '活动列表加载失败，无法选择关联活动'
              )}
            </Alert>
          )}
          {!campaignsPickerLoading &&
            !campaignsPickerError &&
            (campaignsForRecommend?.items?.length ?? 0) === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                暂无活动，请先在「我的活动」中创建并保存活动后再使用智能推荐。
              </Typography>
            )}

          {recommendCampaignId.trim() && recommendLoading && (
            <LinearProgress sx={{ mt: 2 }} />
          )}

          {recommendCampaignId.trim() &&
            !recommendLoading &&
            recommendError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {getApiErrorMessage(
                  recommendErr,
                  '推荐加载失败，请检查活动归属或稍后重试'
                )}
              </Alert>
            )}

          {recommendCampaignId.trim() && !recommendLoading && recommendData && (
            <Box sx={{ mt: 2 }}>
              {recommendData.recommendations.length === 0 ? (
                <Typography color="text.secondary">
                  暂无匹配推荐，可尝试调整活动定向或稍后再试
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    overflowX: 'auto',
                    pb: 1,
                    pt: 0.5,
                  }}
                >
                  {recommendData.recommendations.map((row: KolRecommendationRow) => (
                    <Card
                      key={row.kol.id}
                      variant="outlined"
                      sx={{
                        minWidth: 260,
                        maxWidth: 280,
                        flexShrink: 0,
                      }}
                    >
                      <CardContent>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            mb: 1,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar
                              src={row.kol.platformAvatarUrl}
                              sx={{ width: 40, height: 40 }}
                            >
                              {row.kol.platformUsername?.[0]}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold" noWrap>
                                {row.kol.platformDisplayName || row.kol.platformUsername}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {row.kol.category || row.kol.platform}
                              </Typography>
                            </Box>
                          </Box>
                          <Chip
                            size="small"
                            color="primary"
                            label={`匹配 ${row.match_score.toFixed(1)}`}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          预估触达 {formatNumber(row.estimated_reach)} · 预估互动{' '}
                          {formatNumber(row.estimated_engagement)}
                        </Typography>
                        {row.match_reasons.length > 0 && (
                          <Stack
                            direction="row"
                            spacing={0.5}
                            flexWrap="wrap"
                            useFlexGap
                            sx={{ mt: 1 }}
                          >
                            {row.match_reasons.map((reason) => (
                              <Chip key={reason} label={reason} size="small" variant="outlined" />
                            ))}
                          </Stack>
                        )}
                        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleDetailOpen(row.kol)}
                          >
                            详情
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => {
                              setSelectedKol(row.kol);
                              handleContactOpen();
                            }}
                          >
                            联系
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* KOL Grid */}
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getApiErrorMessage(error, '加载 KOL 列表失败，请稍后重试')}
        </Alert>
      ) : kolsData?.items && kolsData.items.length > 0 ? (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {kolsData.items.map((kol: Kol) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={kol.id}>
                <KolCard>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          src={kol.platformAvatarUrl}
                          sx={{ width: 56, height: 56 }}
                        >
                          {kol.platformUsername?.[1]}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {kol.platformDisplayName || kol.platformUsername}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {kol.bio || kol.category || 'KOL'}
                          </Typography>
                        </Box>
                      </Box>
                      <PlatformIcon platform={kol.platform}>
                        {kol.platform[0]}
                      </PlatformIcon>
                    </Box>

                    <Grid container spacing={1} sx={{ mb: 2 }}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                          粉丝数
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatNumber(kol.followers)}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                          互动率
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color="success.main"
                        >
                          {(kol.engagementRate * 100).toFixed(1)}%
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                          基础价格
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color="primary.main"
                        >
                          {formatCurrency(kol.basePrice)}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                          评分
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <StarIcon
                            sx={{ fontSize: 16, color: 'warning.main' }}
                          />
                          <Typography variant="body2" fontWeight="bold">
                            {kol.avgRating?.toFixed(1) || '0'}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {kol.tags && kol.tags.length > 0 && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {kol.tags.slice(0, 3).map((tag: string) => (
                          <Chip key={tag} label={tag} size="small" />
                        ))}
                        {kol.tags.length > 3 && (
                          <Chip label={`+${kol.tags.length - 3}`} size="small" />
                        )}
                      </Stack>
                    )}
                  </CardContent>

                  <CardActions sx={{ mt: 'auto' }}>
                    <Button
                      size="small"
                      fullWidth
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleDetailOpen(kol)}
                    >
                      详情
                    </Button>
                    <Button
                      size="small"
                      fullWidth
                      variant="contained"
                      startIcon={<MessageIcon />}
                      onClick={() => {
                        setSelectedKol(kol);
                        handleContactOpen();
                      }}
                    >
                      联系
                    </Button>
                  </CardActions>
                </KolCard>
              </Grid>
            ))}
          </Grid>

          <TablePagination
            component="div"
            count={kolsData.pagination?.total || 0}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={pageSize}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[6, 12, 24, 48]}
          />
        </>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <SearchIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
            </Box>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              未找到符合条件的 KOL
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              请尝试调整筛选条件
            </Typography>
            <Button variant="contained" onClick={handleResetFilters}>
              重置筛选
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      {selectedKol && (
        <Dialog
          open={detailDialogOpen}
          onClose={handleDetailClose}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={selectedKol.platformAvatarUrl}
                sx={{ width: 48, height: 48 }}
              >
                {selectedKol.platformUsername?.[1]}
              </Avatar>
              <Box>
                <Typography variant="h6">
                  {selectedKol.platformDisplayName || selectedKol.platformUsername}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedKol.bio || selectedKol.category}
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  基本信息
                </Typography>
                <PaperWithPadding>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        平台
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {platformOptions.find(
                          (p) => p.value === selectedKol.platform
                        )?.label || selectedKol.platform}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        类别
                      </Typography>
                      <Typography variant="body2">
                        {categoryOptions.find(
                          (c) => c.value === selectedKol.category
                        )?.label || selectedKol.category || '-'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        地区
                      </Typography>
                      <Typography variant="body2">
                        {selectedKol.country || '-'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        认证状态
                      </Typography>
                      <Chip
                        label={selectedKol.verified ? '已认证' : '未认证'}
                        size="small"
                        color={selectedKol.verified ? 'success' : 'default'}
                      />
                    </Grid>
                  </Grid>
                </PaperWithPadding>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  数据统计
                </Typography>
                <PaperWithPadding>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        粉丝数
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {formatNumber(selectedKol.followers)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        关注数
                      </Typography>
                      <Typography variant="body2">
                        {formatNumber(selectedKol.following || 0)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        平均观看
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {formatNumber(selectedKol.avgViews || 0)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        平均点赞
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {formatNumber(selectedKol.avgLikes || 0)}
                      </Typography>
                    </Grid>
                  </Grid>
                </PaperWithPadding>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  互动数据
                </Typography>
                <PaperWithPadding>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        互动率
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color="success.main"
                      >
                        {(selectedKol.engagementRate * 100).toFixed(2)}%
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        平均评论
                      </Typography>
                      <Typography variant="body2">
                        {formatNumber(selectedKol.avgComments || 0)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        平均分享
                      </Typography>
                      <Typography variant="body2">
                        {formatNumber(selectedKol.avgShares || 0)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        视频总数
                      </Typography>
                      <Typography variant="body2">
                        {formatNumber(selectedKol.totalVideos || 0)}
                      </Typography>
                    </Grid>
                  </Grid>
                </PaperWithPadding>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  合作信息
                </Typography>
                <PaperWithPadding>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        基础价格
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color="primary.main"
                      >
                        {formatCurrency(selectedKol.basePrice)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        视频价格
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(
                          selectedKol.pricePerVideo || selectedKol.basePrice
                        )}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        完成订单
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {selectedKol.completedOrders || 0}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        平均评分
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Rating
                          value={selectedKol.avgRating || 0}
                          precision={0.1}
                          readOnly
                          size="small"
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </PaperWithPadding>
              </Grid>

              {selectedKol.tags && selectedKol.tags.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    标签
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {selectedKol.tags.map((tag) => (
                      <Chip key={tag} label={tag} />
                    ))}
                  </Stack>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDetailClose}>关闭</Button>
            <Button
              variant="contained"
              startIcon={<MessageIcon />}
              onClick={handleContactOpen}
            >
              联系合作
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onClose={handleContactClose} maxWidth="sm" fullWidth>
        <DialogTitle>联系 {selectedKol?.platformDisplayName || 'KOL'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={6}
            placeholder="请输入您的合作意向，包括合作内容、预算、时间要求等..."
            value={contactMessage}
            onChange={(e) => setContactMessage(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleContactClose}>取消</Button>
          <Button
            variant="contained"
            onClick={handleContactSubmit}
            disabled={!contactMessage.trim()}
          >
            发送
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Helper component for paper with padding
const PaperWithPadding: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Paper
    variant="outlined"
    sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}
  >
    {children}
  </Paper>
);

export default KolDiscoveryPage;
