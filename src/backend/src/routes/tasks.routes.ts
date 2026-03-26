import { Router } from 'express';
import { tasksController } from '../controllers/tasks.controller';
import { auth } from '../middleware/auth';
import { moderateRateLimiter, strictRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// All task routes require authentication
router.use(auth());

/**
 * @route   GET /api/v1/tasks
 * @desc    Get available tasks list for KOL
 * @access  Private (kol)
 */
router.get('/', tasksController.getTasks);

/**
 * @route   GET /api/v1/tasks/:id
 * @desc    Get task details
 * @access  Private (kol)
 */
router.get('/:id', tasksController.getTask);

/**
 * @route   POST /api/v1/tasks/:id/apply
 * @desc    Apply for a task
 * @access  Private (kol)
 */
router.post('/:id/apply', moderateRateLimiter, tasksController.applyForTask);

/**
 * @route   GET /api/v1/kols/orders
 * @desc    Get KOL orders list
 * @access  Private (kol)
 */
router.get('/kols/orders', tasksController.getOrders);

/**
 * @route   GET /api/v1/kols/orders/:id
 * @desc    Get order details
 * @access  Private (kol)
 */
router.get('/kols/orders/:id', tasksController.getOrder);

/**
 * @route   PUT /api/v1/kols/orders/:id/accept
 * @desc    Accept order
 * @access  Private (kol)
 */
router.put('/kols/orders/:id/accept', strictRateLimiter, tasksController.acceptOrder);

/**
 * @route   PUT /api/v1/kols/orders/:id/reject
 * @desc    Reject order
 * @access  Private (kol)
 */
router.put('/kols/orders/:id/reject', strictRateLimiter, tasksController.rejectOrder);

/**
 * @route   PUT /api/v1/kols/orders/:id/submit
 * @desc    Submit order work
 * @access  Private (kol)
 */
router.put('/kols/orders/:id/submit', strictRateLimiter, tasksController.submitOrder);

/**
 * @route   PUT /api/v1/kols/orders/:id/revise
 * @desc    Revise order work
 * @access  Private (kol)
 */
router.put('/kols/orders/:id/revise', strictRateLimiter, tasksController.reviseOrder);

export default router;
