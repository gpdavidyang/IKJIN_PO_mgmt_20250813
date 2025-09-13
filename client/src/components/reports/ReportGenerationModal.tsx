import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, Eye, Download } from "lucide-react";

interface ReportConfig {
  title: string;
  includeCharts: {
    statusDistribution: boolean;
    monthlyTrend: boolean;
    vendorAnalysis: boolean;
    amountAnalysis: boolean;
  };
  chartTypes: {
    statusDistribution: string;
    monthlyTrend: string;
    vendorAnalysis: string;
    amountAnalysis: string;
  };
  summary: string;
  insights: string;
  comments: string;
}

interface ReportGenerationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  reportConfig: ReportConfig;
  setReportConfig: React.Dispatch<React.SetStateAction<ReportConfig>>;
  selectedItemsCount: number;
  onGenerateReport: () => void;
}

export default function ReportGenerationModal({
  isOpen,
  onOpenChange,
  reportConfig,
  setReportConfig,
  selectedItemsCount,
  onGenerateReport
}: ReportGenerationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            보고서 생성
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">기본 정보</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="reportTitle">보고서 제목</Label>
                <Input
                  id="reportTitle"
                  value={reportConfig.title}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>선택된 데이터</Label>
                <p className="text-sm text-gray-600 mt-1">
                  총 {selectedItemsCount}건의 발주 데이터가 선택되었습니다.
                </p>
              </div>
            </div>
          </div>

          {/* 차트 옵션 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">차트 옵션</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="statusChart"
                  checked={reportConfig.includeCharts.statusDistribution}
                  onCheckedChange={(checked) => 
                    setReportConfig(prev => ({
                      ...prev,
                      includeCharts: { ...prev.includeCharts, statusDistribution: !!checked }
                    }))
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="statusChart">상태별 분포</Label>
                  <p className="text-xs text-gray-600">발주 상태별 통계 차트</p>
                </div>
                {reportConfig.includeCharts.statusDistribution && (
                  <Select 
                    value={reportConfig.chartTypes.statusDistribution} 
                    onValueChange={(value) => 
                      setReportConfig(prev => ({
                        ...prev,
                        chartTypes: { ...prev.chartTypes, statusDistribution: value }
                      }))
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pie">파이</SelectItem>
                      <SelectItem value="donut">도넛</SelectItem>
                      <SelectItem value="bar">막대</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="monthlyChart"
                  checked={reportConfig.includeCharts.monthlyTrend}
                  onCheckedChange={(checked) => 
                    setReportConfig(prev => ({
                      ...prev,
                      includeCharts: { ...prev.includeCharts, monthlyTrend: !!checked }
                    }))
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="monthlyChart">월별 현황</Label>
                  <p className="text-xs text-gray-600">월별 발주 추이 차트</p>
                </div>
                {reportConfig.includeCharts.monthlyTrend && (
                  <Select 
                    value={reportConfig.chartTypes.monthlyTrend} 
                    onValueChange={(value) => 
                      setReportConfig(prev => ({
                        ...prev,
                        chartTypes: { ...prev.chartTypes, monthlyTrend: value }
                      }))
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">막대</SelectItem>
                      <SelectItem value="line">선형</SelectItem>
                      <SelectItem value="area">영역</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vendorChart"
                  checked={reportConfig.includeCharts.vendorAnalysis}
                  onCheckedChange={(checked) => 
                    setReportConfig(prev => ({
                      ...prev,
                      includeCharts: { ...prev.includeCharts, vendorAnalysis: !!checked }
                    }))
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="vendorChart">거래처별 분석</Label>
                  <p className="text-xs text-gray-600">거래처별 발주 통계</p>
                </div>
                {reportConfig.includeCharts.vendorAnalysis && (
                  <Select 
                    value={reportConfig.chartTypes.vendorAnalysis} 
                    onValueChange={(value) => 
                      setReportConfig(prev => ({
                        ...prev,
                        chartTypes: { ...prev.chartTypes, vendorAnalysis: value }
                      }))
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">막대</SelectItem>
                      <SelectItem value="horizontal">가로막대</SelectItem>
                      <SelectItem value="table">테이블</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="amountChart"
                  checked={reportConfig.includeCharts.amountAnalysis}
                  onCheckedChange={(checked) => 
                    setReportConfig(prev => ({
                      ...prev,
                      includeCharts: { ...prev.includeCharts, amountAnalysis: !!checked }
                    }))
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="amountChart">금액별 분석</Label>
                  <p className="text-xs text-gray-600">발주 금액 분포 차트</p>
                </div>
                {reportConfig.includeCharts.amountAnalysis && (
                  <Select 
                    value={reportConfig.chartTypes.amountAnalysis} 
                    onValueChange={(value) => 
                      setReportConfig(prev => ({
                        ...prev,
                        chartTypes: { ...prev.chartTypes, amountAnalysis: value }
                      }))
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">막대</SelectItem>
                      <SelectItem value="histogram">히스토그램</SelectItem>
                      <SelectItem value="box">박스플롯</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* 요약 및 인사이트 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">요약 및 인사이트</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="summary">자동 생성된 요약</Label>
                <Textarea
                  id="summary"
                  value={reportConfig.summary}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, summary: e.target.value }))}
                  className="mt-1 min-h-[100px]"
                  placeholder="데이터 기반 자동 요약이 여기에 표시됩니다..."
                />
              </div>
              <div>
                <Label htmlFor="insights">주요 인사이트</Label>
                <Textarea
                  id="insights"
                  value={reportConfig.insights}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, insights: e.target.value }))}
                  className="mt-1"
                  placeholder="발견한 주요 인사이트를 입력하세요..."
                />
              </div>
              <div>
                <Label htmlFor="comments">추가 코멘트</Label>
                <Textarea
                  id="comments"
                  value={reportConfig.comments}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, comments: e.target.value }))}
                  className="mt-1"
                  placeholder="추가 설명이나 권고사항을 입력하세요..."
                />
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button onClick={onGenerateReport} className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              미리보기 생성
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}