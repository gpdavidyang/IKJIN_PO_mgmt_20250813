import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Load test environment variables
config({ path: '.env.test' });

// Global test database connection
let testDb: ReturnType<typeof drizzle>;
let sql: ReturnType<typeof postgres>;

// Setup before all tests
beforeAll(async () => {
  // Create test database connection
  const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set');
  }
  
  sql = postgres(connectionString);
  testDb = drizzle(sql, { schema });
  
  // Run migrations or setup test database schema
  // await migrate(testDb, { migrationsFolder: './drizzle' });
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connection
  if (sql) {
    await sql.end();
  }
});

// Reset database state between test suites
beforeEach(async () => {
  // Start a transaction for test isolation
  // This will be rolled back in afterEach
});

afterEach(async () => {
  // Rollback transaction to reset database state
  // Clean up any test files created
});

// Make test database available globally
(global as any).testDb = testDb;

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.VITE_ENVIRONMENT = 'test';

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Export test utilities
export { testDb };