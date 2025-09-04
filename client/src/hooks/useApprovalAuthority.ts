import { useState, useCallback } from "react";
import type { AuthorityCheck } from "@shared/order-types";

export function useApprovalAuthority() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const checkAuthority = useCallback(async (amount: number): Promise<AuthorityCheck> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/orders/check-approval-authority", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to check approval authority");
      }
      
      const data = await response.json();
      return data;
      
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  const getRequiredApprovers = useCallback(async (amount: number, companyId?: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        amount: amount.toString(),
        ...(companyId && { companyId: companyId.toString() })
      });
      
      const response = await fetch(`/api/orders/required-approvers?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to get required approvers");
      }
      
      const data = await response.json();
      return data;
      
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    checkAuthority,
    getRequiredApprovers,
    loading,
    error,
  };
}