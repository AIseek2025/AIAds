import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import { styled } from '@mui/material/styles';

const FooterContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(6, 0),
  mt: 'auto',
}));

const FooterLink = styled(Link)(({ theme }) => ({
  color: theme.palette.text.secondary,
  textDecoration: 'none',
  display: 'block',
  marginBottom: theme.spacing(1),
  '&:hover': {
    color: theme.palette.primary.main,
  },
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(2),
  color: theme.palette.text.primary,
}));

export const Footer: React.FC = () => {
  return (
    <FooterContainer>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="h6" color="primary" fontWeight="bold" gutterBottom>
              AIAds
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              帮助中国工厂/企业投放全球中小 KOL 广告的智能平台
            </Typography>
          </Grid>

          <Grid size={{ xs: 6, sm: 6, md: 2 }}>
            <SectionTitle variant="subtitle1">产品</SectionTitle>
            <FooterLink href="#" variant="body2">
              功能介绍
            </FooterLink>
            <FooterLink href="#" variant="body2">
              定价
            </FooterLink>
            <FooterLink href="#" variant="body2">
              案例展示
            </FooterLink>
          </Grid>

          <Grid size={{ xs: 6, sm: 6, md: 2 }}>
            <SectionTitle variant="subtitle1">支持</SectionTitle>
            <FooterLink href="#" variant="body2">
              帮助中心
            </FooterLink>
            <FooterLink href="#" variant="body2">
              API 文档
            </FooterLink>
            <FooterLink href="#" variant="body2">
              联系我们
            </FooterLink>
          </Grid>

          <Grid size={{ xs: 6, sm: 6, md: 2 }}>
            <SectionTitle variant="subtitle1">公司</SectionTitle>
            <FooterLink href="#" variant="body2">
              关于我们
            </FooterLink>
            <FooterLink href="#" variant="body2">
              加入我们
            </FooterLink>
            <FooterLink href="#" variant="body2">
              隐私政策
            </FooterLink>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <SectionTitle variant="subtitle1">联系方式</SectionTitle>
            <Typography variant="body2" color="text.secondary" paragraph>
              邮箱：support@aiads.com
            </Typography>
            <Typography variant="body2" color="text.secondary">
              电话：400-xxx-xxxx
            </Typography>
          </Grid>
        </Grid>

        <Box
          sx={{
            mt: 4,
            pt: 3,
            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © 2026 AIAds Platform. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </FooterContainer>
  );
};

export default Footer;
