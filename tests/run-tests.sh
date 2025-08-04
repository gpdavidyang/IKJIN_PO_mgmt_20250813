#!/bin/bash

# Test runner script for Purchase Order Management System

echo "🧪 Starting test suite..."

# Check if test database exists
if ! psql -lqt | cut -d \| -f 1 | grep -qw po_mgmt_test; then
    echo "Creating test database..."
    createdb po_mgmt_test
fi

# Run database migrations on test database
echo "Running migrations on test database..."
DATABASE_URL=$TEST_DATABASE_URL npm run db:push

# Clean up previous test uploads
rm -rf test-uploads
mkdir -p test-uploads

# Run different test suites
echo ""
echo "📋 Running unit tests..."
npm test -- --testPathPattern="unit" --coverage

echo ""
echo "🔗 Running integration tests..."
npm test -- --testPathPattern="integration" --coverage

echo ""
echo "🌐 Running E2E tests..."
npm test -- --testPathPattern="e2e" --coverage

# Generate coverage report
echo ""
echo "📊 Generating coverage report..."
npm test -- --coverage --coverageReporters="text-summary"

# Clean up
rm -rf test-uploads

echo ""
echo "✅ Test suite completed!"