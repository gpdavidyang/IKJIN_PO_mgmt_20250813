// Simple test handler for Vercel
export default function handler(req, res) {
  console.log('Test handler called:', req.method, req.url);
  
  res.status(200).json({ 
    message: 'Test API working',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    env: {
      VERCEL: process.env.VERCEL || 'not set',
      DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'not set'
    }
  });
}