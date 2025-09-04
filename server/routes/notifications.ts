/**
 * Notifications Routes
 * 알림 관리 API
 */

import { Router } from "express";
import { requireAuth } from "../local-auth";
import { NotificationService } from "../services/notification-service";
import { extractToken, verifyToken } from "../jwt-utils";
import { storage } from "../storage";

const router = Router();

// Get user notifications
router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    
    console.log(`📬 Fetching notifications for user ${userId}`);
    
    const notifications = await NotificationService.getUserNotifications(userId, limit);
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch notifications",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Get unread notification count (gracefully handle unauthenticated users)
router.get("/notifications/unread-count", async (req, res) => {
  try {
    // Try to extract and verify token without throwing error
    const token = extractToken(req.headers.authorization, req.cookies);
    
    if (!token) {
      // No token - return 0 for unauthenticated users
      return res.json({
        success: true,
        count: 0,
        authenticated: false
      });
    }
    
    // Verify JWT token
    const payload = verifyToken(token);
    if (!payload) {
      // Invalid token - return 0
      return res.json({
        success: true,
        count: 0,
        authenticated: false
      });
    }
    
    // Get user from database
    const user = await storage.getUser(payload.userId);
    if (!user) {
      // User not found - return 0
      return res.json({
        success: true,
        count: 0,
        authenticated: false
      });
    }
    
    // User is authenticated - get actual count
    const count = await NotificationService.getUnreadNotificationCount(user.id);
    
    res.json({
      success: true,
      count,
      authenticated: true
    });
  } catch (error) {
    console.error("❌ Error getting unread count:", error);
    // Even on error, return 0 instead of error status
    res.json({ 
      success: true,
      count: 0,
      authenticated: false
    });
  }
});

// Mark notification as read
router.put("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    console.log(`📖 Marking notification ${notificationId} as read for user ${userId}`);
    
    const success = await NotificationService.markNotificationAsRead(notificationId, userId);
    
    if (success) {
      res.json({
        success: true,
        message: "Notification marked as read"
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Notification not found or already read"
      });
    }
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to mark notification as read",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Mark all notifications as read
router.put("/notifications/mark-all-read", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    console.log(`📖 Marking all notifications as read for user ${userId}`);
    
    const count = await NotificationService.markAllNotificationsAsRead(userId);
    
    res.json({
      success: true,
      message: `Marked ${count} notifications as read`,
      markedCount: count
    });
  } catch (error) {
    console.error("❌ Error marking all notifications as read:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to mark all notifications as read",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

export default router;