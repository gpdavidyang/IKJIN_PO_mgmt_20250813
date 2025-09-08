import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function checkOrderError() {
  try {
    // Check recent errors in order history
    const recentErrors = await db.execute(sql`
      SELECT 
        created_at,
        details
      FROM order_history
      WHERE details LIKE '%error%' 
         OR details LIKE '%Error%'
         OR details LIKE '%failed%'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('Recent error entries in order_history:');
    if (recentErrors.rows.length > 0) {
      recentErrors.rows.forEach((row: any) => {
        console.log('---');
        console.log('Time:', row.created_at);
        console.log('Details:', row.details);
      });
    } else {
      console.log('No recent errors found in order_history');
    }

    // Check database connection
    const testQuery = await db.execute(sql`SELECT 1 as test`);
    console.log('\nDatabase connection: OK');

    // Check if users table has data
    const users = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    console.log('Users count:', users.rows[0]);

    // Check if projects table has data
    const projects = await db.execute(sql`SELECT COUNT(*) as count FROM projects`);
    console.log('Projects count:', projects.rows[0]);

    // Check if vendors table has data
    const vendors = await db.execute(sql`SELECT COUNT(*) as count FROM vendors`);
    console.log('Vendors count:', vendors.rows[0]);

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    process.exit(0);
  }
}

checkOrderError();