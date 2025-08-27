import { db } from './server/db.ts';
import { companies } from './shared/schema.ts';

async function checkCompanies() {
  try {
    console.log('🔍 Checking companies in database...');
    
    const allCompanies = await db.select().from(companies);
    
    console.log(`📊 Found ${allCompanies.length} companies:`);
    allCompanies.forEach((company, index) => {
      console.log(`${index + 1}. ID: ${company.id} | Name: ${company.companyName} | Updated: ${company.updatedAt}`);
    });
    
    return allCompanies;
  } catch (error) {
    console.error('❌ Error checking companies:', error);
    throw error;
  }
}

checkCompanies()
  .then(() => {
    console.log('✅ Company check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Company check failed:', error);
    process.exit(1);
  });