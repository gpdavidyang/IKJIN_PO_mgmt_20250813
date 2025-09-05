import dotenv from "dotenv";
dotenv.config();

// Use environment variable if available, otherwise use pooler URL for production
// Note: Direct connection URL (db.supabase.co) shouldn't be used in serverless
const isDirect = process.env.DATABASE_URL?.includes('db.tbvugytmskxxyqfvqmup.supabase.co');
if (!process.env.DATABASE_URL || isDirect) {
  // Use pooler URL for serverless/production environments
  process.env.DATABASE_URL = "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
}
console.log("🔧 Force-set DATABASE_URL:", process.env.DATABASE_URL.split('@')[0] + '@[HIDDEN]');

import express, { type Request, Response, NextFunction } from "express";
import { serveStatic, log } from "./static";
import { migratePasswords } from "./migrate-passwords";
import { createServer } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cookieParser from "cookie-parser";
import router from "./routes/index";
import { requireAuth } from "./local-auth";
import { auditLogger } from "./middleware/audit-logger";
import { webSocketService } from "./services/websocket-service";

// Create app instance
const app = express();

// CORS middleware for production
app.use((req, res, next) => {
  const origin = req.get('Origin');
  
  // Allow specific origins in production
  const allowedOrigins = [
    'https://ikjin-po-mgmt-20250813-dno9.vercel.app',
    'https://ikjin-po-mgmt-20250813-dn.vercel.app',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:5001'
  ];
  
  // Check if origin matches allowed origins or Vercel deployment pattern
  const isAllowedOrigin = !origin || 
    allowedOrigins.includes(origin) ||
    /^https:\/\/ikjin-po-mgmt-20250813-[a-z0-9]+-davidswyang-3963s-projects\.vercel\.app$/.test(origin);
  
  if (isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser()); // Add cookie parser middleware

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

      log(logLine);
    }
  });

  next();
});

// Initialize app configuration
async function initializeApp() {
  // Temporarily skip password migration due to connection issues
  // await migratePasswords();
  
  // Setup session middleware for local authentication
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
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-origin in production
      domain: undefined // Let browser handle domain automatically
    }
  }));

  // Apply audit logging middleware (before routes)
  app.use(auditLogger);

  // Use modular routes
  app.use(router);
  
  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup static serving based on environment
  if (app.get("env") === "development") {
    const server = createServer(app);
    // Dynamically import setupVite only in development
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
    
    // Initialize WebSocket service in development
    webSocketService.initialize(server);
    
    // Start server only if not in Vercel environment
    if (!process.env.VERCEL) {
      const port = process.env.PORT || 5001;
      server.listen(port, "0.0.0.0", () => {
        log(`serving on port ${port}`);
        log(`WebSocket service initialized`);
      });
    }
  } else {
    serveStatic(app);
  }
}

// Initialize synchronously for Vercel
let isInitialized = false;

// For Vercel environment, we need to initialize everything synchronously
if (process.env.VERCEL) {
  console.log("🚀 Vercel environment detected - initializing synchronously");
  
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
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-origin in production
      domain: undefined // Let browser handle domain automatically
    }
  }));

  // Apply audit logging middleware (before routes)
  app.use(auditLogger);

  // Use modular routes
  app.use(router);
  
  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Express error:", err);
    res.status(status).json({ message });
  });

  // Setup static serving
  serveStatic(app);
  
  isInitialized = true;
  console.log("✅ Vercel app initialized synchronously");
} else {
  // For local development, use async initialization
  initializeApp().then(() => {
    log("App initialized successfully");
  }).catch(console.error);
}

// Export for Vercel serverless
export default app;
