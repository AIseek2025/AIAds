import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { auth } from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/v1/auth/login-email-code
 * @desc    Login with email + verification code (purpose=login)
 * @access  Public
 */
router.post('/login-email-code', strictRateLimiter, authController.loginEmailCode);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', authController.refresh);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', auth(), authController.logout);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', auth(), authController.me);

/**
 * @route   POST /api/v1/auth/verification-code
 * @desc    Send verification code
 * @access  Public
 */
router.post('/verification-code', strictRateLimiter, authController.sendVerificationCode);

/**
 * @route   POST /api/v1/auth/verify-code
 * @desc    Verify verification code
 * @access  Public
 */
router.post('/verify-code', strictRateLimiter, authController.verifyCode);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password
 * @access  Public
 */
router.post('/reset-password', strictRateLimiter, authController.resetPassword);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password (requires auth)
 * @access  Private
 */
router.post('/change-password', auth(), authController.changePassword);

export default router;
