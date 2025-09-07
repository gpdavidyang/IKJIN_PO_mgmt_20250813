#!/usr/bin/env node
/**
 * Script to regenerate PDFs for orders that don't have PDF attachments
 */

import { db } from '../db.js';
import { purchaseOrders, attachments } from '@shared/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { ProfessionalPDFGenerationService } from '../services/professional-pdf-generation-service.js';

async function regenerateMissingPDFs() {
  console.log('🔍 Finding orders without PDF attachments...');
  
  try {
    // Find all orders that don't have PDF attachments
    const ordersWithoutPDF = await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        userId: purchaseOrders.userId,
        createdAt: purchaseOrders.createdAt
      })
      .from(purchaseOrders)
      .leftJoin(
        attachments,
        and(
          eq(attachments.orderId, purchaseOrders.id),
          eq(attachments.mimeType, 'application/pdf')
        )
      )
      .where(isNull(attachments.id))
      .orderBy(purchaseOrders.createdAt);
    
    console.log(`📊 Found ${ordersWithoutPDF.length} orders without PDF attachments`);
    
    if (ordersWithoutPDF.length === 0) {
      console.log('✅ All orders have PDF attachments!');
      return;
    }
    
    // Generate PDFs for each order
    let successCount = 0;
    let failCount = 0;
    
    for (const order of ordersWithoutPDF) {
      console.log(`\n📄 Processing order ${order.orderNumber} (ID: ${order.id})...`);
      
      try {
        const result = await ProfessionalPDFGenerationService.generateProfessionalPurchaseOrderPDF(
          order.id,
          order.userId || 'system'
        );
        
        if (result.success) {
          console.log(`✅ PDF generated successfully for ${order.orderNumber}`);
          console.log(`   Attachment ID: ${result.attachmentId}`);
          successCount++;
        } else {
          console.error(`❌ Failed to generate PDF for ${order.orderNumber}: ${result.error}`);
          failCount++;
        }
      } catch (error) {
        console.error(`❌ Error generating PDF for ${order.orderNumber}:`, error);
        failCount++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully generated: ${successCount} PDFs`);
    console.log(`   ❌ Failed: ${failCount} PDFs`);
    
  } catch (error) {
    console.error('❌ Error in regenerateMissingPDFs:', error);
    process.exit(1);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run the script
regenerateMissingPDFs();