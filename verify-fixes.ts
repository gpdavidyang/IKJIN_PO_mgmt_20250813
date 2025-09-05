// Verify that the fixes for category fields and Korean filenames are working
import { db } from './server/db';
import { purchaseOrderItems, purchaseOrders, attachments } from '@shared/schema';
import { desc, eq } from 'drizzle-orm';

async function verifyFixes() {
  console.log('====================================');
  console.log('🔍 VERIFYING ORDER DETAIL FIXES');
  console.log('====================================\n');
  
  // 1. Check category fields in recent orders
  console.log('1️⃣ Checking Category Fields in Order Items:');
  console.log('----------------------------------------');
  
  const recentOrders = await db
    .select()
    .from(purchaseOrders)
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(3);
  
  for (const order of recentOrders) {
    console.log(`\n📦 Order: ${order.orderNumber}`);
    
    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.orderId, order.id))
      .limit(2);
    
    items.forEach((item, index) => {
      console.log(`   Item ${index + 1}: ${item.itemName}`);
      console.log(`     Major Category: ${item.majorCategory || '❌ NULL'}`);
      console.log(`     Middle Category: ${item.middleCategory || '❌ NULL'}`);
      console.log(`     Minor Category: ${item.minorCategory || '❌ NULL'}`);
    });
  }
  
  // 2. Check Korean filenames in attachments
  console.log('\n\n2️⃣ Checking Korean Filenames in Attachments:');
  console.log('----------------------------------------');
  
  const recentAttachments = await db
    .select()
    .from(attachments)
    .orderBy(desc(attachments.uploadedAt))
    .limit(5);
  
  recentAttachments.forEach((attachment, index) => {
    const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(attachment.originalName);
    const isExcel = attachment.originalName.toLowerCase().includes('.xls');
    
    console.log(`\n📎 Attachment ${index + 1}:`);
    console.log(`   Original Name: ${attachment.originalName}`);
    console.log(`   Has Korean: ${hasKorean ? '✅ Yes' : '❌ No'}`);
    console.log(`   Is Excel: ${isExcel ? '✅ Yes' : '❌ No'}`);
    console.log(`   MIME Type: ${attachment.mimeType}`);
    console.log(`   File Size: ${(attachment.fileSize / 1024).toFixed(2)} KB`);
  });
  
  console.log('\n====================================');
  console.log('📌 FIX SUMMARY:');
  console.log('------------------------------------');
  console.log('1. Category fields will be saved for NEW orders created from Excel');
  console.log('   - Existing orders will still show NULL for categories');
  console.log('   - Test by uploading a new Excel file with category data');
  console.log('\n2. Korean filenames will be properly decoded for NEW uploads');
  console.log('   - Existing attachments may still show corrupted names');
  console.log('   - Test by uploading a new Excel file with Korean filename');
  console.log('====================================\n');
  
  process.exit(0);
}

verifyFixes();