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
import session from "express-session";
import cookieParser from "cookie-parser";
import crypto from "crypto";
// import { configureProductionSession } from "./session-config"; // Not needed for Vercel serverless
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
app.use(cookieParser()); // Add cookie parser middleware

// Serve attached assets statically
app.use('/attached_assets', express.static('attached_assets'));

// Configure session middleware IMMEDIATELY for all environments
console.log("🔧 Setting up session middleware...");
const SESSION_SECRET = process.env.SESSION_SECRET || 'ikjin-po-mgmt-prod-secret-2025-secure-key';

app.use(session({
  secret: SESSION_SECRET,
  resave: true, // Force save to ensure persistence in serverless
  saveUninitialized: true, // Required for serverless to create sessions
  name: 'connect.sid',
  cookie: {
    secure: true, // Always HTTPS in Vercel production
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    sameSite: 'none', // Required for cross-origin in production
    path: '/'
  },
  // Force session regeneration to ensure data persistence
  genid: () => {
    return crypto.randomUUID();
  }
}));

console.log("✅ Session middleware configured globally");

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

// Initialize app for production (removed - using synchronous initialization for Vercel)
// async function initializeProductionApp() { ... }

// Initialize synchronously for Vercel
let isInitialized = false;

// For Vercel environment, initialize immediately but synchronously
if (process.env.VERCEL) {
  console.log("🚀 Vercel environment detected - initializing production app");
  
  // Add session error handler
  app.use(sessionErrorHandler);

  // Add the debug endpoint BEFORE the main router to ensure it's accessible
  app.get('/api/debug/session-store', (req: any, res: any) => {
    const sessionData = {
      hasSession: !!req.session,
      sessionID: req.sessionID,
      sessionKeys: req.session ? Object.keys(req.session) : [],
      sessionData: req.session || null,
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      storeType: 'Global Memory Store',
      cookieSettings: req.session?.cookie,
      cookieHeader: req.headers.cookie,
      vercelInit: true,
      timestamp: new Date().toISOString(),
      sessionStore: {
        ready: typeof req.sessionStore !== 'undefined',
        type: req.sessionStore ? req.sessionStore.constructor.name : 'unknown'
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        SESSION_SECRET_SET: !!process.env.SESSION_SECRET
      },
      middlewareOrder: 'session -> error-handler -> debug-endpoint -> routes'
    };
    
    console.log("🔍 Session debug info:", sessionData);
    res.json(sessionData);
  });

  // Use modular routes AFTER debug endpoints
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
  // For other environments, initialize synchronously as well
  console.log("✅ Non-Vercel production app initialized");
}

// Start server for non-Vercel environments
if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🚀 Production server running on port ${port}`);
  });
}

// Export for Vercel serverless
export default app;