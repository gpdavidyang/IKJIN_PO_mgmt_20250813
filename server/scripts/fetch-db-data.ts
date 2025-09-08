import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { vendors, projects, items } from '../../shared/schema';
import { config } from 'dotenv';

config();

async function fetchDatabaseData() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    // Fetch vendors
    const vendorList = await db.select().from(vendors).limit(50);

    // Fetch projects  
    const projectList = await db.select().from(projects).limit(30);

    // Fetch items with categories
    const itemList = await db.select().from(items).limit(100);

    // Group items by categories for variety
    const categoryGroups = itemList.reduce((acc, item) => {
      const key = `${item.majorCategory}-${item.middleCategory}-${item.subCategory}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<string, typeof itemList>);

    console.log(JSON.stringify({
      vendors: vendorList,
      projects: projectList,
      items: itemList,
      categoryGroups: Object.keys(categoryGroups).map(key => ({
        category: key,
        items: categoryGroups[key]
      }))
    }, null, 2));

    await client.end();
  } catch (error) {
    console.error('Error fetching data:', error);
    await client.end();
    process.exit(1);
  }
}

fetchDatabaseData();