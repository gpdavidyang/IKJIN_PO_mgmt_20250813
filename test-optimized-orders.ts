// Test script to check optimized orders query
import { OptimizedOrdersService } from './server/utils/optimized-orders-query';
import { db } from './server/db';

async function testOptimizedOrders() {
  try {
    console.log('🔍 Testing optimized orders query...\n');
    
    // Test 1: No filters (should return all orders including drafts)
    console.log('📋 Test 1: No filters (should show all orders)');
    const result1 = await OptimizedOrdersService.getOrdersWithEmailStatus({});
    console.log(`   Total orders: ${result1.total}`);
    const statusCounts1: { [key: string]: number } = {};
    result1.orders.forEach(order => {
      statusCounts1[order.status] = (statusCounts1[order.status] || 0) + 1;
    });
    console.log('   Status distribution:', statusCounts1);
    
    // Test 2: Empty string status filter (should also return all orders)
    console.log('\n📋 Test 2: Empty string status filter');
    const result2 = await OptimizedOrdersService.getOrdersWithEmailStatus({ status: '' });
    console.log(`   Total orders: ${result2.total}`);
    const statusCounts2: { [key: string]: number } = {};
    result2.orders.forEach(order => {
      statusCounts2[order.status] = (statusCounts2[order.status] || 0) + 1;
    });
    console.log('   Status distribution:', statusCounts2);
    
    // Test 3: Draft status filter specifically
    console.log('\n📋 Test 3: Draft status filter specifically');
    const result3 = await OptimizedOrdersService.getOrdersWithEmailStatus({ status: 'draft' });
    console.log(`   Total draft orders: ${result3.total}`);
    console.log('   First few draft orders:');
    result3.orders.slice(0, 3).forEach(order => {
      console.log(`     - ${order.orderNumber} (ID: ${order.id})`);
    });
    
    // Test 4: With pagination (page 1, limit 50 - frontend default)
    console.log('\n📋 Test 4: With pagination (page 1, limit 50)');
    const result4 = await OptimizedOrdersService.getOrdersWithEmailStatus({ page: 1, limit: 50 });
    console.log(`   Total orders: ${result4.total}`);
    console.log(`   Orders on page 1: ${result4.orders.length}`);
    const statusCounts4: { [key: string]: number } = {};
    result4.orders.forEach(order => {
      statusCounts4[order.status] = (statusCounts4[order.status] || 0) + 1;
    });
    console.log('   Status distribution on page 1:', statusCounts4);
    
    // Check if any draft orders exist in page 1
    const draftOrdersInPage1 = result4.orders.filter(o => o.status === 'draft');
    console.log(`   Draft orders in page 1: ${draftOrdersInPage1.length}`);
    if (draftOrdersInPage1.length > 0) {
      console.log('   Draft orders found:');
      draftOrdersInPage1.forEach(order => {
        console.log(`     - ${order.orderNumber} (Created: ${order.createdAt})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testOptimizedOrders();