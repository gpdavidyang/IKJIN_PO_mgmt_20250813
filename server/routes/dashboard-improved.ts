import { Router } from 'express';

const router = Router();

// 통합된 RESTful 대시보드 통계 API
router.get('/statistics', async (req: any, res) => {
  try {
    const { storage } = req.app.locals;
    const userId = process.env.NODE_ENV === 'development' ? 'USR_20250531_001' : req.user?.id;
    const user = await storage.getUser(userId);
    const type = req.query.type as string;
    const isAdmin = user?.role === 'admin';
    const userScope = isAdmin ? undefined : userId;

    switch (type) {
      case 'monthly':
        const monthlyStats = await storage.getMonthlyOrderStats(userScope);
        res.json(monthlyStats);
        break;
      case 'vendor':
        const vendorStats = await storage.getVendorOrderStats(userScope);
        res.json(vendorStats);
        break;
      case 'status':
        const statusStats = await storage.getOrderStatusStats(userScope);
        res.json(statusStats);
        break;
      case 'project':
        const projectStats = await storage.getProjectOrderStats(userScope);
        res.json(projectStats);
        break;
      case 'active-projects':
        const activeProjectsCount = await storage.getActiveProjectsCount(userScope);
        res.json({ count: activeProjectsCount });
        break;
      case 'new-projects-month':
        const newProjectsThisMonth = await storage.getNewProjectsThisMonth(userScope);
        res.json({ count: newProjectsThisMonth });
        break;
      case 'recent-projects':
        const recentProjects = await storage.getRecentProjects(userScope);
        res.json(recentProjects);
        break;
      case 'urgent-orders':
        const urgentOrders = await storage.getUrgentOrders(userScope);
        res.json(urgentOrders);
        break;
      default:
        // Default: return overall stats
        const stats = await storage.getDashboardStats(userScope);
        res.json(stats);
        break;
    }
  } catch (error) {
    console.error("Error fetching dashboard statistics:", error);
    res.status(500).json({ 
      error: "Failed to fetch dashboard statistics",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 통합된 대시보드 데이터 (여러 타입의 데이터를 한 번에 가져오기)
router.get('/unified', async (req: any, res) => {
  try {
    const { storage } = req.app.locals;
    const userId = process.env.NODE_ENV === 'development' ? 'USR_20250531_001' : req.user?.id;
    const user = await storage.getUser(userId);
    const isAdmin = user?.role === 'admin';
    const userScope = isAdmin ? undefined : userId;

    // 병렬로 모든 필요한 데이터 가져오기
    const [
      stats,
      monthlyStats,
      vendorStats,
      statusStats,
      projectStats,
      activeProjectsCount,
      newProjectsThisMonth,
      recentProjects,
      urgentOrders
    ] = await Promise.all([
      storage.getDashboardStats(userScope),
      storage.getMonthlyOrderStats(userScope),
      storage.getVendorOrderStats(userScope),
      storage.getOrderStatusStats(userScope),
      storage.getProjectOrderStats(userScope),
      storage.getActiveProjectsCount(userScope),
      storage.getNewProjectsThisMonth(userScope),
      storage.getRecentProjects(userScope),
      storage.getUrgentOrders(userScope)
    ]);

    res.json({
      overview: stats,
      monthly: monthlyStats,
      vendors: vendorStats,
      statuses: statusStats,
      projects: {
        stats: projectStats,
        activeCount: activeProjectsCount,
        newThisMonth: newProjectsThisMonth,
        recent: recentProjects
      },
      orders: {
        urgent: urgentOrders
      },
      meta: {
        isAdmin,
        userScope: userScope ? 'user' : 'all',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error fetching unified dashboard data:", error);
    res.status(500).json({ 
      error: "Failed to fetch unified dashboard data",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;