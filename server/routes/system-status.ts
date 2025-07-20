/**
 * System Status Routes
 * 
 * Provides health check and database connection status
 */

import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { supabaseService } from '../services/supabase-service';
import { db } from '../db';

const router = Router();

/**
 * GET /api/system/status
 * Get overall system status
 */
router.get('/status', async (req, res) => {
  try {
    const connectionInfo = supabaseService.getConnectionInfo();
    const timestamp = new Date().toISOString();

    // Test database connection
    let dbStatus = 'disconnected';
    let dbError = null;

    try {
      if (connectionInfo.provider === 'supabase') {
        const supabaseDb = supabaseService.getDatabase();
        if (supabaseDb) {
          // Simple query to test connection
          await supabaseDb.execute(sql`SELECT 1 as test`);
          dbStatus = 'connected';
        }
      } else if (connectionInfo.provider === 'postgresql' && db) {
        // Test traditional PostgreSQL connection
        await db.execute(sql`SELECT 1 as test`);
        dbStatus = 'connected';
      } else {
        dbStatus = 'mock';
      }
    } catch (error) {
      dbError = error instanceof Error ? error.message : 'Unknown error';
    }

    const status = {
      system: 'Purchase Order Management System',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp,
      database: {
        provider: connectionInfo.provider,
        status: dbStatus,
        projectId: connectionInfo.projectId,
        error: dbError,
      },
      features: {
        userRegistration: true,
        emailVerification: true,
        passwordReset: true,
        excelAutomation: process.env.VITE_ENABLE_EXCEL_UPLOAD === 'true',
        offlineSupport: true,
        mobileResponsive: true,
      },
      services: {
        email: {
          configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
          provider: process.env.SMTP_HOST || 'not-configured',
        },
        storage: {
          uploadDir: process.env.UPLOAD_DIR || './uploads',
        },
      },
    };

    res.json(status);
  } catch (error) {
    console.error('System status check error:', error);
    res.status(500).json({
      error: 'Failed to get system status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/system/health
 * Simple health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const connectionInfo = supabaseService.getConnectionInfo();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: connectionInfo.isConnected ? 'connected' : 'disconnected',
      provider: connectionInfo.provider,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/system/database-info
 * Get detailed database connection information
 */
router.get('/database-info', async (req, res) => {
  try {
    const connectionInfo = supabaseService.getConnectionInfo();
    const supabaseClient = supabaseService.getClient();

    const info = {
      ...connectionInfo,
      capabilities: {
        realtime: !!supabaseClient,
        auth: !!supabaseClient,
        storage: !!supabaseClient,
        edgeFunctions: !!supabaseClient,
      },
      configuration: {
        supabaseConfigured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
        postgresqlConfigured: !!process.env.DATABASE_URL,
        emailConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
      },
      recommendations: [],
    };

    // Add recommendations based on configuration
    if (!info.configuration.supabaseConfigured && !info.configuration.postgresqlConfigured) {
      info.recommendations.push('Configure either Supabase or PostgreSQL for persistent data storage');
    }

    if (!info.configuration.emailConfigured) {
      info.recommendations.push('Configure SMTP settings for user registration and password reset emails');
    }

    if (connectionInfo.provider === 'mock') {
      info.recommendations.push('System is running in mock mode - configure a real database for production use');
    }

    res.json(info);
  } catch (error) {
    console.error('Database info error:', error);
    res.status(500).json({
      error: 'Failed to get database information',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;