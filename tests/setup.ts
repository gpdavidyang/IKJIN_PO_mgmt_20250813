import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock database setup for now - avoid actual connections during testing
let testDb: any;
let sql: any;

// Setup before all tests
beforeAll(async () => {
  // Mock database connections for testing
  console.log('Test setup initialized');
});

// Cleanup after all tests
afterAll(async () => {
  // Mock cleanup
  console.log('Test cleanup completed');
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