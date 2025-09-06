const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testExcelUpload() {
  try {
    // Read the test Excel file
    const excelPath = './test-data/test-purchase-order-with-duplicates.xlsx';
    
    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(excelPath), {
      filename: 'test-order.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    // Step 1: Upload and process the Excel file
    console.log('Step 1: Uploading Excel file...');
    const uploadResponse = await fetch('http://localhost:3001/api/excel-automation/upload-and-process', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'Cookie': 'connect.sid=s%3AFpQT5Dqh4aLlJOt5PtRjJhONlDLJ0hg3.Zzf0m2P6vfXm1xqMCXBekz0VjLJkZ%2FgO%2F5a8NWu%2FsPI' // Use a valid session
      }
    });
    
    const result = await uploadResponse.json();
    console.log('Upload response:', JSON.stringify(result, null, 2));
    
    if (result.orders && result.orders.length > 0) {
      const orderId = result.orders[0].id;
      console.log(`\nCreated order ID: ${orderId}`);
      
      // Check attachments in database
      console.log('\nChecking attachments for order:', orderId);
      // This would need a database query
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testExcelUpload();