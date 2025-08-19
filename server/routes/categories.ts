/**
 * Category Management Routes
 * 분류 관리 API - 대분류/중분류/소분류 계층 구조 지원
 */

import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { itemCategories } from "@shared/schema";
import { validateCategoryMapping, validateCategoriesBatch, CategoryValidationRequest } from "../utils/category-mapping-validator";

const router = Router();

/**
 * 모든 카테고리 조회 (계층구조)
 * GET /api/categories
 */
router.get("/", async (req, res) => {
  try {
    console.log("📋 Fetching all categories...");
    
    const categories = await db.select().from(itemCategories)
      .where(eq(itemCategories.isActive, true))
      .orderBy(itemCategories.displayOrder, itemCategories.categoryName);
    
    // 계층 구조로 정리
    const majorCategories = categories.filter(c => c.categoryType === 'major');
    const middleCategories = categories.filter(c => c.categoryType === 'middle');
    const minorCategories = categories.filter(c => c.categoryType === 'minor');
    
    const hierarchicalData = majorCategories.map(major => ({
      ...major,
      children: middleCategories.filter(middle => middle.parentId === major.id).map(middle => ({
        ...middle,
        children: minorCategories.filter(minor => minor.parentId === middle.id)
      }))
    }));
    
    res.json({
      success: true,
      categories: hierarchicalData,
      flatCategories: categories
    });
  } catch (error) {
    console.error("❌ Error fetching categories:", error);
    res.status(500).json({ 
      success: false, 
      message: "카테고리 조회 실패", 
      error: error.message 
    });
  }
});

/**
 * 특정 타입의 카테고리만 조회
 * GET /api/categories/:type (major, middle, minor)
 */
router.get("/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const { parentId } = req.query;
    
    console.log(`📋 Fetching ${type} categories...`);
    
    let query = db.select().from(itemCategories)
      .where(and(
        eq(itemCategories.categoryType, type),
        eq(itemCategories.isActive, true)
      ));
    
    // parentId가 제공된 경우 필터링
    if (parentId) {
      query = query.where(eq(itemCategories.parentId, parseInt(parentId as string)));
    }
    
    const categories = await query.orderBy(itemCategories.displayOrder, itemCategories.categoryName);
    
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error(`❌ Error fetching ${req.params.type} categories:`, error);
    res.status(500).json({ 
      success: false, 
      message: "카테고리 조회 실패", 
      error: error.message 
    });
  }
});

/**
 * 새 카테고리 추가
 * POST /api/categories
 */
router.post("/", async (req, res) => {
  try {
    const { categoryType, categoryName, parentId, displayOrder } = req.body;
    
    console.log("➕ Creating new category:", { categoryType, categoryName, parentId });
    
    const newCategory = await db.insert(itemCategories).values({
      categoryType,
      categoryName,
      parentId: parentId || null,
      displayOrder: displayOrder || 0,
      isActive: true
    }).returning();
    
    res.status(201).json({
      success: true,
      category: newCategory[0],
      message: "카테고리가 생성되었습니다."
    });
  } catch (error) {
    console.error("❌ Error creating category:", error);
    res.status(500).json({ 
      success: false, 
      message: "카테고리 생성 실패", 
      error: error.message 
    });
  }
});

/**
 * 카테고리 수정
 * PUT /api/categories/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryName, displayOrder, isActive } = req.body;
    
    console.log(`🔧 Updating category ${id}...`);
    
    const updatedCategory = await db.update(itemCategories)
      .set({
        categoryName,
        displayOrder,
        isActive,
        updatedAt: new Date()
      })
      .where(eq(itemCategories.id, parseInt(id)))
      .returning();
    
    if (updatedCategory.length === 0) {
      return res.status(404).json({
        success: false,
        message: "카테고리를 찾을 수 없습니다."
      });
    }
    
    res.json({
      success: true,
      category: updatedCategory[0],
      message: "카테고리가 수정되었습니다."
    });
  } catch (error) {
    console.error("❌ Error updating category:", error);
    res.status(500).json({ 
      success: false, 
      message: "카테고리 수정 실패", 
      error: error.message 
    });
  }
});

/**
 * 카테고리 삭제 (비활성화)
 * DELETE /api/categories/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Deactivating category ${id}...`);
    
    const updatedCategory = await db.update(itemCategories)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(itemCategories.id, parseInt(id)))
      .returning();
    
    if (updatedCategory.length === 0) {
      return res.status(404).json({
        success: false,
        message: "카테고리를 찾을 수 없습니다."
      });
    }
    
    res.json({
      success: true,
      message: "카테고리가 삭제되었습니다."
    });
  } catch (error) {
    console.error("❌ Error deleting category:", error);
    res.status(500).json({ 
      success: false, 
      message: "카테고리 삭제 실패", 
      error: error.message 
    });
  }
});

/**
 * 엑셀 분류 매핑 검증 (단일)
 * POST /api/categories/validate-mapping
 */
router.post("/validate-mapping", async (req, res) => {
  try {
    const { majorCategory, middleCategory, minorCategory } = req.body;
    
    console.log("🔍 분류 매핑 검증 요청:", { majorCategory, middleCategory, minorCategory });
    
    const result = await validateCategoryMapping({
      majorCategory,
      middleCategory,
      minorCategory
    });
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error("❌ Error validating category mapping:", error);
    res.status(500).json({ 
      success: false, 
      message: "분류 매핑 검증 실패", 
      error: error.message 
    });
  }
});

/**
 * 엑셀 분류 매핑 검증 (배치)
 * POST /api/categories/validate-mapping-batch
 */
router.post("/validate-mapping-batch", async (req, res) => {
  try {
    const { categories } = req.body;
    
    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: "categories 필드는 배열이어야 합니다."
      });
    }
    
    console.log(`🔍 배치 분류 매핑 검증 요청 (${categories.length}개 항목)`);
    
    const results = await validateCategoriesBatch(categories);
    
    // 결과 통계 계산
    const stats = {
      total: results.length,
      exactMatch: results.filter(r => r.status === 'exact_match').length,
      partialMatch: results.filter(r => r.status === 'partial_match').length,
      noMatch: results.filter(r => r.status === 'no_match').length,
      invalidHierarchy: results.filter(r => r.status === 'invalid_hierarchy').length,
      averageConfidence: Math.round(
        results.reduce((sum, r) => sum + r.confidence, 0) / results.length
      )
    };
    
    res.json({
      success: true,
      results,
      stats
    });
  } catch (error) {
    console.error("❌ Error validating category mapping batch:", error);
    res.status(500).json({ 
      success: false, 
      message: "배치 분류 매핑 검증 실패", 
      error: error.message 
    });
  }
});

export default router;