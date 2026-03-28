import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add';
import { AdminHubNav } from '../../components/admin/AdminHubNav';
import { adminInviteCodesAPI } from '../../services/adminApi';
import { getApiErrorMessage } from '../../utils/apiError';
import type { InviteCodeRow } from '../../types';

function formatDt(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('zh-CN');
  } catch {
    return iso;
  }
}

const AdminInviteCodes: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<'advertiser' | 'kol'>('advertiser');
  const [maxUses, setMaxUses] = useState('1');
  const [expiresAt, setExpiresAt] = useState('');
  const [note, setNote] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const queryParams = { page: page + 1, page_size: pageSize };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['adminInviteCodes', queryParams],
    queryFn: () => adminInviteCodesAPI.list(queryParams),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminInviteCodesAPI.create({
        role_target: roleTarget,
        max_uses: Math.max(1, parseInt(maxUses, 10) || 1),
        expires_at: expiresAt.trim() ? new Date(expiresAt).toISOString() : null,
        note: note.trim() || null,
      }),
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ['adminInviteCodes'] });
      setCreateOpen(false);
      setRoleTarget('advertiser');
      setMaxUses('1');
      setExpiresAt('');
      setNote('');
      setSnackbar({ open: true, message: `已创建邀请码：${row.code}`, severity: 'success' });
    },
    onError: (err: unknown) => {
      setSnackbar({ open: true, message: getApiErrorMessage(err, '创建失败'), severity: 'error' });
    },
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => adminInviteCodesAPI.setActive(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminInviteCodes'] });
    },
    onError: (err: unknown) => {
      setSnackbar({ open: true, message: getApiErrorMessage(err, '更新失败'), severity: 'error' });
    },
  });

  const rows = data?.items ?? [];
  const total = data?.pagination.total ?? 0;

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setSnackbar({ open: true, message: '已复制到剪贴板', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: '复制失败', severity: 'error' });
    }
  };

  const handleToggleActive = (row: InviteCodeRow) => {
    activeMutation.mutate({ id: row.id, active: !row.active });
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        注册邀请码
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        创建与管理邀请码；与后端 REQUIRE_INVITE_CODE_FOR_REGISTRATION 配合可强制邀请注册。
      </Typography>
      <AdminHubNav onRefresh={() => void refetch()} />

      {isLoading && <LinearProgress sx={{ my: 2 }} />}
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getApiErrorMessage(error, '加载失败')}
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              新建邀请码
            </Button>
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>邀请码</TableCell>
                  <TableCell>角色</TableCell>
                  <TableCell align="right">已用 / 上限</TableCell>
                  <TableCell>过期</TableCell>
                  <TableCell>启用</TableCell>
                  <TableCell>备注</TableCell>
                  <TableCell>创建时间</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                          {r.code}
                        </Typography>
                        <Tooltip title="复制">
                          <IconButton size="small" onClick={() => void copyCode(r.code)} aria-label="复制邀请码">
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={r.role_target === 'advertiser' ? '广告主' : 'KOL'}
                        color={r.role_target === 'advertiser' ? 'primary' : 'secondary'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {r.used_count} / {r.max_uses}
                    </TableCell>
                    <TableCell>{formatDt(r.expires_at)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={r.active}
                        onChange={() => handleToggleActive(r)}
                        disabled={activeMutation.isPending}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="body2" noWrap title={r.note ?? ''}>
                        {r.note || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDt(r.created_at)}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                        暂无邀请码
                      </Typography>
                    </TableCell>
                  </TableRow>
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
            labelRowsPerPage="每页"
          />
        </CardContent>
      </Card>

      <Dialog open={createOpen} onClose={() => !createMutation.isPending && setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>新建邀请码</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="invite-role-label">目标角色</InputLabel>
              <Select
                labelId="invite-role-label"
                label="目标角色"
                value={roleTarget}
                onChange={(e: SelectChangeEvent) => setRoleTarget(e.target.value as 'advertiser' | 'kol')}
              >
                <MenuItem value="advertiser">广告主</MenuItem>
                <MenuItem value="kol">KOL</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="最大使用次数"
              type="number"
              fullWidth
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              inputProps={{ min: 1, max: 100000 }}
            />
            <TextField
              label="过期时间（可选）"
              type="datetime-local"
              fullWidth
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField label="备注（可选）" fullWidth multiline minRows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
            取消
          </Button>
          <Button variant="contained" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            创建
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default AdminInviteCodes;
