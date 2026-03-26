import { Router } from 'express';
import { campaignController } from '../controllers/campaigns.controller';
import { auth } from '../middleware/auth';
import { moderateRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// All campaign routes require authentication
router.use(auth());

/**
 * @route   POST /api/v1/campaigns
 * @desc    Create campaign
 * @access  Private (advertiser)
 */
router.post('/', moderateRateLimiter, campaignController.createCampaign);

/**
 * @route   GET /api/v1/campaigns
 * @desc    Get campaigns list
 * @access  Private (advertiser)
 */
router.get('/', campaignController.getCampaigns);

/**
 * @route   GET /api/v1/campaigns/:id
 * @desc    Get campaign by ID
 * @access  Private (advertiser)
 */
router.get('/:id', campaignController.getCampaign);

/**
 * @route   PUT /api/v1/campaigns/:id
 * @desc    Update campaign
 * @access  Private (advertiser)
 */
router.put('/:id', moderateRateLimiter, campaignController.updateCampaign);

/**
 * @route   DELETE /api/v1/campaigns/:id
 * @desc    Delete campaign
 * @access  Private (advertiser)
 */
router.delete('/:id', campaignController.deleteCampaign);

/**
 * @route   POST /api/v1/campaigns/:id/submit
 * @desc    Submit campaign for review
 * @access  Private (advertiser)
 */
router.post('/:id/submit', moderateRateLimiter, campaignController.submitCampaign);

export default router;
