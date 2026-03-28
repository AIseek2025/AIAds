import React from 'react';
import MuiButton, { ButtonProps as MuiButtonProps } from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { styled } from '@mui/material/styles';

interface ButtonProps extends Omit<MuiButtonProps, 'color'> {
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'success';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  children: React.ReactNode;
}

const StyledButton = styled(MuiButton)(() => ({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  minWidth: 100,
  '&.MuiButton-sizeSmall': {
    padding: '6px 16px',
    fontSize: '0.875rem',
  },
  '&.MuiButton-sizeMedium': {
    padding: '8px 24px',
    fontSize: '1rem',
  },
  '&.MuiButton-sizeLarge': {
    padding: '12px 32px',
    fontSize: '1.125rem',
  },
}));

export const Button: React.FC<ButtonProps> = ({
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  loading = false,
  fullWidth = false,
  disabled = false,
  startIcon,
  endIcon,
  children,
  ...props
}) => {
  return (
    <StyledButton
      variant={variant}
      color={color}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
      endIcon={endIcon}
      {...props}
    >
      {loading ? '加载中...' : children}
    </StyledButton>
  );
};

export default Button;
