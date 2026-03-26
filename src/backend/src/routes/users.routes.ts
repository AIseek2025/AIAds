import { Router } from 'express';
import { userController } from '../controllers/users.controller';
import { auth, adminOnly } from '../middleware/auth';
import { moderateRateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:id', auth(), userController.getUser);

/**
 * @route   GET /api/v1/users/email/:email
 * @desc    Get user by email (admin only)
 * @access  Admin
 */
router.get('/email/:email', adminOnly, userController.getUserByEmail);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user
 * @access  Private (user or admin)
 */
router.put('/:id', auth(), moderateRateLimiter, userController.updateUser);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user (soft delete)
 * @access  Private (user or admin)
 */
router.delete('/:id', auth(), adminOnly, userController.deleteUser);

/**
 * @route   POST /api/v1/users/:id/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/:id/change-password', auth(), userController.changePassword);

/**
 * @route   POST /api/v1/users/:id/verify-email
 * @desc    Verify user email (admin only)
 * @access  Admin
 */
router.post('/:id/verify-email', adminOnly, userController.verifyEmail);

/**
 * @route   POST /api/v1/users/:id/verify-phone
 * @desc    Verify user phone (admin only)
 * @access  Admin
 */
router.post('/:id/verify-phone', adminOnly, userController.verifyPhone);

/**
 * @route   POST /api/v1/users/:id/suspend
 * @desc    Suspend user (admin only)
 * @access  Admin
 */
router.post('/:id/suspend', adminOnly, userController.suspendUser);

/**
 * @route   POST /api/v1/users/:id/activate
 * @desc    Activate user (admin only)
 * @access  Admin
 */
router.post('/:id/activate', adminOnly, userController.activateUser);

export default router;
