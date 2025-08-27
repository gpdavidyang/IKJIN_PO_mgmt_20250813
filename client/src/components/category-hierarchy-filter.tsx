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

  // Fetch categories from API
  const { data: categories } = useQuery({
    queryKey: ["/api/categories/hierarchy"],
    queryFn: async () => {
      const response = await fetch("/api/categories/hierarchy");
      if (!response.ok) throw new Error("Failed to fetch categories");
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
    <div className="space-y-4">
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

      {/* Middle Category - Only show if major is selected */}
      {selectedMajor !== 'all' && (
        <div className="space-y-2">
          <Label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            중분류
          </Label>
          <Select 
            value={selectedMiddle} 
            onValueChange={setSelectedMiddle}
          >
            <SelectTrigger className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
              <SelectValue placeholder="중분류 선택" />
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
      )}

      {/* Minor Category - Only show if middle is selected */}
      {selectedMiddle !== 'all' && selectedMajor !== 'all' && (
        <div className="space-y-2">
          <Label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            소분류
          </Label>
          <Select 
            value={selectedMinor} 
            onValueChange={setSelectedMinor}
          >
            <SelectTrigger className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
              <SelectValue placeholder="소분류 선택" />
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
      )}

      {/* Display current selection path */}
      <div className={`text-sm p-3 rounded-lg ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
        <span className="font-medium">선택된 분류: </span>
        {selectedMajor === 'all' ? '전체' : (
          <>
            {selectedMajor}
            {selectedMiddle !== 'all' && ` → ${selectedMiddle}`}
            {selectedMinor !== 'all' && ` → ${selectedMinor}`}
          </>
        )}
      </div>
    </div>
  );
}