// Test the new draft orders endpoint
import axios from 'axios';

async function testDraftEndpoint() {
  try {
    console.log('🔍 Testing draft orders endpoint...\n');
    
    // Test the new endpoint
    const response = await axios.get('http://localhost:5000/api/orders/drafts', {
      headers: {
        // Add any required auth headers if needed
        'Cookie': 'connect.sid=your-session-id' // Replace with actual session if needed
      }
    });
    
    console.log('✅ Response received:');
    console.log(`   Total draft orders: ${response.data.total}`);
    console.log(`   Success: ${response.data.success}`);
    console.log(`   Message: ${response.data.message}`);
    
    if (response.data.orders && response.data.orders.length > 0) {
      console.log('\n📋 Draft orders found:');
      response.data.orders.forEach((order: any, index: number) => {
        console.log(`   ${index + 1}. ${order.orderNumber} - ${order.vendorName || 'No vendor'} - ${order.totalAmount}`);
        console.log(`      Status: ${order.status}, Created: ${order.createdAt}`);
      });
    } else {
      console.log('   No draft orders found');
    }
    
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.log('⚠️  Authentication required. Testing without auth...');
      
      // Try direct database query instead
      const { db } = await import('./server/db');
      const { purchaseOrders } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const drafts = await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.status, 'draft'));
        
      console.log(`\n📊 Direct database query found ${drafts.length} draft orders`);
      drafts.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.orderNumber} - Status: ${order.status}`);
      });
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
  }
  
  process.exit(0);
}

testDraftEndpoint();