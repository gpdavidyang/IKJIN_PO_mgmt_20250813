// Vercel serverless function to handle all API routes
let app;
let isInitialized = false;

async function getApp() {
  if (!isInitialized) {
    console.log('Initializing Express app for Vercel...');
    
    // Set Vercel environment variable before importing
    process.env.VERCEL = '1';
    process.env.NODE_ENV = 'production';
    
    // Import and wait for initialization
    const { default: expressApp } = await import('../dist/index.js');
    
    // Give the app time to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    app = expressApp;
    isInitialized = true;
    console.log('Express app initialized successfully');
  }
  return app;
}

export default async function handler(req, res) {
  try {
    console.log('API request:', req.method, req.url);
    
    const expressApp = await getApp();
    
    // Add some headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    return expressApp(req, res);
  } catch (error) {
    console.error('API handler error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}