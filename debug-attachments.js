import { db } from './server/db.ts';
import { attachments, purchaseOrders } from './shared/schema.ts';
import { desc, eq } from 'drizzle-orm';

(async () => {
  try {
    console.log('Checking recent attachments...');
    
    const recentAttachments = await db
      .select({
        orderNumber: purchaseOrders.orderNumber,
        originalName: attachments.originalName,
        storedName: attachments.storedName,
        uploadedAt: attachments.uploadedAt,
        orderId: attachments.orderId,
        mimeType: attachments.mimeType
      })
      .from(attachments)
      .leftJoin(purchaseOrders, eq(attachments.orderId, purchaseOrders.id))
      .orderBy(desc(attachments.uploadedAt))
      .limit(10);
    
    console.log('Recent attachments:');
    recentAttachments.forEach((att, i) => {
      console.log(`${i+1}. Order: ${att.orderNumber} | File: ${att.originalName} | MIME: ${att.mimeType} | Date: ${att.uploadedAt}`);
    });

    // Check for Excel files specifically
    const excelAttachments = recentAttachments.filter(att => 
      att.mimeType && (
        att.mimeType.includes('excel') || 
        att.mimeType.includes('spreadsheet') ||
        att.originalName.endsWith('.xlsx') ||
        att.originalName.endsWith('.xls')
      )
    );
    
    console.log(`\nFound ${excelAttachments.length} Excel attachments out of ${recentAttachments.length} total`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
})();