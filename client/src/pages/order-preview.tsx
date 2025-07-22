import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

export default function OrderPreview() {
  const params = useParams();
  const orderId = params.id;

  const { data: order, isLoading } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
    queryFn: () => fetch(`/api/orders/${orderId}`).then(res => res.json()),
    enabled: !!orderId,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">발주서를 불러오는 중...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">발주서를 찾을 수 없습니다</h1>
          <Button onClick={() => window.close()}>
            창 닫기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print controls - hidden when printing */}
      <div className="no-print fixed top-4 right-4 z-50 flex space-x-2">
        <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
          <Printer className="h-4 w-4 mr-2" />
          인쇄
        </Button>
        <Button onClick={handleDownload} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          PDF 저장
        </Button>
      </div>

      {/* Order preview content */}
      <div className="order-preview-container" style={{
        fontFamily: '"Noto Sans KR", "Malgun Gothic", sans-serif',
        fontSize: '11px',
        lineHeight: '1.3',
        color: '#000',
        backgroundColor: '#fff',
        width: '210mm',
        minHeight: '297mm',
        padding: '10mm',
        margin: '0 auto',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: '2px solid #333', 
          paddingBottom: '8px', 
          marginBottom: '15px' 
        }}>
          <h1 style={{ 
            margin: '0', 
            fontSize: '18px', 
            fontWeight: 'bold', 
            color: '#333' 
          }}>
            발주서 Purchase Order
          </h1>
          <div style={{ 
            fontSize: '10px', 
            color: '#666' 
          }}>
            발주번호: {order.orderNumber}
          </div>
        </div>
        
        {/* Info grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '20px', 
          marginBottom: '20px' 
        }}>
          <div>
            <h3 style={{ 
              fontSize: '12px', 
              fontWeight: 'bold', 
              margin: '0 0 8px 0', 
              backgroundColor: '#f5f5f5', 
              padding: '4px 8px', 
              border: '1px solid #ddd' 
            }}>
              거래처 정보
            </h3>
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>회사명:</span>
              <span style={{ flex: '1' }}>{order.vendor?.name || '-'}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>사업자번호:</span>
              <span style={{ flex: '1' }}>{order.vendor?.businessNumber || '-'}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>연락처:</span>
              <span style={{ flex: '1' }}>{order.vendor?.phone || '-'}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>이메일:</span>
              <span style={{ flex: '1' }}>{order.vendor?.email || '-'}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>주소:</span>
              <span style={{ flex: '1' }}>{order.vendor?.address || '-'}</span>
            </div>
          </div>
          
          <div>
            <h3 style={{ 
              fontSize: '12px', 
              fontWeight: 'bold', 
              margin: '0 0 8px 0', 
              backgroundColor: '#f5f5f5', 
              padding: '4px 8px', 
              border: '1px solid #ddd' 
            }}>
              발주 정보
            </h3>
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>발주일자:</span>
              <span style={{ flex: '1' }}>{order.orderDate ? new Date(order.orderDate).toLocaleDateString('ko-KR') : '-'}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>납품희망일:</span>
              <span style={{ flex: '1' }}>{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('ko-KR') : '-'}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>발주자:</span>
              <span style={{ flex: '1' }}>{order.user?.lastName || ''} {order.user?.firstName || ''}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>상태:</span>
              <span style={{ flex: '1' }}>
                {order.status === 'pending' ? '대기' : 
                 order.status === 'approved' ? '승인' : 
                 order.status === 'sent' ? '발송' : order.status}
              </span>
            </div>
          </div>
        </div>
        
        {/* Items table */}
        <h3 style={{ 
          fontSize: '12px', 
          fontWeight: 'bold', 
          margin: '0 0 8px 0', 
          backgroundColor: '#f5f5f5', 
          padding: '4px 8px', 
          border: '1px solid #ddd' 
        }}>
          발주 품목
        </h3>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          marginBottom: '15px' 
        }}>
          <thead>
            <tr>
              <th style={{ 
                border: '1px solid #ddd', 
                padding: '6px', 
                textAlign: 'left', 
                fontSize: '10px',
                backgroundColor: '#f5f5f5', 
                fontWeight: 'bold' 
              }}>
                품목명
              </th>
              <th style={{ 
                border: '1px solid #ddd', 
                padding: '6px', 
                textAlign: 'left', 
                fontSize: '10px',
                backgroundColor: '#f5f5f5', 
                fontWeight: 'bold' 
              }}>
                규격
              </th>
              <th style={{ 
                border: '1px solid #ddd', 
                padding: '6px', 
                textAlign: 'right', 
                fontSize: '10px',
                backgroundColor: '#f5f5f5', 
                fontWeight: 'bold' 
              }}>
                수량
              </th>
              <th style={{ 
                border: '1px solid #ddd', 
                padding: '6px', 
                textAlign: 'right', 
                fontSize: '10px',
                backgroundColor: '#f5f5f5', 
                fontWeight: 'bold' 
              }}>
                단가
              </th>
              <th style={{ 
                border: '1px solid #ddd', 
                padding: '6px', 
                textAlign: 'right', 
                fontSize: '10px',
                backgroundColor: '#f5f5f5', 
                fontWeight: 'bold' 
              }}>
                금액
              </th>
              <th style={{ 
                border: '1px solid #ddd', 
                padding: '6px', 
                textAlign: 'left', 
                fontSize: '10px',
                backgroundColor: '#f5f5f5', 
                fontWeight: 'bold' 
              }}>
                비고
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item: any, index: number) => (
              <tr key={index}>
                <td style={{ 
                  border: '1px solid #ddd', 
                  padding: '6px', 
                  textAlign: 'left', 
                  fontSize: '10px' 
                }}>
                  {item.itemName}
                </td>
                <td style={{ 
                  border: '1px solid #ddd', 
                  padding: '6px', 
                  textAlign: 'left', 
                  fontSize: '10px' 
                }}>
                  {item.specification || '-'}
                </td>
                <td style={{ 
                  border: '1px solid #ddd', 
                  padding: '6px', 
                  textAlign: 'right', 
                  fontSize: '10px' 
                }}>
                  {Number(item.quantity).toLocaleString('ko-KR')}
                </td>
                <td style={{ 
                  border: '1px solid #ddd', 
                  padding: '6px', 
                  textAlign: 'right', 
                  fontSize: '10px' 
                }}>
                  ₩{Number(item.unitPrice).toLocaleString('ko-KR')}
                </td>
                <td style={{ 
                  border: '1px solid #ddd', 
                  padding: '6px', 
                  textAlign: 'right', 
                  fontSize: '10px' 
                }}>
                  ₩{Number(item.totalAmount).toLocaleString('ko-KR')}
                </td>
                <td style={{ 
                  border: '1px solid #ddd', 
                  padding: '6px', 
                  textAlign: 'left', 
                  fontSize: '10px' 
                }}>
                  {item.notes || '-'}
                </td>
              </tr>
            )) || []}
          </tbody>
          <tfoot>
            <tr>
              <th style={{ 
                border: '1px solid #ddd', 
                padding: '6px', 
                textAlign: 'left', 
                fontSize: '10px',
                backgroundColor: '#f5f5f5', 
                fontWeight: 'bold' 
              }} colSpan={4}>
                총 금액
              </th>
              <th style={{ 
                border: '1px solid #ddd', 
                padding: '6px', 
                textAlign: 'right', 
                fontSize: '10px',
                backgroundColor: '#f5f5f5', 
                fontWeight: 'bold' 
              }}>
                ₩{Number(order.totalAmount || 0).toLocaleString('ko-KR')}
              </th>
              <th style={{ 
                border: '1px solid #ddd', 
                padding: '6px', 
                backgroundColor: '#f5f5f5' 
              }}></th>
            </tr>
          </tfoot>
        </table>
        
        {/* Notes */}
        {order.notes && (
          <div style={{ 
            marginTop: '15px', 
            padding: '8px', 
            border: '1px solid #ddd', 
            backgroundColor: '#f9f9f9' 
          }}>
            <strong>특이사항:</strong><br />
            {order.notes}
          </div>
        )}
      </div>
    </>
  );
}