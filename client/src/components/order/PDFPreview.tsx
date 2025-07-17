import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ZoomOut, ZoomIn, RotateCcw, Printer } from "lucide-react";
import { formatKoreanWon } from "@/lib/order-utils";
import type { StandardOrderForm, PurchaseItem } from "@shared/order-types";

interface PDFPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  formData: StandardOrderForm;
  items: PurchaseItem[];
  poNumber: string;
}

export default function PDFPreview({ 
  isOpen, 
  onClose, 
  formData, 
  items, 
  poNumber 
}: PDFPreviewProps) {
  const totalAmount = items.reduce((total, item) => total + (item.price || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>PDF 미리보기</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="bg-white p-8 shadow-lg" style={{ width: "190mm", minHeight: "297mm", margin: "0 auto" }}>
          {/* PDF Content */}
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold">구매 발주서</h1>
              <p className="text-sm text-gray-600 mt-2">Purchase Order</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>발주서 번호:</strong> {poNumber}</p>
                <p><strong>작성일:</strong> {new Date().toLocaleDateString('ko-KR')}</p>
                <p><strong>현장:</strong> {formData.site}</p>
              </div>
              <div>
                <p><strong>납품 희망일:</strong> {formData.deliveryDate}</p>
                <p><strong>자재 인수자:</strong> {formData.receiver}</p>
                <p><strong>본사 담당자:</strong> {formData.manager}</p>
              </div>
            </div>

            <div className="border border-gray-300">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-1">No</th>
                    <th className="border border-gray-300 p-1">대분류</th>
                    <th className="border border-gray-300 p-1">중분류</th>
                    <th className="border border-gray-300 p-1">소분류</th>
                    <th className="border border-gray-300 p-1">품목명</th>
                    <th className="border border-gray-300 p-1">규격</th>
                    <th className="border border-gray-300 p-1">수량</th>
                    <th className="border border-gray-300 p-1">단위</th>
                    <th className="border border-gray-300 p-1">단가</th>
                    <th className="border border-gray-300 p-1">금액</th>
                    <th className="border border-gray-300 p-1">납품처</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 p-1 text-center">{index + 1}</td>
                      <td className="border border-gray-300 p-1">{item.category}</td>
                      <td className="border border-gray-300 p-1">{item.subCategory1}</td>
                      <td className="border border-gray-300 p-1">{item.subCategory2}</td>
                      <td className="border border-gray-300 p-1">{item.item}</td>
                      <td className="border border-gray-300 p-1">{item.name}</td>
                      <td className="border border-gray-300 p-1 text-right">{item.quantity}</td>
                      <td className="border border-gray-300 p-1 text-center">{item.unit}</td>
                      <td className="border border-gray-300 p-1 text-right">{formatKoreanWon(parseInt(item.unitPrice) || 0)}</td>
                      <td className="border border-gray-300 p-1 text-right">{formatKoreanWon(item.price)}</td>
                      <td className="border border-gray-300 p-1">{item.deliveryLocation}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={9} className="border border-gray-300 p-1 text-center">합계</td>
                    <td className="border border-gray-300 p-1 text-right">{formatKoreanWon(totalAmount)}</td>
                    <td className="border border-gray-300 p-1"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {formData.notes && (
              <div className="text-sm">
                <p><strong>특이사항:</strong></p>
                <p className="mt-1 p-2 bg-gray-50 border">{formData.notes}</p>
              </div>
            )}

            <div className="grid grid-cols-5 gap-4 text-xs mt-8">
              <div className="border border-gray-300 p-2 text-center">
                <p className="font-semibold">담당</p>
                <div className="h-12"></div>
              </div>
              <div className="border border-gray-300 p-2 text-center">
                <p className="font-semibold">공무</p>
                <div className="h-12"></div>
              </div>
              <div className="border border-gray-300 p-2 text-center">
                <p className="font-semibold">팀장</p>
                <div className="h-12"></div>
              </div>
              <div className="border border-gray-300 p-2 text-center">
                <p className="font-semibold">임원</p>
                <div className="h-12"></div>
              </div>
              <div className="border border-gray-300 p-2 text-center">
                <p className="font-semibold">사장</p>
                <div className="h-12"></div>
              </div>
            </div>

            <div className="text-center text-sm mt-8">
              <p className="font-semibold">회사명</p>
              <p>주소: 서울특별시 강남구</p>
              <p>전화: 02-1234-5678 | 팩스: 02-1234-5679</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}