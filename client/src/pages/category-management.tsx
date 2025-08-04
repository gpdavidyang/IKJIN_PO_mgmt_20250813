import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, Sparkles, TreePine, Grid3x3, Zap, Rocket, Brain } from 'lucide-react';
import CategoryHierarchyBuilder from '@/components/category-hierarchy-builder';
import CategoryTreeManager from '@/components/category-tree-manager';
import CategoryMindMapView from '@/components/category-mindmap-view';

export default function CategoryManagement() {
  const [activeTab, setActiveTab] = useState('revolutionary');

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">분류 관리 시스템</h1>
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

      {/* Feature Highlights */}
      <Card className="border-gradient-to-r from-blue-200 to-purple-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <TreePine className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">드래그 앤 드롭</p>
                <p className="text-xs text-gray-600">직관적인 재배열</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-sm">실시간 편집</p>
                <p className="text-xs text-gray-600">즉시 반영되는 변경사항</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Grid3x3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-sm">다중 선택</p>
                <p className="text-xs text-gray-600">일괄 작업 지원</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-sm">스마트 검색</p>
                <p className="text-xs text-gray-600">고급 필터링</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-sm">마인드맵 시각화</p>
                <p className="text-xs text-gray-600">관계도 기반 구조화</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Interface */}
      <div className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="revolutionary" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              혁신적 인터페이스
              <Badge variant="secondary" className="ml-1 text-xs bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800">
                NEW
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="mindmap" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              마인드맵 뷰
              <Badge variant="secondary" className="ml-1 text-xs bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800">
                BETA
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="tree" className="flex items-center gap-2">
              <TreePine className="w-4 h-4" />
              트리 뷰 (기존)
            </TabsTrigger>
            <TabsTrigger value="legacy" className="flex items-center gap-2">
              <Grid3x3 className="w-4 h-4" />
              레거시 뷰
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revolutionary" className="flex-1 mt-0">
            <CategoryHierarchyBuilder />
          </TabsContent>

          <TabsContent value="mindmap" className="flex-1 mt-0">
            <CategoryMindMapView />
          </TabsContent>

          <TabsContent value="tree" className="flex-1 mt-0">
            <CategoryTreeManager />
          </TabsContent>

          <TabsContent value="legacy" className="flex-1 mt-0">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  레거시 인터페이스 안내
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto flex items-center justify-center">
                    <Grid3x3 className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700">레거시 뷰는 더 이상 지원되지 않습니다</h3>
                    <p className="text-gray-500 mt-2 max-w-md mx-auto">
                      새로운 혁신적 인터페이스를 사용하시거나, 기존 트리 뷰를 이용해주세요.
                      더 나은 사용자 경험을 위해 새로운 인터페이스를 권장합니다.
                    </p>
                  </div>
                  <Button 
                    onClick={() => setActiveTab('revolutionary')}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    혁신적 인터페이스 체험하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Usage Tips */}
      {activeTab === 'revolutionary' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">💡 사용 팁:</p>
                <ul className="text-blue-800 space-y-1 text-xs">
                  <li>• <kbd className="bg-white px-1 rounded">Ctrl+F</kbd>로 빠른 검색, <kbd className="bg-white px-1 rounded">Ctrl+A</kbd>로 전체 선택</li>
                  <li>• 분류를 드래그하여 계층구조 변경, 우클릭으로 컨텍스트 메뉴 사용</li>
                  <li>• <kbd className="bg-white px-1 rounded">Delete</kbd>키로 선택된 항목 삭제, <kbd className="bg-white px-1 rounded">Esc</kbd>로 선택 해제</li>
                  <li>• 줌 조절로 더 나은 가시성 확보, 다중 선택 모드로 일괄 작업 수행</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}