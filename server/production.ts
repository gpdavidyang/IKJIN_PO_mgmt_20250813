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
  // Ensure SESSION_SECRET is set for production
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = 'ikjin-po-mgmt-secure-session-secret-2025-prod';
    console.warn("⚠️ SESSION_SECRET not set in environment, using default secure key");
  }
  
  // CRITICAL FIX: Use PostgreSQL session store for serverless persistence
  // Import connect-pg-simple here to avoid module resolution issues
  try {
    const connectPgSimple = (await import('connect-pg-simple')).default;
    const pgSession = connectPgSimple(session);
    
    // Use the correct pooler URL directly (not from process.env which might be wrong)
    const sessionDbUrl = correctPoolerUrl;
    console.log("🔧 Using session database URL:", sessionDbUrl.split('@')[0] + '@[HIDDEN]');
    
    app.use(session({
      store: new pgSession({
        conString: sessionDbUrl, // Use the hardcoded correct pooler URL
        tableName: 'app_sessions',
        // Serverless-specific settings
        createTableIfMissing: true,
        schemaName: 'public',
        // Disable automatic pruning in serverless (will cause issues)
        pruneSessionInterval: false,
        // Error handling for session store
        errorLog: (error) => {
          console.error("🔴 PostgreSQL session store error:", error);
        }
      }),
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      name: 'connect.sid', // Explicit session cookie name
      cookie: {
        secure: true, // Required for HTTPS in production
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax', // Use lax for Vercel (not strict)
        path: '/', // Ensure cookie is available for all paths
        domain: undefined // Let browser handle domain automatically
      }
    }));
    console.log("✅ PostgreSQL session store initialized with settings:", {
      tableName: 'app_sessions',
      databaseUrl: sessionDbUrl.split('@')[0] + '@[HIDDEN]',
      secure: true,
      sameSite: 'lax',
      maxAge: '7 days',
      pruneSessionInterval: 'disabled for serverless'
    });
    console.log("✅ Using PostgreSQL session store for serverless persistence");
  } catch (sessionError) {
    console.error("🔴 Failed to initialize PostgreSQL session store, using memory fallback:", sessionError);
    app.use(session({
      secret: process.env.SESSION_SECRET || 'ikjin-po-mgmt-secure-session-secret-2025-prod',
      resave: false,
      saveUninitialized: false,
      name: 'connect.sid',
      cookie: {
        secure: true, // Required for HTTPS in production
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax', // Same-site deployment on Vercel
        path: '/',
        domain: undefined
      }
    }));
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
}

// Initialize synchronously for Vercel
let isInitialized = false;

// For Vercel environment, initialize immediately
if (process.env.VERCEL) {
  console.log("🚀 Vercel environment detected - initializing production app");
  
  // Ensure SESSION_SECRET is set for production
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = 'ikjin-po-mgmt-secure-session-secret-2025-prod';
    console.warn("⚠️ SESSION_SECRET not set in environment, using default secure key");
  }
  
  // CRITICAL FIX: Use PostgreSQL session store for serverless persistence
  // Import connect-pg-simple synchronously with error handling
  try {
    const connectPgSimple = require('connect-pg-simple');
    const pgSession = connectPgSimple(session);
    
    // Use the correct pooler URL directly (not from process.env which might be wrong)
    const sessionDbUrl = correctPoolerUrl;
    console.log("🔧 Using session database URL:", sessionDbUrl.split('@')[0] + '@[HIDDEN]');
    
    app.use(session({
      store: new pgSession({
        conString: sessionDbUrl, // Use the hardcoded correct pooler URL
        tableName: 'app_sessions',
        // Serverless-specific settings
        createTableIfMissing: true,
        schemaName: 'public',
        // Disable automatic pruning in serverless (will cause issues)
        pruneSessionInterval: false,
        // Error handling for session store
        errorLog: (error) => {
          console.error("🔴 PostgreSQL session store error:", error);
        }
      }),
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      name: 'connect.sid', // Explicit session cookie name
      cookie: {
        secure: true, // Required for HTTPS in production
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax', // Use lax for Vercel (not strict)
        path: '/', // Ensure cookie is available for all paths
        domain: undefined // Let browser handle domain automatically
      }
    }));
    console.log("✅ PostgreSQL session store initialized with settings:", {
      tableName: 'app_sessions',
      databaseUrl: sessionDbUrl.split('@')[0] + '@[HIDDEN]',
      secure: true,
      sameSite: 'lax',
      maxAge: '7 days',
      pruneSessionInterval: 'disabled for serverless'
    });
    console.log("✅ Using PostgreSQL session store for serverless persistence");
  } catch (sessionError) {
    console.error("🔴 Failed to initialize PostgreSQL session store, using memory fallback:", sessionError);
    app.use(session({
      secret: process.env.SESSION_SECRET || 'ikjin-po-mgmt-secure-session-secret-2025-prod',
      resave: false,
      saveUninitialized: false,
      name: 'connect.sid',
      cookie: {
        secure: true, // Required for HTTPS in production
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax', // Same-site deployment on Vercel
        path: '/',
        domain: undefined
      }
    }));
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