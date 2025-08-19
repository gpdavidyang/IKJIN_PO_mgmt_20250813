#!/usr/bin/env node

/**
 * Production Session Persistence Test
 * Tests cookie-based session management across requests
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
        'User-Agent': 'Mozilla/5.0 (compatible; session-test)',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': PRODUCTION_URL,
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
            cookies: res.headers['set-cookie'],
            data: jsonData
          });
        } catch (err) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            cookies: res.headers['set-cookie'],
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

async function testProductionSession() {
  console.log('🔍 Testing Production Session Persistence');
  console.log('=' .repeat(50));

  try {
    // Test 1: Login and get session cookie
    console.log('\n🔐 Test 1: Login and capture session cookie');
    const loginResult = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@company.com', 
        password: 'admin123'
      }
    });
    
    console.log(`Login Status: ${loginResult.status}`);
    console.log(`Response:`, loginResult.data);
    console.log(`Set-Cookie headers:`, loginResult.cookies);
    
    if (loginResult.status !== 200) {
      throw new Error('Login failed');
    }
    
    // Extract session cookie
    let sessionCookie = '';
    if (loginResult.cookies && loginResult.cookies.length > 0) {
      sessionCookie = loginResult.cookies[0].split(';')[0];
      console.log(`Extracted session cookie: ${sessionCookie}`);
    } else {
      console.log('⚠️ No session cookie received from login');
    }
    
    // Test 2: Use session cookie to check authentication
    console.log('\n🍪 Test 2: Test session persistence with cookie');
    const authTestResult = await makeRequest('/api/auth/user', {
      headers: {
        Cookie: sessionCookie
      }
    });
    
    console.log(`Auth test status: ${authTestResult.status}`);
    console.log(`Auth test response:`, authTestResult.data);
    
    if (authTestResult.status === 200) {
      console.log('✅ Session cookie authentication successful');
    } else {
      console.log('❌ Session cookie authentication failed');
    }
    
    // Test 3: Test without cookie (should fail)
    console.log('\n🚫 Test 3: Test without session cookie (should be 401)');
    const noCookieResult = await makeRequest('/api/auth/user');
    
    console.log(`No cookie status: ${noCookieResult.status}`);
    console.log(`No cookie response:`, noCookieResult.data);
    
    if (noCookieResult.status === 401) {
      console.log('✅ Correctly rejected request without session cookie');
    } else {
      console.log('⚠️ Unexpected response without session cookie');
    }
    
    console.log('\n📊 Session Test Summary:');
    console.log('- Login successful:', loginResult.status === 200);
    console.log('- Session cookie received:', !!sessionCookie);
    console.log('- Cookie authentication works:', authTestResult.status === 200);
    console.log('- No cookie correctly rejected:', noCookieResult.status === 401);
    
    const allTestsPassed = loginResult.status === 200 && 
                          !!sessionCookie && 
                          authTestResult.status === 200 && 
                          noCookieResult.status === 401;
                          
    console.log('\n🎯 Overall Result:', allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
    
  } catch (error) {
    console.error('❌ Session test failed:', error);
  }
}

testProductionSession();