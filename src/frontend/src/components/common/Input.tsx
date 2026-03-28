import React from 'react';
import TextField, { TextFieldProps } from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import { styled } from '@mui/material/styles';

interface InputProps extends Omit<TextFieldProps, 'color'> {
  label?: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  error?: boolean;
  helperText?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number';
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  multiline?: boolean;
  rows?: number;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  name?: string;
  autoComplete?: string;
  color?: 'primary' | 'secondary' | 'error';
}

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    '&.Mui-focused': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
        borderWidth: 2,
      },
    },
    '&.Mui-error': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.error.main,
      },
    },
  },
  '& .MuiInputLabel-root': {
    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },
    '&.Mui-error': {
      color: theme.palette.error.main,
    },
  },
}));

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChange,
  error = false,
  helperText,
  placeholder,
  type = 'text',
  disabled = false,
  required = false,
  fullWidth = true,
  multiline = false,
  rows,
  startAdornment,
  endAdornment,
  name,
  autoComplete,
  color = 'primary',
  ...props
}) => {
  return (
    <StyledTextField
      label={label}
      value={value}
      onChange={onChange}
      type={type}
      variant="outlined"
      fullWidth={fullWidth}
      multiline={multiline}
      rows={rows}
      disabled={disabled}
      required={required}
      error={error}
      helperText={helperText}
      placeholder={placeholder}
      name={name}
      autoComplete={autoComplete}
      color={color}
      InputProps={{
        startAdornment: startAdornment ? (
          <InputAdornment position="start">{startAdornment}</InputAdornment>
        ) : undefined,
        endAdornment: endAdornment ? (
          <InputAdornment position="end">{endAdornment}</InputAdornment>
        ) : undefined,
      }}
      {...props}
    />
  );
};

export default Input;
