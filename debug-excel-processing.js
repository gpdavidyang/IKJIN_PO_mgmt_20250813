/**
 * Debug script to test Excel processing pipeline
 * Run with: node debug-excel-processing.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Debug: Excel Processing Pipeline Diagnostics');

// Check if server is running
const checkServerStatus = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/auth/user', {
      method: 'GET'
    });
    console.log('✅ Server is running:', response.status);
    return true;
  } catch (error) {
    console.log('❌ Server is not running:', error.message);
    return false;
  }
};

// Check if uploads directory exists
const checkUploadsDirectory = () => {
  const uploadsDir = path.join(__dirname, 'uploads');
  const exists = fs.existsSync(uploadsDir);
  console.log(`📁 Uploads directory exists: ${exists} (${uploadsDir})`);
  
  if (exists) {
    const files = fs.readdirSync(uploadsDir);
    console.log(`📄 Files in uploads: ${files.length} files`);
    files.forEach(file => {
      const stat = fs.statSync(path.join(uploadsDir, file));
      console.log(`   - ${file} (${Math.round(stat.size / 1024)}KB)`);
    });
  }
  
  return exists;
};

// Test Excel processing with dummy data
const testExcelProcessing = async () => {
  try {
    // Check if there's a test Excel file
    const testFiles = ['test.xlsx', 'sample.xlsx', 'example.xlsx'];
    let testFile = null;
    
    for (const file of testFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        testFile = filePath;
        break;
      }
    }
    
    if (!testFile) {
      console.log('⚠️ No test Excel file found. Please create a test.xlsx file with an "Input" sheet.');
      return;
    }
    
    console.log(`📊 Testing Excel processing with: ${testFile}`);
    
    // Create form data
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(testFile);
    const file = new File([fileBuffer], path.basename(testFile), {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    formData.append('file', file);
    
    console.log('📤 Making request to /api/excel-automation/upload-and-process');
    const response = await fetch('http://localhost:5000/api/excel-automation/upload-and-process', {
      method: 'POST',
      body: formData,
      // No credentials for testing
    });
    
    console.log(`📥 Response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Processing successful:', result);
    } else {
      const errorText = await response.text();
      console.log('❌ Processing failed:', errorText);
    }
    
  } catch (error) {
    console.log('💥 Test failed:', error.message);
  }
};

// Main function
const main = async () => {
  console.log('🚀 Starting Excel processing diagnostics...\n');
  
  // Step 1: Check server
  const serverRunning = await checkServerStatus();
  
  // Step 2: Check uploads directory
  checkUploadsDirectory();
  
  // Step 3: Test processing if server is running
  if (serverRunning) {
    await testExcelProcessing();
  }
  
  console.log('\n✅ Diagnostics complete');
};

main().catch(console.error);