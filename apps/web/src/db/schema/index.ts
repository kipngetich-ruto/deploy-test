import { pgTable, text, timestamp, json, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const scans = pgTable('scans', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  target: text('target').notNull(),
  scanType: text('scan_type').notNull(),
  status: text('status').notNull(),
  results: json('results'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export const usersRelations = relations(users, ({ many }) => ({
  scans: many(scans),
}));

export const scansRelations = relations(scans, ({ one }) => ({
  user: one(users, {
    fields: [scans.userId],
    references: [users.id],
  }),
}));