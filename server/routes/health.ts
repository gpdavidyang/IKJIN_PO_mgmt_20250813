/**
 * Health Check Routes
 * 
 * Provides endpoints to check the health and status of various system components
 * including database connectivity, authentication system, and environment configuration.
 */

import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { shouldUseFallback } from "../fallback-auth";

const router = Router();

/**
 * Basic health check endpoint
 * Returns server status and timestamp
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    vercel: process.env.VERCEL ? 'true' : 'false'
  });
});

/**
 * Database health check endpoint
 * Tests database connectivity and returns detailed status
 */
router.get('/health/database', async (req, res) => {
  const status = {
    database: {
      configured: false,
      connected: false,
      error: null as string | null,
      fallbackActive: false
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'unknown',
      VERCEL: process.env.VERCEL ? 'true' : 'false',
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      JWT_SECRET_SET: !!process.env.JWT_SECRET,
      SESSION_SECRET_SET: !!process.env.SESSION_SECRET
    },
    timestamp: new Date().toISOString()
  };

  // Check if database is configured
  status.database.configured = !!process.env.DATABASE_URL;
  status.database.fallbackActive = shouldUseFallback();

  if (!status.database.configured) {
    status.database.error = 'DATABASE_URL environment variable not set';
    
    // Return 503 Service Unavailable when database is not configured
    return res.status(503).json({
      ...status,
      message: 'Database not configured. Using fallback authentication.',
      instructions: 'Add DATABASE_URL to Vercel environment variables'
    });
  }

  // Test database connection
  try {
    if (!db) {
      throw new Error('Database instance not initialized');
    }
    
    // Run a simple query to test connectivity
    const result = await db.execute(sql`SELECT 1 as test`);
    
    if (result) {
      status.database.connected = true;
    }
  } catch (error) {
    status.database.connected = false;
    status.database.error = error instanceof Error ? error.message : String(error);
    
    // Return 503 when database connection fails
    return res.status(503).json({
      ...status,
      message: 'Database connection failed. Using fallback authentication.',
      recommendation: 'Check DATABASE_URL configuration and database server status'
    });
  }

  // Return 200 OK when everything is healthy
  res.json({
    ...status,
    message: 'All systems operational'
  });
});

/**
 * Authentication system health check
 * Checks the status of authentication components
 */
router.get('/health/auth', (req, res) => {
  const status = {
    authentication: {
      jwtConfigured: !!process.env.JWT_SECRET,
      sessionConfigured: !!process.env.SESSION_SECRET,
      databaseAuthAvailable: !!process.env.DATABASE_URL && !!db,
      fallbackAuthActive: shouldUseFallback(),
      fallbackReason: null as string | null
    },
    timestamp: new Date().toISOString()
  };

  // Determine why fallback is active (if it is)
  if (status.authentication.fallbackAuthActive) {
    if (!process.env.DATABASE_URL) {
      status.authentication.fallbackReason = 'DATABASE_URL not configured';
    } else if (!db) {
      status.authentication.fallbackReason = 'Database connection failed';
    }
  }

  // Determine overall health
  const isHealthy = status.authentication.jwtConfigured && 
                   (status.authentication.databaseAuthAvailable || status.authentication.fallbackAuthActive);

  if (!isHealthy) {
    return res.status(503).json({
      ...status,
      message: 'Authentication system not fully configured',
      recommendations: [
        !status.authentication.jwtConfigured ? 'Set JWT_SECRET environment variable' : null,
        !status.authentication.databaseAuthAvailable && !status.authentication.fallbackAuthActive ? 
          'Configure DATABASE_URL or ensure fallback auth is working' : null
      ].filter(Boolean)
    });
  }

  res.json({
    ...status,
    message: status.authentication.fallbackAuthActive ? 
      'Authentication operational (using fallback)' : 
      'Authentication fully operational'
  });
});

/**
 * Comprehensive system health check
 * Checks all critical components and returns overall status
 */
router.get('/health/system', async (req, res) => {
  const results = {
    server: true,
    database: false,
    authentication: false,
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'unknown',
      VERCEL: process.env.VERCEL ? 'true' : 'false',
      isProduction: process.env.NODE_ENV === 'production',
      isVercel: !!process.env.VERCEL
    },
    timestamp: new Date().toISOString()
  };

  // Check database
  if (process.env.DATABASE_URL && db) {
    try {
      await db.execute(sql`SELECT 1`);
      results.database = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }
  }

  // Check authentication
  results.authentication = !!process.env.JWT_SECRET && 
                          (results.database || shouldUseFallback());

  // Determine overall status
  const isHealthy = results.server && results.authentication;
  const statusCode = isHealthy ? 200 : 503;
  const overallStatus = isHealthy ? 'operational' : 'degraded';

  res.status(statusCode).json({
    status: overallStatus,
    components: results,
    fallbackActive: shouldUseFallback(),
    message: shouldUseFallback() ? 
      'System operational with fallback authentication (DATABASE_URL not configured)' :
      isHealthy ? 'All systems operational' : 'System degraded - some components not functional'
  });
});

export default router;