const { storage } = require('./server/storage');

async function addUserRoleTerms() {
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

  console.log('🚀 Starting to add user role UI terms...');
  
  for (const term of userRoleTerms) {
    try {
      console.log(`📝 Adding: ${term.termKey} -> ${term.termValue}`);
      
      // Check if term already exists
      const existing = await storage.getUiTerm(term.termKey);
      
      if (existing) {
        // Update existing term
        const updated = await storage.updateUiTerm(term.termKey, {
          termValue: term.termValue,
          category: term.category,
          description: term.description
        });
        console.log(`✅ Updated: ${updated.termKey}`);
      } else {
        // Create new term  
        const created = await storage.createUiTerm(term);
        console.log(`✅ Created: ${created.termKey}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${term.termKey}:`, error.message);
    }
  }
  
  // Verify results
  console.log('\n🔍 Verifying all user role terms:');
  const allUserRoleTerms = await storage.getUiTerms('user_roles');
  allUserRoleTerms.forEach(term => {
    console.log(`   ${term.termKey}: ${term.termValue}`);
  });
  
  console.log('\n🎉 All user role terms processed successfully!');
}

// Execute if called directly
if (require.main === module) {
  addUserRoleTerms().catch(console.error);
}

module.exports = { addUserRoleTerms };