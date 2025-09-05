// Check recent orders to see if Excel uploads are being saved
import { db } from './server/db';
import { purchaseOrders, purchaseOrderItems } from '@shared/schema';
import { desc, sql } from 'drizzle-orm';

async function checkRecentOrders() {
  console.log('====================================');
  console.log('📋 RECENT ORDERS CHECK');
  console.log('====================================\n');
  
  // Get the 10 most recent orders
  const recentOrders = await db
    .select({
      id: purchaseOrders.id,
      orderNumber: purchaseOrders.orderNumber,
      status: purchaseOrders.status,
      orderStatus: purchaseOrders.orderStatus,
      approvalStatus: purchaseOrders.approvalStatus,
      totalAmount: purchaseOrders.totalAmount,
      createdAt: purchaseOrders.createdAt,
      notes: purchaseOrders.notes
    })
    .from(purchaseOrders)
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(10);
  
  console.log('🕐 10 Most Recent Orders:');
  console.log('-------------------------');
  
  for (const order of recentOrders) {
    console.log(`\n📦 Order: ${order.orderNumber}`);
    console.log(`   ID: ${order.id}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Order Status: ${order.orderStatus || 'N/A'}`);
    console.log(`   Approval Status: ${order.approvalStatus || 'N/A'}`);
    console.log(`   Total: ₩${order.totalAmount?.toLocaleString() || 0}`);
    console.log(`   Created: ${new Date(order.createdAt).toLocaleString('ko-KR')}`);
    
    // Check if this order has items
    const itemCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(purchaseOrderItems)
      .where(sql`${purchaseOrderItems.orderId} = ${order.id}`)
      .then(result => result[0].count);
    
    console.log(`   Items: ${itemCount}`);
    
    if (order.notes) {
      console.log(`   Notes: ${order.notes.substring(0, 100)}...`);
    }
  }
  
  // Check total orders by status
  console.log('\n\n📊 Orders by Status:');
  console.log('--------------------');
  
  const statusCounts = await db
    .select({
      status: purchaseOrders.status,
      count: sql<number>`count(*)::int`
    })
    .from(purchaseOrders)
    .groupBy(purchaseOrders.status);
  
  for (const { status, count } of statusCounts) {
    console.log(`   ${status}: ${count} orders`);
  }
  
  // Check orders created in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [{ recentCount }] = await db
    .select({ recentCount: sql<number>`count(*)::int` })
    .from(purchaseOrders)
    .where(sql`${purchaseOrders.createdAt} > ${oneHourAgo.toISOString()}`);
  
  console.log(`\n⏱️  Orders created in last hour: ${recentCount}`);
  
  console.log('\n====================================\n');
  
  process.exit(0);
}

checkRecentOrders();