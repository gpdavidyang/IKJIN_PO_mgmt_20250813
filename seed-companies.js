import { db } from './server/db.js';
import { companies } from './shared/schema.js';

async function seedCompanies() {
  try {
    console.log('🌱 Seeding companies data...');
    
    // Check if companies already exist
    const existingCompanies = await db.select().from(companies);
    
    if (existingCompanies.length > 0) {
      console.log(`✅ Companies already exist (${existingCompanies.length}), skipping seed`);
      return existingCompanies;
    }
    
    // Insert default companies
    const defaultCompanies = [
      {
        companyName: "삼성건설",
        businessNumber: "123-45-67890",
        address: "서울시 강남구 테헤란로 123",
        contactPerson: "홍길동",
        phone: "02-1234-5678",
        email: "contact@samsung-construction.com",
        representative: "홍길동",
        isActive: true,
      },
      {
        companyName: "현대건설",
        businessNumber: "987-65-43210",
        address: "서울시 서초구 강남대로 456",
        contactPerson: "김철수",
        phone: "02-9876-5432",
        email: "contact@hyundai-construction.com",
        representative: "김철수",
        isActive: true,
      },
      {
        companyName: "대우건설",
        businessNumber: "555-66-77890",
        address: "서울시 중구 세종대로 789",
        contactPerson: "이영희",
        phone: "02-5555-6666",
        email: "contact@daewoo-construction.com",
        representative: "이영희",
        isActive: true,
      }
    ];
    
    const insertedCompanies = await db.insert(companies).values(defaultCompanies).returning();
    console.log(`✅ Successfully seeded ${insertedCompanies.length} companies`);
    
    return insertedCompanies;
  } catch (error) {
    console.error('❌ Error seeding companies:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedCompanies()
    .then(() => {
      console.log('🎉 Company seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Company seeding failed:', error);
      process.exit(1);
    });
}

export { seedCompanies };