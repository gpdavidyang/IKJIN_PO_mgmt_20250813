import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const DATABASE_URL = "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function addMissingColumn() {
  try {
    console.log('🔧 Adding missing file_data column to attachments table...');
    
    await db.execute(sql`ALTER TABLE attachments ADD COLUMN IF NOT EXISTS file_data TEXT;`);
    
    console.log('✅ Successfully added file_data column');
    
    // Verify the column exists
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'attachments' AND column_name = 'file_data';
    `);
    
    console.log('🔍 Column verification result:', result);
    
  } catch (error) {
    console.error('❌ Error adding column:', error);
  } finally {
    await client.end();
  }
}

addMissingColumn();