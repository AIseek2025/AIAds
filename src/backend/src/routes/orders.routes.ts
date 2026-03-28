import { Router } from 'express';
import { orderController } from '../controllers/orders.controller';
import { auth } from '../middleware/auth';
import { moderateRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// All order routes require authentication
router.use(auth());

/**
 * @route   POST /api/v1/orders
 * @desc    Create order
 * @access  Private (advertiser)
 */
router.post('/', moderateRateLimiter, orderController.createOrder);

/**
 * @route   GET /api/v1/orders
 * @desc    Get orders list
 * @access  Private
 */
router.get('/', orderController.getOrders);

/**
 * @route   GET /api/v1/orders/:id/cpm-metrics
 * @desc    CPM 口径与预估/结算拆分（数据透明化）
 * @access  Private
 */
router.get('/:id/cpm-metrics', orderController.getOrderCpmMetrics);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get order by ID
 * @access  Private
 */
router.get('/:id', orderController.getOrder);

/**
 * @route   PUT /api/v1/orders/:id/accept
 * @desc    Accept order (KOL action)
 * @access  Private (KOL)
 */
router.put('/:id/accept', moderateRateLimiter, orderController.acceptOrder);

/**
 * @route   PUT /api/v1/orders/:id/reject
 * @desc    Reject order (KOL action)
 * @access  Private (KOL)
 */
router.put('/:id/reject', moderateRateLimiter, orderController.rejectOrder);

/**
 * @route   PUT /api/v1/orders/:id/complete
 * @desc    Complete order (advertiser action)
 * @access  Private (advertiser)
 */
router.put('/:id/complete', moderateRateLimiter, orderController.completeOrder);

/**
 * @route   PUT /api/v1/orders/:id/submit
 * @desc    Submit order work (KOL action)
 * @access  Private (KOL)
 */
router.put('/:id/submit', moderateRateLimiter, orderController.submitOrder);

export default router;
