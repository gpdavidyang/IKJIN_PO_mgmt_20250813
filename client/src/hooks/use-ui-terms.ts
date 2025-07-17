import { useQuery } from "@tanstack/react-query";
import type { UiTerm } from "@shared/schema";

interface UseUiTermsOptions {
  category?: string;
}

export function useUiTerms(options: UseUiTermsOptions = {}) {
  return useQuery<UiTerm[]>({
    queryKey: ["/api/ui-terms", options.category],
    enabled: true,
  });
}

export function useUiTerm(termKey: string) {
  return useQuery<UiTerm>({
    queryKey: [`/api/ui-terms/${termKey}`],
    enabled: !!termKey,
  });
}

// Hook to get a specific term value with fallback
export function useTermValue(termKey: string, fallback: string = termKey) {
  const { data: term } = useUiTerm(termKey);
  return term?.termValue || fallback;
}

// Hook to get multiple term values as an object
export function useTermValues(termKeys: string[]) {
  const { data: terms } = useUiTerms();
  
  if (!terms) return {};
  
  const termMap: Record<string, string> = {};
  termKeys.forEach(key => {
    const term = terms.find(t => t.termKey === key);
    termMap[key] = term?.termValue || key;
  });
  
  return termMap;
}