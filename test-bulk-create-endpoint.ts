// Test the bulk-create-simple endpoint directly
import axios from 'axios';

async function testBulkCreateEndpoint() {
  console.log('====================================');
  console.log('📋 TESTING BULK-CREATE-SIMPLE ENDPOINT');
  console.log('====================================\n');
  
  const testOrder = {
    rowIndex: 1,
    orderDate: '2025-09-05',
    deliveryDate: '2025-09-12',
    vendorName: '테스트 거래처',
    vendorEmail: 'test@example.com',
    projectName: '테스트 프로젝트',
    majorCategory: '원자재',
    middleCategory: 'ALUM.Sheet',
    minorCategory: '압출',
    items: [{
      itemName: '테스트 품목',
      specification: 'TEST-001',
      quantity: 10,
      unitPrice: 1000,
      totalAmount: 10000,
      remarks: '테스트 비고'
    }],
    isValid: true,
    errors: []
  };
  
  try {
    // Test with a simple curl command first
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const formData = {
      orders: JSON.stringify([testOrder]),
      sendEmail: 'false',
      isDraft: 'true'
    };
    
    // Create multipart form data
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    let body = '';
    
    for (const [key, value] of Object.entries(formData)) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      body += `${value}\r\n`;
    }
    body += `--${boundary}--\r\n`;
    
    // Test with direct HTTP request
    const response = await axios.post('http://localhost:5000/api/orders/bulk-create-simple', body, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Cookie': 'connect.sid=test-session' // This will fail auth but we can see if endpoint exists
      }
    }).catch(error => {
      if (error.response) {
        console.log('📍 Endpoint exists but returned error:');
        console.log('   Status:', error.response.status);
        console.log('   Data:', error.response.data);
        
        if (error.response.status === 403 || error.response.status === 401) {
          console.log('\n✅ Endpoint is configured correctly (authentication required)');
        } else {
          console.log('\n⚠️ Endpoint exists but has other issues');
        }
      } else if (error.code === 'ECONNREFUSED') {
        console.log('❌ Server is not running on port 5000');
        console.log('   Please ensure the server is running: npm run dev');
      } else {
        console.log('❌ Unknown error:', error.message);
      }
      return null;
    });
    
    if (response && response.data) {
      console.log('✅ Success! Order created:');
      console.log('   Response:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  // Also check if server.ts has the route registered
  console.log('\n📋 Checking server route registration...');
  const fs = await import('fs/promises');
  const serverContent = await fs.readFile('./server/index.ts', 'utf8');
  
  if (serverContent.includes('orders-simple')) {
    console.log('✅ orders-simple route is registered in server');
  } else {
    console.log('❌ orders-simple route NOT registered in server');
  }
  
  process.exit(0);
}

testBulkCreateEndpoint();