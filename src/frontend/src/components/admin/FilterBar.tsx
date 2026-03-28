import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

// Icons
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearAllIcon from '@mui/icons-material/ClearAll';
interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'date' | 'dateRange';
  options?: FilterOption[];
  placeholder?: string;
  defaultValue?: string | string[];
}

interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onReset?: () => void;
  onApply?: (values: Record<string, unknown>) => void;
  showReset?: boolean;
  showApply?: boolean;
  compact?: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  values,
  onChange,
  onReset,
  onApply,
  showReset = true,
  showApply = false,
  compact = false,
}) => {
  const handleFilterChange = (key: string, value: unknown) => {
    onChange(key, value);
  };

  const handleReset = () => {
    onReset?.();
  };

  const handleApply = () => {
    onApply?.(values);
  };

  const hasActiveFilters = Object.values(values).some((v) => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== '' && v !== null && v !== undefined;
  });

  const renderFilter = (filter: FilterConfig) => {
    const value = values[filter.key];

    switch (filter.type) {
      case 'select':
        return (
          <TextField
            key={filter.key}
            select
            label={filter.label}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            size={compact ? 'small' : 'medium'}
            sx={{ minWidth: compact ? 140 : 180 }}
            SelectProps={{
              IconComponent: FilterListIcon,
            }}
          >
            <MenuItem value="">全部</MenuItem>
            {filter.options?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        );

      case 'multiselect':
        return (
          <TextField
            key={filter.key}
            select
            label={filter.label}
            value={value || []}
            onChange={(e) => handleFilterChange(filter.key, typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
            size={compact ? 'small' : 'medium'}
            sx={{ minWidth: compact ? 140 : 180 }}
            SelectProps={{
              multiple: true,
              renderValue: (selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((v) => {
                    const option = filter.options?.find((o) => o.value === v);
                    return <Chip key={v} label={option?.label || v} size="small" />;
                  })}
                </Box>
              ),
            }}
          >
            {filter.options?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        );

      case 'date':
        return (
          <TextField
            key={filter.key}
            label={filter.label}
            type="date"
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            size={compact ? 'small' : 'medium'}
            sx={{ minWidth: compact ? 140 : 180 }}
            InputLabelProps={{ shrink: true }}
          />
        );

      case 'dateRange': {
        const rangeValue =
          value && typeof value === 'object' && !Array.isArray(value)
            ? (value as { start?: string; end?: string })
            : {};
        return (
          <Stack key={filter.key} direction="row" spacing={1} alignItems="center">
            <TextField
              label={`${filter.label} - 开始`}
              type="date"
              value={rangeValue.start || ''}
              onChange={(e) => handleFilterChange(filter.key, { ...rangeValue, start: e.target.value })}
              size={compact ? 'small' : 'medium'}
              sx={{ minWidth: compact ? 130 : 160 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={`${filter.label} - 结束`}
              type="date"
              value={rangeValue.end || ''}
              onChange={(e) => handleFilterChange(filter.key, { ...rangeValue, end: e.target.value })}
              size={compact ? 'small' : 'medium'}
              sx={{ minWidth: compact ? 130 : 160 }}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        p: compact ? 1.5 : 2,
        bgcolor: '#fff',
        borderRadius: 2,
        border: 1,
        borderColor: '#e0e0e0',
        mb: 2,
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        {filters.map((filter) => renderFilter(filter))}

        <Box sx={{ flexGrow: 1 }} />

        {showReset && hasActiveFilters && (
          <Tooltip title="清除所有筛选">
            <IconButton onClick={handleReset} size={compact ? 'small' : 'medium'} color="inherit">
              <ClearAllIcon />
            </IconButton>
          </Tooltip>
        )}

        {showReset && !hasActiveFilters && (
          <Button
            variant="outlined"
            onClick={handleReset}
            size={compact ? 'small' : 'medium'}
            startIcon={<FilterListIcon />}
          >
            重置
          </Button>
        )}

        {showApply && (
          <Button
            variant="contained"
            onClick={handleApply}
            size={compact ? 'small' : 'medium'}
          >
            应用筛选
          </Button>
        )}
      </Stack>
    </Box>
  );
};

export default FilterBar;
