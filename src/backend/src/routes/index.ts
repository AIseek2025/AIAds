import { Router } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import advertisersRoutes from './advertisers.routes';
import campaignsRoutes from './campaigns.routes';
import kolsRoutes from './kols.routes';
import tasksRoutes from './tasks.routes';
import ordersRoutes from './orders.routes';
import adminRoutes from './admin.routes';
import integrationsRoutes from './integrations.routes';
import notificationsRoutes from './notifications.routes';
import { publicController } from '../controllers/public.controller';

const router = Router();

/** 公开配置（无需鉴权；供前端展示阈值，与业务接口语义一致） */
router.get('/public/ui-config', publicController.getUiConfig);

// Admin routes (must be first to avoid conflicts)
router.use('/admin', adminRoutes);

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/advertisers', advertisersRoutes);
router.use('/campaigns', campaignsRoutes);
router.use('/kols', kolsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/orders', ordersRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/integrations', integrationsRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      version: process.env.APP_VERSION || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

export default router;
