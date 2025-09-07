import { db } from "../db";
import { passwordResetTokens, users } from "@shared/schema";
import type { PasswordResetToken, InsertPasswordResetToken, User } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";

export class PasswordResetService {
  /**
   * 비밀번호 재설정 토큰 생성 및 이메일 발송 요청
   */
  static async requestPasswordReset(email: string): Promise<{ token: string; user: User }> {
    try {
      // 사용자 존재 확인
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        throw new Error("등록되지 않은 이메일 주소입니다.");
      }

      if (user.accountStatus === "inactive" || user.accountStatus === "suspended") {
        throw new Error("비활성화된 계정입니다.");
      }

      // 기존 토큰 무효화 (사용하지 않은 토큰만)
      await db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(passwordResetTokens.userId, user.id),
            eq(passwordResetTokens.usedAt, null)
          )
        );

      // 새 토큰 생성
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1시간 후 만료

      const tokenData: InsertPasswordResetToken = {
        userId: user.id,
        token,
        expiresAt,
        usedAt: null,
      };

      await db.insert(passwordResetTokens).values(tokenData);

      return { token, user };
    } catch (error) {
      console.error("Password reset request error:", error);
      throw error;
    }
  }

  /**
   * 비밀번호 재설정 토큰 검증
   */
  static async verifyResetToken(token: string): Promise<{ isValid: boolean; user?: User; errorMessage?: string }> {
    try {
      // 토큰 조회
      const [tokenRecord] = await db
        .select({
          tokenId: passwordResetTokens.id,
          userId: passwordResetTokens.userId,
          expiresAt: passwordResetTokens.expiresAt,
          usedAt: passwordResetTokens.usedAt,
          user: users,
        })
        .from(passwordResetTokens)
        .innerJoin(users, eq(passwordResetTokens.userId, users.id))
        .where(eq(passwordResetTokens.token, token))
        .limit(1);

      if (!tokenRecord) {
        return {
          isValid: false,
          errorMessage: "잘못된 토큰입니다.",
        };
      }

      // 토큰이 이미 사용되었는지 확인
      if (tokenRecord.usedAt) {
        return {
          isValid: false,
          errorMessage: "이미 사용된 토큰입니다.",
        };
      }

      // 토큰 만료 확인
      if (new Date() > tokenRecord.expiresAt) {
        return {
          isValid: false,
          errorMessage: "만료된 토큰입니다.",
        };
      }

      // 사용자 계정 상태 확인
      if (tokenRecord.user.accountStatus === "inactive" || tokenRecord.user.accountStatus === "suspended") {
        return {
          isValid: false,
          errorMessage: "비활성화된 계정입니다.",
        };
      }

      return {
        isValid: true,
        user: tokenRecord.user,
      };
    } catch (error) {
      console.error("Token verification error:", error);
      return {
        isValid: false,
        errorMessage: "토큰 검증 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 비밀번호 재설정 실행
   */
  static async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      // 토큰 검증
      const verification = await this.verifyResetToken(token);
      
      if (!verification.isValid || !verification.user) {
        return {
          success: false,
          message: verification.errorMessage || "토큰 검증에 실패했습니다.",
        };
      }

      // 새 비밀번호 해싱
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // 비밀번호 업데이트
      await db
        .update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, verification.user.id));

      // 토큰을 사용됨으로 표시
      await db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.token, token));

      return {
        success: true,
        message: "비밀번호가 성공적으로 변경되었습니다.",
      };
    } catch (error) {
      console.error("Password reset error:", error);
      return {
        success: false,
        message: "비밀번호 재설정 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 만료된 토큰 정리 (배치 작업용)
   */
  static async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await db
        .delete(passwordResetTokens)
        .where(gt(new Date(), passwordResetTokens.expiresAt));

      return result.rowCount || 0;
    } catch (error) {
      console.error("Cleanup expired tokens error:", error);
      return 0;
    }
  }

  /**
   * 사용자의 모든 비밀번호 재설정 토큰 무효화
   */
  static async invalidateUserTokens(userId: string): Promise<void> {
    try {
      await db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(passwordResetTokens.userId, userId),
            eq(passwordResetTokens.usedAt, null)
          )
        );
    } catch (error) {
      console.error("Invalidate user tokens error:", error);
      throw error;
    }
  }

  /**
   * 사용자의 비밀번호 재설정 이력 조회 (관리자용)
   */
  static async getPasswordResetHistory(userId: string): Promise<PasswordResetToken[]> {
    try {
      return await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, userId))
        .orderBy(passwordResetTokens.createdAt);
    } catch (error) {
      console.error("Get password reset history error:", error);
      throw error;
    }
  }
}