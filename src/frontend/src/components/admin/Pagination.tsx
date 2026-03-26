import React from 'react';
import Box from '@mui/material/Box';
import Pagination from '@mui/material/Pagination';
import PaginationItem from '@mui/material/PaginationItem';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showTotal?: boolean;
  showQuickJumper?: boolean;
  compact?: boolean;
}

const PaginationComponent: React.FC<PaginationProps> = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelector = true,
  showTotal = true,
  showQuickJumper = false,
  compact = false,
}) => {
  const totalPages = Math.ceil(total / pageSize);
  const [jumpPage, setJumpPage] = React.useState('');

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    onPageChange(value);
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onPageSizeChange?.(Number(event.target.value));
    onPageChange(1); // Reset to first page when changing page size
  };

  const handleJumpPage = () => {
    const pageToJump = parseInt(jumpPage, 10);
    if (!isNaN(pageToJump) && pageToJump >= 1 && pageToJump <= totalPages) {
      onPageChange(pageToJump);
      setJumpPage('');
    }
  };

  const handleJumpPageKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJumpPage();
    }
  };

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
        py: 2,
      }}
    >
      {/* Left Section - Total and Page Size */}
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        {showTotal && (
          <Typography variant="body2" color="text.secondary">
            共 {total} 条记录 {showTotal && total > 0 && `(${startItem}-${endItem})`}
          </Typography>
        )}

        {showPageSizeSelector && onPageSizeChange && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              每页显示
            </Typography>
            <TextField
              select
              size={compact ? 'small' : 'medium'}
              value={pageSize}
              onChange={handlePageSizeChange}
              sx={{ minWidth: 80 }}
            >
              {pageSizeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <Typography variant="body2" color="text.secondary">
              条
            </Typography>
          </Stack>
        )}
      </Stack>

      {/* Center/Right Section - Pagination */}
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        {totalPages > 0 && (
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size={compact ? 'small' : 'medium'}
            showFirstButton
            showLastButton
            renderItem={(item) => (
              <PaginationItem {...item} />
            )}
          />
        )}

        {showQuickJumper && totalPages > 1 && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              跳至
            </Typography>
            <TextField
              size={compact ? 'small' : 'medium'}
              type="number"
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              onKeyPress={handleJumpPageKeyPress}
              sx={{ width: 60 }}
              inputProps={{
                min: 1,
                max: totalPages,
              }}
            />
            <Typography variant="body2" color="text.secondary">
              页
            </Typography>
            <Box component="button" onClick={handleJumpPage} sx={{ ml: 1 }}>
              确定
            </Box>
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

export default PaginationComponent;
