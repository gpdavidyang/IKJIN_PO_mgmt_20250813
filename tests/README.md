# Purchase Order Management System - Test Suite

## Quick Start

```bash
# Install test dependencies
npm install --save-dev jest @types/jest ts-jest supertest @testing-library/react @testing-library/jest-dom

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e        # End-to-end tests only

# Watch mode for development
npm run test:watch

# Run complete test suite with setup
npm run test:all
```

## Test Structure

```
tests/
├── unit/               # Unit tests for individual functions
├── integration/        # API endpoint and database tests
├── e2e/               # End-to-end user workflow tests
├── utils/             # Test utilities and helpers
│   └── test-helpers.ts
├── auth.test.ts       # Authentication tests
├── vendor.test.ts     # Vendor management tests
├── order.test.ts      # Order workflow tests
├── excel.test.ts      # Excel processing tests
└── setup.ts           # Test environment setup
```

## Writing Tests

### Unit Test Example

```typescript
describe('calculateTotalAmount', () => {
  it('should calculate total with tax correctly', () => {
    const result = calculateTotalAmount(1000000, 0.1);
    expect(result).toBe(1100000);
  });
});
```

### Integration Test Example

```typescript
describe('POST /api/orders', () => {
  it('should create order with valid data', async () => {
    const response = await authenticatedAgent
      .post('/api/orders')
      .send(validOrderData)
      .expect(201);
      
    expect(response.body).toHaveProperty('order');
  });
});
```

### E2E Test Example

```typescript
describe('Complete Order Workflow', () => {
  it('should create, approve, and finalize order', async () => {
    // Login as field worker
    // Create draft order
    // Submit for approval
    // Login as manager
    // Approve order
    // Verify status change
  });
});
```

## Test Database

The test suite uses a separate PostgreSQL database to avoid affecting development data.

1. Create test database:
   ```bash
   createdb po_mgmt_test
   ```

2. Configure `.env.test`:
   ```
   TEST_DATABASE_URL=postgresql://user:password@localhost:5432/po_mgmt_test
   ```

3. Migrations are automatically run before tests

## Test Data

Test utilities provide helper functions for creating test data:

- `createTestUsers()` - Creates users with different roles
- `createTestVendors()` - Creates sample vendors
- `createTestOrders()` - Creates purchase orders in various states

## Mocking

- Email service is mocked to prevent actual emails
- File uploads use in-memory buffers
- External APIs are mocked with predictable responses

## Coverage Goals

- Unit tests: >80% coverage
- Integration tests: >70% coverage
- Critical paths: 100% E2E coverage

## Debugging Tests

```bash
# Run specific test file
npm test auth.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should login"

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

## CI/CD Integration

Tests are automatically run in the CI pipeline:
1. Unit tests on every commit
2. Integration tests on pull requests
3. Full test suite before deployment

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data
3. **Descriptive**: Use clear test descriptions
4. **Fast**: Keep tests fast, mock expensive operations
5. **Reliable**: Avoid flaky tests, use proper waits

## Common Issues

### Database Connection
- Ensure test database exists
- Check connection string in `.env.test`

### Port Conflicts
- Test server uses random ports
- Kill any processes using test ports

### File Permissions
- Test upload directory needs write permissions
- Clean up test files after each run