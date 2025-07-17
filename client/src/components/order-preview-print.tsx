import { format } from "date-fns";

interface OrderPreviewPrintProps {
  order: any;
}

export function OrderPreviewPrint({ order }: OrderPreviewPrintProps) {
  const formatAmount = (amount: number) => {
    return `₩${Math.round(amount).toLocaleString('ko-KR')}`;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy년 MM월 dd일');
  };

  const getTotalAmount = () => {
    if (!order.items || order.items.length === 0) return 0;
    
    return order.items.reduce((sum: number, item: any) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const itemTotal = item.totalAmount || (quantity * unitPrice);
      const validTotal = parseFloat(itemTotal) || 0;
      return sum + validTotal;
    }, 0);
  };

  return (
    <div style={{
      fontFamily: '"Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
      fontSize: '11px',
      lineHeight: '1.3',
      color: '#000',
      backgroundColor: '#fff',
      margin: '0',
      padding: '0'
    }}>
      {/* 헤더 */}
      <table style={{ width: '100%', marginBottom: '15px', borderCollapse: 'collapse' }}>
        <tr>
          <td style={{ textAlign: 'left', borderBottom: '2px solid #000', paddingBottom: '8px' }}>
            <h1 style={{ margin: '0', fontSize: '18px', fontWeight: 'bold' }}>발주서 Purchase Order</h1>
          </td>
          <td style={{ textAlign: 'right', borderBottom: '2px solid #000', paddingBottom: '8px', fontSize: '10px' }}>
            발주번호: {order.orderNumber || "PO-2025-0612-001"}
          </td>
        </tr>
      </table>

      {/* 발주자/거래처 정보 */}
      <table style={{ width: '100%', marginBottom: '15px', borderCollapse: 'collapse' }}>
        <tr>
          <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '10px' }}>
            <table style={{ width: '100%', border: '1px solid #666', borderCollapse: 'collapse' }}>
              <tr>
                <th style={{ 
                  backgroundColor: '#f0f0f0', 
                  border: '1px solid #666', 
                  padding: '5px', 
                  fontSize: '11px', 
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  발주자 정보
                </th>
              </tr>
              <tr>
                <td style={{ border: '1px solid #666', padding: '8px', fontSize: '10px' }}>
                  <div><strong>회사명:</strong> 발주 시스템</div>
                  <div><strong>담당자:</strong> David Yang</div>
                  <div><strong>이메일:</strong> davidswyang@gmail.com</div>
                  <div><strong>연락처:</strong> 031-000-0000</div>
                  <div><strong>주소:</strong> 경기도 성남시 분당구</div>
                </td>
              </tr>
            </table>
          </td>
          <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: '10px' }}>
            <table style={{ width: '100%', border: '1px solid #666', borderCollapse: 'collapse' }}>
              <tr>
                <th style={{ 
                  backgroundColor: '#f0f0f0', 
                  border: '1px solid #666', 
                  padding: '5px', 
                  fontSize: '11px', 
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  거래처 정보
                </th>
              </tr>
              <tr>
                <td style={{ border: '1px solid #666', padding: '8px', fontSize: '10px' }}>
                  <div><strong>회사명:</strong> {order.vendor?.name || "익진파트너스"}</div>
                  <div><strong>사업자:</strong> {order.vendor?.businessNumber || "123-45-67890"}</div>
                  <div><strong>담당자:</strong> 홍길동</div>
                  <div><strong>연락처:</strong> 031-000-0000</div>
                  <div><strong>주소:</strong> 경기도 성남시 분당구</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      {/* 발주 정보 */}
      <table style={{ width: '100%', marginBottom: '15px', border: '1px solid #666', borderCollapse: 'collapse' }}>
        <tr>
          <th style={{ 
            backgroundColor: '#f0f0f0', 
            border: '1px solid #666', 
            padding: '5px', 
            fontSize: '11px', 
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            발주 정보
          </th>
        </tr>
        <tr>
          <td style={{ border: '1px solid #666', padding: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tr>
                <td style={{ width: '33%', fontSize: '10px', padding: '2px' }}>
                  <strong>발주번호:</strong> {order.orderNumber || "PO-2025-0612-001"}
                </td>
                <td style={{ width: '33%', fontSize: '10px', padding: '2px' }}>
                  <strong>발주일자:</strong> {order.orderDate ? formatDate(order.orderDate) : "2025년 06월 12일"}
                </td>
                <td style={{ width: '33%', fontSize: '10px', padding: '2px' }}>
                  <strong>납기일자:</strong> {order.deliveryDate ? formatDate(order.deliveryDate) : "2025년 06월 30일"}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      {/* 발주 항목 */}
      <table style={{ width: '100%', marginBottom: '15px', border: '1px solid #666', borderCollapse: 'collapse' }}>
        <tr>
          <th style={{ 
            backgroundColor: '#f0f0f0', 
            border: '1px solid #666', 
            padding: '5px', 
            fontSize: '11px', 
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            발주 항목
          </th>
        </tr>
        <tr>
          <td style={{ border: '1px solid #666', padding: '0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tr style={{ backgroundColor: '#f8f8f8' }}>
                <th style={{ border: '1px solid #666', padding: '4px', fontSize: '10px', textAlign: 'center', width: '8%' }}>순번</th>
                <th style={{ border: '1px solid #666', padding: '4px', fontSize: '10px', textAlign: 'center', width: '30%' }}>품목명</th>
                <th style={{ border: '1px solid #666', padding: '4px', fontSize: '10px', textAlign: 'center', width: '20%' }}>규격</th>
                <th style={{ border: '1px solid #666', padding: '4px', fontSize: '10px', textAlign: 'center', width: '10%' }}>수량</th>
                <th style={{ border: '1px solid #666', padding: '4px', fontSize: '10px', textAlign: 'center', width: '15%' }}>단가</th>
                <th style={{ border: '1px solid #666', padding: '4px', fontSize: '10px', textAlign: 'center', width: '17%' }}>금액</th>
              </tr>
              {order.items && order.items.length > 0 ? (
                order.items.map((item: any, index: number) => (
                  <tr key={item.id || index}>
                    <td style={{ border: '1px solid #666', padding: '4px', fontSize: '10px', textAlign: 'center' }}>
                      {index + 1}
                    </td>
                    <td style={{ border: '1px solid #666', padding: '4px', fontSize: '10px' }}>
                      {item.itemName}
                    </td>
                    <td style={{ border: '1px solid #666', padding: '4px', fontSize: '10px', textAlign: 'center' }}>
                      {item.specification || "-"}
                    </td>
                    <td style={{ border: '1px solid #666', padding: '4px', fontSize: '10px', textAlign: 'center' }}>
                      {parseFloat(item.quantity).toLocaleString()}
                    </td>
                    <td style={{ border: '1px solid #666', padding: '4px', fontSize: '10px', textAlign: 'right' }}>
                      {formatAmount(item.unitPrice)}
                    </td>
                    <td style={{ border: '1px solid #666', padding: '4px', fontSize: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatAmount(item.totalAmount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ border: '1px solid #666', padding: '20px', fontSize: '10px', textAlign: 'center', color: '#666' }}>
                    발주 항목이 없습니다.
                  </td>
                </tr>
              )}
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <td colSpan={5} style={{ border: '1px solid #666', padding: '6px', fontSize: '11px', textAlign: 'right', fontWeight: 'bold' }}>
                  총 금액:
                </td>
                <td style={{ border: '1px solid #666', padding: '6px', fontSize: '11px', textAlign: 'right', fontWeight: 'bold' }}>
                  {formatAmount(getTotalAmount())} (VAT 포함)
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      {/* 특이사항 */}
      <table style={{ width: '100%', marginBottom: '15px', border: '1px solid #666', borderCollapse: 'collapse' }}>
        <tr>
          <th style={{ 
            backgroundColor: '#f0f0f0', 
            border: '1px solid #666', 
            padding: '5px', 
            fontSize: '11px', 
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            특이사항
          </th>
        </tr>
        <tr>
          <td style={{ border: '1px solid #666', padding: '10px', fontSize: '10px', minHeight: '40px' }}>
            {order.notes || "본 발주서는 정기 발주에 따른 발생 건으로, 품질 및 납기일정을 준수하여 주시기 바랍니다."}
          </td>
        </tr>
      </table>

      {/* 서명란 */}
      <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
        <tr>
          <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '10px' }}>
            <table style={{ width: '100%', border: '1px solid #666', borderCollapse: 'collapse' }}>
              <tr>
                <th style={{ 
                  backgroundColor: '#f0f0f0', 
                  border: '1px solid #666', 
                  padding: '5px', 
                  fontSize: '11px', 
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  발주자
                </th>
              </tr>
              <tr>
                <td style={{ border: '1px solid #666', padding: '15px', fontSize: '10px', textAlign: 'center' }}>
                  <div style={{ marginBottom: '10px' }}>날짜: {order.orderDate ? formatDate(order.orderDate) : "2025년 06월 12일"}</div>
                  <div>서명: _______________</div>
                </td>
              </tr>
            </table>
          </td>
          <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: '10px' }}>
            <table style={{ width: '100%', border: '1px solid #666', borderCollapse: 'collapse' }}>
              <tr>
                <th style={{ 
                  backgroundColor: '#f0f0f0', 
                  border: '1px solid #666', 
                  padding: '5px', 
                  fontSize: '11px', 
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  승인자
                </th>
              </tr>
              <tr>
                <td style={{ border: '1px solid #666', padding: '15px', fontSize: '10px', textAlign: 'center' }}>
                  <div style={{ marginBottom: '10px' }}>날짜: _______________</div>
                  <div>서명: _______________</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      {/* 바닥글 */}
      <div style={{ marginTop: '20px', paddingTop: '10px', borderTop: '1px solid #999', fontSize: '9px', color: '#666' }}>
        <table style={{ width: '100%' }}>
          <tr>
            <td style={{ textAlign: 'left' }}>
              본 발주서는 자재 발주 관리 시스템에서 자동 생성되었습니다. 생성일시: {format(new Date(), 'yyyy년 MM월 dd일 HH:mm')}
            </td>
            <td style={{ textAlign: 'right' }}>
              페이지 1
            </td>
          </tr>
        </table>
      </div>
    </div>
  );
}