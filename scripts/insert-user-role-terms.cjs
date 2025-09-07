#!/usr/bin/env node

/**
 * Script to insert Korean UI terms for user roles
 * This fixes the insertUiTerm API issue and adds the required translations
 */

const { drizzle } = require('drizzle-orm/postgres-js');
const { pgTable, varchar, text, boolean, timestamp, serial } = require('drizzle-orm/pg-core');
const { eq } = require('drizzle-orm');
const postgres = require('postgres');

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql);

// UI Terms table schema
const uiTerms = pgTable("ui_terms", {
  id: serial("id").primaryKey(),
  termKey: varchar("term_key", { length: 100 }).notNull().unique(),
  termValue: varchar("term_value", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).default("general"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const userRoleTerms = [
  {
    termKey: 'field_worker',
    termValue: '현장 작업자',
    category: 'user_roles',
    description: '현장에서 직접 작업을 수행하는 작업자'
  },
  {
    termKey: 'project_manager', 
    termValue: '현장 관리자',
    category: 'user_roles',
    description: '현장 프로젝트를 관리하는 관리자'
  },
  {
    termKey: 'hq_management',
    termValue: '본사 관리자', 
    category: 'user_roles',
    description: '본사에서 전체적인 관리업무를 담당하는 관리자'
  },
  {
    termKey: 'executive',
    termValue: '임원',
    category: 'user_roles', 
    description: '회사의 임원급 직책을 담당하는 사용자'
  },
  {
    termKey: 'admin',
    termValue: '시스템 관리자',
    category: 'user_roles',
    description: '시스템 전체를 관리할 수 있는 최고 권한 사용자'
  }
];

async function insertUserRoleTerms() {
  try {
    console.log('🚀 Starting to insert user role UI terms...');
    
    for (const term of userRoleTerms) {
      console.log(`📝 Processing term: ${term.termKey} -> ${term.termValue}`);
      
      // Check if term already exists
      const existingTerm = await db
        .select()
        .from(uiTerms)
        .where(eq(uiTerms.termKey, term.termKey))
        .limit(1);
        
      if (existingTerm.length > 0) {
        // Update existing term
        const [updatedTerm] = await db
          .update(uiTerms)
          .set({
            termValue: term.termValue,
            category: term.category,
            description: term.description,
            updatedAt: new Date()
          })
          .where(eq(uiTerms.termKey, term.termKey))
          .returning();
          
        console.log(`✅ Updated existing term: ${updatedTerm.termKey}`);
      } else {
        // Insert new term
        const [newTerm] = await db
          .insert(uiTerms)
          .values({
            termKey: term.termKey,
            termValue: term.termValue,
            category: term.category,
            description: term.description,
            isActive: true
          })
          .returning();
          
        console.log(`✅ Inserted new term: ${newTerm.termKey}`);
      }
    }
    
    console.log('🎉 All user role terms have been successfully inserted/updated!');
    
    // Verify the insertions
    console.log('\n🔍 Verifying inserted terms:');
    const allTerms = await db
      .select()
      .from(uiTerms)
      .where(eq(uiTerms.category, 'user_roles'));
      
    allTerms.forEach(term => {
      console.log(`   ${term.termKey}: ${term.termValue}`);
    });
    
  } catch (error) {
    console.error('❌ Error inserting user role terms:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
  
  process.exit(0);
}

// Run the script
insertUserRoleTerms();