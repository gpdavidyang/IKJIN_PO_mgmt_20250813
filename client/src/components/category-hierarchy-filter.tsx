import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/ui/theme-provider";

interface CategoryHierarchyFilterProps {
  onFilterChange: (filters: {
    majorCategory: string;
    middleCategory: string;
    minorCategory: string;
  }) => void;
}

export function CategoryHierarchyFilter({ onFilterChange }: CategoryHierarchyFilterProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [selectedMajor, setSelectedMajor] = useState<string>('all');
  const [selectedMiddle, setSelectedMiddle] = useState<string>('all');
  const [selectedMinor, setSelectedMinor] = useState<string>('all');

  // Fetch categories actually used in purchase orders for reports
  const { data: categories } = useQuery({
    queryKey: ["/api/categories/used-in-orders"],
    queryFn: async () => {
      const response = await fetch("/api/categories/used-in-orders");
      if (!response.ok) throw new Error("Failed to fetch used categories");
      return response.json();
    },
  });

  // Get unique major categories
  const majorCategories = categories ? 
    [...new Set(categories.map((cat: any) => cat.majorCategory))].filter(Boolean) : [];

  // Get middle categories based on selected major
  const middleCategories = selectedMajor !== 'all' && categories ? 
    [...new Set(categories
      .filter((cat: any) => cat.majorCategory === selectedMajor)
      .map((cat: any) => cat.middleCategory)
    )].filter(Boolean) : [];

  // Get minor categories based on selected middle
  const minorCategories = selectedMiddle !== 'all' && categories ? 
    [...new Set(categories
      .filter((cat: any) => 
        cat.majorCategory === selectedMajor && 
        cat.middleCategory === selectedMiddle
      )
      .map((cat: any) => cat.minorCategory)
    )].filter(Boolean) : [];

  // Reset child selections when parent changes
  useEffect(() => {
    setSelectedMiddle('all');
    setSelectedMinor('all');
  }, [selectedMajor]);

  useEffect(() => {
    setSelectedMinor('all');
  }, [selectedMiddle]);

  // Notify parent of filter changes
  useEffect(() => {
    onFilterChange({
      majorCategory: selectedMajor,
      middleCategory: selectedMiddle,
      minorCategory: selectedMinor
    });
  }, [selectedMajor, selectedMiddle, selectedMinor, onFilterChange]);

  return (
    <>
      {/* Major Category */}
      <div className="space-y-2">
        <Label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          대분류
        </Label>
        <Select 
          value={selectedMajor} 
          onValueChange={setSelectedMajor}
        >
          <SelectTrigger className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
            <SelectValue placeholder="대분류 선택" />
          </SelectTrigger>
          <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
            <SelectItem value="all">전체 대분류</SelectItem>
            {majorCategories.map((category: string) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Middle Category - Always show but disabled if major is 'all' */}
      <div className="space-y-2">
        <Label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          중분류
        </Label>
        <Select 
          value={selectedMiddle} 
          onValueChange={setSelectedMiddle}
          disabled={selectedMajor === 'all'}
        >
          <SelectTrigger className={`transition-colors ${
            selectedMajor === 'all' 
              ? isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-500' : 'bg-gray-100 border-gray-300 text-gray-400'
              : isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
          }`}>
            <SelectValue placeholder={selectedMajor === 'all' ? '대분류를 먼저 선택하세요' : '중분류 선택'} />
          </SelectTrigger>
          <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
            <SelectItem value="all">전체 중분류</SelectItem>
            {middleCategories.map((category: string) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Minor Category - Always show but disabled if middle is 'all' or major is 'all' */}
      <div className="space-y-2">
        <Label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          소분류
        </Label>
        <Select 
          value={selectedMinor} 
          onValueChange={setSelectedMinor}
          disabled={selectedMiddle === 'all' || selectedMajor === 'all'}
        >
          <SelectTrigger className={`transition-colors ${
            selectedMiddle === 'all' || selectedMajor === 'all'
              ? isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-500' : 'bg-gray-100 border-gray-300 text-gray-400'
              : isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'
          }`}>
            <SelectValue placeholder={
              selectedMajor === 'all' ? '대분류를 먼저 선택하세요' :
              selectedMiddle === 'all' ? '중분류를 먼저 선택하세요' : 
              '소분류 선택'
            } />
          </SelectTrigger>
          <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
            <SelectItem value="all">전체 소분류</SelectItem>
            {minorCategories.map((category: string) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Current selection status - Compact version */}
      <div className="space-y-2">
        <Label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          선택된 분류
        </Label>
        <div className={`text-sm p-2 rounded border transition-colors ${
          isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-300 text-gray-600'
        }`}>
          {selectedMajor === 'all' ? '전체' : (
            <>
              {selectedMajor}
              {selectedMiddle !== 'all' && ` → ${selectedMiddle}`}
              {selectedMinor !== 'all' && ` → ${selectedMinor}`}
            </>
          )}
        </div>
      </div>

      {/* Compact info message */}
      <div className="space-y-2">
        <div className={`text-xs p-2 rounded border transition-colors ${
          isDarkMode 
            ? 'bg-blue-900/20 border-blue-700 text-blue-300' 
            : 'bg-blue-50 border-blue-200 text-blue-600'
        }`}>
          💡 실제 발주에 사용된 분류만 표시됩니다
        </div>
      </div>
    </>
  );
}