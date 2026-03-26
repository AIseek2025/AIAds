import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';

interface Column<T> {
  id: keyof T | string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  dataKey?: keyof T;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedIds?: Array<string | number>;
  onSelect?: (ids: Array<string | number>) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  sortable?: boolean;
  sortConfig?: {
    field: string;
    order: 'asc' | 'desc';
  };
  onSort?: (field: string, order: 'asc' | 'desc') => void;
}

function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  loading = false,
  emptyMessage = '暂无数据',
  onRowClick,
  selectable = false,
  selectedIds = [],
  onSelect,
  pagination,
  sortable = true,
  sortConfig,
  onSort,
}: DataTableProps<T>) {
  const getRowId = (row: T) => row.id;

  const getCellValue = (row: T, column: Column<T>) => {
    const key = (column.dataKey || column.id) as keyof T;
    return row[key] as React.ReactNode;
  };

  const [localSortConfig, setLocalSortConfig] = useState<{
    field: string;
    order: 'asc' | 'desc';
  } | null>(sortConfig || null);

  const handleSort = (field: string) => {
    if (!sortable && !columns.find((c) => c.id === field)?.sortable) return;

    const newOrder: 'asc' | 'desc' =
      localSortConfig?.field === field && localSortConfig.order === 'asc' ? 'desc' : 'asc';

    const newConfig = { field, order: newOrder };
    setLocalSortConfig(newConfig);
    onSort?.(field, newOrder);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelect && event.target.checked) {
      onSelect(data.map((row) => getRowId(row)).filter((id): id is string | number => id !== undefined));
    } else if (onSelect) {
      onSelect([]);
    }
  };

  const handleSelectRow = (id: string | number) => {
    if (!onSelect) return;
    const newSelected = selectedIds.includes(id)
      ? selectedIds.filter((selectedId) => selectedId !== id)
      : [...selectedIds, id];
    onSelect(newSelected);
  };

  const allSelected = selectable && data.length > 0 && selectedIds.length === data.length;
  const someSelected = selectable && selectedIds.length > 0 && selectedIds.length < data.length;

  if (loading) {
    return (
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Skeleton variant="text" width="100%" height={40} />
          <Skeleton variant="text" width="100%" height={40} />
          <Skeleton variant="text" width="100%" height={40} />
          <Skeleton variant="text" width="100%" height={40} />
          <Skeleton variant="text" width="100%" height={40} />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: pagination ? 'none' : 600 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox" sx={{ width: 50 }}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              {columns.map((column) => {
                const canSort = sortable && column.sortable !== false;
                const isActive = localSortConfig?.field === column.id;

                return (
                  <TableCell
                    key={column.id as string}
                    align={column.align || 'left'}
                    style={{ minWidth: column.minWidth }}
                    sx={{ fontWeight: 600, bgcolor: '#fafafa' }}
                  >
                    {canSort ? (
                      <TableSortLabel
                        active={isActive}
                        direction={isActive ? localSortConfig.order : 'asc'}
                        onClick={() => handleSort(column.id as string)}
                      >
                        {column.label}
                      </TableSortLabel>
                    ) : (
                      column.label
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={selectable ? columns.length + 1 : columns.length}
                  align="center"
                  sx={{ py: 8 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIndex) => (
                <TableRow
                  key={(getRowId(row) ?? rowIndex) as React.Key}
                  hover
                  selected={selectable && getRowId(row) !== undefined && selectedIds.includes(getRowId(row)!)}
                  onClick={() => onRowClick?.(row)}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    '&:last-child td, &:last-child th': { border: 0 },
                  }}
                >
                  {selectable && (
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={getRowId(row) !== undefined && selectedIds.includes(getRowId(row)!)}
                        onChange={() => {
                          const rowId = getRowId(row);
                          if (rowId !== undefined) {
                            handleSelectRow(rowId);
                          }
                        }}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell
                      key={column.id as string}
                      align={column.align || 'left'}
                      sx={{
                        py: 2,
                        fontSize: '0.875rem',
                      }}
                    >
                      {column.render
                        ? column.render(row, rowIndex)
                        : getCellValue(row, column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {pagination && (
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page}
          rowsPerPage={pagination.pageSize}
          onPageChange={(_, newPage) => pagination.onPageChange(newPage)}
          onRowsPerPageChange={(event) => pagination.onPageSizeChange(Number(event.target.value))}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="每页条数"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
          sx={{
            borderTop: 1,
            borderColor: '#e0e0e0',
            '& .MuiTablePagination-toolbar': {
              minHeight: 56,
            },
          }}
        />
      )}
    </Paper>
  );
}

export default DataTable;
