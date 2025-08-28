import dotenv from "dotenv";
dotenv.config();

// 환경변수 확인 및 Supabase 연결 설정
const originalDatabaseUrl = process.env.DATABASE_URL;
console.log("🔍 Original DATABASE_URL:", originalDatabaseUrl ? originalDatabaseUrl.split('@')[0] + '@[HIDDEN]' : 'not set');

// Use correct pooler URL for serverless environments
const correctPoolerUrl = "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";

if (originalDatabaseUrl && (
  originalDatabaseUrl.includes('db.tbvugytmskxxyqfvqmup.supabase.co') || 
  originalDatabaseUrl.includes('tbvugytmskxxyqfvqmup.supabase.co:5432')
)) {
  console.log("🔧 Using corrected Supabase pooler URL for serverless");
  process.env.DATABASE_URL = correctPoolerUrl;
  console.log("🔧 Set DATABASE_URL to pooler:", process.env.DATABASE_URL.split('@')[0] + '@[HIDDEN]');
} else if (!originalDatabaseUrl) {
  console.log("🔧 No DATABASE_URL set, using default Supabase pooler");
  process.env.DATABASE_URL = correctPoolerUrl;
  console.log("🔧 Set DATABASE_URL to pooler:", process.env.DATABASE_URL.split('@')[0] + '@[HIDDEN]');
} else {
  console.log("🔧 Using existing DATABASE_URL:", originalDatabaseUrl.split('@')[0] + '@[HIDDEN]');
}
console.log("✨ Production server starting without static file serving");

import express, { type Request, Response, NextFunction } from "express";
import { configureProductionSession } from "./session-config";
import router from "./routes/index";

// Session error handler middleware
const sessionErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err && err.code === 'ECONNREFUSED') {
    console.error("🔴 Database connection failed for sessions, falling back to memory store");
    // Continue without failing the request
    next();
  } else if (err) {
    console.error("🔴 Session error:", err);
    // Continue without failing the request
    next();
  } else {
    next();
  }
};

// Create app instance
const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve attached assets statically
app.use('/attached_assets', express.static('attached_assets'));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Static file serving handled by Vercel - no need for Express static middleware

// Initialize app for production
async function initializeProductionApp() {
  // Configure session middleware FIRST
  await configureProductionSession(app);
  
  // Add session error handler
  app.use(sessionErrorHandler);

  // Use modular routes
  app.use(router);
  
  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Express error:", err);
    res.status(status).json({ message });
  });

  // Skip static serving in Vercel - handled by vercel.json
  console.log("⚠️ Skipping static file serving in Vercel environment");
}

// Initialize synchronously for Vercel
let isInitialized = false;

// For Vercel environment, initialize immediately but synchronously
if (process.env.VERCEL) {
  console.log("🚀 Vercel environment detected - initializing production app");
  
  // Configure session middleware FIRST - this must be synchronous for Vercel
  try {
    // Use a synchronous approach with fallback
    const sessionConfig = require('./session-config');
    
    // Call the async function but don't wait for it to complete
    // Add basic middleware first, then enhance with async session store
    console.log("🔧 Setting up basic session middleware first...");
    
    // Import session for basic setup
    const session = require('express-session');
    const SESSION_SECRET = process.env.SESSION_SECRET || 'ikjin-po-mgmt-prod-secret-2025-secure-key';
    
    // Add basic session middleware immediately
    app.use(session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      name: 'connect.sid',
      cookie: {
        secure: true,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        sameSite: 'lax',
        path: '/'
      }
    }));
    
    console.log("✅ Basic session middleware added");
    
    // Add the debug endpoint immediately
    app.get('/api/debug/session-store', (req: any, res: any) => {
      const sessionData = {
        hasSession: !!req.session,
        sessionID: req.sessionID,
        sessionKeys: req.session ? Object.keys(req.session) : [],
        isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
        storeType: 'Memory (fallback)',
        cookieSettings: req.session?.cookie,
        vercelInit: true
      };
      
      console.log("🔍 Session debug info:", sessionData);
      res.json(sessionData);
    });
    
    // Now try to upgrade to PostgreSQL store asynchronously (non-blocking)
    sessionConfig.configureProductionSession(app).then(() => {
      console.log("✅ PostgreSQL session store upgrade complete");
    }).catch((error: any) => {
      console.error("🔴 PostgreSQL session store upgrade failed, using memory store:", error);
    });
    
  } catch (error) {
    console.error("🔴 Session configuration error:", error);
  }
  
  // Add session error handler
  app.use(sessionErrorHandler);

  // Use modular routes
  app.use(router);
  
  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Express error:", err);
    res.status(status).json({ message });
  });

  // Skip static serving in Vercel - handled by vercel.json
  console.log("⚠️ Skipping static file serving in Vercel environment");
  
  isInitialized = true;
  console.log("✅ Production app initialized for Vercel");
} else {
  // For other environments, use async initialization
  initializeProductionApp().then(() => {
    console.log("App initialized successfully");
  }).catch(console.error);
}

// Export for Vercel serverless
export default app;