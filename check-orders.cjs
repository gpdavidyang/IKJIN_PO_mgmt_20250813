const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { eq } = require('drizzle-orm');

// Database schema
const { pgTable, serial, varchar, text, integer, date, timestamp, boolean, decimal } = require('drizzle-orm/pg-core');

const purchaseOrders = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').references(() => projects.id),
  vendorId: integer('vendor_id').references(() => vendors.id),
  userId: varchar('user_id', { length: 50 }).notNull(),
  orderDate: date('order_date').notNull(),
  deliveryDate: date('delivery_date'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

async function checkOrders() {
  try {
    const pool = new Pool({
      connectionString: "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
    });
    
    const db = drizzle(pool);
    
    const orders = await db.select().from(purchaseOrders).limit(5);
    console.log('Available orders:');
    orders.forEach(order => {
      console.log(`- ID: ${order.id}, Order Number: ${order.orderNumber}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkOrders();