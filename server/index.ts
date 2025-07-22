import dotenv from "dotenv";
dotenv.config();

// 환경변수 강제 오버라이드 - Direct Connection 사용
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@db.tbvugytmskxxyqfvqmup.supabase.co:5432/postgres?sslmode=require&connect_timeout=60";
console.log("🔧 Force-set DATABASE_URL:", process.env.DATABASE_URL.split('@')[0] + '@[HIDDEN]');

import express, { type Request, Response, NextFunction } from "express";
import { setupVite, serveStatic, log } from "./vite";
import { migratePasswords } from "./migrate-passwords";
import { createServer } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import router from "./routes/index";
import { requireAuth } from "./local-auth";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve attached assets statically
app.use('/attached_assets', express.static('attached_assets'));

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

(async () => {
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
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    }
  }));

  // Use modular routes
  app.use(router);
  
  const server = createServer(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on configurable port
  // this serves both the API and the client.
  const port = process.env.PORT || 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
