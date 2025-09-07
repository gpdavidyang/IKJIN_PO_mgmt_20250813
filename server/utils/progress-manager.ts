/**
 * Progress Manager for Excel Upload Processing
 * Tracks and broadcasts real-time progress updates via SSE
 */

import { Response } from 'express';

export interface ProgressUpdate {
  sessionId: string;
  step: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message: string;
  details?: {
    current?: number;
    total?: number;
    percentage?: number;
    currentItem?: string;
  };
  timestamp: number;
}

class ProgressManager {
  private sessions: Map<string, ProgressUpdate[]> = new Map();
  private sseClients: Map<string, Response[]> = new Map();

  /**
   * Generate a unique session ID
   */
  createSession(): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessions.set(sessionId, []);
    this.sseClients.set(sessionId, []);
    
    // Clean up old sessions after 10 minutes
    setTimeout(() => {
      this.cleanupSession(sessionId);
    }, 10 * 60 * 1000);
    
    return sessionId;
  }

  /**
   * Add an SSE client for a session
   */
  addClient(sessionId: string, res: Response): void {
    const clients = this.sseClients.get(sessionId) || [];
    clients.push(res);
    this.sseClients.set(sessionId, clients);
    
    // Send initial connection message
    this.sendToClient(res, {
      sessionId,
      step: 'connection',
      status: 'completed',
      message: '연결되었습니다',
      timestamp: Date.now()
    });
  }

  /**
   * Remove an SSE client
   */
  removeClient(sessionId: string, res: Response): void {
    const clients = this.sseClients.get(sessionId) || [];
    const index = clients.indexOf(res);
    if (index > -1) {
      clients.splice(index, 1);
      this.sseClients.set(sessionId, clients);
    }
  }

  /**
   * Send progress update
   */
  updateProgress(update: ProgressUpdate): void {
    // Store progress
    const progress = this.sessions.get(update.sessionId) || [];
    progress.push(update);
    this.sessions.set(update.sessionId, progress);
    
    // Broadcast to all connected clients
    const clients = this.sseClients.get(update.sessionId) || [];
    clients.forEach(client => {
      this.sendToClient(client, update);
    });
  }

  /**
   * Send data to a specific client
   */
  private sendToClient(res: Response, data: any): void {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('Error sending SSE data:', error);
    }
  }

  /**
   * Get all progress for a session
   */
  getSessionProgress(sessionId: string): ProgressUpdate[] {
    return this.sessions.get(sessionId) || [];
  }

  /**
   * Clean up session data
   */
  cleanupSession(sessionId: string): void {
    // Close all SSE connections
    const clients = this.sseClients.get(sessionId) || [];
    clients.forEach(client => {
      try {
        client.end();
      } catch (error) {
        // Client may already be disconnected
      }
    });
    
    // Remove session data
    this.sessions.delete(sessionId);
    this.sseClients.delete(sessionId);
  }

  /**
   * Helper method to update specific steps
   */
  updateStep(sessionId: string, step: string, status: 'processing' | 'completed' | 'error', message: string, details?: any): void {
    this.updateProgress({
      sessionId,
      step,
      status,
      message,
      details,
      timestamp: Date.now()
    });
  }
}

// Singleton instance
export const progressManager = new ProgressManager();