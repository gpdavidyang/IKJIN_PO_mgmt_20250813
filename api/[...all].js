// Vercel serverless function to handle all API routes
import { default as app } from '../dist/index.js';

export default function handler(req, res) {
  return app(req, res);
}