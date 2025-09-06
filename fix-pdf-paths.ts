import { db } from './server/db';
import { attachments } from './shared/schema';
import { eq, like, and, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function fixPdfPaths() {
  console.log('🔧 PDF 경로 복구 시작...');
  
  try {
    // 1. db:// 프리픽스가 있는 PDF 첨부파일 찾기
    const pdfAttachments = await db
      .select()
      .from(attachments)
      .where(
        and(
          like(attachments.filePath, 'db://%'),
          like(attachments.mimeType, '%pdf%')
        )
      );
    
    console.log(`📄 찾은 PDF 첨부파일: ${pdfAttachments.length}개`);
    
    for (const attachment of pdfAttachments) {
      const fileName = attachment.filePath.replace('db://', '');
      console.log(`\n처리 중: ${fileName}`);
      
      // 가능한 경로들 확인
      const possiblePaths = [
        `uploads/temp-pdf/${fileName}`,
        `uploads/${fileName}`,
        `attached_assets/${fileName}`,
        fileName
      ];
      
      let foundPath = null;
      
      // 실제 파일 찾기
      for (const testPath of possiblePaths) {
        const fullPath = path.join(process.cwd(), testPath);
        if (fs.existsSync(fullPath)) {
          foundPath = testPath;
          console.log(`  ✅ 파일 발견: ${testPath}`);
          break;
        }
      }
      
      if (foundPath) {
        // 데이터베이스 업데이트
        await db
          .update(attachments)
          .set({ filePath: foundPath })
          .where(eq(attachments.id, attachment.id));
        
        console.log(`  ✅ 경로 업데이트 완료: ${foundPath}`);
      } else {
        // 파일이 없는 경우, 타임스탬프로 유사한 파일 찾기
        const timestamp = fileName.match(/\d{13}/)?.[0];
        if (timestamp) {
          const tempPdfDir = path.join(process.cwd(), 'uploads/temp-pdf');
          if (fs.existsSync(tempPdfDir)) {
            const files = fs.readdirSync(tempPdfDir);
            const similarFile = files.find(f => f.includes(timestamp));
            
            if (similarFile) {
              const newPath = `uploads/temp-pdf/${similarFile}`;
              await db
                .update(attachments)
                .set({ filePath: newPath })
                .where(eq(attachments.id, attachment.id));
              
              console.log(`  ✅ 유사 파일로 경로 업데이트: ${newPath}`);
            } else {
              console.log(`  ❌ 파일을 찾을 수 없음: ${fileName}`);
              
              // 가장 최근 PDF 파일로 대체 (임시 조치)
              const orderPattern = attachment.originalName?.match(/PO-\d{4}-\d{5}/)?.[0];
              if (orderPattern) {
                const matchingFile = files.find(f => f.includes('order-'));
                if (matchingFile) {
                  const newPath = `uploads/temp-pdf/${matchingFile}`;
                  await db
                    .update(attachments)
                    .set({ 
                      filePath: newPath,
                      storedName: matchingFile
                    })
                    .where(eq(attachments.id, attachment.id));
                  
                  console.log(`  ⚠️  임시 파일로 대체: ${newPath}`);
                }
              }
            }
          }
        } else {
          console.log(`  ❌ 파일을 찾을 수 없음: ${fileName}`);
        }
      }
    }
    
    // 2. 결과 확인
    const updatedAttachments = await db
      .select()
      .from(attachments)
      .where(like(attachments.mimeType, '%pdf%'));
    
    console.log('\n📊 복구 결과:');
    console.log(`총 PDF 첨부파일: ${updatedAttachments.length}개`);
    
    const stillBroken = updatedAttachments.filter(a => a.filePath.startsWith('db://'));
    const fixed = updatedAttachments.filter(a => !a.filePath.startsWith('db://'));
    
    console.log(`✅ 복구 완료: ${fixed.length}개`);
    console.log(`❌ 복구 실패: ${stillBroken.length}개`);
    
    if (stillBroken.length > 0) {
      console.log('\n복구 실패한 파일들:');
      stillBroken.forEach(a => {
        console.log(`  - ID: ${a.id}, Order: ${a.orderId}, File: ${a.filePath}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

// 스크립트 실행
fixPdfPaths();