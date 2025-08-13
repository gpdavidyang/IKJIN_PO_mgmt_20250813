import dotenv from "dotenv";
dotenv.config();

// 환경변수 확인 및 Supabase 연결 설정
const originalDatabaseUrl = process.env.DATABASE_URL;
if (originalDatabaseUrl) {
  console.log("🔍 Original DATABASE_URL:", originalDatabaseUrl.split('@')[0] + '@[HIDDEN]');
  
  // Fix incorrect hostname in DATABASE_URL
  if (originalDatabaseUrl.includes('db.tbvugytmskxxyqfvqmup.supabase.co')) {
    console.log("🔧 Fixing incorrect hostname in DATABASE_URL");
    process.env.DATABASE_URL = originalDatabaseUrl.replace('db.tbvugytmskxxyqfvqmup.supabase.co', 'tbvugytmskxxyqfvqmup.supabase.co');
    console.log("🔧 Fixed DATABASE_URL:", process.env.DATABASE_URL.split('@')[0] + '@[HIDDEN]');
  }
} else {
  console.error("❌ DATABASE_URL environment variable not set");
  process.exit(1);
}
console.log("✨ Production server starting without static file serving");

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import router from "./routes/index";

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
  // Setup session middleware
  const pgSession = connectPgSimple(session);
  app.use(session({
    store: new pgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'app_sessions'
    }),
    secret: process.env.SESSION_SECRET || 'default-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  }));

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
  
  // Setup session middleware immediately
  const pgSession = connectPgSimple(session);
  app.use(session({
    store: new pgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'app_sessions'
    }),
    secret: process.env.SESSION_SECRET || 'default-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  }));

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