import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

async function analyzeOrderStatus() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  const result = await client`
    SELECT 
      status,
      "orderStatus",
      "approvalStatus",
      "emailSentAt",
      COUNT(*) as count,
      array_agg("orderNumber" ORDER BY "orderNumber" LIMIT 3) as sample_orders,
      array_agg(DISTINCT CASE WHEN "attachments" IS NOT NULL THEN 'Y' ELSE 'N' END) as has_pdf
    FROM "purchaseOrders"
    LEFT JOIN (
      SELECT "orderId", COUNT(*) as attachments 
      FROM "attachments" 
      WHERE "mimeType" = 'application/pdf'
      GROUP BY "orderId"
    ) a ON a."orderId" = "purchaseOrders".id
    GROUP BY status, "orderStatus", "approvalStatus", "emailSentAt" IS NOT NULL
    ORDER BY count DESC
  `;

  console.log('발주서 상태 분석:');
  console.log('================');
  for (const row of result) {
    console.log(`
상태: status=${row.status}, orderStatus=${row.orderStatus}, approvalStatus=${row.approvalStatus}
이메일 발송: ${row.emailSentAt ? '발송됨' : '미발송'}
PDF 생성: ${row.has_pdf?.includes('Y') ? '있음' : '없음'}
건수: ${row.count}건
샘플: ${row.sample_orders.join(', ')}
---`);
  }

  // 상태별 정확한 매핑이 필요한 케이스 확인
  console.log('\n\n문제가 있는 케이스 분석:');
  console.log('========================');
  
  const issues = await client`
    SELECT 
      "orderNumber",
      status,
      "orderStatus",
      "emailSentAt",
      CASE WHEN a.attachments > 0 THEN 'Y' ELSE 'N' END as has_pdf
    FROM "purchaseOrders"
    LEFT JOIN (
      SELECT "orderId", COUNT(*) as attachments 
      FROM "attachments" 
      WHERE "mimeType" = 'application/pdf'
      GROUP BY "orderId"
    ) a ON a."orderId" = "purchaseOrders".id
    WHERE 
      -- PDF 없고 이메일 미발송인데 '발주생성' 상태가 아닌 경우
      (a.attachments IS NULL AND "emailSentAt" IS NULL AND status != 'pending' AND status != 'draft')
      OR
      -- 이메일 발송했는데 '발주완료' 상태가 아닌 경우
      ("emailSentAt" IS NOT NULL AND status != 'sent' AND status != 'completed')
    LIMIT 10
  `;

  if (issues.length > 0) {
    console.log('상태가 올바르지 않은 발주서들:');
    for (const issue of issues) {
      console.log(`- ${issue.orderNumber}: status=${issue.status}, orderStatus=${issue.orderStatus}, 이메일=${issue.emailSentAt ? '발송' : '미발송'}, PDF=${issue.has_pdf}`);
    }
  } else {
    console.log('모든 발주서 상태가 올바릅니다.');
  }

  await client.end();
}

analyzeOrderStatus().catch(console.error);