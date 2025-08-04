import React from "react";
import { useLocation } from "wouter";
import { EnhancedTable, Column } from "@/components/ui/enhanced-table";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Phone, 
  Mail,
  MapPin,
  MoreVertical,
  Edit,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Vendor {
  id: string;
  name: string;
  vendorCode: string;
  businessType: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
}

interface EnhancedVendorsTableProps {
  vendors: Vendor[];
  isLoading?: boolean;
  onEdit?: (vendorId: string) => void;
  onDelete?: (vendorId: string) => void;
}

export function EnhancedVendorsTable({ 
  vendors, 
  isLoading = false,
  onEdit,
  onDelete 
}: EnhancedVendorsTableProps) {
  const [, navigate] = useLocation();

  const columns: Column<Vendor>[] = [
    {
      key: "vendorCode",
      header: "거래처 코드",
      sortable: true,
      searchable: true,
      width: "120px",
      accessor: (row) => (
        <div className="font-medium text-gray-900">
          {row.vendorCode}
        </div>
      ),
    },
    {
      key: "name",
      header: "거래처명",
      sortable: true,
      searchable: true,
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium text-primary-600 hover:text-primary-700">
              {row.name}
            </div>
            {row.businessType && (
              <div className="text-xs text-gray-500">{row.businessType}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "contactPerson",
      header: "담당자",
      sortable: true,
      searchable: true,
      accessor: (row) => row.contactPerson || "-",
    },
    {
      key: "phone",
      header: "연락처",
      sortable: true,
      searchable: true,
      accessor: (row) => (
        <div className="flex items-center gap-1.5 text-sm">
          {row.phone ? (
            <>
              <Phone className="h-3.5 w-3.5 text-gray-400" />
              <span>{row.phone}</span>
            </>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: "email",
      header: "이메일",
      sortable: true,
      searchable: true,
      accessor: (row) => (
        <div className="flex items-center gap-1.5 text-sm">
          {row.email ? (
            <>
              <Mail className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-primary-600 hover:underline cursor-pointer">
                {row.email}
              </span>
            </>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: "address",
      header: "주소",
      searchable: true,
      accessor: (row) => (
        <div className="flex items-start gap-1.5 text-sm">
          {row.address ? (
            <>
              <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
              <span className="line-clamp-2">{row.address}</span>
            </>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: "isActive",
      header: "상태",
      sortable: true,
      width: "100px",
      align: "center",
      accessor: (row) => (
        <Badge 
          variant="outline" 
          className={row.isActive 
            ? "bg-green-50 text-green-700 border-green-200" 
            : "bg-gray-100 text-gray-600 border-gray-200"
          }
        >
          {row.isActive ? "활성" : "비활성"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "60px",
      align: "center",
      accessor: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/vendors/${row.id}`);
              }}
            >
              상세 보기
            </DropdownMenuItem>
            
            {onEdit && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(row.id);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                수정
              </DropdownMenuItem>
            )}
            
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`정말로 "${row.name}" 거래처를 삭제하시겠습니까?`)) {
                      onDelete(row.id);
                    }
                  }}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <EnhancedTable
      data={vendors}
      columns={columns}
      searchable
      searchPlaceholder="거래처명, 코드, 담당자, 연락처로 검색..."
      showPagination
      pageSize={20}
      pageSizeOptions={[10, 20, 50, 100]}
      onRowClick={(row) => navigate(`/vendors/${row.id}`)}
      rowKey={(row) => row.id}
      emptyMessage="등록된 거래처가 없습니다"
      isLoading={isLoading}
      stickyHeader
      maxHeight="calc(100vh - 280px)"
      className="shadow-sm"
    />
  );
}