/**
 * Supabase Database Service
 * 
 * Provides connection and utilities for Supabase PostgreSQL database
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

export class SupabaseService {
  private client: SupabaseClient | null = null;
  private db: ReturnType<typeof drizzle> | null = null;
  private pgClient: ReturnType<typeof postgres> | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Supabase connection
   */
  private async initialize(): Promise<void> {
    try {
      const config = this.getSupabaseConfig();
      
      if (!config) {
        console.log('⚠️ Supabase configuration not found, falling back to existing PostgreSQL setup');
        return;
      }

      // Create Supabase client
      this.client = createClient(config.url, config.anonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: false, // Server-side, no session persistence needed
        },
      });

      // Create PostgreSQL connection for Drizzle ORM
      // Extract connection string from Supabase URL
      const connectionString = this.buildConnectionString(config);
      
      if (connectionString) {
        this.pgClient = postgres(connectionString, {
          ssl: { rejectUnauthorized: false },
          max: 10,
          idle_timeout: 20,
          connect_timeout: 10,
        });

        this.db = drizzle(this.pgClient, { schema });
        
        // Test connection
        await this.testConnection();
        this.isConnected = true;
        
        console.log('✅ Supabase database connected successfully');
      }
    } catch (error) {
      console.error('❌ Supabase initialization failed:', error);
      this.isConnected = false;
    }
  }

  /**
   * Get Supabase configuration from environment variables
   */
  private getSupabaseConfig(): SupabaseConfig | null {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey) {
      return null;
    }

    return {
      url,
      anonKey,
      serviceRoleKey,
    };
  }

  /**
   * Build PostgreSQL connection string from Supabase URL
   */
  private buildConnectionString(config: SupabaseConfig): string | null {
    try {
      // Supabase URL format: https://[project-id].supabase.co
      const url = new URL(config.url);
      const projectId = url.hostname.split('.')[0];
      
      const dbPassword = process.env.SUPABASE_DB_PASSWORD;
      if (!dbPassword) {
        console.error('❌ SUPABASE_DB_PASSWORD is required for database connection');
        return null;
      }

      // Supabase PostgreSQL connection string format
      return `postgresql://postgres:${dbPassword}@db.${projectId}.supabase.co:5432/postgres`;
    } catch (error) {
      console.error('❌ Failed to build connection string:', error);
      return null;
    }
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    if (!this.pgClient) {
      throw new Error('PostgreSQL client not initialized');
    }

    // Simple query to test connection
    await this.pgClient`SELECT 1 as test`;
  }

  /**
   * Get Supabase client
   */
  getClient(): SupabaseClient | null {
    return this.client;
  }

  /**
   * Get Drizzle database instance
   */
  getDatabase(): ReturnType<typeof drizzle> | null {
    return this.db;
  }

  /**
   * Check if connected to Supabase
   */
  isSupabaseConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection status and info
   */
  getConnectionInfo(): {
    isConnected: boolean;
    provider: 'supabase' | 'postgresql' | 'mock';
    projectId?: string;
  } {
    if (this.isConnected && this.client) {
      const config = this.getSupabaseConfig();
      const projectId = config?.url ? new URL(config.url).hostname.split('.')[0] : undefined;
      
      return {
        isConnected: true,
        provider: 'supabase',
        projectId,
      };
    }

    // Check if traditional PostgreSQL is connected
    if (process.env.DATABASE_URL) {
      return {
        isConnected: true,
        provider: 'postgresql',
      };
    }

    return {
      isConnected: false,
      provider: 'mock',
    };
  }

  /**
   * Create database tables using Drizzle migrations
   */
  async runMigrations(): Promise<boolean> {
    if (!this.db) {
      console.log('⚠️ No database connection available for migrations');
      return false;
    }

    try {
      // Note: In production, you should use proper Drizzle migrations
      // This is a simplified version for demonstration
      console.log('🔄 Running database migrations...');
      
      // Check if tables exist - simple health check
      const result = await this.pgClient!`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      `;

      if (result.length === 0) {
        console.log('📊 Database tables not found. Please run: npx drizzle-kit push');
        return false;
      }

      console.log('✅ Database migrations verified');
      return true;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      return false;
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    try {
      if (this.pgClient) {
        await this.pgClient.end();
      }
      this.isConnected = false;
      console.log('🔌 Supabase connections closed');
    } catch (error) {
      console.error('❌ Error closing Supabase connections:', error);
    }
  }

  /**
   * Create a new user in Supabase Auth (alternative to email verification)
   */
  async createAuthUser(email: string, password: string, metadata?: any): Promise<{ success: boolean; user?: any; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Supabase client not available' };
    }

    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, user: data.user };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Verify email with Supabase Auth
   */
  async verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Supabase client not available' };
    }

    try {
      const { error } = await this.client.auth.verifyOtp({
        token_hash: token,
        type: 'email',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Reset password with Supabase Auth
   */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Supabase client not available' };
    }

    try {
      const { error } = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();

// Export database connection (for backward compatibility)
export const supabaseDb = supabaseService.getDatabase();