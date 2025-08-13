/**
 * Category Seed Data Script
 * 분류 관리를 위한 샘플 데이터 생성
 */

import { db } from "../server/db";
import { itemCategories } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedCategories() {
  console.log("🌱 Starting category seeding...");

  try {
    // 기존 데이터 삭제
    console.log("🧹 Clearing existing categories...");
    await db.delete(itemCategories);

    // 대분류 생성
    console.log("📂 Creating major categories...");
    const majors = await db.insert(itemCategories).values([
      { categoryType: 'major', categoryName: '건설자재', displayOrder: 1 },
      { categoryType: 'major', categoryName: '전기자재', displayOrder: 2 },
      { categoryType: 'major', categoryName: '배관자재', displayOrder: 3 },
      { categoryType: 'major', categoryName: '마감재', displayOrder: 4 },
      { categoryType: 'major', categoryName: '기계설비', displayOrder: 5 },
    ]).returning();

    console.log("✅ Major categories created:", majors.length);

    // 중분류 생성 - 건설자재
    const constructionId = majors.find(m => m.categoryName === '건설자재')?.id;
    if (constructionId) {
      await db.insert(itemCategories).values([
        { categoryType: 'middle', categoryName: '철근', parentId: constructionId, displayOrder: 1 },
        { categoryType: 'middle', categoryName: '시멘트', parentId: constructionId, displayOrder: 2 },
        { categoryType: 'middle', categoryName: '골재', parentId: constructionId, displayOrder: 3 },
        { categoryType: 'middle', categoryName: '벽돌/블록', parentId: constructionId, displayOrder: 4 },
      ]);
    }

    // 중분류 생성 - 전기자재
    const electricalId = majors.find(m => m.categoryName === '전기자재')?.id;
    if (electricalId) {
      await db.insert(itemCategories).values([
        { categoryType: 'middle', categoryName: '전선', parentId: electricalId, displayOrder: 1 },
        { categoryType: 'middle', categoryName: '배선기구', parentId: electricalId, displayOrder: 2 },
        { categoryType: 'middle', categoryName: '조명기구', parentId: electricalId, displayOrder: 3 },
        { categoryType: 'middle', categoryName: '분전반', parentId: electricalId, displayOrder: 4 },
      ]);
    }

    // 중분류 생성 - 배관자재
    const plumbingId = majors.find(m => m.categoryName === '배관자재')?.id;
    if (plumbingId) {
      await db.insert(itemCategories).values([
        { categoryType: 'middle', categoryName: '급수관', parentId: plumbingId, displayOrder: 1 },
        { categoryType: 'middle', categoryName: '배수관', parentId: plumbingId, displayOrder: 2 },
        { categoryType: 'middle', categoryName: '밸브', parentId: plumbingId, displayOrder: 3 },
        { categoryType: 'middle', categoryName: '위생기구', parentId: plumbingId, displayOrder: 4 },
      ]);
    }

    // 중분류 데이터 다시 조회
    const middles = await db.select().from(itemCategories).where(eq(itemCategories.categoryType, 'middle'));
    console.log("✅ Middle categories created:", middles.length);

    // 소분류 생성 - 철근
    const rebarId = middles.find(m => m.categoryName === '철근')?.id;
    if (rebarId) {
      await db.insert(itemCategories).values([
        { categoryType: 'minor', categoryName: 'D10', parentId: rebarId, displayOrder: 1 },
        { categoryType: 'minor', categoryName: 'D13', parentId: rebarId, displayOrder: 2 },
        { categoryType: 'minor', categoryName: 'D16', parentId: rebarId, displayOrder: 3 },
        { categoryType: 'minor', categoryName: 'D19', parentId: rebarId, displayOrder: 4 },
        { categoryType: 'minor', categoryName: 'D22', parentId: rebarId, displayOrder: 5 },
      ]);
    }

    // 소분류 생성 - 전선
    const wireId = middles.find(m => m.categoryName === '전선')?.id;
    if (wireId) {
      await db.insert(itemCategories).values([
        { categoryType: 'minor', categoryName: 'THHN 1.5sq', parentId: wireId, displayOrder: 1 },
        { categoryType: 'minor', categoryName: 'THHN 2.5sq', parentId: wireId, displayOrder: 2 },
        { categoryType: 'minor', categoryName: 'THHN 4sq', parentId: wireId, displayOrder: 3 },
        { categoryType: 'minor', categoryName: 'CV 3C 2.5sq', parentId: wireId, displayOrder: 4 },
      ]);
    }

    // 소분류 생성 - 급수관
    const waterPipeId = middles.find(m => m.categoryName === '급수관')?.id;
    if (waterPipeId) {
      await db.insert(itemCategories).values([
        { categoryType: 'minor', categoryName: 'PVC 15A', parentId: waterPipeId, displayOrder: 1 },
        { categoryType: 'minor', categoryName: 'PVC 20A', parentId: waterPipeId, displayOrder: 2 },
        { categoryType: 'minor', categoryName: 'PVC 25A', parentId: waterPipeId, displayOrder: 3 },
        { categoryType: 'minor', categoryName: 'PE 15A', parentId: waterPipeId, displayOrder: 4 },
      ]);
    }

    const finalCount = await db.select().from(itemCategories);
    console.log(`🎉 Category seeding completed! Total categories: ${finalCount.length}`);

    // 계층 구조 출력
    const majorCategories = finalCount.filter(c => c.categoryType === 'major');
    for (const major of majorCategories) {
      console.log(`📂 ${major.categoryName}`);
      const middleCategories = finalCount.filter(c => c.categoryType === 'middle' && c.parentId === major.id);
      for (const middle of middleCategories) {
        console.log(`  📁 ${middle.categoryName}`);
        const minorCategories = finalCount.filter(c => c.categoryType === 'minor' && c.parentId === middle.id);
        for (const minor of minorCategories) {
          console.log(`    📄 ${minor.categoryName}`);
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding categories:", error);
    process.exit(1);
  }
}

seedCategories();