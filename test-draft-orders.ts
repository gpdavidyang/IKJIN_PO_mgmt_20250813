// Test script to check draft orders in database
import { db } from './server/db';
import { purchaseOrders } from '@shared/schema';
import { eq, sql, desc } from 'drizzle-orm';

async function checkDraftOrders() {
  try {
    console.log('🔍 Checking for draft orders in the database...\n');
    
    // 1. Count all orders by status
    const statusCounts = await db
      .select({
        status: purchaseOrders.status,
        count: sql<number>`COUNT(*)::int`
      })
      .from(purchaseOrders)
      .groupBy(purchaseOrders.status);
    
    console.log('📊 Order counts by status:');
    statusCounts.forEach(row => {
      console.log(`   ${row.status}: ${row.count} orders`);
    });
    
    // 2. Get draft orders specifically
    const draftOrders = await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        orderDate: purchaseOrders.orderDate,
        createdAt: purchaseOrders.createdAt
      })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.status, 'draft'))
      .limit(10);
    
    console.log('\n📋 Draft orders found:', draftOrders.length);
    if (draftOrders.length > 0) {
      console.log('\nFirst few draft orders:');
      draftOrders.forEach(order => {
        console.log(`   - ${order.orderNumber} (ID: ${order.id}, Date: ${order.orderDate}, Amount: ${order.totalAmount})`);
      });
    }
    
    // 3. Check recent orders (regardless of status)
    const recentOrders = await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        status: purchaseOrders.status,
        orderDate: purchaseOrders.orderDate,
        createdAt: purchaseOrders.createdAt
      })
      .from(purchaseOrders)
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(10);
    
    console.log('\n🕐 10 Most recent orders:');
    recentOrders.forEach(order => {
      console.log(`   - ${order.orderNumber} (Status: ${order.status}, Date: ${order.orderDate}, Created: ${order.createdAt})`);
    });
    
    // 4. Check for NULL status (potential issue)
    const nullStatusOrders = await db
      .select({
        count: sql<number>`COUNT(*)::int`
      })
      .from(purchaseOrders)
      .where(sql`${purchaseOrders.status} IS NULL`);
    
    console.log(`\n⚠️  Orders with NULL status: ${nullStatusOrders[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDraftOrders();