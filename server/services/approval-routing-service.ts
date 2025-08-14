import { db } from "../db";
import { 
  approvalWorkflowSettings, 
  approvalStepTemplates, 
  approvalStepInstances,
  approvalAuthorities,
  users,
  purchaseOrders,
  ApprovalWorkflowSettings,
  ApprovalStepTemplate,
  ApprovalStepInstance
} from "../../shared/schema";
import { eq, and, gte, lte, asc, desc } from "drizzle-orm";

export interface ApprovalRouteDecision {
  approvalMode: 'direct' | 'staged';
  canDirectApprove: boolean;
  directApprovalUsers?: string[];
  stagedApprovalSteps?: ApprovalStepTemplate[];
  templateName?: string;
  reasoning: string;
}

export interface ApprovalContext {
  orderId: number;
  orderAmount: number;
  companyId: number;
  currentUserId: string;
  currentUserRole: string;
  priority?: 'low' | 'medium' | 'high';
}

export class ApprovalRoutingService {
  
  /**
   * 주문에 대한 최적의 승인 경로를 결정합니다
   */
  static async determineApprovalRoute(context: ApprovalContext): Promise<ApprovalRouteDecision> {
    try {
      // 1. 회사의 승인 워크플로 설정 조회
      const workflowSettings = await this.getWorkflowSettings(context.companyId);
      
      if (!workflowSettings) {
        // 기본 설정: 직접 승인 (관리자만)
        return {
          approvalMode: 'direct',
          canDirectApprove: context.currentUserRole === 'admin',
          directApprovalUsers: [],
          reasoning: '승인 워크플로 설정이 없어 기본 직접 승인 모드를 사용합니다.'
        };
      }

      // 2. 승인 모드에 따른 처리
      if (workflowSettings.approvalMode === 'direct') {
        return await this.handleDirectApproval(context, workflowSettings);
      } else {
        return await this.handleStagedApproval(context, workflowSettings);
      }

    } catch (error) {
      console.error('승인 경로 결정 오류:', error);
      // 오류 시 안전한 기본값
      return {
        approvalMode: 'direct',
        canDirectApprove: false,
        reasoning: '오류로 인해 기본 승인 모드를 사용합니다.'
      };
    }
  }

  /**
   * 직접 승인 모드 처리
   */
  private static async handleDirectApproval(
    context: ApprovalContext, 
    settings: ApprovalWorkflowSettings
  ): Promise<ApprovalRouteDecision> {
    
    const directApprovalRoles = settings.directApprovalRoles || [];
    const canDirectApprove = directApprovalRoles.includes(context.currentUserRole);

    // 직접 승인 가능한 사용자 목록 조회
    const directApprovalUsers = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.role, context.currentUserRole))
      .limit(10);

    return {
      approvalMode: 'direct',
      canDirectApprove,
      directApprovalUsers: directApprovalUsers.map(u => u.id),
      reasoning: canDirectApprove 
        ? `${context.currentUserRole} 역할은 직접 승인이 가능합니다.`
        : `${context.currentUserRole} 역할은 직접 승인 권한이 없습니다.`
    };
  }

  /**
   * 단계별 승인 모드 처리
   */
  private static async handleStagedApproval(
    context: ApprovalContext, 
    settings: ApprovalWorkflowSettings
  ): Promise<ApprovalRouteDecision> {
    
    // 1. 금액 기준 승인 단계 템플릿 찾기
    const appropriateTemplate = await this.findAppropriateStagedTemplate(
      context.companyId, 
      context.orderAmount,
      context.priority
    );

    if (!appropriateTemplate.length) {
      // 적절한 템플릿이 없으면 직접 승인으로 폴백
      return {
        approvalMode: 'direct',
        canDirectApprove: context.currentUserRole === 'admin',
        reasoning: '적절한 단계별 승인 템플릿을 찾을 수 없어 직접 승인으로 처리합니다.'
      };
    }

    // 2. 현재 사용자가 건너뛸 수 있는 단계 확인
    const canSkipSteps = await this.checkSkippableSteps(
      context.currentUserRole, 
      context.orderAmount, 
      appropriateTemplate
    );

    // 3. 최종 승인 단계 결정
    const finalSteps = settings.skipLowerStages && canSkipSteps.length > 0
      ? appropriateTemplate.filter(step => !canSkipSteps.includes(step.id))
      : appropriateTemplate;

    return {
      approvalMode: 'staged',
      canDirectApprove: false,
      stagedApprovalSteps: finalSteps,
      templateName: appropriateTemplate[0]?.templateName,
      reasoning: `${context.orderAmount}원 주문에 대해 ${finalSteps.length}단계 승인 프로세스를 적용합니다.`
    };
  }

  /**
   * 금액과 우선순위에 적합한 단계별 승인 템플릿 찾기
   */
  private static async findAppropriateStagedTemplate(
    companyId: number, 
    orderAmount: number,
    priority?: string
  ): Promise<ApprovalStepTemplate[]> {
    
    // 금액 범위에 맞는 템플릿 조회
    const templates = await db
      .select()
      .from(approvalStepTemplates)
      .where(
        and(
          eq(approvalStepTemplates.companyId, companyId),
          eq(approvalStepTemplates.isActive, true),
          lte(approvalStepTemplates.minAmount, orderAmount.toString()),
          // maxAmount가 null이거나 orderAmount보다 크거나 같은 경우
        )
      )
      .orderBy(asc(approvalStepTemplates.stepOrder));

    // maxAmount 조건을 별도로 필터링 (null 처리)
    const filteredTemplates = templates.filter(template => 
      !template.maxAmount || parseFloat(template.maxAmount) >= orderAmount
    );

    // 우선순위가 높은 경우 간소화된 프로세스 적용 가능
    if (priority === 'high' && filteredTemplates.length > 2) {
      // 고우선순위는 최소 필수 단계만 적용
      return filteredTemplates.filter(template => !template.isOptional);
    }

    return filteredTemplates;
  }

  /**
   * 현재 사용자 권한으로 건너뛸 수 있는 단계 확인
   */
  private static async checkSkippableSteps(
    currentUserRole: string, 
    orderAmount: number,
    approvalSteps: ApprovalStepTemplate[]
  ): Promise<number[]> {
    
    // 현재 사용자의 승인 권한 확인
    const userAuthority = await db
      .select()
      .from(approvalAuthorities)
      .where(
        and(
          eq(approvalAuthorities.role, currentUserRole as any),
          eq(approvalAuthorities.isActive, true)
        )
      )
      .limit(1);

    if (!userAuthority.length) {
      return []; // 승인 권한이 없으면 건너뛸 수 없음
    }

    const maxAmount = parseFloat(userAuthority[0].maxAmount);

    // 권한 범위 내의 주문이고, 건너뛸 수 있는 단계들 찾기
    if (orderAmount <= maxAmount) {
      return approvalSteps
        .filter(step => step.canSkip && step.requiredRole !== currentUserRole)
        .map(step => step.id);
    }

    return [];
  }

  /**
   * 주문에 대한 승인 단계 인스턴스 생성
   */
  static async createApprovalInstances(
    orderId: number, 
    context: ApprovalContext
  ): Promise<ApprovalStepInstance[]> {
    
    const route = await this.determineApprovalRoute(context);

    if (route.approvalMode === 'direct') {
      // 직접 승인 모드는 인스턴스를 생성하지 않음
      return [];
    }

    if (!route.stagedApprovalSteps?.length) {
      throw new Error('단계별 승인 단계가 정의되지 않았습니다.');
    }

    // 승인 단계 인스턴스 데이터 준비
    const instancesData = route.stagedApprovalSteps.map(step => ({
      orderId,
      templateId: step.id,
      stepOrder: step.stepOrder,
      requiredRole: step.requiredRole,
      status: "pending" as const
    }));

    // 데이터베이스에 인스턴스 생성
    const instances = await db
      .insert(approvalStepInstances)
      .values(instancesData)
      .returning();

    return instances;
  }

  /**
   * 주문의 다음 승인 단계 결정
   */
  static async getNextApprovalStep(orderId: number): Promise<ApprovalStepInstance | null> {
    
    const nextStep = await db
      .select()
      .from(approvalStepInstances)
      .where(
        and(
          eq(approvalStepInstances.orderId, orderId),
          eq(approvalStepInstances.status, "pending"),
          eq(approvalStepInstances.isActive, true)
        )
      )
      .orderBy(asc(approvalStepInstances.stepOrder))
      .limit(1);

    return nextStep[0] || null;
  }

  /**
   * 주문의 승인 완료 여부 확인
   */
  static async isApprovalComplete(orderId: number): Promise<boolean> {
    
    const pendingSteps = await db
      .select()
      .from(approvalStepInstances)
      .where(
        and(
          eq(approvalStepInstances.orderId, orderId),
          eq(approvalStepInstances.status, "pending"),
          eq(approvalStepInstances.isActive, true)
        )
      );

    return pendingSteps.length === 0;
  }

  /**
   * 주문 승인 진행률 계산
   */
  static async getApprovalProgress(orderId: number): Promise<{
    totalSteps: number;
    completedSteps: number;
    progressPercentage: number;
    currentStep?: ApprovalStepInstance;
  }> {
    
    const allSteps = await db
      .select()
      .from(approvalStepInstances)
      .where(
        and(
          eq(approvalStepInstances.orderId, orderId),
          eq(approvalStepInstances.isActive, true)
        )
      )
      .orderBy(asc(approvalStepInstances.stepOrder));

    const completedSteps = allSteps.filter(step => 
      step.status === "approved" || step.status === "skipped"
    );

    const currentStep = allSteps.find(step => step.status === "pending");

    return {
      totalSteps: allSteps.length,
      completedSteps: completedSteps.length,
      progressPercentage: allSteps.length > 0 
        ? Math.round((completedSteps.length / allSteps.length) * 100) 
        : 0,
      currentStep
    };
  }

  /**
   * 회사의 승인 워크플로 설정 조회
   */
  private static async getWorkflowSettings(companyId: number): Promise<ApprovalWorkflowSettings | null> {
    
    const settings = await db
      .select()
      .from(approvalWorkflowSettings)
      .where(
        and(
          eq(approvalWorkflowSettings.companyId, companyId),
          eq(approvalWorkflowSettings.isActive, true)
        )
      )
      .orderBy(desc(approvalWorkflowSettings.createdAt))
      .limit(1);

    return settings[0] || null;
  }
}

export default ApprovalRoutingService;