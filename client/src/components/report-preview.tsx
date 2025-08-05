import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, FileText } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getStatusText } from "@/lib/statusUtils";

interface ReportPreviewProps {
  config: any;
  orders: any[];
  onClose: () => void;
}

export default function ReportPreview({ config, orders, onClose }: ReportPreviewProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  // 데이터 분석
  const totalAmount = orders.reduce((sum, order) => {
    const amount = parseFloat(order.totalAmount) || 0;
    return sum + amount;
  }, 0);
  const avgAmount = totalAmount / orders.length;

  const statusData = Object.entries(
    orders.reduce((acc, order) => {
      const status = getStatusText(order.status);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([status, count]) => ({ name: status, value: count }));

  const monthlyData = Object.entries(
    orders.reduce((acc, order) => {
      const month = new Date(order.orderDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([month, count]) => ({ month, orders: count }));

  const vendorData = Object.entries(
    orders.reduce((acc, order) => {
      const vendorName = order.vendor?.name || '알 수 없음';
      acc[vendorName] = (acc[vendorName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort(([,a], [,b]) => (b as number) - (a as number)).slice(0, 10).map(([name, count]) => ({ name, orders: count }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const generatePDF = async () => {
    if (!reportRef.current) return;

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `${config.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF 생성 실패:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-[1366px] max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            보고서 미리보기
          </h2>
          <div className="flex gap-2">
            <Button onClick={generatePDF} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="h-4 w-4 mr-2" />
              PDF 다운로드
            </Button>
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </div>
        </div>

        <div ref={reportRef} className="p-8 bg-white" style={{ minHeight: '297mm' }}>
          {/* 보고서 헤더 */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">{config.title}</h1>
            <p className="text-gray-600">생성일: {new Date().toLocaleDateString('ko-KR')}</p>
            <p className="text-gray-600">분석 데이터: {orders.length}건</p>
          </div>

          {/* 요약 정보 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>요약 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{orders.length}</div>
                  <div className="text-sm text-gray-600">총 발주 건수</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">₩{Math.floor(totalAmount).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">총 발주 금액</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">₩{Math.floor(avgAmount).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">평균 발주 금액</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{vendorData.length}</div>
                  <div className="text-sm text-gray-600">거래처 수</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 자동 생성된 요약 */}
          {config.summary && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>분석 요약</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-line text-sm">{config.summary}</div>
              </CardContent>
            </Card>
          )}

          {/* 차트들 */}
          <div className="space-y-6">
            {/* 상태별 분포 차트 */}
            {config.includeCharts.statusDistribution && (
              <Card>
                <CardHeader>
                  <CardTitle>발주 상태별 분포</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    {config.chartTypes.statusDistribution === 'pie' ? (
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value, percent }) => `${name}: ${value}건 (${(percent * 100).toFixed(1)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    ) : (
                      <BarChart data={statusData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#8884d8" />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* 월별 현황 차트 */}
            {config.includeCharts.monthlyTrend && (
              <Card>
                <CardHeader>
                  <CardTitle>월별 발주 현황</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="orders" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* 거래처별 분석 */}
            {config.includeCharts.vendorAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle>거래처별 발주 현황 (상위 10개)</CardTitle>
                </CardHeader>
                <CardContent>
                  {config.chartTypes.vendorAnalysis === 'table' ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-200">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-200 px-4 py-2 text-left">거래처명</th>
                            <th className="border border-gray-200 px-4 py-2 text-center">발주 건수</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendorData.map((vendor, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border border-gray-200 px-4 py-2">{vendor.name}</td>
                              <td className="border border-gray-200 px-4 py-2 text-center">{vendor.orders}건</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={vendorData} layout={config.chartTypes.vendorAnalysis === 'horizontal' ? 'horizontal' : 'vertical'}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={config.chartTypes.vendorAnalysis === 'horizontal' ? 'orders' : 'name'} />
                        <YAxis dataKey={config.chartTypes.vendorAnalysis === 'horizontal' ? 'name' : undefined} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="orders" fill="#ffc658" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* 주요 인사이트 */}
          {config.insights && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>주요 인사이트</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-line text-sm">{config.insights}</div>
              </CardContent>
            </Card>
          )}

          {/* 추가 코멘트 */}
          {config.comments && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>추가 코멘트</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-line text-sm">{config.comments}</div>
              </CardContent>
            </Card>
          )}

          {/* 보고서 푸터 */}
          <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
            <p>본 보고서는 발주 관리 시스템에서 자동 생성되었습니다.</p>
            <p>생성 시간: {new Date().toLocaleString('ko-KR')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}