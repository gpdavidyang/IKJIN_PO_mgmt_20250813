// Simple standalone user handler for Vercel
export default async function handler(req, res) {
  console.log('Simple user handler called:', req.method, req.url);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    // For now, return null user (not authenticated)
    // In a real implementation, we would check session/JWT token
    res.status(200).json({
      user: null,
      authenticated: false,
      message: 'No active session'
    });
    
  } catch (error) {
    console.error('User check error:', error);
    res.status(500).json({ 
      message: 'User check failed',
      error: error.message 
    });
  }
}