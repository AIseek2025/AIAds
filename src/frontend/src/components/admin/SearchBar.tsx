import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  variant?: 'outlined' | 'filled' | 'standard';
  size?: 'small' | 'medium';
  showSearchButton?: boolean;
  showClearButton?: boolean;
  width?: string | number;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = '搜索...',
  value: controlledValue,
  onChange,
  onSearch,
  onClear,
  disabled = false,
  autoFocus = false,
  variant = 'outlined',
  size = 'medium',
  showSearchButton = true,
  showClearButton = true,
  width,
}) => {
  const [internalValue, setInternalValue] = useState('');
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (onChange) {
        onChange(newValue);
      } else {
        setInternalValue(newValue);
      }
    },
    [onChange]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearch) {
        onSearch(value);
      }
    },
    [onSearch, value]
  );

  const handleSearch = useCallback(() => {
    if (onSearch) {
      onSearch(value);
    }
  }, [onSearch, value]);

  const handleClear = useCallback(() => {
    if (onChange) {
      onChange('');
    } else {
      setInternalValue('');
    }
    if (onClear) {
      onClear();
    }
  }, [onChange, onClear]);

  return (
    <Box sx={{ width: width || '100%' }}>
      <TextField
        fullWidth
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        disabled={disabled}
        autoFocus={autoFocus}
        variant={variant}
        size={size}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: showClearButton && value ? (
            <InputAdornment position="end">
              <IconButton onClick={handleClear} edge="end" size="small">
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            backgroundColor: variant === 'outlined' ? '#fff' : undefined,
          },
        }}
      />
      {showSearchButton && (
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={disabled || !value}
          sx={{
            mt: size === 'small' ? 0.5 : 1,
            px: 3,
            minWidth: 80,
          }}
        >
          搜索
        </Button>
      )}
    </Box>
  );
};

export default SearchBar;
