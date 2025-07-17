/**
 * Common validation utilities
 * Centralized validation functions for data consistency
 */

import { z } from "zod";

/**
 * Korean Won amount validation
 */
export const koreanWonSchema = z.number().min(0).max(999999999999); // Up to 999 billion

/**
 * Phone number validation (Korean format)
 */
export const phoneNumberSchema = z.string().regex(
  /^010-\d{4}-\d{4}$/,
  "Phone number must be in format: 010-XXXX-XXXX"
);

/**
 * Business registration number validation (Korean format)
 */
export const businessNumberSchema = z.string().regex(
  /^\d{3}-\d{2}-\d{5}$/,
  "Business number must be in format: XXX-XX-XXXXX"
);

/**
 * Email validation with Korean domain support
 */
export const emailSchema = z.string().email("Invalid email format");

/**
 * Validate Korean Won amount
 */
export function validateKoreanWon(amount: number): boolean {
  return koreanWonSchema.safeParse(amount).success;
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  return phoneNumberSchema.safeParse(phone).success;
}

/**
 * Validate business registration number
 */
export function validateBusinessNumber(businessNumber: string): boolean {
  return businessNumberSchema.safeParse(businessNumber).success;
}

/**
 * Sanitize and validate file name
 */
export function sanitizeFileName(fileName: string): string {
  // Remove dangerous characters but preserve Korean characters
  return fileName.replace(/[<>:"/\\|?*]/g, '_');
}

/**
 * Validate order item data
 */
export const orderItemSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  totalAmount: z.number().min(0, "Total amount cannot be negative"),
  specification: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Validate file upload data
 */
export const fileUploadSchema = z.object({
  originalName: z.string().min(1, "File name is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  size: z.number().min(1, "File size must be greater than 0").max(10 * 1024 * 1024, "File size must be less than 10MB"),
});

/**
 * Common validation error messages in Korean
 */
export const validationMessages = {
  required: "필수 입력 항목입니다",
  invalidEmail: "올바른 이메일 주소를 입력하세요",
  invalidPhone: "올바른 전화번호 형식을 입력하세요 (010-XXXX-XXXX)",
  invalidBusinessNumber: "올바른 사업자등록번호를 입력하세요 (XXX-XX-XXXXX)",
  minLength: (min: number) => `최소 ${min}자 이상 입력하세요`,
  maxLength: (max: number) => `최대 ${max}자까지 입력 가능합니다`,
  invalidAmount: "올바른 금액을 입력하세요",
  fileTooLarge: "파일 크기가 너무 큽니다 (최대 10MB)",
  invalidFileType: "지원하지 않는 파일 형식입니다",
} as const;