import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSettingsAPI } from '../../services/adminApi';
import { getApiErrorMessage } from '../../utils/apiError';
import type { SystemSettings, AdminRoleDefinition } from '../../types';
import { AdminHubNav } from '../../components/admin/AdminHubNav';

// MUI Components
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
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
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import PeopleIcon from '@mui/icons-material/People';
import BadgeIcon from '@mui/icons-material/Badge';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';

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
      id={`settings-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // State
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [settings, setSettings] = useState<Partial<SystemSettings>>({
    siteName: 'AIAds',
    siteUrl: 'https://aiads.com',
    logoUrl: '',
    faviconUrl: '',
    emailFrom: 'noreply@aiads.com',
    enableRegistration: true,
    enableEmailVerification: true,
    enableMaintenanceMode: false,
    maintenanceMessage: '系统维护中，请稍后再试',
  });
  const [selectedRole, setSelectedRole] = useState<AdminRoleDefinition | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch settings
  const { data: settingsData, isLoading: settingsLoading, refetch: refetchSettings } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: () => adminSettingsAPI.getSettings(),
  });

  useEffect(() => {
    if (!settingsData) return;
    // 将服务端配置合并到本地可编辑表单（加载完成后一次性同步）
    // eslint-disable-next-line react-hooks/set-state-in-effect -- controlled form needs snapshot from query
    setSettings((prev) => ({
      ...prev,
      siteName: settingsData.siteName ?? settingsData.platform?.name ?? prev.siteName,
      siteUrl: settingsData.siteUrl ?? prev.siteUrl,
      logoUrl: settingsData.logoUrl ?? settingsData.platform?.logoUrl ?? prev.logoUrl,
      faviconUrl: settingsData.faviconUrl ?? prev.faviconUrl,
      emailFrom: settingsData.emailFrom ?? settingsData.platform?.supportEmail ?? prev.emailFrom,
      enableRegistration: settingsData.enableRegistration ?? prev.enableRegistration,
      enableEmailVerification: settingsData.enableEmailVerification ?? prev.enableEmailVerification,
      enableMaintenanceMode:
        settingsData.enableMaintenanceMode ?? settingsData.platform?.maintenanceMode ?? prev.enableMaintenanceMode,
      maintenanceMessage: settingsData.maintenanceMessage ?? prev.maintenanceMessage,
    }));
  }, [settingsData]);

  // Fetch roles
  const { data: roles, refetch: refetchRoles } = useQuery({
    queryKey: ['adminRoles'],
    queryFn: () => adminSettingsAPI.getRoles(),
  });

  // Fetch audit logs
  const { data: auditLogs, isLoading: logsLoading, refetch: refetchAuditLogs } = useQuery({
    queryKey: ['adminAuditLogs', page, pageSize],
    queryFn: () => adminSettingsAPI.getAuditLogs({ page: page + 1, page_size: pageSize }),
  });

  // Fetch admins
  const { data: admins, refetch: refetchAdmins } = useQuery({
    queryKey: ['adminAdmins'],
    queryFn: () => adminSettingsAPI.getAdmins(),
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<SystemSettings>) => adminSettingsAPI.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      setSnackbar({ open: true, message: '设置已保存', severity: 'success' });
    },
    onError: (err: unknown) => {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, '保存失败'),
        severity: 'error',
      });
    },
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: (data: { name: string; description: string; permissions: string[] }) =>
      adminSettingsAPI.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRoles'] });
      setSnackbar({ open: true, message: '角色创建成功', severity: 'success' });
      setRoleDialogOpen(false);
      setNewRoleName('');
      setNewRoleDescription('');
    },
    onError: (err: unknown) => {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, '创建失败'),
        severity: 'error',
      });
    },
  });

  // Handlers
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSettingsChange = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateRole = () => {
    const name = newRoleName.trim();
    if (!name) return;
    createRoleMutation.mutate({
      name,
      description: newRoleDescription.trim(),
      permissions: [],
    });
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settings);
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(e.target.value, 10));
    setPage(0);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
    setPage(0);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleHubRefresh = () => {
    void refetchSettings();
    void refetchRoles();
    void refetchAuditLogs();
    void refetchAdmins();
  };

  const exportAuditLogsMutation = useMutation({
    mutationFn: () => adminSettingsAPI.exportAuditLogsReport({ format: 'csv' }),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const d = new Date().toISOString().slice(0, 10);
      a.download = `audit_logs_${d}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: '审计日志已开始下载', severity: 'success' });
    },
    onError: (err: unknown) => {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, '导出失败（需超级管理员权限）'),
        severity: 'error',
      });
    },
  });

  const handleExportLogs = () => {
    exportAuditLogsMutation.mutate();
  };

  // Permission categories
  const permissionCategories = [
    {
      category: '用户管理',
      permissions: ['user:view', 'user:create', 'user:edit', 'user:delete', 'user:ban', 'user:unban'],
    },
    {
      category: 'KOL 管理',
      permissions: ['kol:view', 'kol:review', 'kol:approve', 'kol:reject', 'kol:suspend'],
    },
    {
      category: '内容审核',
      permissions: ['content:view', 'content:review', 'content:approve', 'content:reject', 'content:delete'],
    },
    {
      category: '财务管理',
      permissions: ['finance:view', 'finance:export', 'withdrawal:review', 'withdrawal:approve', 'withdrawal:reject'],
    },
    {
      category: '系统设置',
      permissions: ['settings:view', 'settings:edit', 'role:manage', 'admin:manage', 'audit:view'],
    },
  ];

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          系统设置
        </Typography>
        <Typography variant="body2" color="text.secondary">
          管理系统配置、管理员、角色权限和操作日志
        </Typography>
      </Box>
      <AdminHubNav onRefresh={handleHubRefresh} />
      <Alert severity="info" sx={{ mb: 3, mt: 2 }}>
        刷新将重新拉取系统配置、角色列表、管理员列表与当前页操作日志；未保存的表单修改仍以本地编辑为准。
      </Alert>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="系统配置" icon={<SettingsIcon />} iconPosition="start" />
          <Tab label="管理员管理" icon={<PeopleIcon />} iconPosition="start" />
          <Tab label="角色权限" icon={<BadgeIcon />} iconPosition="start" />
          <Tab label="操作日志" icon={<DescriptionIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Panel 0 - System Settings */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardHeader title="基本设置" />
              <CardContent>
                {settingsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="网站名称"
                    value={settings.siteName}
                    onChange={(e) => handleSettingsChange('siteName', e.target.value)}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="网站地址"
                    value={settings.siteUrl}
                    onChange={(e) => handleSettingsChange('siteUrl', e.target.value)}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Logo URL"
                    value={settings.logoUrl}
                    onChange={(e) => handleSettingsChange('logoUrl', e.target.value)}
                    size="small"
                    placeholder="https://..."
                  />
                  <TextField
                    fullWidth
                    label="Favicon URL"
                    value={settings.faviconUrl}
                    onChange={(e) => handleSettingsChange('faviconUrl', e.target.value)}
                    size="small"
                    placeholder="https://..."
                  />
                </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardHeader title="邮件设置" />
              <CardContent>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="发件人邮箱"
                    value={settings.emailFrom}
                    onChange={(e) => handleSettingsChange('emailFrom', e.target.value)}
                    size="small"
                  />
                  <Typography variant="body2" color="text.secondary">
                    用于发送系统通知、验证邮件等
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ mt: 3 }}>
              <CardHeader title="功能开关" />
              <CardContent>
                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enableRegistration}
                        onChange={(e) => handleSettingsChange('enableRegistration', e.target.checked)}
                      />
                    }
                    label="允许用户注册"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enableEmailVerification}
                        onChange={(e) => handleSettingsChange('enableEmailVerification', e.target.checked)}
                      />
                    }
                    label="邮箱验证"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enableMaintenanceMode}
                        onChange={(e) => handleSettingsChange('enableMaintenanceMode', e.target.checked)}
                        color="warning"
                      />
                    }
                    label="维护模式"
                  />
                  {settings.enableMaintenanceMode && (
                    <TextField
                      fullWidth
                      label="维护提示信息"
                      value={settings.maintenanceMessage}
                      onChange={(e) => handleSettingsChange('maintenanceMessage', e.target.value)}
                      size="small"
                      multiline
                      rows={2}
                    />
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveSettings}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? <CircularProgress size={24} /> : '保存设置'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab Panel 1 - Admin Management */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardHeader
            title="管理员列表"
            action={
              <Button variant="contained" startIcon={<AddIcon />}>
                创建管理员
              </Button>
            }
          />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>管理员</TableCell>
                  <TableCell>邮箱</TableCell>
                  <TableCell>角色</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>最后登录</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {admins?.map((admin) => (
                  <TableRow key={admin.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar src={admin.avatarUrl} sx={{ width: 36, height: 36, mr: 1.5 }}>
                          {admin.name[0]}
                        </Avatar>
                        <Typography variant="body2" fontWeight="500">
                          {admin.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{admin.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={admin.role === 'super_admin' ? '超级管理员' : admin.role === 'admin' ? '管理员' : admin.role}
                        size="small"
                        color={admin.role === 'super_admin' ? 'error' : 'primary'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={admin.status === 'active' ? '正常' : '禁用'}
                        size="small"
                        color={admin.status === 'active' ? 'success' : 'default'}
                        variant={admin.status === 'active' ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString('zh-CN') : '从未'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="编辑">
                        <IconButton size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="重置密码">
                        <IconButton size="small" color="warning">
                          <SecurityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </TabPanel>

      {/* Tab Panel 2 - Role Management */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardHeader
                title="角色列表"
                action={
                  <IconButton onClick={() => setRoleDialogOpen(true)}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                }
              />
              <List>
                {roles?.map((role) => (
                  <ListItem
                    key={role.id}
                    sx={{
                      mb: 1,
                    }}
                  >
                    <ListItemButton
                      selected={selectedRole?.id === role.id}
                      onClick={() => setSelectedRole(role)}
                      sx={{
                        border: 1,
                        borderColor: selectedRole?.id === role.id ? 'primary.main' : 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <ListItemText
                        primary={role.name}
                        secondary={`${role.permissions?.length || 0} 个权限`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardHeader title="权限配置" />
              <CardContent>
                {selectedRole ? (
                  <Stack spacing={3}>
                    <TextField
                      fullWidth
                      label="角色名称"
                      value={selectedRole.name}
                      size="small"
                      InputProps={{ readOnly: true }}
                    />
                    <TextField
                      fullWidth
                      label="描述"
                      value={selectedRole.description}
                      size="small"
                      multiline
                      rows={2}
                      InputProps={{ readOnly: true }}
                    />
                    <Divider />
                    <Typography variant="subtitle2" fontWeight="bold">
                      权限列表
                    </Typography>
                    {permissionCategories.map((category) => (
                      <Box key={category.category}>
                        <Typography variant="body2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                          {category.category}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {category.permissions.map((permission) => (
                            <Chip
                              key={permission}
                              label={permission}
                              size="small"
                              color={selectedRole.permissions?.includes(permission) ? 'primary' : 'default'}
                              variant={selectedRole.permissions?.includes(permission) ? 'filled' : 'outlined'}
                            />
                          ))}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                    请选择一个角色查看详情
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Create Role Dialog */}
        <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>创建角色</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="角色名称"
                  size="small"
                  placeholder="例如：运营专员"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                />
                <TextField
                  fullWidth
                  label="描述"
                  size="small"
                  multiline
                  rows={2}
                  placeholder="描述该角色的职责和权限范围"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                />
              </Stack>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRoleDialogOpen(false)}>取消</Button>
            <Button
              variant="contained"
              onClick={handleCreateRole}
              disabled={createRoleMutation.isPending || !newRoleName.trim()}
            >
              创建
            </Button>
          </DialogActions>
        </Dialog>
      </TabPanel>

      {/* Tab Panel 3 - Audit Logs */}
      <TabPanel value={tabValue} index={3}>
        <Card>
          <CardHeader
            title="操作审计日志"
            action={
              <Stack direction="row" spacing={1}>
                <TextField
                  placeholder="搜索操作内容..."
                  value={keyword}
                  onChange={handleSearch}
                  size="small"
                  sx={{ width: 240 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleExportLogs}
                  disabled={exportAuditLogsMutation.isPending}
                >
                  {exportAuditLogsMutation.isPending ? '导出中…' : '导出日志'}
                </Button>
              </Stack>
            }
          />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>时间</TableCell>
                  <TableCell>操作人</TableCell>
                  <TableCell>操作类型</TableCell>
                  <TableCell>操作内容</TableCell>
                  <TableCell>IP 地址</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logsLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                    </TableRow>
                  ))
                ) : auditLogs?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary" py={4}>暂无日志</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs?.items.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString('zh-CN') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar src={log.admin?.avatarUrl} sx={{ width: 28, height: 28, mr: 1 }}>
                            {log.admin?.name?.[0] || 'A'}
                          </Avatar>
                          <Typography variant="body2">{log.admin?.name || '系统'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.action}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                          {log.details}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {log.ipAddress || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="查看详情">
                          <IconButton size="small">
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={auditLogs?.pagination.total || 0}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={pageSize}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </Card>
      </TabPanel>

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

export default SettingsPage;
