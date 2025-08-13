// Vercel function for /api/auth/login
import { default as app } from '../../dist/index.js';

export default async function handler(req, res) {
  // Add auth route prefix
  req.url = '/api/auth/login';
  req.path = '/api/auth/login';
  
  console.log('Auth login handler called:', req.method, req.url);
  
  try {
    return app(req, res);
  } catch (error) {
    console.error('Auth login handler error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}