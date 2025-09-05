import { db } from './server/db';
import { purchaseOrderItems, purchaseOrders } from '@shared/schema';
import { desc, eq } from 'drizzle-orm';

async function testCategories() {
  console.log('====================================');
  console.log('🔍 CHECKING CATEGORY DATA IN DATABASE');
  console.log('====================================\n');
  
  // Get latest draft orders
  const draftOrders = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.status, 'draft'))
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(3);
  
  console.log(`Found ${draftOrders.length} draft orders\n`);
  
  for (const order of draftOrders) {
    console.log(`\n📦 Order: ${order.orderNumber}`);
    console.log(`   Created: ${order.createdAt}`);
    
    // Get items for this order
    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.orderId, order.id));
    
    console.log(`   Items: ${items.length}`);
    
    items.forEach((item, index) => {
      console.log(`\n   Item ${index + 1}: ${item.itemName}`);
      console.log(`     Major Category: ${item.majorCategory || '❌ NULL'}`);
      console.log(`     Middle Category: ${item.middleCategory || '❌ NULL'}`);
      console.log(`     Minor Category: ${item.minorCategory || '❌ NULL'}`);
      console.log(`     Specification: ${item.specification}`);
      console.log(`     Quantity: ${item.quantity}`);
    });
  }
  
  process.exit(0);
}

testCategories();