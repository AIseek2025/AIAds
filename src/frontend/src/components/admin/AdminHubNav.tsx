import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  ADMIN_APP_NAV_ITEMS,
  filterAdminHubNavItems,
} from './adminNavConfig';

export interface AdminHubNavProps {
  /** 页面内刷新（列表/统计重新拉取） */
  onRefresh?: () => void;
}

/**
 * 管理端内容区顶部快捷导航，与侧栏模块路径一致，便于跨模块跳转与当前页刷新。
 */
export const AdminHubNav: React.FC<AdminHubNavProps> = ({ onRefresh }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const items = filterAdminHubNavItems(pathname, ADMIN_APP_NAV_ITEMS);

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: 1,
        width: '100%',
      }}
    >
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        {items.map(({ hubLabel, path, Icon }) => (
          <Button
            key={path}
            size="small"
            variant="outlined"
            startIcon={<Icon />}
            onClick={() => navigate(path)}
          >
            {hubLabel}
          </Button>
        ))}
        {onRefresh ? (
          <IconButton onClick={onRefresh} color="primary" aria-label="刷新当前页数据">
            <RefreshIcon />
          </IconButton>
        ) : null}
      </Stack>
    </Box>
  );
};
