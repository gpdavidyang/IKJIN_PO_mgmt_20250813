import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  placeholder?: string;
  options?: { value: string; label: string; }[];
  value: string;
  onChange: (value: string) => void;
}

interface FilterSectionProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  primaryFilters?: FilterField[];
  secondaryFilters?: FilterField[];
  activeFilters?: { key: string; label: string; value: string; color?: string; onRemove: () => void; }[];
  children?: React.ReactNode;
}

export function FilterSection({ 
  searchValue, 
  onSearchChange, 
  primaryFilters = [], 
  secondaryFilters = [], 
  activeFilters = [],
  children 
}: FilterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderFilterField = (field: FilterField, compact = false) => {
    const height = compact ? "h-9" : "h-10";
    const activeStyle = field.value && field.value !== "all" ? "border-blue-500 bg-blue-50" : "";

    switch (field.type) {
      case 'select':
        return (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger className={`${height} ${activeStyle}`}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'date':
        return (
          <Input
            type="date"
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            className={`${height} ${activeStyle}`}
            placeholder={field.placeholder}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            className={`${height} ${activeStyle}`}
            placeholder={field.placeholder}
          />
        );
      default:
        return (
          <Input
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            className={`${height} ${activeStyle}`}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardContent className="p-4">
        {/* Always Visible Section */}
        <div className="space-y-4 mb-4">
          <div className="flex flex-col xl:flex-row xl:items-end gap-4">
            {/* Search Section */}
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground block mb-2 transition-colors duration-200">검색</label>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 transition-colors duration-200 group-hover:text-foreground" />
                <Input
                  placeholder="검색어를 입력하세요..."
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className={cn(
                    "pl-10 h-10 transition-all duration-200",
                    searchValue ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "",
                    "hover:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  )}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      onSearchChange(searchValue);
                    }
                  }}
                  aria-label="검색어 입력"
                />
                {searchValue && (
                  <button
                    onClick={() => onSearchChange("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-full w-5 h-5 flex items-center justify-center"
                    title="검색어 지우기"
                    aria-label="검색어 지우기"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Primary Filters */}
            {primaryFilters.map((field) => (
              <div key={field.key} className="w-full xl:w-80">
                <label className="text-sm font-medium text-foreground block mb-2 transition-colors duration-200">{field.label}</label>
                {renderFilterField(field)}
              </div>
            ))}

            {/* Filter Toggle Button */}
            {secondaryFilters.length > 0 && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-2 h-10 px-4 transition-all duration-200 hover:scale-105 active:scale-95 hover:bg-accent/50 focus:ring-2 focus:ring-primary/20"
                  aria-label={isExpanded ? "상세 필터 닫기" : "상세 필터 열기"}
                  aria-expanded={isExpanded}
                >
                  <Filter className="h-4 w-4 transition-transform duration-200" />
                  상세 필터
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Secondary Filters */}
        {isExpanded && secondaryFilters.length > 0 && (
          <div className="border-t pt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {secondaryFilters.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">{field.label}</label>
                    {renderFilterField(field, true)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active Filters & Custom Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
          {/* Active Filters Display */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-600">적용된 필터:</span>
              {activeFilters.map((filter, index) => (
                <span 
                  key={index}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${
                    filter.color || "bg-purple-100 text-purple-800 border-purple-200"
                  }`}
                >
                  {filter.label}: {filter.value}
                  <button
                    onClick={filter.onRemove}
                    className="ml-2 hover:bg-black/20 rounded-full w-4 h-4 flex items-center justify-center"
                    title="필터 제거"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Custom Actions */}
          {children && (
            <div className="flex items-center gap-2">
              {children}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}