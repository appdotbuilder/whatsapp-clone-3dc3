import { serial, text, pgTable, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name'), // Nullable by default
  avatar_url: text('avatar_url'), // Nullable by default
  last_seen: timestamp('last_seen'), // Nullable by default
  is_online: boolean('is_online').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Conversations table for one-on-one chats
export const conversationsTable = pgTable('conversations', {
  id: serial('id').primaryKey(),
  participant1_id: integer('participant1_id').notNull().references(() => usersTable.id),
  participant2_id: integer('participant2_id').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Messages table
export const messagesTable = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversation_id: integer('conversation_id').notNull().references(() => conversationsTable.id),
  sender_id: integer('sender_id').notNull().references(() => usersTable.id),
  content: text('content').notNull(),
  is_read: boolean('is_read').notNull().default(false),
  sent_at: timestamp('sent_at').defaultNow().notNull()
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  sentMessages: many(messagesTable, { relationName: 'sender' }),
  conversations1: many(conversationsTable, { relationName: 'participant1' }),
  conversations2: many(conversationsTable, { relationName: 'participant2' })
}));

export const conversationsRelations = relations(conversationsTable, ({ one, many }) => ({
  participant1: one(usersTable, {
    fields: [conversationsTable.participant1_id],
    references: [usersTable.id],
    relationName: 'participant1'
  }),
  participant2: one(usersTable, {
    fields: [conversationsTable.participant2_id],
    references: [usersTable.id],
    relationName: 'participant2'
  }),
  messages: many(messagesTable)
}));

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  conversation: one(conversationsTable, {
    fields: [messagesTable.conversation_id],
    references: [conversationsTable.id]
  }),
  sender: one(usersTable, {
    fields: [messagesTable.sender_id],
    references: [usersTable.id],
    relationName: 'sender'
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Conversation = typeof conversationsTable.$inferSelect;
export type NewConversation = typeof conversationsTable.$inferInsert;
export type Message = typeof messagesTable.$inferSelect;
export type NewMessage = typeof messagesTable.$inferInsert;

// Export all tables for proper query building
export const tables = { 
  users: usersTable, 
  conversations: conversationsTable, 
  messages: messagesTable 
};