import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Star, Plus } from 'lucide-react';
import { debounce } from 'lodash';

export interface Suggestion {
  value: string;
  label?: string;
  metadata?: Record<string, any>;
  confidence?: number;
  isRecommended?: boolean;
}

interface AutoCompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions?: Suggestion[];
  onSearch?: (query: string) => Promise<Suggestion[]>;
  placeholder?: string;
  debounceMs?: number;
  minChars?: number;
  maxSuggestions?: number;
  allowCustomValue?: boolean;
  validation?: (value: string) => { isValid: boolean; message?: string };
  className?: string;
  onBlur?: () => void;
  autoFocus?: boolean;
}

export const AutoCompleteInput: React.FC<AutoCompleteInputProps> = ({
  value,
  onChange,
  suggestions = [],
  onSearch,
  placeholder = '입력하세요...',
  debounceMs = 300,
  minChars = 2,
  maxSuggestions = 10,
  allowCustomValue = true,
  validation,
  className,
  onBlur,
  autoFocus,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSuggestions, setLocalSuggestions] = useState<Suggestion[]>(suggestions);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!onSearch || query.length < minChars) {
          setLocalSuggestions(
            suggestions.filter((s) =>
              s.value.toLowerCase().includes(query.toLowerCase()) ||
              (s.label && s.label.toLowerCase().includes(query.toLowerCase()))
            ).slice(0, maxSuggestions)
          );
          setIsSearching(false);
          return;
        }

        setIsSearching(true);
        try {
          const results = await onSearch(query);
          setLocalSuggestions(results.slice(0, maxSuggestions));
        } catch (error) {
          console.error('Search error:', error);
          setLocalSuggestions([]);
        } finally {
          setIsSearching(false);
        }
      }, debounceMs),
    [onSearch, suggestions, minChars, maxSuggestions, debounceMs]
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Validate
    if (validation) {
      const result = validation(newValue);
      setValidationError(result.isValid ? null : result.message || '유효하지 않은 값');
    }

    // Trigger search
    if (newValue.length >= minChars) {
      debouncedSearch(newValue);
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setLocalSuggestions([]);
    }
    
    setHighlightedIndex(-1);
  };

  // Handle suggestion selection
  const selectSuggestion = (suggestion: Suggestion) => {
    onChange(suggestion.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setValidationError(null);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && value.length >= minChars) {
        setIsOpen(true);
        debouncedSearch(value);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < localSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : localSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < localSuggestions.length) {
          selectSuggestion(localSuggestions[highlightedIndex]);
        } else if (allowCustomValue) {
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        if (highlightedIndex >= 0 && highlightedIndex < localSuggestions.length) {
          e.preventDefault();
          selectSuggestion(localSuggestions[highlightedIndex]);
        } else {
          setIsOpen(false);
        }
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sort suggestions by relevance
  const sortedSuggestions = useMemo(() => {
    return [...localSuggestions].sort((a, b) => {
      // Recommended items first
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      
      // Then by confidence
      if (a.confidence && b.confidence) {
        return b.confidence - a.confidence;
      }
      
      // Then alphabetically
      return a.value.localeCompare(b.value);
    });
  }, [localSuggestions]);

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (value.length >= minChars) {
              setIsOpen(true);
              debouncedSearch(value);
            }
          }}
          onBlur={() => {
            setTimeout(() => {
              if (!dropdownRef.current?.contains(document.activeElement)) {
                onBlur?.();
              }
            }, 200);
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            'pr-8',
            validationError && 'border-red-500 focus:ring-red-500'
          )}
        />
        <ChevronDown
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </div>

      {validationError && (
        <p className="text-xs text-red-500 mt-1">{validationError}</p>
      )}

      {isOpen && (sortedSuggestions.length > 0 || allowCustomValue) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto"
        >
          {isSearching && (
            <div className="px-3 py-2 text-sm text-gray-500">
              <span className="inline-block animate-spin mr-2">⟳</span>
              검색 중...
            </div>
          )}
          
          {!isSearching && sortedSuggestions.length === 0 && allowCustomValue && (
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              onClick={() => {
                setIsOpen(false);
                setHighlightedIndex(-1);
              }}
            >
              <Plus className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700">"{value}" 새로 등록</span>
            </button>
          )}

          {sortedSuggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.value}-${index}`}
              className={cn(
                'w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between group',
                index === highlightedIndex
                  ? 'bg-blue-50 text-blue-900'
                  : 'hover:bg-gray-50',
                suggestion.isRecommended && 'font-medium'
              )}
              onClick={() => selectSuggestion(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {suggestion.isRecommended && (
                  <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                )}
                <div className="truncate">
                  <span className="block">{suggestion.label || suggestion.value}</span>
                  {suggestion.label && suggestion.value !== suggestion.label && (
                    <span className="text-xs text-gray-500">{suggestion.value}</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {suggestion.confidence !== undefined && (
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    suggestion.confidence >= 90
                      ? 'bg-green-100 text-green-700'
                      : suggestion.confidence >= 70
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600'
                  )}>
                    {suggestion.confidence}%
                  </span>
                )}
                {value === suggestion.value && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};