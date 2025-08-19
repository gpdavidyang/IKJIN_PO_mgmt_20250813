// Vercel serverless function to handle all API routes
let app;
let isInitialized = false;

async function getApp() {
  if (!isInitialized) {
    try {
      console.log('=== Initializing Express App for Vercel ===');
      
      // Set Vercel environment variable before importing
      process.env.VERCEL = '1';
      process.env.NODE_ENV = 'production';
      console.log('Environment variables set:', {
        VERCEL: process.env.VERCEL,
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'not set'
      });
      
      console.log('=== Importing Express App from Production Build ===');
      const importResult = await import('../dist/production.js');
      console.log('Import result keys:', Object.keys(importResult));
      console.log('Default export type:', typeof importResult.default);
      
      const expressApp = importResult.default;
      
      if (!expressApp) {
        throw new Error('Express app is null or undefined after import');
      }
      
      console.log('=== Waiting for App Initialization ===');
      // Give the app time to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      app = expressApp;
      isInitialized = true;
      console.log('=== Express App Initialized Successfully ===');
      console.log('App type:', typeof app);
      console.log('App is function:', typeof app === 'function');
      
    } catch (error) {
      console.error('=== Express App Initialization Failed ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }
  
  console.log('=== Returning Cached App ===');
  console.log('App type:', typeof app);
  return app;
}

export default async function handler(req, res) {
  try {
    console.log('=== API Request ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    
    console.log('=== Getting Express App ===');
    const expressApp = await getApp();
    console.log('Express app type:', typeof expressApp);
    console.log('Express app keys:', Object.keys(expressApp || {}));
    
    // CORS headers for production - allow credentials
    const origin = req.headers.origin;
    const allowedOrigins = [
      'https://ikjin-po-mgmt-20250813-dno9.vercel.app',
      'https://ikjin-po-mgmt-20250813-dn.vercel.app',
      'http://localhost:3000',
      'http://localhost:5000'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || 'https://ikjin-po-mgmt-20250813-dno9.vercel.app');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      console.log('=== OPTIONS Request - Returning ===');
      return res.status(200).end();
    }
    
    console.log('=== Calling Express App ===');
    return expressApp(req, res);
  } catch (error) {
    console.error('=== API Handler Error ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error cause:', error.cause);
    
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message,
      errorName: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}