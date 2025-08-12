import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { EmailSendHistory } from "@shared/schema";

interface OrderEmailStatus {
  id: number;
  order_number: string;
  email_status: string | null;
  last_sent_at: string | null;
  recipient_email: string | null;
  opened_at: string | null;
  total_emails_sent: number;
}

// Get email history for a specific order
export function useOrderEmailHistory(orderId: number) {
  return useQuery({
    queryKey: ["/api/orders", orderId, "email-history"],
    queryFn: () => apiRequest<EmailSendHistory[]>("GET", `/api/orders/${orderId}/email-history`),
    enabled: !!orderId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Get email status for all orders
export function useOrdersEmailStatus() {
  return useQuery({
    queryKey: ["/api/orders-email-status"],
    queryFn: () => apiRequest<OrderEmailStatus[]>("GET", "/api/orders-email-status"),
    staleTime: 60 * 1000, // 1 minute
  });
}

// Get specific email detail
export function useEmailDetail(emailId: number) {
  return useQuery({
    queryKey: ["/api/email-history", emailId],
    queryFn: () => apiRequest<EmailSendHistory>("GET", `/api/email-history/${emailId}`),
    enabled: !!emailId,
  });
}