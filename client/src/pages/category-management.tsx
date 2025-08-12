import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, Sparkles, TreePine, Grid3x3, Zap, Rocket } from 'lucide-react';
import CategoryHierarchyBuilder from '@/components/category-hierarchy-builder';

export default function CategoryManagement() {

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">분류 관리 시스템</h1>
          <p className="text-gray-600 mt-1">품목 분류를 효율적으로 관리하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200">
            <Sparkles className="w-3 h-3 mr-1" />
            혁신적 UI
          </Badge>
          <Badge variant="outline" className="text-green-600 border-green-200">
            v2.0 Beta
          </Badge>
        </div>
      </div>


      {/* Main Interface */}
      <div className="flex-1">
        <CategoryHierarchyBuilder />
      </div>

      {/* Usage Tips */}
      <Card className="border-blue-200 bg-blue-50 shadow-sm">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-2">💡 사용 팁:</p>
              
              {/* 주요 기능 설명 */}
              <div className="mb-3">
                <p className="font-medium text-blue-800 mb-1">🚀 주요 기능:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-700">
                  <div className="flex items-center gap-2">
                    <TreePine className="w-3 h-3" />
                    <span><strong>드래그 앤 드롭:</strong> 직관적인 재배열</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3" />
                    <span><strong>실시간 편집:</strong> 즉시 반영되는 변경사항</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Grid3x3 className="w-3 h-3" />
                    <span><strong>다중 선택:</strong> 일괄 작업 지원</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Rocket className="w-3 h-3" />
                    <span><strong>스마트 검색:</strong> 고급 필터링</span>
                  </div>
                </div>
              </div>

              {/* 단축키 및 조작법 */}
              <div>
                <p className="font-medium text-blue-800 mb-1">⌨️ 단축키 및 조작법:</p>
                <ul className="text-blue-800 space-y-1 text-xs">
                  <li>• <kbd className="bg-white px-1 rounded">Ctrl+F</kbd>로 빠른 검색, <kbd className="bg-white px-1 rounded">Ctrl+A</kbd>로 전체 선택</li>
                  <li>• 분류를 드래그하여 계층구조 변경, 우클릭으로 컨텍스트 메뉴 사용</li>
                  <li>• <kbd className="bg-white px-1 rounded">Delete</kbd>키로 선택된 항목 삭제, <kbd className="bg-white px-1 rounded">Esc</kbd>로 선택 해제</li>
                  <li>• 줌 조절로 더 나은 가시성 확보, 다중 선택 모드로 일괄 작업 수행</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}