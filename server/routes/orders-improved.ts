import { Router } from 'express';

const router = Router();

// RESTful Orders API with query-based filtering instead of separate endpoints

// GET /api/orders - List orders with query parameters
router.get('/', async (req: any, res) => {
  try {
    const { storage } = req.app.locals;
    const userId = process.env.NODE_ENV === 'development' ? 'USR_20250531_001' : req.user?.id;
    const user = await storage.getUser(userId);
    
    // Query parameters for filtering
    const {
      status,
      approval,
      urgent,
      project_id: projectId,
      vendor_id: vendorId,
      page = 1,
      limit = 50,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    const filters: any = {};
    
    // Apply filters based on query parameters
    if (status) {
      if (Array.isArray(status)) {
        filters.statuses = status;
      } else {
        filters.status = status;
      }
    }
    
    if (approval === 'pending') {
      filters.pendingApproval = true;
    }
    
    if (urgent === 'true') {
      filters.urgent = true;
    }
    
    if (projectId) {
      filters.projectId = parseInt(projectId as string);
    }
    
    if (vendorId) {
      filters.vendorId = parseInt(vendorId as string);
    }

    // Apply user scope for non-admin users
    if (user?.role !== 'admin') {
      filters.userId = userId;
    }

    const orders = await storage.getFilteredOrders({
      ...filters,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort,
      order
    });

    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ 
      error: "Failed to fetch orders",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/orders/statistics - Order statistics with type query parameter
router.get('/statistics', async (req: any, res) => {
  try {
    const { storage } = req.app.locals;
    const userId = process.env.NODE_ENV === 'development' ? 'USR_20250531_001' : req.user?.id;
    const user = await storage.getUser(userId);
    const type = req.query.type as string;
    const isAdmin = user?.role === 'admin';
    const userScope = isAdmin ? undefined : userId;

    switch (type) {
      case 'approval':
        const approvalStats = await storage.getApprovalStats(userScope);
        res.json(approvalStats);
        break;
      case 'status-breakdown':
        const statusBreakdown = await storage.getOrderStatusBreakdown(userScope);
        res.json(statusBreakdown);
        break;
      case 'monthly-trends':
        const monthlyTrends = await storage.getOrderMonthlyTrends(userScope);
        res.json(monthlyTrends);
        break;
      default:
        const generalStats = await storage.getOrderStatistics(userScope);
        res.json(generalStats);
        break;
    }
  } catch (error) {
    console.error("Error fetching order statistics:", error);
    res.status(500).json({ 
      error: "Failed to fetch order statistics",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/orders/:id - Get specific order
router.get('/:id', async (req: any, res) => {
  try {
    const { storage } = req.app.locals;
    const id = parseInt(req.params.id);
    const userId = process.env.NODE_ENV === 'development' ? 'USR_20250531_001' : req.user?.id;
    const user = await storage.getUser(userId);

    const order = await storage.getOrder(id);
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check authorization for non-admin users
    if (user?.role !== 'admin' && order.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ 
      error: "Failed to fetch order",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/orders - Create new order
router.post('/', async (req: any, res) => {
  try {
    const { storage } = req.app.locals;
    const userId = process.env.NODE_ENV === 'development' ? 'USR_20250531_001' : req.user?.id;
    
    const orderData = {
      ...req.body,
      userId
    };

    const newOrder = await storage.createOrder(orderData);
    
    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: newOrder
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ 
      error: "Failed to create order",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/orders/:id - Update order
router.put('/:id', async (req: any, res) => {
  try {
    const { storage } = req.app.locals;
    const id = parseInt(req.params.id);
    const userId = process.env.NODE_ENV === 'development' ? 'USR_20250531_001' : req.user?.id;
    const user = await storage.getUser(userId);

    const existingOrder = await storage.getOrder(id);
    
    if (!existingOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check authorization for non-admin users
    if (user?.role !== 'admin' && existingOrder.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updatedOrder = await storage.updateOrder(id, req.body);
    
    res.json({
      success: true,
      message: "Order updated successfully",
      data: updatedOrder
    });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ 
      error: "Failed to update order",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/orders/:id - Delete order
router.delete('/:id', async (req: any, res) => {
  try {
    const { storage } = req.app.locals;
    const id = parseInt(req.params.id);
    const userId = process.env.NODE_ENV === 'development' ? 'USR_20250531_001' : req.user?.id;
    const user = await storage.getUser(userId);

    const existingOrder = await storage.getOrder(id);
    
    if (!existingOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check authorization for non-admin users
    if (user?.role !== 'admin' && existingOrder.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    await storage.deleteOrder(id);
    
    res.json({
      success: true,
      message: "Order deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ 
      error: "Failed to delete order",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/orders/:id/actions - Order actions (approve, reject, send, etc.)
router.post('/:id/actions', async (req: any, res) => {
  try {
    const { storage } = req.app.locals;
    const id = parseInt(req.params.id);
    const userId = process.env.NODE_ENV === 'development' ? 'USR_20250531_001' : req.user?.id;
    const { action, ...actionData } = req.body;

    const order = await storage.getOrder(id);
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    let result;
    
    switch (action) {
      case 'approve':
        result = await storage.approveOrder(id, userId, actionData);
        break;
      case 'reject':
        result = await storage.rejectOrder(id, userId, actionData);
        break;
      case 'send':
        result = await storage.sendOrder(id, userId, actionData);
        break;
      case 'complete':
        result = await storage.completeOrder(id, userId, actionData);
        break;
      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    res.json({
      success: true,
      message: `Order ${action} successful`,
      data: result
    });
  } catch (error) {
    console.error(`Error performing order action:`, error);
    res.status(500).json({ 
      error: `Failed to ${req.body.action} order`,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/orders/:id/history - Order history
router.get('/:id/history', async (req: any, res) => {
  try {
    const { storage } = req.app.locals;
    const id = parseInt(req.params.id);
    const userId = process.env.NODE_ENV === 'development' ? 'USR_20250531_001' : req.user?.id;
    const user = await storage.getUser(userId);

    const order = await storage.getOrder(id);
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check authorization for non-admin users
    if (user?.role !== 'admin' && order.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const history = await storage.getOrderHistory(id);
    
    res.json(history);
  } catch (error) {
    console.error("Error fetching order history:", error);
    res.status(500).json({ 
      error: "Failed to fetch order history",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;