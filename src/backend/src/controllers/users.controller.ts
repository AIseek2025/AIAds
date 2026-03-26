import { Request, Response } from 'express';
import { userService } from '../services/users.service';
import { asyncHandler, errors } from '../middleware/errorHandler';
import { validateBody } from '../middleware/validation';
import { updateUserSchema, changePasswordSchema } from '../utils/validator';
import { maskUserData } from '../utils/mask';
import { ApiResponse } from '../types';

export class UserController {
  /**
   * GET /api/v1/users/:id
   * Get user by ID
   */
  getUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await userService.getUserById(id as string);

    // Apply masking to sensitive data
    const maskedUser = maskUserData(user);

    const response: ApiResponse<typeof maskedUser> = {
      success: true,
      data: maskedUser,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/users/email/:email
   * Get user by email (admin only)
   */
  getUserByEmail = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.params;

    const user = await userService.getUserByEmail(email as string);

    // Apply masking to sensitive data
    const maskedUser = maskUserData(user);

    const response: ApiResponse<typeof maskedUser> = {
      success: true,
      data: maskedUser,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/users/:id
   * Update user
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if user can update this user
    if (req.user?.id !== id && req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw errors.forbidden('没有权限修改此用户');
    }

    validateBody(updateUserSchema)(req, res, () => {});

    const user = await userService.updateUser(id as string, req.body);

    const response: ApiResponse<typeof user> = {
      success: true,
      data: user,
      message: '用户信息更新成功',
    };

    res.status(200).json(response);
  });

  /**
   * DELETE /api/v1/users/:id
   * Delete user (soft delete)
   */
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if user can delete this user
    if (req.user?.id !== id && req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw errors.forbidden('没有权限删除此用户');
    }

    await userService.deleteUser(id as string);

    const response: ApiResponse = {
      success: true,
      message: '用户已删除',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/users/:id/change-password
   * Change user password
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if user can change this user's password
    if (req.user?.id !== id && req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw errors.forbidden('没有权限修改此用户密码');
    }

    validateBody(changePasswordSchema)(req, res, () => {});

    const { current_password, new_password } = req.body;

    await userService.changePassword(id as string, current_password, new_password);

    const response: ApiResponse = {
      success: true,
      message: '密码修改成功',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/users/:id/verify-email
   * Verify user email (admin only)
   */
  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Admin only
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw errors.forbidden('没有权限执行此操作');
    }

    await userService.verifyEmail(id as string);

    const response: ApiResponse = {
      success: true,
      message: '邮箱验证成功',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/users/:id/verify-phone
   * Verify user phone (admin only)
   */
  verifyPhone = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Admin only
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw errors.forbidden('没有权限执行此操作');
    }

    await userService.verifyPhone(id as string);

    const response: ApiResponse = {
      success: true,
      message: '手机验证成功',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/users/:id/suspend
   * Suspend user (admin only)
   */
  suspendUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Admin only
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw errors.forbidden('没有权限执行此操作');
    }

    const { reason } = req.body;

    await userService.suspendUser(id as string, reason);

    const response: ApiResponse = {
      success: true,
      message: '用户已暂停',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/users/:id/activate
   * Activate user (admin only)
   */
  activateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Admin only
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw errors.forbidden('没有权限执行此操作');
    }

    await userService.activateUser(id as string);

    const response: ApiResponse = {
      success: true,
      message: '用户已激活',
    };

    res.status(200).json(response);
  });
}

export const userController = new UserController();
