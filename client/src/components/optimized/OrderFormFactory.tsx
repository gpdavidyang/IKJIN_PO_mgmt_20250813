import React, { lazy, Suspense } from "react";
import { FormSkeleton } from "@/components/common/LazyWrapper";

// Lazy load order forms
const StandardOrderForm = lazy(() => import("@/pages/create-order-standard"));
const ExtrusionOrderForm = lazy(() => import("@/pages/create-order-extrusion"));
const PanelOrderForm = lazy(() => import("@/pages/create-order-panel"));
const AccessoriesOrderForm = lazy(() => import("@/pages/create-order-accessories"));

export type OrderFormType = 'standard' | 'extrusion' | 'panel' | 'accessories';

interface OrderFormFactoryProps {
  type: OrderFormType;
  onSubmit?: (data: any) => void;
  initialData?: any;
}

export function OrderFormFactory({ type, onSubmit, initialData }: OrderFormFactoryProps) {
  const getFormComponent = () => {
    // 임시로 any 타입 사용하여 타입 에러 해결
    const props: any = { onSubmit, initialData };
    switch (type) {
      case 'standard':
        return <StandardOrderForm {...props} />;
      case 'extrusion':
        return <ExtrusionOrderForm {...props} />;
      case 'panel':
        return <PanelOrderForm {...props} />;
      case 'accessories':
        return <AccessoriesOrderForm {...props} />;
      default:
        return <StandardOrderForm {...props} />;
    }
  };

  return (
    <Suspense fallback={<FormSkeleton />}>
      {getFormComponent()}
    </Suspense>
  );
}

// Configuration for different order types
export const ORDER_FORM_CONFIGS = {
  standard: {
    title: '표준 발주서',
    description: '일반적인 발주서 작성',
    icon: 'FileText',
    features: ['기본 품목 관리', '파일 첨부', 'PDF 미리보기']
  },
  extrusion: {
    title: '압출 발주서',
    description: '압출 공정 전용 발주서',
    icon: 'Settings',
    features: ['Excel 업로드', '공정별 관리', '이미지 업로드']
  },
  panel: {
    title: '판넬 발주서',
    description: '판넬 제작 전용 발주서',
    icon: 'Grid',
    features: ['판넬 사양 관리', '조립 정보', '설치 일정']
  },
  accessories: {
    title: '부자재 발주서',
    description: '부자재 및 소모품 발주서',
    icon: 'Package',
    features: ['카테고리별 관리', '재고 연동', '일괄 주문']
  }
} as const;