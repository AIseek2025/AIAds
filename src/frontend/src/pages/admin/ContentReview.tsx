import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminContentAPI } from '../../services/adminApi';
import type { ContentItem, ContentListParams } from '../../types';

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
import TablePagination from '@mui/material/TablePagination';
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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Checkbox from '@mui/material/Checkbox';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import Rating from '@mui/material/Rating';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import ImageIcon from '@mui/icons-material/Image';
import ArticleIcon from '@mui/icons-material/Article';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`content-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const ContentReviewPage: React.FC = () => {
  const queryClient = useQueryClient();

  // State
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('');
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewReason, setReviewReason] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Build query params
  const queryParams: ContentListParams = {
    page: page + 1,
    page_size: pageSize,
    sort: 'submitted_at',
    order: 'desc',
  };

  if (keyword) queryParams.keyword = keyword;
  if (contentTypeFilter) queryParams.content_type = contentTypeFilter;

  // Fetch content based on tab
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminContent', queryParams, tabValue],
    queryFn: () => {
      if (tabValue === 0) {
        // Pending tab
        return adminContentAPI.getPendingContent({ page: queryParams.page, page_size: queryParams.page_size });
      } else {
        // All content tab
        return adminContentAPI.getContent(queryParams);
      }
    },
  });

  // Approve content mutation
  const approveContentMutation = useMutation({
    mutationFn: (data: { id: string; note?: string }) =>
      adminContentAPI.approveContent(data.id, { note: data.note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminContent'] });
      setSnackbar({ open: true, message: '内容审核通过', severity: 'success' });
      setReviewDialogOpen(false);
      setReviewNote('');
      setSelectedContent(null);
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: err.response?.data?.error?.message || '操作失败', severity: 'error' });
    },
  });

  // Reject content mutation
  const rejectContentMutation = useMutation({
    mutationFn: (data: { id: string; reason: string; note?: string }) =>
      adminContentAPI.rejectContent(data.id, { reason: data.reason, note: data.note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminContent'] });
      setSnackbar({ open: true, message: '内容审核拒绝', severity: 'success' });
      setReviewDialogOpen(false);
      setReviewReason('');
      setReviewNote('');
      setSelectedContent(null);
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: err.response?.data?.error?.message || '操作失败', severity: 'error' });
    },
  });

  // Batch approve mutation
  const batchApproveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(selectedIds.map(id => adminContentAPI.approveContent(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminContent'] });
      setSnackbar({ open: true, message: `已通过 ${selectedIds.length} 个内容`, severity: 'success' });
      setSelectedIds([]);
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: err.response?.data?.error?.message || '操作失败', severity: 'error' });
    },
  });

  // Handlers
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(0);
    setSelectedIds([]);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
    setPage(0);
  };

  const handleContentTypeFilterChange = (e: SelectChangeEvent<string>) => {
    setContentTypeFilter(e.target.value);
    setPage(0);
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(e.target.value, 10));
    setPage(0);
  };

  const handleViewDetail = (content: ContentItem) => {
    setSelectedContent(content);
    setDetailOpen(true);
  };

  const handleApproveClick = (content: ContentItem) => {
    setSelectedContent(content);
    setReviewAction('approve');
    setReviewDialogOpen(true);
  };

  const handleRejectClick = (content: ContentItem) => {
    setSelectedContent(content);
    setReviewAction('reject');
    setReviewDialogOpen(true);
  };

  const handleReviewSubmit = () => {
    if (!selectedContent) return;
    if (reviewAction === 'approve') {
      approveContentMutation.mutate({ id: selectedContent.id, note: reviewNote });
    } else {
      if (!reviewReason) {
        setSnackbar({ open: true, message: '请填写拒绝原因', severity: 'error' });
        return;
      }
      rejectContentMutation.mutate({ id: selectedContent.id, reason: reviewReason, note: reviewNote });
    }
  };

  const handleSelectContent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked && data?.items) {
      setSelectedIds(data.items.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBatchApprove = () => {
    if (selectedIds.length === 0) return;
    batchApproveMutation.mutate();
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedContent(null);
  };

  const handleCloseReviewDialog = () => {
    setReviewDialogOpen(false);
    setReviewReason('');
    setReviewNote('');
    setSelectedContent(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Content type badge
  const ContentTypeBadge = ({ type }: { type: string }) => {
    const config: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
      video: { icon: <VideoLibraryIcon fontSize="small" />, label: '视频', color: '#FF0050' },
      image: { icon: <ImageIcon fontSize="small" />, label: '图片', color: '#00C8FF' },
      post: { icon: <ArticleIcon fontSize="small" />, label: '图文', color: '#FFAB00' },
    };

    const c = config[type] || { icon: null, label: type, color: '#999' };

    return (
      <Chip
        icon={c.icon}
        label={c.label}
        size="small"
        sx={{ bgcolor: `${c.color}15`, color: c.color, fontWeight: 500 }}
      />
    );
  };

  // Priority badge
  const PriorityBadge = ({ priority }: { priority: string }) => {
    const config: Record<string, { color: string; label: string }> = {
      high: { color: '#F44336', label: '高' },
      normal: { color: '#2196F3', label: '普通' },
      low: { color: '#4CAF50', label: '低' },
    };

    const c = config[priority] || { color: '#999', label: priority };

    return (
      <Chip
        label={c.label}
        size="small"
        sx={{ bgcolor: `${c.color}15`, color: c.color, fontWeight: 500 }}
      />
    );
  };

  // AI Score badge
  const AIScoreBadge = ({ score }: { score: number }) => {
    let color = '#4CAF50';
    if (score < 60) color = '#F44336';
    else if (score < 80) color = '#FF9800';

    return (
      <Chip
        label={`AI: ${score}`}
        size="small"
        sx={{ bgcolor: `${color}15`, color, fontWeight: 600 }}
      />
    );
  };

  const allSelected = selectedIds.length > 0 && data?.items && selectedIds.length === data.items.length;

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          内容审核
        </Typography>
        <Typography variant="body2" color="text.secondary">
          审核用户提交的内容，包括视频、图片、图文等
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={`待审核 (${data?.pagination.total || 0})`} />
            <Tab label="全部内容" />
          </Tabs>
          {tabValue === 0 && selectedIds.length > 0 && (
            <Button
              variant="contained"
              color="success"
              onClick={handleBatchApprove}
              disabled={batchApproveMutation.isPending}
              sx={{ mr: 2, mb: 1 }}
            >
              批量通过 ({selectedIds.length})
            </Button>
          )}
        </Box>
      </Paper>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
            <TextField
              placeholder="搜索内容标题..."
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
              <InputLabel>内容类型</InputLabel>
              <Select
                value={contentTypeFilter}
                label="内容类型"
                onChange={handleContentTypeFilterChange}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="video">视频</MenuItem>
                <MenuItem value="image">图片</MenuItem>
                <MenuItem value="post">图文</MenuItem>
              </Select>
            </FormControl>
            <IconButton onClick={() => queryClient.invalidateQueries({ queryKey: ['adminContent'] })}>
              <RefreshIcon />
            </IconButton>
          </Stack>
        </CardContent>
      </Card>

      {/* Content Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {tabValue === 0 && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={allSelected}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                )}
                <TableCell>内容</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>提交者</TableCell>
                <TableCell>优先级</TableCell>
                <TableCell>AI 评分</TableCell>
                <TableCell>提交时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><CircularProgress size={20} /></TableCell>
                    <TableCell><CircularProgress size={20} /></TableCell>
                    <TableCell><CircularProgress size={20} /></TableCell>
                    <TableCell><CircularProgress size={20} /></TableCell>
                    <TableCell><CircularProgress size={20} /></TableCell>
                    <TableCell><CircularProgress size={20} /></TableCell>
                    <TableCell><CircularProgress size={20} /></TableCell>
                    {tabValue === 0 && <TableCell><CircularProgress size={20} /></TableCell>}
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={tabValue === 0 ? 8 : 7} align="center">
                    <Alert severity="error">加载失败：{(error as Error).message}</Alert>
                  </TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tabValue === 0 ? 8 : 7} align="center">
                    <Typography color="text.secondary" py={4}>暂无数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((content) => (
                  <TableRow key={content.id} hover>
                    {tabValue === 0 && (
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(content.id)}
                          onChange={() => handleSelectContent(content.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {content.thumbnailUrl && (
                          <Box
                            component="img"
                            src={content.thumbnailUrl}
                            alt={content.title}
                            sx={{
                              width: 60,
                              height: 60,
                              objectFit: 'cover',
                              borderRadius: 1,
                              mr: 1.5,
                            }}
                          />
                        )}
                        <Box>
                          <Typography variant="body2" fontWeight="500" noWrap sx={{ maxWidth: 200 }}>
                            {content.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                            {content.description || '无描述'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <ContentTypeBadge type={content.contentType} />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar src={content.submitter?.avatarUrl} sx={{ width: 28, height: 28, mr: 1 }}>
                          {content.submitter?.name?.[0] || 'U'}
                        </Avatar>
                        <Typography variant="body2">{content.submitter?.name || '未知'}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={content.priority || 'normal'} />
                    </TableCell>
                    <TableCell>
                      {content.aiScore ? <AIScoreBadge score={content.aiScore} /> : '-'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {content.submittedAt ? new Date(content.submittedAt).toLocaleString('zh-CN') : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="查看详情">
                        <IconButton size="small" onClick={() => handleViewDetail(content)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {tabValue === 0 && (
                        <>
                          <Tooltip title="通过">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleApproveClick(content)}
                              disabled={approveContentMutation.isPending}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="拒绝">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRejectClick(content)}
                              disabled={rejectContentMutation.isPending}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={data?.pagination.total || 0}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={pageSize}
          onRowsPerPageChange={handlePageSizeChange}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </Card>

      {/* Content Detail Dialog */}
      <Dialog open={detailOpen} onClose={handleCloseDetail} maxWidth="md" fullWidth>
        {selectedContent && (
          <>
            <DialogTitle>内容详情</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                <Grid container spacing={3}>
                  {/* Content Preview */}
                  <Grid size={12}>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        内容预览
                      </Typography>
                      {selectedContent.contentType === 'video' ? (
                        <Box
                          sx={{
                            width: '100%',
                            height: 300,
                            bgcolor: '#000',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <VideoLibraryIcon sx={{ fontSize: 64, color: '#666' }} />
                          <Typography variant="body2" color="#999" sx={{ ml: 1 }}>
                            视频预览 (点击外链查看)
                          </Typography>
                        </Box>
                      ) : selectedContent.contentType === 'image' ? (
                        <Box
                          component="img"
                          src={selectedContent.contentUrl}
                          alt={selectedContent.title}
                          sx={{ width: '100', maxHeight: 400, objectFit: 'contain' }}
                        />
                      ) : (
                        <Box sx={{ p: 3, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                          <Typography variant="body2">{selectedContent.description}</Typography>
                        </Box>
                      )}
                    </Paper>
                  </Grid>

                  {/* Basic Info */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        基本信息
                      </Typography>
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">标题</Typography>
                          <Typography variant="body2">{selectedContent.title}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">类型</Typography>
                          <ContentTypeBadge type={selectedContent.contentType} />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">来源</Typography>
                          <Typography variant="body2">
                            {selectedContent.sourceType === 'campaign_content' ? '活动投稿' : selectedContent.sourceType}
                          </Typography>
                        </Box>
                        {selectedContent.duration && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">时长</Typography>
                            <Typography variant="body2">{selectedContent.duration}秒</Typography>
                          </Box>
                        )}
                      </Stack>
                    </Paper>
                  </Grid>

                  {/* Submitter Info */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        提交者信息
                      </Typography>
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar src={selectedContent.submitter?.avatarUrl} sx={{ width: 32, height: 32, mr: 1 }}>
                            {selectedContent.submitter?.name?.[0] || 'U'}
                          </Avatar>
                          <Typography variant="body2">{selectedContent.submitter?.name || '未知'}</Typography>
                        </Box>
                        {selectedContent.submitter?.platform && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">平台</Typography>
                            <Typography variant="body2">{selectedContent.submitter.platform}</Typography>
                          </Box>
                        )}
                      </Stack>
                    </Paper>
                  </Grid>

                  {/* AI Review */}
                  <Grid size={12}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        AI 审核结果
                      </Typography>
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="body2" color="text.secondary">AI 评分</Typography>
                          {selectedContent.aiScore ? (
                            <Rating value={Math.round(selectedContent.aiScore / 20)} readOnly />
                          ) : (
                            '-'
                          )}
                          {selectedContent.aiScore && (
                            <Typography variant="body2">{selectedContent.aiScore}分</Typography>
                          )}
                        </Box>
                        {selectedContent.aiReview?.suggestions && selectedContent.aiReview.suggestions.length > 0 && (
                          <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              AI 建议
                            </Typography>
                            {selectedContent.aiReview.suggestions.map((suggestion, index) => (
                              <Chip key={index} label={suggestion} size="small" sx={{ mr: 1, mb: 1 }} />
                            ))}
                          </Box>
                        )}
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetail}>关闭</Button>
              {tabValue === 0 && (
                <>
                  <Button
                    onClick={() => {
                      handleCloseDetail();
                      handleApproveClick(selectedContent);
                    }}
                    color="success"
                    variant="contained"
                  >
                    通过
                  </Button>
                  <Button
                    onClick={() => {
                      handleCloseDetail();
                      handleRejectClick(selectedContent);
                    }}
                    color="error"
                    variant="outlined"
                  >
                    拒绝
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onClose={handleCloseReviewDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{reviewAction === 'approve' ? '通过审核' : '拒绝审核'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedContent && (
              <Typography variant="body2" paragraph>
                正在{reviewAction === 'approve' ? '审核通过' : '拒绝'}内容：<strong>{selectedContent.title}</strong>
              </Typography>
            )}
            {reviewAction === 'reject' && (
              <TextField
                fullWidth
                label="拒绝原因"
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                multiline
                rows={3}
                required
                sx={{ mb: 2 }}
                placeholder="请说明拒绝原因"
              />
            )}
            <TextField
              fullWidth
              label="备注（选填）"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              multiline
              rows={2}
              sx={{ mb: 2 }}
              placeholder="内部备注信息"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReviewDialog}>取消</Button>
          <Button
            onClick={handleReviewSubmit}
            variant="contained"
            color={reviewAction === 'approve' ? 'success' : 'error'}
            disabled={reviewAction === 'reject' && !reviewReason}
          >
            {reviewAction === 'approve' ? '确认通过' : '确认拒绝'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ContentReviewPage;
