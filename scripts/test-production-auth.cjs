#!/usr/bin/env node

/**
 * Production Authentication Test Script
 * Tests the authentication flow in production environment
 */

const https = require('https');
const { URL } = require('url');

const PRODUCTION_URL = 'https://ikjin-po-mgmt-20250813-dno9.vercel.app';

async function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PRODUCTION_URL);
    
    const requestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; auth-test)',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (err) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testProductionAuth() {
  console.log('🔍 Testing Production Authentication Flow');
  console.log('=' .repeat(50));

  try {
    // Test 1: Check debug endpoint
    console.log('\n📊 Test 1: Debug endpoint');
    const debugResult = await makeRequest('/api/auth/debug');
    console.log(`Status: ${debugResult.status}`);
    console.log(`Response:`, debugResult.data);

    // Test 2: Check production debug endpoint
    console.log('\n📊 Test 2: Production debug endpoint');
    const prodDebugResult = await makeRequest('/api/auth/debug-prod');
    console.log(`Status: ${prodDebugResult.status}`);
    console.log(`Response:`, prodDebugResult.data);

    // Test 3: Test unauthenticated user endpoint
    console.log('\n📊 Test 3: Unauthenticated /api/auth/user');
    const userResult = await makeRequest('/api/auth/user');
    console.log(`Status: ${userResult.status}`);
    console.log(`Response:`, userResult.data);

    // Test 4: Test simple login endpoint
    console.log('\n📊 Test 4: Simple login test');
    const loginResult = await makeRequest('/api/auth/login-simple', {
      method: 'POST',
      body: {
        email: 'admin@company.com',
        password: 'admin123'
      }
    });
    console.log(`Status: ${loginResult.status}`);
    console.log(`Response:`, loginResult.data);

    // Test 5: Test main login endpoint
    console.log('\n📊 Test 5: Main login endpoint');
    const mainLoginResult = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@company.com', 
        password: 'admin123'
      }
    });
    console.log(`Status: ${mainLoginResult.status}`);
    console.log(`Response:`, mainLoginResult.data);

    console.log('\n✅ Production Authentication Test Completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testProductionAuth();