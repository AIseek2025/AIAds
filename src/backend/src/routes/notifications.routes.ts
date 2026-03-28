import { Router } from 'express';
import { notificationsController } from '../controllers/notifications.controller';
import { auth } from '../middleware/auth';
import { moderateRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/unread-count', auth(), notificationsController.unreadCount);
router.post('/read-all', auth(), moderateRateLimiter, notificationsController.markAllRead);
router.get('/', auth(), notificationsController.list);
router.patch('/:id/read', auth(), moderateRateLimiter, notificationsController.markRead);

export default router;
