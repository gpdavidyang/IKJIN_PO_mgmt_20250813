import session from "express-session";
import type { Express } from "express";

// Ensure we have a consistent session secret
const SESSION_SECRET = process.env.SESSION_SECRET || 'ikjin-po-mgmt-prod-secret-2025-secure-key';

// Log session configuration
console.log("🔧 Session Configuration:", {
  SESSION_SECRET_SET: !!process.env.SESSION_SECRET,
  SESSION_SECRET_LENGTH: SESSION_SECRET.length,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.VERCEL
});

/**
 * Configure session middleware for production
 */
export async function configureProductionSession(app: Express) {
  console.log("=== CONFIGURING PRODUCTION SESSION ===");
  
  // Use the correct Supabase pooler URL
  const poolerUrl = "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
  
  try {
    // Import PostgreSQL session store
    const connectPgSimple = require('connect-pg-simple');
    const pgSession = connectPgSimple(session);
    
    console.log("📊 Creating PostgreSQL session store...");
    
    const sessionStore = new pgSession({
      conString: poolerUrl,
      tableName: 'app_sessions',
      createTableIfMissing: true,
      schemaName: 'public',
      pruneSessionInterval: false, // Disable for serverless
      errorLog: (error: any) => {
        console.error("🔴 Session store error:", error);
      }
    });
    
    console.log("✅ PostgreSQL session store created");
    
    // Configure session middleware
    const sessionMiddleware = session({
      store: sessionStore,
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      name: 'connect.sid',
      cookie: {
        secure: true, // HTTPS only
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax',
        path: '/'
      }
    });
    
    // Apply session middleware
    app.use(sessionMiddleware);
    
    console.log("✅ Session middleware configured:", {
      store: 'PostgreSQL',
      tableName: 'app_sessions',
      secure: true,
      sameSite: 'lax',
      maxAge: '7 days'
    });
    
    return true;
  } catch (error) {
    console.error("🔴 Failed to configure PostgreSQL sessions:", error);
    
    // Fallback to memory store
    console.log("⚠️ Using memory session store (sessions won't persist across restarts)");
    
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
    
    return false;
  }
}

/**
 * Configure session middleware for development
 */
export function configureDevelopmentSession(app: Express) {
  console.log("=== CONFIGURING DEVELOPMENT SESSION ===");
  
  app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid',
    cookie: {
      secure: false, // Allow HTTP in development
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      sameSite: 'lax',
      path: '/'
    }
  }));
  
  console.log("✅ Development session configured (memory store)");
}