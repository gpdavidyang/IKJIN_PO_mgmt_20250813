import { db } from "./db";
import { users } from "@shared/schema";
import { hashPassword } from "./auth-utils";
import { eq } from "drizzle-orm";

/**
 * Migration script to hash existing plain text passwords
 */
export async function migratePasswords() {
  console.log("Starting password migration...");
  
  try {
    // Test database connection first
    await db.select().from(users).limit(1);
    
    // Get all users with plain text passwords
    const allUsers = await db.select().from(users);
    
    for (const user of allUsers) {
      if (user.password && !user.password.includes('.')) {
        // Password is plain text, needs hashing
        const hashedPassword = await hashPassword(user.password);
        
        await db
          .update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, user.id));
        
        console.log(`Migrated password for user: ${user.email}`);
      }
    }
    
    console.log("Password migration completed successfully");
  } catch (error) {
    console.error("Error during password migration:", error);
    // Don't throw the error, just log it and continue
    console.log("Continuing with application startup despite migration error...");
  }
}