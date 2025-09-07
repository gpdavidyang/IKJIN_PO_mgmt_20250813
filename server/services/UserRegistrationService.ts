import { db } from "../db";
import { userRegistrations, users } from "@shared/schema";
import type { UserRegistration, InsertUserRegistration } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

export class UserRegistrationService {
  /**
   * 회원가입 신청 제출
   */
  static async submitRegistration(data: {
    email: string;
    name: string;
    phoneNumber?: string;
    password: string;
    requestedRole?: string;
  }): Promise<UserRegistration> {
    try {
      // 이메일 중복 체크 (기존 사용자 + 대기 중인 신청)
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new Error("이미 등록된 이메일 주소입니다.");
      }

      const existingRegistration = await db
        .select()
        .from(userRegistrations)
        .where(
          and(
            eq(userRegistrations.email, data.email),
            eq(userRegistrations.status, "pending")
          )
        )
        .limit(1);

      if (existingRegistration.length > 0) {
        throw new Error("이미 가입 신청이 접수된 이메일 주소입니다.");
      }

      // 비밀번호 해싱
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

      // 신청 데이터 저장
      const registrationData: InsertUserRegistration = {
        email: data.email,
        name: data.name,
        phoneNumber: data.phoneNumber || null,
        hashedPassword,
        requestedRole: (data.requestedRole as any) || "field_worker",
        status: "pending",
      };

      const [newRegistration] = await db
        .insert(userRegistrations)
        .values(registrationData)
        .returning();

      return newRegistration;
    } catch (error) {
      console.error("Registration submission error:", error);
      throw error;
    }
  }

  /**
   * 가입 신청 승인
   */
  static async approveRegistration(
    registrationId: number, 
    adminId: string
  ): Promise<{ user: any; registration: UserRegistration }> {
    try {
      // 신청 정보 조회
      const registration = await this.getRegistrationById(registrationId);
      if (!registration) {
        throw new Error("가입 신청을 찾을 수 없습니다.");
      }

      if (registration.status !== "pending") {
        throw new Error("이미 처리된 가입 신청입니다.");
      }

      // 실제 사용자 계정 생성
      const userId = uuidv4();
      const [newUser] = await db
        .insert(users)
        .values({
          id: userId,
          email: registration.email,
          name: registration.name,
          password: registration.hashedPassword,
          phoneNumber: registration.phoneNumber,
          role: registration.requestedRole,
          accountStatus: "active",
          isActive: true,
        })
        .returning();

      // 신청 상태를 승인으로 변경
      const [updatedRegistration] = await db
        .update(userRegistrations)
        .set({
          status: "approved",
          reviewedAt: new Date(),
          reviewedBy: adminId,
        })
        .where(eq(userRegistrations.id, registrationId))
        .returning();

      return { user: newUser, registration: updatedRegistration };
    } catch (error) {
      console.error("Registration approval error:", error);
      throw error;
    }
  }

  /**
   * 가입 신청 거부
   */
  static async rejectRegistration(
    registrationId: number,
    adminId: string,
    reason?: string
  ): Promise<UserRegistration> {
    try {
      const registration = await this.getRegistrationById(registrationId);
      if (!registration) {
        throw new Error("가입 신청을 찾을 수 없습니다.");
      }

      if (registration.status !== "pending") {
        throw new Error("이미 처리된 가입 신청입니다.");
      }

      const [updatedRegistration] = await db
        .update(userRegistrations)
        .set({
          status: "rejected",
          rejectionReason: reason,
          reviewedAt: new Date(),
          reviewedBy: adminId,
        })
        .where(eq(userRegistrations.id, registrationId))
        .returning();

      return updatedRegistration;
    } catch (error) {
      console.error("Registration rejection error:", error);
      throw error;
    }
  }

  /**
   * 대기 중인 가입 신청 목록 조회
   */
  static async getPendingRegistrations(): Promise<UserRegistration[]> {
    try {
      return await db
        .select()
        .from(userRegistrations)
        .where(eq(userRegistrations.status, "pending"))
        .orderBy(userRegistrations.appliedAt);
    } catch (error) {
      console.error("Get pending registrations error:", error);
      throw error;
    }
  }

  /**
   * 모든 가입 신청 목록 조회 (관리자용)
   */
  static async getAllRegistrations(): Promise<UserRegistration[]> {
    try {
      return await db
        .select()
        .from(userRegistrations)
        .orderBy(userRegistrations.appliedAt);
    } catch (error) {
      console.error("Get all registrations error:", error);
      throw error;
    }
  }

  /**
   * 특정 가입 신청 조회
   */
  static async getRegistrationById(id: number): Promise<UserRegistration | null> {
    try {
      const [registration] = await db
        .select()
        .from(userRegistrations)
        .where(eq(userRegistrations.id, id))
        .limit(1);

      return registration || null;
    } catch (error) {
      console.error("Get registration by ID error:", error);
      throw error;
    }
  }

  /**
   * 이메일로 가입 신청 조회
   */
  static async getRegistrationByEmail(email: string): Promise<UserRegistration | null> {
    try {
      const [registration] = await db
        .select()
        .from(userRegistrations)
        .where(eq(userRegistrations.email, email))
        .limit(1);

      return registration || null;
    } catch (error) {
      console.error("Get registration by email error:", error);
      throw error;
    }
  }

  /**
   * 가입 신청 삭제 (관리자용)
   */
  static async deleteRegistration(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(userRegistrations)
        .where(eq(userRegistrations.id, id));

      return result.rowCount !== undefined && result.rowCount > 0;
    } catch (error) {
      console.error("Delete registration error:", error);
      throw error;
    }
  }
}