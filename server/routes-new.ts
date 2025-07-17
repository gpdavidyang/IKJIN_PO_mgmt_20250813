import express, { type Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import path from "path";
import { seedData } from "./seed-data";
import router from "./routes/index";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware for local authentication
  const PostgresSessionStore = connectPg(session);
  const sessionStore = new PostgresSessionStore({ 
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false  // Table already exists, don't try to create
  });

  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid', // Use default session cookie name for better compatibility
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax' // Add sameSite for better cookie handling
    }
  }));

  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  // Serve attached assets statically
  app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

  // Use modular routes
  app.use(router);

  // Initialize seed data if needed
  await seedData();

  const server = createServer(app);
  return server;
}