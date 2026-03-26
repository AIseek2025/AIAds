import app from './app';
import { logger } from './utils/logger';
import { validateConfig } from './config';
import { connectDatabase } from './config/database';
import { tiktokSyncService } from './services/tiktok-sync.service';
import { youtubeSyncService } from './services/youtube-sync.service';
import { instagramSyncService } from './services/instagram-sync.service';

// Main entry point
async function main(): Promise<void> {
  try {
    // Validate configuration
    validateConfig();

    // Connect to database
    await connectDatabase();

    // Initialize sync services (scheduled tasks)
    tiktokSyncService.init();
    youtubeSyncService.init();
    instagramSyncService.init();

    // Server is started in app.ts
    logger.info('Application started successfully');
  } catch (error) {
    logger.error('Failed to start application', { error });
    process.exit(1);
  }
}

// Start application
main();

export default app;
