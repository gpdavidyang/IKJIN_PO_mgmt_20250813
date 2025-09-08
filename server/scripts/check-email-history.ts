import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { emailSendHistory, purchaseOrders } from '../../shared/schema';
import { config } from 'dotenv';
import { eq } from 'drizzle-orm';

config();

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function checkAndCreateEmailHistory() {
  try {
    // Check existing email history
    const existingEmails = await db.select().from(emailSendHistory).limit(5);
    console.log('Existing email history count:', existingEmails.length);
    
    if (existingEmails.length === 0) {
      console.log('No email history found. Creating sample data...');
      
      // Get some orders to create email history for
      const orders = await db.select().from(purchaseOrders).limit(5);
      
      if (orders.length > 0) {
        for (const order of orders) {
          await db.insert(emailSendHistory).values({
            orderId: order.id,
            orderNumber: order.orderNumber,
            recipients: ['davidswyang@gmail.com'],
            cc: [],
            bcc: [],
            subject: `발주서 - ${order.orderNumber}`,
            messageContent: `안녕하세요.\n\n발주서 ${order.orderNumber}를 보내드립니다.\n\n감사합니다.`,
            attachmentFiles: [`${order.orderNumber}.pdf`],
            status: 'sent',
            senderUserId: order.userId || 'admin',
            sentAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last 7 days
          });
        }
        
        console.log(`Created ${orders.length} sample email history records`);
      }
    }
    
    // Query and display email history
    const emails = await db.select().from(emailSendHistory).limit(10);
    console.log('\nEmail History Data:');
    console.log(JSON.stringify(emails, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkAndCreateEmailHistory();