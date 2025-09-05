import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import 'dotenv/config';

async function checkTables() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  console.log('🔍 Checking for approval-related tables...');
  
  try {
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%approval%'
      ORDER BY table_name
    `);
    
    console.log('📊 Found tables:', result);
    
    // Also check columns in purchaseOrders table
    const columns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'purchase_orders'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Columns in purchase_orders:', columns);
    
    // Check if approval_step_instances table exists
    const approvalTable = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'approval_step_instances'
      )
    `);
    
    console.log('❓ Does approval_step_instances exist?', approvalTable);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkTables().catch(console.error);