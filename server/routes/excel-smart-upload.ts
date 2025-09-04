import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import crypto from 'crypto';
import { requireAuth } from '../local-auth';
import { SmartUploadService } from '../services/smart-upload-service';
import { ValidationService } from '../services/validation-service';
import { AISuggestionService } from '../services/ai-suggestion-service';
import { WebSocketService } from '../services/websocket-service';
import { db } from '../db';
import { validationSessions, validationResults } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Multer configuration for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls', '.xlsm'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files are allowed.'));
    }
  },
});

// Request/Response schemas
const UploadResponseSchema = z.object({
  success: z.boolean(),
  sessionId: z.string(),
  totalItems: z.number(),
  validItems: z.number(),
  warningItems: z.number(),
  errorItems: z.number(),
  message: z.string().optional(),
});

const ValidationStatusSchema = z.object({
  sessionId: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  progress: z.number(),
  results: z.array(z.object({
    rowIndex: z.number(),
    status: z.enum(['valid', 'warning', 'error']),
    errors: z.array(z.string()).optional(),
    warnings: z.array(z.string()).optional(),
  })).optional(),
});

const CorrectionRequestSchema = z.object({
  sessionId: z.string(),
  corrections: z.array(z.object({
    rowIndex: z.number(),
    field: z.string(),
    value: z.any(),
  })),
});

const AISuggestRequestSchema = z.object({
  sessionId: z.string(),
  includeCategories: z.boolean().default(true),
  includeVendors: z.boolean().default(true),
  includeEmails: z.boolean().default(true),
  confidenceThreshold: z.number().min(0).max(100).default(80),
});

// Initialize services
const smartUploadService = new SmartUploadService();
const validationService = new ValidationService();
const aiSuggestionService = new AISuggestionService();
const wsService = WebSocketService.getInstance();

/**
 * POST /api/excel/upload/smart
 * Smart upload endpoint with real-time validation
 */
router.post('/upload/smart', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Create validation session
    const sessionId = crypto.randomUUID();
    const sessionData = {
      id: sessionId,
      userId,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      status: 'processing' as const,
      createdAt: new Date(),
    };

    await db.insert(validationSessions).values(sessionData);

    // Emit WebSocket event for session start
    wsService.emitToUser(userId, 'validation:started', {
      sessionId,
      fileName: req.file.originalname,
    });

    // Process file asynchronously
    smartUploadService.processFileAsync(sessionId, req.file.buffer, userId)
      .then(result => {
        wsService.emitToUser(userId, 'validation:completed', {
          sessionId,
          ...result,
        });
      })
      .catch(error => {
        wsService.emitToUser(userId, 'validation:error', {
          sessionId,
          error: error.message,
        });
      });

    // Return immediate response
    const response = UploadResponseSchema.parse({
      success: true,
      sessionId,
      totalItems: 0, // Will be updated via WebSocket
      validItems: 0,
      warningItems: 0,
      errorItems: 0,
      message: 'File upload started. Processing in background.',
    });

    res.json(response);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Upload failed' 
    });
  }
});

/**
 * GET /api/excel/validation/:sessionId
 * Get validation status and results
 */
router.get('/validation/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get session data
    const session = await db.query.validationSessions.findFirst({
      where: (sessions, { and, eq }) => and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, userId)
      ),
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get validation results
    const results = await db.query.validationResults.findMany({
      where: (results, { eq }) => eq(results.sessionId, sessionId),
    });

    // Group results by status
    const groupedResults = results.reduce((acc, result) => {
      const status = result.validationStatus as 'valid' | 'warning' | 'error';
      if (!acc[status]) acc[status] = [];
      acc[status].push({
        rowIndex: result.rowIndex,
        status,
        errors: result.errorMessage ? [result.errorMessage] : undefined,
        warnings: result.suggestion ? [result.suggestion] : undefined,
      });
      return acc;
    }, {} as Record<string, any[]>);

    const response = ValidationStatusSchema.parse({
      sessionId,
      status: session.status,
      progress: session.status === 'completed' ? 100 : 
               session.status === 'processing' ? 50 : 0,
      results: Object.values(groupedResults).flat(),
    });

    res.json(response);
  } catch (error) {
    console.error('Validation status error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get validation status' 
    });
  }
});

/**
 * PATCH /api/excel/correction/:sessionId
 * Apply corrections to validation session
 */
router.patch('/correction/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate request body
    const correctionData = CorrectionRequestSchema.parse({
      sessionId,
      corrections: req.body.corrections,
    });

    // Apply corrections
    const result = await validationService.applyCorrections(
      sessionId,
      correctionData.corrections,
      userId
    );

    // Emit update via WebSocket
    wsService.emitToUser(userId, 'validation:updated', {
      sessionId,
      corrections: correctionData.corrections.length,
      newStatus: result,
    });

    res.json({ 
      success: true, 
      message: `Applied ${correctionData.corrections.length} corrections`,
      ...result,
    });
  } catch (error) {
    console.error('Correction error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to apply corrections' 
    });
  }
});

/**
 * POST /api/excel/ai/suggest
 * Generate AI suggestions for validation errors
 */
router.post('/ai/suggest', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate request
    const requestData = AISuggestRequestSchema.parse(req.body);

    // Get validation errors for the session
    const errors = await validationService.getSessionErrors(requestData.sessionId, userId);

    if (errors.length === 0) {
      return res.json({ 
        success: true, 
        suggestions: [],
        message: 'No errors to correct',
      });
    }

    // Generate AI suggestions
    const suggestions = await aiSuggestionService.generateSuggestions(
      errors,
      {
        includeCategories: requestData.includeCategories,
        includeVendors: requestData.includeVendors,
        includeEmails: requestData.includeEmails,
        confidenceThreshold: requestData.confidenceThreshold,
      }
    );

    // Store suggestions in database
    await aiSuggestionService.storeSuggestions(requestData.sessionId, suggestions);

    // Emit suggestions via WebSocket
    wsService.emitToUser(userId, 'ai:suggestions', {
      sessionId: requestData.sessionId,
      count: suggestions.length,
      suggestions: suggestions.slice(0, 10), // Send first 10 for preview
    });

    res.json({ 
      success: true, 
      suggestions,
      totalCount: suggestions.length,
      appliedFilters: {
        categories: requestData.includeCategories,
        vendors: requestData.includeVendors,
        emails: requestData.includeEmails,
      },
    });
  } catch (error) {
    console.error('AI suggestion error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to generate suggestions' 
    });
  }
});

/**
 * POST /api/excel/finalize/:sessionId
 * Finalize validation session and create purchase orders
 */
router.post('/finalize/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Finalize session and create orders
    const result = await smartUploadService.finalizeSession(sessionId, userId);

    // Update session status
    await db.update(validationSessions)
      .set({ 
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(validationSessions.id, sessionId));

    // Emit completion event
    wsService.emitToUser(userId, 'session:finalized', {
      sessionId,
      ordersCreated: result.ordersCreated,
      totalAmount: result.totalAmount,
    });

    res.json({ 
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Finalize error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to finalize session' 
    });
  }
});

/**
 * DELETE /api/excel/session/:sessionId
 * Cancel and cleanup validation session
 */
router.delete('/session/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Cleanup session
    await smartUploadService.cleanupSession(sessionId, userId);

    // Emit cancellation event
    wsService.emitToUser(userId, 'session:cancelled', { sessionId });

    res.json({ 
      success: true,
      message: 'Session cancelled and cleaned up',
    });
  } catch (error) {
    console.error('Session cleanup error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to cleanup session' 
    });
  }
});

// Error codes for client reference
export const ERROR_CODES = {
  INVALID_FILE: 'E001',
  FILE_TOO_LARGE: 'E002',
  PROCESSING_FAILED: 'E003',
  SESSION_NOT_FOUND: 'E004',
  UNAUTHORIZED: 'E005',
  VALIDATION_FAILED: 'E006',
  AI_SERVICE_ERROR: 'E007',
} as const;

export default router;