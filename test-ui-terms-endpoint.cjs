#!/usr/bin/env node

require('dotenv').config();

const express = require('express');
const { drizzle } = require('drizzle-orm/postgres-js');
const { pgTable, varchar, text, boolean, timestamp } = require('drizzle-orm/pg-core');
const { eq, and, asc } = require('drizzle-orm');
const postgres = require('postgres');

const app = express();
const port = 3001;

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

app.get('/api/test-ui-terms', async (req, res) => {
  try {
    console.log('🧪 Test UI terms endpoint called');
    const category = req.query.category;
    console.log(`📋 Querying for category: ${category}`);
    
    if (category) {
      const result = await db
        .select()
        .from(uiTerms)
        .where(and(eq(uiTerms.category, category), eq(uiTerms.isActive, true)))
        .orderBy(asc(uiTerms.termKey));
      console.log(`✅ Found ${result.length} terms for category ${category}`);
      res.json(result);
    } else {
      const result = await db
        .select()
        .from(uiTerms)
        .where(eq(uiTerms.isActive, true))
        .orderBy(asc(uiTerms.termKey));
      console.log(`✅ Found ${result.length} total active terms`);
      res.json(result);
    }
  } catch (error) {
    console.error('❌ Error in test endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🧪 Test UI terms server running on port ${port}`);
  console.log(`Test endpoint: http://localhost:${port}/api/test-ui-terms?category=user_roles`);
});