import React from 'react';
import { mockDashboardStats } from '../../data/mockData';

// MUI Components
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Avatar from '@mui/material/Avatar';

// Icons
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import StarIcon from '@mui/icons-material/Star';
import CampaignIcon from '@mui/icons-material/Campaign';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

const StatsDemoPage: React.FC = () => {
  const stats = [
    {
      title: '总用户数',
      value: (mockDashboardStats as any).totalUsers?.toLocaleString() || '0',
      icon: <PeopleIcon />,
      color: '#1976d2',
    },
    {
      title: '广告主数量',
      value: (mockDashboardStats as any).totalAdvertisers?.toLocaleString() || '0',
      icon: <BusinessIcon />,
      color: '#2e7d32',
    },
    {
      title: 'KOL 数量',
      value: (mockDashboardStats as any).totalKols?.toLocaleString() || '0',
      icon: <StarIcon />,
      color: '#ed6c02',
    },
    {
      title: '活动总数',
      value: (mockDashboardStats as any).totalCampaigns?.toLocaleString() || '0',
      icon: <CampaignIcon />,
      color: '#9c27b0',
    },
    {
      title: '总 GMV',
      value: `¥${((mockDashboardStats as any).totalGmv || 0) / 10000}万`,
      icon: <TrendingUpIcon />,
      color: '#d32f2f',
    },
    {
      title: '平台收入',
      value: `¥${((mockDashboardStats as any).totalRevenue || 0) / 10000}万`,
      icon: <AttachMoneyIcon />,
      color: '#00796b',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>📈 数据统计</Typography>

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: stat.color, width: 56, height: 56 }}>
                    {stat.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {stat.value}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>数据趋势分析</Typography>
          <Typography color="text.secondary">
            数据趋势分析功能开发中...
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>KOL 效果分析</Typography>
          <Typography color="text.secondary">
            KOL 效果分析功能开发中...
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>活动转化分析</Typography>
          <Typography color="text.secondary">
            活动转化分析功能开发中...
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default StatsDemoPage;
