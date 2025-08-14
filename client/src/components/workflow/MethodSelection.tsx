import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileSpreadsheet, 
  Edit3, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Zap,
  FileText
} from 'lucide-react';
import { CreationMethod } from '@shared/workflow-types';

interface MethodSelectionProps {
  onMethodSelect: (method: CreationMethod) => void;
  disabled?: boolean;
}

interface MethodOption {
  id: CreationMethod;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  pros: string[];
  cons: string[];
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  recommended?: boolean;
}

const methodOptions: MethodOption[] = [
  {
    id: 'excel',
    title: '엑셀 발주서',
    description: '엑셀 파일을 업로드하여 발주서를 자동으로 생성합니다',
    icon: <FileSpreadsheet className="w-8 h-8 text-green-600" />,
    features: [
      '다량의 발주서 일괄 처리',
      '기존 엑셀 양식 활용',
      '자동 데이터 파싱',
      '거래처 자동 검증',
      'PDF 변환 및 이메일 발송'
    ],
    pros: [
      '빠른 대량 처리',
      '기존 업무 방식 유지',
      '자동화된 후처리'
    ],
    cons: [
      '엑셀 양식 준수 필요',
      '오류 시 일괄 수정 어려움'
    ],
    estimatedTime: '3-5분',
    difficulty: 'easy',
    recommended: true
  },
  {
    id: 'standard',
    title: '표준 발주서',
    description: '웹 폼을 통해 발주서를 직접 입력하여 생성합니다',
    icon: <Edit3 className="w-8 h-8 text-blue-600" />,
    features: [
      '직관적인 웹 폼 인터페이스',
      '실시간 입력 검증',
      '단계별 승인 워크플로우',
      '개별 발주서 정밀 관리',
      'PDF 미리보기'
    ],
    pros: [
      '정확한 데이터 입력',
      '유연한 수정 가능',
      '승인 워크플로우 지원'
    ],
    cons: [
      '개별 입력으로 시간 소요',
      '대량 처리 시 비효율적'
    ],
    estimatedTime: '5-10분',
    difficulty: 'medium'
  }
];

const getDifficultyColor = (difficulty: MethodOption['difficulty']) => {
  switch (difficulty) {
    case 'easy': return 'bg-green-100 text-green-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'hard': return 'bg-red-100 text-red-800';
  }
};

const MethodSelection: React.FC<MethodSelectionProps> = ({
  onMethodSelect,
  disabled = false
}) => {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          발주서 작성 방식 선택
        </h2>
        <p className="text-gray-600">
          프로젝트 요구사항에 맞는 발주서 작성 방식을 선택해주세요
        </p>
      </div>

      {/* 방식 비교 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-[1366px] mx-auto">
        {methodOptions.map((method) => (
          <Card 
            key={method.id}
            className={`relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1 transform ${
              method.recommended ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
            } ${disabled ? 'opacity-50' : ''} h-full flex flex-col`}
          >
            {method.recommended && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-600 text-white px-3 py-1">
                  <Zap className="w-3 h-3 mr-1" />
                  추천
                </Badge>
              </div>
            )}

            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {method.icon}
                  <div>
                    <CardTitle className="text-xl">{method.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {method.description}
                    </CardDescription>
                  </div>
                </div>
              </div>

              {/* 메타 정보 */}
              <div className="flex items-center space-x-4 mt-4">
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{method.estimatedTime}</span>
                </div>
                <Badge variant="secondary" className={getDifficultyColor(method.difficulty)}>
                  {method.difficulty === 'easy' ? '쉬움' : 
                   method.difficulty === 'medium' ? '보통' : '어려움'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* 주요 기능 */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  주요 기능
                </h4>
                <ul className="space-y-1">
                  {method.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 장단점 */}
              <div className="grid grid-cols-1 gap-4">
                {/* 장점 */}
                <div>
                  <h4 className="font-medium text-green-700 mb-2 flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    장점
                  </h4>
                  <ul className="space-y-1">
                    {method.pros.map((pro, index) => (
                      <li key={index} className="text-xs text-green-600 ml-5">
                        • {pro}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 단점 */}
                <div>
                  <h4 className="font-medium text-orange-700 mb-2 flex items-center text-sm">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    고려사항
                  </h4>
                  <ul className="space-y-1">
                    {method.cons.map((con, index) => (
                      <li key={index} className="text-xs text-orange-600 ml-5">
                        • {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 선택 버튼 */}
              <div className="pt-4">
                <Button
                  onClick={() => onMethodSelect(method.id)}
                  disabled={disabled}
                  className={`w-full h-12 ${
                    method.id === 'excel' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  size="lg"
                >
                  <div className="flex items-center space-x-2">
                    {method.icon}
                    <span>{method.title} 선택</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 도움말 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">어떤 방식을 선택해야 할까요?</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>엑셀 발주서</strong>: 여러 개의 발주서를 한 번에 처리해야 하거나, 기존 엑셀 양식이 있는 경우</p>
                <p><strong>표준 발주서</strong>: 개별 발주서를 정확히 관리하고 싶거나, 승인 워크플로우가 필요한 경우</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MethodSelection;