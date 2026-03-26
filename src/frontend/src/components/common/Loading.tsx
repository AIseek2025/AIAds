import React from 'react';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';

interface LoadingProps {
  open: boolean;
  message?: string;
}

const StyledBackdrop = styled(Backdrop)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1000,
  color: '#fff',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
}));

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

export const Loading: React.FC<LoadingProps> = ({ open, message }) => {
  return (
    <StyledBackdrop open={open}>
      <LoadingContainer>
        <CircularProgress size={60} thickness={4} />
        {message && (
          <Typography variant="body1" color="inherit">
            {message}
          </Typography>
        )}
      </LoadingContainer>
    </StyledBackdrop>
  );
};

export default Loading;
