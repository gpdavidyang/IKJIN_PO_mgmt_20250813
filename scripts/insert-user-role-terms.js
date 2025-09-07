#!/usr/bin/env node

/**
 * Script to insert Korean UI terms for user roles
 * This fixes the insertUiTerm API issue and adds the required translations
 */

import { db } from '../server/db.js';
import { uiTerms } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

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
      console.log(`📝 Inserting term: ${term.termKey} -> ${term.termValue}`);
      
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
  }
  
  process.exit(0);
}

// Run the script
insertUserRoleTerms();