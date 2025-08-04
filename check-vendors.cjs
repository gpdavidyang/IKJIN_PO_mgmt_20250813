const { Client } = require('pg');
require('dotenv').config();

async function checkVendors() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check vendors table structure
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'vendors' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n🏢 Vendors table structure:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // Check all vendors in database
    const vendorsResult = await client.query('SELECT * FROM vendors ORDER BY id DESC LIMIT 10');
    
    console.log('\n📋 Recent vendors in database:');
    if (vendorsResult.rows.length === 0) {
      console.log('  No vendors found');
    } else {
      vendorsResult.rows.forEach((vendor, index) => {
        console.log(`  ${index + 1}. ID: ${vendor.id}, Name: ${vendor.name}, Email: ${vendor.email}, Contact: ${vendor.contact_person || vendor.contactperson || 'N/A'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkVendors();