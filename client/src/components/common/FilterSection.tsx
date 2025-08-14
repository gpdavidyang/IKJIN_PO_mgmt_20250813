import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Filter, ChevronDown, ChevronUp, RotateCcw, Search } from "lucide-react";

interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'dateRange' | 'numberRange';
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  width?: 'sm' | 'md' | 'lg' | 'full';
}

interface FilterSectionProps {
  fields: FilterField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onReset: () => void;
  onSearch: () => void;
  isCollapsible?: boolean;
  defaultExpanded?: boolean;
  searchPlaceholder?: string;
}

export function FilterSection({
  fields,
  values,
  onChange,
  onReset,
  onSearch,
  isCollapsible = true,
  defaultExpanded = false,
  searchPlaceholder = "검색어를 입력하세요"
}: FilterSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const renderField = (field: FilterField) => {
    const value = values[field.key];
    const hasValue = value && value !== "all" && value !== "";
    const inputClass = `h-9 ${hasValue ? "border-blue-500 bg-blue-50" : ""}`;

    switch (field.type) {
      case 'text':
        return (
          <Input
            placeholder={field.placeholder}
            value={value || ""}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={inputClass}
          />
        );

      case 'select':
        return (
          <Select value={value || "all"} onValueChange={(val) => onChange(field.key, val)}>
            <SelectTrigger className={inputClass}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
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
            value={value || ""}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={inputClass}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            placeholder={field.placeholder}
            value={value || ""}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={inputClass}
          />
        );

      case 'dateRange':
        const [startKey, endKey] = field.key.split(',');
        return (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={values[startKey] || ""}
              onChange={(e) => onChange(startKey, e.target.value)}
              className={`${values[startKey] ? "border-blue-500 bg-blue-50" : ""} h-9 w-full`}
            />
            <span className="text-gray-400 text-sm">~</span>
            <Input
              type="date"
              value={values[endKey] || ""}
              onChange={(e) => onChange(endKey, e.target.value)}
              className={`${values[endKey] ? "border-blue-500 bg-blue-50" : ""} h-9 w-full`}
            />
          </div>
        );

      case 'numberRange':
        const [minKey, maxKey] = field.key.split(',');
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="최소값"
              value={values[minKey] || ""}
              onChange={(e) => onChange(minKey, e.target.value)}
              className={`${values[minKey] ? "border-blue-500 bg-blue-50" : ""} h-9 flex-1`}
            />
            <span className="text-gray-400 text-sm">~</span>
            <Input
              type="number"
              placeholder="최대값"
              value={values[maxKey] || ""}
              onChange={(e) => onChange(maxKey, e.target.value)}
              className={`${values[maxKey] ? "border-blue-500 bg-blue-50" : ""} h-9 flex-1`}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const getFieldWidth = (width?: string) => {
    switch (width) {
      case 'sm': return 'lg:col-span-1';
      case 'md': return 'lg:col-span-2';
      case 'lg': return 'lg:col-span-3';
      case 'full': return 'lg:col-span-4';
      default: return 'lg:col-span-1';
    }
  };

  const FilterContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {fields.map((field) => (
          <div key={field.key} className={`space-y-2 ${getFieldWidth(field.width)}`}>
            <label className="text-sm font-medium text-gray-700">{field.label}</label>
            {renderField(field)}
          </div>
        ))}
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t">
        <div className="flex gap-2">
          <Button onClick={onReset} variant="outline" className="h-9 px-4">
            <RotateCcw className="h-4 w-4 mr-2" />
            초기화
          </Button>
          <Button onClick={onSearch} className="h-9 px-4">
            <Search className="h-4 w-4 mr-2" />
            검색
          </Button>
        </div>
      </div>
    </div>
  );

  if (!isCollapsible) {
    return (
      <div className="bg-background p-6 rounded-lg border border-border transition-all duration-200 hover:shadow-md">
        <FilterContent />
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="bg-background rounded-lg border border-border transition-all duration-200 hover:shadow-md">
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between p-6 h-auto text-left hover:bg-accent/50 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            aria-label={isExpanded ? "필터 닫기" : "필터 열기"}
            aria-expanded={isExpanded}
          >
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary transition-transform duration-200 hover:scale-110" />
              <span className="text-lg font-semibold text-foreground transition-colors duration-200">필터</span>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 transition-transform duration-200" />
            ) : (
              <ChevronDown className="h-5 w-5 transition-transform duration-200" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="animate-in slide-in-from-top-2 duration-200">
          <div className="px-6 pb-6">
            <FilterContent />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}