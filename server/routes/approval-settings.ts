import { Router } from "express";
import { db } from "../db";
import { 
  approvalWorkflowSettings, 
  approvalStepTemplates, 
  approvalStepInstances,
  insertApprovalWorkflowSettingsSchema,
  insertApprovalStepTemplateSchema,
  insertApprovalStepInstanceSchema,
  ApprovalWorkflowSettings,
  ApprovalStepTemplate,
  ApprovalStepInstance
} from "../../shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../local-auth";

const router = Router();

// Get approval workflow settings for a company
router.get("/workflow-settings/:companyId", requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;

    const settings = await db
      .select()
      .from(approvalWorkflowSettings)
      .where(
        and(
          eq(approvalWorkflowSettings.companyId, parseInt(companyId)),
          eq(approvalWorkflowSettings.isActive, true)
        )
      )
      .orderBy(desc(approvalWorkflowSettings.createdAt))
      .limit(1);

    return res.json({
      success: true,
      data: settings[0] || null
    });

  } catch (error) {
    console.error("승인 워크플로 설정 조회 오류:", error);
    return res.status(500).json({ 
      error: "승인 워크플로 설정을 조회하는 중 오류가 발생했습니다" 
    });
  }
});

// Create or update approval workflow settings
router.post("/workflow-settings", requireAuth, requireAdmin, async (req, res) => {
  try {

    const validatedData = insertApprovalWorkflowSettingsSchema.parse({
      ...req.body,
      createdBy: req.user.id
    });

    // Check if settings already exist for this company
    const existingSettings = await db
      .select()
      .from(approvalWorkflowSettings)
      .where(
        and(
          eq(approvalWorkflowSettings.companyId, validatedData.companyId!),
          eq(approvalWorkflowSettings.isActive, true)
        )
      )
      .limit(1);

    let result;

    if (existingSettings.length > 0) {
      // Update existing settings
      result = await db
        .update(approvalWorkflowSettings)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(approvalWorkflowSettings.id, existingSettings[0].id))
        .returning();
    } else {
      // Create new settings
      result = await db
        .insert(approvalWorkflowSettings)
        .values(validatedData)
        .returning();
    }

    return res.json({
      success: true,
      data: result[0]
    });

  } catch (error) {
    console.error("승인 워크플로 설정 저장 오류:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "입력 데이터가 올바르지 않습니다",
        details: error.errors
      });
    }
    return res.status(500).json({ 
      error: "승인 워크플로 설정을 저장하는 중 오류가 발생했습니다" 
    });
  }
});

// Get approval step templates for a company
router.get("/step-templates/:companyId", requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { templateName } = req.query;

    let query = db
      .select()
      .from(approvalStepTemplates)
      .where(
        and(
          eq(approvalStepTemplates.companyId, parseInt(companyId)),
          eq(approvalStepTemplates.isActive, true)
        )
      );

    if (templateName) {
      query = query.where(
        and(
          eq(approvalStepTemplates.companyId, parseInt(companyId)),
          eq(approvalStepTemplates.isActive, true),
          eq(approvalStepTemplates.templateName, templateName as string)
        )
      );
    }

    const templates = await query.orderBy(
      asc(approvalStepTemplates.templateName),
      asc(approvalStepTemplates.stepOrder)
    );

    return res.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error("승인 단계 템플릿 조회 오류:", error);
    return res.status(500).json({ 
      error: "승인 단계 템플릿을 조회하는 중 오류가 발생했습니다" 
    });
  }
});

// Create approval step template
router.post("/step-templates", requireAuth, requireAdmin, async (req, res) => {
  try {

    const validatedData = insertApprovalStepTemplateSchema.parse(req.body);

    const result = await db
      .insert(approvalStepTemplates)
      .values(validatedData)
      .returning();

    return res.json({
      success: true,
      data: result[0]
    });

  } catch (error) {
    console.error("승인 단계 템플릿 생성 오류:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "입력 데이터가 올바르지 않습니다",
        details: error.errors
      });
    }
    return res.status(500).json({ 
      error: "승인 단계 템플릿을 생성하는 중 오류가 발생했습니다" 
    });
  }
});

// Update approval step template
router.put("/step-templates/:id", requireAuth, requireAdmin, async (req, res) => {
  try {

    const { id } = req.params;
    const validatedData = insertApprovalStepTemplateSchema.parse(req.body);

    const result = await db
      .update(approvalStepTemplates)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(approvalStepTemplates.id, parseInt(id)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "승인 단계 템플릿을 찾을 수 없습니다" });
    }

    return res.json({
      success: true,
      data: result[0]
    });

  } catch (error) {
    console.error("승인 단계 템플릿 수정 오류:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "입력 데이터가 올바르지 않습니다",
        details: error.errors
      });
    }
    return res.status(500).json({ 
      error: "승인 단계 템플릿을 수정하는 중 오류가 발생했습니다" 
    });
  }
});

// Delete approval step template
router.delete("/step-templates/:id", requireAuth, requireAdmin, async (req, res) => {
  try {

    const { id } = req.params;

    const result = await db
      .update(approvalStepTemplates)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(approvalStepTemplates.id, parseInt(id)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "승인 단계 템플릿을 찾을 수 없습니다" });
    }

    return res.json({
      success: true,
      message: "승인 단계 템플릿이 삭제되었습니다"
    });

  } catch (error) {
    console.error("승인 단계 템플릿 삭제 오류:", error);
    return res.status(500).json({ 
      error: "승인 단계 템플릿을 삭제하는 중 오류가 발생했습니다" 
    });
  }
});

// Get approval step instances for an order
router.get("/step-instances/:orderId", requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;

    const instances = await db
      .select()
      .from(approvalStepInstances)
      .where(
        and(
          eq(approvalStepInstances.orderId, parseInt(orderId)),
          eq(approvalStepInstances.isActive, true)
        )
      )
      .orderBy(asc(approvalStepInstances.stepOrder));

    return res.json({
      success: true,
      data: instances
    });

  } catch (error) {
    console.error("승인 단계 인스턴스 조회 오류:", error);
    return res.status(500).json({ 
      error: "승인 단계 인스턴스를 조회하는 중 오류가 발생했습니다" 
    });
  }
});

// Create approval step instances for an order
router.post("/step-instances", requireAuth, async (req, res) => {
  try {
    const { orderId, templateName, companyId } = req.body;

    if (!orderId || !templateName || !companyId) {
      return res.status(400).json({ 
        error: "orderId, templateName, companyId가 필요합니다" 
      });
    }

    // Get step templates for the specified template name
    const templates = await db
      .select()
      .from(approvalStepTemplates)
      .where(
        and(
          eq(approvalStepTemplates.companyId, companyId),
          eq(approvalStepTemplates.templateName, templateName),
          eq(approvalStepTemplates.isActive, true)
        )
      )
      .orderBy(asc(approvalStepTemplates.stepOrder));

    if (templates.length === 0) {
      return res.status(404).json({ 
        error: "승인 단계 템플릿을 찾을 수 없습니다" 
      });
    }

    // Create step instances based on templates
    const instancesData = templates.map(template => ({
      orderId: parseInt(orderId),
      templateId: template.id,
      stepOrder: template.stepOrder,
      requiredRole: template.requiredRole,
      status: "pending" as const
    }));

    const result = await db
      .insert(approvalStepInstances)
      .values(instancesData)
      .returning();

    return res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("승인 단계 인스턴스 생성 오류:", error);
    return res.status(500).json({ 
      error: "승인 단계 인스턴스를 생성하는 중 오류가 발생했습니다" 
    });
  }
});

// Update approval step instance (approve/reject/skip)
router.put("/step-instances/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comments, rejectionReason } = req.body;

    if (!["approved", "rejected", "skipped"].includes(status)) {
      return res.status(400).json({ 
        error: "유효하지 않은 상태입니다" 
      });
    }

    const updateData: any = {
      status,
      approvedBy: req.user.id,
      approvedAt: new Date(),
      updatedAt: new Date()
    };

    if (comments) updateData.comments = comments;
    if (rejectionReason) updateData.rejectionReason = rejectionReason;

    const result = await db
      .update(approvalStepInstances)
      .set(updateData)
      .where(eq(approvalStepInstances.id, parseInt(id)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "승인 단계 인스턴스를 찾을 수 없습니다" });
    }

    return res.json({
      success: true,
      data: result[0]
    });

  } catch (error) {
    console.error("승인 단계 인스턴스 수정 오류:", error);
    return res.status(500).json({ 
      error: "승인 단계 인스턴스를 수정하는 중 오류가 발생했습니다" 
    });
  }
});

export default router;