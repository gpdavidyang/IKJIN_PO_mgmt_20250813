// Vercel function for /api/auth/user
import { default as app } from '../../dist/index.js';

export default async function handler(req, res) {
  // Add auth route prefix
  req.url = '/api/auth/user';
  req.path = '/api/auth/user';
  
  console.log('Auth user handler called:', req.method, req.url);
  
  try {
    return app(req, res);
  } catch (error) {
    console.error('Auth user handler error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}