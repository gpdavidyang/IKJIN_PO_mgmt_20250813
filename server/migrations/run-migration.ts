/**
 * Migration runner script
 * Run with: npx tsx server/migrations/run-migration.ts
 */

import { runDualStatusMigration, rollbackDualStatusMigration } from "./dual-status-migration";

async function main() {
  const command = process.argv[2];
  
  if (!command) {
    console.log("Usage: npx tsx server/migrations/run-migration.ts [up|down]");
    console.log("  up   - Run the migration");
    console.log("  down - Rollback the migration");
    process.exit(1);
  }
  
  try {
    if (command === "up") {
      console.log("🚀 Running dual status migration...\n");
      const result = await runDualStatusMigration();
      
      if (result.success) {
        console.log("\n✨ Migration completed successfully!");
      } else {
        console.log("\n⚠️ Migration completed with errors. Please review the logs.");
      }
      
      process.exit(result.success ? 0 : 1);
      
    } else if (command === "down") {
      console.log("🔄 Rolling back dual status migration...\n");
      await rollbackDualStatusMigration();
      console.log("\n✨ Rollback completed successfully!");
      process.exit(0);
      
    } else {
      console.error(`Unknown command: ${command}`);
      console.log("Use 'up' to run migration or 'down' to rollback");
      process.exit(1);
    }
    
  } catch (error) {
    console.error("\n💥 Migration failed with error:", error);
    process.exit(1);
  }
}

// Run the migration
main().catch(console.error);