#!/usr/bin/env node

require('dotenv').config();

const { drizzle } = require('drizzle-orm/postgres-js');
const { pgTable, varchar, text, boolean, timestamp } = require('drizzle-orm/pg-core');
const { eq, and, asc } = require('drizzle-orm');
const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql);

// UI Terms table schema (matching the actual database structure)
const uiTerms = pgTable("ui_terms", {
  termKey: varchar("term_key", { length: 100 }).notNull().primaryKey(),
  termValue: varchar("term_value", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

async function debugUiTerms() {
  try {
    console.log('🔍 Debugging UI terms query...');
    
    // Test 1: Get all terms without filtering
    console.log('\n📋 Test 1: Getting ALL terms');
    const allTerms = await db.select().from(uiTerms);
    console.log(`Found ${allTerms.length} total terms:`);
    allTerms.forEach(term => {
      console.log(`  ${term.termKey}: ${term.termValue} (category: ${term.category}, active: ${term.isActive})`);
    });
    
    // Test 2: Get terms with category filter
    console.log('\n📋 Test 2: Getting terms with category=user_roles');
    const userRoleTerms = await db
      .select()
      .from(uiTerms)
      .where(eq(uiTerms.category, 'user_roles'));
    console.log(`Found ${userRoleTerms.length} user_roles terms:`);
    userRoleTerms.forEach(term => {
      console.log(`  ${term.termKey}: ${term.termValue} (active: ${term.isActive})`);
    });
    
    // Test 3: Get terms with category filter AND active filter
    console.log('\n📋 Test 3: Getting terms with category=user_roles AND is_active=true');
    const activeUserRoleTerms = await db
      .select()
      .from(uiTerms)
      .where(and(eq(uiTerms.category, 'user_roles'), eq(uiTerms.isActive, true)))
      .orderBy(asc(uiTerms.termKey));
    console.log(`Found ${activeUserRoleTerms.length} active user_roles terms:`);
    activeUserRoleTerms.forEach(term => {
      console.log(`  ${term.termKey}: ${term.termValue}`);
    });
    
  } catch (error) {
    console.error('❌ Error debugging UI terms:', error);
  } finally {
    await sql.end();
  }
}

debugUiTerms();