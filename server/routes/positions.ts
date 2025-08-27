import { Router } from 'express';

const router = Router();

// Mock positions endpoint - returns empty array to prevent 404 errors
router.get('/positions', async (req, res) => {
  try {
    // Return empty array for now - this prevents the 404 error
    res.json([]);
  } catch (error) {
    console.error("Error fetching positions:", error);
    res.status(500).json({ error: "Failed to fetch positions" });
  }
});

// Mock ui-terms endpoint - returns empty array to prevent 404 errors
router.get('/ui-terms', async (req, res) => {
  try {
    // Return empty array for now - this prevents the 404 error
    res.json([]);
  } catch (error) {
    console.error("Error fetching ui-terms:", error);
    res.status(500).json({ error: "Failed to fetch ui-terms" });
  }
});

export default router;